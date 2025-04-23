import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import { llmService } from '../llm/llmService';
import { LLMConfig } from '../config';

export class DocumentationGenTool implements ITool {
    readonly id = 'docGen';
    readonly name = 'Documentation Generation';
    readonly description = 'Generate documentation for code or APIs.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            code: { type: 'string', description: 'Code to document.' },
            type: { type: 'string', enum: ['function', 'class', 'module', 'api'], description: 'Type of documentation.' }
        },
        required: ['code', 'type']
    };
    private llmConfig: LLMConfig = {
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        options: { temperature: 0.25 }
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const code = input.code as string;
        const type = input.type as string;
        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Generate ${type} documentation for the following code.\n\n${code}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert technical writer.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error) return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}

export class DocumentationSearchTool implements ITool {
    readonly id = 'docSearch';
    readonly name = 'Documentation Search (Advanced)';
    readonly description = 'Search documentation using web or local sources.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Documentation search query.' }
        },
        required: ['query']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        // Placeholder: In real implementation, this would use web search or offline docs
        return { success: true, output: `Searched documentation for: ${input.query}` };
    }
}

export class DocumentationSummaryTool implements ITool {
    readonly id = 'docSummary';
    readonly name = 'Documentation Summary';
    readonly description = 'Summarize documentation or technical articles.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            text: { type: 'string', description: 'Documentation or article to summarize.' }
        },
        required: ['text']
    };
    private llmConfig: LLMConfig = {
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        options: { temperature: 0.2 }
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const text = input.text as string;
        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Summarize the following documentation or article for a developer audience.\n\n${text}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert technical summarizer.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error) return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}

export class DocumentationVisualizationTool implements ITool {
    readonly id = 'docViz';
    readonly name = 'Documentation Visualization';
    readonly description = 'Visualize documentation structure or API relationships.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            source: { type: 'string', description: 'Source code or API spec to visualize.' }
        },
        required: ['source']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        // Placeholder: actual visualization would require UI integration
        return { success: true, output: `Visualization data for: ${input.source}` };
    }
}
