import * as vscode from 'vscode';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult, LLMModelInfo, LLMProviderConfig } from '../llmProvider';
import { ITool } from '../../tools/tool';
import { logger } from '../../logger';
import { providerManager } from '../providerManager';

/**
 * Base class for LLM providers that implements common functionality
 */
export abstract class BaseLLMProvider implements ILLMProvider {
    protected config: LLMProviderConfig = {};
    protected context?: vscode.ExtensionContext;

    constructor(context?: vscode.ExtensionContext) {
        this.context = context;
        if (context) {
            this.loadConfig();
        }
    }

    // Abstract properties that must be implemented by subclasses
    abstract readonly providerId: string;
    abstract readonly displayName: string;
    abstract readonly description: string;
    abstract readonly website: string;
    abstract readonly requiresApiKey: boolean;
    abstract readonly supportsEndpointConfiguration: boolean;
    abstract readonly defaultEndpoint?: string;
    abstract readonly defaultModel?: string;

    // Abstract methods that must be implemented by subclasses
    abstract generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult>;

    abstract listModels(): Promise<LLMModelInfo[]>;
    abstract testConnection(modelId: string): Promise<{success: boolean, message: string}>;

    /**
     * Load the provider configuration
     */
    public async loadConfig(): Promise<void> {
        try {
            if (this.context) {
                this.config = await providerManager.getInstance(this.context).getProviderConfig(this.providerId);
                logger.debug(`Loaded configuration for provider ${this.providerId}`);
            } else {
                // If no context, try to get config from workspace settings
                const config = vscode.workspace.getConfiguration('codessa.llm');
                const providers = config.get<Record<string, LLMProviderConfig>>('providers') || {};
                this.config = providers[this.providerId] || {};
                logger.debug(`Loaded configuration for provider ${this.providerId} without context: ${JSON.stringify(this.config)}`);
            }
        } catch (error) {
            logger.error(`Failed to load configuration for provider ${this.providerId}:`, error);
            this.config = {};
        }
    }

    /**
     * Check if the provider is configured and ready to use
     */
    public isConfigured(): boolean {
        if (this.requiresApiKey && !this.config.apiKey) {
            return false;
        }
        return true;
    }

    /**
     * Get the current configuration
     */
    public getConfig(): LLMProviderConfig {
        return { ...this.config };
    }

    /**
     * Update the provider configuration
     */
    public async updateConfig(config: LLMProviderConfig): Promise<void> {
        try {
            if (this.context) {
                const success = await providerManager.getInstance(this.context).updateProviderConfig(this.providerId, config);
                if (!success) {
                    throw new Error(`Failed to update configuration for provider ${this.providerId}`);
                }
            } else {
                // If no context, update workspace settings directly
                const vsConfig = vscode.workspace.getConfiguration('codessa.llm');
                const providers = vsConfig.get<Record<string, LLMProviderConfig>>('providers') || {};

                // Update the specific provider in the providers object
                const updatedProviders = {
                    ...providers,
                    [this.providerId]: config
                };

                // Update the entire providers object
                try {
                    // First try Global level
                    await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Global);
                    logger.info(`Updated global configuration for provider ${this.providerId}`);
                } catch (globalError) {
                    logger.warn(`Failed to update global configuration: ${globalError}. Trying workspace level...`);

                    // Then try Workspace level if available
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Workspace);
                        logger.info(`Updated workspace configuration for provider ${this.providerId}`);
                    } else {
                        throw new Error(`Failed to update configuration: No valid configuration target found`);
                    }
                }
            }
            this.config = config;
            logger.info(`Updated configuration for provider ${this.providerId}`);
        } catch (error) {
            logger.error(`Failed to update configuration for provider ${this.providerId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to update provider configuration: ${errorMessage}`);
        }
    }

    /**
     * Get the required configuration fields for this provider
     */
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select' | 'file' | 'directory', options?: string[]}> {
        const fields: Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select' | 'file' | 'directory', options?: string[]}> = [];

        if (this.requiresApiKey) {
            fields.push({
                id: 'apiKey',
                name: 'API Key',
                description: `API key for ${this.displayName}`,
                required: true,
                type: 'string'
            });
        }

        if (this.supportsEndpointConfiguration) {
            fields.push({
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: `API endpoint for ${this.displayName}`,
                required: false,
                type: 'string'
            });
        }

        fields.push({
            id: 'defaultModel',
            name: 'Default Model',
            description: `Default model to use for ${this.displayName}`,
            required: false,
            type: 'string'
        });

        return fields;
    }

    /**
     * Backward compatibility method for getAvailableModels
     * @deprecated Use listModels instead
     */
    public async getAvailableModels(): Promise<string[]> {
        const models = await this.listModels();
        return models.map(model => model.id);
    }
}
