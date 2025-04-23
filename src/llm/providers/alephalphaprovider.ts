import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { logger } from '../../logger';
import { ITool } from '../../tools/tool';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for Aleph Alpha models
 */
export class AlephAlphaProvider extends BaseLLMProvider {
    readonly providerId = 'alephalpha';
    readonly displayName = 'Aleph Alpha';
    readonly description = 'European AI models with multilingual capabilities';
    readonly website = 'https://www.aleph-alpha.com/';
    readonly requiresApiKey = true;
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'https://api.aleph-alpha.com/v1';
    readonly defaultModel = 'luminous-supreme';

    private client: any = null;

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger.info("Aleph Alpha configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }

    private initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;

        if (!apiKey) {
            logger.warn('API key not set for Aleph Alpha provider.');
            this.client = null;
            return;
        }

        try {
            // Initialize axios client with proper configuration
            this.client = axios.create({
                baseURL: baseUrl,
                timeout: 60000, // 60 seconds timeout
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            logger.info('Aleph Alpha client initialized successfully.');
        } catch (error) {
            logger.error('Failed to initialize Aleph Alpha client:', error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    /**
     * Generate text using Aleph Alpha models
     */
    async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'Aleph Alpha provider not configured (API key missing?)' };
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            
            // Prepare the prompt
            let prompt = '';
            
            if (params.systemPrompt) {
                prompt += `${params.systemPrompt}\n\n`;
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `Human: ${message.content}\n\n`;
                    } else if (message.role === 'assistant') {
                        prompt += `AI: ${message.content}\n\n`;
                    } else if (message.role === 'system') {
                        // System messages already added at the beginning
                    }
                }
                
                // Add the final prompt marker
                prompt += 'AI: ';
            } else {
                // Just add the user prompt
                prompt += params.prompt;
            }

            // Check for cancellation before making the request
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }

            // Create cancellation token source to abort the request if needed
            let abortController: AbortController | undefined;

            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger.info("Aleph Alpha request cancelled by user");
                        abortController?.abort();
                    });
                } else {
                    logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }

            // Make the API request
            const response = await this.client.post('/complete', {
                model: modelId,
                prompt: prompt,
                maximum_tokens: params.maxTokens || 256,
                temperature: params.temperature || 0.7,
                top_p: 0.95,
                stop_sequences: params.stopSequences || []
            }, {
                signal: abortController?.signal
            });

            // Parse the response
            const result = response.data;
            
            return {
                content: result.completions[0].completion || '',
                finishReason: 'stop',
                usage: {
                    promptTokens: result.prompt_tokens || prompt.length / 4, // Rough estimate
                    completionTokens: result.completion_tokens || result.completions[0].completion.length / 4, // Rough estimate
                }
            };
        } catch (error: any) {
            logger.error('Aleph Alpha generate error:', error);
            let errorMessage = 'Failed to call Aleph Alpha API.';

            if (error.response) {
                errorMessage = `Aleph Alpha API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available Aleph Alpha models
     */
    async listModels(): Promise<LLMModelInfo[]> {
        // Aleph Alpha doesn't have a models endpoint, so we return a predefined list
        return [
            {
                id: 'luminous-supreme',
                name: 'Luminous Supreme',
                description: 'Most capable model for complex tasks',
                contextWindow: 2048,
                pricingInfo: 'Paid'
            },
            {
                id: 'luminous-extended',
                name: 'Luminous Extended',
                description: 'Balanced model with larger context window',
                contextWindow: 4096,
                pricingInfo: 'Paid'
            },
            {
                id: 'luminous-base',
                name: 'Luminous Base',
                description: 'Balanced model for most use cases',
                contextWindow: 2048,
                pricingInfo: 'Paid'
            },
            {
                id: 'luminous-small',
                name: 'Luminous Small',
                description: 'Fastest and most cost-effective model',
                contextWindow: 2048,
                pricingInfo: 'Paid'
            }
        ];
    }

    /**
     * Test connection to Aleph Alpha
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'Aleph Alpha client not initialized. Please check your API key.'
            };
        }

        try {
            // Simple test request to check if the API is working
            const response = await this.client.post('/complete', {
                model: modelId,
                prompt: "Hello, world!",
                maximum_tokens: 5,
                temperature: 0.7
            });

            if (response.data && response.data.completions) {
                return {
                    success: true,
                    message: `Successfully connected to Aleph Alpha API and tested model '${modelId}'.`
                };
            } else {
                return {
                    success: false,
                    message: `Connected to API but received an unexpected response.`
                };
            }
        } catch (error: any) {
            logger.error('Aleph Alpha connection test failed:', error);
            let errorMessage = 'Failed to connect to Aleph Alpha API';

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
                name: 'API Key',
                description: 'Your Aleph Alpha API key (from https://app.aleph-alpha.com/profile)',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The Aleph Alpha API endpoint (default: https://api.aleph-alpha.com/v1)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default Aleph Alpha model to use',
                required: false,
                type: 'select',
                options: [
                    'luminous-supreme',
                    'luminous-extended',
                    'luminous-base',
                    'luminous-small'
                ]
            }
        ];
    }
}
