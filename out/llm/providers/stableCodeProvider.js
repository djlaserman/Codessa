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
exports.StableCodeProvider = void 0;
const vscode = __importStar(require("vscode"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for StableCode models
 *
 * StableCode is a family of code-specialized LLMs from Stability AI
 * It can be used via Hugging Face or self-hosted
 */
class StableCodeProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'stablecode';
        this.displayName = 'StableCode';
        this.description = 'Code-specialized LLMs from Stability AI';
        this.website = 'https://huggingface.co/stabilityai/stablecode-instruct-alpha-3b';
        this.requiresApiKey = true; // Required for Hugging Face API
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api-inference.huggingface.co/models';
        this.defaultModel = 'stabilityai/stablecode-instruct-alpha-3b';
        this.client = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("StableCode configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }
    initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        if (!apiKey) {
            logger_1.logger.warn('API key not set for StableCode provider.');
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
            logger_1.logger.info('StableCode client initialized successfully.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize StableCode client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        return !!this.client;
    }
    /**
     * Generate text using StableCode models
     */
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'StableCode provider not configured (API key missing?)' };
        }
        try {
            // Prepare the model endpoint - for Hugging Face we need to specify the model in the URL
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            const endpoint = `${modelId}`;
            // Prepare the prompt
            let prompt = '';
            // StableCode uses a specific format for chat
            if (modelId.includes('instruct')) {
                // Instruction-tuned models use a specific format
                if (params.systemPrompt) {
                    prompt += `<|system|>\n${params.systemPrompt}\n\n`;
                }
                // Add history if provided
                if (params.history && params.history.length > 0) {
                    for (const message of params.history) {
                        if (message.role === 'user') {
                            prompt += `<|user|>\n${message.content}\n\n`;
                        }
                        else if (message.role === 'assistant') {
                            prompt += `<|assistant|>\n${message.content}\n\n`;
                        }
                        else if (message.role === 'system') {
                            prompt += `<|system|>\n${message.content}\n\n`;
                        }
                    }
                }
                else {
                    // Just add the user prompt
                    prompt += `<|user|>\n${params.prompt}\n\n`;
                }
                // Add the assistant prefix to indicate we want the model to generate a response
                prompt += `<|assistant|>\n`;
            }
            else {
                // Base models just use the prompt directly
                if (params.systemPrompt) {
                    prompt += `${params.systemPrompt}\n\n`;
                }
                if (params.history && params.history.length > 0) {
                    for (const message of params.history) {
                        prompt += `${message.content}\n\n`;
                    }
                }
                else {
                    prompt += params.prompt;
                }
            }
            // Check for cancellation before making the request
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }
            // Prepare request data
            const requestData = {
                inputs: prompt,
                parameters: {
                    max_new_tokens: params.maxTokens || 512,
                    temperature: params.temperature || 0.7,
                    top_p: 0.95,
                    do_sample: true,
                    return_full_text: false,
                    stop: params.stopSequences || ["<|user|>", "<|system|>"]
                }
            };
            logger_1.logger.debug(`Sending request to StableCode model ${modelId}`);
            // Create cancellation token source to abort the request if needed
            let abortController;
            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger_1.logger.info("StableCode request cancelled by user");
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
            logger_1.logger.error('StableCode generate error:', error);
            let errorMessage = 'Failed to call StableCode API.';
            if (error.response) {
                errorMessage = `StableCode API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available StableCode models
     */
    async listModels() {
        // StableCode models are fixed, so we return a predefined list
        return [
            {
                id: 'stabilityai/stablecode-instruct-alpha-3b',
                name: 'StableCode Instruct 3B',
                description: 'Instruction-tuned StableCode model (3B parameters)',
                contextWindow: 4096,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'stabilityai/stablecode-completion-alpha-3b',
                name: 'StableCode Completion 3B',
                description: 'Completion-focused StableCode model (3B parameters)',
                contextWindow: 4096,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'stabilityai/stablecode-completion-alpha-3b-4k',
                name: 'StableCode Completion 3B 4K',
                description: 'Completion-focused StableCode model with 4K context (3B parameters)',
                contextWindow: 4096,
                pricingInfo: 'Free with Hugging Face API'
            }
        ];
    }
    /**
     * Test connection to StableCode
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'StableCode client not initialized. Please check your API key.'
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
            logger_1.logger.error('StableCode connection test failed:', error);
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
                description: 'The default StableCode model to use',
                required: false,
                type: 'select',
                options: [
                    'stabilityai/stablecode-instruct-alpha-3b',
                    'stabilityai/stablecode-completion-alpha-3b',
                    'stabilityai/stablecode-completion-alpha-3b-4k'
                ]
            }
        ];
    }
}
exports.StableCodeProvider = StableCodeProvider;
//# sourceMappingURL=stableCodeProvider.js.map