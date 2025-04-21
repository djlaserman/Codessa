import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger';

/**
 * Prompt category
 */
export enum PromptCategory {
    SYSTEM = 'system',
    AGENT = 'agent',
    MODE = 'mode',
    WORKFLOW = 'workflow',
    CUSTOM = 'custom'
}

/**
 * Prompt definition
 */
export interface PromptDefinition {
    id: string;
    name: string;
    description: string;
    category: PromptCategory;
    content: string;
    variables?: string[];
    tags?: string[];
    author?: string;
    version?: string;
    createdAt?: string;
    updatedAt?: string;
}

/**
 * Prompt manager
 */
export class PromptManager {
    private static instance: PromptManager;
    private prompts = new Map<string, PromptDefinition>();
    private context: vscode.ExtensionContext | undefined;
    private promptsDir: string | undefined;

    private constructor() {}

    /**
     * Get the singleton instance
     */
    public static getInstance(): PromptManager {
        if (!PromptManager.instance) {
            PromptManager.instance = new PromptManager();
        }
        return PromptManager.instance;
    }

    /**
     * Initialize the prompt manager
     */
    public async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
        
        // Create prompts directory if it doesn't exist
        const extensionPath = context.extensionPath;
        this.promptsDir = path.join(extensionPath, 'prompts');
        
        if (!fs.existsSync(this.promptsDir)) {
            fs.mkdirSync(this.promptsDir, { recursive: true });
        }
        
        // Load prompts
        await this.loadPrompts();
        
        // Register default prompts if none exist
        if (this.prompts.size === 0) {
            this.registerDefaultPrompts();
        }
    }

    /**
     * Load prompts from the prompts directory
     */
    private async loadPrompts(): Promise<void> {
        if (!this.promptsDir) {
            return;
        }
        
        try {
            // Read prompt files
            const files = await fs.promises.readdir(this.promptsDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(this.promptsDir, file);
                        const content = await fs.promises.readFile(filePath, 'utf-8');
                        const prompt = JSON.parse(content) as PromptDefinition;
                        
                        // Validate prompt
                        if (this.validatePrompt(prompt)) {
                            this.prompts.set(prompt.id, prompt);
                            logger.debug(`Loaded prompt: ${prompt.name} (${prompt.id})`);
                        } else {
                            logger.warn(`Invalid prompt in file: ${file}`);
                        }
                    } catch (error) {
                        logger.error(`Error loading prompt file ${file}:`, error);
                    }
                }
            }
            
            logger.info(`Loaded ${this.prompts.size} prompts`);
        } catch (error) {
            logger.error('Error loading prompts:', error);
        }
    }

    /**
     * Register default prompts
     */
    private registerDefaultPrompts(): void {
        // System prompts
        this.registerPrompt({
            id: 'system.default',
            name: 'Default System Prompt',
            description: 'Default system prompt for the AI assistant',
            category: PromptCategory.SYSTEM,
            content: `
You are Codessa, an AI coding assistant.
You help users with programming tasks, answer questions about code, and provide guidance on software development.
You are knowledgeable about various programming languages, frameworks, and best practices.
When asked about code, provide clear, concise explanations and examples.
If you don't know the answer to a question, say so rather than making something up.
`,
            variables: [],
            tags: ['system', 'default'],
            author: 'Codessa',
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        // Agent prompts
        this.registerPrompt({
            id: 'agent.developer',
            name: 'Developer Agent',
            description: 'Prompt for the developer agent',
            category: PromptCategory.AGENT,
            content: `
You are a skilled software developer with expertise in multiple programming languages and frameworks.
Your task is to write clean, efficient, and well-documented code that follows best practices.
Consider edge cases, error handling, and performance in your implementations.
Explain your code and the reasoning behind your design decisions.
`,
            variables: [],
            tags: ['agent', 'developer'],
            author: 'Codessa',
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        this.registerPrompt({
            id: 'agent.architect',
            name: 'Architect Agent',
            description: 'Prompt for the architect agent',
            category: PromptCategory.AGENT,
            content: `
You are a software architect with deep knowledge of system design, patterns, and architectural principles.
Your task is to design robust, scalable, and maintainable software systems.
Consider trade-offs between different approaches and justify your decisions.
Create clear diagrams and documentation to communicate your architectural vision.
`,
            variables: [],
            tags: ['agent', 'architect'],
            author: 'Codessa',
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        // Mode prompts
        this.registerPrompt({
            id: 'mode.ask',
            name: 'Ask Mode',
            description: 'Prompt for Ask mode',
            category: PromptCategory.MODE,
            content: `
You are an AI assistant specialized in answering questions about codebases.
Your task is to provide clear, concise, and accurate answers to questions about the code.
Focus on explaining concepts, architecture, and implementation details.
If you don't know the answer, say so rather than making something up.

When referencing code, use proper formatting and include line numbers when relevant.
`,
            variables: [],
            tags: ['mode', 'ask'],
            author: 'Codessa',
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        this.registerPrompt({
            id: 'mode.debug',
            name: 'Debug Mode',
            description: 'Prompt for Debug mode',
            category: PromptCategory.MODE,
            content: `
You are an AI assistant specialized in debugging code.
Your task is to help the user identify and fix issues in their code.
Analyze the code carefully, identify potential problems, and suggest solutions.
Be methodical in your approach:
1. Understand the error or issue description
2. Analyze the relevant code
3. Identify potential causes
4. Suggest specific fixes with code examples
5. Explain why the issue occurred and how the fix resolves it

When suggesting fixes, provide complete code snippets that the user can directly implement.
Include line numbers and file names when referencing specific parts of the code.
`,
            variables: [],
            tags: ['mode', 'debug'],
            author: 'Codessa',
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        // Workflow prompts
        this.registerPrompt({
            id: 'workflow.codeGeneration',
            name: 'Code Generation Workflow',
            description: 'Prompt for code generation workflow',
            category: PromptCategory.WORKFLOW,
            content: `
Generate code based on the following requirements:

{{requirements}}

Please provide clean, well-documented code that meets these requirements.
Explain your implementation approach and any assumptions you made.
`,
            variables: ['requirements'],
            tags: ['workflow', 'code-generation'],
            author: 'Codessa',
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Validate a prompt
     */
    private validatePrompt(prompt: PromptDefinition): boolean {
        return (
            !!prompt.id &&
            !!prompt.name &&
            !!prompt.description &&
            !!prompt.category &&
            !!prompt.content
        );
    }

    /**
     * Register a prompt
     */
    public async registerPrompt(prompt: PromptDefinition): Promise<void> {
        // Validate prompt
        if (!this.validatePrompt(prompt)) {
            throw new Error('Invalid prompt');
        }
        
        // Add to in-memory map
        this.prompts.set(prompt.id, prompt);
        
        // Save to file
        await this.savePrompt(prompt);
        
        logger.info(`Registered prompt: ${prompt.name} (${prompt.id})`);
    }

    /**
     * Save a prompt to file
     */
    private async savePrompt(prompt: PromptDefinition): Promise<void> {
        if (!this.promptsDir) {
            return;
        }
        
        try {
            const filePath = path.join(this.promptsDir, `${prompt.id}.json`);
            await fs.promises.writeFile(filePath, JSON.stringify(prompt, null, 2), 'utf-8');
        } catch (error) {
            logger.error(`Error saving prompt ${prompt.id}:`, error);
            throw error;
        }
    }

    /**
     * Get a prompt by ID
     */
    public getPrompt(id: string): PromptDefinition | undefined {
        return this.prompts.get(id);
    }

    /**
     * Get all prompts
     */
    public getAllPrompts(): PromptDefinition[] {
        return Array.from(this.prompts.values());
    }

    /**
     * Get prompts by category
     */
    public getPromptsByCategory(category: PromptCategory): PromptDefinition[] {
        return Array.from(this.prompts.values()).filter(prompt => prompt.category === category);
    }

    /**
     * Get prompts by tag
     */
    public getPromptsByTag(tag: string): PromptDefinition[] {
        return Array.from(this.prompts.values()).filter(prompt => prompt.tags?.includes(tag));
    }

    /**
     * Update a prompt
     */
    public async updatePrompt(id: string, updates: Partial<PromptDefinition>): Promise<PromptDefinition> {
        const prompt = this.prompts.get(id);
        
        if (!prompt) {
            throw new Error(`Prompt with ID '${id}' not found`);
        }
        
        // Update prompt
        const updatedPrompt: PromptDefinition = {
            ...prompt,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        // Validate updated prompt
        if (!this.validatePrompt(updatedPrompt)) {
            throw new Error('Invalid prompt updates');
        }
        
        // Update in-memory map
        this.prompts.set(id, updatedPrompt);
        
        // Save to file
        await this.savePrompt(updatedPrompt);
        
        logger.info(`Updated prompt: ${updatedPrompt.name} (${updatedPrompt.id})`);
        
        return updatedPrompt;
    }

    /**
     * Delete a prompt
     */
    public async deletePrompt(id: string): Promise<void> {
        if (!this.prompts.has(id)) {
            throw new Error(`Prompt with ID '${id}' not found`);
        }
        
        // Remove from in-memory map
        this.prompts.delete(id);
        
        // Delete file
        if (this.promptsDir) {
            try {
                const filePath = path.join(this.promptsDir, `${id}.json`);
                await fs.promises.unlink(filePath);
            } catch (error) {
                logger.error(`Error deleting prompt file for ${id}:`, error);
                throw error;
            }
        }
        
        logger.info(`Deleted prompt: ${id}`);
    }

    /**
     * Render a prompt with variables
     */
    public renderPrompt(promptId: string, variables: Record<string, string> = {}): string {
        const prompt = this.getPrompt(promptId);
        
        if (!prompt) {
            throw new Error(`Prompt with ID '${promptId}' not found`);
        }
        
        let content = prompt.content;
        
        // Replace variables
        for (const [key, value] of Object.entries(variables)) {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        
        return content;
    }
}

// Export singleton instance
export const promptManager = PromptManager.getInstance();
