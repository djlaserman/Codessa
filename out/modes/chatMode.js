"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMode = void 0;
const operationMode_1 = require("./operationMode");
const logger_1 = require("../logger");
/**
 * Chat Mode - General chat with no specific context
 */
class ChatMode extends operationMode_1.BaseOperationMode {
    constructor() {
        super(...arguments);
        this.id = 'chat';
        this.displayName = 'Chat';
        this.description = 'General chat with the AI assistant';
        this.icon = '$(comment)';
        this.defaultContextType = operationMode_1.ContextType.NONE;
        this.requiresHumanVerification = false;
        this.supportsMultipleAgents = false;
    }
    /**
     * Process a user message in Chat mode
     */
    async processMessage(message, agent, contextSource, additionalParams) {
        try {
            logger_1.logger.info(`Processing message in Chat mode: ${message}`);
            // In Chat mode, we just pass the message directly to the agent
            const response = await agent.generate(message, this.getLLMParams(agent.getDefaultLLMParams()));
            return response;
        }
        catch (error) {
            logger_1.logger.error('Error processing message in Chat mode:', error);
            return `Error processing your message: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    /**
     * Get LLM parameters specific to Chat mode
     */
    getLLMParams(baseParams) {
        return {
            ...baseParams,
            temperature: 0.7, // Higher temperature for more creative responses
            maxTokens: 1000 // Standard response length
        };
    }
    /**
     * Get the system prompt for Chat mode
     */
    async getSystemPrompt(agent, contextSource) {
        return `
You are a helpful AI assistant.
Respond to the user's messages in a conversational manner.
You can discuss a wide range of topics, including programming, technology, science, and more.
If the user asks about code or programming concepts, provide helpful explanations and examples.
If you don't know the answer to a question, say so rather than making something up.
`;
    }
    /**
     * Get UI components specific to Chat mode
     */
    getUIComponents() {
        return {
            messageInput: `
<div class="message-input-container">
    <textarea id="message-input" placeholder="Chat with the AI assistant..."></textarea>
    <button id="btn-send" title="Send"><i class="codicon codicon-send"></i></button>
</div>
`
        };
    }
}
exports.ChatMode = ChatMode;
//# sourceMappingURL=chatMode.js.map