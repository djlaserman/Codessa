import * as vscode from 'vscode';
import { BaseOperationMode, ContextSource, ContextType } from './operationMode';
import { Agent } from '../agents/agent';
import { LLMGenerateParams } from '../llm/llmProvider';
import { logger } from '../logger';
import { contextManager } from './contextManager';

/**
 * Ask Mode - Default mode that uses the entire codebase as context
 */
export class AskMode extends BaseOperationMode {
    readonly id = 'ask';
    readonly displayName = 'Ask';
    readonly description = 'Ask questions about your codebase';
    readonly icon = '$(question)';
    readonly defaultContextType = ContextType.ENTIRE_CODEBASE;
    readonly requiresHumanVerification = false;
    readonly supportsMultipleAgents = false;

    /**
     * Process a user message in Ask mode
     */
    async processMessage(
        message: string,
        agent: Agent,
        contextSource: ContextSource,
        additionalParams?: Record<string, any>
    ): Promise<string> {
        try {
            logger.info(`Processing message in Ask mode: ${message}`);
            
            // Get context content
            const contextContent = await contextManager.getContextContent(contextSource);
            
            // Prepare the prompt with context
            const prompt = `
I'm asking about the following codebase:

${contextContent}

My question is: ${message}
`;
            
            // Generate response using the agent
            const response = await agent.generate(prompt, this.getLLMParams(agent.getDefaultLLMParams()));
            
            return response;
        } catch (error) {
            logger.error('Error processing message in Ask mode:', error);
            return `Error processing your question: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    /**
     * Get LLM parameters specific to Ask mode
     */
    getLLMParams(baseParams: LLMGenerateParams): LLMGenerateParams {
        return {
            ...baseParams,
            temperature: 0.3, // Lower temperature for more factual responses
            maxTokens: 2000   // Longer responses for detailed answers
        };
    }

    /**
     * Get the system prompt for Ask mode
     */
    async getSystemPrompt(agent: Agent, contextSource: ContextSource): Promise<string> {
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
    getUIComponents(): {
        controlPanel?: string;
        contextPanel?: string;
        messageInput?: string;
    } {
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
