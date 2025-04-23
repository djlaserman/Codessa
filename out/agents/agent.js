"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const logger_1 = require("../logger");
const llmService_1 = require("../llm/llmService");
const promptManager_1 = require("../agents/promptManager");
const config_1 = require("../config");
const toolRegistry_1 = require("../tools/toolRegistry");
const agentMemory_1 = require("../memory/agentMemory");
class Agent {
    constructor(config) {
        // Default LLM parameters for this agent
        this.defaultLLMParams = {
            temperature: 0.7,
            maxTokens: 1000,
            stopSequences: [],
            mode: 'chat'
        };
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.systemPromptName = config.systemPromptName;
        this.llmConfig = config.llm;
        this.tools = toolRegistry_1.toolRegistry.getToolsByIds(config.tools || []);
        this.isSupervisor = config.isSupervisor || false;
        this.chainedAgentIds = config.chainedAgentIds || [];
        this.memory = (0, agentMemory_1.getAgentMemory)(this);
    }
    /**
     * Get the agent's memory
     */
    getMemory() {
        return this.memory;
    }
    /**
     * Get the default LLM parameters for this agent
     */
    getDefaultLLMParams() {
        return {
            ...this.defaultLLMParams,
            modelId: this.llmConfig?.modelId || (0, config_1.getDefaultModelConfig)().modelId
        };
    }
    /**
     * Generate a response using the agent's LLM
     * @param prompt The prompt to send to the LLM
     * @param params Additional LLM parameters
     * @param cancellationToken Optional cancellation token
     * @returns The generated text
     */
    async generate(prompt, params = {}, cancellationToken) {
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig || (0, config_1.getDefaultModelConfig)());
        if (!provider) {
            throw new Error(`No provider found for agent '${this.name}'.`);
        }
        if (!provider.isConfigured()) {
            throw new Error(`Provider for agent '${this.name}' is not configured.`);
        }
        // Get system prompt
        const systemPrompt = promptManager_1.promptManager.getSystemPrompt(this.systemPromptName, {});
        if (!systemPrompt) {
            throw new Error(`System prompt '${this.systemPromptName}' not found for agent '${this.name}'.`);
        }
        // Merge parameters
        const mergedParams = {
            prompt,
            systemPrompt,
            modelId: this.llmConfig?.modelId || (0, config_1.getDefaultModelConfig)().modelId,
            ...params
        };
        // Generate response
        const response = await provider.generate(mergedParams, cancellationToken);
        return response.content;
    }
    async run(input, context = {}) {
        logger_1.logger.info(`Agent '${this.name}' starting run. Mode: ${input.mode}, Prompt: "${input.prompt.substring(0, 50)}..."`);
        const startTime = Date.now();
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig || (0, config_1.getDefaultModelConfig)());
        if (!provider) {
            logger_1.logger.error(`No provider found for agent '${this.name}'.`);
            return { success: false, error: 'No LLM provider configured.' };
        }
        if (!provider.isConfigured()) {
            logger_1.logger.error(`Provider for agent '${this.name}' is not configured.`);
            return { success: false, error: 'LLM provider is not configured.' };
        }
        // Add user message to memory
        if ((0, config_1.getMemoryEnabled)()) {
            await this.memory.addMessage('user', input.prompt);
            // Get relevant memories for this prompt
            const relevantMemories = await this.memory.getRelevantMemories(input.prompt);
            // If we have relevant memories, add them to the prompt
            if (relevantMemories.length > 0) {
                const memoryPrompt = this.memory.formatMemoriesForPrompt(relevantMemories);
                input.prompt = memoryPrompt + input.prompt;
                logger_1.logger.debug(`Added ${relevantMemories.length} relevant memories to prompt`);
            }
        }
        let iterations = 0;
        const maxIterations = (0, config_1.getMaxToolIterations)();
        let finalAnswer = '';
        const toolResultsLog = [];
        let assistantResponseContent = '';
        let toolCallRequest = null;
        while (iterations < maxIterations) {
            iterations++;
            logger_1.logger.debug(`Agent '${this.name}' - Iteration ${iterations}`);
            // Check for cancellation
            if (context.cancellationToken?.isCancellationRequested) {
                logger_1.logger.warn(`Agent '${this.name}' run cancelled.`);
                return { success: false, error: 'Cancelled by user.' };
            }
            // --- Compose system prompt ---
            const systemPrompt = promptManager_1.promptManager.getSystemPrompt(this.systemPromptName, context.variables || {});
            if (!systemPrompt) {
                logger_1.logger.error(`System prompt '${this.systemPromptName}' not found for agent '${this.name}'.`);
                return { success: false, error: `System prompt '${this.systemPromptName}' not found.` };
            }
            // --- Call LLM provider ---
            const response = await provider.generate({
                prompt: input.prompt,
                systemPrompt,
                modelId: this.llmConfig?.modelId || (0, config_1.getDefaultModelConfig)().modelId,
                mode: input.mode
            }, context.cancellationToken, this.tools);
            assistantResponseContent = response.content;
            // Handle tool calls
            if (response.toolCallRequest) {
                toolCallRequest = {
                    name: response.toolCallRequest.name,
                    arguments: response.toolCallRequest.arguments || {}
                };
            }
            else {
                toolCallRequest = null;
            }
            // A. If assistant returned a tool call, execute it
            if (toolCallRequest) {
                const [toolId, actionId] = toolCallRequest.name.split('.');
                const tool = this.tools.get(toolId);
                if (!tool) {
                    logger_1.logger.error(`Tool '${toolId}' not found for agent '${this.name}'.`);
                    return { success: false, error: `Tool '${toolId}' not found.` };
                }
                // Prepare the tool input
                const toolInput = {
                    ...toolCallRequest.arguments
                };
                // Add action ID for the filesystem tool which expects it
                if (toolId === 'file' && actionId) {
                    toolInput.action = actionId;
                }
                const toolResult = await tool.execute(toolInput, context);
                toolResultsLog.push(toolResult);
                if (toolResult.error) {
                    logger_1.logger.warn(`Tool '${toolId}' failed: ${toolResult.error}`);
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
                logger_1.logger.warn(`Agent '${this.name}' LLM returned empty response and no tool call.`);
                finalAnswer = ""; // Assume finished with empty response
                break;
            }
        }
        if (iterations >= maxIterations) {
            logger_1.logger.warn(`Agent '${this.name}' reached max iterations (${maxIterations}).`);
            return { success: false, error: `Agent exceeded maximum tool iterations (${maxIterations}).`, toolResults: toolResultsLog };
        }
        logger_1.logger.info(`Agent '${this.name}' finished run in ${Date.now() - startTime}ms.`);
        // Add assistant response to memory
        if ((0, config_1.getMemoryEnabled)() && finalAnswer) {
            await this.memory.addMessage('assistant', finalAnswer);
        }
        return { success: true, output: finalAnswer, toolResults: toolResultsLog };
    }
}
exports.Agent = Agent;
//# sourceMappingURL=agent.js.map