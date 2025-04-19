import * as vscode from 'vscode';
import { ILLMProvider } from './llmProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { GoogleAIProvider } from './providers/googleAIProvider';
import { MistralAIProvider } from './providers/mistralAIProvider';
// Import other providers here
import { logger } from '../logger';
import { LLMConfig, getDefaultModelConfig } from '../config';

/**
 * Service that manages LLM providers and model selection
 */
class LLMService {
    private providers = new Map<string, ILLMProvider>();
    
    constructor() {
        this.initializeProviders();
        // Listen for configuration changes that might affect providers
        vscode.workspace.onDidChangeConfiguration(e => {
             if (e.affectsConfiguration('codessa.providers')) {
                 logger.info("Provider configuration changed, re-initializing providers.");
                 // Re-initialize or update providers as needed
                 this.providers.clear(); // Simple approach: clear and re-register
                 this.initializeProviders();
             }
         });
    }
    
    private initializeProviders() {
        // Register built-in providers
        try {
            this.registerProvider(new OpenAIProvider());
        } catch (error) {
            logger.warn("Failed to initialize OpenAIProvider:", error);
        }
        
        try {
            this.registerProvider(new OllamaProvider());
        } catch (error) {
            logger.warn("Failed to initialize OllamaProvider:", error);
        }
        
        // Add more providers as they're implemented
        // this.tryRegisterProvider('googleai', () => new GoogleAIProvider());
        // this.tryRegisterProvider('mistralai', () => new MistralAIProvider());
        // this.tryRegisterProvider('anthropic', () => new AnthropicProvider());
        
        logger.info(`Initialized ${this.providers.size} LLM providers.`);
    }
    
    /**
     * Attempt to register a provider with error handling
     */
    private tryRegisterProvider(id: string, providerFactory: () => ILLMProvider): void {
        try {
            const provider = providerFactory();
            this.registerProvider(provider);
        } catch (error) {
            logger.warn(`Failed to initialize ${id} provider:`, error);
        }
    }
    
    /**
     * Registers a new LLM provider
     */
    registerProvider(provider: ILLMProvider): void {
        if (this.providers.has(provider.providerId)) {
            logger.warn(`Provider with ID '${provider.providerId}' is already registered. Overwriting.`);
        }
        logger.info(`Registering LLM provider: ${provider.providerId}`);
        this.providers.set(provider.providerId, provider);
    }
    
    /**
     * Gets a provider by ID
     */
    getProvider(providerId: string): ILLMProvider | undefined {
        const provider = this.providers.get(providerId);
        if (!provider) {
            logger.warn(`LLM Provider '${providerId}' not found or not registered.`);
        }
        return provider;
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
     * Gets the default provider based on global config
     */
    getDefaultProvider(): ILLMProvider | undefined {
        const defaultConfig = getDefaultModelConfig();
        return this.getProviderForConfig(defaultConfig);
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

    listProviderIds(): string[] {
        return Array.from(this.providers.keys());
    }
}

export const llmService = new LLMService();
