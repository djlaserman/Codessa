import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult, ToolCallRequest } from '../llmProvider';
import { getAnthropicApiKey } from '../../config';
import { logger } from '../../logger';
import * as vscode from 'vscode';
import { ITool } from '../../tools/tool';
import Anthropic from '@anthropic-ai/sdk';

// Define interfaces for Anthropic SDK types
interface MessageParam {
    role: 'user' | 'assistant';
    content: string;
}

interface Tool {
    function: {
        name: string;
        description: string;
        parameters: any;
    };
}

interface MessageCreateParams {
    model: string;
    messages: MessageParam[];
    max_tokens: number;
    temperature?: number;
    system?: string;
    tools?: Tool[];
}

interface ContentBlock {
    type: string;
    text?: string;
    name?: string | undefined;
    input?: string;
}

export class AnthropicProvider extends BaseLLMProvider {
    readonly providerId = 'anthropic';
    readonly displayName = 'Anthropic';
    readonly description = 'Anthropic Claude AI models';
    readonly website = 'https://anthropic.com';
    readonly requiresApiKey = true;
    readonly supportsEndpointConfiguration = false;
    readonly defaultEndpoint = 'https://api.anthropic.com';
    readonly defaultModel = 'claude-3-opus-20240229';

    private client: Anthropic | null = null;

    constructor(context?: vscode.ExtensionContext) {
        super(context);
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
        const apiKey = this.config.apiKey;

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
            const messages: MessageParam[] = [];

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
            const anthropicTools: Tool[] = [];
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
            const completionRequest: MessageCreateParams = {
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
                                name: block.name || '',
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

    /**
     * Lists available models with their details
     */
    async listModels(): Promise<{id: string}[]> {
        if (!this.isConfigured()) {
            return [];
        }

        // Return default Claude models - Anthropic doesn't provide a model listing API
        const models = [
            { id: 'claude-3-opus-20240229' },
            { id: 'claude-3-sonnet-20240229' },
            { id: 'claude-3-haiku-20240307' },
            { id: 'claude-2.1' },
            { id: 'claude-2.0' },
            { id: 'claude-instant-1.2' }
        ];

        logger.info(`Provider anthropic has ${models.length} models available`);
        return models;
    }

    /**
     * Test connection to Anthropic
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.client) {
            return {
                success: false,
                message: 'Anthropic client not initialized. Please check your API key.'
            };
        }

        try {
            // Anthropic doesn't have a dedicated endpoint for testing connections,
            // so we'll make a minimal API call
            await this.client.messages.create({
                model: modelId,
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hello' }]
            });

            return {
                success: true,
                message: `Successfully connected to Anthropic API with model '${modelId}'.`
            };
        } catch (error: any) {
            logger.error('Anthropic connection test failed:', error);
            let errorMessage = 'Failed to connect to Anthropic API';

            if (error.response?.data?.error?.message) {
                errorMessage = `Anthropic API error: ${error.response.data.error.message}`;
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                success: false,
                message: errorMessage
            };
        }
    }

    // Use the parent class implementation for getConfig and updateConfig

    /**
     * Get the configuration fields for this provider
     */
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Anthropic API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., claude-3-opus-20240229)',
                required: false,
                type: 'string'
            }
        ];
    }
}

