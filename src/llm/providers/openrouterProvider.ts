import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { ITool } from '../../tools/tool';
import { logger } from '../../logger';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for OpenRouter API
 */
export class OpenRouterProvider extends BaseLLMProvider {
    readonly providerId = 'openrouter';
    readonly displayName = 'OpenRouter';
    readonly description = 'Access multiple AI models through a unified API';
    readonly website = 'https://openrouter.ai';
    readonly requiresApiKey = true;
    readonly supportsEndpointConfiguration = false;
    readonly defaultEndpoint = 'https://openrouter.ai/api/v1';
    readonly defaultModel = 'openai/gpt-3.5-turbo';

    private client: any = null;
    private baseUrl: string;

    constructor(context: vscode.ExtensionContext) {
        super(context);
        this.baseUrl = this.defaultEndpoint;
        this.initializeClient();
    }

    /**
     * Initialize the Axios client for API requests
     */
    private initializeClient(): void {
        try {
            if (!this.config.apiKey) {
                logger.warn('OpenRouter API key not configured');
                this.client = null;
                return;
            }

            this.client = axios.create({
                baseURL: this.baseUrl,
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'HTTP-Referer': 'https://github.com/djlaserman/Codessa', // Required by OpenRouter
                    'X-Title': 'Codessa VS Code Extension' // Required by OpenRouter
                }
            });

            logger.info('OpenRouter client initialized');
        } catch (error) {
            logger.error('Failed to initialize OpenRouter client:', error);
            this.client = null;
        }
    }

    /**
     * Check if the provider is configured
     */
    public isConfigured(): boolean {
        return !!this.client && !!this.config.apiKey;
    }

    /**
     * Generate text using OpenRouter
     */
    public async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'OpenRouter client not initialized' };
        }

        // Check for cancellation before starting
        if (cancellationToken?.isCancellationRequested) {
            return { content: '', error: 'Request cancelled', finishReason: 'cancelled' };
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;

            // Prepare messages array with proper typing
            const messages: Array<{ role: string; content: string; name?: string; tool_call_id?: string }> = [];

            if (params.history && params.history.length > 0) {
                messages.push(...params.history);
            } else {
                if (params.systemPrompt) {
                    messages.push({
                        role: 'system',
                        content: params.systemPrompt
                    });
                }
                messages.push({
                    role: 'user',
                    content: params.prompt
                });
            }

            // Format tools if provided
            const functions = tools && tools.size > 0 ? Array.from(tools.values()).map(tool => ({
                name: tool.id,
                description: tool.description,
                parameters: tool.inputSchema || { type: 'object', properties: {} }
            })) : undefined;

            // Only set tool_choice if we have functions
            const tool_choice = functions ? "auto" : undefined;

            // Create cancellation token source to abort the request if needed
            let abortController: AbortController | undefined;

            if (cancellationToken) {
                // Use the global AbortController if available, or provide a simple fallback
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger.info("OpenRouter request cancelled by user");
                        abortController?.abort();
                    });
                } else {
                    logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }

            // Make the API request
            const response = await this.client.post('/v1/chat/completions', {
                model: modelId,
                messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                functions,
                tool_choice
            }, {
                signal: abortController?.signal
            });

            // Check if the request was cancelled during the API call
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled', finishReason: 'cancelled' };
            }

            // Extract the response content
            const content = response.data.choices[0]?.message?.content || '';

            // Handle tool calls
            let toolCallRequest;
            if (response.data.choices[0]?.message?.function_call) {
                const functionCall = response.data.choices[0].message.function_call;
                toolCallRequest = {
                    name: functionCall.name,
                    arguments: JSON.parse(functionCall.arguments)
                };
            }

            return {
                content,
                finishReason: response.data.choices[0]?.finish_reason || 'stop',
                usage: response.data.usage || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                toolCallRequest
            };
        } catch (error) {
            logger.error('Error generating text with OpenRouter:', error);
            return {
                content: '',
                error: `OpenRouter generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Stream generate text using OpenRouter
     */
    public async *streamGenerate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken
    ): AsyncGenerator<string, void, unknown> {
        if (!this.client) {
            throw new Error('OpenRouter client not initialized');
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;

            // Prepare messages for OpenRouter
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
            const response = await this.client.post('/chat/completions', {
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
                    logger.error('Error parsing OpenRouter stream chunk:', error);
                }
            }
        } catch (error) {
            logger.error('Error streaming text with OpenRouter:', error);
            throw new Error(`OpenRouter streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * List available models from OpenRouter
     */
    public async listModels(): Promise<LLMModelInfo[]> {
        if (!this.client) {
            logger.warn("Cannot fetch OpenRouter models, client not configured.");
            return [];
        }

        try {
            logger.debug('Fetching OpenRouter models list');
            const response = await this.client.get('/models');

            // OpenRouter response format
            const models = response.data?.data || [];
            logger.info(`Provider openrouter has ${models.length} models available`);

            return models.map((m: any) => ({
                id: m.id,
                name: m.name || m.id,
                description: m.description || '',
                contextWindow: m.context_length || 4096,
                maxOutputTokens: m.max_output_tokens,
                supportsFunctions: m.supports_functions || false,
                supportsVision: m.supports_vision || false
            })).sort((a: LLMModelInfo, b: LLMModelInfo) => a.id.localeCompare(b.id));
        } catch (error) {
            logger.error("Failed to fetch OpenRouter models:", error);

            // Return some default models
            return [
                {
                    id: 'openai/gpt-3.5-turbo',
                    name: 'GPT-3.5 Turbo',
                    description: 'OpenAI GPT-3.5 Turbo via OpenRouter',
                    contextWindow: 4096
                },
                {
                    id: 'openai/gpt-4',
                    name: 'GPT-4',
                    description: 'OpenAI GPT-4 via OpenRouter',
                    contextWindow: 8192
                },
                {
                    id: 'anthropic/claude-2',
                    name: 'Claude 2',
                    description: 'Anthropic Claude 2 via OpenRouter',
                    contextWindow: 100000
                }
            ];
        }
    }

    /**
     * Test connection to OpenRouter
     */
    public async testConnection(): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'OpenRouter client not initialized. Please check your API key.'
            };
        }

        try {
            // Try a simple models request
            await this.client.get('/models');

            return {
                success: true,
                message: 'Successfully connected to OpenRouter API.'
            };
        } catch (error) {
            logger.error('OpenRouter connection test failed:', error);
            return {
                success: false,
                message: `Failed to connect to OpenRouter API: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Update the provider configuration
     */
    public async updateConfig(config: any): Promise<void> {
        await super.updateConfig(config);
        this.initializeClient();
    }

    /**
     * Get the configuration fields for this provider
     */
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your OpenRouter API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., openai/gpt-3.5-turbo)',
                required: false,
                type: 'string'
            }
        ];
    }
}
