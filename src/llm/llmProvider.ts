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

export interface ILLMProvider {
    readonly providerId: string;

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
     */
    getAvailableModels?(): Promise<string[]>;

    /**
     * Checks if the provider is configured and ready (e.g., API key set).
     */
    isConfigured(): boolean;
}
