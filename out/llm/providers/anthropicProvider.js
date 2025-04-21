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
exports.AnthropicProvider = void 0;
const config_1 = require("../../config");
const logger_1 = require("../../logger");
const vscode = __importStar(require("vscode"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
class AnthropicProvider {
    constructor() {
        this.providerId = 'anthropic';
        this.displayName = 'Anthropic';
        this.description = 'Anthropic Claude AI models';
        this.website = 'https://anthropic.com';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = false;
        this.defaultModel = 'claude-3-opus-20240229';
        this.client = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.providers.anthropic')) {
                logger_1.logger.info("Anthropic configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }
    initializeClient() {
        const apiKey = (0, config_1.getAnthropicApiKey)();
        if (!apiKey) {
            logger_1.logger.warn('Anthropic API key not set.');
            this.client = null;
            return;
        }
        try {
            this.client = new sdk_1.default({ apiKey });
            logger_1.logger.info('Anthropic client initialized.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Anthropic client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        return !!this.client;
    }
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return {
                content: '',
                error: 'Anthropic provider not configured (API key missing). Please set the API key in settings.'
            };
        }
        if (cancellationToken?.isCancellationRequested) {
            return { content: '', error: 'Request cancelled', finishReason: 'cancelled' };
        }
        try {
            // Prepare messages
            const messages = [];
            // Add history messages if available
            if (params.history && params.history.length > 0) {
                for (const msg of params.history) {
                    if (msg.role === 'system') {
                        continue; // Skip system messages in history as Anthropic handles them separately
                    }
                    if (msg.role === 'user' || msg.role === 'assistant') {
                        messages.push({
                            role: msg.role,
                            content: msg.content
                        });
                    }
                }
            }
            else {
                // If no history, add the current prompt
                messages.push({
                    role: 'user',
                    content: params.prompt
                });
            }
            // Set up tool configuration if tools are provided
            const anthropicTools = [];
            if (tools && tools.size > 0) {
                for (const [toolId, tool] of tools.entries()) {
                    if (tool.actions) {
                        for (const [actionId, action] of Object.entries(tool.actions)) {
                            if (action.parameters) {
                                anthropicTools.push({
                                    function: {
                                        name: `${toolId}.${actionId}`,
                                        description: action.description || `${toolId} ${actionId} action`,
                                        parameters: action.parameters
                                    }
                                });
                            }
                        }
                    }
                }
            }
            // Create the completion request
            const completionRequest = {
                model: params.modelId || 'claude-3-opus-20240229',
                messages,
                max_tokens: params.maxTokens || 1024,
                temperature: params.temperature,
                system: params.systemPrompt
            };
            // Add tools if available
            if (anthropicTools.length > 0) {
                completionRequest.tools = anthropicTools;
            }
            // Make the API call
            logger_1.logger.debug(`Sending request to Anthropic with model: ${completionRequest.model}`);
            const response = await this.client.messages.create(completionRequest);
            // Process the response
            let toolCallRequest;
            let content = '';
            if (response.content && response.content.length > 0) {
                for (const block of response.content) {
                    if (block.type === 'text') {
                        content += block.text;
                    }
                    else if (block.type === 'tool_use' && tools) {
                        // Process tool call
                        try {
                            toolCallRequest = {
                                name: block.name || '',
                                arguments: JSON.parse(block.input || '{}')
                            };
                            // Break early to let the agent execute the tool
                            break;
                        }
                        catch (error) {
                            logger_1.logger.error('Error parsing tool call from Anthropic:', error);
                        }
                    }
                }
            }
            return {
                content,
                finishReason: response.stop_reason || 'stop',
                toolCallRequest
            };
        }
        catch (error) {
            logger_1.logger.error('Error calling Anthropic API:', error);
            let errorMessage = 'Error calling Anthropic API.';
            if (error.response?.data?.error?.message) {
                errorMessage = `Anthropic API error: ${error.response.data.error.message}`;
            }
            else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            return { content: '', error: errorMessage };
        }
    }
    async getAvailableModels() {
        if (!this.isConfigured()) {
            return [];
        }
        // Return default Claude models - Anthropic doesn't provide a model listing API
        return [
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
            'claude-2.1',
            'claude-2.0',
            'claude-instant-1.2'
        ];
    }
    /**
     * Lists available models with their details
     */
    async listModels() {
        if (!this.isConfigured()) {
            return [];
        }
        // Return default Claude models - Anthropic doesn't provide a model listing API
        const models = [
            { id: 'claude-3-opus-20240229' },
            { id: 'claude-3-sonnet-20240229' },
            { id: 'claude-3-haiku-20240307' },
            { id: 'claude-2.1' },
            { id: 'claude-2.0' },
            { id: 'claude-instant-1.2' }
        ];
        logger_1.logger.info(`Provider anthropic has ${models.length} models available`);
        return models;
    }
    /**
     * Test connection to Anthropic
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'Anthropic client not initialized. Please check your API key.'
            };
        }
        try {
            // Anthropic doesn't have a dedicated endpoint for testing connections,
            // so we'll make a minimal API call
            await this.client.messages.create({
                model: modelId,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hello' }]
            });
            return {
                success: true,
                message: `Successfully connected to Anthropic API with model '${modelId}'.`
            };
        }
        catch (error) {
            logger_1.logger.error('Anthropic connection test failed:', error);
            let errorMessage = 'Failed to connect to Anthropic API';
            if (error.response?.data?.error?.message) {
                errorMessage = `Anthropic API error: ${error.response.data.error.message}`;
            }
            else if (error.message) {
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
            apiKey: (0, config_1.getAnthropicApiKey)(),
            defaultModel: this.defaultModel
        };
    }
    /**
     * Update the provider configuration
     */
    async updateConfig(config) {
        // This is a placeholder - in the real implementation, we would update the configuration
        // For now, we'll just log that this method was called
        logger_1.logger.info(`Anthropic provider updateConfig called with: ${JSON.stringify(config)}`);
    }
    /**
     * Get the configuration fields for this provider
     */
    getConfigurationFields() {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Anthropic API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., claude-3-opus-20240229)',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.AnthropicProvider = AnthropicProvider;
//# sourceMappingURL=anthropicProvider.js.map