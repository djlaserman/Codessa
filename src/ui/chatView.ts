import * as vscode from 'vscode';
import { logger } from '../logger';
import { getNonce } from '../utils';
import { Agent } from '../agents/agent';
import { IOperationMode } from '../modes/operationMode';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp: number;
}

/**
 * Manages a chat session's state and messages
 */
export class ChatSession {
    private messages: ChatMessage[] = [];
    private isProcessing: boolean = false;

    constructor(private readonly context: vscode.ExtensionContext) {}

    public addMessage(message: ChatMessage): void {
        this.messages.push(message);
    }

    public getMessages(): ChatMessage[] {
        return [...this.messages];
    }

    public clearMessages(): void {
        this.messages = [];
    }

    public setProcessing(isProcessing: boolean): void {
        this.isProcessing = isProcessing;
    }

    public getProcessing(): boolean {
        return this.isProcessing;
    }

    public async save(): Promise<void> {
        try {
            await this.context.globalState.update('chatSession', {
                messages: this.messages,
                timestamp: Date.now()
            });
            logger.debug('Chat session saved successfully');
        } catch (error) {
            logger.error('Failed to save chat session:', error);
        }
    }

    public async load(): Promise<void> {
        try {
            const saved = this.context.globalState.get<{
                messages: ChatMessage[];
                timestamp: number;
            }>('chatSession');

            if (saved) {
                this.messages = saved.messages;
                logger.debug(`Loaded chat session with ${this.messages.length} messages`);
            }
        } catch (error) {
            logger.error('Failed to load chat session:', error);
        }
    }
}

/**
 * A webview panel that displays a chat interface
 */
export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private static readonly viewType = 'codessaChat';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _agent: Agent;
    private readonly _mode: IOperationMode;
    private readonly _extensionUri: vscode.Uri;
    private readonly _disposables: vscode.Disposable[] = [];
    private _chatSession: ChatSession;

    public static createOrShow(
        extensionUri: vscode.Uri,
        agent: Agent,
        context: vscode.ExtensionContext,
        mode: IOperationMode
    ): ChatPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
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
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, agent, extensionUri, context, mode);
        return ChatPanel.currentPanel;
    }

    private constructor(
        panel: vscode.WebviewPanel,
        agent: Agent,
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
        mode: IOperationMode
    ) {
        this._panel = panel;
        this._agent = agent;
        this._mode = mode;
        this._extensionUri = extensionUri;
        this._chatSession = new ChatSession(context);

        // Set initial HTML content
        this._update();

        // Listen for panel disposal
        this._panel.onDidDispose(() => this.dispose(), undefined, this._disposables);

        // Update content when panel becomes visible
        this._panel.onDidChangeViewState(() => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);

        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'sendMessage':
                    await this._handleMessage(message.text);
                    break;
                case 'clearChat':
                    this._chatSession.clearMessages();
                    await this._chatSession.save();
                    this._update();
                    break;
                case 'exportChat':
                    await this._handleExportChat();
                    break;
                case 'openSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codessa');
                    break;
                case 'addContext':
                    await this._handleAddContext();
                    break;
                case 'attachFile':
                    await this._handleAttachFile();
                    break;
                case 'attachFolder':
                    await this._handleAttachFolder();
                    break;
                case 'uploadImage':
                    await this._handleUploadImage();
                    break;
                case 'recordAudio':
                    await this._handleRecordAudio();
                    break;
                case 'toggleTTS':
                    await this._handleToggleTTS(message.state);
                    break;
                case 'changeMode':
                    await this._handleChangeMode(message.mode);
                    break;
                case 'changeProvider':
                    await this._handleChangeProvider(message.provider);
                    break;
                case 'changeModel':
                    await this._handleChangeModel(message.model);
                    break;
                case 'cancelOperation':
                    await this._handleCancel();
                    break;
            }
        }, undefined, this._disposables);
    }

    private async _handleExportChat(): Promise<void> {
        try {
            const messages = this._chatSession.getMessages();
            const exportData = {
                agent: {
                    name: this._agent.name,
                    id: this._agent.id
                },
                messages: messages,
                exportedAt: new Date().toISOString()
            };

            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('chat-export.json'),
                filters: { 'JSON files': ['json'] }
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(
                    uri,
                    Buffer.from(JSON.stringify(exportData, null, 2))
                );
                vscode.window.showInformationMessage('Chat exported successfully');
            }
        } catch (error) {
            logger.error('Error exporting chat:', error);
            vscode.window.showErrorMessage('Failed to export chat');
        }
    }

    private async _handleAddContext(): Promise<void> {
        // Get selected text from active editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (text) {
                const contextMessage: ChatMessage = {
                    id: `context_${Date.now()}`,
                    role: 'system',
                    content: `Selected code context:\n\`\`\`${editor.document.languageId}\n${text}\n\`\`\``,
                    timestamp: Date.now()
                };
                this._chatSession.addMessage(contextMessage);
                await this._chatSession.save();
                this._update();
            }
        }
    }

    private async _handleAttachFile(): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Attach'
        });

        if (uris && uris[0]) {
            const fileContent = await vscode.workspace.fs.readFile(uris[0]);
            const text = Buffer.from(fileContent).toString('utf8');
            const contextMessage: ChatMessage = {
                id: `file_${Date.now()}`,
                role: 'system',
                content: `File content from ${uris[0].fsPath}:\n\`\`\`\n${text}\n\`\`\``,
                timestamp: Date.now()
            };
            this._chatSession.addMessage(contextMessage);
            await this._chatSession.save();
            this._update();
        }
    }

    private async _handleAttachFolder(): Promise<void> {
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Attach Folder'
        });

        if (uri && uri[0]) {
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(uri[0], '**/*'),
                '**/node_modules/**'
            );
            const contextMessage: ChatMessage = {
                id: `folder_${Date.now()}`,
                role: 'system',
                content: `Folder structure from ${uri[0].fsPath}:\n\`\`\`\n${files.map(f => f.fsPath).join('\n')}\n\`\`\``,
                timestamp: Date.now()
            };
            this._chatSession.addMessage(contextMessage);
            await this._chatSession.save();
            this._update();
        }
    }

    private async _handleUploadImage(): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'Images': ['png', 'jpg', 'jpeg', 'gif', 'webp']
            },
            openLabel: 'Upload'
        });

        if (uris && uris[0]) {
            // For now, just add as a message that image was selected
            // In the future, implement actual image analysis
            const contextMessage: ChatMessage = {
                id: `image_${Date.now()}`,
                role: 'system',
                content: `Selected image: ${uris[0].fsPath}`,
                timestamp: Date.now()
            };
            this._chatSession.addMessage(contextMessage);
            await this._chatSession.save();
            this._update();
        }
    }

    private async _handleRecordAudio(): Promise<void> {
        // Placeholder for audio recording functionality
        vscode.window.showInformationMessage('Audio recording coming soon');
    }

    private async _handleToggleTTS(state: boolean): Promise<void> {
        // Update webview with new TTS state
        this._panel.webview.postMessage({ type: 'ttsState', isActive: state });
    }

    private async _handleChangeMode(mode: string): Promise<void> {
        // Implement mode change logic
        vscode.commands.executeCommand('codessa.changeMode', mode);
    }

    private async _handleChangeProvider(provider: string): Promise<void> {
        // Implement provider change logic
        vscode.commands.executeCommand('codessa.changeProvider', provider);
    }

    private async _handleChangeModel(model: string): Promise<void> {
        // Implement model change logic
        vscode.commands.executeCommand('codessa.changeModel', model);
    }

    private async _handleCancel(): Promise<void> {
        // Implement cancellation logic
        this._chatSession.setProcessing(false);
        this._update();
        // Additional cancellation logic as needed
    }

    private _update() {
        this._panel.webview.html = this._getWebviewContent();
    }

    private async _handleMessage(text: string) {
        if (!text.trim()) return;

        // Create user message
        const userMessage: ChatMessage = {
            id: `user_${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        // Add and save user message
        this._chatSession.addMessage(userMessage);
        await this._chatSession.save();
        this._update();

        // Set processing state
        this._chatSession.setProcessing(true);
        this._update();

        try {
            // Process message with operation mode
            const response = await this._mode.processMessage(text, this._agent, {
                type: this._mode.defaultContextType
            });

            // Add assistant message
            const assistantMessage: ChatMessage = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            };

            this._chatSession.addMessage(assistantMessage);
            await this._chatSession.save();
        } catch (error) {
            // Add error message if something went wrong
            const errorMessage: ChatMessage = {
                id: `error_${Date.now()}`,
                role: 'error',
                content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: Date.now()
            };

            this._chatSession.addMessage(errorMessage);
            await this._chatSession.save();
            logger.error('Error processing message:', error);
        } finally {
            this._chatSession.setProcessing(false);
            this._update();
        }
    }

    private _getWebviewContent(): string {
        const webview = this._panel.webview;

        // Get URIs for resources
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'chat.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js'));
        // Use CDN for codicons instead of local file
        const codiconsUri = vscode.Uri.parse('https://cdn.jsdelivr.net/npm/@vscode/codicons/dist/codicon.css');
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png'));

        const nonce = getNonce();

        // Get initial state
        const initialState = {
            messages: this._chatSession.getMessages(),
            isProcessing: this._chatSession.getProcessing(),
            mode: this._mode.id,
            agent: {
                name: this._agent.name,
                id: this._agent.id,
                description: this._agent.description || ''
            },
            isTTSActive: false,
            currentMode: this._mode.id || 'chat',
            availableProviders: [],
            currentProvider: '',
            availableModels: [],
            currentModel: ''
        };

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
                            <i class="codicon codicon-file-symlink-file"></i>
                        </button>
                        <button id="btn-input-paste" class="icon-button" title="Paste into Input">
                            <i class="codicon codicon-clippy"></i>
                        </button>
                        <button id="btn-input-clear" class="icon-button" title="Clear Input Text">
                            <i class="codicon codicon-trash"></i>
                        </button>
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
                        <button id="btn-attach-file" class="icon-button" title="Attach File">
                            <i class="codicon codicon-file-add"></i>
                        </button>
                        <button id="btn-upload-image" class="icon-button" title="Upload Image (Vision)">
                            <i class="codicon codicon-device-camera"></i>
                        </button>
                        <button id="btn-attach-folder" class="icon-button" title="Attach Folder">
                            <i class="codicon codicon-new-folder"></i>
                        </button>
                        <button id="btn-add-context" class="icon-button" title="Add Context (e.g., selected code)">
                            <i class="codicon codicon-folder-library"></i>
                        </button>
                    </div>

                    <!-- Container for Input Wrapper and TTS Button -->
                    <div class="input-area-bottom">
                        <!-- Main Input Wrapper (Textarea + Record/Send/Cancel) -->
                        <div class="input-wrapper">
                            <textarea id="message-input" placeholder="Type your message or use commands..." rows="1" aria-label="Chat message input"></textarea>
                            <div class="input-actions-main">
                                <button id="btn-record-audio" class="icon-button" title="Record Audio Input">
                                    <i class="codicon codicon-mic"></i>
                                </button>
                                <button id="btn-send" class="icon-button" title="Send Message" disabled>
                                    <i class="codicon codicon-send"></i>
                                </button>
                                <button id="btn-cancel" class="icon-button" title="Cancel Generation">
                                    <i class="codicon codicon-stop-circle"></i>
                                </button>
                            </div>
                        </div>

                        <!-- TTS Button Positioned via Flexbox -->
                        <button id="btn-toggle-tts" class="icon-button tts-button-side" title="Toggle Text-to-Speech Output">
                            <i class="codicon codicon-unmute"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- External Libraries -->
            <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.1/marked.min.js"></script>
            <script nonce="${nonce}" src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

            <!-- Initial State & Config -->
            <script nonce="${nonce}">
                window.initialState = ${JSON.stringify(initialState)};

                // Configure Markdown Parser (marked.js)
                marked.setOptions({
                    highlight: function(code, lang) {
                        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                        try {
                            return hljs.highlight(code, { language, ignoreIllegals: true }).value;
                        } catch (error) {
                            console.error("Highlight.js error:", error);
                            return hljs.highlightAuto(code).value;
                        }
                    },
                    breaks: true,
                    gfm: true,
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
        ChatPanel.currentPanel = undefined;

        // Clean up resources
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}