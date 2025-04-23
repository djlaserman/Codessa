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
exports.CodeLlamaProvider = void 0;
const vscode = __importStar(require("vscode"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for Code Llama models
 *
 * Code Llama is a family of code-specialized LLMs from Meta AI
 * This provider supports using Code Llama via:
 * 1. Ollama (local)
 * 2. Hugging Face Inference API
 * 3. Custom API endpoints (self-hosted)
 */
class CodeLlamaProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'codellama';
        this.displayName = 'Code Llama';
        this.description = 'Code-specialized LLMs from Meta AI';
        this.website = 'https://ai.meta.com/blog/code-llama-large-language-model-coding/';
        this.requiresApiKey = false; // Not required for local Ollama, but can be used for HF
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'http://localhost:11434/api'; // Default to Ollama
        this.defaultModel = 'codellama:7b';
        this.client = null;
        this.endpointType = 'ollama';
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("Code Llama configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }
    initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        // Determine endpoint type
        if (baseUrl.includes('localhost:11434') || baseUrl.includes('ollama')) {
            this.endpointType = 'ollama';
        }
        else if (baseUrl.includes('huggingface.co')) {
            this.endpointType = 'huggingface';
        }
        else {
            this.endpointType = 'custom';
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
            logger_1.logger.info(`Code Llama client initialized successfully with endpoint type: ${this.endpointType}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Code Llama client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        // For Ollama and custom endpoints, we just need the client to be initialized
        // For Hugging Face, we also need an API key
        if (this.endpointType === 'huggingface') {
            return !!this.client && !!this.config.apiKey;
        }
        return !!this.client;
    }
    /**
     * Generate text using Code Llama models
     */
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'Code Llama provider not configured' };
        }
        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            // Prepare the prompt
            let prompt = '';
            // Add system prompt if provided
            if (params.systemPrompt) {
                prompt += `<s>[INST] <<SYS>>\n${params.systemPrompt}\n<</SYS>>\n\n`;
            }
            else {
                prompt += `<s>[INST] `;
            }
            // Add history if provided
            if (params.history && params.history.length > 0) {
                // Code Llama uses a specific format for chat
                let lastUserMessage = '';
                for (let i = 0; i < params.history.length; i++) {
                    const message = params.history[i];
                    if (message.role === 'user') {
                        if (i > 0) {
                            prompt += `[/INST]\n\n${lastUserMessage}\n\n[INST] `;
                        }
                        lastUserMessage = message.content;
                    }
                    else if (message.role === 'assistant') {
                        prompt += `${message.content}\n\n`;
                    }
                }
                // Add the final user message
                prompt += `${lastUserMessage} [/INST]\n\n`;
            }
            else {
                // Just add the user prompt
                prompt += `${params.prompt} [/INST]\n\n`;
            }
            // Check for cancellation before making the request
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }
            // Create cancellation token source to abort the request if needed
            let abortController;
            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger_1.logger.info("Code Llama request cancelled by user");
                        abortController?.abort();
                    });
                }
                else {
                    logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }
            // Make the API request based on endpoint type
            let response;
            if (this.endpointType === 'ollama') {
                // Ollama API format
                const requestData = {
                    model: modelId,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: params.temperature ?? 0.7,
                        num_predict: params.maxTokens ?? 2048,
                        stop: params.stopSequences ?? ["[INST]"]
                    }
                };
                response = await this.client.post('/generate', requestData, {
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
            else if (this.endpointType === 'huggingface') {
                // Hugging Face Inference API format
                const requestData = {
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: params.maxTokens || 1024,
                        temperature: params.temperature || 0.7,
                        top_p: 0.95,
                        do_sample: true,
                        return_full_text: false,
                        stop: params.stopSequences || ["[INST]"]
                    }
                };
                // For HF, we need to specify the model in the URL
                response = await this.client.post('', requestData, {
                    signal: abortController?.signal
                });
                // Parse HF response
                let content = '';
                if (Array.isArray(response.data) && response.data.length > 0) {
                    if (response.data[0].generated_text) {
                        content = response.data[0].generated_text;
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
            else {
                // Custom API - assume OpenAI-compatible format
                const messages = [];
                // Add system prompt if provided
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
                const requestData = {
                    model: modelId,
                    messages: messages,
                    temperature: params.temperature ?? 0.7,
                    max_tokens: params.maxTokens,
                    stop: params.stopSequences
                };
                response = await this.client.post('/chat/completions', requestData, {
                    signal: abortController?.signal
                });
                // Parse OpenAI-compatible response
                return {
                    content: response.data.choices[0].message.content || '',
                    finishReason: response.data.choices[0].finish_reason || 'stop',
                    usage: response.data.usage
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Code Llama generate error:', error);
            let errorMessage = 'Failed to call Code Llama API.';
            if (error.response) {
                errorMessage = `Code Llama API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available Code Llama models
     */
    async listModels() {
        try {
            if (this.endpointType === 'ollama') {
                // For Ollama, we can fetch the available models
                const response = await this.client.get('/api/tags');
                // Filter for Code Llama models
                const models = response.data.models
                    .filter((m) => m.name.toLowerCase().includes('codellama') ||
                    m.name.toLowerCase().includes('code-llama') ||
                    m.name.toLowerCase().includes('llama-code'))
                    .map((m) => ({
                    id: m.name,
                    name: m.name,
                    description: `Size: ${this.formatSize(m.size || 0)}`,
                    contextWindow: this.getContextWindowForModel(m.name),
                    pricingInfo: 'Free (local)'
                }));
                return models;
            }
            else {
                // For other endpoints, return predefined models
                return this.getPredefinedModels();
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch Code Llama models:', error);
            // Return predefined models as fallback
            return this.getPredefinedModels();
        }
    }
    /**
     * Get predefined Code Llama models
     */
    getPredefinedModels() {
        return [
            {
                id: 'codellama:7b',
                name: 'Code Llama 7B',
                description: 'Base Code Llama model (7B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'codellama:13b',
                name: 'Code Llama 13B',
                description: 'Medium Code Llama model (13B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'codellama:34b',
                name: 'Code Llama 34B',
                description: 'Large Code Llama model (34B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'codellama:7b-instruct',
                name: 'Code Llama 7B Instruct',
                description: 'Instruction-tuned Code Llama (7B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'codellama:13b-instruct',
                name: 'Code Llama 13B Instruct',
                description: 'Instruction-tuned Code Llama (13B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'codellama:34b-instruct',
                name: 'Code Llama 34B Instruct',
                description: 'Instruction-tuned Code Llama (34B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'codellama:7b-python',
                name: 'Code Llama 7B Python',
                description: 'Python-specialized Code Llama (7B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'codellama:13b-python',
                name: 'Code Llama 13B Python',
                description: 'Python-specialized Code Llama (13B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'codellama:34b-python',
                name: 'Code Llama 34B Python',
                description: 'Python-specialized Code Llama (34B parameters)',
                contextWindow: 16384,
                pricingInfo: 'Free (open weights)'
            }
        ];
    }
    /**
     * Get the context window size for a specific model
     */
    getContextWindowForModel(modelId) {
        // Code Llama models generally have a 16K context window
        return 16384;
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
     * Test connection to Code Llama
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'Code Llama client not initialized.'
            };
        }
        try {
            if (this.endpointType === 'ollama') {
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
            else if (this.endpointType === 'huggingface') {
                // For Hugging Face, make a simple test request
                const response = await this.client.post('', {
                    inputs: "def hello_world():",
                    parameters: {
                        max_new_tokens: 10,
                        return_full_text: false
                    }
                });
                if (response.data) {
                    return {
                        success: true,
                        message: `Successfully connected to Hugging Face API and tested model.`
                    };
                }
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
            logger_1.logger.error('Code Llama connection test failed:', error);
            let errorMessage = 'Failed to connect to Code Llama API';
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
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The API endpoint (default: http://localhost:11434/api for Ollama)',
                required: true,
                type: 'string'
            },
            {
                id: 'endpointType',
                name: 'Endpoint Type',
                description: 'The type of endpoint to use',
                required: true,
                type: 'select',
                options: ['ollama', 'huggingface', 'custom']
            },
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'API key (required for Hugging Face, optional for custom endpoints)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default Code Llama model to use',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.CodeLlamaProvider = CodeLlamaProvider;
//# sourceMappingURL=codeLlamaProvider.js.map