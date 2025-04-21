"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuggingFaceProvider = void 0;
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for HuggingFace Inference API
 */
class HuggingFaceProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'huggingface';
        this.displayName = 'HuggingFace';
        this.description = 'Access HuggingFace models through the Inference API';
        this.website = 'https://huggingface.co/inference-api';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = false;
        this.defaultEndpoint = 'https://api-inference.huggingface.co/models';
        this.defaultModel = 'mistralai/Mistral-7B-Instruct-v0.2';
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
                logger_1.logger.warn('HuggingFace API key not configured');
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
            logger_1.logger.info('HuggingFace client initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize HuggingFace client:', error);
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
     * Generate text using HuggingFace
     */
    async generate(params, 
    // @ts-ignore - Parameter required by interface but not used in this implementation
    cancellationToken, 
    // @ts-ignore - Parameter required by interface but not used in this implementation
    tools) {
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
                    }
                    else if (message.role === 'assistant') {
                        fullPrompt += `<|assistant|>\n${message.content}\n`;
                    }
                    else if (message.role === 'system') {
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
        }
        catch (error) {
            logger_1.logger.error('Error generating text with HuggingFace:', error);
            return {
                content: '',
                error: `HuggingFace generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * List available models from HuggingFace
     */
    async listModels() {
        if (!this.client) {
            logger_1.logger.warn("Cannot fetch HuggingFace models, client not configured.");
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
        logger_1.logger.info(`Provider huggingface has ${popularModels.length} models available`);
        return popularModels;
    }
    /**
     * Test connection to HuggingFace
     */
    async testConnection(modelId) {
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
        }
        catch (error) {
            logger_1.logger.error('HuggingFace connection test failed:', error);
            return {
                success: false,
                message: `Failed to connect to HuggingFace API: ${error instanceof Error ? error.message : 'Unknown error'}`
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
exports.HuggingFaceProvider = HuggingFaceProvider;
//# sourceMappingURL=huggingfaceProvider.js.map