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
    private readonly configSection = 'codessa.llm.providers';

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
            const config = vscode.workspace.getConfiguration(this.configSection);
            const providerConfig = config.get<LLMProviderConfig>(providerId) || {};

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
                const vsConfig = vscode.workspace.getConfiguration(this.configSection);
                
                // First try Global target
                try {
                    await vsConfig.update(providerId, config, vscode.ConfigurationTarget.Global);
                    logger.info(`Updated global configuration for provider ${providerId}`);
                } catch (globalError) {
                    logger.warn(`Failed to update global configuration, trying Workspace target: ${globalError}`);
                    
                    // Fall back to Workspace target if Global fails
                    try {
                        await vsConfig.update(providerId, config, vscode.ConfigurationTarget.Workspace);
                        logger.info(`Updated workspace configuration for provider ${providerId}`);
                    } catch (workspaceError) {
                        logger.error(`Failed to update workspace configuration: ${workspaceError}`);
                        throw new Error(`Failed to update configuration at both Global and Workspace levels: ${workspaceError}`);
                    }
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
            await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Global);
            logger.info(`Set default provider to ${providerId}`);
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
