import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { logger } from '../../logger';
import { ITool } from '../../tools/tool';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for Perplexity AI models
 */
export class PerplexityAIProvider extends BaseLLMProvider {
    readonly providerId = 'perplexity';
    readonly displayName = 'Perplexity AI';
    readonly description = 'Online models with strong search and reasoning capabilities';
    readonly website = 'https://www.perplexity.ai/';
    readonly requiresApiKey = true;
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'https://api.perplexity.ai';
    readonly defaultModel = 'sonar-medium-online';

    private client: any = null;

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger.info("Perplexity configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }

    private initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;

        if (!apiKey) {
            logger.warn('API key not set for Perplexity provider.');
            this.client = null;
            return;
        }

        try {
            // Initialize axios client with proper configuration
            this.client = axios.create({
                baseURL: baseUrl,
                timeout: 120000, // 2 minutes timeout
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            logger.info('Perplexity client initialized successfully.');
        } catch (error) {
            logger.error('Failed to initialize Perplexity client:', error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    /**
     * Generate text using Perplexity models
     */
    async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'Perplexity provider not configured (API key missing?)' };
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            
            // Prepare messages for chat completion
            const messages: { role: string; content: string; name?: string; tool_call_id?: string }[] = [];
            
            // Add system message if provided
            if (params.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: params.systemPrompt
                } as const);
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                messages.push(...params.history);
            } else {
                // Just add the user prompt
                messages.push({
                    role: 'user',
                    content: params.prompt
                } as const);
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
                        logger.info("Perplexity request cancelled by user");
                        abortController?.abort();
                    });
                } else {
                    logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }

            // Determine if we should use search
            const useSearch = modelId.includes('online');

            // Make the API request
            const response = await this.client.post('/chat/completions', {
                model: modelId,
                messages: messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens ?? 1024,
                stop: params.stopSequences,
                search: useSearch
            }, {
                signal: abortController?.signal
            });

            // Parse the response
            const result = response.data;
            
            return {
                content: result.choices[0].message.content || '',
                finishReason: result.choices[0].finish_reason || 'stop',
                usage: result.usage
            };
        } catch (error: any) {
            logger.error('Perplexity generate error:', error);
            let errorMessage = 'Failed to call Perplexity API.';

            if (error.response) {
                errorMessage = `Perplexity API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available Perplexity models
     */
    async listModels(): Promise<LLMModelInfo[]> {
        // Perplexity doesn't have a models endpoint, so we return a predefined list
        return [
            {
                id: 'sonar-medium-online',
                name: 'Sonar Medium Online',
                description: 'Medium-sized model with online search capabilities',
                contextWindow: 4096,
                pricingInfo: 'Paid'
            },
            {
                id: 'sonar-medium-chat',
                name: 'Sonar Medium Chat',
                description: 'Medium-sized model without search',
                contextWindow: 4096,
                pricingInfo: 'Paid'
            },
            {
                id: 'sonar-small-online',
                name: 'Sonar Small Online',
                description: 'Small model with online search capabilities',
                contextWindow: 4096,
                pricingInfo: 'Paid'
            },
            {
                id: 'sonar-small-chat',
                name: 'Sonar Small Chat',
                description: 'Small model without search',
                contextWindow: 4096,
                pricingInfo: 'Paid'
            },
            {
                id: 'codellama-70b-instruct',
                name: 'CodeLlama 70B Instruct',
                description: 'Large model specialized for code generation',
                contextWindow: 4096,
                pricingInfo: 'Paid'
            },
            {
                id: 'mixtral-8x7b-instruct',
                name: 'Mixtral 8x7B Instruct',
                description: 'Mixtral MoE model with strong performance',
                contextWindow: 4096,
                pricingInfo: 'Paid'
            }
        ];
    }

    /**
     * Test connection to Perplexity
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'Perplexity client not initialized. Please check your API key.'
            };
        }

        try {
            // Simple test request to check if the API is working
            const response = await this.client.post('/chat/completions', {
                model: modelId,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            });

            if (response.data && response.data.choices) {
                return {
                    success: true,
                    message: `Successfully connected to Perplexity API and tested model '${modelId}'.`
                };
            } else {
                return {
                    success: false,
                    message: `Connected to API but received an unexpected response.`
                };
            }
        } catch (error: any) {
            logger.error('Perplexity connection test failed:', error);
            let errorMessage = 'Failed to connect to Perplexity API';

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
                description: 'Your Perplexity API key (from https://www.perplexity.ai/settings/api)',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The Perplexity API endpoint (default: https://api.perplexity.ai)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default Perplexity model to use',
                required: false,
                type: 'select',
                options: [
                    'sonar-medium-online',
                    'sonar-medium-chat',
                    'sonar-small-online',
                    'sonar-small-chat',
                    'codellama-70b-instruct',
                    'mixtral-8x7b-instruct'
                ]
            }
        ];
    }
}
