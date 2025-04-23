import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { logger } from '../../logger';
import { ITool } from '../../tools/tool';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for Yi-Code models from 01.ai
 * 
 * Yi-Code is a powerful code model from 01.ai
 * It can be used via Hugging Face or self-hosted
 */
export class YiCodeProvider extends BaseLLMProvider {
    readonly providerId = 'yicode';
    readonly displayName = 'Yi-Code';
    readonly description = 'Powerful code model from 01.ai';
    readonly website = 'https://01.ai/';
    readonly requiresApiKey = true; // Required for Hugging Face API
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'https://api-inference.huggingface.co/models';
    readonly defaultModel = '01-ai/Yi-34B-Code';

    private client: any = null;

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger.info("Yi-Code configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }

    private initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;

        if (!apiKey) {
            logger.warn('API key not set for Yi-Code provider.');
            this.client = null;
            return;
        }

        try {
            // Initialize axios client with proper configuration
            this.client = axios.create({
                baseURL: baseUrl,
                timeout: 120000, // 2 minutes timeout for model loading
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            logger.info('Yi-Code client initialized successfully.');
        } catch (error) {
            logger.error('Failed to initialize Yi-Code client:', error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    /**
     * Generate text using Yi-Code models
     */
    async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'Yi-Code provider not configured (API key missing?)' };
        }

        try {
            // Prepare the model endpoint - for Hugging Face we need to specify the model in the URL
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            const endpoint = `${modelId}`;

            // Prepare the prompt
            let prompt = '';
            
            // Yi-Code uses a specific format for chat
            if (params.systemPrompt) {
                prompt += `<|im_start|>system\n${params.systemPrompt}<|im_end|>\n\n`;
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `<|im_start|>user\n${message.content}<|im_end|>\n\n`;
                    } else if (message.role === 'assistant') {
                        prompt += `<|im_start|>assistant\n${message.content}<|im_end|>\n\n`;
                    } else if (message.role === 'system') {
                        prompt += `<|im_start|>system\n${message.content}<|im_end|>\n\n`;
                    }
                }
            } else {
                // Just add the user prompt
                prompt += `<|im_start|>user\n${params.prompt}<|im_end|>\n\n`;
            }
            
            // Add the assistant prefix to indicate we want the model to generate a response
            prompt += `<|im_start|>assistant\n`;

            // Check for cancellation before making the request
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }

            // Prepare request data
            const requestData = {
                inputs: prompt,
                parameters: {
                    max_new_tokens: params.maxTokens || 1024,
                    temperature: params.temperature || 0.7,
                    top_p: 0.95,
                    do_sample: true,
                    return_full_text: false,
                    stop: params.stopSequences || ["<|im_start|>", "<|im_end|>"]
                }
            };

            logger.debug(`Sending request to Yi-Code model ${modelId}`);

            // Create cancellation token source to abort the request if needed
            let abortController: AbortController | undefined;

            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger.info("Yi-Code request cancelled by user");
                        abortController?.abort();
                    });
                } else {
                    logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }

            // Make the API request
            const response = await this.client.post(endpoint, requestData, {
                signal: abortController?.signal
            });

            // Check for cancellation again after API call
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled during processing' };
            }

            // Parse the response
            const result = response.data;
            
            // Hugging Face Inference API returns an array of generated texts
            let content = '';
            if (Array.isArray(result) && result.length > 0) {
                if (result[0].generated_text) {
                    content = result[0].generated_text;
                }
            }

            return {
                content,
                finishReason: 'stop',
                usage: {
                    promptTokens: prompt.length / 4, // Rough estimate
                    completionTokens: content.length / 4, // Rough estimate
                }
            };
        } catch (error: any) {
            logger.error('Yi-Code generate error:', error);
            let errorMessage = 'Failed to call Yi-Code API.';

            if (error.response) {
                errorMessage = `Yi-Code API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
            } else if (error.name === 'AbortError') {
                errorMessage = 'Request cancelled by user';
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            return {
                content: '',
                error: errorMessage,
                finishReason: 'error'
            };
        }
    }

    /**
     * List available Yi-Code models
     */
    async listModels(): Promise<LLMModelInfo[]> {
        // Yi-Code models are fixed, so we return a predefined list
        return [
            {
                id: '01-ai/Yi-34B-Code',
                name: 'Yi-34B-Code',
                description: 'Large Yi-Code model (34B parameters)',
                contextWindow: 32768,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: '01-ai/Yi-34B-Chat',
                name: 'Yi-34B-Chat',
                description: 'General-purpose Yi chat model (34B parameters)',
                contextWindow: 32768,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: '01-ai/Yi-6B-Chat',
                name: 'Yi-6B-Chat',
                description: 'Smaller Yi chat model (6B parameters)',
                contextWindow: 4096,
                pricingInfo: 'Free with Hugging Face API'
            }
        ];
    }

    /**
     * Test connection to Yi-Code
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'Yi-Code client not initialized. Please check your API key.'
            };
        }

        try {
            // Simple test request to check if the API is working
            const endpoint = modelId;
            const response = await this.client.post(endpoint, {
                inputs: "def hello_world():",
                parameters: {
                    max_new_tokens: 10,
                    return_full_text: false
                }
            });

            if (response.data) {
                return {
                    success: true,
                    message: `Successfully connected to Hugging Face API and tested model '${modelId}'.`
                };
            } else {
                return {
                    success: false,
                    message: `Connected to API but received an unexpected response.`
                };
            }
        } catch (error: any) {
            logger.error('Yi-Code connection test failed:', error);
            let errorMessage = 'Failed to connect to Hugging Face API';

            if (error.response) {
                errorMessage = `API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Get the configuration fields for this provider
     */
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> {
        return [
            {
                id: 'apiKey',
                name: 'Hugging Face API Key',
                description: 'Your Hugging Face API key (from https://huggingface.co/settings/tokens)',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The Hugging Face Inference API endpoint (default: https://api-inference.huggingface.co/models)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default Yi-Code model to use',
                required: false,
                type: 'select',
                options: [
                    '01-ai/Yi-34B-Code',
                    '01-ai/Yi-34B-Chat',
                    '01-ai/Yi-6B-Chat'
                ]
            }
        ];
    }
}
