"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerplexityAIProvider = void 0;
const vscode = __importStar(require("vscode"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for Perplexity AI models
 */
class PerplexityAIProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'perplexity';
        this.displayName = 'Perplexity AI';
        this.description = 'Online models with strong search and reasoning capabilities';
        this.website = 'https://www.perplexity.ai/';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api.perplexity.ai';
        this.defaultModel = 'sonar-medium-online';
        this.client = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("Perplexity configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }
    initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        if (!apiKey) {
            logger_1.logger.warn('API key not set for Perplexity provider.');
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
            logger_1.logger.info('Perplexity client initialized successfully.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Perplexity client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        return !!this.client;
    }
    /**
     * Generate text using Perplexity models
     */
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'Perplexity provider not configured (API key missing?)' };
        }
        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            // Prepare messages for chat completion
            const messages = [];
            // Add system message if provided
            if (params.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: params.systemPrompt
                });
            }
            // Add history if provided
            if (params.history && params.history.length > 0) {
                messages.push(...params.history);
            }
            else {
                // Just add the user prompt
                messages.push({
                    role: 'user',
                    content: params.prompt
                });
            }
            // Check for cancellation before making the request
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }
            // Create cancellation token source to abort the request if needed
            let abortController;
            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger_1.logger.info("Perplexity request cancelled by user");
                        abortController?.abort();
                    });
                }
                else {
                    logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
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
        }
        catch (error) {
            logger_1.logger.error('Perplexity generate error:', error);
            let errorMessage = 'Failed to call Perplexity API.';
            if (error.response) {
                errorMessage = `Perplexity API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
            }
            else if (error.name === 'AbortError') {
                errorMessage = 'Request cancelled by user';
            }
            else if (error instanceof Error) {
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
    async listModels() {
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
    async testConnection(modelId) {
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
            }
            else {
                return {
                    success: false,
                    message: `Connected to API but received an unexpected response.`
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Perplexity connection test failed:', error);
            let errorMessage = 'Failed to connect to Perplexity API';
            if (error.response) {
                errorMessage = `API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
            }
            else if (error instanceof Error) {
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
    getConfigurationFields() {
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
exports.PerplexityAIProvider = PerplexityAIProvider;
//# sourceMappingURL=perplexityProvider.js.map