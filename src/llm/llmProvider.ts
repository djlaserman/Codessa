import * as vscode from 'vscode';
import { ITool } from '../tools/tool';

export interface LLMGenerateParams {
    prompt: string;
    systemPrompt?: string;
    modelId: string;
    history?: Array<{ role: string; content: string; name?: string; tool_call_id?: string; }>;
    mode?: 'chat' | 'task' | 'edit' | 'generate' | 'inline';
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    options?: Record<string, any>;
}

export interface ToolCallRequest {
    id?: string;
    name: string;
    arguments: Record<string, any>;
}

export interface LLMGenerateResult {
    content: string;
    finishReason?: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    toolCalls?: any[];
    toolCallRequest?: ToolCallRequest;
    error?: string;
}

export interface LLMModelInfo {
    id: string;
    name?: string;
    description?: string;
    contextWindow?: number;
    maxOutputTokens?: number;
    supportsFunctions?: boolean;
    supportsVision?: boolean;
    deprecated?: boolean;
}

export interface LLMProviderConfig {
    apiKey?: string;
    apiEndpoint?: string;
    organizationId?: string;
    defaultModel?: string;
    additionalParams?: Record<string, any>;
}

export interface ILLMProvider {
    readonly providerId: string;
    readonly displayName: string;
    readonly description: string;
    readonly website: string;
    readonly defaultEndpoint?: string;
    readonly requiresApiKey: boolean;
    readonly supportsEndpointConfiguration: boolean;
    readonly defaultModel?: string;

    /**
     * Generates text based on the provided parameters.
     */
    generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult>;

    /**
     * Generates text streamingly, yielding chunks as they arrive.
     * Note: Not all providers support streaming.
     */
    streamGenerate?(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken
    ): AsyncGenerator<string, void, unknown>;

    /**
     * Fetches the list of available models for this provider.
     * @deprecated Use listModels() instead
     */
    getAvailableModels?(): Promise<string[]>;

    /**
     * Lists available models with their details.
     * This is the preferred method for getting models.
     */
    listModels(): Promise<LLMModelInfo[]>;

    /**
     * Tests the connection to the provider with the specified model.
     */
    testConnection(modelId: string): Promise<{success: boolean, message: string}>;

    /**
     * Checks if the provider is configured and ready (e.g., API key set).
     */
    isConfigured(): boolean;

    /**
     * Gets the current configuration for this provider.
     */
    getConfig(): LLMProviderConfig;

    /**
     * Updates the configuration for this provider.
     */
    updateConfig(config: LLMProviderConfig): Promise<void>;

    /**
     * Gets the required configuration fields for this provider.
     */
    getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}>;
}
