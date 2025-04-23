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
exports.DeepSeekProvider = void 0;
const vscode = __importStar(require("vscode"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for DeepSeek API
 */
class DeepSeekProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'deepseek';
        this.displayName = 'DeepSeek';
        this.description = 'Access DeepSeek AI models including DeepSeek-Coder';
        this.website = 'https://deepseek.ai';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api.deepseek.com/v1';
        this.defaultModel = 'deepseek-coder';
        this.client = null;
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("DeepSeek configuration changed, re-initializing client.");
                this.loadConfig().then(() => {
                    this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
                    this.initializeClient();
                });
            }
        });
    }
    /**
     * Initialize the Axios client for API requests
     */
    initializeClient() {
        try {
            if (!this.config.apiKey) {
                logger_1.logger.warn('DeepSeek API key not configured');
                this.client = null;
                return;
            }
            this.client = axios.create({
                baseURL: this.baseUrl,
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 seconds timeout
            });
            logger_1.logger.debug(`DeepSeek client initialized with endpoint: ${this.baseUrl}`);
            logger_1.logger.info('DeepSeek client initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize DeepSeek client:', error);
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
     * Generate text using DeepSeek
     */
    async generate(params, _cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'DeepSeek client not initialized' };
        }
        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            // Prepare messages
            const messages = [];
            if (params.history && params.history.length > 0) {
                messages.push(...params.history);
            }
            else {
                if (params.systemPrompt) {
                    messages.push({
                        role: 'system',
                        content: params.systemPrompt
                    });
                }
                messages.push({
                    role: 'user',
                    content: params.prompt
                });
            }
            // Format tools if provided
            let functions = undefined;
            if (tools && tools.size > 0) {
                functions = Array.from(tools.values()).map(tool => ({
                    name: tool.id,
                    description: tool.description,
                    parameters: tool.inputSchema || { type: 'object', properties: {} }
                }));
            }
            let toolChoice = undefined;
            if (functions && functions.length > 0) {
                toolChoice = "auto";
            }
            // Make the API request
            const response = await this.client.post('/v1/chat/completions', {
                model: modelId,
                messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                functions,
                function_call: toolChoice
            });
            // Extract the response content
            const content = response.data.choices[0]?.message?.content || '';
            // Handle tool calls
            let toolCallRequest = undefined;
            if (response.data.choices[0]?.message?.function_call) {
                const functionCall = response.data.choices[0].message.function_call;
                toolCallRequest = {
                    name: functionCall.name,
                    arguments: JSON.parse(functionCall.arguments)
                };
            }
            return {
                content,
                finishReason: response.data.choices[0]?.finish_reason || 'stop',
                usage: response.data.usage || {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                toolCallRequest
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating text with DeepSeek:', error);
            return {
                content: '',
                error: `DeepSeek generation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * List available models from DeepSeek
     */
    async listModels() {
        if (!this.client) {
            logger_1.logger.warn("Cannot fetch DeepSeek models, client not configured.");
            return [];
        }
        try {
            logger_1.logger.debug('Fetching DeepSeek models list');
            const response = await this.client.get('/models');
            // DeepSeek response format
            const models = response.data?.data || [];
            logger_1.logger.info(`Provider deepseek has ${models.length} models available`);
            return models.map((m) => ({
                id: m.id,
                name: m.name || m.id,
                description: m.description || '',
                contextWindow: m.context_length || 8192,
                maxOutputTokens: m.max_output_tokens,
                supportsFunctions: m.supports_functions || false,
                supportsVision: m.supports_vision || false
            })).sort((a, b) => a.id.localeCompare(b.id));
        }
        catch (error) {
            logger_1.logger.error("Failed to fetch DeepSeek models:", error);
            // Return predefined models
            return [
                // DeepSeek Coder models
                {
                    id: 'deepseek-coder',
                    name: 'DeepSeek Coder',
                    description: 'Latest DeepSeek Coder model optimized for programming tasks',
                    contextWindow: 16384,
                    pricingInfo: 'API usage pricing'
                },
                {
                    id: 'deepseek-coder-6.7b',
                    name: 'DeepSeek Coder 6.7B',
                    description: 'Smaller DeepSeek Coder model (6.7B parameters)',
                    contextWindow: 16384,
                    pricingInfo: 'Free (open weights)'
                },
                {
                    id: 'deepseek-coder-33b',
                    name: 'DeepSeek Coder 33B',
                    description: 'Larger DeepSeek Coder model (33B parameters)',
                    contextWindow: 16384,
                    pricingInfo: 'Free (open weights)'
                },
                {
                    id: 'deepseek-coder-instruct',
                    name: 'DeepSeek Coder Instruct',
                    description: 'Instruction-tuned DeepSeek Coder model',
                    contextWindow: 16384,
                    pricingInfo: 'API usage pricing'
                },
                // DeepSeek Chat models
                {
                    id: 'deepseek-chat',
                    name: 'DeepSeek Chat',
                    description: 'General-purpose DeepSeek Chat model',
                    contextWindow: 8192,
                    pricingInfo: 'API usage pricing'
                },
                {
                    id: 'deepseek-llm-67b-chat',
                    name: 'DeepSeek LLM 67B Chat',
                    description: 'Large DeepSeek Chat model (67B parameters)',
                    contextWindow: 8192,
                    pricingInfo: 'API usage pricing'
                }
            ];
        }
    }
    /**
     * Test connection to DeepSeek
     */
    async testConnection() {
        if (!this.client) {
            return {
                success: false,
                message: 'DeepSeek client not initialized. Please check your API key.'
            };
        }
        try {
            // Try a simple models request
            await this.client.get('/models');
            return {
                success: true,
                message: 'Successfully connected to DeepSeek API.'
            };
        }
        catch (error) {
            logger_1.logger.error('DeepSeek connection test failed:', error);
            return {
                success: false,
                message: `Failed to connect to DeepSeek API: ${error instanceof Error ? error.message : 'Unknown error'}`
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
                description: 'Your DeepSeek API key',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The DeepSeek API endpoint (default: https://api.deepseek.com/v1)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use',
                required: false,
                type: 'select',
                options: [
                    'deepseek-coder',
                    'deepseek-coder-6.7b',
                    'deepseek-coder-33b',
                    'deepseek-coder-instruct',
                    'deepseek-chat',
                    'deepseek-llm-67b-chat'
                ]
            }
        ];
    }
}
exports.DeepSeekProvider = DeepSeekProvider;
//# sourceMappingURL=deepseekProvider.js.map