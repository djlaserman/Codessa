import * as vscode from 'vscode';
import { Agent } from '../agents/agent';
import { agentManager } from '../agents/agentManager';
import { logger } from '../logger';
import { getNonce } from './utils';

/**
 * Interface for a chat message
 */
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp: number;
    toolCall?: {
        name: string;
        args: any;
    };
    toolResult?: {
        output: string;
        error?: string;
    };
}

/**
 * Manages a chat session with an agent
 */
export class ChatSession {
    private messages: ChatMessage[] = [];
    private messageCounter: number = 0;
    
    constructor(
        public readonly sessionId: string,
        public readonly agent: Agent
    ) {}
    
    /**
     * Get all messages in the session
     */
    getMessages(): ChatMessage[] {
        return [...this.messages];
    }
    
    /**
     * Add a user message to the session
     */
    addUserMessage(content: string): ChatMessage {
        const message: ChatMessage = {
            id: `msg_${++this.messageCounter}`,
            role: 'user',
            content,
            timestamp: Date.now()
        };
        
        this.messages.push(message);
        return message;
    }
    
    /**
     * Add an assistant message to the session
     */
    addAssistantMessage(content: string, toolCall?: { name: string; args: any }): ChatMessage {
        const message: ChatMessage = {
            id: `msg_${++this.messageCounter}`,
            role: 'assistant',
            content,
            timestamp: Date.now()
        };
        
        if (toolCall) {
            message.toolCall = toolCall;
        }
        
        this.messages.push(message);
        return message;
    }
    
    /**
     * Add a tool result message to the session
     */
    addToolResultMessage(toolName: string, output: string, error?: string): ChatMessage {
        const message: ChatMessage = {
            id: `msg_${++this.messageCounter}`,
            role: 'tool',
            content: `Result from ${toolName}:`,
            timestamp: Date.now(),
            toolResult: {
                output,
                error
            }
        };
        
        this.messages.push(message);
        return message;
    }
    
    /**
     * Clear all messages in the session
     */
    clearMessages(): void {
        this.messages = [];
        this.messageCounter = 0;
    }
    
    /**
     * Export the chat session to a JSON string
     */
    export(): string {
        return JSON.stringify({
            sessionId: this.sessionId,
            agentId: this.agent.id,
            messages: this.messages
        }, null, 2);
    }
    
    /**
     * Import a chat session from a JSON string
     */
    static import(json: string, agent: Agent): ChatSession | null {
        try {
            const data = JSON.parse(json);
            if (!data.sessionId || !data.messages || !Array.isArray(data.messages)) {
                return null;
            }
            
            const session = new ChatSession(data.sessionId, agent);
            session.messages = data.messages;
            session.messageCounter = session.messages.length;
            
            return session;
        } catch (error) {
            logger.error('Error importing chat session:', error);
            return null;
        }
    }
}

/**
 * Chat panel webview implementation
 */
export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private static readonly viewType = 'codessaChat';
    
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _chatSession: ChatSession;
    private _isProcessing: boolean = false;
    
    /**
     * Create or show a chat panel
     */
    public static createOrShow(
        extensionUri: vscode.Uri, 
        agent: Agent, 
        context: vscode.ExtensionContext
    ): ChatPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
            
        // If we already have a panel, show it
        if (ChatPanel.currentPanel 
            && ChatPanel.currentPanel._chatSession.agent.id === agent.id) {
            ChatPanel.currentPanel._panel.reveal(column);
            return ChatPanel.currentPanel;
        }
        
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            `Chat with ${agent.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'resources')
                ]
            }
        );
        
        // Create a session ID
        const sessionId = `session_${Date.now()}_${agent.id}`;
        const chatSession = new ChatSession(sessionId, agent);
        
        const chatPanel = new ChatPanel(panel, extensionUri, chatSession);
        
        // Register panel with extension context
        context.subscriptions.push(panel);
        
        return chatPanel;
    }
    
    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        chatSession: ChatSession
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._chatSession = chatSession;
        
        // Set initial HTML content
        this._update();
        
        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'sendMessage':
                        await this._handleUserMessage(message.text);
                        break;
                    case 'clearChat':
                        this._chatSession.clearMessages();
                        this._update();
                        break;
                    case 'exportChat':
                        this._exportChat();
                        break;
                    case 'cancelOperation':
                        // Implement cancellation logic
                        this._isProcessing = false;
                        this._updateProcessingState();
                        break;
                }
            },
            null,
            this._disposables
        );
        
        // Cache the current panel
        ChatPanel.currentPanel = this;
    }
    
    /**
     * Handle user message
     */
    private async _handleUserMessage(text: string): Promise<void> {
        if (this._isProcessing || !text.trim()) {
            return;
        }
        
        this._isProcessing = true;
        this._chatSession.addUserMessage(text);
        this._update();
        
        try {
            const result = await this._chatSession.agent.run(
                { prompt: text, mode: 'chat' },
                { 
                    // Add context as needed
                }
            );
            
            if (result.success && result.output) {
                this._chatSession.addAssistantMessage(result.output);
            } else if (result.error) {
                this._chatSession.addAssistantMessage(
                    `I encountered an error: ${result.error}`,
                );
            }
            
            // Process tool results if any
            if (result.toolResults && result.toolResults.length > 0) {
                for (const toolResult of result.toolResults) {
                    this._chatSession.addToolResultMessage(
                        toolResult.toolId || 'unknown',
                        toolResult.output || '',
                        toolResult.error
                    );
                }
            }
        } catch (error) {
            logger.error('Error processing message:', error);
            this._chatSession.addAssistantMessage(
                `I encountered an unexpected error. Please try again.`
            );
        } finally {
            this._isProcessing = false;
            this._update();
        }
    }
    
    /**
     * Export chat to a file
     */
    private async _exportChat(): Promise<void> {
        const exportContent = this._chatSession.export();
        
        // Show save dialog
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`codessa_chat_${Date.now()}.json`),
            filters: {
                'JSON': ['json']
            }
        });
        
        if (uri) {
            try {
                // Save to file
                await vscode.workspace.fs.writeFile(
                    uri,
                    Buffer.from(exportContent, 'utf-8')
                );
                
                vscode.window.showInformationMessage(`Chat exported to ${uri.fsPath}`);
            } catch (error) {
                logger.error('Error exporting chat:', error);
                vscode.window.showErrorMessage(`Failed to export chat: ${error}`);
            }
        }
    }
    
    /**
     * Update processing state in UI
     */
    private _updateProcessingState(): void {
        this._panel.webview.postMessage({
            type: 'processingState',
            isProcessing: this._isProcessing
        });
    }
    
    /**
     * Generate HTML for the webview panel
     */
    private _update() {
        const webview = this._panel.webview;
        this._panel.title = `Chat with ${this._chatSession.agent.name}`;
        
        webview.html = this._getWebviewContent(webview);
        this._updateProcessingState();
    }
    
    /**
     * Generate the webview HTML content
     */
    private _getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js')
        );
        
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css')
        );
        
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png')
        );
        
        const nonce = getNonce();
        
        const messages = this._chatSession.getMessages();
        const serializedMessages = JSON.stringify(messages);
        
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Chat with ${this._chatSession.agent.name}</title>
                <link rel="stylesheet" href="${styleUri}">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource};">
            </head>
            <body>
                <div class="chat-container">
                    <header class="chat-header">
                        <img src="${logoUri}" alt="Codessa Logo" class="logo" />
                        <h1>Chat with ${this._chatSession.agent.name}</h1>
                        <div class="actions">
                            <button id="btn-clear" title="Clear chat">Clear</button>
                            <button id="btn-export" title="Export chat">Export</button>
                        </div>
                    </header>
                    
                    <div class="chat-messages" id="chat-messages">
                        <!-- Messages will be inserted here by JavaScript -->
                    </div>
                    
                    <div class="chat-input">
                        <textarea id="message-input" placeholder="Type your message..." rows="3"></textarea>
                        <button id="btn-send">Send</button>
                        <button id="btn-cancel" style="display: none;">Cancel</button>
                    </div>
                </div>
                
                <script nonce="${nonce}">
                    // Initial messages
                    const initialMessages = ${serializedMessages};
                    
                    // Agent details
                    const agent = {
                        id: "${this._chatSession.agent.id}",
                        name: "${this._chatSession.agent.name}",
                        description: "${this._chatSession.agent.description || ''}"
                    };
                    
                    // Processing state
                    let isProcessing = ${this._isProcessing};
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
    
    /**
     * Clean up resources
     */
    public dispose() {
        ChatPanel.currentPanel = undefined;
        
        this._panel.dispose();
        
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
