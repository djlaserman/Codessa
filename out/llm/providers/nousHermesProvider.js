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
exports.NousHermesProvider = void 0;
const vscode = __importStar(require("vscode"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for Nous Hermes models
 *
 * Nous Hermes is a family of models with strong reasoning capabilities
 * While not code-only models, they perform well on coding tasks
 */
class NousHermesProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'noushermes';
        this.displayName = 'Nous Hermes';
        this.description = 'Models with strong reasoning capabilities, good for coding';
        this.website = 'https://huggingface.co/NousResearch';
        this.requiresApiKey = true; // Required for Hugging Face API
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api-inference.huggingface.co/models';
        this.defaultModel = 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO';
        this.client = null;
        this.endpointType = 'huggingface';
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("Nous Hermes configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }
    initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        // Determine endpoint type
        if (baseUrl.includes('huggingface.co')) {
            this.endpointType = 'huggingface';
        }
        else if (baseUrl.includes('localhost:11434') || baseUrl.includes('ollama')) {
            this.endpointType = 'ollama';
        }
        else {
            this.endpointType = 'custom';
        }
        if (this.endpointType === 'huggingface' && !apiKey) {
            logger_1.logger.warn('Hugging Face API key not set for Nous Hermes provider.');
            this.client = null;
            return;
        }
        try {
            // Initialize axios client with proper configuration
            const headers = {
                'Content-Type': 'application/json'
            };
            // Add API key if provided and using Hugging Face
            if (apiKey && this.endpointType === 'huggingface') {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            this.client = axios.create({
                baseURL: baseUrl,
                timeout: 120000, // 2 minutes timeout
                headers
            });
            logger_1.logger.info(`Nous Hermes client initialized successfully with endpoint type: ${this.endpointType}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Nous Hermes client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        // For Hugging Face, we need an API key
        if (this.endpointType === 'huggingface') {
            return !!this.client && !!this.config.apiKey;
        }
        // For other endpoints, we just need the client to be initialized
        return !!this.client;
    }
    /**
     * Generate text using Nous Hermes models
     */
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'Nous Hermes provider not configured' };
        }
        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            // Handle different endpoint types
            if (this.endpointType === 'huggingface') {
                return await this.generateWithHuggingFace(params, modelId, cancellationToken);
            }
            else if (this.endpointType === 'ollama') {
                return await this.generateWithOllama(params, modelId, cancellationToken);
            }
            else {
                return await this.generateWithCustomEndpoint(params, modelId, cancellationToken);
            }
        }
        catch (error) {
            logger_1.logger.error('Nous Hermes generate error:', error);
            let errorMessage = 'Failed to call Nous Hermes API.';
            if (error.response) {
                errorMessage = `Nous Hermes API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * Generate with Hugging Face Inference API
     */
    async generateWithHuggingFace(params, modelId, cancellationToken) {
        // Prepare the prompt
        let prompt = '';
        // Nous Hermes uses a specific format for chat
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
        // Create cancellation token source to abort the request if needed
        let abortController;
        if (cancellationToken) {
            if (typeof AbortController !== 'undefined') {
                abortController = new AbortController();
                cancellationToken.onCancellationRequested(() => {
                    logger_1.logger.info("Nous Hermes request cancelled by user");
                    abortController?.abort();
                });
            }
            else {
                logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
            }
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
        logger_1.logger.debug(`Sending request to Nous Hermes model ${modelId} via Hugging Face`);
        // Make the API request
        const response = await this.client.post(modelId, requestData, {
            signal: abortController?.signal
        });
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
    /**
     * Generate with Ollama
     */
    async generateWithOllama(params, modelId, cancellationToken) {
        // Prepare the prompt
        let prompt = '';
        // Nous Hermes uses a specific format for chat
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
        // Create cancellation token source to abort the request if needed
        let abortController;
        if (cancellationToken) {
            if (typeof AbortController !== 'undefined') {
                abortController = new AbortController();
                cancellationToken.onCancellationRequested(() => {
                    logger_1.logger.info("Nous Hermes request cancelled by user");
                    abortController?.abort();
                });
            }
            else {
                logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
            }
        }
        // Prepare request data for Ollama
        const requestData = {
            model: modelId,
            prompt: prompt,
            stream: false,
            options: {
                temperature: params.temperature ?? 0.7,
                num_predict: params.maxTokens ?? 1024,
                stop: params.stopSequences ?? ["<|im_start|>", "<|im_end|>"]
            }
        };
        logger_1.logger.debug(`Sending request to Nous Hermes model ${modelId} via Ollama`);
        // Make the API request
        const response = await this.client.post('/api/generate', requestData, {
            signal: abortController?.signal
        });
        // Parse Ollama response
        return {
            content: response.data.response || '',
            finishReason: 'stop',
            usage: {
                promptTokens: response.data.prompt_eval_count,
                completionTokens: response.data.eval_count,
            }
        };
    }
    /**
     * Generate with custom endpoint (OpenAI-compatible API)
     */
    async generateWithCustomEndpoint(params, modelId, cancellationToken) {
        // Prepare messages for OpenAI-compatible API
        const messages = [];
        if (params.systemPrompt) {
            messages.push({
                role: 'system',
                content: params.systemPrompt
            });
        }
        if (params.history && params.history.length > 0) {
            messages.push(...params.history);
        }
        else {
            messages.push({
                role: 'user',
                content: params.prompt
            });
        }
        // Create cancellation token source to abort the request if needed
        let abortController;
        if (cancellationToken) {
            if (typeof AbortController !== 'undefined') {
                abortController = new AbortController();
                cancellationToken.onCancellationRequested(() => {
                    logger_1.logger.info("Nous Hermes request cancelled by user");
                    abortController?.abort();
                });
            }
            else {
                logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
            }
        }
        // Prepare request data for OpenAI-compatible API
        const requestData = {
            model: modelId,
            messages: messages,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 1024,
            stop: params.stopSequences
        };
        logger_1.logger.debug(`Sending request to Nous Hermes model ${modelId} via custom endpoint`);
        // Make the API request
        const response = await this.client.post('/chat/completions', requestData, {
            signal: abortController?.signal
        });
        // Parse OpenAI-compatible response
        return {
            content: response.data.choices[0].message.content || '',
            finishReason: response.data.choices[0].finish_reason || 'stop',
            usage: response.data.usage
        };
    }
    /**
     * List available Nous Hermes models
     */
    async listModels() {
        if (this.endpointType === 'ollama') {
            try {
                // For Ollama, we can fetch the available models
                const response = await this.client.get('/api/tags');
                // Filter for Nous Hermes models
                const models = response.data.models
                    .filter((m) => m.name.toLowerCase().includes('nous') ||
                    m.name.toLowerCase().includes('hermes'))
                    .map((m) => ({
                    id: m.name,
                    name: m.name,
                    description: `Size: ${this.formatSize(m.size || 0)}`,
                    contextWindow: this.getContextWindowForModel(m.name),
                    pricingInfo: 'Free (local)'
                }));
                return models;
            }
            catch (error) {
                logger_1.logger.error('Failed to fetch Nous Hermes models from Ollama:', error);
            }
        }
        // Return predefined models for other endpoint types
        return [
            {
                id: 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
                name: 'Nous Hermes 2 Mixtral 8x7B',
                description: 'Latest Nous Hermes model based on Mixtral 8x7B',
                contextWindow: 32768,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'NousResearch/Nous-Hermes-2-Yi-34B',
                name: 'Nous Hermes 2 Yi 34B',
                description: 'Nous Hermes model based on Yi 34B',
                contextWindow: 4096,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'NousResearch/Nous-Hermes-Llama2-13b',
                name: 'Nous Hermes Llama2 13B',
                description: 'Nous Hermes model based on Llama2 13B',
                contextWindow: 4096,
                pricingInfo: 'Free with Hugging Face API'
            },
            {
                id: 'NousResearch/Nous-Hermes-llama-2-7b',
                name: 'Nous Hermes Llama2 7B',
                description: 'Nous Hermes model based on Llama2 7B',
                contextWindow: 4096,
                pricingInfo: 'Free with Hugging Face API'
            }
        ];
    }
    /**
     * Format file size in bytes to a human-readable string
     */
    formatSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} B`;
        }
        else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        }
        else if (bytes < 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
        else {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        }
    }
    /**
     * Get the context window size for a specific model
     */
    getContextWindowForModel(modelId) {
        if (modelId.includes('mixtral')) {
            return 32768;
        }
        else if (modelId.includes('yi')) {
            return 4096;
        }
        else if (modelId.includes('llama')) {
            return 4096;
        }
        // Default context window
        return 4096;
    }
    /**
     * Test connection to Nous Hermes
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'Nous Hermes client not initialized. Please check your configuration.'
            };
        }
        try {
            if (this.endpointType === 'huggingface') {
                // Simple test request to check if the API is working
                const response = await this.client.post(modelId, {
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
            }
            else if (this.endpointType === 'ollama') {
                // For Ollama, check if the model exists
                const response = await this.client.get('/api/tags');
                const modelExists = response.data.models.some((m) => m.name === modelId);
                if (!modelExists) {
                    return {
                        success: false,
                        message: `Model '${modelId}' not found. You may need to pull it first with 'ollama pull ${modelId}'.`
                    };
                }
                return {
                    success: true,
                    message: `Successfully connected to Ollama and verified model '${modelId}'.`
                };
            }
            else {
                // For custom endpoints, assume OpenAI-compatible API
                const response = await this.client.post('/chat/completions', {
                    model: modelId,
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 10
                });
                if (response.data && response.data.choices) {
                    return {
                        success: true,
                        message: `Successfully connected to API and tested model '${modelId}'.`
                    };
                }
            }
            return {
                success: false,
                message: `Connected to API but received an unexpected response.`
            };
        }
        catch (error) {
            logger_1.logger.error('Nous Hermes connection test failed:', error);
            let errorMessage = 'Failed to connect to Nous Hermes API';
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
                id: 'endpointType',
                name: 'Endpoint Type',
                description: 'The type of endpoint to use',
                required: true,
                type: 'select',
                options: ['huggingface', 'ollama', 'custom']
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The API endpoint URL',
                required: true,
                type: 'string'
            },
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'API key (required for Hugging Face)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default Nous Hermes model to use',
                required: false,
                type: 'select',
                options: [
                    'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO',
                    'NousResearch/Nous-Hermes-2-Yi-34B',
                    'NousResearch/Nous-Hermes-Llama2-13b',
                    'NousResearch/Nous-Hermes-llama-2-7b'
                ]
            }
        ];
    }
}
exports.NousHermesProvider = NousHermesProvider;
//# sourceMappingURL=nousHermesProvider.js.map