"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LMStudioProvider = void 0;
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
/**
 * Provider for LM Studio local LLM server
 */
class LMStudioProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'lmstudio';
        this.displayName = 'LM Studio';
        this.description = 'Run large language models locally with LM Studio';
        this.website = 'https://lmstudio.ai';
        this.requiresApiKey = false;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'http://localhost:1234/v1';
        this.defaultModel = 'local-model';
        this.client = null;
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        this.initializeClient();
    }
    /**
     * Initialize the Axios client for API requests
     */
    initializeClient() {
        try {
            this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
            // Just store the base URL and use it directly in API calls
            this.client = {}; // Dummy instance, we'll use axios directly
            logger_1.logger.info(`LM Studio client initialized for base URL: ${this.baseUrl}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize LM Studio client:', error);
            this.client = null;
        }
    }
    /**
     * Check if the provider is configured
     */
    isConfigured() {
        return !!this.baseUrl;
    }
    /**
     * Generate text using LM Studio
     */
    async generate(params, _cancellationToken, _tools) {
        if (!this.baseUrl) {
            return { content: '', error: 'LM Studio client not initialized' };
        }
        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            // Prepare messages
            const messages = [];
            if (params.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: params.systemPrompt
                });
            }
            // Add history messages if provided
            if (params.history && params.history.length > 0) {
                messages.push(...params.history);
            }
            else {
                messages.push({
                    role: 'user',
                    content: params.prompt
                });
            }
            // Make the API request
            const response = await axios.post(`${this.baseUrl}/chat/completions`, {
                model: modelId,
                messages: messages,
                temperature: params.temperature || 0.7,
                max_tokens: params.maxTokens || 1024,
                stop: params.stopSequences || []
            });
            // Extract the response content
            const content = response.data.choices[0]?.message?.content || '';
            return {
                content,
                finishReason: response.data.choices[0]?.finish_reason || 'stop',
                usage: response.data.usage || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating text with LM Studio:', error);
            return {
                content: '',
                error: `LM Studio generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Stream generate text using LM Studio
     */
    async *streamGenerate(params, cancellationToken) {
        if (!this.baseUrl) {
            throw new Error('LM Studio client not initialized');
        }
        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            // Prepare messages for LM Studio
            const messages = [];
            // Add system message if provided
            if (params.systemPrompt) {
                messages.push({
                    role: 'system',
                    content: params.systemPrompt
                });
            }
            // Add history messages if provided
            if (params.history && params.history.length > 0) {
                messages.push(...params.history);
            }
            // Add the current prompt
            messages.push({
                role: 'user',
                content: params.prompt
            });
            // Make the streaming API request
            const response = await axios.post(`${this.baseUrl}/chat/completions`, {
                model: modelId,
                messages: messages,
                temperature: params.temperature || 0.7,
                max_tokens: params.maxTokens || 1024,
                stop: params.stopSequences || [],
                stream: true
            }, {
                responseType: 'stream'
            });
            // Process the streaming response
            const stream = response.data;
            for await (const chunk of stream) {
                if (cancellationToken?.isCancellationRequested) {
                    break;
                }
                try {
                    const lines = chunk.toString().split('\n').filter(Boolean);
                    for (const line of lines) {
                        // Skip "data: [DONE]" messages
                        if (line === 'data: [DONE]') {
                            continue;
                        }
                        // Parse the JSON data
                        const jsonData = line.replace(/^data: /, '');
                        const data = JSON.parse(jsonData);
                        if (data.choices && data.choices[0]?.delta?.content) {
                            yield data.choices[0].delta.content;
                        }
                    }
                }
                catch (error) {
                    logger_1.logger.error('Error parsing LM Studio stream chunk:', error);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error streaming text with LM Studio:', error);
            throw new Error(`LM Studio streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * List available models from LM Studio
     */
    async listModels() {
        if (!this.baseUrl) {
            logger_1.logger.warn("Cannot fetch LM Studio models, client not configured.");
            return [];
        }
        try {
            logger_1.logger.debug(`Fetching LM Studio models list from ${this.baseUrl}/models`);
            const response = await axios.get(`${this.baseUrl}/models`);
            // LM Studio response format follows OpenAI's format
            const models = response.data?.data || [];
            logger_1.logger.info(`Provider lmstudio has ${models.length} models available`);
            return models.map((m) => ({
                id: m.id,
                name: m.id,
                description: m.description || 'Local LM Studio model',
                contextWindow: m.context_length || 4096
            })).sort((a, b) => a.id.localeCompare(b.id));
        }
        catch (error) {
            logger_1.logger.error("Failed to fetch LM Studio models:", error);
            // LM Studio might not support the /models endpoint, so return a default model
            return [{
                    id: 'local-model',
                    name: 'Local Model',
                    description: 'The model currently loaded in LM Studio',
                    contextWindow: 4096
                }];
        }
    }
    /**
     * Test connection to LM Studio
     */
    async testConnection(modelId) {
        if (!this.baseUrl) {
            return {
                success: false,
                message: 'LM Studio client not initialized'
            };
        }
        try {
            // Check if we can connect to the LM Studio server
            await axios.get(`${this.baseUrl}/models`);
            return {
                success: true,
                message: `Successfully connected to LM Studio server at ${this.baseUrl}.`
            };
        }
        catch (error) {
            // Try a simple chat completion request as fallback
            try {
                await axios.post(`${this.baseUrl}/chat/completions`, {
                    model: modelId,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 5
                });
                return {
                    success: true,
                    message: `Successfully connected to LM Studio server at ${this.baseUrl}.`
                };
            }
            catch (secondError) {
                logger_1.logger.error('LM Studio connection test failed:', secondError);
                return {
                    success: false,
                    message: `Failed to connect to LM Studio server at ${this.baseUrl}: ${secondError instanceof Error ? secondError.message : 'Unknown error'}`
                };
            }
        }
    }
    /**
     * Update the provider configuration
     */
    async updateConfig(config) {
        await super.updateConfig(config);
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        this.initializeClient();
    }
    /**
     * Get the configuration fields for this provider
     */
    getConfigurationFields() {
        return [
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The URL of your LM Studio server (default: http://localhost:1234/v1)',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (usually "local-model")',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.LMStudioProvider = LMStudioProvider;
//# sourceMappingURL=lmstudioProvider.js.map