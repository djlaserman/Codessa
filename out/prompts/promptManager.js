"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptManager = exports.PromptManager = exports.PromptCategory = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../logger");
/**
 * Prompt category
 */
var PromptCategory;
(function (PromptCategory) {
    PromptCategory["SYSTEM"] = "system";
    PromptCategory["AGENT"] = "agent";
    PromptCategory["MODE"] = "mode";
    PromptCategory["WORKFLOW"] = "workflow";
    PromptCategory["CUSTOM"] = "custom";
})(PromptCategory || (exports.PromptCategory = PromptCategory = {}));
/**
 * Prompt manager
 */
class PromptManager {
    constructor() {
        this.prompts = new Map();
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!PromptManager.instance) {
            PromptManager.instance = new PromptManager();
        }
        return PromptManager.instance;
    }
    /**
     * Initialize the prompt manager
     */
    async initialize(context) {
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
    async loadPrompts() {
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
                        const prompt = JSON.parse(content);
                        // Validate prompt
                        if (this.validatePrompt(prompt)) {
                            this.prompts.set(prompt.id, prompt);
                            logger_1.logger.debug(`Loaded prompt: ${prompt.name} (${prompt.id})`);
                        }
                        else {
                            logger_1.logger.warn(`Invalid prompt in file: ${file}`);
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`Error loading prompt file ${file}:`, error);
                    }
                }
            }
            logger_1.logger.info(`Loaded ${this.prompts.size} prompts`);
        }
        catch (error) {
            logger_1.logger.error('Error loading prompts:', error);
        }
    }
    /**
     * Register default prompts
     */
    registerDefaultPrompts() {
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
    validatePrompt(prompt) {
        return (!!prompt.id &&
            !!prompt.name &&
            !!prompt.description &&
            !!prompt.category &&
            !!prompt.content);
    }
    /**
     * Register a prompt
     */
    async registerPrompt(prompt) {
        // Validate prompt
        if (!this.validatePrompt(prompt)) {
            throw new Error('Invalid prompt');
        }
        // Add to in-memory map
        this.prompts.set(prompt.id, prompt);
        // Save to file
        await this.savePrompt(prompt);
        logger_1.logger.info(`Registered prompt: ${prompt.name} (${prompt.id})`);
    }
    /**
     * Save a prompt to file
     */
    async savePrompt(prompt) {
        if (!this.promptsDir) {
            return;
        }
        try {
            const filePath = path.join(this.promptsDir, `${prompt.id}.json`);
            await fs.promises.writeFile(filePath, JSON.stringify(prompt, null, 2), 'utf-8');
        }
        catch (error) {
            logger_1.logger.error(`Error saving prompt ${prompt.id}:`, error);
            throw error;
        }
    }
    /**
     * Get a prompt by ID
     */
    getPrompt(id) {
        return this.prompts.get(id);
    }
    /**
     * Get all prompts
     */
    getAllPrompts() {
        return Array.from(this.prompts.values());
    }
    /**
     * Get prompts by category
     */
    getPromptsByCategory(category) {
        return Array.from(this.prompts.values()).filter(prompt => prompt.category === category);
    }
    /**
     * Get prompts by tag
     */
    getPromptsByTag(tag) {
        return Array.from(this.prompts.values()).filter(prompt => prompt.tags?.includes(tag));
    }
    /**
     * Update a prompt
     */
    async updatePrompt(id, updates) {
        const prompt = this.prompts.get(id);
        if (!prompt) {
            throw new Error(`Prompt with ID '${id}' not found`);
        }
        // Update prompt
        const updatedPrompt = {
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
        logger_1.logger.info(`Updated prompt: ${updatedPrompt.name} (${updatedPrompt.id})`);
        return updatedPrompt;
    }
    /**
     * Delete a prompt
     */
    async deletePrompt(id) {
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
            }
            catch (error) {
                logger_1.logger.error(`Error deleting prompt file for ${id}:`, error);
                throw error;
            }
        }
        logger_1.logger.info(`Deleted prompt: ${id}`);
    }
    /**
     * Render a prompt with variables
     */
    renderPrompt(promptId, variables = {}) {
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
exports.PromptManager = PromptManager;
// Export singleton instance
exports.promptManager = PromptManager.getInstance();
//# sourceMappingURL=promptManager.js.map