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
exports.GGUFProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const baseLLMProvider_1 = require("./baseLLMProvider");
const logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
/**
 * Provider for GGUF models using llama.cpp
 *
 * This provider allows users to:
 * 1. Use local GGUF models
 * 2. Download GGUF models from links
 * 3. Import GGUF models from other locations
 */
class GGUFProvider extends baseLLMProvider_1.BaseLLMProvider {
    constructor(context) {
        super(context);
        this.providerId = 'gguf';
        this.displayName = 'GGUF Models';
        this.description = 'Use local GGUF models with llama.cpp';
        this.website = 'https://github.com/ggerganov/llama.cpp';
        this.requiresApiKey = false;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'http://localhost:8080';
        this.defaultModel = '';
        this.client = null;
        this.llamaCppPath = '';
        this.models = new Map();
        // Set up models directory
        this.modelsDirectory = path.join(os.homedir(), '.codessa', 'models');
        // Ensure models directory exists
        if (!fs.existsSync(this.modelsDirectory)) {
            try {
                fs.mkdirSync(this.modelsDirectory, { recursive: true });
                logger_1.logger.info(`Created models directory at ${this.modelsDirectory}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to create models directory: ${error}`);
            }
        }
        this.initializeClient();
        this.scanForModels();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger_1.logger.info("GGUF configuration changed, re-initializing client.");
                this.loadConfig().then(() => {
                    this.initializeClient();
                    this.scanForModels();
                });
            }
        });
    }
    initializeClient() {
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        this.llamaCppPath = this.config.llamaCppPath || '';
        try {
            // Initialize axios client with proper configuration
            this.client = axios.create({
                baseURL: baseUrl,
                timeout: 300000, // 5 minutes timeout for large model responses
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            logger_1.logger.info('GGUF client initialized successfully.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize GGUF client:', error);
            this.client = null;
        }
    }
    isConfigured() {
        // Check if we have at least one model
        return this.models.size > 0;
    }
    /**
     * Scan for GGUF models in the models directory
     */
    async scanForModels() {
        this.models.clear();
        try {
            // Scan the models directory for .gguf files
            const modelPaths = this.getModelPaths();
            for (const modelPath of modelPaths) {
                try {
                    const stats = fs.statSync(modelPath);
                    const fileName = path.basename(modelPath);
                    const modelId = fileName.replace(/\.gguf$/, '');
                    this.models.set(modelId, {
                        id: modelId,
                        name: modelId,
                        path: modelPath,
                        size: stats.size,
                        lastModified: stats.mtime
                    });
                    logger_1.logger.info(`Found GGUF model: ${modelId} (${this.formatSize(stats.size)})`);
                }
                catch (error) {
                    logger_1.logger.error(`Error processing model file ${modelPath}: ${error}`);
                }
            }
            logger_1.logger.info(`Found ${this.models.size} GGUF models`);
        }
        catch (error) {
            logger_1.logger.error(`Error scanning for GGUF models: ${error}`);
        }
    }
    /**
     * Get all GGUF model paths from configured locations
     */
    getModelPaths() {
        const modelPaths = [];
        // Add models from the default models directory
        try {
            if (fs.existsSync(this.modelsDirectory)) {
                const files = fs.readdirSync(this.modelsDirectory);
                for (const file of files) {
                    if (file.endsWith('.gguf')) {
                        modelPaths.push(path.join(this.modelsDirectory, file));
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`Error reading models directory: ${error}`);
        }
        // Add models from additional directories specified in config
        const additionalDirs = this.config.additionalModelDirectories || [];
        for (const dir of additionalDirs) {
            try {
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        if (file.endsWith('.gguf')) {
                            modelPaths.push(path.join(dir, file));
                        }
                    }
                }
            }
            catch (error) {
                logger_1.logger.error(`Error reading additional model directory ${dir}: ${error}`);
            }
        }
        return modelPaths;
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
     * Generate text using a GGUF model
     */
    async generate(params, cancellationToken, tools) {
        if (!this.client) {
            return { content: '', error: 'GGUF provider not configured' };
        }
        try {
            const modelId = params.modelId || this.config.defaultModel || '';
            if (!modelId) {
                return { content: '', error: 'No model specified' };
            }
            const modelInfo = this.models.get(modelId);
            if (!modelInfo) {
                return { content: '', error: `Model '${modelId}' not found` };
            }
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
                // Format for chat
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
                        logger_1.logger.info("GGUF request cancelled by user");
                        abortController?.abort();
                    });
                }
                else {
                    logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }
            // Make the API request
            const requestData = {
                model: modelInfo.path,
                prompt: prompt,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens ?? 2048,
                stop: params.stopSequences ?? ["[INST]"]
            };
            const response = await this.client.post('/completion', requestData, {
                signal: abortController?.signal
            });
            // Parse response
            return {
                content: response.data.content || '',
                finishReason: 'stop',
                usage: {
                    promptTokens: response.data.prompt_tokens || prompt.length / 4,
                    completionTokens: response.data.completion_tokens || response.data.content.length / 4,
                }
            };
        }
        catch (error) {
            logger_1.logger.error('GGUF generate error:', error);
            let errorMessage = 'Failed to call GGUF API.';
            if (error.response) {
                errorMessage = `GGUF API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
     * List available GGUF models
     */
    async listModels() {
        // Refresh the model list
        await this.scanForModels();
        return Array.from(this.models.values()).map(model => ({
            id: model.id,
            name: model.name,
            description: `Size: ${this.formatSize(model.size)}`,
            contextWindow: this.getContextWindowForModel(model.id),
            pricingInfo: 'Free (local)'
        }));
    }
    /**
     * Get the context window size for a specific model
     */
    getContextWindowForModel(modelId) {
        // Estimate context window based on model name
        if (modelId.includes('70b')) {
            return 4096;
        }
        else if (modelId.includes('13b') || modelId.includes('7b')) {
            return 8192;
        }
        else if (modelId.includes('mistral') || modelId.includes('mixtral')) {
            return 8192;
        }
        else if (modelId.includes('llama-2')) {
            return 4096;
        }
        else if (modelId.includes('llama-3')) {
            return 8192;
        }
        else if (modelId.includes('codellama')) {
            return 16384;
        }
        else if (modelId.includes('phi-2')) {
            return 2048;
        }
        else if (modelId.includes('phi-3')) {
            return 4096;
        }
        // Default context window
        return 4096;
    }
    /**
     * Add a model from a local file
     */
    async addModelFromFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                logger_1.logger.error(`File not found: ${filePath}`);
                return false;
            }
            if (!filePath.endsWith('.gguf')) {
                logger_1.logger.error(`File is not a GGUF model: ${filePath}`);
                return false;
            }
            const fileName = path.basename(filePath);
            const destPath = path.join(this.modelsDirectory, fileName);
            // Copy the file to the models directory
            fs.copyFileSync(filePath, destPath);
            logger_1.logger.info(`Added model from ${filePath} to ${destPath}`);
            // Refresh the model list
            await this.scanForModels();
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Error adding model from file: ${error}`);
            return false;
        }
    }
    /**
     * Download a model from a URL
     */
    async downloadModel(url, fileName) {
        try {
            // Show progress notification
            const downloadTask = vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Downloading model ${fileName}`,
                cancellable: true
            }, async (progress, token) => {
                try {
                    const destPath = path.join(this.modelsDirectory, fileName);
                    // Create a write stream
                    const writer = fs.createWriteStream(destPath);
                    // Download the file
                    const response = await axios({
                        url,
                        method: 'GET',
                        responseType: 'stream',
                        onDownloadProgress: (progressEvent) => {
                            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            progress.report({
                                message: `${percentCompleted}% (${this.formatSize(progressEvent.loaded)} of ${this.formatSize(progressEvent.total)})`,
                                increment: percentCompleted
                            });
                        }
                    });
                    // Pipe the response to the file
                    response.data.pipe(writer);
                    // Handle cancellation
                    token.onCancellationRequested(() => {
                        writer.close();
                        fs.unlinkSync(destPath);
                        return false;
                    });
                    // Wait for the download to complete
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                    logger_1.logger.info(`Downloaded model from ${url} to ${destPath}`);
                    // Refresh the model list
                    await this.scanForModels();
                    return true;
                }
                catch (error) {
                    logger_1.logger.error(`Error downloading model: ${error}`);
                    return false;
                }
            });
            return await downloadTask;
        }
        catch (error) {
            logger_1.logger.error(`Error downloading model: ${error}`);
            return false;
        }
    }
    /**
     * Remove a model
     */
    async removeModel(modelId) {
        try {
            const model = this.models.get(modelId);
            if (!model) {
                logger_1.logger.error(`Model not found: ${modelId}`);
                return false;
            }
            // Check if the model is in our models directory
            if (!model.path.startsWith(this.modelsDirectory)) {
                logger_1.logger.error(`Cannot remove model outside of models directory: ${model.path}`);
                return false;
            }
            // Remove the file
            fs.unlinkSync(model.path);
            logger_1.logger.info(`Removed model ${modelId} from ${model.path}`);
            // Refresh the model list
            await this.scanForModels();
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Error removing model: ${error}`);
            return false;
        }
    }
    /**
     * Test connection to GGUF
     */
    async testConnection(modelId) {
        if (!this.client) {
            return {
                success: false,
                message: 'GGUF client not initialized.'
            };
        }
        try {
            // Check if the model exists
            const model = this.models.get(modelId);
            if (!model) {
                return {
                    success: false,
                    message: `Model '${modelId}' not found.`
                };
            }
            // Make a simple test request
            const response = await this.client.post('/completion', {
                model: model.path,
                prompt: "Hello, world!",
                max_tokens: 10
            });
            if (response.data && response.data.content) {
                return {
                    success: true,
                    message: `Successfully connected to GGUF server and tested model '${modelId}'.`
                };
            }
            return {
                success: false,
                message: `Connected to server but received an unexpected response.`
            };
        }
        catch (error) {
            logger_1.logger.error('GGUF connection test failed:', error);
            let errorMessage = 'Failed to connect to GGUF server';
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
                description: 'The llama.cpp server endpoint (default: http://localhost:8080)',
                required: true,
                type: 'string'
            },
            {
                id: 'llamaCppPath',
                name: 'llama.cpp Path',
                description: 'Path to the llama.cpp executable (optional)',
                required: false,
                type: 'file'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default GGUF model to use',
                required: false,
                type: 'select',
                options: Array.from(this.models.keys())
            },
            {
                id: 'additionalModelDirectories',
                name: 'Additional Model Directories',
                description: 'Additional directories to scan for GGUF models (comma-separated)',
                required: false,
                type: 'directory'
            }
        ];
    }
}
exports.GGUFProvider = GGUFProvider;
//# sourceMappingURL=ggufProvider.js.map