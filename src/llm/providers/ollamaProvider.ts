import * as vscode from 'vscode';
// Use require for axios to avoid TypeScript issues
const axios = require('axios');
import type { AxiosInstance } from 'axios';
import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, LLMModelInfo, ToolCallRequest } from '../llmProvider';
import { ITool } from '../../tools/tool';
import { logger } from '../../logger';

// Define missing types
interface CancelTokenSource {
    token: any;
    cancel(message?: string): void;
}

export class OllamaProvider extends BaseLLMProvider {
    readonly providerId = 'ollama';
    readonly displayName = 'Ollama';
    readonly description = 'Run large language models locally';
    readonly website = 'https://ollama.ai';
    readonly requiresApiKey = false;
    readonly supportsEndpointConfiguration = true;
    readonly defaultEndpoint = 'http://localhost:11434';
    readonly defaultModel = 'llama3';

    private client: AxiosInstance | null = null;
    private baseUrl: string = '';

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.baseUrl = this.defaultEndpoint;
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm.providers')) {
                logger.info("Ollama configuration changed, re-initializing client.");
                this.loadConfig().then(() => this.initializeClient());
            }
        });
    }

    private initializeClient() {
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;

        if (this.baseUrl) {
            try {
                // Just store the base URL and use it directly in API calls
                this.client = axios.create({
                    baseURL: this.baseUrl,
                    timeout: 60000, // 60 seconds timeout
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                logger.info(`Ollama client initialized for base URL: ${this.baseUrl}`);
                // Optionally check if Ollama is reachable
                this.checkConnection();
            } catch (error) {
                logger.error("Failed to initialize Ollama client:", error);
                this.client = null;
            }
        } else {
            logger.warn("Ollama base URL not configured.");
            this.client = null;
        }
    }

    async checkConnection(): Promise<boolean> {
        if (!this.baseUrl || !this.client) return false;

        try {
            await this.client.get('/api/version'); // Check if the Ollama API is responding
            logger.info(`Ollama connection successful at ${this.baseUrl}`);
            return true;
        } catch (error) {
            logger.error(`Failed to connect to Ollama at ${this.baseUrl}:`, error);
            return false;
        }
    }

    isConfigured(): boolean {
        return !!this.baseUrl;
    }

    /**
     * Test connection to Ollama
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.baseUrl) {
            return {
                success: false,
                message: 'Ollama client not initialized'
            };
        }

        try {
            // First check if we can connect to the Ollama server
            if (!this.client) {
                return {
                    success: false,
                    message: 'Ollama client not initialized'
                };
            }
            await this.client.get('/api/version');

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
        } catch (error) {
            logger.error('Ollama connection test failed:', error);
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
    private addToolInstructionsToPrompt(prompt: string, _systemPrompt: string | undefined, tools?: Map<string, ITool>): string {
        if (!tools || tools.size === 0) {
            return prompt;
        }

        // Format tool descriptions
        let toolDescriptions = 'Available tools:\n';
        tools.forEach(tool => {
            // Handle file tool with subactions
            if (tool.id === 'file' && typeof (tool as any).getSubActions === 'function') {
                const subActions = (tool as any).getSubActions();
                for (const subAction of subActions) {
                    toolDescriptions += `- ${tool.id}.${subAction.id}: ${subAction.description}\n`;
                    if (subAction.inputSchema) {
                        toolDescriptions += `  Arguments: ${JSON.stringify(subAction.inputSchema)}\n`;
                    }
                }
            } else {
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

    async generate(
        params: LLMGenerateParams,
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.baseUrl) {
            return { content: '', error: 'Ollama provider not configured (Base URL missing?).' };
        }

        // Determine whether to use chat or completion API
        const endpoint = '/api/chat'; // Use chat API for better formatting

        // Prepare chat messages
        let messages: any[] = [];

        if (params.history && params.history.length > 0) {
            // Convert history to Ollama format
            messages = params.history.map(msg => {
                // Ollama doesn't support 'tool' role, so convert to assistant
                const role = msg.role === 'tool' ? 'assistant' : msg.role;
                return { role, content: msg.content };
            });
        } else {
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

        let cancelSource: CancelTokenSource | undefined;
        if (cancellationToken) {
            cancelSource = (axios as any).CancelToken.source();
            cancellationToken.onCancellationRequested(() => {
                logger.warn("Ollama request cancelled by user.");
                cancelSource?.cancel("Request cancelled by user.");
            });
        }

        try {
            logger.debug(`Sending request to Ollama model ${params.modelId} at ${this.baseUrl}${endpoint}`);

            if (!this.client) {
                return { content: '', error: 'Ollama client not initialized' };
            }

            const response = await this.client.post(endpoint, requestData, {
                cancelToken: cancelSource?.token,
            });

            logger.debug(`Ollama response received: ${JSON.stringify(response.data).substring(0, 100)}...`);

            // Parse the content to see if it contains a tool call
            const message = response.data?.message;
            const content = message?.content ?? '';
            let toolCallRequest: ToolCallRequest | undefined;

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
            } catch (error) {
                // Not JSON or invalid, just use as regular content
                logger.debug("Ollama response is not a valid JSON, treating as plain text");
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
        } catch (error: any) {
            if ((axios as any).isCancel && (axios as any).isCancel(error)) {
                return { content: '', error: 'Request cancelled', finishReason: 'cancel' };
            }

            logger.error('Error calling Ollama API:', error);
            let errorMessage = 'Failed to call Ollama API.';

            if (error.response) {
                errorMessage = `Ollama API Error: ${error.response.data?.error || error.message} (Status: ${error.response.status})`;
            } else if (error.request) {
                errorMessage = `Ollama connection error: Could not reach ${this.baseUrl}. Is Ollama running?`;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            return { content: '', error: errorMessage, finishReason: 'error' };
        }
    }

    /**
     * Backward compatibility method for getAvailableModels
     * @deprecated Use listModels instead
     */
    async getAvailableModels(): Promise<string[]> {
        const models = await this.listModels();
        return models.map(model => model.id);
    }

    /**
     * List available models from Ollama
     */
    public async listModels(): Promise<LLMModelInfo[]> {
        if (!this.baseUrl) {
            logger.warn("Cannot fetch Ollama models, client not configured.");
            return [];
        }

        const endpoint = '/api/tags';

        try {
            logger.debug(`Fetching Ollama models list from ${this.baseUrl}${endpoint}`);
            if (!this.client) {
                return [];
            }
            const response = await this.client.get(endpoint);

            // Ollama response format: { models: [{ name: "model:tag", ... }, ...] }
            const models = response.data?.models || [];
            logger.info(`Provider ollama has ${models.length} models available`);

            return models.map((m: any) => ({
                id: m.name,
                name: m.name,
                description: `Size: ${this.formatSize(m.size || 0)}`,
                contextWindow: m.details?.context_length || 4096
            })).sort((a: LLMModelInfo, b: LLMModelInfo) => a.id.localeCompare(b.id));
        } catch (error) {
            logger.error("Failed to fetch Ollama models:", error);
            return [];
        }
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
     * Update the provider configuration
     */
    public async updateConfig(config: any): Promise<void> {
        try {
            await super.updateConfig(config);

            // Update baseUrl from config or fall back to default
            this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;

            // Initialize the client with new configuration
            this.initializeClient();

            // Verify the connection works
            const connected = await this.checkConnection();
            if (!connected) {
                throw new Error(`Failed to connect to Ollama at ${this.baseUrl}`);
            }

            logger.info(`Successfully updated Ollama configuration with endpoint ${this.baseUrl}`);
        } catch (error) {
            logger.error('Failed to update Ollama configuration:', error);
            throw error; // Re-throw to let calling code handle the error
        }
    }

    /**
     * Get the configuration fields for this provider
     */
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> {
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


