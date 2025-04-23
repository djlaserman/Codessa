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
exports.TogetherAIProvider = void 0;
const vscode = __importStar(require("vscode"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for Together AI models
 */
class TogetherAIProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'togetherai';
        this.displayName = 'Together AI';
        this.description = 'Access to a wide range of open and closed source models';
        this.website = 'https://www.together.ai/';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api.together.xyz/v1';
        this.defaultModel = 'mistralai/Mixtral-8x7B-Instruct-v0.1';
        this.client = null;
        this.availableModels = [];
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("Together AI configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }
    initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        if (!apiKey) {
            logger_1.logger.warn('API key not set for Together AI provider.');
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
            logger_1.logger.info('Together AI client initialized successfully.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Together AI client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        return !!this.client;
    }
    /**
     * Generate text using Together AI models
     */
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'Together AI provider not configured (API key missing?)' };
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
                        logger_1.logger.info("Together AI request cancelled by user");
                        abortController?.abort();
                    });
                }
                else {
                    logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }
            // Make the API request
            const response = await this.client.post('/chat/completions', {
                model: modelId,
                messages: messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens ?? 1024,
                stop: params.stopSequences
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
            logger_1.logger.error('Together AI generate error:', error);
            let errorMessage = 'Failed to call Together AI API.';
            if (error.response) {
                errorMessage = `Together AI API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available Together AI models
     */
    async listModels() {
        if (!this.client) {
            return [];
        }
        try {
            // If we already have models cached, return them
            if (this.availableModels.length > 0) {
                return this.availableModels;
            }
            // Fetch models from the API
            const response = await this.client.get('/models');
            if (!response.data || !response.data.data) {
                throw new Error('Invalid response from Together AI API');
            }
            // Filter for models that support chat completions
            const models = response.data.data
                .filter((model) => model.capabilities.includes('chat'))
                .map((model) => ({
                id: model.id,
                name: model.display_name || model.id,
                description: model.description || '',
                contextWindow: model.context_length || 4096,
                pricingInfo: model.pricing ? `Input: $${model.pricing.input}/1M tokens, Output: $${model.pricing.output}/1M tokens` : 'Paid'
            }));
            // Cache the models
            this.availableModels = models;
            return models;
        }
        catch (error) {
            logger_1.logger.error('Failed to list Together AI models:', error);
            // Return a default list of popular models
            return [
                {
                    id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
                    name: 'Mixtral 8x7B Instruct',
                    description: 'Mixtral MoE model with strong performance',
                    contextWindow: 32768,
                    pricingInfo: 'Paid'
                },
                {
                    id: 'meta-llama/Llama-3-70b-chat',
                    name: 'Llama 3 70B Chat',
                    description: 'Meta\'s latest large language model',
                    contextWindow: 8192,
                    pricingInfo: 'Paid'
                },
                {
                    id: 'meta-llama/Llama-3-8b-chat',
                    name: 'Llama 3 8B Chat',
                    description: 'Smaller, faster Llama 3 model',
                    contextWindow: 8192,
                    pricingInfo: 'Paid'
                },
                {
                    id: 'mistralai/Mistral-7B-Instruct-v0.2',
                    name: 'Mistral 7B Instruct',
                    description: 'Efficient instruction-tuned model',
                    contextWindow: 8192,
                    pricingInfo: 'Paid'
                },
                {
                    id: 'codellama/CodeLlama-34b-Instruct',
                    name: 'CodeLlama 34B Instruct',
                    description: 'Specialized for code generation',
                    contextWindow: 16384,
                    pricingInfo: 'Paid'
                }
            ];
        }
    }
    /**
     * Test connection to Together AI
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'Together AI client not initialized. Please check your API key.'
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
                    message: `Successfully connected to Together AI API and tested model '${modelId}'.`
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
            logger_1.logger.error('Together AI connection test failed:', error);
            let errorMessage = 'Failed to connect to Together AI API';
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
                description: 'Your Together AI API key (from https://api.together.xyz/settings/api-keys)',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The Together AI API endpoint (default: https://api.together.xyz/v1)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default Together AI model to use',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.TogetherAIProvider = TogetherAIProvider;
//# sourceMappingURL=togetheraiProvider.js.map