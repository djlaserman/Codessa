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
            vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'chat.css')
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
            currentModel: '',
            username: vscode.workspace.getConfiguration('codessa').get('user.email') || 'User'
        };

        // Serialize messages for initial state
        const serializedMessages = JSON.stringify(this._chatSession.getMessages());
        const agentId = "";
        const agentName = "Codessa";
        const agentDescription = "The goddess of code";
        const initialMode = "chat";
        const initialProvider = "";
        const initialModel = "";
        const availableProviders: any[] = [];
        const availableModels: any[] = [];

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codessa</title>
    <!-- Syntax Highlighting Themes -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark-dimmed.min.css" media="(prefers-color-scheme: dark)">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" media="(prefers-color-scheme: light)">
    <!-- VS Code Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@vscode/codicons/dist/codicon.css">
    <!-- Main Stylesheet -->
    <link rel="stylesheet" href="${styleUri}">
    <!-- Content Security Policy -->
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        img-src ${webview.cspSource} https: data:;
        script-src 'nonce-${nonce}' https://cdnjs.cloudflare.com;
        style-src ${webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
        font-src https://cdn.jsdelivr.net;
        connect-src 'none';
    ">
</head>
<body>
    <div class="chat-container">
        <!-- Header: Logo, Title, Global Actions -->
        <header class="chat-header">
            <img src="${logoUri}" alt="Codessa Logo" class="logo" />
            <h1>Codessa - The goddess of code</h1>
            <div class="header-actions">
                <button id="btn-settings" class="icon-button" title="Open Settings">
                    <i class="codicon codicon-settings-gear"></i>
                </button>
                <button id="btn-clear" class="icon-button" title="Clear Chat History">
                    <i class="codicon codicon-clear-all"></i>
                </button>
                <button id="btn-export" class="icon-button" title="Export Chat">
                    <i class="codicon codicon-export"></i>
                </button>
            </div>
        </header>

        <!-- Top Toolbar: Mode, Provider, Model Selection + Secondary Actions -->
        <div class="global-toolbar">
             <!-- Left Group: Dropdowns -->
             <div class="toolbar-group-left">
                 <div class="dropdown-container" title="Operation Mode">
                    <select id="mode-selector">
                        <option value="chat">Chat</option>
                        <option value="ask">Ask</option>
                        <option value="edit">Edit</option>
                        <option value="debug">Debug</option>
                        <option value="agent">Agent</option>
                        <option value="multi-agent">Multi-Agent</option>
                        <option value="refactor">Refactor</option>
                        <option value="document">Document</option>
                    </select>
                </div>
                 <div class="dropdown-container" title="AI Provider">
                    <select id="provider-selector">
                        <option value="">Provider...</option>
                        <!-- Options populated by JS/Extension -->
                    </select>
                </div>
                 <div class="dropdown-container" title="AI Model">
                    <select id="model-selector">
                         <option value="">Model...</option>
                         <!-- Options populated by JS/Extension -->
                    </select>
                </div>
             </div>

             <!-- Right Group: Secondary Input Actions (Copy/Cut/Paste/Clear) -->
             <div class="toolbar-group-right input-actions-secondary">
                <button id="btn-input-copy" class="icon-button" title="Copy Input Text">
                    <i class="codicon codicon-copy"></i>
                </button>
                <button id="btn-input-cut" class="icon-button" title="Cut Input Text">
                    <i class="codicon codicon-file-symlink-file"></i> <!-- ** CUT BUTTON HERE ** -->
                </button>
                <button id="btn-input-paste" class="icon-button" title="Paste into Input">
                    <i class="codicon codicon-clippy"></i> <!-- ** PASTE ICON HERE ** -->
                </button>
                <button id="btn-input-clear" class="icon-button" title="Clear Input Text">
                    <i class="codicon codicon-trash"></i>
                </button>
                 <!-- TTS Button Moved -->
            </div>
        </div>

        <!-- Main Chat Message Display Area -->
        <div class="chat-messages" id="chat-messages" role="log" aria-live="polite">
            <div class="empty-chat-message" id="empty-chat-message" style="display: none;">
                Select mode, provider, model, and start chatting or attach context.
            </div>
            <!-- Messages will be dynamically inserted here -->
        </div>

        <!-- Input Area at the Bottom -->
        <div class="chat-input-area">
            <!-- Typing Indicator (Initially Hidden) -->
            <div class="typing-indicator" id="typing-indicator">
                <i class="codicon codicon-loading codicon-spin"></i> Thinking...
            </div>

            <!-- Input Toolbar (Attachments/Media) -->
            <div class="input-toolbar">
                <div class="input-toolbar-left">
                    <button id="btn-attach-file" class="icon-button" title="Attach File">
                        <i class="codicon codicon-file-add"></i>
                    </button>
                    <button id="btn-upload-image" class="icon-button" title="Upload Image (Vision)">
                        <i class="codicon codicon-device-camera"></i>
                    </button>
                    <button id="btn-attach-folder" class="icon-button" title="Attach Folder">
                        <i class="codicon codicon-new-folder"></i> <!-- ** FOLDER ICON HERE ** -->
                    </button>
                    <button id="btn-add-context" class="icon-button" title="Add Context (e.g., selected code)">
                        <i class="codicon codicon-folder-library"></i>
                    </button>
                </div>
                <div class="input-toolbar-right">
                    <!-- TTS Button Moved Here -->
                    <button id="btn-toggle-tts" class="icon-button" title="Toggle Text-to-Speech Output">
                        <i class="codicon codicon-unmute"></i> <!-- Changes to codicon-mute when active -->
                    </button>
                </div>
            </div>

            <!-- Container for Input Wrapper -->
            <div class="input-area-bottom">
                <!-- Main Input Wrapper (Textarea + Record/Send/Cancel) -->
                <div class="input-wrapper">
                    <textarea id="message-input" placeholder="Type your message or use commands..." rows="1" aria-label="Chat message input"></textarea>
                    <div class="input-actions-main">
                         <button id="btn-record-audio" class="icon-button" title="Record Audio Input"> <!-- Moved Here -->
                            <i class="codicon codicon-mic"></i>
                        </button>
                        <button id="btn-send" class="icon-button" title="Send Message" disabled>
                            <i class="codicon codicon-send"></i>
                        </button>
                        <button id="btn-cancel" class="icon-button" title="Cancel Generation"> <!-- Stays here -->
                            <i class="codicon codicon-stop-circle"></i>
                        </button>
                    </div>
                </div>
            </div> <!-- End input-area-bottom -->

        </div> <!-- End chat-input-area -->
    </div> <!-- End chat-container -->

    <!-- External Libraries -->
    <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.1/marked.min.js"></script>
    <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

    <!-- Initial State & Config -->
    <script nonce="${nonce}">
        const initialState = {
            messages: ${serializedMessages},
            agent: {
                id: "${agentId}",
                name: "${agentName}", // Keep original agentName for potential internal use
                description: "${agentDescription || ''}"
            },
            isProcessing: ${this._chatSession.getProcessing()},
            isTTSActive: false, // Default TTS state
            currentMode: "${initialMode || 'chat'}", // Default operation mode
            availableProviders: ${JSON.stringify(availableProviders || [])}, // Pass from extension e.g., [{id: 'openai', name: 'OpenAI'}, ...]
            currentProvider: "${initialProvider || ''}", // Pass from extension
            availableModels: ${JSON.stringify(availableModels || [])}, // Pass from extension e.g., [{id: 'gpt-4', name: 'GPT-4', provider: 'openai'}, ...]
            currentModel: "${initialModel || ''}" // Pass from extension
        };

        // Configure Markdown Parser (marked.js)
        marked.setOptions({
            highlight: function(code, lang) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                try {
                    // Use highlight.js for syntax highlighting in code blocks
                    return hljs.highlight(code, { language, ignoreIllegals: true }).value;
                } catch (error) {
                    console.error("Highlight.js error:", error);
                    // Fallback to auto-detection if specific language fails
                    return hljs.highlightAuto(code).value;
                }
            },
            breaks: true, // Convert GFM line breaks to <br>
            gfm: true,    // Enable GitHub Flavored Markdown
            pedantic: false,
            smartLists: true,
            smartypants: false
        });

        // Acquire VS Code API instance for communication
        const vscode = acquireVsCodeApi();
    </script>

    <!-- Main Application Script -->
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
