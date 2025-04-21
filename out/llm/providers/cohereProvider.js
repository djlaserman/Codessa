"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CohereProvider = void 0;
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for Cohere API
 */
class CohereProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'cohere';
        this.displayName = 'Cohere';
        this.description = 'Access Cohere AI models';
        this.website = 'https://cohere.ai';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = false;
        this.defaultEndpoint = 'https://api.cohere.ai/v1';
        this.defaultModel = 'command';
        this.client = null;
        this.baseUrl = this.defaultEndpoint;
        this.initializeClient();
    }
    /**
     * Initialize the Axios client for API requests
     */
    initializeClient() {
        try {
            if (!this.config.apiKey) {
                logger_1.logger.warn('Cohere API key not configured');
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
            logger_1.logger.info('Cohere client initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Cohere client:', error);
            this.client = null;
        }
    }
    /**
     * Check if the provider is configured
     */
    isConfigured() {
        return !!this.client && !!this.config.apiKey;
    }
    /**
     * Generate text using Cohere
     */
    async generate(params) {
        if (!this.client) {
            return { content: '', error: 'Cohere client not initialized' };
        }
        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            // Prepare the chat history
            const messages = [];
            // Add history messages if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        messages.push({
                            role: 'USER',
                            message: message.content
                        });
                    }
                    else if (message.role === 'assistant') {
                        messages.push({
                            role: 'CHATBOT',
                            message: message.content
                        });
                    }
                }
            }
            // Make the API request
            const response = await this.client.post('/chat', {
                model: modelId,
                message: params.prompt,
                chat_history: messages,
                temperature: params.temperature || 0.7,
                max_tokens: params.maxTokens || 1024,
                preamble: params.systemPrompt || undefined
            });
            // Extract the response content
            const content = response.data.text || '';
            return {
                content,
                finishReason: response.data.finish_reason || 'stop',
                usage: {
                    promptTokens: response.data.meta?.prompt_tokens || 0,
                    completionTokens: response.data.meta?.response_tokens || 0,
                    totalTokens: (response.data.meta?.prompt_tokens || 0) + (response.data.meta?.response_tokens || 0)
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating text with Cohere:', error);
            return {
                content: '',
                error: `Cohere generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * List available models from Cohere
     */
    async listModels() {
        if (!this.client) {
            logger_1.logger.warn("Cannot fetch Cohere models, client not configured.");
            return [];
        }
        // Cohere doesn't have a public API to list models, so we'll return a static list
        const models = [
            {
                id: 'command',
                name: 'Command',
                description: 'Cohere Command model - general purpose',
                contextWindow: 4096
            },
            {
                id: 'command-light',
                name: 'Command Light',
                description: 'Cohere Command Light model - faster, more efficient',
                contextWindow: 4096
            },
            {
                id: 'command-r',
                name: 'Command-R',
                description: 'Cohere Command-R model - latest generation',
                contextWindow: 128000
            },
            {
                id: 'command-r-plus',
                name: 'Command-R Plus',
                description: 'Cohere Command-R Plus model - enhanced capabilities',
                contextWindow: 128000
            }
        ];
        logger_1.logger.info(`Provider cohere has ${models.length} models available`);
        return models;
    }
    /**
     * Test connection to Cohere
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'Cohere client not initialized. Please check your API key.'
            };
        }
        try {
            // Try a simple chat request
            const model = modelId || this.config.defaultModel || this.defaultModel;
            await this.client.post('/chat', {
                model: model,
                message: 'Hello',
                max_tokens: 5
            });
            return {
                success: true,
                message: `Successfully connected to Cohere API and tested model ${model}.`
            };
        }
        catch (error) {
            logger_1.logger.error('Cohere connection test failed:', error);
            return {
                success: false,
                message: `Failed to connect to Cohere API: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Update the provider configuration
     */
    async updateConfig(config) {
        await super.updateConfig(config);
        this.initializeClient();
    }
    /**
     * Get the configuration fields for this provider
     */
    getConfigurationFields() {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Cohere API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., command, command-r)',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.CohereProvider = CohereProvider;
//# sourceMappingURL=cohereProvider.js.map