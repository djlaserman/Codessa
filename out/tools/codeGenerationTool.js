"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeGenerationTool = exports.CodeGenerationTool = void 0;
const llmService_1 = require("../llm/llmService");
const advancedCodeGenerationTool_1 = require("./advancedCodeGenerationTool");
class CodeGenerationTool {
    constructor() {
        this.id = 'codeGen';
        this.name = 'Code Generation & Refactor (Advanced)';
        this.description = 'Generate, refactor, insert, explain, document, create tests, and multi-file code generation using AI.';
        this.actions = {
            'generate': {
                id: 'generate', name: 'Generate Code', description: 'Generate code from prompt using AI.',
                inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
                async execute(input) {
                    const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
                    if (!provider)
                        return { success: false, error: 'No LLM provider configured.' };
                    const result = await provider.generate({ prompt: input.prompt, systemPrompt: 'You are an expert code generator.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
                    if (result.error)
                        return { success: false, error: result.error };
                    return { success: true, output: result.content };
                }
            },
            'refactor': {
                id: 'refactor', name: 'Refactor Code', description: 'Refactor code using AI.',
                inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, code: { type: 'string' } }, required: ['prompt', 'code'] },
                async execute(input) {
                    const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
                    if (!provider)
                        return { success: false, error: 'No LLM provider configured.' };
                    const userPrompt = `Refactor the following code as requested.\nRequest: ${input.prompt}\nCode:\n${input.code}`;
                    const result = await provider.generate({ prompt: userPrompt, systemPrompt: 'You are an expert code refactoring assistant.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
                    if (result.error)
                        return { success: false, error: result.error };
                    return { success: true, output: result.content };
                }
            },
            'insert': {
                id: 'insert', name: 'Insert Code', description: 'Insert code at a position in a file.',
                inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, filePath: { type: 'string' }, position: { type: 'object' } }, required: ['prompt', 'filePath', 'position'] },
                async execute(input) {
                    const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
                    if (!provider)
                        return { success: false, error: 'No LLM provider configured.' };
                    const result = await provider.generate({ prompt: input.prompt, systemPrompt: 'You are an expert code generator.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
                    if (result.error)
                        return { success: false, error: result.error };
                    return { success: true, output: result.content };
                }
            },
            'explain': new advancedCodeGenerationTool_1.ExplainCodeTool(),
            'document': new advancedCodeGenerationTool_1.DocumentCodeTool(),
            'generateTests': new advancedCodeGenerationTool_1.GenerateTestsTool(),
            'multiFileGen': new advancedCodeGenerationTool_1.MultiFileCodeGenTool(),
        };
        this.llmConfig = {
            provider: 'openai',
            modelId: 'gpt-3.5-turbo',
            options: { temperature: 0.2 }
        };
    }
    async execute(input, _context) {
        const action = input.action;
        const prompt = input.prompt;
        const filePath = input.filePath;
        const position = input.position;
        const code = input.code;
        const provider = llmService_1.llmService.getProviderForConfig(this.llmConfig);
        if (!provider) {
            return { success: false, error: 'No LLM provider configured.' };
        }
        try {
            let systemPrompt = '';
            let userPrompt = '';
            if (action === 'generate') {
                systemPrompt = 'You are an expert code generator.';
                userPrompt = prompt;
            }
            else if (action === 'refactor') {
                systemPrompt = 'You are an expert code refactoring assistant.';
                userPrompt = `Refactor the following code as requested.\nRequest: ${prompt}\nCode:\n${code}`;
            }
            else if (action === 'insert') {
                systemPrompt = 'You are an expert code generator.';
                userPrompt = prompt;
            }
            else {
                return { success: false, error: `Unknown code generation action: ${action}` };
            }
            const result = await provider.generate({
                prompt: userPrompt,
                systemPrompt,
                modelId: this.llmConfig.modelId,
                options: this.llmConfig.options
            });
            if (result.error) {
                return { success: false, error: result.error };
            }
            return { success: true, output: result.content };
        }
        catch (error) {
            return { success: false, error: `Code generation failed: ${error.message || error}` };
        }
    }
}
exports.CodeGenerationTool = CodeGenerationTool;
exports.codeGenerationTool = new CodeGenerationTool();
//# sourceMappingURL=codeGenerationTool.js.map