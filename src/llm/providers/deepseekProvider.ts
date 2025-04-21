import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { ITool } from '../../tools/tool';
import { logger } from '../../logger';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for DeepSeek API
 */
export class DeepSeekProvider extends BaseLLMProvider {
    readonly providerId = 'deepseek';
    readonly displayName = 'DeepSeek';
    readonly description = 'Access DeepSeek AI models';
    readonly website = 'https://deepseek.ai';
    readonly requiresApiKey = true;
    readonly supportsEndpointConfiguration = false;
    readonly defaultEndpoint = 'https://api.deepseek.com/v1';
    readonly defaultModel = 'deepseek-chat';

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
                logger.warn('DeepSeek API key not configured');
                this.client = null;
                return;
            }

            this.client = axios.create({
                baseURL: this.baseUrl,
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            logger.info('DeepSeek client initialized');
        } catch (error) {
            logger.error('Failed to initialize DeepSeek client:', error);
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
     * Generate text using DeepSeek
     */
    public async generate(
        params: LLMGenerateParams,
        _cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'DeepSeek client not initialized' };
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;

            // Prepare messages
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
            let functions: Array<{ name: string; description: string; parameters: any }> | undefined = undefined;
            if (tools && tools.size > 0) {
                functions = Array.from(tools.values()).map(tool => ({
                    name: tool.id,
                    description: tool.description,
                    parameters: tool.inputSchema || { type: 'object', properties: {} }
                }));
            }

            let toolChoice: string | undefined = undefined;
            if (functions && functions.length > 0) {
                toolChoice = "auto";
            }

            // Make the API request
            const response = await this.client.post('/v1/chat/completions', {
                model: modelId,
                messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                functions,
                function_call: toolChoice
            });

            // Extract the response content
            const content = response.data.choices[0]?.message?.content || '';

            // Handle tool calls
            let toolCallRequest: LLMGenerateResult['toolCallRequest'] = undefined;
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
            logger.error('Error generating text with DeepSeek:', error);
            return {
                content: '',
                error: `DeepSeek generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * List available models from DeepSeek
     */
    public async listModels(): Promise<LLMModelInfo[]> {
        if (!this.client) {
            logger.warn("Cannot fetch DeepSeek models, client not configured.");
            return [];
        }

        try {
            logger.debug('Fetching DeepSeek models list');
            const response = await this.client.get('/models');

            // DeepSeek response format
            const models = response.data?.data || [];
            logger.info(`Provider deepseek has ${models.length} models available`);

            return models.map((m: any) => ({
                id: m.id,
                name: m.name || m.id,
                description: m.description || '',
                contextWindow: m.context_length || 8192,
                maxOutputTokens: m.max_output_tokens,
                supportsFunctions: m.supports_functions || false,
                supportsVision: m.supports_vision || false
            })).sort((a: LLMModelInfo, b: LLMModelInfo) => a.id.localeCompare(b.id));
        } catch (error) {
            logger.error("Failed to fetch DeepSeek models:", error);

            // Return some default models
            return [
                {
                    id: 'deepseek-chat',
                    name: 'DeepSeek Chat',
                    description: 'DeepSeek Chat model',
                    contextWindow: 8192
                },
                {
                    id: 'deepseek-coder',
                    name: 'DeepSeek Coder',
                    description: 'DeepSeek Coder model optimized for programming tasks',
                    contextWindow: 16384
                }
            ];
        }
    }

    /**
     * Test connection to DeepSeek
     */
    public async testConnection(): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'DeepSeek client not initialized. Please check your API key.'
            };
        }

        try {
            // Try a simple models request
            await this.client.get('/models');

            return {
                success: true,
                message: 'Successfully connected to DeepSeek API.'
            };
        } catch (error) {
            logger.error('DeepSeek connection test failed:', error);
            return {
                success: false,
                message: `Failed to connect to DeepSeek API: ${error instanceof Error ? error.message : 'Unknown error'}`
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
                description: 'Your DeepSeek API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., deepseek-chat, deepseek-coder)',
                required: false,
                type: 'string'
            }
        ];
    }
}
