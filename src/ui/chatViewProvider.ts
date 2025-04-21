import * as vscode from 'vscode';
import { getNonce } from '../utils';
import { agentManager } from '../agents/agentManager';
import { ChatMessage, ChatSession } from './chatView';
import { logger } from '../logger';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _disposables: vscode.Disposable[] = [];
    private _chatSession: ChatSession;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {
        this._chatSession = new ChatSession(_context);
        // Load any saved chat session
        this._chatSession.load().catch((error: Error) => {
            logger.error('Failed to load chat session:', error);
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getWebviewContent(webviewView.webview);

        // Send initial state to webview
        webviewView.webview.postMessage({
            type: 'initialize',
            data: {
                messages: this._chatSession.getMessages(),
                isProcessing: this._chatSession.getProcessing()
            }
        });

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'sendMessage': {
                    const message: ChatMessage = {
                        id: `user_${Date.now()}`,
                        role: 'user',
                        content: data.message.text,
                        timestamp: Date.now()
                    };
                    this._chatSession.addMessage(message);
                    this._chatSession.setProcessing(true);
                    this._chatSession.save();
                    
                    // TODO: Process message with selected agent/mode
                    // For now just echo back
                    const response: ChatMessage = {
                        id: `assistant_${Date.now()}`,
                        role: 'assistant',
                        content: `Received: ${data.message.text}`,
                        timestamp: Date.now()
                    };
                    this._chatSession.addMessage(response);
                    this._chatSession.setProcessing(false);
                    this._chatSession.save();
                    
                    webviewView.webview.postMessage({ 
                        type: 'addMessage', 
                        message: response 
                    });
                    break;
                }
                case 'clearChat':
                    this._chatSession.clearMessages();
                    this._chatSession.save();
                    break;
                case 'getAgents': {
                    const agents = agentManager.getAllAgents();
                    webviewView.webview.postMessage({ type: 'agents', value: agents });
                    break;
                }
                case 'log': {
                    logger.info(data.message);
                    break;
                }
            }
        }, null, this._disposables);

        webviewView.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    private _getWebviewContent(webview: vscode.Webview) {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css')
        );
        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'codicon.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js')
        );
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png')
        );

        const nonce = getNonce();

        // Initial state for the chat interface
        const initialState = {
            messages: this._chatSession.getMessages(),
            isProcessing: this._chatSession.getProcessing(),
            mode: 'chat',
            currentProvider: '',
            currentModel: ''
        };

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Codessa Chat</title>
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
            <link rel="stylesheet" href="${codiconsUri}">
            <link rel="stylesheet" href="${styleUri}">
        </head>
        <body>
            <div class="chat-container">
                <!-- Chat Header -->
                <div class="chat-header">
                    <img class="logo" src="${logoUri}" alt="Codessa Logo">
                    <h1>Codessa Chat</h1>
                    <div class="header-actions">
                        <button id="btn-settings" class="icon-button" title="Settings">
                            <span class="codicon codicon-gear"></span>
                        </button>
                        <button id="btn-clear" class="icon-button" title="Clear Chat">
                            <span class="codicon codicon-clear-all"></span>
                        </button>
                        <button id="btn-export" class="icon-button" title="Export Chat">
                            <span class="codicon codicon-save"></span>
                        </button>
                    </div>
                </div>

                <!-- Global Toolbar -->
                <div class="global-toolbar">
                    <div class="toolbar-group-left">
                        <select id="mode-selector" class="dropdown">
                            <option value="chat">Chat Mode</option>
                            <option value="ask">Ask Mode</option>
                            <option value="edit">Edit Mode</option>
                            <option value="debug">Debug Mode</option>
                        </select>
                        <select id="provider-selector" class="dropdown">
                            <option value="">Select Provider...</option>
                        </select>
                        <select id="model-selector" class="dropdown">
                            <option value="">Select Model...</option>
                        </select>
                    </div>
                    <div class="toolbar-group-right">
                        <button id="btn-add-context" class="icon-button" title="Add Context">
                            <span class="codicon codicon-link"></span>
                        </button>
                        <button id="btn-attach-file" class="icon-button" title="Attach File">
                            <span class="codicon codicon-file"></span>
                        </button>
                        <button id="btn-attach-folder" class="icon-button" title="Attach Folder">
                            <span class="codicon codicon-folder"></span>
                        </button>
                        <button id="btn-upload-image" class="icon-button" title="Upload Image">
                            <span class="codicon codicon-image"></span>
                        </button>
                    </div>
                </div>

                <!-- Chat Messages -->
                <div id="chat-messages" class="chat-messages" role="list">
                    <div id="empty-chat-message" class="empty-message">
                        <span class="codicon codicon-comment-discussion"></span>
                        <p>No messages yet. Start a conversation!</p>
                    </div>
                </div>

                <!-- Chat Input Area -->
                <div class="chat-input-area">
                    <!-- Input Toolbar -->
                    <div class="input-toolbar">
                        <div class="toolbar-group-right input-actions-secondary">
                            <button id="btn-input-copy" class="icon-button" title="Copy">
                                <span class="codicon codicon-copy"></span>
                            </button>
                            <button id="btn-input-cut" class="icon-button" title="Cut">
                                <span class="codicon codicon-cut"></span>
                            </button>
                            <button id="btn-input-paste" class="icon-button" title="Paste">
                                <span class="codicon codicon-paste"></span>
                            </button>
                            <button id="btn-input-clear" class="icon-button" title="Clear Input">
                                <span class="codicon codicon-clear"></span>
                            </button>
                        </div>
                    </div>

                    <!-- Input Area -->
                    <div class="input-area-bottom">
                        <div class="input-wrapper">
                            <textarea id="message-input" placeholder="Type a message..." rows="1"></textarea>
                        </div>
                        <div class="input-actions-main">
                            <button id="btn-record-audio" class="icon-button" title="Record Audio">
                                <span class="codicon codicon-mic"></span>
                            </button>
                            <button id="btn-send" class="icon-button primary" title="Send Message">
                                <span class="codicon codicon-send"></span>
                            </button>
                            <button id="btn-cancel" class="icon-button secondary" title="Cancel" style="display: none;">
                                <span class="codicon codicon-stop"></span>
                            </button>
                        </div>
                        <button id="btn-toggle-tts" class="icon-button tts-button-side" title="Toggle Text-to-Speech">
                            <span class="codicon codicon-unmute"></span>
                        </button>
                    </div>

                    <!-- Typing Indicator -->
                    <div id="typing-indicator" class="typing-indicator">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </div>
                </div>
            </div>
            <script nonce="${nonce}">
                window.initialState = ${JSON.stringify(initialState)};
                const vscode = acquireVsCodeApi();
            </script>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    public dispose() {
        this._disposables.forEach(d => d.dispose());
    }

    public reveal(): void {
        if (this._view) {
            this._view.show?.(true);
        } else {
            vscode.commands.executeCommand('codessa.chatViewSidebar.focus');
        }
    }
}
