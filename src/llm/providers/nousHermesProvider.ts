import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { logger } from '../../logger';
import { ITool } from '../../tools/tool';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for Nous Hermes models
 * 
 * Nous Hermes is a family of models with strong reasoning capabilities
 * While not code-only models, they perform well on coding tasks
 */
export class NousHermesProvider extends BaseLLMProvider {
    readonly providerId = 'noushermes';
    readonly displayName = 'Nous Hermes';
    readonly description = 'Models with strong reasoning capabilities, good for coding';
    readonly website = 'https://huggingface.co/NousResearch';
    readonly requiresApiKey = true; // Required for Hugging Face API
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'https://api-inference.huggingface.co/models';
    readonly defaultModel = 'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO';

    private client: any = null;
    private endpointType: 'huggingface' | 'ollama' | 'custom' = 'huggingface';

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger.info("Nous Hermes configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }

    private initializeClient() {
        const apiKey = this.config.apiKey;
        const baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        
        // Determine endpoint type
        if (baseUrl.includes('huggingface.co')) {
            this.endpointType = 'huggingface';
        } else if (baseUrl.includes('localhost:11434') || baseUrl.includes('ollama')) {
            this.endpointType = 'ollama';
        } else {
            this.endpointType = 'custom';
        }

        if (this.endpointType === 'huggingface' && !apiKey) {
            logger.warn('Hugging Face API key not set for Nous Hermes provider.');
            this.client = null;
            return;
        }

        try {
            // Initialize axios client with proper configuration
            const headers: Record<string, string> = {
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
            
            logger.info(`Nous Hermes client initialized successfully with endpoint type: ${this.endpointType}`);
        } catch (error) {
            logger.error('Failed to initialize Nous Hermes client:', error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
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
    async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'Nous Hermes provider not configured' };
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            
            // Handle different endpoint types
            if (this.endpointType === 'huggingface') {
                return await this.generateWithHuggingFace(params, modelId, cancellationToken);
            } else if (this.endpointType === 'ollama') {
                return await this.generateWithOllama(params, modelId, cancellationToken);
            } else {
                return await this.generateWithCustomEndpoint(params, modelId, cancellationToken);
            }
        } catch (error: any) {
            logger.error('Nous Hermes generate error:', error);
            let errorMessage = 'Failed to call Nous Hermes API.';

            if (error.response) {
                errorMessage = `Nous Hermes API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
            } else if (error.name === 'AbortError') {
                errorMessage = 'Request cancelled by user';
            } else if (error instanceof Error) {
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
    private async generateWithHuggingFace(
        params: LLMGenerateParams,
        modelId: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<LLMGenerateResult> {
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
                } else if (message.role === 'assistant') {
                    prompt += `<|im_start|>assistant\n${message.content}<|im_end|>\n\n`;
                } else if (message.role === 'system') {
                    prompt += `<|im_start|>system\n${message.content}<|im_end|>\n\n`;
                }
            }
        } else {
            // Just add the user prompt
            prompt += `<|im_start|>user\n${params.prompt}<|im_end|>\n\n`;
        }
        
        // Add the assistant prefix to indicate we want the model to generate a response
        prompt += `<|im_start|>assistant\n`;

        // Create cancellation token source to abort the request if needed
        let abortController: AbortController | undefined;

        if (cancellationToken) {
            if (typeof AbortController !== 'undefined') {
                abortController = new AbortController();
                cancellationToken.onCancellationRequested(() => {
                    logger.info("Nous Hermes request cancelled by user");
                    abortController?.abort();
                });
            } else {
                logger.warn("AbortController not available in this environment, cancellation may not work properly");
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

        logger.debug(`Sending request to Nous Hermes model ${modelId} via Hugging Face`);

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
    private async generateWithOllama(
        params: LLMGenerateParams,
        modelId: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<LLMGenerateResult> {
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
                } else if (message.role === 'assistant') {
                    prompt += `<|im_start|>assistant\n${message.content}<|im_end|>\n\n`;
                } else if (message.role === 'system') {
                    prompt += `<|im_start|>system\n${message.content}<|im_end|>\n\n`;
                }
            }
        } else {
            // Just add the user prompt
            prompt += `<|im_start|>user\n${params.prompt}<|im_end|>\n\n`;
        }
        
        // Add the assistant prefix to indicate we want the model to generate a response
        prompt += `<|im_start|>assistant\n`;

        // Create cancellation token source to abort the request if needed
        let abortController: AbortController | undefined;

        if (cancellationToken) {
            if (typeof AbortController !== 'undefined') {
                abortController = new AbortController();
                cancellationToken.onCancellationRequested(() => {
                    logger.info("Nous Hermes request cancelled by user");
                    abortController?.abort();
                });
            } else {
                logger.warn("AbortController not available in this environment, cancellation may not work properly");
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
        
        logger.debug(`Sending request to Nous Hermes model ${modelId} via Ollama`);
        
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
    private async generateWithCustomEndpoint(
        params: LLMGenerateParams,
        modelId: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<LLMGenerateResult> {
        // Prepare messages for OpenAI-compatible API
        const messages: { role: string; content: string; name?: string; tool_call_id?: string }[] = [];
        
        if (params.systemPrompt) {
            messages.push({
                role: 'system',
                content: params.systemPrompt
            });
        }
        
        if (params.history && params.history.length > 0) {
            messages.push(...params.history);
        } else {
            messages.push({
                role: 'user',
                content: params.prompt
            });
        }
        
        // Create cancellation token source to abort the request if needed
        let abortController: AbortController | undefined;

        if (cancellationToken) {
            if (typeof AbortController !== 'undefined') {
                abortController = new AbortController();
                cancellationToken.onCancellationRequested(() => {
                    logger.info("Nous Hermes request cancelled by user");
                    abortController?.abort();
                });
            } else {
                logger.warn("AbortController not available in this environment, cancellation may not work properly");
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
        
        logger.debug(`Sending request to Nous Hermes model ${modelId} via custom endpoint`);
        
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
    async listModels(): Promise<LLMModelInfo[]> {
        if (this.endpointType === 'ollama') {
            try {
                // For Ollama, we can fetch the available models
                const response = await this.client.get('/api/tags');
                
                // Filter for Nous Hermes models
                const models = response.data.models
                    .filter((m: any) => 
                        m.name.toLowerCase().includes('nous') || 
                        m.name.toLowerCase().includes('hermes')
                    )
                    .map((m: any) => ({
                        id: m.name,
                        name: m.name,
                        description: `Size: ${this.formatSize(m.size || 0)}`,
                        contextWindow: this.getContextWindowForModel(m.name),
                        pricingInfo: 'Free (local)'
                    }));
                
                return models;
            } catch (error) {
                logger.error('Failed to fetch Nous Hermes models from Ollama:', error);
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
    private formatSize(bytes: number): string {
        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else if (bytes < 1024 * 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        } else {
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        }
    }
    
    /**
     * Get the context window size for a specific model
     */
    private getContextWindowForModel(modelId: string): number {
        if (modelId.includes('mixtral')) {
            return 32768;
        } else if (modelId.includes('yi')) {
            return 4096;
        } else if (modelId.includes('llama')) {
            return 4096;
        }
        
        // Default context window
        return 4096;
    }

    /**
     * Test connection to Nous Hermes
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
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
            } else if (this.endpointType === 'ollama') {
                // For Ollama, check if the model exists
                const response = await this.client.get('/api/tags');
                const modelExists = response.data.models.some((m: any) => m.name === modelId);
                
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
            } else {
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
        } catch (error: any) {
            logger.error('Nous Hermes connection test failed:', error);
            let errorMessage = 'Failed to connect to Nous Hermes API';

            if (error.response) {
                errorMessage = `API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
            } else if (error instanceof Error) {
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
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> {
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
