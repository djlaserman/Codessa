"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentationTool = exports.DocumentationTool = void 0;
const logger_1 = require("../logger");
const llmService_1 = require("../llm/llmService");
const advancedDocsTool_1 = require("./advancedDocsTool");
/**
 * A tool for searching documentation or asking general knowledge questions.
 * This is currently implemented as a pass-through to the LLM, but could be extended
 * to use web search or other documentation sources.
 */
class DocumentationTool {
    constructor() {
        this.llmConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.3 }
        };
        this.id = 'docs';
        this.name = 'Documentation (Advanced)';
        this.description = 'Search, generate, summarize, and visualize technical documentation or knowledge.';
        this.actions = {
            'search': new advancedDocsTool_1.DocumentationSearchTool(),
            'generate': new advancedDocsTool_1.DocumentationGenTool(),
            'summarize': new advancedDocsTool_1.DocumentationSummaryTool(),
            'visualize': new advancedDocsTool_1.DocumentationVisualizationTool(),
            'ask': {
                id: 'ask', name: 'Ask Documentation', description: 'Ask a documentation or technical question.',
                inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
                async execute(input, _context) {
                    const query = input.query;
                    if (!query) {
                        return { success: false, error: "'query' parameter is required." };
                    }
                    logger_1.logger.info(`Documentation search requested for: "${query}"`);
                    logger_1.logger.warn("Using LLM for documentation search. This may not be accurate for recent information.");
                    const researchLLMConfig = {
                        provider: 'openai',
                        modelId: 'gpt-3.5-turbo',
                        options: { temperature: 0.3 }
                    };
                    const provider = llmService_1.llmService.getProviderForConfig(researchLLMConfig);
                    if (!provider) {
                        return { success: false, error: `LLM provider for documentation search not found or configured.` };
                    }
                    try {
                        const systemPrompt = `You are a documentation researcher. Your task is to answer the following query with accurate, technical information.\nBe concise but thorough. Include code examples where appropriate. If you don't know the answer, say so instead of making things up.\nOnly answer what is asked - do not try to provide additional information beyond the scope of the query.`;
                        const result = await provider.generate({
                            prompt: query,
                            systemPrompt: systemPrompt,
                            modelId: researchLLMConfig.modelId,
                            options: researchLLMConfig.options
                        });
                        if (result.error) {
                            return { success: false, error: result.error };
                        }
                        return { success: true, output: result.content };
                    }
                    catch (error) {
                        return { success: false, error: `Documentation search failed: ${error.message || error}` };
                    }
                }
            }
        };
    }
    async execute(input, _context) {
        const query = input.query;
        if (!query) {
            return { success: false, error: "'query' parameter is required." };
        }
        logger_1.logger.info(`Documentation search requested for: "${query}"`);
        // In a real implementation, we might call a search API or a dedicated service
        // For now, let's use the LLM as a fallback
        logger_1.logger.warn("Using LLM for documentation search. This may not be accurate for recent information.");
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
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
                modelId: this.llmConfig.modelId,
                options: this.llmConfig.options
            });
            if (result.error) {
                return { success: false, error: `Documentation search failed: ${result.error}` };
            }
            return { success: true, output: result.content };
        }
        catch (error) {
            logger_1.logger.error(`Error during documentation search for query "${query}":`, error);
            return { success: false, error: `Documentation search failed: ${error.message || error}` };
        }
    }
}
exports.DocumentationTool = DocumentationTool;
exports.documentationTool = new DocumentationTool();
//# sourceMappingURL=docsTool.js.map