import { ILLMProvider, LLMGenerateParams, LLMGenerateResult, ToolCallRequest } from '../llmProvider';
import { getOllamaBaseUrl } from '../../config';
import { logger } from '../../logger';
import axios, { AxiosInstance, CancelTokenSource } from 'axios';
import * as vscode from 'vscode';
import { ITool } from '../../tools/tool';

export class OllamaProvider implements ILLMProvider {
    readonly providerId = 'ollama';
    private client: AxiosInstance | null = null;
    private baseUrl: string = '';

    constructor() {
        this.initializeClient();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.providers.ollama.baseUrl')) {
                logger.info("Ollama configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }

    private initializeClient() {
        this.baseUrl = getOllamaBaseUrl();
        
        if (this.baseUrl) {
            try {
                this.client = axios.create({
                    baseURL: this.baseUrl,
                    timeout: 60000, // 60 second timeout
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
        if (!this.client) return false;
        
        try {
            await this.client.get('/'); // Simple check to see if the base URL is responding
            logger.info(`Ollama connection successful at ${this.baseUrl}`);
            return true;
        } catch (error) {
            logger.error(`Failed to connect to Ollama at ${this.baseUrl}:`, error);
            vscode.window.showWarningMessage(`Could not connect to Ollama at ${this.baseUrl}. Please ensure it's running and the URL is correct.`);
            return false;
        }
    }

    isConfigured(): boolean {
        return !!this.client && !!this.baseUrl;
    }

    /**
     * Add tool instructions to the prompt for Ollama
     * Since Ollama doesn't have a native function calling mechanism,
     * we'll instruct it to output tool calls in a specific JSON format.
     */
    private addToolInstructionsToPrompt(prompt: string, systemPrompt: string | undefined, tools?: Map<string, ITool>): string {
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
        if (!this.client) {
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
            cancelSource = axios.CancelToken.source();
            cancellationToken.onCancellationRequested(() => {
                logger.warn("Ollama request cancelled by user.");
                cancelSource?.cancel("Request cancelled by user.");
            });
        }
        
        try {
            logger.debug(`Sending request to Ollama model ${params.modelId} at ${this.baseUrl}${endpoint}`);
            
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
            if (axios.isCancel(error)) {
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

    async getAvailableModels(): Promise<string[]> {
        if (!this.client) {
            logger.warn("Cannot fetch Ollama models, client not configured.");
            return [];
        }
        
        const endpoint = '/api/tags';
        
        try {
            logger.debug(`Fetching Ollama models list from ${this.baseUrl}${endpoint}`);
            const response = await this.client.get(endpoint);
            
            // Ollama response format: { models: [{ name: "model:tag", ... }, ...] }
            return response.data?.models?.map((m: any) => m.name).sort() ?? [];
        } catch (error) {
            logger.error("Failed to fetch Ollama models:", error);
            return [];
        }
    }
}
