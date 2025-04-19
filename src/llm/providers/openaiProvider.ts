import { ILLMProvider, LLMGenerateParams, LLMGenerateResult, ToolCallRequest } from '../llmProvider';
import { getOpenAIApiKey, getOpenAIBaseUrl } from '../../config';
import { logger } from '../../logger';
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { ITool } from '../../tools/tool';

export class OpenAIProvider implements ILLMProvider {
    readonly providerId = 'openai';
    private client: OpenAI | null = null;

    constructor() {
        this.initializeClient();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.providers.openai')) {
                logger.info("OpenAI configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }

    private initializeClient() {
        const apiKey = getOpenAIApiKey();
        const baseUrl = getOpenAIBaseUrl();
        
        if (!apiKey) {
            logger.warn('OpenAI API key not set.');
            this.client = null;
            return;
        }
        
        const config: OpenAI.ClientOptions = { apiKey };
        if (baseUrl) {
            config.baseURL = baseUrl;
        }
        
        try {
            this.client = new OpenAI(config);
            logger.info('OpenAI client initialized.');
        } catch (error) {
            logger.error('Failed to initialize OpenAI client:', error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    /**
     * Formats tools for OpenAI function calling API
     */
    private formatToolsForOpenAI(tools?: Map<string, ITool>): OpenAI.ChatCompletionTool[] | undefined {
        if (!tools || tools.size === 0) {
            return undefined;
        }
        
        const formattedTools: OpenAI.ChatCompletionTool[] = [];
        
        tools.forEach(tool => {
            // Handle file tool with subactions
            if (tool.id === 'file' && typeof (tool as any).getSubActions === 'function') {
                const subActions = (tool as any).getSubActions();
                
                for (const subAction of subActions) {
                    formattedTools.push({
                        type: 'function',
                        function: {
                            name: `${tool.id}.${subAction.id}`,
                            description: subAction.description || `${tool.id}.${subAction.id} operation`,
                            parameters: subAction.inputSchema || { type: 'object', properties: {} }
                        }
                    });
                }
            } else {
                // Regular tool
                formattedTools.push({
                    type: 'function',
                    function: {
                        name: tool.id,
                        description: tool.description || `${tool.id} operation`,
                        parameters: tool.inputSchema || { type: 'object', properties: {} }
                    }
                });
            }
        });
        
        return formattedTools.length > 0 ? formattedTools : undefined;
    }

    async generate(
        params: LLMGenerateParams, 
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'OpenAI provider not configured (API key missing?)' };
        }
        
        try {
            // Prepare messages
            let messages: OpenAI.ChatCompletionMessageParam[];
            
            if (params.history && params.history.length > 0) {
                messages = params.history as OpenAI.ChatCompletionMessageParam[];
            } else {
                messages = [
                    params.systemPrompt ? { role: 'system', content: params.systemPrompt } : undefined,
                    { role: 'user', content: params.prompt }
                ].filter(Boolean) as OpenAI.ChatCompletionMessageParam[];
            }
            
            // Format tools if provided
            const formattedTools = this.formatToolsForOpenAI(tools);
            
            // Check for cancellation before calling API
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled before sending' };
            }
            
            // Create API request
            const request: OpenAI.ChatCompletionCreateParams = {
                model: params.modelId,
                messages: messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                stop: params.stopSequences,
                tools: formattedTools,
                tool_choice: formattedTools ? 'auto' : undefined,
                ...params.options
            };
            
            logger.debug(`Sending request to OpenAI model ${params.modelId}`);
            
            // Create cancellation token source to abort the request if needed
            let abortController: AbortController | undefined;
            
            if (cancellationToken) {
                // Use the global AbortController if available, or provide a simple fallback
                if (typeof AbortController !== 'undefined') {
                    abortController = new AbortController();
                    cancellationToken.onCancellationRequested(() => {
                        logger.info("OpenAI request cancelled by user");
                        abortController?.abort();
                    });
                } else {
                    logger.warn("AbortController not available in this environment, cancellation may not work properly");
                }
            }
            
            // Run API request with possible cancellation
            const response = await this.client.chat.completions.create({
                ...request,
                signal: abortController?.signal
            });
            
            // Check for cancellation again after API call (in case it was cancelled but too late to abort)
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled during processing' };
            }
            
            const choice = response.choices[0];
            logger.debug(`OpenAI response received. Finish reason: ${choice.finish_reason}`);
            
            // Check if we got a tool call
            let toolCallRequest: ToolCallRequest | undefined;
            if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
                const toolCall = choice.message.tool_calls[0]; // Take the first one for now
                
                try {
                    toolCallRequest = {
                        id: toolCall.id,
                        name: toolCall.function.name,
                        arguments: JSON.parse(toolCall.function.arguments || '{}')
                    };
                } catch (e) {
                    logger.error(`Failed to parse tool call arguments: ${e}`);
                }
            }
            
            // Return the response
            return {
                content: choice.message?.content?.trim() ?? '',
                finishReason: choice.finish_reason ?? undefined,
                usage: {
                    promptTokens: response.usage?.prompt_tokens,
                    completionTokens: response.usage?.completion_tokens,
                    totalTokens: response.usage?.total_tokens,
                },
                toolCalls: choice.message?.tool_calls,
                toolCallRequest
            };
        } catch (error: any) {
            // Handle errors, differentiating between OpenAI API errors and other errors
            logger.error('OpenAI generate error:', error);
            let errorMessage = 'Failed to call OpenAI API.';
            
            if (error.status && error.message) {
                // OpenAI API error format
                errorMessage = `OpenAI API Error (${error.status}): ${error.message}`;
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

    async getAvailableModels(): Promise<string[]> {
        if (!this.client) {
            logger.warn('Cannot fetch OpenAI models, client not configured.');
            return [];
        }
        try {
            const response = await this.client.models.list();
            // Filter for models that support the chat completions API
            return response.data
                .filter((m: any) => m.id.includes('gpt') || m.id.includes('text-davinci'))
                .map((m: any) => m.id)
                .sort();
        } catch (error: any) {
            logger.error('Failed to fetch OpenAI models:', error);
            return [];
        }
    }
}
