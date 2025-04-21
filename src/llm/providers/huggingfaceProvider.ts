import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { ITool } from '../../tools/tool';
import { logger } from '../../logger';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for HuggingFace Inference API
 */
export class HuggingFaceProvider extends BaseLLMProvider {
    readonly providerId = 'huggingface';
    readonly displayName = 'HuggingFace';
    readonly description = 'Access HuggingFace models through the Inference API';
    readonly website = 'https://huggingface.co/inference-api';
    readonly requiresApiKey = true;
    readonly supportsEndpointConfiguration = false;
    readonly defaultEndpoint = 'https://api-inference.huggingface.co/models';
    readonly defaultModel = 'mistralai/Mistral-7B-Instruct-v0.2';

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
                logger.warn('HuggingFace API key not configured');
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

            logger.info('HuggingFace client initialized');
        } catch (error) {
            logger.error('Failed to initialize HuggingFace client:', error);
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
     * Generate text using HuggingFace
     */
    public async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'HuggingFace client not initialized' };
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;

            // Prepare the prompt
            let fullPrompt = '';

            // Add system prompt if provided
            if (params.systemPrompt) {
                fullPrompt += `<|system|>\n${params.systemPrompt}\n`;
            }

            // Add history messages if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        fullPrompt += `<|user|>\n${message.content}\n`;
                    } else if (message.role === 'assistant') {
                        fullPrompt += `<|assistant|>\n${message.content}\n`;
                    } else if (message.role === 'system') {
                        fullPrompt += `<|system|>\n${message.content}\n`;
                    }
                }
            }

            // Add the current prompt
            fullPrompt += `<|user|>\n${params.prompt}\n<|assistant|>\n`;

            // Make the API request
            const response = await this.client.post(`/${modelId}`, {
                inputs: fullPrompt,
                parameters: {
                    temperature: params.temperature || 0.7,
                    max_new_tokens: params.maxTokens || 1024,
                    return_full_text: false
                }
            });

            // Extract the response content
            const content = response.data[0]?.generated_text || '';

            return {
                content,
                finishReason: 'stop',
                usage: {
                    promptTokens: 0, // HuggingFace doesn't provide token usage
                    completionTokens: 0,
                    totalTokens: 0
                }
            };
        } catch (error) {
            logger.error('Error generating text with HuggingFace:', error);
            return {
                content: '',
                error: `HuggingFace generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * List available models from HuggingFace
     */
    public async listModels(): Promise<LLMModelInfo[]> {
        if (!this.client) {
            logger.warn("Cannot fetch HuggingFace models, client not configured.");
            return [];
        }

        // HuggingFace doesn't have a simple API to list all available models for inference
        // So we'll return a curated list of popular models
        const popularModels = [
            {
                id: 'mistralai/Mistral-7B-Instruct-v0.2',
                name: 'Mistral 7B Instruct',
                description: 'Mistral 7B Instruct model',
                contextWindow: 8192
            },
            {
                id: 'meta-llama/Llama-2-7b-chat-hf',
                name: 'Llama 2 7B Chat',
                description: 'Meta Llama 2 7B Chat model',
                contextWindow: 4096
            },
            {
                id: 'meta-llama/Llama-2-13b-chat-hf',
                name: 'Llama 2 13B Chat',
                description: 'Meta Llama 2 13B Chat model',
                contextWindow: 4096
            },
            {
                id: 'tiiuae/falcon-7b-instruct',
                name: 'Falcon 7B Instruct',
                description: 'Falcon 7B Instruct model',
                contextWindow: 2048
            },
            {
                id: 'microsoft/phi-2',
                name: 'Phi-2',
                description: 'Microsoft Phi-2 model',
                contextWindow: 2048
            },
            {
                id: 'google/gemma-7b-it',
                name: 'Gemma 7B Instruct',
                description: 'Google Gemma 7B Instruct model',
                contextWindow: 8192
            }
        ];

        logger.info(`Provider huggingface has ${popularModels.length} models available`);
        return popularModels;
    }

    /**
     * Test connection to HuggingFace
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'HuggingFace client not initialized. Please check your API key.'
            };
        }

        try {
            // Try a simple model info request
            const model = modelId || this.config.defaultModel || this.defaultModel;
            await this.client.post(`/${model}`, {
                inputs: 'Hello',
                parameters: {
                    max_new_tokens: 5,
                    return_full_text: false
                }
            });

            return {
                success: true,
                message: `Successfully connected to HuggingFace API and tested model ${model}.`
            };
        } catch (error) {
            logger.error('HuggingFace connection test failed:', error);
            return {
                success: false,
                message: `Failed to connect to HuggingFace API: ${error instanceof Error ? error.message : 'Unknown error'}`
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
                description: 'Your HuggingFace API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., mistralai/Mistral-7B-Instruct-v0.2)',
                required: false,
                type: 'string'
            }
        ];
    }
}
