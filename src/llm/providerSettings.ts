import * as vscode from 'vscode';
import { logger } from '../logger';
import { LLMProviderConfig } from './llmProvider';
import { credentialsManager } from '../credentials/credentialsManager';

/**
 * Manages provider settings, combining secure credentials with
 * non-sensitive configuration stored in VS Code settings
 */
export class ProviderSettingsManager {
    private static instance: ProviderSettingsManager;
    private context: vscode.ExtensionContext;
    private readonly configSection = 'codessa.llm';

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Get the singleton instance of ProviderSettingsManager
     */
    public static getInstance(context?: vscode.ExtensionContext): ProviderSettingsManager {
        if (!ProviderSettingsManager.instance) {
            if (!context) {
                throw new Error('ProviderSettingsManager must be initialized with a context first');
            }
            ProviderSettingsManager.instance = new ProviderSettingsManager(context);
        }
        return ProviderSettingsManager.instance;
    }

    /**
     * Get the configuration for a provider
     * @param providerId The provider ID
     * @returns The provider configuration
     */
    public async getProviderConfig(providerId: string): Promise<LLMProviderConfig> {
        try {
            // Get non-sensitive settings from VS Code configuration
            const config = vscode.workspace.getConfiguration('codessa.llm');
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
     * @param providerId The provider ID
     * @param config The new configuration
     */
    public async updateProviderConfig(providerId: string, config: LLMProviderConfig): Promise<void> {
        try {
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
                const vsConfig = vscode.workspace.getConfiguration('codessa.llm');

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
                        await vsConfig.update('providers', updatedProviders, true);
                        logger.info(`Updated user configuration for provider ${providerId}`);
                        return; // Exit if successful
                    } catch (userError) {
                        logger.warn(`Failed to update user configuration: ${userError}. Trying workspace/global...`);
                    }

                    // Then try Workspace or Global level
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Workspace);
                        logger.info(`Updated workspace configuration for provider ${providerId}`);
                    } else {
                        // If no workspace is open, update at the Global level
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Global);
                        logger.info(`Updated global configuration for provider ${providerId}`);
                    }
                } catch (updateError) {
                    logger.error(`Failed to update configuration: ${updateError}`);
                    throw new Error(`Failed to update configuration: ${updateError}`);
                }
            } catch (error) {
                logger.error(`Failed to update configuration for provider ${providerId}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to update provider configuration: ${errorMessage}. Please check your VS Code settings permissions.`);
            }
        } catch (error) {
            logger.error(`Failed to update provider config for ${providerId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to update provider configuration: ${errorMessage}`);
        }
    }

    /**
     * Check if a provider has been configured
     * @param providerId The provider ID
     * @returns True if the provider has been configured
     */
    public async isProviderConfigured(providerId: string): Promise<boolean> {
        try {
            const config = await this.getProviderConfig(providerId);
            const hasApiKey = await credentialsManager.getInstance(this.context).hasCredential(providerId, 'apiKey');

            // Check if the provider has the minimum required configuration
            return hasApiKey || (config.apiKey !== undefined && config.apiKey !== '');
        } catch (error) {
            logger.error(`Failed to check if provider ${providerId} is configured:`, error);
            return false;
        }
    }

    /**
     * Get the default provider ID from settings
     * @returns The default provider ID, or 'ollama' if not set
     */
    public getDefaultProviderId(): string {
        try {
            const config = vscode.workspace.getConfiguration('codessa.llm');
            return config.get<string>('defaultProvider') || 'ollama';
        } catch (error) {
            logger.error('Failed to get default provider ID:', error);
            return 'ollama';
        }
    }

    /**
     * Set the default provider ID
     * @param providerId The provider ID to set as default
     */
    public async setDefaultProviderId(providerId: string): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('codessa.llm');

            // Try different configuration targets in order
            try {
                // First try updating at the Workspace level if we have a workspace
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Workspace);
                    logger.info(`Set default provider to ${providerId} at workspace level`);
                } else {
                    // If no workspace is open, update at the Global level
                    await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Global);
                    logger.info(`Set default provider to ${providerId} at global level`);
                }
            } catch (updateError) {
                logger.warn(`Failed to set default provider at workspace/global level: ${updateError}`);

                // Try User settings as a fallback
                try {
                    await config.update('defaultProvider', providerId, true);
                    logger.info(`Set default provider to ${providerId} at user level`);
                } catch (userError) {
                    logger.error(`Failed to set default provider at user level: ${userError}`);
                    throw new Error(`Failed to set default provider: ${userError}`);
                }
            }
        } catch (error) {
            logger.error(`Failed to set default provider to ${providerId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to set default provider: ${errorMessage}`);
        }
    }
}

// Export singleton instance
export const providerSettingsManager = {
    getInstance: ProviderSettingsManager.getInstance
};
