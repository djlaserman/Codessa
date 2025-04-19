import { Agent, AgentRunInput, AgentContext, AgentRunResult } from './agent';
import { logger } from '../logger';
import { llmService } from '../llm/llmService';
import { getMaxToolIterations } from '../config';

export class SupervisorAgent extends Agent {
    private subAgentIds: string[];

    constructor(config: any) {
        super({ ...config, isSupervisor: true });
        this.subAgentIds = config.subAgentIds || [];
    }

    override async run(input: AgentRunInput, context: AgentContext = {}): Promise<AgentRunResult> {
        logger.info(`Supervisor Agent '${this.name}' starting task: ${input.prompt}`);
        const startTime = Date.now();
        const provider = llmService.getProviderForConfig(this.llmConfig);
        const maxIterations = getMaxToolIterations();
        let finalResult: string | null = null;
        let iterations = 0;
        let conversationHistory: any[] = [];

        try {
            for (let i = 0; i < maxIterations; i++) {
                logger.debug(`Supervisor Iteration ${i + 1}`);
                if (context.cancellationToken?.isCancellationRequested) {
                    logger.warn('Supervisor run cancelled.');
                    return { success: false, error: 'Cancelled by user.' };
                }
                // --- Call Supervisor LLM ---
                const response = await provider.generate({
                    prompt: input.prompt,
                    systemPrompt: '',
                    tools: this.tools,
                    mode: input.mode
                }, context.cancellationToken, this.tools);
                conversationHistory.push(response.content);
                if (response.content) {
                    finalResult = response.content;
                    break;
                }
            }

            if (finalResult === null) {
                logger.warn(`Supervisor reached max iterations (${maxIterations}).`);
                finalResult = `Supervisor reached maximum iterations. The task might be incomplete. Last state: ${conversationHistory.slice(-2).map(m=>m.content).join('\n')}`;
            }
            return { success: true, output: finalResult };
        } catch (error: any) {
            logger.error(`Supervisor agent '${this.name}' execution failed:`, error);
            return { success: false, error: `Supervisor execution error: ${error.message || error}` };
        }
    }
}
