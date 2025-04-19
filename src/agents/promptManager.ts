import { getSystemPrompts, getPromptVariables } from '../config';
import { logger } from '../logger';
import { defaultSystemPrompts } from './defaultPrompts';

class PromptManager {
    private systemPrompts: Record<string, string> = {};
    private variables: Record<string, string> = {};

    constructor() {
        this.loadPrompts();
        this.loadVariables();
    }

    loadPrompts() {
        const userPrompts = getSystemPrompts();
        // Merge default and user prompts, user prompts override defaults
        this.systemPrompts = { ...defaultSystemPrompts, ...userPrompts };
        logger.info(`Loaded ${Object.keys(this.systemPrompts).length} system prompts.`);
    }

    loadVariables() {
        this.variables = getPromptVariables();
        logger.info(`Loaded ${Object.keys(this.variables).length} prompt variables.`);
    }

    getSystemPrompt(name: string, additionalVars: Record<string, string> = {}): string | undefined {
        let promptTemplate = this.systemPrompts[name];
        if (!promptTemplate) {
            logger.warn(`System prompt named '${name}' not found.`);
            // Fallback to a generic default if name not found
            promptTemplate = this.systemPrompts['default_coder'];
            if(!promptTemplate) return undefined; // No fallback either
        }

        // Combine global and task-specific variables
        const allVars = { ...this.variables, ...additionalVars };

        // Replace placeholders like {variable_name}
        try {
            const filledPrompt = promptTemplate.replace(/\{(\w+)\}/g, (match, varName) => {
                return allVars[varName] !== undefined ? String(allVars[varName]) : match; // Keep placeholder if var not found
            });
            return filledPrompt;
        } catch (error) {
            logger.error(`Error processing prompt template '${name}':`, error);
            return promptTemplate; // Return unprocessed template on error
        }
    }

    listPromptNames(): string[] {
        return Object.keys(this.systemPrompts);
    }

    // Add methods for creating/editing prompts and variables via UI later
}

export const promptManager = new PromptManager();
