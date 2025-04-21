"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPanel = exports.ChatSession = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const utils_1 = require("../utils");
const llmService_1 = require("../llm/llmService");
/**
 * Manages a chat session's state and messages
 */
class ChatSession {
    constructor(context) {
        this.context = context;
        this.messages = [];
        this.isProcessing = false;
    }
    addMessage(message) {
        this.messages.push(message);
    }
    getMessages() {
        return [...this.messages];
    }
    clearMessages() {
        this.messages = [];
    }
    setProcessing(isProcessing) {
        this.isProcessing = isProcessing;
    }
    getProcessing() {
        return this.isProcessing;
    }
    async save() {
        try {
            await this.context.globalState.update('chatSession', {
                messages: this.messages,
                timestamp: Date.now()
            });
            logger_1.logger.debug('Chat session saved successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to save chat session:', error);
        }
    }
    async load() {
        try {
            const saved = this.context.globalState.get('chatSession');
            if (saved) {
                this.messages = saved.messages;
                logger_1.logger.debug(`Loaded chat session with ${this.messages.length} messages`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to load chat session:', error);
        }
    }
}
exports.ChatSession = ChatSession;
/**
 * A webview panel that displays a chat interface
 */
class ChatPanel {
    static createOrShow(extensionUri, agent, context, mode) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return ChatPanel.currentPanel;
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(ChatPanel.viewType, `Chat with ${agent.name}`, column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [extensionUri],
            retainContextWhenHidden: true
        });
        ChatPanel.currentPanel = new ChatPanel(panel, agent, extensionUri, context, mode);
        return ChatPanel.currentPanel;
    }
    constructor(panel, agent, extensionUri, context, mode) {
        this._disposables = [];
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
            logger_1.logger.info(`Received message from webview: ${command}`);
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
                case 'getProviders':
                    logger_1.logger.info('Handling getProviders request from webview');
                    await this._handleGetProviders();
                    break;
                case 'getModels':
                    logger_1.logger.info('Handling getModels request from webview');
                    await this._handleGetModels();
                    break;
            }
        }, undefined, this._disposables);
        // Send initial data to the webview
        this._sendInitialData();
    }
    async _handleExportChat() {
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
                await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
                vscode.window.showInformationMessage('Chat exported successfully');
            }
        }
        catch (error) {
            logger_1.logger.error('Error exporting chat:', error);
            vscode.window.showErrorMessage('Failed to export chat');
        }
    }
    async _handleAddContext() {
        // Get selected text from active editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const text = editor.document.getText(selection);
            if (text) {
                const contextMessage = {
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
    async _handleAttachFile() {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Attach'
        });
        if (uris && uris[0]) {
            const fileContent = await vscode.workspace.fs.readFile(uris[0]);
            const text = Buffer.from(fileContent).toString('utf8');
            const contextMessage = {
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
    async _handleAttachFolder() {
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Attach Folder'
        });
        if (uri && uri[0]) {
            const files = await vscode.workspace.findFiles(new vscode.RelativePattern(uri[0], '**/*'), '**/node_modules/**');
            const contextMessage = {
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
    async _handleUploadImage() {
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
            const contextMessage = {
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
    async _handleRecordAudio() {
        // Placeholder for audio recording functionality
        vscode.window.showInformationMessage('Audio recording coming soon');
    }
    async _handleToggleTTS(state) {
        // Update webview with new TTS state
        this._panel.webview.postMessage({ type: 'ttsState', isActive: state });
    }
    async _handleChangeMode(mode) {
        // Implement mode change logic
        vscode.commands.executeCommand('codessa.changeMode', mode);
    }
    async _handleChangeProvider(provider) {
        // Implement provider change logic
        vscode.commands.executeCommand('codessa.changeProvider', provider);
    }
    async _handleChangeModel(model) {
        // Implement model change logic
        vscode.commands.executeCommand('codessa.changeModel', model);
    }
    async _handleGetProviders() {
        try {
            // Always get all provider IDs first
            const allProviderIds = llmService_1.llmService.listProviderIds();
            logger_1.logger.info(`Found ${allProviderIds.length} total providers`);
            // Create a map of all providers with basic info
            const allProviders = allProviderIds.map(id => ({
                id: id,
                name: id.charAt(0).toUpperCase() + id.slice(1) // Capitalize first letter
            }));
            // Try to get configured providers for better display names
            const configuredProviders = llmService_1.llmService.getConfiguredProviders();
            logger_1.logger.info(`Found ${configuredProviders.length} configured providers`);
            // Replace basic provider info with configured provider info where available
            for (const configuredProvider of configuredProviders) {
                const index = allProviders.findIndex(p => p.id === configuredProvider.providerId);
                if (index !== -1) {
                    allProviders[index] = {
                        id: configuredProvider.providerId,
                        name: configuredProvider.displayName
                    };
                }
            }
            logger_1.logger.info(`Sending ${allProviders.length} providers to webview: ${allProviders.map(p => p.id).join(', ')}`);
            // Send all providers to webview
            this._panel.webview.postMessage({
                command: 'providers',
                providers: allProviders
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting providers:', error);
            // Send a fallback list of providers
            const fallbackProviders = [
                { id: 'ollama', name: 'Ollama' },
                { id: 'openai', name: 'OpenAI' },
                { id: 'anthropic', name: 'Anthropic' },
                { id: 'googleai', name: 'Google AI' },
                { id: 'mistralai', name: 'Mistral AI' }
            ];
            logger_1.logger.info(`Sending ${fallbackProviders.length} fallback providers to webview`);
            this._panel.webview.postMessage({
                command: 'providers',
                providers: fallbackProviders
            });
        }
    }
    async _handleGetModels() {
        try {
            // Get all available models from the LLM service
            const models = [];
            // Get all provider IDs
            const allProviderIds = llmService_1.llmService.listProviderIds();
            logger_1.logger.info(`Found ${allProviderIds.length} total providers for models`);
            // Get models from each configured provider
            const configuredProviders = llmService_1.llmService.getConfiguredProviders();
            logger_1.logger.info(`Found ${configuredProviders.length} configured providers for models`);
            // Try to get models from configured providers
            for (const provider of configuredProviders) {
                try {
                    logger_1.logger.info(`Getting models for provider ${provider.providerId}`);
                    const providerModels = await provider.listModels();
                    logger_1.logger.info(`Found ${providerModels.length} models for provider ${provider.providerId}`);
                    if (providerModels.length > 0) {
                        providerModels.forEach(model => {
                            models.push({
                                id: model.id,
                                name: model.name || model.id,
                                provider: provider.providerId
                            });
                        });
                    }
                    else {
                        // Add default models for this provider if none were found
                        logger_1.logger.info(`No models found for ${provider.providerId}, adding defaults`);
                        models.push(...this._getDefaultModelsForProvider(provider.providerId));
                    }
                }
                catch (err) {
                    logger_1.logger.error(`Error getting models for provider ${provider.providerId}:`, err);
                    // Add default models for this provider if there was an error
                    logger_1.logger.info(`Adding default models for ${provider.providerId} due to error`);
                    models.push(...this._getDefaultModelsForProvider(provider.providerId));
                }
            }
            // For providers that aren't configured, add default models
            for (const providerId of allProviderIds) {
                if (!configuredProviders.some(p => p.providerId === providerId) &&
                    !models.some(m => m.provider === providerId)) {
                    logger_1.logger.info(`Adding default models for unconfigured provider ${providerId}`);
                    models.push(...this._getDefaultModelsForProvider(providerId));
                }
            }
            logger_1.logger.info(`Sending ${models.length} models to webview: ${models.slice(0, 5).map(m => m.id).join(', ')}${models.length > 5 ? '...' : ''}`);
            // Send models to webview
            this._panel.webview.postMessage({
                command: 'models',
                models: models
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting models:', error);
            // Send fallback models
            const fallbackModels = [
                // Ollama models
                { id: 'llama2', name: 'Llama 2', provider: 'ollama' },
                { id: 'mistral', name: 'Mistral', provider: 'ollama' },
                { id: 'codellama', name: 'Code Llama', provider: 'ollama' },
                // OpenAI models
                { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
                { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
                // Anthropic models
                { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
                { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
                // Google AI models
                { id: 'gemini-pro', name: 'Gemini Pro', provider: 'googleai' },
                // Mistral AI models
                { id: 'mistral-large', name: 'Mistral Large', provider: 'mistralai' }
            ];
            logger_1.logger.info(`Sending ${fallbackModels.length} fallback models to webview`);
            this._panel.webview.postMessage({
                command: 'models',
                models: fallbackModels
            });
        }
    }
    _getDefaultModelsForProvider(providerId) {
        switch (providerId) {
            case 'ollama':
                return [
                    { id: 'llama2', name: 'Llama 2', provider: 'ollama' },
                    { id: 'mistral', name: 'Mistral', provider: 'ollama' },
                    { id: 'codellama', name: 'Code Llama', provider: 'ollama' },
                    { id: 'phi', name: 'Phi', provider: 'ollama' }
                ];
            case 'openai':
                return [
                    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
                    { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
                    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' }
                ];
            case 'anthropic':
                return [
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
                    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
                    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' }
                ];
            case 'googleai':
                return [
                    { id: 'gemini-pro', name: 'Gemini Pro', provider: 'googleai' },
                    { id: 'gemini-ultra', name: 'Gemini Ultra', provider: 'googleai' }
                ];
            case 'mistralai':
                return [
                    { id: 'mistral-large', name: 'Mistral Large', provider: 'mistralai' },
                    { id: 'mistral-medium', name: 'Mistral Medium', provider: 'mistralai' },
                    { id: 'mistral-small', name: 'Mistral Small', provider: 'mistralai' }
                ];
            case 'lmstudio':
                return [
                    { id: 'default', name: 'Default Model', provider: 'lmstudio' }
                ];
            case 'openrouter':
                return [
                    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openrouter' },
                    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'openrouter' }
                ];
            case 'huggingface':
                return [
                    { id: 'mistralai/Mistral-7B-Instruct-v0.2', name: 'Mistral 7B', provider: 'huggingface' }
                ];
            case 'deepseek':
                return [
                    { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek' }
                ];
            case 'cohere':
                return [
                    { id: 'command', name: 'Command', provider: 'cohere' },
                    { id: 'command-light', name: 'Command Light', provider: 'cohere' }
                ];
            default:
                return [
                    { id: 'default', name: 'Default Model', provider: providerId }
                ];
        }
    }
    async _sendInitialData() {
        logger_1.logger.info('Sending initial data to webview');
        // Send current settings
        const currentSettings = {
            mode: this._mode.id,
            provider: this._agent.llmConfig?.provider,
            model: this._agent.llmConfig?.modelId
        };
        logger_1.logger.info(`Sending current settings: mode=${currentSettings.mode}, provider=${currentSettings.provider}, model=${currentSettings.model}`);
        this._panel.webview.postMessage({
            command: 'currentSettings',
            settings: currentSettings
        });
        // Wait a bit before sending providers and models to ensure the webview is ready
        setTimeout(async () => {
            // Send providers and models
            logger_1.logger.info('Sending providers and models to webview');
            await this._handleGetProviders();
            // Wait a bit before sending models to ensure providers are processed
            setTimeout(async () => {
                await this._handleGetModels();
            }, 500);
        }, 500);
    }
    async _handleCancel() {
        logger_1.logger.info('Cancel button clicked, attempting to cancel operation');
        // Cancel the ongoing request
        if (this._cancelTokenSource) {
            try {
                this._cancelTokenSource.cancel();
                logger_1.logger.info('Cancellation token cancelled');
            }
            catch (error) {
                logger_1.logger.error('Error cancelling token:', error);
            }
            finally {
                this._cancelTokenSource.dispose();
                this._cancelTokenSource = undefined;
            }
        }
        else {
            logger_1.logger.warn('No cancellation token source found to cancel');
        }
        // Add a message indicating the operation was cancelled
        const cancelMessage = {
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
            type: 'processingState',
            isProcessing: false
        });
        // Also send the cancellation message directly
        this._panel.webview.postMessage({
            type: 'addMessage',
            message: cancelMessage
        });
    }
    _update() {
        this._panel.webview.html = this._getWebviewContent();
    }
    async _handleMessage(text) {
        if (!text.trim())
            return;
        // Create user message
        const userMessage = {
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
            const response = await this._mode.processMessage(text, this._agent, {
                type: this._mode.defaultContextType
            }, {
                cancellationToken: this._cancelTokenSource.token
            });
            // Add assistant message
            const assistantMessage = {
                id: `assistant_${Date.now()}`,
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            };
            this._chatSession.addMessage(assistantMessage);
            await this._chatSession.save();
        }
        catch (error) {
            // Don't add error message if it was cancelled by the user
            if (this._cancelTokenSource?.token.isCancellationRequested) {
                logger_1.logger.info('Message processing cancelled by user');
            }
            else {
                // Add error message if something went wrong
                const errorMessage = {
                    id: `error_${Date.now()}`,
                    role: 'error',
                    content: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    timestamp: Date.now()
                };
                this._chatSession.addMessage(errorMessage);
                await this._chatSession.save();
                logger_1.logger.error('Error processing message:', error);
            }
        }
        finally {
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
    _getWebviewContent() {
        const webview = this._panel.webview;
        // Get URIs for resources
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', 'chat.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js'));
        // Codicons are loaded directly in the HTML
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png'));
        const nonce = (0, utils_1.getNonce)();
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
    dispose() {
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
exports.ChatPanel = ChatPanel;
ChatPanel.viewType = 'codessaChat';
//# sourceMappingURL=chatView.js.map