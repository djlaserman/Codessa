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
exports.MistralAIProvider = void 0;
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
const vscode = __importStar(require("vscode"));
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
// Import MistralClient if available
let MistralClient;
try {
    MistralClient = require('@mistralai/mistralai').MistralClient;
}
catch (error) {
    logger_1.logger.warn('MistralAI SDK not available, falling back to axios');
}
class MistralAIProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'mistralai';
        this.displayName = 'Mistral AI';
        this.description = 'Mistral AI language models including Mistral 7B and Mixtral 8x7B';
        this.website = 'https://mistral.ai/';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api.mistral.ai/v1';
        this.defaultModel = 'mistral-large';
        this.client = null;
        this.mistralClient = null;
        this.baseUrl = '';
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("Mistral AI configuration changed, re-initializing client.");
                this.loadConfig().then(() => {
                    this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
                    this.initializeClient();
                });
            }
        });
    }
    initializeClient() {
        const apiKey = this.config.apiKey;
        if (!apiKey) {
            logger_1.logger.warn('Mistral AI API key not set.');
            this.client = null;
            this.mistralClient = null;
            return;
        }
        try {
            // Initialize the Axios client for REST API calls
            this.client = axios.create({
                baseURL: this.baseUrl,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // 60 seconds timeout
            });
            // Initialize the MistralClient if available
            if (MistralClient) {
                this.mistralClient = new MistralClient(apiKey, { endpoint: this.baseUrl });
                logger_1.logger.info('Mistral AI SDK client initialized.');
            }
            else {
                logger_1.logger.info('Mistral AI REST client initialized.');
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Mistral AI client:', error);
            this.client = null;
            this.mistralClient = null;
        }
    }
    isConfigured() {
        return !!(this.client || this.mistralClient);
    }
    async generate(params, cancellationToken, tools) {
        if (!this.isConfigured()) {
            return {
                content: '',
                error: 'Mistral AI provider not configured (API key missing). Please set the API key in settings.'
            };
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
            // Create cancellation token source to abort the request if needed
            let abortController;
            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger_1.logger.info("Mistral AI request cancelled by user");
                        abortController?.abort();
                    });
                }
                else {
                    logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }
            // Check for cancellation before making the request
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }
            let response;
            // Use the SDK if available, otherwise use the REST API
            if (this.mistralClient) {
                // Use the SDK
                const chatParams = {
                    model: modelId,
                    messages: messages,
                    temperature: params.temperature ?? 0.7,
                    maxTokens: params.maxTokens,
                    stream: false
                };
                // Add tools if available
                if (functions && functions.length > 0) {
                    chatParams.tools = functions;
                    chatParams.toolChoice = 'auto';
                }
                response = await this.mistralClient.chat(chatParams);
                // Extract the response content
                const content = response.choices[0]?.message?.content || '';
                // Handle tool calls
                let toolCallRequest = undefined;
                if (response.choices[0]?.message?.tool_calls && response.choices[0].message.tool_calls.length > 0) {
                    const toolCall = response.choices[0].message.tool_calls[0];
                    toolCallRequest = {
                        name: toolCall.function.name,
                        arguments: JSON.parse(toolCall.function.arguments)
                    };
                }
                return {
                    content,
                    finishReason: response.choices[0]?.finish_reason || 'stop',
                    usage: response.usage,
                    toolCallRequest
                };
            }
            else {
                // Use the REST API
                const requestData = {
                    model: modelId,
                    messages: messages,
                    temperature: params.temperature ?? 0.7,
                    max_tokens: params.maxTokens
                };
                // Add tools if available
                if (functions && functions.length > 0) {
                    requestData.tools = functions;
                    requestData.tool_choice = 'auto';
                }
                response = await this.client.post('/chat/completions', requestData, {
                    signal: abortController?.signal
                });
                // Extract the response content
                const content = response.data.choices[0]?.message?.content || '';
                // Handle tool calls
                let toolCallRequest = undefined;
                if (response.data.choices[0]?.message?.tool_calls && response.data.choices[0].message.tool_calls.length > 0) {
                    const toolCall = response.data.choices[0].message.tool_calls[0];
                    toolCallRequest = {
                        name: toolCall.function.name,
                        arguments: JSON.parse(toolCall.function.arguments)
                    };
                }
                return {
                    content,
                    finishReason: response.data.choices[0]?.finish_reason || 'stop',
                    usage: response.data.usage,
                    toolCallRequest
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Mistral AI generate error:', error);
            let errorMessage = 'Failed to call Mistral AI API.';
            if (error.response) {
                errorMessage = `Mistral AI API Error (${error.response.status}): ${error.response.data?.error?.message || error.message}`;
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
    async listModels() {
        if (!this.isConfigured()) {
            logger_1.logger.warn("Cannot fetch Mistral AI models, client not configured.");
            return [];
        }
        try {
            // Try to fetch models from the API
            const response = await this.client.get('/models');
            if (response.data && response.data.data) {
                const apiModels = response.data.data;
                logger_1.logger.info(`Provider mistralai has ${apiModels.length} models available from API`);
                return apiModels.map((model) => ({
                    id: model.id,
                    name: this.getDisplayName(model.id),
                    description: this.getModelDescription(model.id),
                    contextWindow: this.getContextWindowForModel(model.id),
                    pricingInfo: this.getPricingInfoForModel(model.id)
                }));
            }
        }
        catch (error) {
            logger_1.logger.warn("Failed to fetch Mistral AI models from API, using predefined list", error);
        }
        // Return predefined models if API call fails
        return this.getPredefinedModels();
    }
    /**
     * Get predefined models
     */
    getPredefinedModels() {
        return [
            // Mistral API models
            {
                id: 'mistral-tiny',
                name: 'Mistral Tiny',
                description: 'Fast and efficient model for everyday tasks',
                contextWindow: 8192,
                pricingInfo: 'API usage pricing'
            },
            {
                id: 'mistral-small',
                name: 'Mistral Small',
                description: 'Balanced model for most use cases',
                contextWindow: 8192,
                pricingInfo: 'API usage pricing'
            },
            {
                id: 'mistral-medium',
                name: 'Mistral Medium',
                description: 'Advanced model with strong reasoning capabilities',
                contextWindow: 32768,
                pricingInfo: 'API usage pricing'
            },
            {
                id: 'mistral-large',
                name: 'Mistral Large',
                description: 'Most powerful Mistral model with superior performance',
                contextWindow: 32768,
                pricingInfo: 'API usage pricing'
            },
            // Open models
            {
                id: 'open-mistral-7b',
                name: 'Open Mistral 7B',
                description: 'Open-source Mistral 7B model',
                contextWindow: 8192,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'open-mixtral-8x7b',
                name: 'Open Mixtral 8x7B',
                description: 'Open-source Mixtral 8x7B model (MoE architecture)',
                contextWindow: 32768,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'mistral-7b-instruct',
                name: 'Mistral 7B Instruct',
                description: 'Instruction-tuned Mistral 7B model',
                contextWindow: 8192,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'mixtral-8x7b-instruct',
                name: 'Mixtral 8x7B Instruct',
                description: 'Instruction-tuned Mixtral 8x7B model',
                contextWindow: 32768,
                pricingInfo: 'Free (open weights)'
            }
        ];
    }
    /**
     * Get display name for a model
     */
    getDisplayName(modelId) {
        // Convert model ID to a more readable name
        const modelMap = {
            'mistral-tiny': 'Mistral Tiny',
            'mistral-small': 'Mistral Small',
            'mistral-medium': 'Mistral Medium',
            'mistral-large': 'Mistral Large',
            'open-mistral-7b': 'Open Mistral 7B',
            'open-mixtral-8x7b': 'Open Mixtral 8x7B',
            'mistral-7b-instruct': 'Mistral 7B Instruct',
            'mixtral-8x7b-instruct': 'Mixtral 8x7B Instruct'
        };
        return modelMap[modelId] || modelId;
    }
    /**
     * Get description for a model
     */
    getModelDescription(modelId) {
        const descriptionMap = {
            'mistral-tiny': 'Fast and efficient model for everyday tasks',
            'mistral-small': 'Balanced model for most use cases',
            'mistral-medium': 'Advanced model with strong reasoning capabilities',
            'mistral-large': 'Most powerful Mistral model with superior performance',
            'open-mistral-7b': 'Open-source Mistral 7B model',
            'open-mixtral-8x7b': 'Open-source Mixtral 8x7B model (MoE architecture)',
            'mistral-7b-instruct': 'Instruction-tuned Mistral 7B model',
            'mixtral-8x7b-instruct': 'Instruction-tuned Mixtral 8x7B model'
        };
        return descriptionMap[modelId] || 'Mistral AI model';
    }
    /**
     * Get context window size for a model
     */
    getContextWindowForModel(modelId) {
        // Context window sizes based on Mistral AI documentation
        if (modelId.includes('medium') || modelId.includes('large') || modelId.includes('mixtral')) {
            return 32768; // 32K context window
        }
        return 8192; // 8K context window for other models
    }
    /**
     * Get pricing information for a model
     */
    getPricingInfoForModel(modelId) {
        if (modelId.startsWith('open-') || modelId.includes('7b') || modelId.includes('8x7b')) {
            return 'Free (open weights)';
        }
        return 'API usage pricing';
    }
    /**
     * Test connection to Mistral AI
     */
    async testConnection(modelId) {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Mistral AI not configured. Please check your API key.'
            };
        }
        try {
            // Make a simple test request
            const response = await this.client.post('/chat/completions', {
                model: modelId,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 10
            });
            if (response.data && response.data.choices) {
                return {
                    success: true,
                    message: `Successfully connected to Mistral AI API and tested model '${modelId}'.`
                };
            }
            return {
                success: false,
                message: `Connected to API but received an unexpected response.`
            };
        }
        catch (error) {
            logger_1.logger.error('Mistral AI connection test failed:', error);
            let errorMessage = 'Failed to connect to Mistral AI API';
            if (error.response) {
                errorMessage = `API Error (${error.response.status}): ${error.response.data?.error?.message || error.message}`;
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
    // Use the parent class implementation for getConfig and updateConfig
    /**
     * Get the configuration fields for this provider
     */
    getConfigurationFields() {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Mistral AI API key',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The Mistral AI API endpoint (default: https://api.mistral.ai/v1)',
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
                    'mistral-tiny',
                    'mistral-small',
                    'mistral-medium',
                    'mistral-large',
                    'open-mistral-7b',
                    'open-mixtral-8x7b',
                    'mistral-7b-instruct',
                    'mixtral-8x7b-instruct'
                ]
            }
        ];
    }
}
exports.MistralAIProvider = MistralAIProvider;
//# sourceMappingURL=mistralAIProvider.js.map