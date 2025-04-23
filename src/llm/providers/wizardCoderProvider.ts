import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { logger } from '../../logger';
import { ITool } from '../../tools/tool';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for WizardCoder models
 * 
 * WizardCoder is a family of code-specialized LLMs fine-tuned from Code Llama
 * This provider supports using WizardCoder via:
 * 1. Hugging Face Inference API
 * 2. Custom API endpoints (self-hosted)
 */
export class WizardCoderProvider extends BaseLLMProvider {
    readonly providerId = 'wizardcoder';
    readonly displayName = 'WizardCoder';
    readonly description = 'Code-specialized LLMs fine-tuned from Code Llama';
    readonly website = 'https://huggingface.co/WizardLM';
    readonly requiresApiKey = true; // Required for Hugging Face API
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'https://api-inference.huggingface.co/models';
    readonly defaultModel = 'WizardLM/WizardCoder-Python-34B-V1.0';

    private client: any = null;

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger.info("WizardCoder configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }

    private initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;

        if (!apiKey) {
            logger.warn('API key not set for WizardCoder provider.');
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
            logger.info('WizardCoder client initialized successfully.');
        } catch (error) {
            logger.error('Failed to initialize WizardCoder client:', error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    /**
     * Generate text using WizardCoder models
     */
    async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'WizardCoder provider not configured (API key missing?)' };
        }

        try {
            // Prepare the model endpoint - for Hugging Face we need to specify the model in the URL
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            const endpoint = `${modelId}`;

            // Prepare the prompt
            let prompt = '';
            
            // WizardCoder uses a specific format for prompts
            if (params.systemPrompt) {
                prompt += `${params.systemPrompt}\n\n`;
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `USER: ${message.content}\n\n`;
                    } else if (message.role === 'assistant') {
                        prompt += `ASSISTANT: ${message.content}\n\n`;
                    } else if (message.role === 'system') {
                        prompt += `${message.content}\n\n`;
                    }
                }
            } else {
                // Just add the user prompt
                prompt += `USER: ${params.prompt}\n\n`;
            }
            
            // Add the assistant prefix to indicate we want the model to generate a response
            prompt += `ASSISTANT: `;

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
                    stop: params.stopSequences || ["USER:"]
                }
            };

            logger.debug(`Sending request to WizardCoder model ${modelId}`);

            // Create cancellation token source to abort the request if needed
            let abortController: AbortController | undefined;

            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger.info("WizardCoder request cancelled by user");
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
            logger.error('WizardCoder generate error:', error);
            let errorMessage = 'Failed to call WizardCoder API.';

            if (error.response) {
                errorMessage = `WizardCoder API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available WizardCoder models
     */
    async listModels(): Promise<LLMModelInfo[]> {
        // WizardCoder models are fixed, so we return a predefined list
        return [
            {
                id: 'WizardLM/WizardCoder-Python-34B-V1.0',
                name: 'WizardCoder Python 34B',
                description: 'Large WizardCoder model optimized for Python (34B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'WizardLM/WizardCoder-15B-V1.0',
                name: 'WizardCoder 15B',
                description: 'Medium WizardCoder model (15B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'WizardLM/WizardCoder-Python-13B-V1.0',
                name: 'WizardCoder Python 13B',
                description: 'Medium WizardCoder model optimized for Python (13B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'WizardLM/WizardCoder-Python-7B-V1.0',
                name: 'WizardCoder Python 7B',
                description: 'Small WizardCoder model optimized for Python (7B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free with Hugging Face API'
            }
        ];
    }

    /**
     * Test connection to WizardCoder
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'WizardCoder client not initialized. Please check your API key.'
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
            logger.error('WizardCoder connection test failed:', error);
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
                description: 'The default WizardCoder model to use',
                required: false,
                type: 'select',
                options: [
                    'WizardLM/WizardCoder-Python-34B-V1.0',
                    'WizardLM/WizardCoder-15B-V1.0',
                    'WizardLM/WizardCoder-Python-13B-V1.0',
                    'WizardLM/WizardCoder-Python-7B-V1.0'
                ]
            }
        ];
    }
}
