"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptManager = void 0;
const config_1 = require("../config");
const logger_1 = require("../logger");
const defaultPrompts_1 = require("./defaultPrompts");
class PromptManager {
    constructor() {
        this.systemPrompts = {};
        this.variables = {};
        this.loadPrompts();
        this.loadVariables();
    }
    loadPrompts() {
        const userPrompts = (0, config_1.getSystemPrompts)();
        // Merge default and user prompts, user prompts override defaults
        this.systemPrompts = { ...defaultPrompts_1.defaultSystemPrompts, ...userPrompts };
        logger_1.logger.info(`Loaded ${Object.keys(this.systemPrompts).length} system prompts.`);
    }
    loadVariables() {
        this.variables = (0, config_1.getPromptVariables)();
        logger_1.logger.info(`Loaded ${Object.keys(this.variables).length} prompt variables.`);
    }
    getSystemPrompt(name, additionalVars = {}) {
        let promptTemplate = this.systemPrompts[name];
        if (!promptTemplate) {
            logger_1.logger.warn(`System prompt named '${name}' not found.`);
            // Fallback to a generic default if name not found
            promptTemplate = this.systemPrompts['default_coder'];
            if (!promptTemplate)
                return undefined; // No fallback either
        }
        // Combine global and task-specific variables
        const allVars = { ...this.variables, ...additionalVars };
        // Replace placeholders like {variable_name}
        try {
            const filledPrompt = promptTemplate.replace(/\{(\w+)\}/g, (match, varName) => {
                return allVars[varName] !== undefined ? String(allVars[varName]) : match; // Keep placeholder if var not found
            });
            return filledPrompt;
        }
        catch (error) {
            logger_1.logger.error(`Error processing prompt template '${name}':`, error);
            return promptTemplate; // Return unprocessed template on error
        }
    }
    listPromptNames() {
        return Object.keys(this.systemPrompts);
    }
    /**
     * Gets the description of a prompt by extracting the first line or returning a default
     */
    getPromptDescription(name) {
        const promptTemplate = this.systemPrompts[name];
        if (!promptTemplate)
            return undefined;
        // Extract the first line as the description
        const firstLine = promptTemplate.split('\n')[0].trim();
        if (firstLine.startsWith('#') || firstLine.startsWith('//')) {
            return firstLine.replace(/^[#/\s]+/, '').trim();
        }
        return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    }
}
exports.promptManager = new PromptManager();
//# sourceMappingURL=promptManager.js.map