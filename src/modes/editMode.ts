import * as vscode from 'vscode';
import { BaseOperationMode, ContextSource, ContextType } from './operationMode';
import { Agent } from '../agents/agent';
import { LLMGenerateParams } from '../llm/llmProvider';
import { logger } from '../logger';
import { contextManager } from './contextManager';

/**
 * Edit Mode - Autonomous code editing with human verification
 */
export class EditMode extends BaseOperationMode {
    readonly id = 'edit';
    readonly displayName = 'Edit';
    readonly description = 'AI-assisted code editing with human verification';
    readonly icon = '$(edit)';
    readonly defaultContextType = ContextType.SELECTED_FILES;
    readonly requiresHumanVerification = true;
    readonly supportsMultipleAgents = false;

    private pendingEdits: Map<string, { content: string, description: string }> = new Map();

    /**
     * Process a user message in Edit mode
     */
    async processMessage(
        message: string,
        agent: Agent,
        contextSource: ContextSource,
        additionalParams?: Record<string, any>
    ): Promise<string> {
        try {
            logger.info(`Processing message in Edit mode: ${message}`);
            
            // Get context content
            const contextContent = await contextManager.getContextContent(contextSource);
            
            // Prepare the prompt with context
            const prompt = `
I need to make changes to the following code:

${contextContent}

The changes I want to make are: ${message}

Please provide the following:
1. A detailed plan of the changes to be made
2. For each file that needs to be modified, provide:
   a. The file path
   b. The exact code to be changed (before)
   c. The new code (after)
   d. A brief explanation of the change

Format your response as follows:

## Plan
[Detailed plan of changes]

## File Changes
### [File Path 1]
\`\`\`before
[Original code]
\`\`\`

\`\`\`after
[Modified code]
\`\`\`

[Explanation of changes]

### [File Path 2]
...
`;
            
            // Generate response using the agent
            const response = await agent.generate(prompt, this.getLLMParams(agent.getDefaultLLMParams()));
            
            // Parse the response to extract file changes
            const fileChanges = this.parseFileChanges(response);
            
            // Store pending edits for user verification
            for (const [filePath, change] of Object.entries(fileChanges)) {
                this.pendingEdits.set(filePath, change);
            }
            
            // Add verification UI to the response
            const responseWithVerification = `
${response}

---

I've analyzed the code and proposed the changes above. Would you like me to apply these changes?

[Apply Changes] [Review Changes] [Cancel]
`;
            
            return responseWithVerification;
        } catch (error) {
            logger.error('Error processing message in Edit mode:', error);
            return `Error processing your edit request: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    /**
     * Parse file changes from the agent's response
     */
    private parseFileChanges(response: string): Record<string, { content: string, description: string }> {
        const fileChanges: Record<string, { content: string, description: string }> = {};
        
        // Simple regex-based parsing (could be improved with a more robust parser)
        const fileRegex = /### \[(.*?)\][\s\S]*?\`\`\`after([\s\S]*?)\`\`\`[\s\S]*?((?=### \[)|$)/g;
        const matches = response.matchAll(fileRegex);
        
        for (const match of matches) {
            const filePath = match[1].trim();
            const content = match[2].trim();
            const description = match[3]?.trim() || 'No description provided';
            
            fileChanges[filePath] = { content, description };
        }
        
        return fileChanges;
    }

    /**
     * Apply pending edits to files
     */
    async applyEdits(): Promise<void> {
        for (const [filePath, change] of this.pendingEdits.entries()) {
            try {
                // Create a URI for the file
                const uri = vscode.Uri.file(filePath);
                
                // Read the file
                const document = await vscode.workspace.openTextDocument(uri);
                
                // Create a WorkspaceEdit
                const edit = new vscode.WorkspaceEdit();
                
                // Replace the entire content of the file
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                
                edit.replace(uri, fullRange, change.content);
                
                // Apply the edit
                await vscode.workspace.applyEdit(edit);
                
                logger.info(`Applied edit to ${filePath}`);
            } catch (error) {
                logger.error(`Error applying edit to ${filePath}:`, error);
                throw new Error(`Failed to apply edit to ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        
        // Clear pending edits
        this.pendingEdits.clear();
    }

    /**
     * Get LLM parameters specific to Edit mode
     */
    getLLMParams(baseParams: LLMGenerateParams): LLMGenerateParams {
        return {
            ...baseParams,
            temperature: 0.2, // Lower temperature for more precise code generation
            maxTokens: 3000   // Longer responses for detailed code changes
        };
    }

    /**
     * Get the system prompt for Edit mode
     */
    async getSystemPrompt(agent: Agent, contextSource: ContextSource): Promise<string> {
        return `
You are an AI assistant specialized in editing code.
Your task is to help the user make changes to their codebase.
Analyze the code carefully and propose specific, well-thought-out changes.

When suggesting changes:
1. Provide a detailed plan of the changes to be made
2. For each file that needs to be modified, provide:
   a. The file path
   b. The exact code to be changed (before)
   c. The new code (after)
   d. A brief explanation of the change

Be precise and thorough in your analysis and suggestions.
Ensure that your proposed changes maintain the integrity and functionality of the codebase.
Consider potential side effects of your changes and address them in your plan.
`;
    }

    /**
     * Get UI components specific to Edit mode
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
        <h3>Edit Context</h3>
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
</div>
`,
            messageInput: `
<div class="message-input-container">
    <textarea id="message-input" placeholder="Describe the changes you want to make..."></textarea>
    <button id="btn-send" title="Send"><i class="codicon codicon-send"></i></button>
</div>
`
        };
    }

    /**
     * Handle mode-specific commands
     */
    async handleCommand(command: string, args: any[]): Promise<void> {
        switch (command) {
            case 'applyEdits':
                await this.applyEdits();
                break;
            
            case 'reviewEdits':
                // Open a diff view for each pending edit
                for (const [filePath, change] of this.pendingEdits.entries()) {
                    try {
                        const uri = vscode.Uri.file(filePath);
                        const document = await vscode.workspace.openTextDocument(uri);
                        const originalContent = document.getText();
                        
                        // Create a temporary file for the diff
                        const tempUri = uri.with({ scheme: 'untitled', path: `${uri.path}.new` });
                        const tempDoc = await vscode.workspace.openTextDocument(tempUri);
                        const edit = new vscode.WorkspaceEdit();
                        edit.insert(tempUri, new vscode.Position(0, 0), change.content);
                        await vscode.workspace.applyEdit(edit);
                        
                        // Show diff
                        await vscode.commands.executeCommand('vscode.diff', uri, tempUri, `${filePath} (Changes)`);
                    } catch (error) {
                        logger.error(`Error showing diff for ${filePath}:`, error);
                    }
                }
                break;
            
            case 'cancelEdits':
                this.pendingEdits.clear();
                break;
        }
    }
}
