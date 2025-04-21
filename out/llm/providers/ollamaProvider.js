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
exports.OllamaProvider = void 0;
const vscode = __importStar(require("vscode"));
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
class OllamaProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor() {
        // Temporarily remove context parameter until all providers are updated
        super(undefined);
        this.providerId = 'ollama';
        this.displayName = 'Ollama';
        this.description = 'Run large language models locally';
        this.website = 'https://ollama.ai';
        this.requiresApiKey = false;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'http://localhost:11434';
        this.defaultModel = 'llama3';
        this.client = null;
        this.baseUrl = '';
        this.baseUrl = this.defaultEndpoint;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers.ollama')) {
                logger_1.logger.info("Ollama configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }
    initializeClient() {
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        if (this.baseUrl) {
            try {
                // Just store the base URL and use it directly in API calls
                this.client = {}; // Dummy instance, we'll use axios directly
                logger_1.logger.info(`Ollama client initialized for base URL: ${this.baseUrl}`);
                // Optionally check if Ollama is reachable
                this.checkConnection();
            }
            catch (error) {
                logger_1.logger.error("Failed to initialize Ollama client:", error);
                this.client = null;
            }
        }
        else {
            logger_1.logger.warn("Ollama base URL not configured.");
            this.client = null;
        }
    }
    async checkConnection() {
        if (!this.baseUrl)
            return false;
        try {
            await axios.get(`${this.baseUrl}/api/version`); // Check if the Ollama API is responding
            logger_1.logger.info(`Ollama connection successful at ${this.baseUrl}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to connect to Ollama at ${this.baseUrl}:`, error);
            return false;
        }
    }
    isConfigured() {
        return !!this.baseUrl;
    }
    /**
     * Test connection to Ollama
     */
    async testConnection(modelId) {
        if (!this.baseUrl) {
            return {
                success: false,
                message: 'Ollama client not initialized'
            };
        }
        try {
            // First check if we can connect to the Ollama server
            await axios.get(`${this.baseUrl}/api/version`);
            // Then check if the specified model is available
            const models = await this.listModels();
            const modelExists = models.some(m => m.id === modelId);
            if (!modelExists) {
                return {
                    success: false,
                    message: `Model '${modelId}' not found. You may need to pull it first with 'ollama pull ${modelId}'.`
                };
            }
            return {
                success: true,
                message: `Successfully connected to Ollama server at ${this.baseUrl} and verified model '${modelId}'.`
            };
        }
        catch (error) {
            logger_1.logger.error('Ollama connection test failed:', error);
            return {
                success: false,
                message: `Failed to connect to Ollama server at ${this.baseUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Add tool instructions to the prompt for Ollama
     * Since Ollama doesn't have a native function calling mechanism,
     * we'll instruct it to output tool calls in a specific JSON format.
     */
    addToolInstructionsToPrompt(prompt, _systemPrompt, tools) {
        if (!tools || tools.size === 0) {
            return prompt;
        }
        // Format tool descriptions
        let toolDescriptions = 'Available tools:\n';
        tools.forEach(tool => {
            // Handle file tool with subactions
            if (tool.id === 'file' && typeof tool.getSubActions === 'function') {
                const subActions = tool.getSubActions();
                for (const subAction of subActions) {
                    toolDescriptions += `- ${tool.id}.${subAction.id}: ${subAction.description}\n`;
                    if (subAction.inputSchema) {
                        toolDescriptions += `  Arguments: ${JSON.stringify(subAction.inputSchema)}\n`;
                    }
                }
            }
            else {
                // Regular tool
                toolDescriptions += `- ${tool.id}: ${tool.description}\n`;
                if (tool.inputSchema) {
                    toolDescriptions += `  Arguments: ${JSON.stringify(tool.inputSchema)}\n`;
                }
            }
        });
        // Tool usage instructions
        const toolInstructions = `
${toolDescriptions}

To use a tool, output a JSON object EXACTLY in this format (no other text before or after):
{
  "tool_call": {
    "name": "tool_id.action_name", // e.g., "file.readFile", "docs.search"
    "arguments": { // Arguments specific to the tool action
      "arg1": "value1",
      "arg2": "value2"
      // ...
    }
  }
}

After the tool executes, I will provide you with the result, and you can continue your task or call another tool.

When you have the final answer and don't need to use any more tools, output a JSON object EXACTLY in this format:
{
  "final_answer": "Your complete final response here."
}

Think step-by-step. Analyze the request, decide if a tool is needed, call the tool if necessary, analyze the result, and repeat until you can provide the final answer.`;
        // For Ollama, typically append to the prompt rather than to the system prompt
        return `${prompt}\n\n${toolInstructions}`;
    }
    async generate(params, cancellationToken, tools) {
        if (!this.baseUrl) {
            return { content: '', error: 'Ollama provider not configured (Base URL missing?).' };
        }
        // Determine whether to use chat or completion API
        const endpoint = '/api/chat'; // Use chat API for better formatting
        // Prepare chat messages
        let messages = [];
        if (params.history && params.history.length > 0) {
            // Convert history to Ollama format
            messages = params.history.map(msg => {
                // Ollama doesn't support 'tool' role, so convert to assistant
                const role = msg.role === 'tool' ? 'assistant' : msg.role;
                return { role, content: msg.content };
            });
        }
        else {
            if (params.systemPrompt) {
                messages.push({ role: 'system', content: params.systemPrompt });
            }
            // Modify prompt with tool instructions if tools are provided
            let userPrompt = params.prompt;
            if (tools && tools.size > 0) {
                userPrompt = this.addToolInstructionsToPrompt(params.prompt, params.systemPrompt, tools);
            }
            messages.push({ role: 'user', content: userPrompt });
        }
        // Check for cancellation before making the request
        if (cancellationToken?.isCancellationRequested) {
            return { content: '', error: 'Request cancelled before sending' };
        }
        // Prepare request data
        const requestData = {
            model: params.modelId,
            messages,
            stream: false,
            options: {
                temperature: params.temperature ?? 0.7,
                num_predict: params.maxTokens, // Ollama's equivalent to max_tokens
                stop: params.stopSequences,
                ...(params.options ?? {})
            }
        };
        let cancelSource;
        if (cancellationToken) {
            cancelSource = axios.CancelToken.source();
            cancellationToken.onCancellationRequested(() => {
                logger_1.logger.warn("Ollama request cancelled by user.");
                cancelSource?.cancel("Request cancelled by user.");
            });
        }
        try {
            logger_1.logger.debug(`Sending request to Ollama model ${params.modelId} at ${this.baseUrl}${endpoint}`);
            const response = await axios.post(`${this.baseUrl}${endpoint}`, requestData, {
                cancelToken: cancelSource?.token,
            });
            logger_1.logger.debug(`Ollama response received: ${JSON.stringify(response.data).substring(0, 100)}...`);
            // Parse the content to see if it contains a tool call
            const message = response.data?.message;
            const content = message?.content ?? '';
            let toolCallRequest;
            // Try to parse JSON from the content
            try {
                // Check if content is JSON formatted
                if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                    const jsonContent = JSON.parse(content);
                    // Check if it's a tool call
                    if (jsonContent.tool_call) {
                        toolCallRequest = {
                            name: jsonContent.tool_call.name,
                            arguments: jsonContent.tool_call.arguments
                        };
                    }
                }
            }
            catch (error) {
                // Not JSON or invalid, just use as regular content
                logger_1.logger.debug("Ollama response is not a valid JSON, treating as plain text");
            }
            return {
                content,
                finishReason: 'stop', // Ollama doesn't provide a finish reason
                usage: {
                    // Ollama might provide token counts
                    promptTokens: response.data?.prompt_eval_count,
                    completionTokens: response.data?.eval_count,
                },
                toolCallRequest
            };
        }
        catch (error) {
            if (axios.isCancel && axios.isCancel(error)) {
                return { content: '', error: 'Request cancelled', finishReason: 'cancel' };
            }
            logger_1.logger.error('Error calling Ollama API:', error);
            let errorMessage = 'Failed to call Ollama API.';
            if (error.response) {
                errorMessage = `Ollama API Error: ${error.response.data?.error || error.message} (Status: ${error.response.status})`;
            }
            else if (error.request) {
                errorMessage = `Ollama connection error: Could not reach ${this.baseUrl}. Is Ollama running?`;
            }
            else if (error instanceof Error) {
                errorMessage = error.message;
            }
            return { content: '', error: errorMessage, finishReason: 'error' };
        }
    }
    /**
     * Backward compatibility method for getAvailableModels
     * @deprecated Use listModels instead
     */
    async getAvailableModels() {
        const models = await this.listModels();
        return models.map(model => model.id);
    }
    /**
     * List available models from Ollama
     */
    async listModels() {
        if (!this.baseUrl) {
            logger_1.logger.warn("Cannot fetch Ollama models, client not configured.");
            return [];
        }
        const endpoint = '/api/tags';
        try {
            logger_1.logger.debug(`Fetching Ollama models list from ${this.baseUrl}${endpoint}`);
            const response = await axios.get(`${this.baseUrl}${endpoint}`);
            // Ollama response format: { models: [{ name: "model:tag", ... }, ...] }
            const models = response.data?.models || [];
            logger_1.logger.info(`Provider ollama has ${models.length} models available`);
            return models.map((m) => ({
                id: m.name,
                name: m.name,
                description: `Size: ${this.formatSize(m.size || 0)}`,
                contextWindow: m.details?.context_length || 4096
            })).sort((a, b) => a.id.localeCompare(b.id));
        }
        catch (error) {
            logger_1.logger.error("Failed to fetch Ollama models:", error);
            return [];
        }
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
                description: 'The URL of your Ollama server (default: http://localhost:11434)',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., llama3, mistral, etc.)',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=ollamaProvider.js.map