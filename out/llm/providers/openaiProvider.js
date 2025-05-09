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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const config_1 = require("../../config");
const logger_1 = require("../../logger");
const vscode = __importStar(require("vscode"));
// Reference our custom type definitions
/// <reference path="../../types/openai.d.ts" />
const openai_1 = __importDefault(require("openai"));
class OpenAIProvider {
    constructor() {
        this.providerId = 'openai';
        this.displayName = 'OpenAI';
        this.description = 'OpenAI API for GPT models';
        this.website = 'https://openai.com';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api.openai.com/v1';
        this.defaultModel = 'gpt-4o';
        this.client = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.providers.openai')) {
                logger_1.logger.info("OpenAI configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }
    initializeClient() {
        const apiKey = (0, config_1.getOpenAIApiKey)();
        const baseUrl = (0, config_1.getOpenAIBaseUrl)();
        if (!apiKey) {
            logger_1.logger.warn('OpenAI API key not set.');
            this.client = null;
            return;
        }
        const config = { apiKey };
        if (baseUrl) {
            config.baseURL = baseUrl;
        }
        try {
            this.client = new openai_1.default(config);
            logger_1.logger.info('OpenAI client initialized.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize OpenAI client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        return !!this.client;
    }
    /**
     * Formats tools for OpenAI function calling API
     */
    formatToolsForOpenAI(tools) {
        if (!tools || tools.size === 0) {
            return undefined;
        }
        const formattedTools = [];
        tools.forEach(tool => {
            // Handle file tool with subactions
            if (tool.id === 'file' && typeof tool.getSubActions === 'function') {
                const subActions = tool.getSubActions();
                for (const subAction of subActions) {
                    formattedTools.push({
                        type: 'function',
                        function: {
                            name: `${tool.id}.${subAction.id}`,
                            description: subAction.description || `${tool.id}.${subAction.id} operation`,
                            parameters: subAction.inputSchema || { type: 'object', properties: {} }
                        }
                    });
                }
            }
            else {
                // Regular tool
                formattedTools.push({
                    type: 'function',
                    function: {
                        name: tool.id,
                        description: tool.description || `${tool.id} operation`,
                        parameters: tool.inputSchema || { type: 'object', properties: {} }
                    }
                });
            }
        });
        return formattedTools.length > 0 ? formattedTools : undefined;
    }
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'OpenAI provider not configured (API key missing?)' };
        }
        try {
            // Prepare messages
            let messages;
            if (params.history && params.history.length > 0) {
                messages = params.history;
            }
            else {
                messages = [
                    params.systemPrompt ? { role: 'system', content: params.systemPrompt } : undefined,
                    { role: 'user', content: params.prompt }
                ].filter(Boolean);
            }
            // Format tools if provided
            const formattedTools = this.formatToolsForOpenAI(tools);
            // Check for cancellation before calling API
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }
            // Create API request
            const request = {
                model: params.modelId,
                messages: messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                stop: params.stopSequences,
                tools: formattedTools,
                tool_choice: formattedTools ? 'auto' : undefined,
                ...params.options
            };
            logger_1.logger.debug(`Sending request to OpenAI model ${params.modelId}`);
            // Create cancellation token source to abort the request if needed
            let abortController;
            if (cancellationToken) {
                // Use the global AbortController if available, or provide a simple fallback
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger_1.logger.info("OpenAI request cancelled by user");
                        abortController?.abort();
                    });
                }
                else {
                    logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }
            // Run API request with possible cancellation
            const response = await this.client.chat.completions.create({
                ...request,
                signal: abortController?.signal
            });
            // Check for cancellation again after API call (in case it was cancelled but too late to abort)
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled during processing' };
            }
            const choice = response.choices[0];
            logger_1.logger.debug(`OpenAI response received. Finish reason: ${choice.finish_reason}`);
            // Check if we got a tool call
            let toolCallRequest;
            if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
                const toolCall = choice.message.tool_calls[0]; // Take the first one for now
                try {
                    toolCallRequest = {
                        id: toolCall.id,
                        name: toolCall.function.name,
                        arguments: JSON.parse(toolCall.function.arguments || '{}')
                    };
                }
                catch (e) {
                    logger_1.logger.error(`Failed to parse tool call arguments: ${e}`);
                }
            }
            // Return the response
            return {
                content: choice.message?.content?.trim() ?? '',
                finishReason: choice.finish_reason ?? undefined,
                usage: {
                    promptTokens: response.usage?.prompt_tokens,
                    completionTokens: response.usage?.completion_tokens,
                    totalTokens: response.usage?.total_tokens,
                },
                toolCalls: choice.message?.tool_calls,
                toolCallRequest
            };
        }
        catch (error) {
            // Handle errors, differentiating between OpenAI API errors and other errors
            logger_1.logger.error('OpenAI generate error:', error);
            let errorMessage = 'Failed to call OpenAI API.';
            if (error.status && error.message) {
                // OpenAI API error format
                errorMessage = `OpenAI API Error (${error.status}): ${error.message}`;
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
    async getAvailableModels() {
        if (!this.client) {
            logger_1.logger.warn('Cannot fetch OpenAI models, client not configured.');
            return [];
        }
        try {
            const response = await this.client.models.list();
            // Filter for models that support the chat completions API
            return response.data
                .filter((m) => m.id.includes('gpt') || m.id.includes('text-davinci'))
                .map((m) => m.id)
                .sort();
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch OpenAI models:', error);
            return [];
        }
    }
    async listModels() {
        if (!this.client) {
            logger_1.logger.warn('Cannot fetch OpenAI models, client not configured.');
            return [];
        }
        try {
            const response = await this.client.models.list();
            // Filter for models that support the chat completions API
            const models = response.data
                .filter((m) => m.id.includes('gpt') || m.id.includes('text-davinci'));
            logger_1.logger.info(`Provider openai has ${models.length} models available`);
            return models.map((m) => ({ id: m.id })).sort((a, b) => a.id.localeCompare(b.id));
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch OpenAI models:', error);
            return [];
        }
    }
    /**
     * Test connection to OpenAI
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'OpenAI client not initialized. Please check your API key.'
            };
        }
        try {
            // First check if we can connect to the OpenAI API
            const modelsResponse = await this.client.models.list();
            // Then check if the specified model is available
            const modelExists = modelsResponse.data.some((m) => m.id === modelId);
            if (!modelExists) {
                return {
                    success: false,
                    message: `Model '${modelId}' not found in your available models.`
                };
            }
            return {
                success: true,
                message: `Successfully connected to OpenAI API and verified model '${modelId}'.`
            };
        }
        catch (error) {
            logger_1.logger.error('OpenAI connection test failed:', error);
            let errorMessage = 'Failed to connect to OpenAI API';
            if (error.status && error.message) {
                errorMessage = `OpenAI API Error (${error.status}): ${error.message}`;
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
     * Get the configuration for this provider
     */
    getConfig() {
        return {
            apiKey: (0, config_1.getOpenAIApiKey)(),
            apiEndpoint: (0, config_1.getOpenAIBaseUrl)(),
            defaultModel: this.defaultModel
        };
    }
    /**
     * Update the provider configuration
     */
    async updateConfig(config) {
        // This is a placeholder - in the real implementation, we would update the configuration
        // For now, we'll just log that this method was called
        logger_1.logger.info(`OpenAI provider updateConfig called with: ${JSON.stringify(config)}`);
    }
    /**
     * Get the configuration fields for this provider
     */
    getConfigurationFields() {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your OpenAI API key',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The OpenAI API endpoint (default: https://api.openai.com/v1)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., gpt-4o, gpt-3.5-turbo)',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=openaiProvider.js.map