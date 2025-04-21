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
exports.LMStudioProvider = void 0;
const vscode = __importStar(require("vscode"));
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
const notifications_1 = require("../../ui/notifications");
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
            // Make the API request with retry logic
            const response = await this.withRetry(async () => {
                try {
                    return await axios.post(`${this.baseUrl}/chat/completions`, {
                        model: modelId,
                        messages: messages,
                        temperature: params.temperature || 0.7,
                        max_tokens: params.maxTokens || 1024,
                        stop: params.stopSequences || []
                    }, { timeout: 30000 }); // 30 second timeout for generation
                }
                catch (error) {
                    // Enhance error logging with more details
                    const axiosError = error;
                    if (axiosError.code === 'ECONNREFUSED') {
                        logger_1.logger.error(`Connection refused to LM Studio at ${this.baseUrl}. Is LM Studio running?`);
                        throw new Error(`Connection refused to LM Studio. Please make sure LM Studio is running.`);
                    }
                    else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ESOCKETTIMEDOUT') {
                        logger_1.logger.error(`Connection to LM Studio at ${this.baseUrl} timed out.`);
                        throw new Error(`Connection to LM Studio timed out. Please check if LM Studio is running.`);
                    }
                    throw error; // Re-throw for retry mechanism
                }
            }, 1, // Only retry once for generation to avoid long waits
            1000 // Start with 1000ms delay
            );
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error(`Error generating text with LM Studio: ${errorMessage}`);
            // Show a notification to the user with instructions
            (0, notifications_1.showErrorMessage)(`Failed to generate text with LM Studio: ${errorMessage}`, 'Check LM Studio', 'Open Settings').then(selection => {
                if (selection === 'Check LM Studio') {
                    vscode.env.openExternal(vscode.Uri.parse('https://lmstudio.ai/'));
                }
                else if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('codessa.openProviderSettings');
                }
            });
            return {
                content: '',
                error: `LM Studio generation error: ${errorMessage}. Please ensure LM Studio is running with the API server enabled.`
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
            // Make the streaming API request with retry logic
            const response = await this.withRetry(async () => {
                try {
                    return await axios.post(`${this.baseUrl}/chat/completions`, {
                        model: modelId,
                        messages: messages,
                        temperature: params.temperature || 0.7,
                        max_tokens: params.maxTokens || 1024,
                        stop: params.stopSequences || [],
                        stream: true
                    }, {
                        responseType: 'stream',
                        timeout: 30000 // 30 second timeout for generation
                    });
                }
                catch (error) {
                    // Enhance error logging with more details
                    const axiosError = error;
                    if (axiosError.code === 'ECONNREFUSED') {
                        logger_1.logger.error(`Connection refused to LM Studio at ${this.baseUrl}. Is LM Studio running?`);
                        throw new Error(`Connection refused to LM Studio. Please make sure LM Studio is running.`);
                    }
                    else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ESOCKETTIMEDOUT') {
                        logger_1.logger.error(`Connection to LM Studio at ${this.baseUrl} timed out.`);
                        throw new Error(`Connection to LM Studio timed out. Please check if LM Studio is running.`);
                    }
                    throw error; // Re-throw for retry mechanism
                }
            }, 1, // Only retry once for streaming to avoid long waits
            1000 // Start with 1000ms delay
            );
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error(`Error streaming text with LM Studio: ${errorMessage}`);
            // Show a notification to the user with instructions
            (0, notifications_1.showErrorMessage)(`Failed to stream text from LM Studio: ${errorMessage}`, 'Check LM Studio', 'Open Settings').then(selection => {
                if (selection === 'Check LM Studio') {
                    vscode.env.openExternal(vscode.Uri.parse('https://lmstudio.ai/'));
                }
                else if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('codessa.openProviderSettings');
                }
            });
            throw new Error(`LM Studio streaming error: ${errorMessage}. Please ensure LM Studio is running with the API server enabled.`);
        }
    }
    /**
     * Helper function to retry an operation with exponential backoff
     * @param operation The operation to retry
     * @param maxRetries Maximum number of retries
     * @param initialDelay Initial delay in milliseconds
     * @returns The result of the operation
     */
    async withRetry(operation, maxRetries = 2, initialDelay = 500) {
        let lastError;
        let delay = initialDelay;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    logger_1.logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // Exponential backoff
                }
            }
        }
        throw lastError;
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
            // Use retry logic for the API call
            const response = await this.withRetry(async () => {
                try {
                    return await axios.get(`${this.baseUrl}/models`, { timeout: 5000 });
                }
                catch (error) {
                    // Enhance error logging with more details
                    const axiosError = error;
                    if (axiosError.code === 'ECONNREFUSED') {
                        logger_1.logger.error(`Connection refused to LM Studio at ${this.baseUrl}. Is LM Studio running?`);
                        throw new Error(`Connection refused to LM Studio. Please make sure LM Studio is running at ${this.baseUrl}.`);
                    }
                    else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ESOCKETTIMEDOUT') {
                        logger_1.logger.error(`Connection to LM Studio at ${this.baseUrl} timed out.`);
                        throw new Error(`Connection to LM Studio timed out. Please check if LM Studio is running at ${this.baseUrl}.`);
                    }
                    throw error; // Re-throw for retry mechanism
                }
            });
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
            // Provide more detailed error information
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error(`Failed to fetch LM Studio models: ${errorMessage}`);
            // Show a notification to the user with instructions
            (0, notifications_1.showErrorMessage)(`Failed to connect to LM Studio: ${errorMessage}`, 'Open Settings').then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('codessa.openProviderSettings');
                }
            });
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
            // Check if we can connect to the LM Studio server with retry logic
            await this.withRetry(async () => {
                try {
                    return await axios.get(`${this.baseUrl}/models`, { timeout: 5000 });
                }
                catch (error) {
                    // Enhance error logging with more details
                    const axiosError = error;
                    if (axiosError.code === 'ECONNREFUSED') {
                        throw new Error(`Connection refused. Please make sure LM Studio is running at ${this.baseUrl}.`);
                    }
                    else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ESOCKETTIMEDOUT') {
                        throw new Error(`Connection timed out. Please check if LM Studio is running at ${this.baseUrl}.`);
                    }
                    throw error; // Re-throw for retry mechanism
                }
            }, 1, // Only retry once for test connection
            500 // Start with 500ms delay
            );
            return {
                success: true,
                message: `Successfully connected to LM Studio server at ${this.baseUrl}.`
            };
        }
        catch (error) {
            logger_1.logger.debug('LM Studio /models endpoint test failed, trying chat completion as fallback');
            // Try a simple chat completion request as fallback
            try {
                await this.withRetry(async () => {
                    return await axios.post(`${this.baseUrl}/chat/completions`, {
                        model: modelId,
                        messages: [{ role: 'user', content: 'Hello' }],
                        max_tokens: 5
                    }, { timeout: 5000 });
                }, 1, // Only retry once for test connection
                500 // Start with 500ms delay
                );
                return {
                    success: true,
                    message: `Successfully connected to LM Studio server at ${this.baseUrl} using chat completions.`
                };
            }
            catch (secondError) {
                // Combine both errors for better diagnostics
                const firstErrorMsg = error instanceof Error ? error.message : 'Unknown error';
                const secondErrorMsg = secondError instanceof Error ? secondError.message : 'Unknown error';
                const errorDetails = `Failed to connect to LM Studio server at ${this.baseUrl}:\n` +
                    `- Models endpoint error: ${firstErrorMsg}\n` +
                    `- Chat completions endpoint error: ${secondErrorMsg}`;
                logger_1.logger.error('LM Studio connection test failed:', errorDetails);
                // Show a notification with instructions
                (0, notifications_1.showErrorMessage)(`Failed to connect to LM Studio. Is it running?`, 'Check LM Studio', 'Open Settings').then(selection => {
                    if (selection === 'Check LM Studio') {
                        vscode.env.openExternal(vscode.Uri.parse('https://lmstudio.ai/'));
                    }
                    else if (selection === 'Open Settings') {
                        vscode.commands.executeCommand('codessa.openProviderSettings');
                    }
                });
                return {
                    success: false,
                    message: `Failed to connect to LM Studio server. Please ensure LM Studio is running at ${this.baseUrl} with the API server enabled.`
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