import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import { llmService } from '../llm/llmService';
import { LLMConfig } from '../config';

export class ExplainCodeTool implements ITool {
    readonly id = 'explain';
    readonly name = 'Explain Code';
    readonly description = 'Explains code using AI.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            code: { type: 'string', description: 'The code to explain.' }
        },
        required: ['code']
    };
    private llmConfig: LLMConfig = {
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        options: { temperature: 0.2 }
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Explain the following code in detail, including its purpose and how it works.\n\nCode:\n${input.code}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert code explainer.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error) return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}

export class DocumentCodeTool implements ITool {
    readonly id = 'document';
    readonly name = 'Document Code';
    readonly description = 'Generates documentation/comments for code using AI.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            code: { type: 'string', description: 'The code to document.' }
        },
        required: ['code']
    };
    private llmConfig: LLMConfig = {
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        options: { temperature: 0.2 }
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Add detailed comments and documentation to the following code.\n\nCode:\n${input.code}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert code documenter.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error) return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}

export class GenerateTestsTool implements ITool {
    readonly id = 'generateTests';
    readonly name = 'Generate Tests';
    readonly description = 'Generates test code for the provided source code.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            code: { type: 'string', description: 'The code to generate tests for.' },
            framework: { type: 'string', description: 'Testing framework to use (optional).' }
        },
        required: ['code']
    };
    private llmConfig: LLMConfig = {
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        options: { temperature: 0.2 }
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Write test code for the following code${input.framework ? ' using ' + input.framework : ''}.\n\nCode:\n${input.code}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert test code generator.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error) return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}

export class MultiFileCodeGenTool implements ITool {
    readonly id = 'multiFileGen';
    readonly name = 'Multi-File Code Generation';
    readonly description = 'Generates or refactors code across multiple files.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            prompts: { type: 'array', items: { type: 'object', properties: { prompt: { type: 'string' }, filePath: { type: 'string' }, action: { type: 'string' } } }, description: 'Array of prompts/actions for files.' }
        },
        required: ['prompts']
    };
    private llmConfig: LLMConfig = {
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        options: { temperature: 0.2 }
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) return { success: false, error: 'No LLM provider configured.' };
        const results: any[] = [];
        for (const p of input.prompts) {
            const prompt = p.prompt;
            const filePath = p.filePath;
            const action = p.action || 'generate';
            const systemPrompt = action === 'refactor' ? 'You are an expert code refactoring assistant.' : 'You are an expert code generator.';
            const userPrompt = prompt;
            const result = await provider.generate({ prompt: userPrompt, systemPrompt, modelId: this.llmConfig.modelId, options: this.llmConfig.options });
            if (result.error) results.push({ filePath, error: result.error });
            else results.push({ filePath, output: result.content });
        }
        return { success: true, output: results };
    }
}
