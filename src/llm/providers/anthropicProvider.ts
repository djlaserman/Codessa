import { ILLMProvider, LLMGenerateParams, LLMGenerateResult, ToolCallRequest } from '../llmProvider';
import { getAnthropicApiKey } from '../../config';
import { logger } from '../../logger';
import * as vscode from 'vscode';
import { ITool } from '../../tools/tool';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements ILLMProvider {
    readonly providerId = 'anthropic';
    private client: Anthropic | null = null;

    constructor() {
        this.initializeClient();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.providers.anthropic')) {
                logger.info("Anthropic configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }

    private initializeClient() {
        const apiKey = getAnthropicApiKey();
        
        if (!apiKey) {
            logger.warn('Anthropic API key not set.');
            this.client = null;
            return;
        }
        
        try {
            this.client = new Anthropic({ apiKey });
            logger.info('Anthropic client initialized.');
        } catch (error) {
            logger.error('Failed to initialize Anthropic client:', error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.client;
    }

    async generate(
        params: LLMGenerateParams, 
        cancellationToken?: vscode.CancellationToken,
        tools?: Map<string, ITool>
    ): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { 
                content: '', 
                error: 'Anthropic provider not configured (API key missing). Please set the API key in settings.' 
            };
        }

        if (cancellationToken?.isCancellationRequested) {
            return { content: '', error: 'Request cancelled', finishReason: 'cancelled' };
        }

        try {
            // Prepare messages
            const messages: Anthropic.MessageParam[] = [];
            
            // Add history messages if available
            if (params.history && params.history.length > 0) {
                for (const msg of params.history) {
                    if (msg.role === 'system') {
                        continue; // Skip system messages in history as Anthropic handles them separately
                    }
                    
                    if (msg.role === 'user' || msg.role === 'assistant') {
                        messages.push({
                            role: msg.role as 'user' | 'assistant',
                            content: msg.content
                        });
                    }
                }
            } else {
                // If no history, add the current prompt
                messages.push({
                    role: 'user',
                    content: params.prompt
                });
            }

            // Set up tool configuration if tools are provided
            const anthropicTools: Anthropic.Tool[] = [];
            if (tools && tools.size > 0) {
                for (const [toolId, tool] of tools.entries()) {
                    if (tool.actions) {
                        for (const [actionId, action] of Object.entries(tool.actions)) {
                            if (action.parameters) {
                                anthropicTools.push({
                                    function: {
                                        name: `${toolId}.${actionId}`,
                                        description: action.description || `${toolId} ${actionId} action`,
                                        parameters: action.parameters
                                    }
                                });
                            }
                        }
                    }
                }
            }

            // Create the completion request
            const completionRequest: Anthropic.MessageCreateParams = {
                model: params.modelId || 'claude-3-opus-20240229',
                messages,
                max_tokens: params.maxTokens || 1024,
                temperature: params.temperature,
                system: params.systemPrompt
            };
            
            // Add tools if available
            if (anthropicTools.length > 0) {
                completionRequest.tools = anthropicTools;
            }

            // Make the API call
            logger.debug(`Sending request to Anthropic with model: ${completionRequest.model}`);
            const response = await this.client.messages.create(completionRequest);

            // Process the response
            let toolCallRequest: ToolCallRequest | undefined;
            let content = '';
            
            if (response.content && response.content.length > 0) {
                for (const block of response.content) {
                    if (block.type === 'text') {
                        content += block.text;
                    } else if (block.type === 'tool_use' && tools) {
                        // Process tool call
                        try {
                            toolCallRequest = {
                                name: block.name,
                                arguments: JSON.parse(block.input || '{}')
                            };
                            
                            // Break early to let the agent execute the tool
                            break;
                        } catch (error) {
                            logger.error('Error parsing tool call from Anthropic:', error);
                        }
                    }
                }
            }

            return {
                content,
                finishReason: response.stop_reason || 'stop',
                toolCallRequest
            };
            
        } catch (error: any) {
            logger.error('Error calling Anthropic API:', error);
            let errorMessage = 'Error calling Anthropic API.';
            
            if (error.response?.data?.error?.message) {
                errorMessage = `Anthropic API error: ${error.response.data.error.message}`;
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            return { content: '', error: errorMessage };
        }
    }

    async getAvailableModels(): Promise<string[]> {
        if (!this.isConfigured()) {
            return [];
        }
        
        // Return default Claude models - Anthropic doesn't provide a model listing API
        return [
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307',
            'claude-2.1',
            'claude-2.0',
            'claude-instant-1.2'
        ];
    }
} 