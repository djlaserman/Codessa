"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupervisorAgent = void 0;
const agent_1 = require("./agent");
const logger_1 = require("../logger");
const llmService_1 = require("../llm/llmService");
const config_1 = require("../config");
class SupervisorAgent extends agent_1.Agent {
    constructor(config) {
        super({ ...config, isSupervisor: true });
        this.subAgentIds = config.subAgentIds || [];
    }
    async run(input, context = {}) {
        logger_1.logger.info(`Supervisor Agent '${this.name}' starting task: ${input.prompt}`);
        const startTime = Date.now();
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig || llmService_1.llmService.getDefaultModelConfig());
        const maxIterations = (0, config_1.getMaxToolIterations)();
        let finalResult = null;
        let iterations = 0;
        let conversationHistory = [];
        try {
            for (let i = 0; i < maxIterations; i++) {
                logger_1.logger.debug(`Supervisor Iteration ${i + 1}`);
                if (context.cancellationToken?.isCancellationRequested) {
                    logger_1.logger.warn('Supervisor run cancelled.');
                    return { success: false, error: 'Cancelled by user.' };
                }
                // --- Call Supervisor LLM ---
                if (!provider) {
                    throw new Error('No LLM provider available');
                }
                const response = await provider.generate({
                    prompt: input.prompt,
                    systemPrompt: '',
                    mode: input.mode,
                    modelId: this.llmConfig?.modelId || llmService_1.llmService.getDefaultModelConfig().modelId
                }, context.cancellationToken, this.tools);
                conversationHistory.push(response.content);
                if (response.content) {
                    finalResult = response.content;
                    break;
                }
            }
            if (finalResult === null) {
                logger_1.logger.warn(`Supervisor reached max iterations (${maxIterations}).`);
                finalResult = `Supervisor reached maximum iterations. The task might be incomplete. Last state: ${conversationHistory.slice(-2).map(m => m.content).join('\n')}`;
            }
            return { success: true, output: finalResult };
        }
        catch (error) {
            logger_1.logger.error(`Supervisor agent '${this.name}' execution failed:`, error);
            return { success: false, error: `Supervisor execution error: ${error.message || error}` };
        }
    }
}
exports.SupervisorAgent = SupervisorAgent;
//# sourceMappingURL=supervisorAgent.js.map