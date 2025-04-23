import * as vscode from 'vscode';
import { logger } from '../logger';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult, LLMModelInfo, LLMProviderConfig } from './llmProvider';
import { credentialsManager } from '../credentials/credentialsManager';
import { ITool } from '../tools/tool';

/**
 * Manages all aspects of LLM providers:
 * - Provider registration and initialization
 * - Provider configuration and settings
 * - Credentials management
 * - Model listing and selection
 *
 * This class consolidates functionality that was previously spread across multiple files.
 */
export class ProviderManager {
    private static instance: ProviderManager;
    private context?: vscode.ExtensionContext;
    private providers: Map<string, ILLMProvider> = new Map();
    private readonly configSection = 'codessa.llm';

    private constructor(context?: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Get the singleton instance of ProviderManager
     */
    public static getInstance(context?: vscode.ExtensionContext): ProviderManager {
        if (!ProviderManager.instance) {
            if (!context) {
                throw new Error('ProviderManager must be initialized with a context first');
            }
            ProviderManager.instance = new ProviderManager(context);
        }
        return ProviderManager.instance;
    }

    /**
     * Initialize the provider manager with the extension context
     */
    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        logger.info('Provider manager initialized');
    }

    /**
     * Register a provider with the manager
     */
    public registerProvider(provider: ILLMProvider): void {
        if (this.providers.has(provider.providerId)) {
            logger.warn(`Provider with ID '${provider.providerId}' is already registered. Overwriting.`);
        }
        this.providers.set(provider.providerId, provider);
        logger.info(`Registered provider: ${provider.providerId}`);
    }

    /**
     * Get a provider by ID
     */
    public getProvider(providerId: string): ILLMProvider | undefined {
        return this.providers.get(providerId);
    }

    /**
     * Get all registered providers
     */
    public getAllProviders(): ILLMProvider[] {
        return Array.from(this.providers.values());
    }

    /**
     * Get all provider IDs
     */
    public getAllProviderIds(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Get all configured providers
     */
    public getConfiguredProviders(): ILLMProvider[] {
        return Array.from(this.providers.values())
            .filter(provider => provider.isConfigured());
    }

    /**
     * Get the default provider based on settings
     */
    public getDefaultProvider(): ILLMProvider | undefined {
        if (!this.context) {
            logger.error('ProviderManager not initialized with context');
            return undefined;
        }

        // Get default provider ID from settings
        const defaultProviderId = this.getDefaultProviderId();
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
     * Get the default provider ID from settings
     */
    public getDefaultProviderId(): string {
        try {
            const config = vscode.workspace.getConfiguration(this.configSection);
            return config.get<string>('defaultProvider') || 'ollama';
        } catch (error) {
            logger.error('Failed to get default provider ID:', error);
            return 'ollama';
        }
    }

    /**
     * Set the default provider ID
     */
    public async setDefaultProviderId(providerId: string): Promise<boolean> {
        try {
            const config = vscode.workspace.getConfiguration(this.configSection);

            // Try different configuration targets in order
            try {
                // First try updating at the Global level
                try {
                    await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Global);
                    logger.info(`Set default provider to ${providerId} at global level`);
                    return true;
                } catch (globalError) {
                    logger.warn(`Failed to set default provider at global level: ${globalError}. Trying workspace level...`);
                }

                // Then try Workspace level if available
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Workspace);
                    logger.info(`Set default provider to ${providerId} at workspace level`);
                    return true;
                }

                // If we get here, both attempts failed
                logger.error(`Failed to set default provider to ${providerId}: No valid configuration target found`);
                return false;
            } catch (updateError) {
                logger.error(`Failed to set default provider: ${updateError}`);
                return false;
            }
        } catch (error) {
            logger.error(`Failed to set default provider to ${providerId}:`, error);
            return false;
        }
    }

    /**
     * Get the configuration for a provider
     */
    public async getProviderConfig(providerId: string): Promise<LLMProviderConfig> {
        try {
            if (!this.context) {
                throw new Error('ProviderManager not initialized with context');
            }

            // Get non-sensitive settings from VS Code configuration
            const config = vscode.workspace.getConfiguration(this.configSection);
            const providers = config.get<Record<string, LLMProviderConfig>>('providers') || {};
            const providerConfig = providers[providerId] || {};

            // Get sensitive settings from secure storage
            const apiKey = await credentialsManager.getInstance(this.context).getCredential(providerId, 'apiKey');

            return {
                ...providerConfig,
                apiKey: apiKey || providerConfig.apiKey
            };
        } catch (error) {
            logger.error(`Failed to get provider config for ${providerId}:`, error);
            return {};
        }
    }

    /**
     * Update the configuration for a provider
     */
    public async updateProviderConfig(providerId: string, config: LLMProviderConfig): Promise<boolean> {
        try {
            if (!this.context) {
                throw new Error('ProviderManager not initialized with context');
            }

            // Store API key in secure storage
            if (config.apiKey) {
                await credentialsManager.getInstance(this.context).storeCredential(
                    providerId,
                    'apiKey',
                    config.apiKey
                );

                // Remove API key from the config object that will be stored in settings
                const { apiKey, ...nonSensitiveConfig } = config;
                config = nonSensitiveConfig;
            }

            // Update non-sensitive settings in VS Code configuration
            try {
                // Get the current configuration
                const vsConfig = vscode.workspace.getConfiguration(this.configSection);

                // Get the current providers object
                const providers = vsConfig.get('providers') || {};

                // Update the specific provider in the providers object
                const updatedProviders = {
                    ...providers,
                    [providerId]: config
                };

                // Log the current configuration and what we're trying to update
                logger.debug(`Current providers configuration: ${JSON.stringify(providers)}`);
                logger.debug(`Updating provider ${providerId} with config: ${JSON.stringify(config)}`);
                logger.debug(`Updated providers will be: ${JSON.stringify(updatedProviders)}`);

                // Update the entire providers object
                try {
                    // First try updating at the User level (most reliable)
                    try {
                        // Use ConfigurationTarget.Global explicitly instead of boolean true
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Global);
                        logger.info(`Updated global configuration for provider ${providerId}`);

                        // Update the provider instance if it exists
                        const provider = this.providers.get(providerId);
                        if (provider) {
                            await provider.loadConfig();
                        }

                        return true;
                    } catch (userError) {
                        logger.warn(`Failed to update global configuration: ${userError}. Trying workspace level...`);
                    }

                    // Then try Workspace level if available
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Workspace);
                        logger.info(`Updated workspace configuration for provider ${providerId}`);

                        // Update the provider instance if it exists
                        const provider = this.providers.get(providerId);
                        if (provider) {
                            await provider.loadConfig();
                        }

                        return true;
                    }

                    // If we get here, both attempts failed
                    logger.error(`Failed to update configuration for provider ${providerId}: No valid configuration target found`);
                    return false;
                } catch (updateError) {
                    logger.error(`Failed to update configuration: ${updateError}`);
                    return false;
                }
            } catch (error) {
                logger.error(`Failed to update configuration for provider ${providerId}:`, error);
                return false;
            }
        } catch (error) {
            logger.error(`Failed to update provider config for ${providerId}:`, error);
            return false;
        }
    }

    /**
     * Check if a provider is configured
     */
    public async isProviderConfigured(providerId: string): Promise<boolean> {
        try {
            const provider = this.providers.get(providerId);
            if (!provider) {
                return false;
            }
            return provider.isConfigured();
        } catch (error) {
            logger.error(`Failed to check if provider ${providerId} is configured:`, error);
            return false;
        }
    }

    /**
     * Generate text with a provider
     */
    public async generate(
        providerId: string,
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider '${providerId}' not found`);
        }

        if (!provider.isConfigured()) {
            throw new Error(`Provider '${providerId}' is not configured`);
        }

        return provider.generate(params, cancellationToken, tools);
    }

    /**
     * List models for a provider
     */
    public async listModels(providerId: string): Promise<LLMModelInfo[]> {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider '${providerId}' not found`);
        }

        if (!provider.isConfigured()) {
            throw new Error(`Provider '${providerId}' is not configured`);
        }

        return provider.listModels();
    }

    /**
     * Test connection to a provider
     */
    public async testConnection(providerId: string, modelId: string): Promise<{success: boolean, message: string}> {
        const provider = this.providers.get(providerId);
        if (!provider) {
            return {
                success: false,
                message: `Provider '${providerId}' not found`
            };
        }

        if (!provider.isConfigured()) {
            return {
                success: false,
                message: `Provider '${providerId}' is not configured`
            };
        }

        return provider.testConnection(modelId);
    }
}

// Export singleton instance
export const providerManager = {
    getInstance: ProviderManager.getInstance
};
