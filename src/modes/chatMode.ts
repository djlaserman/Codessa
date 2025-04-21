import * as vscode from 'vscode';
import { BaseOperationMode, ContextSource, ContextType } from './operationMode';
import { Agent } from '../agents/agent';
import { LLMGenerateParams } from '../llm/llmProvider';
import { logger } from '../logger';

/**
 * Chat Mode - General chat with no specific context
 */
export class ChatMode extends BaseOperationMode {
    readonly id = 'chat';
    readonly displayName = 'Chat';
    readonly description = 'General chat with the AI assistant';
    readonly icon = '$(comment)';
    readonly defaultContextType = ContextType.NONE;
    readonly requiresHumanVerification = false;
    readonly supportsMultipleAgents = false;

    /**
     * Process a user message in Chat mode
     */
    async processMessage(
        message: string,
        agent: Agent,
        // @ts-ignore - Parameter required by interface but not used in this implementation
        contextSource: ContextSource,
        // @ts-ignore - Parameter required by interface but not used in this implementation
        additionalParams?: Record<string, any>
    ): Promise<string> {
        try {
            logger.info(`Processing message in Chat mode: ${message}`);

            // In Chat mode, we just pass the message directly to the agent
            const response = await agent.generate(message, this.getLLMParams(agent.getDefaultLLMParams()));

            return response;
        } catch (error) {
            logger.error('Error processing message in Chat mode:', error);
            return `Error processing your message: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    /**
     * Get LLM parameters specific to Chat mode
     */
    getLLMParams(baseParams: LLMGenerateParams): LLMGenerateParams {
        return {
            ...baseParams,
            temperature: 0.7, // Higher temperature for more creative responses
            maxTokens: 1000   // Standard response length
        };
    }

    /**
     * Get the system prompt for Chat mode
     */
    async getSystemPrompt(
        // @ts-ignore - Parameter required by interface but not used in this implementation
        agent: Agent,
        // @ts-ignore - Parameter required by interface but not used in this implementation
        contextSource: ContextSource
    ): Promise<string> {
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
    getUIComponents(): {
        controlPanel?: string;
        contextPanel?: string;
        messageInput?: string;
    } {
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
