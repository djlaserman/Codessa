import * as vscode from 'vscode';
import type { AxiosInstance } from 'axios';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { ITool } from '../../tools/tool';
import { logger } from '../../logger';

/**
 * Provider for LM Studio local LLM server
 */
export class LMStudioProvider extends BaseLLMProvider {
    readonly providerId = 'lmstudio';
    readonly displayName = 'LM Studio';
    readonly description = 'Run large language models locally with LM Studio';
    readonly website = 'https://lmstudio.ai';
    readonly requiresApiKey = false;
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'http://localhost:1234/v1';
    readonly defaultModel = 'local-model';

    private client: AxiosInstance | null = null;
    private baseUrl: string;

    constructor(context: vscode.ExtensionContext) {
        super(context);
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        this.initializeClient();
    }

    /**
     * Initialize the Axios client for API requests
     */
    private initializeClient(): void {
        try {
            this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;

            // Just store the base URL and use it directly in API calls
            this.client = {} as AxiosInstance; // Dummy instance, we'll use axios directly

            logger.info(`LM Studio client initialized for base URL: ${this.baseUrl}`);
        } catch (error) {
            logger.error('Failed to initialize LM Studio client:', error);
            this.client = null;
        }
    }

    /**
     * Check if the provider is configured
     */
    public isConfigured(): boolean {
        return !!this.baseUrl;
    }

    /**
     * Generate text using LM Studio
     */
    public async generate(
        params: LLMGenerateParams,
        _cancellationToken?: vscode.CancellationToken,
        _tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.baseUrl) {
            return { content: '', error: 'LM Studio client not initialized' };
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;

            // Prepare messages
            const messages: Array<{ role: string; content: string; name?: string; tool_call_id?: string }> = [];

            if (params.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: params.systemPrompt
                });
            }

            // Add history messages if provided
            if (params.history && params.history.length > 0) {
                messages.push(...params.history);
            } else {
                messages.push({
                    role: 'user',
                    content: params.prompt
                });
            }

            // Make the API request
            const response = await axios.post(`${this.baseUrl}/chat/completions`, {
                model: modelId,
                messages: messages,
                temperature: params.temperature || 0.7,
                max_tokens: params.maxTokens || 1024,
                stop: params.stopSequences || []
            });

            // Extract the response content
            const content = response.data.choices[0]?.message?.content || '';

            return {
                content,
                finishReason: response.data.choices[0]?.finish_reason || 'stop',
                usage: response.data.usage || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                }
            };
        } catch (error) {
            logger.error('Error generating text with LM Studio:', error);
            return {
                content: '',
                error: `LM Studio generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Stream generate text using LM Studio
     */
    public async *streamGenerate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken
    ): AsyncGenerator<string, void, unknown> {
        if (!this.baseUrl) {
            throw new Error('LM Studio client not initialized');
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;

            // Prepare messages for LM Studio
            const messages = [];

            // Add system message if provided
            if (params.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: params.systemPrompt
                });
            }

            // Add history messages if provided
            if (params.history && params.history.length > 0) {
                messages.push(...params.history);
            }

            // Add the current prompt
            messages.push({
                role: 'user',
                content: params.prompt
            });

            // Make the streaming API request
            const response = await axios.post(`${this.baseUrl}/chat/completions`, {
                model: modelId,
                messages: messages,
                temperature: params.temperature || 0.7,
                max_tokens: params.maxTokens || 1024,
                stop: params.stopSequences || [],
                stream: true
            }, {
                responseType: 'stream'
            });

            // Process the streaming response
            const stream = response.data;

            for await (const chunk of stream) {
                if (cancellationToken?.isCancellationRequested) {
                    break;
                }

                try {
                    const lines = chunk.toString().split('\n').filter(Boolean);

                    for (const line of lines) {
                        // Skip "data: [DONE]" messages
                        if (line === 'data: [DONE]') {
                            continue;
                        }

                        // Parse the JSON data
                        const jsonData = line.replace(/^data: /, '');
                        const data = JSON.parse(jsonData);

                        if (data.choices && data.choices[0]?.delta?.content) {
                            yield data.choices[0].delta.content;
                        }
                    }
                } catch (error) {
                    logger.error('Error parsing LM Studio stream chunk:', error);
                }
            }
        } catch (error) {
            logger.error('Error streaming text with LM Studio:', error);
            throw new Error(`LM Studio streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List available models from LM Studio
     */
    public async listModels(): Promise<LLMModelInfo[]> {
        if (!this.baseUrl) {
            logger.warn("Cannot fetch LM Studio models, client not configured.");
            return [];
        }

        try {
            logger.debug(`Fetching LM Studio models list from ${this.baseUrl}/models`);
            const response = await axios.get(`${this.baseUrl}/models`);

            // LM Studio response format follows OpenAI's format
            const models = response.data?.data || [];
            logger.info(`Provider lmstudio has ${models.length} models available`);

            return models.map((m: any) => ({
                id: m.id,
                name: m.id,
                description: m.description || 'Local LM Studio model',
                contextWindow: m.context_length || 4096
            })).sort((a: LLMModelInfo, b: LLMModelInfo) => a.id.localeCompare(b.id));
        } catch (error) {
            logger.error("Failed to fetch LM Studio models:", error);

            // LM Studio might not support the /models endpoint, so return a default model
            return [{
                id: 'local-model',
                name: 'Local Model',
                description: 'The model currently loaded in LM Studio',
                contextWindow: 4096
            }];
        }
    }

    /**
     * Test connection to LM Studio
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.baseUrl) {
            return {
                success: false,
                message: 'LM Studio client not initialized'
            };
        }

        try {
            // Check if we can connect to the LM Studio server
            await axios.get(`${this.baseUrl}/models`);

            return {
                success: true,
                message: `Successfully connected to LM Studio server at ${this.baseUrl}.`
            };
        } catch (error) {
            // Try a simple chat completion request as fallback
            try {
                await axios.post(`${this.baseUrl}/chat/completions`, {
                    model: modelId,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 5
                });

                return {
                    success: true,
                    message: `Successfully connected to LM Studio server at ${this.baseUrl}.`
                };
            } catch (secondError) {
                logger.error('LM Studio connection test failed:', secondError);
                return {
                    success: false,
                    message: `Failed to connect to LM Studio server at ${this.baseUrl}: ${secondError instanceof Error ? secondError.message : 'Unknown error'}`
                };
            }
        }
    }

    /**
     * Update the provider configuration
     */
    public async updateConfig(config: any): Promise<void> {
        await super.updateConfig(config);
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        this.initializeClient();
    }

    /**
     * Get the configuration fields for this provider
     */
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> {
        return [
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The URL of your LM Studio server (default: http://localhost:1234/v1)',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (usually "local-model")',
                required: false,
                type: 'string'
            }
        ];
    }
}
