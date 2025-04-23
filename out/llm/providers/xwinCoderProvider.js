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
exports.XwinCoderProvider = void 0;
const vscode = __importStar(require("vscode"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for XwinCoder models
 *
 * XwinCoder is a Mixtral fine-tuned model optimized for coding
 * It can be used via Hugging Face or self-hosted
 */
class XwinCoderProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'xwincoder';
        this.displayName = 'XwinCoder';
        this.description = 'Mixtral fine-tuned model optimized for coding';
        this.website = 'https://huggingface.co/xwin-lm/XwinCoder';
        this.requiresApiKey = true; // Required for Hugging Face API
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api-inference.huggingface.co/models';
        this.defaultModel = 'xwin-lm/XwinCoder-7B';
        this.client = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("XwinCoder configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }
    initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        if (!apiKey) {
            logger_1.logger.warn('API key not set for XwinCoder provider.');
            this.client = null;
            return;
        }
        try {
            // Initialize axios client with proper configuration
            this.client = axios.create({
                baseURL: baseUrl,
                timeout: 120000, // 2 minutes timeout for model loading
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            logger_1.logger.info('XwinCoder client initialized successfully.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize XwinCoder client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        return !!this.client;
    }
    /**
     * Generate text using XwinCoder models
     */
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'XwinCoder provider not configured (API key missing?)' };
        }
        try {
            // Prepare the model endpoint - for Hugging Face we need to specify the model in the URL
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            const endpoint = `${modelId}`;
            // Prepare the prompt
            let prompt = '';
            // XwinCoder uses a specific format for chat
            if (params.systemPrompt) {
                prompt += `<|im_start|>system\n${params.systemPrompt}<|im_end|>\n\n`;
            }
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `<|im_start|>user\n${message.content}<|im_end|>\n\n`;
                    }
                    else if (message.role === 'assistant') {
                        prompt += `<|im_start|>assistant\n${message.content}<|im_end|>\n\n`;
                    }
                    else if (message.role === 'system') {
                        prompt += `<|im_start|>system\n${message.content}<|im_end|>\n\n`;
                    }
                }
            }
            else {
                // Just add the user prompt
                prompt += `<|im_start|>user\n${params.prompt}<|im_end|>\n\n`;
            }
            // Add the assistant prefix to indicate we want the model to generate a response
            prompt += `<|im_start|>assistant\n`;
            // Check for cancellation before making the request
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }
            // Prepare request data
            const requestData = {
                inputs: prompt,
                parameters: {
                    max_new_tokens: params.maxTokens || 1024,
                    temperature: params.temperature || 0.7,
                    top_p: 0.95,
                    do_sample: true,
                    return_full_text: false,
                    stop: params.stopSequences || ["<|im_start|>", "<|im_end|>"]
                }
            };
            logger_1.logger.debug(`Sending request to XwinCoder model ${modelId}`);
            // Create cancellation token source to abort the request if needed
            let abortController;
            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger_1.logger.info("XwinCoder request cancelled by user");
                        abortController?.abort();
                    });
                }
                else {
                    logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }
            // Make the API request
            const response = await this.client.post(endpoint, requestData, {
                signal: abortController?.signal
            });
            // Check for cancellation again after API call
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled during processing' };
            }
            // Parse the response
            const result = response.data;
            // Hugging Face Inference API returns an array of generated texts
            let content = '';
            if (Array.isArray(result) && result.length > 0) {
                if (result[0].generated_text) {
                    content = result[0].generated_text;
                }
            }
            return {
                content,
                finishReason: 'stop',
                usage: {
                    promptTokens: prompt.length / 4, // Rough estimate
                    completionTokens: content.length / 4, // Rough estimate
                }
            };
        }
        catch (error) {
            logger_1.logger.error('XwinCoder generate error:', error);
            let errorMessage = 'Failed to call XwinCoder API.';
            if (error.response) {
                errorMessage = `XwinCoder API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available XwinCoder models
     */
    async listModels() {
        // XwinCoder models are fixed, so we return a predefined list
        return [
            {
                id: 'xwin-lm/XwinCoder-7B',
                name: 'XwinCoder 7B',
                description: 'XwinCoder model (7B parameters)',
                contextWindow: 8192,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'xwin-lm/XwinCoder-13B',
                name: 'XwinCoder 13B',
                description: 'XwinCoder model (13B parameters)',
                contextWindow: 8192,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'xwin-lm/XwinCoder-34B',
                name: 'XwinCoder 34B',
                description: 'XwinCoder model (34B parameters)',
                contextWindow: 8192,
                pricingInfo: 'Free with Hugging Face API'
            }
        ];
    }
    /**
     * Test connection to XwinCoder
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'XwinCoder client not initialized. Please check your API key.'
            };
        }
        try {
            // Simple test request to check if the API is working
            const endpoint = modelId;
            const response = await this.client.post(endpoint, {
                inputs: "def hello_world():",
                parameters: {
                    max_new_tokens: 10,
                    return_full_text: false
                }
            });
            if (response.data) {
                return {
                    success: true,
                    message: `Successfully connected to Hugging Face API and tested model '${modelId}'.`
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
            logger_1.logger.error('XwinCoder connection test failed:', error);
            let errorMessage = 'Failed to connect to Hugging Face API';
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
                name: 'Hugging Face API Key',
                description: 'Your Hugging Face API key (from https://huggingface.co/settings/tokens)',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The Hugging Face Inference API endpoint (default: https://api-inference.huggingface.co/models)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default XwinCoder model to use',
                required: false,
                type: 'select',
                options: [
                    'xwin-lm/XwinCoder-7B',
                    'xwin-lm/XwinCoder-13B',
                    'xwin-lm/XwinCoder-34B'
                ]
            }
        ];
    }
}
exports.XwinCoderProvider = XwinCoderProvider;
//# sourceMappingURL=xwinCoderProvider.js.map