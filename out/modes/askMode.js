"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AskMode = void 0;
const operationMode_1 = require("./operationMode");
const logger_1 = require("../logger");
const contextManager_1 = require("./contextManager");
/**
 * Ask Mode - Default mode that uses the entire codebase as context
 */
class AskMode extends operationMode_1.BaseOperationMode {
    constructor() {
        super(...arguments);
        this.id = 'ask';
        this.displayName = 'Ask';
        this.description = 'Ask questions about your codebase';
        this.icon = '$(question)';
        this.defaultContextType = operationMode_1.ContextType.ENTIRE_CODEBASE;
        this.requiresHumanVerification = false;
        this.supportsMultipleAgents = false;
    }
    /**
     * Process a user message in Ask mode
     */
    async processMessage(message, agent, contextSource, additionalParams) {
        try {
            logger_1.logger.info(`Processing message in Ask mode: ${message}`);
            // Get context content
            const contextContent = await contextManager_1.contextManager.getContextContent(contextSource);
            // Prepare the prompt with context
            const prompt = `
I'm asking about the following codebase:

${contextContent}

My question is: ${message}
`;
            // Generate response using the agent
            const response = await agent.generate(prompt, this.getLLMParams(agent.getDefaultLLMParams()));
            return response;
        }
        catch (error) {
            logger_1.logger.error('Error processing message in Ask mode:', error);
            return `Error processing your question: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    /**
     * Get LLM parameters specific to Ask mode
     */
    getLLMParams(baseParams) {
        return {
            ...baseParams,
            temperature: 0.3, // Lower temperature for more factual responses
            maxTokens: 2000 // Longer responses for detailed answers
        };
    }
    /**
     * Get the system prompt for Ask mode
     */
    async getSystemPrompt(agent, contextSource) {
        return `
You are an AI assistant specialized in answering questions about codebases.
Your task is to provide clear, concise, and accurate answers to questions about the code.
Focus on explaining concepts, architecture, and implementation details.
If you don't know the answer, say so rather than making something up.

When referencing code, use proper formatting and include line numbers when relevant.
`;
    }
    /**
     * Get UI components specific to Ask mode
     */
    getUIComponents() {
        return {
            contextPanel: `
<div class="context-panel">
    <div class="context-header">
        <h3>Context</h3>
        <div class="context-controls">
            <button id="btn-refresh-context" title="Refresh Context"><i class="codicon codicon-refresh"></i></button>
            <button id="btn-select-files" title="Select Files"><i class="codicon codicon-file-code"></i></button>
            <button id="btn-select-folders" title="Select Folders"><i class="codicon codicon-folder"></i></button>
        </div>
    </div>
    <div class="context-type">
        <select id="context-type-selector">
            <option value="entire_codebase">Entire Codebase</option>
            <option value="selected_files">Selected Files</option>
            <option value="current_file">Current File</option>
            <option value="custom">Custom</option>
        </select>
    </div>
    <div id="context-files-list" class="context-files-list"></div>
</div>
`,
            messageInput: `
<div class="message-input-container">
    <textarea id="message-input" placeholder="Ask a question about your code..."></textarea>
    <button id="btn-send" title="Send"><i class="codicon codicon-send"></i></button>
</div>
`
        };
    }
}
exports.AskMode = AskMode;
//# sourceMappingURL=askMode.js.map