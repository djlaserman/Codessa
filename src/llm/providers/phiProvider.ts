import * as vscode from 'vscode';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo } from '../llmProvider';
import { logger } from '../../logger';
import { ITool } from '../../tools/tool';

// Use require for axios to avoid TypeScript issues
const axios = require('axios');

/**
 * Provider for Microsoft Phi models (Phi-2, Phi-3)
 * 
 * Phi models are small but powerful models from Microsoft Research
 * They can be used via Hugging Face, Ollama, or Azure OpenAI
 */
export class PhiProvider extends BaseLLMProvider {
    readonly providerId = 'phi';
    readonly displayName = 'Microsoft Phi';
    readonly description = 'Small but powerful models from Microsoft Research';
    readonly website = 'https://www.microsoft.com/en-us/research/blog/phi-3-technical-report/';
    readonly requiresApiKey = true; // Required for Hugging Face API
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'https://api-inference.huggingface.co/models';
    readonly defaultModel = 'microsoft/phi-3-mini-4k-instruct';

    private client: any = null;
    private endpointType: 'huggingface' | 'ollama' | 'azure' | 'custom' = 'huggingface';

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger.info("Phi configuration changed, re-initializing client.");
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
        } else if (baseUrl.includes('azure.com')) {
            this.endpointType = 'azure';
        } else {
            this.endpointType = 'custom';
        }

        if (this.endpointType === 'huggingface' && !apiKey) {
            logger.warn('Hugging Face API key not set for Phi provider.');
            this.client = null;
            return;
        }

        try {
            // Initialize axios client with proper configuration
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            
            // Add API key if provided and using Hugging Face
            if (apiKey) {
                if (this.endpointType === 'huggingface') {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                } else if (this.endpointType === 'azure') {
                    headers['api-key'] = apiKey;
                }
            }
            
            this.client = axios.create({
                baseURL: baseUrl,
                timeout: 60000, // 60 seconds timeout
                headers
            });
            
            logger.info(`Phi client initialized successfully with endpoint type: ${this.endpointType}`);
        } catch (error) {
            logger.error('Failed to initialize Phi client:', error);
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
     * Generate text using Phi models
     */
    async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'Phi provider not configured' };
        }

        try {
            const modelId = params.modelId || this.config.defaultModel || this.defaultModel;
            
            // Create cancellation token source to abort the request if needed
            let abortController: AbortController | undefined;

            if (cancellationToken) {
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger.info("Phi request cancelled by user");
                        abortController?.abort();
                    });
                } else {
                    logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }

            // Check for cancellation before making the request
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }

            // Handle different endpoint types
            if (this.endpointType === 'huggingface') {
                return await this.generateWithHuggingFace(params, modelId, abortController);
            } else if (this.endpointType === 'ollama') {
                return await this.generateWithOllama(params, modelId, abortController);
            } else if (this.endpointType === 'azure') {
                return await this.generateWithAzure(params, modelId, abortController);
            } else {
                return await this.generateWithCustomEndpoint(params, modelId, abortController);
            }
        } catch (error: any) {
            logger.error('Phi generate error:', error);
            let errorMessage = 'Failed to call Phi API.';

            if (error.response) {
                errorMessage = `Phi API Error (${error.response.status}): ${error.response.data?.error || error.message}`;
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
        abortController?: AbortController
    ): Promise<LLMGenerateResult> {
        // Prepare the prompt
        let prompt = '';
        
        // Phi-3 uses a specific format for chat
        if (modelId.includes('phi-3')) {
            if (params.systemPrompt) {
                prompt += `<|system|>\n${params.systemPrompt}\n\n`;
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `<|user|>\n${message.content}\n\n`;
                    } else if (message.role === 'assistant') {
                        prompt += `<|assistant|>\n${message.content}\n\n`;
                    } else if (message.role === 'system') {
                        prompt += `<|system|>\n${message.content}\n\n`;
                    }
                }
            } else {
                // Just add the user prompt
                prompt += `<|user|>\n${params.prompt}\n\n`;
            }
            
            // Add the assistant prefix to indicate we want the model to generate a response
            prompt += `<|assistant|>\n`;
        } else {
            // Phi-2 uses a simpler format
            if (params.systemPrompt) {
                prompt += `${params.systemPrompt}\n\n`;
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `Human: ${message.content}\n\n`;
                    } else if (message.role === 'assistant') {
                        prompt += `Assistant: ${message.content}\n\n`;
                    } else if (message.role === 'system') {
                        prompt += `${message.content}\n\n`;
                    }
                }
            } else {
                // Just add the user prompt
                prompt += `Human: ${params.prompt}\n\n`;
            }
            
            // Add the assistant prefix to indicate we want the model to generate a response
            prompt += `Assistant: `;
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
                stop: params.stopSequences || ["Human:", "<|user|>"]
            }
        };

        logger.debug(`Sending request to Phi model ${modelId} via Hugging Face`);

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
        abortController?: AbortController
    ): Promise<LLMGenerateResult> {
        // Prepare the prompt
        let prompt = '';
        
        // Phi-3 uses a specific format for chat
        if (modelId.includes('phi-3')) {
            if (params.systemPrompt) {
                prompt += `<|system|>\n${params.systemPrompt}\n\n`;
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `<|user|>\n${message.content}\n\n`;
                    } else if (message.role === 'assistant') {
                        prompt += `<|assistant|>\n${message.content}\n\n`;
                    } else if (message.role === 'system') {
                        prompt += `<|system|>\n${message.content}\n\n`;
                    }
                }
            } else {
                // Just add the user prompt
                prompt += `<|user|>\n${params.prompt}\n\n`;
            }
            
            // Add the assistant prefix to indicate we want the model to generate a response
            prompt += `<|assistant|>\n`;
        } else {
            // Phi-2 uses a simpler format
            if (params.systemPrompt) {
                prompt += `${params.systemPrompt}\n\n`;
            }
            
            // Add history if provided
            if (params.history && params.history.length > 0) {
                for (const message of params.history) {
                    if (message.role === 'user') {
                        prompt += `Human: ${message.content}\n\n`;
                    } else if (message.role === 'assistant') {
                        prompt += `Assistant: ${message.content}\n\n`;
                    } else if (message.role === 'system') {
                        prompt += `${message.content}\n\n`;
                    }
                }
            } else {
                // Just add the user prompt
                prompt += `Human: ${params.prompt}\n\n`;
            }
            
            // Add the assistant prefix to indicate we want the model to generate a response
            prompt += `Assistant: `;
        }

        // Prepare request data for Ollama
        const requestData = {
            model: modelId,
            prompt: prompt,
            stream: false,
            options: {
                temperature: params.temperature ?? 0.7,
                num_predict: params.maxTokens ?? 512,
                stop: params.stopSequences ?? ["Human:", "<|user|>"]
            }
        };
        
        logger.debug(`Sending request to Phi model ${modelId} via Ollama`);
        
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
     * Generate with Azure OpenAI
     */
    private async generateWithAzure(
        params: LLMGenerateParams,
        modelId: string,
        abortController?: AbortController
    ): Promise<LLMGenerateResult> {
        // Prepare messages for Azure OpenAI API
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
        
        // Prepare request data for Azure OpenAI
        const requestData = {
            messages: messages,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 512,
            stop: params.stopSequences
        };
        
        logger.debug(`Sending request to Phi model ${modelId} via Azure OpenAI`);
        
        // Make the API request
        const response = await this.client.post('/openai/deployments/' + modelId + '/chat/completions?api-version=2023-05-15', requestData, {
            signal: abortController?.signal
        });
        
        // Parse Azure OpenAI response
        return {
            content: response.data.choices[0].message.content || '',
            finishReason: response.data.choices[0].finish_reason || 'stop',
            usage: response.data.usage
        };
    }

    /**
     * Generate with custom endpoint (OpenAI-compatible API)
     */
    private async generateWithCustomEndpoint(
        params: LLMGenerateParams,
        modelId: string,
        abortController?: AbortController
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
        
        // Prepare request data for OpenAI-compatible API
        const requestData = {
            model: modelId,
            messages: messages,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.maxTokens ?? 512,
            stop: params.stopSequences
        };
        
        logger.debug(`Sending request to Phi model ${modelId} via custom endpoint`);
        
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
     * List available Phi models
     */
    async listModels(): Promise<LLMModelInfo[]> {
        if (this.endpointType === 'ollama') {
            try {
                // For Ollama, we can fetch the available models
                const response = await this.client.get('/api/tags');
                
                // Filter for Phi models
                const models = response.data.models
                    .filter((m: any) => 
                        m.name.toLowerCase().includes('phi')
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
                logger.error('Failed to fetch Phi models from Ollama:', error);
            }
        }
        
        // Return predefined models for other endpoint types
        return [
            {
                id: 'microsoft/phi-3-mini-4k-instruct',
                name: 'Phi-3 Mini 4K Instruct',
                description: 'Latest Phi-3 Mini model with 4K context window',
                contextWindow: 4096,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'microsoft/phi-3-mini-128k-instruct',
                name: 'Phi-3 Mini 128K Instruct',
                description: 'Phi-3 Mini model with 128K context window',
                contextWindow: 131072,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'microsoft/phi-3-small-8k-instruct',
                name: 'Phi-3 Small 8K Instruct',
                description: 'Phi-3 Small model with 8K context window',
                contextWindow: 8192,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'microsoft/phi-3-medium-4k-instruct',
                name: 'Phi-3 Medium 4K Instruct',
                description: 'Phi-3 Medium model with 4K context window',
                contextWindow: 4096,
                pricingInfo: 'Free (open weights)'
            },
            {
                id: 'microsoft/phi-2',
                name: 'Phi-2',
                description: 'Original Phi-2 model (2.7B parameters)',
                contextWindow: 2048,
                pricingInfo: 'Free (open weights)'
            }
        ];
    }

    /**
     * Get the context window size for a specific model
     */
    private getContextWindowForModel(modelId: string): number {
        if (modelId.includes('128k')) {
            return 131072;
        } else if (modelId.includes('8k')) {
            return 8192;
        } else if (modelId.includes('4k')) {
            return 4096;
        } else if (modelId.includes('phi-2')) {
            return 2048;
        }
        return 4096; // Default
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
     * Test connection to Phi
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'Phi client not initialized. Please check your configuration.'
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
            } else if (this.endpointType === 'azure') {
                // For Azure, make a simple test request
                const response = await this.client.post('/openai/deployments/' + modelId + '/chat/completions?api-version=2023-05-15', {
                    messages: [{ role: 'user', content: 'Hello' }],
                    max_tokens: 10
                });
                
                if (response.data && response.data.choices) {
                    return {
                        success: true,
                        message: `Successfully connected to Azure OpenAI API and tested model '${modelId}'.`
                    };
                }
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
            logger.error('Phi connection test failed:', error);
            let errorMessage = 'Failed to connect to Phi API';

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
                options: ['huggingface', 'ollama', 'azure', 'custom']
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
                description: 'API key (required for Hugging Face and Azure)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default Phi model to use',
                required: false,
                type: 'select',
                options: [
                    'microsoft/phi-3-mini-4k-instruct',
                    'microsoft/phi-3-mini-128k-instruct',
                    'microsoft/phi-3-small-8k-instruct',
                    'microsoft/phi-3-medium-4k-instruct',
                    'microsoft/phi-2',
                    'phi'
                ]
            }
        ];
    }
}
