import * as vscode from 'vscode';
import { ILLMProvider, LLMProviderConfig } from './llmProvider';
import { logger } from '../logger';
import { LLMConfig, getDefaultModelConfig } from '../config';
import { providerSettingsManager } from './providerSettings';

// Import all providers
import { OpenAIProvider } from './providers/openaiProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { GoogleAIProvider } from './providers/googleAIProvider';
import { MistralAIProvider } from './providers/mistralAIProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
import { LMStudioProvider } from './providers/lmstudioProvider';
import { OpenRouterProvider } from './providers/openrouterProvider';
import { HuggingFaceProvider } from './providers/huggingfaceProvider';
import { CohereProvider } from './providers/cohereProvider';
import { DeepSeekProvider } from './providers/deepseekProvider';
// import { AI21Provider } from './providers/ai21Provider';
// import { AlephAlphaProvider } from './providers/alephalphaprovider';
// import { TogetherAIProvider } from './providers/togetheraiProvider';
// import { PerplexityAIProvider } from './providers/perplexityProvider';

/**
 * Service that manages LLM providers and model selection
 */
class LLMService {
    private providers = new Map<string, ILLMProvider>();
    private _onProvidersChanged = new vscode.EventEmitter<void>();
    readonly onProvidersChanged = this._onProvidersChanged.event;
    private context: vscode.ExtensionContext | undefined;

    constructor() {
        // Listen for configuration changes that might affect providers
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm')) {
                logger.info("LLM configuration changed, re-initializing providers.");
                this.reinitializeProviders();
            }
        });
    }

    /**
     * Initialize the service with the extension context
     * This must be called before using any provider functionality
     */
    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        this.initializeProviders();
    }

    private async initializeProviders() {
        if (!this.context) {
            logger.error('LLMService not initialized with context');
            return;
        }

        // Clear existing providers
        this.providers.clear();

        // Register all providers
        const providerFactories = [
            // Register built-in providers
            { id: 'ollama', factory: () => new OllamaProvider() },
            { id: 'openai', factory: () => new OpenAIProvider() },
            { id: 'anthropic', factory: () => new AnthropicProvider() },
            { id: 'googleai', factory: () => new GoogleAIProvider() },
            { id: 'mistralai', factory: () => new MistralAIProvider() },
            { id: 'lmstudio', factory: () => new LMStudioProvider(this.context!) },
            { id: 'openrouter', factory: () => new OpenRouterProvider(this.context!) },
            { id: 'huggingface', factory: () => new HuggingFaceProvider(this.context!) },
            { id: 'deepseek', factory: () => new DeepSeekProvider(this.context!) },
            { id: 'cohere', factory: () => new CohereProvider(this.context!) },

            // These will be implemented later
            // { id: 'ai21', factory: () => new AI21Provider(this.context!) },
            // { id: 'alephalpha', factory: () => new AlephAlphaProvider(this.context!) },
            // { id: 'togetherai', factory: () => new TogetherAIProvider(this.context!) },
            // { id: 'perplexity', factory: () => new PerplexityAIProvider(this.context!) }
        ];

        // Register each provider
        for (const { id, factory } of providerFactories) {
            await this.tryRegisterProvider(id, factory);
        }

        logger.info(`Initialized ${this.providers.size} LLM providers.`);
        const configured = this.getConfiguredProviders();
        logger.info(`${configured.length} providers are configured: ${configured.map(p => p.providerId).join(', ')}`);

        // Notify listeners that providers have changed
        this._onProvidersChanged.fire();
    }

    private async reinitializeProviders() {
        await this.initializeProviders();
    }

    /**
     * Attempt to register a provider with error handling
     */
    private async tryRegisterProvider(id: string, providerFactory: () => ILLMProvider): Promise<void> {
        try {
            const provider = providerFactory();

            // Only register if the provider initializes successfully
            if (provider) {
                this.registerProvider(provider);
                logger.info(`Successfully registered provider: ${id}`);

                // Try to initialize models if provider is configured
                if (provider.isConfigured()) {
                    try {
                        const models = await provider.listModels();
                        logger.info(`Provider ${id} has ${models.length} models available`);
                    } catch (error) {
                        // Log the error but don't let it prevent the provider from being registered
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        logger.warn(`Failed to list models for provider ${id}: ${errorMessage}`);

                        // Don't show notifications for Ollama and LM Studio during startup
                        // as these are common local providers that might not be running
                        if (id !== 'ollama' && id !== 'lmstudio') {
                            vscode.window.showWarningMessage(
                                `Failed to connect to ${id} provider. The provider is registered but may not work until the connection issue is resolved.`
                            );
                        }
                    }
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.warn(`Failed to initialize ${id} provider: ${errorMessage}`);
        }
    }

    /**
     * Registers a new LLM provider
     */
    registerProvider(provider: ILLMProvider): void {
        if (this.providers.has(provider.providerId)) {
            logger.warn(`Provider with ID '${provider.providerId}' is already registered. Overwriting.`);
        }
        this.providers.set(provider.providerId, provider);
    }

    /**
     * Gets a provider by ID
     */
    getProvider(providerId: string): ILLMProvider | undefined {
        return this.providers.get(providerId);
    }

    /**
     * Gets the appropriate LLM provider based on the config
     */
    getProviderForConfig(config: LLMConfig): ILLMProvider | undefined {
        const provider = this.providers.get(config.provider);

        if (!provider) {
            logger.warn(`LLM provider '${config.provider}' not found.`);
            return undefined;
        }

        if (!provider.isConfigured()) {
            logger.warn(`LLM provider '${config.provider}' is not configured.`);
            return undefined;
        }

        return provider;
    }

    /**
     * Gets the default provider based on settings
     */
    getDefaultProvider(): ILLMProvider | undefined {
        if (!this.context) {
            logger.error('LLMService not initialized with context');
            return undefined;
        }

        // Get default provider ID from settings
        const defaultProviderId = providerSettingsManager.getInstance(this.context).getDefaultProviderId();
        const provider = this.providers.get(defaultProviderId);

        // If the default provider is not available or not configured, try to find another configured provider
        if (!provider || !provider.isConfigured()) {
            logger.warn(`Default provider '${defaultProviderId}' not found or not configured. Trying to find another provider.`);
            const configuredProviders = this.getConfiguredProviders();
            if (configuredProviders.length > 0) {
                return configuredProviders[0];
            }
            return undefined;
        }

        return provider;
    }

    /**
     * Sets the default provider
     */
    async setDefaultProvider(providerId: string): Promise<boolean> {
        if (!this.context) {
            logger.error('LLMService not initialized with context');
            return false;
        }

        const provider = this.providers.get(providerId);
        if (!provider) {
            logger.warn(`Cannot set default provider: Provider '${providerId}' not found.`);
            return false;
        }

        try {
            await providerSettingsManager.getInstance(this.context).setDefaultProviderId(providerId);
            logger.info(`Set default provider to ${providerId}`);
            return true;
        } catch (error) {
            logger.error(`Failed to set default provider to ${providerId}:`, error);
            return false;
        }
    }

    /**
     * Gets all available LLM providers
     */
    getAllProviders(): ILLMProvider[] {
        return Array.from(this.providers.values());
    }

    /**
     * Gets all available configured providers
     */
    getConfiguredProviders(): ILLMProvider[] {
        return Array.from(this.providers.values())
            .filter(provider => provider.isConfigured());
    }

    /**
     * Lists all provider IDs
     */
    listProviderIds(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Gets the default model configuration from settings
     */
    getDefaultModelConfig(): LLMConfig {
        return getDefaultModelConfig();
    }

    /**
     * Updates the configuration for a provider
     */
    async updateProviderConfig(providerId: string, config: LLMProviderConfig): Promise<boolean> {
        if (!this.context) {
            logger.error('LLMService not initialized with context');
            return false;
        }

        const provider = this.providers.get(providerId);
        if (!provider) {
            logger.warn(`Cannot update provider config: Provider '${providerId}' not found.`);
            return false;
        }

        try {
            await provider.updateConfig(config);
            logger.info(`Updated configuration for provider ${providerId}`);
            return true;
        } catch (error) {
            logger.error(`Failed to update configuration for provider ${providerId}:`, error);
            return false;
        }
    }

    /**
     * Gets the configuration for a provider
     */
    getProviderConfig(providerId: string): LLMProviderConfig | undefined {
        const provider = this.providers.get(providerId);
        if (!provider) {
            return undefined;
        }

        return provider.getConfig();
    }
}

export const llmService = new LLMService();
