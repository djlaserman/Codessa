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
exports.AI21Provider = void 0;
const vscode = __importStar(require("vscode"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for AI21 Studio models
 */
class AI21Provider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'ai21';
        this.displayName = 'AI21 Studio';
        this.description = 'AI21 Studio provides state-of-the-art language models';
        this.website = 'https://www.ai21.com/studio';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api.ai21.com/studio/v1';
        this.defaultModel = 'j2-ultra';
        this.client = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("AI21 configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }
    initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        if (!apiKey) {
            logger_1.logger.warn('API key not set for AI21 provider.');
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
            logger_1.logger.info('AI21 client initialized successfully.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize AI21 client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        return !!this.client;
    }
    /**
     * Generate text using AI21 models
     */
    async generate(params, cancellationToken) {
        if (!this.client) {
            return { content: '', error: 'AI21 provider not configured (API key missing?)' };
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
                        prompt += `User: ${message.content}\n\n`;
                    }
                    else if (message.role === 'assistant') {
                        prompt += `Assistant: ${message.content}\n\n`;
                    }
                    else if (message.role === 'system') {
                        // System messages already added at the beginning
                    }
                }
            }
            else {
                // Just add the user prompt
                prompt += params.prompt;
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
                        logger_1.logger.info("AI21 request cancelled by user");
                        abortController?.abort();
                    });
                }
                else {
                    logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }
            // Make the API request
            const response = await this.client.post(`/${modelId}/complete`, {
                prompt: prompt,
                numResults: 1,
                maxTokens: params.maxTokens || 256,
                temperature: params.temperature || 0.7,
                topP: 0.95,
                stopSequences: params.stopSequences || []
            }, {
                signal: abortController?.signal
            });
            // Parse the response
            const result = response.data;
            if (!result.completions || result.completions.length === 0) {
                throw new Error('No completions returned from AI21 API');
            }
            const content = result.completions[0].data.text;
            return {
                content,
                finishReason: result.completions[0].finishReason || 'stop',
                usage: {
                    promptTokens: result.prompt.tokens || prompt.length / 4, // Rough estimate
                    completionTokens: result.completions[0].data.tokens || content.length / 4, // Rough estimate
                }
            };
        }
        catch (error) {
            logger_1.logger.error('AI21 generate error:', error);
            let errorMessage = 'Failed to call AI21 API.';
            if (error.response) {
                errorMessage = `AI21 API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available AI21 models
     */
    async listModels() {
        // AI21 doesn't have a models endpoint, so we return a predefined list
        return [
            {
                id: 'j2-ultra',
                name: 'Jurassic-2 Ultra',
                description: 'Most capable model for complex tasks',
                contextWindow: 8192,
                pricingInfo: 'Paid'
            },
            {
                id: 'j2-mid',
                name: 'Jurassic-2 Mid',
                description: 'Balanced model for most use cases',
                contextWindow: 8192,
                pricingInfo: 'Paid'
            },
            {
                id: 'j2-light',
                name: 'Jurassic-2 Light',
                description: 'Fastest and most cost-effective model',
                contextWindow: 8192,
                pricingInfo: 'Paid'
            },
            {
                id: 'jamba-instruct',
                name: 'Jamba Instruct',
                description: 'Latest model with improved reasoning',
                contextWindow: 8192,
                pricingInfo: 'Paid'
            }
        ];
    }
    /**
     * Test connection to AI21
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'AI21 client not initialized. Please check your API key.'
            };
        }
        try {
            // Simple test request to check if the API is working
            const response = await this.client.post(`/${modelId}/complete`, {
                prompt: "Hello, world!",
                numResults: 1,
                maxTokens: 5,
                temperature: 0.7
            });
            if (response.data && response.data.completions) {
                return {
                    success: true,
                    message: `Successfully connected to AI21 API and tested model '${modelId}'.`
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
            logger_1.logger.error('AI21 connection test failed:', error);
            let errorMessage = 'Failed to connect to AI21 API';
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
                description: 'Your AI21 API key (from https://studio.ai21.com/account/api-key)',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The AI21 API endpoint (default: https://api.ai21.com/studio/v1)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default AI21 model to use',
                required: false,
                type: 'select',
                options: [
                    'j2-ultra',
                    'j2-mid',
                    'j2-light',
                    'jamba-instruct'
                ]
            }
        ];
    }
}
exports.AI21Provider = AI21Provider;
//# sourceMappingURL=ai21Provider.js.map