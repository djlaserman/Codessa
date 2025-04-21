"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugMode = void 0;
const operationMode_1 = require("./operationMode");
const logger_1 = require("../logger");
const contextManager_1 = require("./contextManager");
/**
 * Debug Mode - Uses specified files as context for debugging
 */
class DebugMode extends operationMode_1.BaseOperationMode {
    constructor() {
        super(...arguments);
        this.id = 'debug';
        this.displayName = 'Debug';
        this.description = 'Debug issues with your code';
        this.icon = '$(bug)';
        this.defaultContextType = operationMode_1.ContextType.SELECTED_FILES;
        this.requiresHumanVerification = false;
        this.supportsMultipleAgents = false;
    }
    /**
     * Process a user message in Debug mode
     */
    async processMessage(message, agent, contextSource, additionalParams) {
        try {
            logger_1.logger.info(`Processing message in Debug mode: ${message}`);
            // Get context content
            const contextContent = await contextManager_1.contextManager.getContextContent(contextSource);
            // Prepare the prompt with context and error information
            const prompt = `
I'm debugging the following code:

${contextContent}

The issue I'm experiencing is: ${message}

${additionalParams?.errorMessage ? `Error message: ${additionalParams.errorMessage}` : ''}
${additionalParams?.stackTrace ? `Stack trace: ${additionalParams.stackTrace}` : ''}
`;
            // Generate response using the agent
            const response = await agent.generate(prompt, this.getLLMParams(agent.getDefaultLLMParams()));
            return response;
        }
        catch (error) {
            logger_1.logger.error('Error processing message in Debug mode:', error);
            return `Error processing your debug request: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    /**
     * Get LLM parameters specific to Debug mode
     */
    getLLMParams(baseParams) {
        return {
            ...baseParams,
            temperature: 0.2, // Lower temperature for more precise debugging
            maxTokens: 2000 // Longer responses for detailed debugging
        };
    }
    /**
     * Get the system prompt for Debug mode
     */
    async getSystemPrompt(agent, contextSource) {
        return `
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
`;
    }
    /**
     * Get UI components specific to Debug mode
     */
    getUIComponents() {
        return {
            contextPanel: `
<div class="context-panel">
    <div class="context-header">
        <h3>Debug Context</h3>
        <div class="context-controls">
            <button id="btn-refresh-context" title="Refresh Context"><i class="codicon codicon-refresh"></i></button>
            <button id="btn-select-files" title="Select Files"><i class="codicon codicon-file-code"></i></button>
            <button id="btn-select-folders" title="Select Folders"><i class="codicon codicon-folder"></i></button>
        </div>
    </div>
    <div class="context-type">
        <select id="context-type-selector">
            <option value="selected_files">Selected Files</option>
            <option value="current_file">Current File</option>
            <option value="custom">Custom</option>
        </select>
    </div>
    <div id="context-files-list" class="context-files-list"></div>
    <div class="error-info">
        <h4>Error Information</h4>
        <textarea id="error-message" placeholder="Paste error message here..."></textarea>
        <textarea id="stack-trace" placeholder="Paste stack trace here..."></textarea>
    </div>
</div>
`,
            messageInput: `
<div class="message-input-container">
    <textarea id="message-input" placeholder="Describe the issue you're experiencing..."></textarea>
    <button id="btn-send" title="Send"><i class="codicon codicon-send"></i></button>
</div>
`
        };
    }
}
exports.DebugMode = DebugMode;
//# sourceMappingURL=debugMode.js.map