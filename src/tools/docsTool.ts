import { ITool, ToolInput, ToolResult } from './tool';
import { logger } from '../logger';
import { AgentContext } from '../agents/agent';
import { llmService } from '../llm/llmService';
import { LLMConfig } from '../config';

/**
 * A tool for searching documentation or asking general knowledge questions.
 * This is currently implemented as a pass-through to the LLM, but could be extended
 * to use web search or other documentation sources.
 */
export class DocumentationTool implements ITool {
    readonly id = 'docs';
    readonly name = 'Documentation Search';
    readonly description = 'Searches for technical documentation or answers general knowledge questions.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'The search or documentation query.' }
        },
        required: ['query']
    };

    // Configuration for the LLM to use for research
    private researchLLMConfig: LLMConfig = { 
        provider: 'openai', 
        modelId: 'gpt-3.5-turbo',
        options: { temperature: 0.3 }
    };

    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const query = input.query as string;
        
        if (!query) {
            return { success: false, error: "'query' parameter is required." };
        }

        logger.info(`Documentation search requested for: "${query}"`);

        // In a real implementation, we might call a search API or a dedicated service
        // For now, let's use the LLM as a fallback
        logger.warn("Using LLM for documentation search. This may not be accurate for recent information.");

        const provider = llmService.getProviderForConfig(this.researchLLMConfig);
        if (!provider) {
            return { success: false, error: `LLM provider for documentation search not found or configured.` };
        }

        try {
            const systemPrompt = `You are a documentation researcher. Your task is to answer the following query with accurate, technical information. 
Be concise but thorough. Include code examples where appropriate. If you don't know the answer, say so instead of making things up.
Only answer what is asked - do not try to provide additional information beyond the scope of the query.`;

            const result = await provider.generate({
                prompt: query,
                systemPrompt: systemPrompt,
                modelId: this.researchLLMConfig.modelId,
                options: this.researchLLMConfig.options
            });

            if (result.error) {
                return { success: false, error: `Documentation search failed: ${result.error}` };
            }

            return { success: true, output: result.content };
        } catch (error: any) {
            logger.error(`Error during documentation search for query "${query}":`, error);
            return { success: false, error: `Documentation search failed: ${error.message || error}` };
        }
    }
}

export const documentationTool = new DocumentationTool();
