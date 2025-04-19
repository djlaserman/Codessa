import { logger } from '../logger';
import { llmService } from '../llm/llmService';
import { promptManager } from '../agents/promptManager';
import { LLMConfig, AgentConfig, getMaxToolIterations, getDefaultModelConfig } from '../config';
import { ITool, ToolInput, ToolResult } from '../tools/tool';
import * as vscode from 'vscode';

export interface AgentRunInput {
    prompt: string;
    mode: 'task' | 'chat' | 'inline';
    // Add more fields as needed
}

/**
 * Context for agent execution, providing access to workspace and tools
 */
export interface AgentContext {
    /**
     * The editor or workspace state for the agent
     */
    workspace?: {
        currentFile?: vscode.TextDocument;
        selection?: vscode.Selection;
        workspaceFolders?: readonly vscode.WorkspaceFolder[];
    };
    
    /**
     * Tools available to the agent
     */
    tools?: Map<string, ITool>;
    
    /**
     * LLM configuration for this agent
     */
    llmConfig?: LLMConfig;
    
    /**
     * System prompt name
     */
    systemPromptName?: string;
    
    /**
     * Additional context variables
     */
    variables?: Record<string, any>;
    
    /**
     * Cancellation token for stopping long-running operations
     */
    cancellationToken?: vscode.CancellationToken;
}

export interface AgentRunResult {
    success: boolean;
    output?: string;
    error?: string;
    toolResults?: ToolResult[];
}

export class Agent {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly systemPromptName: string;
    readonly llmConfig?: LLMConfig;
    readonly tools: Map<string, ITool>;
    readonly isSupervisor: boolean;

    constructor(config: AgentConfig) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.systemPromptName = config.systemPromptName;
        this.llmConfig = config.llm;
        this.tools = this.initializeTools(config.tools || []);
        this.isSupervisor = config.isSupervisor || false;
    }

    private initializeTools(toolIds: string[]): Map<string, ITool> {
        // This would normally load tools from a registry based on IDs
        // For now, just return an empty map as placeholder
        return new Map<string, ITool>();
    }

    async run(input: AgentRunInput, context: AgentContext = {}): Promise<AgentRunResult> {
        logger.info(`Agent '${this.name}' starting run. Mode: ${input.mode}, Prompt: "${input.prompt.substring(0, 50)}..."`);
        const startTime = Date.now();

        const provider = llmService.getProviderForConfig(this.llmConfig || getDefaultModelConfig());
        if (!provider) {
            logger.error(`No provider found for agent '${this.name}'.`);
            return { success: false, error: 'No LLM provider configured.' };
        }
        if (!provider.isConfigured()) {
            logger.error(`Provider for agent '${this.name}' is not configured.`);
            return { success: false, error: 'LLM provider is not configured.' };
        }

        let iterations = 0;
        const maxIterations = getMaxToolIterations();
        let finalAnswer = '';
        const toolResultsLog: ToolResult[] = [];
        let assistantResponseContent = '';
        let toolCallRequest: { name: string, arguments: Record<string, any> } | null = null;

        while (iterations < maxIterations) {
            iterations++;
            logger.debug(`Agent '${this.name}' - Iteration ${iterations}`);

            // Check for cancellation
            if (context.cancellationToken?.isCancellationRequested) {
                logger.warn(`Agent '${this.name}' run cancelled.`);
                return { success: false, error: 'Cancelled by user.' };
            }

            // --- Compose system prompt ---
            const systemPrompt = promptManager.getSystemPrompt(this.systemPromptName, context.variables || {});
            if (!systemPrompt) {
                logger.error(`System prompt '${this.systemPromptName}' not found for agent '${this.name}'.`);
                return { success: false, error: `System prompt '${this.systemPromptName}' not found.` };
            }

            // --- Call LLM provider ---
            const response = await provider.generate({
                prompt: input.prompt,
                systemPrompt,
                modelId: this.llmConfig?.modelId || getDefaultModelConfig().modelId,
                mode: input.mode
            }, context.cancellationToken, this.tools);

            assistantResponseContent = response.content;
            
            // Handle tool calls
            if (response.toolCallRequest) {
                toolCallRequest = {
                    name: response.toolCallRequest.name,
                    arguments: response.toolCallRequest.arguments || {}
                };
            } else {
                toolCallRequest = null;
            }

            // A. If assistant returned a tool call, execute it
            if (toolCallRequest) {
                const [toolId, actionId] = toolCallRequest.name.split('.');
                const tool = this.tools.get(toolId);
                if (!tool) {
                    logger.error(`Tool '${toolId}' not found for agent '${this.name}'.`);
                    return { success: false, error: `Tool '${toolId}' not found.` };
                }
                
                // Prepare the tool input
                const toolInput: ToolInput = { 
                    ...toolCallRequest.arguments 
                };
                
                // Add action ID for the filesystem tool which expects it
                if (toolId === 'file' && actionId) {
                    toolInput.action = actionId;
                }
                
                const toolResult = await tool.execute(toolInput, context);
                toolResultsLog.push(toolResult);
                if (toolResult.error) {
                    logger.warn(`Tool '${toolId}' failed: ${toolResult.error}`);
                    return { success: false, error: toolResult.error, toolResults: toolResultsLog };
                }
                // Optionally, feed tool output back to LLM
                input.prompt += `\n[Tool '${toolId}' output]: ${toolResult.output}`;
                continue; // Next iteration
            }
            // B. If assistant returned content, treat as final answer
            else if (assistantResponseContent) {
                finalAnswer = assistantResponseContent;
                break;
            }
            // C. If no content and no tool call, something went wrong or LLM finished silently
            else if (!assistantResponseContent && !toolCallRequest) {
                logger.warn(`Agent '${this.name}' LLM returned empty response and no tool call.`);
                finalAnswer = ""; // Assume finished with empty response
                break;
            }
        }

        if (iterations >= maxIterations) {
            logger.warn(`Agent '${this.name}' reached max iterations (${maxIterations}).`);
            return { success: false, error: `Agent exceeded maximum tool iterations (${maxIterations}).`, toolResults: toolResultsLog };
        }

        logger.info(`Agent '${this.name}' finished run in ${Date.now() - startTime}ms.`);
        return { success: true, output: finalAnswer, toolResults: toolResultsLog };
    }
}
