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
    private _cancelTokenSource: vscode.CancellationTokenSource | undefined;

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
            const command = message.command || message.type; // Support both command and type for backward compatibility
            logger.info(`Received message from webview: ${command}`);
            switch (command) {
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
                    // Open the unified Codessa settings panel
                    const { AllSettingsPanel } = await import('./allSettingsPanel');
                    AllSettingsPanel.createOrShow(this._extensionUri, this._chatSession['context']);
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
                case 'getProviders':
                    logger.info('Handling getProviders request from webview');
                    await this._handleGetProviders();
                    break;
                case 'getModels':
                    logger.info('Handling getModels request from webview');
                    await this._handleGetModels();
                    break;
            }
        }, undefined, this._disposables);

        // Send initial data to the webview
        this._sendInitialData();
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

                // Send message to webview to update UI
                this._panel.webview.postMessage({
                    command: 'addMessage',
                    message: contextMessage
                });

                vscode.window.showInformationMessage('Context added to chat');
            } else {
                vscode.window.showInformationMessage('No text selected. Please select code to add as context.');
            }
        } else {
            vscode.window.showInformationMessage('No active editor. Please open a file and select code to add as context.');
        }
    }

    private async _handleAttachFile(): Promise<void> {
        try {
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Attach'
            });

            if (uris && uris[0]) {
                // Get file extension for syntax highlighting
                const filePath = uris[0].fsPath;
                const fileName = filePath.split(/[\\/]/).pop() || '';
                const fileExt = fileName.includes('.') ? fileName.split('.').pop() || '' : '';

                // Read file content
                const fileContent = await vscode.workspace.fs.readFile(uris[0]);
                const text = Buffer.from(fileContent).toString('utf8');

                // Create message
                const contextMessage: ChatMessage = {
                    id: `file_${Date.now()}`,
                    role: 'system',
                    content: `File content from ${fileName}:\n\`\`\`${fileExt}\n${text}\n\`\`\``,
                    timestamp: Date.now()
                };

                // Save to session
                this._chatSession.addMessage(contextMessage);
                await this._chatSession.save();
                this._update();

                // Send to webview
                this._panel.webview.postMessage({
                    command: 'addMessage',
                    message: contextMessage
                });

                vscode.window.showInformationMessage(`File attached: ${fileName}`);
            }
        } catch (error) {
            logger.error('Error attaching file:', error);
            vscode.window.showErrorMessage(`Error attaching file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async _handleAttachFolder(): Promise<void> {
        try {
            const uri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Attach Folder'
            });

            if (uri && uri[0]) {
                // Get folder name
                const folderPath = uri[0].fsPath;
                const folderName = folderPath.split(/[\\/]/).pop() || folderPath;

                // Find files in folder (excluding common ignored patterns)
                const files = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(uri[0], '**/*'),
                    '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.vscode/**}'
                );

                // Format file paths to be relative to the folder
                const relativePaths = files.map(f => {
                    const fullPath = f.fsPath;
                    return fullPath.replace(folderPath, '').replace(/^[\\/]/, '');
                }).sort();

                // Create message
                const contextMessage: ChatMessage = {
                    id: `folder_${Date.now()}`,
                    role: 'system',
                    content: `Folder structure from ${folderName} (${files.length} files):\n\`\`\`\n${relativePaths.join('\n')}\n\`\`\``,
                    timestamp: Date.now()
                };

                // Save to session
                this._chatSession.addMessage(contextMessage);
                await this._chatSession.save();
                this._update();

                // Send to webview
                this._panel.webview.postMessage({
                    command: 'addMessage',
                    message: contextMessage
                });

                vscode.window.showInformationMessage(`Folder attached: ${folderName} (${files.length} files)`);
            }
        } catch (error) {
            logger.error('Error attaching folder:', error);
            vscode.window.showErrorMessage(`Error attaching folder: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async _handleUploadImage(): Promise<void> {
        try {
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: {
                    'Images': ['png', 'jpg', 'jpeg', 'gif', 'webp']
                },
                openLabel: 'Upload'
            });

            if (uris && uris[0]) {
                // Get image file name
                const imagePath = uris[0].fsPath;
                const imageName = imagePath.split(/[\\/]/).pop() || '';

                // Read image as base64 for future vision model support
                const imageData = await vscode.workspace.fs.readFile(uris[0]);
                const base64Image = Buffer.from(imageData).toString('base64');
                const mimeType = this._getMimeTypeFromExtension(imageName);

                // Create message with image reference
                const contextMessage: ChatMessage = {
                    id: `image_${Date.now()}`,
                    role: 'system',
                    content: `Uploaded image: ${imageName}\n\n![${imageName}](data:${mimeType};base64,${base64Image})`,
                    timestamp: Date.now()
                };

                // Save to session
                this._chatSession.addMessage(contextMessage);
                await this._chatSession.save();
                this._update();

                // Send to webview
                this._panel.webview.postMessage({
                    command: 'addMessage',
                    message: contextMessage
                });

                vscode.window.showInformationMessage(`Image uploaded: ${imageName}`);
            }
        } catch (error) {
            logger.error('Error uploading image:', error);
            vscode.window.showErrorMessage(`Error uploading image: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private _getMimeTypeFromExtension(filename: string): string {
        const ext = filename.toLowerCase().split('.').pop() || '';
        const mimeTypes: Record<string, string> = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'bmp': 'image/bmp'
        };

        return mimeTypes[ext] || 'image/png';
    }

    private async _handleRecordAudio(): Promise<void> {
        try {
            // For now, this is a placeholder for future implementation
            // In the future, we could use the system's audio recording capabilities
            // or implement a web-based audio recorder in the webview

            // Show a message to the user
            const result = await vscode.window.showInformationMessage(
                'Audio recording is coming soon. Would you like to use speech-to-text instead?',
                'Yes, use system STT', 'No'
            );

            if (result === 'Yes, use system STT') {
                // Prompt user to use system speech-to-text and paste result
                vscode.window.showInformationMessage(
                    'Please use your system speech-to-text tool (like Windows Speech Recognition or macOS Dictation) and paste the result into the chat input.'
                );
            }

            // Send message to webview to update UI if needed
            this._panel.webview.postMessage({
                command: 'recordingState',
                isRecording: false
            });
        } catch (error) {
            logger.error('Error handling audio recording:', error);
            vscode.window.showErrorMessage(`Error with audio recording: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async _handleToggleTTS(state: boolean): Promise<void> {
        try {
            // Update webview with new TTS state
            this._panel.webview.postMessage({
                command: 'ttsState',
                isActive: state
            });

            // Show confirmation to user
            vscode.window.showInformationMessage(
                state ? 'Text-to-speech enabled' : 'Text-to-speech disabled'
            );

            // In the future, we could implement actual TTS functionality here
            // using the system's TTS capabilities or a web-based TTS service
        } catch (error) {
            logger.error('Error toggling TTS:', error);
            vscode.window.showErrorMessage(`Error toggling TTS: ${error instanceof Error ? error.message : String(error)}`);
        }
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

    private async _handleGetProviders(): Promise<void> {
        try {
            // Use a simple hardcoded list of providers for now to ensure the UI works
            const providers = [
                { id: 'ollama', name: 'Ollama' },
                { id: 'openai', name: 'OpenAI' },
                { id: 'anthropic', name: 'Anthropic' },
                { id: 'googleai', name: 'Google AI' },
                { id: 'mistralai', name: 'Mistral AI' },
                { id: 'lmstudio', name: 'LM Studio' },
                { id: 'openrouter', name: 'OpenRouter' },
                { id: 'huggingface', name: 'HuggingFace' },
                { id: 'deepseek', name: 'DeepSeek' },
                { id: 'cohere', name: 'Cohere' }
            ];

            logger.info(`Sending ${providers.length} providers to webview`);

            // Send providers to webview with command property
            this._panel.webview.postMessage({
                command: 'providers',
                providers: providers
            });

            // Log success
            logger.info('Providers sent to webview successfully');
        } catch (error) {
            logger.error('Error sending providers to webview:', error);
        }
    }

    private async _handleGetModels(): Promise<void> {
        try {
            // Use hardcoded models for now to ensure the UI works
            const models = [
                // Ollama models
                { id: 'llama2', name: 'Llama 2', provider: 'ollama' },
                { id: 'mistral', name: 'Mistral', provider: 'ollama' },
                { id: 'codellama', name: 'Code Llama', provider: 'ollama' },
                { id: 'phi', name: 'Phi', provider: 'ollama' },

                // OpenAI models
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
                { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
                { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },

                // Anthropic models
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
                { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
                { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },

                // Google AI models
                { id: 'gemini-pro', name: 'Gemini Pro', provider: 'googleai' },
                { id: 'gemini-ultra', name: 'Gemini Ultra', provider: 'googleai' },

                // Mistral AI models
                { id: 'mistral-large', name: 'Mistral Large', provider: 'mistralai' },
                { id: 'mistral-medium', name: 'Mistral Medium', provider: 'mistralai' },
                { id: 'mistral-small', name: 'Mistral Small', provider: 'mistralai' },

                // LM Studio models
                { id: 'default', name: 'Default Model', provider: 'lmstudio' },

                // Other providers
                { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openrouter' },
                { id: 'mistralai/Mistral-7B-Instruct-v0.2', name: 'Mistral 7B', provider: 'huggingface' },
                { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek' },
                { id: 'command', name: 'Command', provider: 'cohere' }
            ];

            logger.info(`Sending ${models.length} models to webview`);

            // Send models to webview with command property
            this._panel.webview.postMessage({
                command: 'models',
                models: models
            });

            // Log success
            logger.info('Models sent to webview successfully');
        } catch (error) {
            logger.error('Error sending models to webview:', error);
        }
    }

    // Removed unused method

    private async _sendInitialData(): Promise<void> {
        try {
            logger.info('Sending initial data to webview');

            // Send current settings
            const currentSettings = {
                mode: this._mode.id,
                provider: this._agent.llmConfig?.provider || 'ollama', // Default to ollama if not set
                model: this._agent.llmConfig?.modelId || 'llama2' // Default to llama2 if not set
            };

            logger.info(`Sending current settings: mode=${currentSettings.mode}, provider=${currentSettings.provider}, model=${currentSettings.model}`);

            // Send with command property
            this._panel.webview.postMessage({
                command: 'currentSettings',
                settings: currentSettings
            });

            // Wait a bit before sending providers and models to ensure the webview is ready
            setTimeout(async () => {
                // Send providers
                logger.info('Sending providers to webview');
                await this._handleGetProviders();

                // Wait a bit before sending models to ensure providers are processed
                setTimeout(async () => {
                    logger.info('Sending models to webview');
                    await this._handleGetModels();
                }, 500);
            }, 500);

            logger.info('Initial data sending sequence started');
        } catch (error) {
            logger.error('Error sending initial data to webview:', error);
        }
    }

    private async _handleCancel(): Promise<void> {
        logger.info('Cancel button clicked, attempting to cancel operation');

        // Cancel the ongoing request
        if (this._cancelTokenSource) {
            try {
                this._cancelTokenSource.cancel();
                logger.info('Cancellation token cancelled');
            } catch (error) {
                logger.error('Error cancelling token:', error);
            } finally {
                this._cancelTokenSource.dispose();
                this._cancelTokenSource = undefined;
            }
        } else {
            logger.warn('No cancellation token source found to cancel');
        }

        // Add a message indicating the operation was cancelled
        const cancelMessage: ChatMessage = {
            id: `system_${Date.now()}`,
            role: 'system',
            content: 'Operation cancelled by user.',
            timestamp: Date.now()
        };
        this._chatSession.addMessage(cancelMessage);
        await this._chatSession.save();

        // Update UI state immediately
        this._chatSession.setProcessing(false);
        this._update();

        // Send immediate update to the webview
        this._panel.webview.postMessage({
            command: 'processingState',
            isProcessing: false
        });

        // Also send the cancellation message directly
        this._panel.webview.postMessage({
            command: 'addMessage',
            message: cancelMessage
        });
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

        // Create a new cancellation token source for this request
        if (this._cancelTokenSource) {
            this._cancelTokenSource.dispose();
        }
        this._cancelTokenSource = new vscode.CancellationTokenSource();

        try {
            // Process message with operation mode and pass the cancellation token
            const response = await this._mode.processMessage(
                text,
                this._agent,
                {
                    type: this._mode.defaultContextType
                },
                {
                    cancellationToken: this._cancelTokenSource.token
                }
            );

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
            // Don't add error message if it was cancelled by the user
            if (this._cancelTokenSource?.token.isCancellationRequested) {
                logger.info('Message processing cancelled by user');
            } else {
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
            }
        } finally {
            // Clean up cancellation token source
            if (this._cancelTokenSource) {
                this._cancelTokenSource.dispose();
                this._cancelTokenSource = undefined;
            }

            // Reset processing state
            this._chatSession.setProcessing(false);
            this._update();
        }
    }

    private _getWebviewContent(): string {
        const webview = this._panel.webview;

        // Get URIs for resources
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'chat.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js'));
        // Codicons are loaded directly in the HTML
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
            currentModel: '',
            username: vscode.workspace.getConfiguration('codessa').get('user.email') || 'User'
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
                script-src 'nonce-${nonce}' https://cdnjs.cloudflare.com 'unsafe-inline';
                style-src ${webview.cspSource} 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
                font-src https://cdn.jsdelivr.net;
                connect-src 'none';
            ">
            <script>
                // Direct debug script
                window.onerror = function(message, source, lineno, colno, error) {
                    console.error('Error:', message, 'at', source, lineno, colno);
                    document.body.innerHTML += '<div style="color:red;position:fixed;top:0;left:0;z-index:9999;background:white;padding:10px;">' +
                        'Error: ' + message + '<br>Line: ' + lineno + '</div>';
                    return true;
                };
            </script>
        </head>
        <body>
            <div id="debug-panel" style="position:fixed; top:0; right:0; background:rgba(0,0,0,0.8); color:white; padding:10px; z-index:9999; max-height:300px; overflow:auto; font-size:12px; display:none;">
                <button onclick="this.parentNode.style.display='none'" style="position:absolute; top:5px; right:5px;">X</button>
                <h3>Debug Info</h3>
                <div id="debug-providers">Providers: None</div>
                <div id="debug-models">Models: None</div>
                <div id="debug-messages"></div>
                <button onclick="document.getElementById('debug-messages').innerHTML = ''">Clear</button>
                <button onclick="vscode.postMessage({command: 'getProviders'})">Request Providers</button>
                <button onclick="vscode.postMessage({command: 'getModels'})">Request Models</button>
            </div>
            <button id="toggle-debug" style="position:fixed; bottom:10px; right:10px; z-index:9998; background:rgba(0,0,0,0.5); color:white; border:none; padding:5px 10px; cursor:pointer;">Debug</button>
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

                <!-- Debug Panel -->
                <div id="debug-panel" style="display: none; padding: 10px; background-color: #1e1e1e; border-top: 1px solid #333; max-height: 200px; overflow-y: auto;":

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