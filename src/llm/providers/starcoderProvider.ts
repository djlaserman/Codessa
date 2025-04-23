import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { logger } from '../../logger';
import { ITool } from '../../tools/tool';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for StarCoder and StarCoder2 models via Hugging Face
 * 
 * StarCoder and StarCoder2 are open-source code models developed by the BigCode project
 * They are MIT licensed and available on Hugging Face
 */
export class StarCoderProvider extends BaseLLMProvider {
    readonly providerId = 'starcoder';
    readonly displayName = 'StarCoder';
    readonly description = 'Open-source code models by BigCode (MIT licensed)';
    readonly website = 'https://huggingface.co/bigcode';
    readonly requiresApiKey = true;
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'https://api-inference.huggingface.co/models';
    readonly defaultModel = 'bigcode/starcoder2-15b';

    private client: any = null;

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger.info("StarCoder configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }

    private initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;

        if (!apiKey) {
            logger.warn('Hugging Face API key not set for StarCoder provider.');
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
            logger.info('StarCoder client initialized successfully.');
        } catch (error) {
            logger.error('Failed to initialize StarCoder client:', error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    /**
     * Generate text using StarCoder models
     */
    async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'StarCoder provider not configured (API key missing?)' };
        }

        try {
            // Prepare the model endpoint - for StarCoder we need to specify the model in the URL
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            const endpoint = `${modelId}`;

            // Prepare the prompt
            let prompt = '';
            
            // Add system prompt if provided
            if (params.systemPrompt) {
                prompt += `<|system|>\n${params.systemPrompt}\n\n`;
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `<|user|>\n${message.content}\n\n`;
                    } else if (message.role === 'assistant') {
                        prompt += `<|assistant|>\n${message.content}\n\n`;
                    } else if (message.role === 'system') {
                        prompt += `<|system|>\n${message.content}\n\n`;
                    }
                }
            } else {
                // Just add the user prompt
                prompt += `<|user|>\n${params.prompt}\n\n`;
            }
            
            // Add the assistant prefix to indicate we want the model to generate a response
            prompt += `<|assistant|>\n`;

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
                    stop: params.stopSequences || ["<|user|>", "<|system|>", "<|end|>"]
                }
            };

            logger.debug(`Sending request to StarCoder model ${modelId}`);

            // Create cancellation token source to abort the request if needed
            let abortController: AbortController | undefined;

            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger.info("StarCoder request cancelled by user");
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
            logger.error('StarCoder generate error:', error);
            let errorMessage = 'Failed to call StarCoder API.';

            if (error.response) {
                errorMessage = `StarCoder API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available StarCoder models
     */
    async listModels(): Promise<LLMModelInfo[]> {
        // StarCoder models are fixed, so we return a predefined list
        return [
            {
                id: 'bigcode/starcoder2-15b',
                name: 'StarCoder2 15B',
                description: 'Latest StarCoder2 model (15B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'bigcode/starcoder2-7b',
                name: 'StarCoder2 7B',
                description: 'Smaller StarCoder2 model (7B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'bigcode/starcoder2-3b',
                name: 'StarCoder2 3B',
                description: 'Smallest StarCoder2 model (3B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'bigcode/starcoder',
                name: 'StarCoder',
                description: 'Original StarCoder model (15B parameters)',
                contextWindow: 8192,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'bigcode/starcoderbase',
                name: 'StarCoderBase',
                description: 'Base model without instruction tuning',
                contextWindow: 8192,
                pricingInfo: 'Free with Hugging Face API'
            }
        ];
    }

    /**
     * Test connection to StarCoder
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'StarCoder client not initialized. Please check your API key.'
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
                    message: `Successfully connected to StarCoder API and tested model '${modelId}'.`
                };
            } else {
                return {
                    success: false,
                    message: `Connected to API but received an unexpected response.`
                };
            }
        } catch (error: any) {
            logger.error('StarCoder connection test failed:', error);
            let errorMessage = 'Failed to connect to StarCoder API';

            if (error.response) {
                errorMessage = `StarCoder API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
                description: 'The default StarCoder model to use',
                required: false,
                type: 'select',
                options: [
                    'bigcode/starcoder2-15b',
                    'bigcode/starcoder2-7b',
                    'bigcode/starcoder2-3b',
                    'bigcode/starcoder',
                    'bigcode/starcoderbase'
                ]
            }
        ];
    }
}
