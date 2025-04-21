import * as vscode from 'vscode';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult, LLMModelInfo, LLMProviderConfig } from '../llmProvider';
import { ITool } from '../../tools/tool';
import { logger } from '../../logger';
import { providerSettingsManager } from '../providerSettings';

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
    protected async loadConfig(): Promise<void> {
        try {
            if (this.context) {
                this.config = await providerSettingsManager.getInstance(this.context).getProviderConfig(this.providerId);
                logger.debug(`Loaded configuration for provider ${this.providerId}`);
            } else {
                // If no context, try to get config from workspace settings
                const config = vscode.workspace.getConfiguration('codessa.llm.providers');
                this.config = config.get(this.providerId) || {};
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
                await providerSettingsManager.getInstance(this.context).updateProviderConfig(this.providerId, config);
            } else {
                // If no context, update workspace settings directly
                const vsConfig = vscode.workspace.getConfiguration('codessa.llm.providers');
                await vsConfig.update(this.providerId, config, vscode.ConfigurationTarget.Global);
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
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> {
        const fields: Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> = [];

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
