"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiFileCodeGenTool = exports.GenerateTestsTool = exports.DocumentCodeTool = exports.ExplainCodeTool = void 0;
const llmService_1 = require("../llm/llmService");
class ExplainCodeTool {
    constructor() {
        this.id = 'explain';
        this.name = 'Explain Code';
        this.description = 'Explains code using AI.';
        this.inputSchema = {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'The code to explain.' }
            },
            required: ['code']
        };
        this.llmConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.2 }
        };
    }
    async execute(input, _context) {
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
        if (!provider)
            return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Explain the following code in detail, including its purpose and how it works.\n\nCode:\n${input.code}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert code explainer.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error)
            return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}
exports.ExplainCodeTool = ExplainCodeTool;
class DocumentCodeTool {
    constructor() {
        this.id = 'document';
        this.name = 'Document Code';
        this.description = 'Generates documentation/comments for code using AI.';
        this.inputSchema = {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'The code to document.' }
            },
            required: ['code']
        };
        this.llmConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.2 }
        };
    }
    async execute(input, _context) {
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
        if (!provider)
            return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Add detailed comments and documentation to the following code.\n\nCode:\n${input.code}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert code documenter.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error)
            return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}
exports.DocumentCodeTool = DocumentCodeTool;
class GenerateTestsTool {
    constructor() {
        this.id = 'generateTests';
        this.name = 'Generate Tests';
        this.description = 'Generates test code for the provided source code.';
        this.inputSchema = {
            type: 'object',
            properties: {
                code: { type: 'string', description: 'The code to generate tests for.' },
                framework: { type: 'string', description: 'Testing framework to use (optional).' }
            },
            required: ['code']
        };
        this.llmConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.2 }
        };
    }
    async execute(input, _context) {
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
        if (!provider)
            return { success: false, error: 'No LLM provider configured.' };
        const prompt = `Write test code for the following code${input.framework ? ' using ' + input.framework : ''}.\n\nCode:\n${input.code}`;
        const result = await provider.generate({ prompt, systemPrompt: 'You are an expert test code generator.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
        if (result.error)
            return { success: false, error: result.error };
        return { success: true, output: result.content };
    }
}
exports.GenerateTestsTool = GenerateTestsTool;
class MultiFileCodeGenTool {
    constructor() {
        this.id = 'multiFileGen';
        this.name = 'Multi-File Code Generation';
        this.description = 'Generates or refactors code across multiple files.';
        this.inputSchema = {
            type: 'object',
            properties: {
                prompts: { type: 'array', items: { type: 'object', properties: { prompt: { type: 'string' }, filePath: { type: 'string' }, action: { type: 'string' } } }, description: 'Array of prompts/actions for files.' }
            },
            required: ['prompts']
        };
        this.llmConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.2 }
        };
    }
    async execute(input, _context) {
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
        if (!provider)
            return { success: false, error: 'No LLM provider configured.' };
        const results = [];
        for (const p of input.prompts) {
            const prompt = p.prompt;
            const filePath = p.filePath;
            const action = p.action || 'generate';
            const systemPrompt = action === 'refactor' ? 'You are an expert code refactoring assistant.' : 'You are an expert code generator.';
            const userPrompt = prompt;
            const result = await provider.generate({ prompt: userPrompt, systemPrompt, modelId: this.llmConfig.modelId, options: this.llmConfig.options });
            if (result.error)
                results.push({ filePath, error: result.error });
            else
                results.push({ filePath, output: result.content });
        }
        return { success: true, output: results };
    }
}
exports.MultiFileCodeGenTool = MultiFileCodeGenTool;
//# sourceMappingURL=advancedCodeGenerationTool.js.map