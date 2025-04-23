"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentationVisualizationTool = exports.DocumentationSummaryTool = exports.DocumentationSearchTool = exports.DocumentationGenTool = void 0;
const llmService_1 = require("../llm/llmService");
class DocumentationGenTool {
    constructor() {
        this.id = 'docGen';
        this.name = 'Documentation Generation';
        this.description = 'Generate documentation for code or APIs.';
        this.inputSchema = {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'Code to document.' },
                type: { type: 'string', enum: ['function', 'class', 'module', 'api'], description: 'Type of documentation.' }
            },
            required: ['code', 'type']
        };
        this.llmConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.25 }
        };
    }
    async execute(input, _context) {
        const code = input.code;
        const type = input.type;
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
        if (!provider)
            return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Generate ${type} documentation for the following code.\n\n${code}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert technical writer.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error)
            return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}
exports.DocumentationGenTool = DocumentationGenTool;
class DocumentationSearchTool {
    constructor() {
        this.id = 'docSearch';
        this.name = 'Documentation Search (Advanced)';
        this.description = 'Search documentation using web or local sources.';
        this.inputSchema = {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Documentation search query.' }
            },
            required: ['query']
        };
    }
    async execute(input, _context) {
        // Placeholder: In real implementation, this would use web search or offline docs
        return { success: true, output: `Searched documentation for: ${input.query}` };
    }
}
exports.DocumentationSearchTool = DocumentationSearchTool;
class DocumentationSummaryTool {
    constructor() {
        this.id = 'docSummary';
        this.name = 'Documentation Summary';
        this.description = 'Summarize documentation or technical articles.';
        this.inputSchema = {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'Documentation or article to summarize.' }
            },
            required: ['text']
        };
        this.llmConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.2 }
        };
    }
    async execute(input, _context) {
        const text = input.text;
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
        if (!provider)
            return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Summarize the following documentation or article for a developer audience.\n\n${text}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert technical summarizer.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error)
            return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}
exports.DocumentationSummaryTool = DocumentationSummaryTool;
class DocumentationVisualizationTool {
    constructor() {
        this.id = 'docViz';
        this.name = 'Documentation Visualization';
        this.description = 'Visualize documentation structure or API relationships.';
        this.inputSchema = {
            type: 'object',
            properties: {
                source: { type: 'string', description: 'Source code or API spec to visualize.' }
            },
            required: ['source']
        };
    }
    async execute(input, _context) {
        // Placeholder: actual visualization would require UI integration
        return { success: true, output: `Visualization data for: ${input.source}` };
    }
}
exports.DocumentationVisualizationTool = DocumentationVisualizationTool;
//# sourceMappingURL=advancedDocsTool.js.map