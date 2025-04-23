import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import { llmService } from '../llm/llmService';
import { LLMConfig } from '../config';
import { ExplainCodeTool, DocumentCodeTool, GenerateTestsTool, MultiFileCodeGenTool } from './advancedCodeGenerationTool';

export class CodeGenerationTool implements ITool {
    readonly id = 'codeGen';
    readonly name = 'Code Generation & Refactor (Advanced)';
    readonly description = 'Generate, refactor, insert, explain, document, create tests, and multi-file code generation using AI.';
    readonly actions: { [key: string]: ITool } = {
        'generate': {
            id: 'generate', name: 'Generate Code', description: 'Generate code from prompt using AI.',
            inputSchema: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] },
            async execute(this: CodeGenerationTool, input: ToolInput) {
                const provider = llmService.getProviderForConfig(this.llmConfig);
                if (!provider) return { success: false, error: 'No LLM provider configured.' };
                const result = await provider.generate({ prompt: input.prompt, systemPrompt: 'You are an expert code generator.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
                if (result.error) return { success: false, error: result.error };
                return { success: true, output: result.content };
            }
        },
        'refactor': {
            id: 'refactor', name: 'Refactor Code', description: 'Refactor code using AI.',
            inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, code: { type: 'string' } }, required: ['prompt', 'code'] },
            async execute(this: CodeGenerationTool, input: ToolInput) {
                const provider = llmService.getProviderForConfig(this.llmConfig);
                if (!provider) return { success: false, error: 'No LLM provider configured.' };
                const userPrompt = `Refactor the following code as requested.\nRequest: ${input.prompt}\nCode:\n${input.code}`;
                const result = await provider.generate({ prompt: userPrompt, systemPrompt: 'You are an expert code refactoring assistant.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
                if (result.error) return { success: false, error: result.error };
                return { success: true, output: result.content };
            }
        },
        'insert': {
            id: 'insert', name: 'Insert Code', description: 'Insert code at a position in a file.',
            inputSchema: { type: 'object', properties: { prompt: { type: 'string' }, filePath: { type: 'string' }, position: { type: 'object' } }, required: ['prompt', 'filePath', 'position'] },
            async execute(this: CodeGenerationTool, input: ToolInput) {
                const provider = llmService.getProviderForConfig(this.llmConfig);
                if (!provider) return { success: false, error: 'No LLM provider configured.' };
                const result = await provider.generate({ prompt: input.prompt, systemPrompt: 'You are an expert code generator.', modelId: this.llmConfig.modelId, options: this.llmConfig.options });
                if (result.error) return { success: false, error: result.error };
                return { success: true, output: result.content };
            }
        },
        'explain': new ExplainCodeTool(),
        'document': new DocumentCodeTool(),
        'generateTests': new GenerateTestsTool(),
        'multiFileGen': new MultiFileCodeGenTool(),
    };
    private llmConfig: LLMConfig = {
        provider: 'openai',
        modelId: 'gpt-3.5-turbo',
        options: { temperature: 0.2 }
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const action = input.action as string;
        const prompt = input.prompt as string;
        const filePath = input.filePath as string;
        const position = input.position;
        const code = input.code as string;
        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) {
            return { success: false, error: 'No LLM provider configured.' };
        }
        try {
            let systemPrompt = '';
            let userPrompt = '';
            if (action === 'generate') {
                systemPrompt = 'You are an expert code generator.';
                userPrompt = prompt;
            } else if (action === 'refactor') {
                systemPrompt = 'You are an expert code refactoring assistant.';
                userPrompt = `Refactor the following code as requested.\nRequest: ${prompt}\nCode:\n${code}`;
            } else if (action === 'insert') {
                systemPrompt = 'You are an expert code generator.';
                userPrompt = prompt;
            } else {
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
        } catch (error: any) {
            return { success: false, error: `Code generation failed: ${error.message || error}` };
        }
    }
}

export const codeGenerationTool = new CodeGenerationTool();
