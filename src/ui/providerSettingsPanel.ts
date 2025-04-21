import * as vscode from 'vscode';
import { getNonce } from './utils';
import { llmService } from '../llm/llmService';
import { logger } from '../logger';
import { LLMProviderConfig } from '../llm/llmProvider';

/**
 * Panel for configuring LLM provider settings
 */
export class ProviderSettingsPanel {
    public static currentPanel: ProviderSettingsPanel | undefined;
    private static readonly viewType = 'providerSettings';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _context: vscode.ExtensionContext;
    private _providerId: string;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Create or show the provider settings panel
     */
    public static createOrShow(extensionUri: vscode.Uri, providerId: string, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ProviderSettingsPanel.currentPanel) {
            ProviderSettingsPanel.currentPanel._panel.reveal(column);
            ProviderSettingsPanel.currentPanel._providerId = providerId;
            ProviderSettingsPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            ProviderSettingsPanel.viewType,
            `${providerId} Settings`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'resources')
                ],
                retainContextWhenHidden: true
            }
        );

        ProviderSettingsPanel.currentPanel = new ProviderSettingsPanel(panel, extensionUri, providerId, context);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, providerId: string, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._providerId = providerId;
        this._context = context;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'getProviderConfig':
                        await this._handleGetProviderConfig();
                        break;
                    case 'saveProviderConfig':
                        await this._handleSaveProviderConfig(message.data);
                        break;
                    case 'testConnection':
                        await this._handleTestConnection(message.data);
                        break;
                    case 'setDefaultProvider':
                        await this._handleSetDefaultProvider();
                        break;
                    case 'getModels':
                        await this._handleGetModels();
                        break;
                    case 'cancel':
                        this._panel.dispose();
                        break;
                    case 'log':
                        if (message.level === 'error') {
                            logger.error(message.message);
                        } else if (message.level === 'warn') {
                            logger.warn(message.message);
                        } else if (message.level === 'debug') {
                            logger.debug(message.message);
                        } else {
                            logger.info(message.message);
                        }
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Handle getting the provider configuration
     */
    private async _handleGetProviderConfig(): Promise<void> {
        try {
            const provider = llmService.getProvider(this._providerId);
            if (!provider) {
                throw new Error(`Provider ${this._providerId} not found`);
            }

            // Get the provider configuration
            const config = provider.getConfig();

            // Get the configuration fields
            const fields = provider.getConfigurationFields();

            // Get provider metadata
            const metadata = {
                providerId: provider.providerId,
                displayName: provider.displayName,
                description: provider.description,
                website: provider.website,
                requiresApiKey: provider.requiresApiKey,
                supportsEndpointConfiguration: provider.supportsEndpointConfiguration,
                defaultEndpoint: provider.defaultEndpoint,
                defaultModel: provider.defaultModel
            };

            // Check if this is the default provider
            const isDefault = llmService.getDefaultProvider()?.providerId === this._providerId;

            // Send the data to the webview
            this._panel.webview.postMessage({
                type: 'providerConfig',
                config,
                fields,
                metadata,
                isDefault
            });
        } catch (error) {
            logger.error('Error getting provider config:', error);

            this._panel.webview.postMessage({
                type: 'error',
                message: `Error getting provider configuration: ${error}`
            });
        }
    }

    /**
     * Handle saving the provider configuration
     */
    private async _handleSaveProviderConfig(data: LLMProviderConfig): Promise<void> {
        try {
            const success = await llmService.updateProviderConfig(this._providerId, data);

            if (success) {
                this._panel.webview.postMessage({
                    type: 'saveResult',
                    success: true,
                    message: `Configuration for ${this._providerId} saved successfully.`
                });
            } else {
                throw new Error(`Failed to save configuration for ${this._providerId}`);
            }
        } catch (error) {
            logger.error('Error saving provider config:', error);

            this._panel.webview.postMessage({
                type: 'saveResult',
                success: false,
                message: `Error saving provider configuration: ${error}`
            });
        }
    }

    /**
     * Handle testing the connection to the provider
     */
    private async _handleTestConnection(data: { modelId: string }): Promise<void> {
        try {
            const provider = llmService.getProvider(this._providerId);
            if (!provider) {
                throw new Error(`Provider ${this._providerId} not found`);
            }

            if (!provider.isConfigured()) {
                throw new Error(`Provider ${this._providerId} is not configured. Please save your configuration first.`);
            }

            const testResult = await provider.testConnection(data.modelId);

            this._panel.webview.postMessage({
                type: 'connectionTestResult',
                success: testResult.success,
                message: testResult.message
            });
        } catch (error) {
            logger.error('Error testing connection:', error);

            this._panel.webview.postMessage({
                type: 'connectionTestResult',
                success: false,
                message: `Connection test failed: ${error}`
            });
        }
    }

    /**
     * Handle setting this provider as the default
     */
    private async _handleSetDefaultProvider(): Promise<void> {
        try {
            const success = await llmService.setDefaultProvider(this._providerId);

            if (success) {
                this._panel.webview.postMessage({
                    type: 'setDefaultResult',
                    success: true,
                    message: `${this._providerId} set as default provider.`
                });
            } else {
                throw new Error(`Failed to set ${this._providerId} as default provider`);
            }
        } catch (error) {
            logger.error('Error setting default provider:', error);

            this._panel.webview.postMessage({
                type: 'setDefaultResult',
                success: false,
                message: `Error setting default provider: ${error}`
            });
        }
    }

    /**
     * Handle getting the available models from the provider
     */
    private async _handleGetModels(): Promise<void> {
        try {
            const provider = llmService.getProvider(this._providerId);
            if (!provider) {
                throw new Error(`Provider ${this._providerId} not found`);
            }

            if (!provider.isConfigured()) {
                throw new Error(`Provider ${this._providerId} is not configured. Please save your configuration first.`);
            }

            // Get the available models
            const models = await provider.listModels();

            // Send the models to the webview
            this._panel.webview.postMessage({
                type: 'models',
                models: models
            });
        } catch (error) {
            logger.error('Error getting models:', error);

            this._panel.webview.postMessage({
                type: 'error',
                message: `Error getting models: ${error}`
            });
        }
    }

    /**
     * Generate HTML for the webview panel
     */
    private _update() {
        const webview = this._panel.webview;
        webview.html = this._getWebviewContent(webview);
    }

    /**
     * Generate the webview HTML content for provider settings
     */
    private _getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'providerSettings.js')
        );

        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'providerSettings.css')
        );

        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png')
        );

        const nonce = getNonce();

        // Generate the HTML content
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${this._providerId} Settings</title>
                <link rel="stylesheet" href="${styleUri}">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}' 'unsafe-inline'; style-src ${webview.cspSource};">
            </head>
            <body>
                <div class="config-container">
                    <header class="config-header">
                        <img src="${logoUri}" alt="Codessa Logo" class="logo" />
                        <h1><span id="provider-display-name">${this._providerId}</span> Settings</h1>
                    </header>

                    <div class="provider-info">
                        <p id="provider-description"></p>
                        <p id="provider-website"></p>
                    </div>

                    <div class="config-form">
                        <div class="form-section">
                            <h2>Provider Configuration</h2>
                            <div id="config-fields-container">
                                <!-- Configuration fields will be inserted here -->
                            </div>
                        </div>

                        <div class="form-section">
                            <h2>Models</h2>
                            <div class="form-group">
                                <label for="default-model">Default Model:</label>
                                <select id="default-model" class="form-control">
                                    <option value="">-- Select a model --</option>
                                    <!-- Models will be populated dynamically -->
                                </select>
                                <div class="description">The default model to use with this provider</div>
                            </div>
                            <div class="form-group">
                                <button id="btn-refresh-models" class="btn secondary">Refresh Models</button>
                                <span id="refresh-status"></span>
                            </div>
                            <div class="form-group models-list-container">
                                <label>Available Models:</label>
                                <div id="models-list" class="models-list">
                                    <!-- Models will be listed here -->
                                    <div class="loading-models">Loading models...</div>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2>Connection Test</h2>
                            <div class="form-group">
                                <label for="test-model">Model to Test:</label>
                                <select id="test-model" class="form-control">
                                    <option value="">-- Select a model --</option>
                                    <!-- Models will be populated dynamically -->
                                </select>
                            </div>
                            <div class="form-group">
                                <button id="btn-test-connection" class="btn secondary">Test Connection</button>
                                <span id="connection-status"></span>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2>Default Provider</h2>
                            <div class="form-group">
                                <button id="btn-set-default" class="btn secondary">Set as Default Provider</button>
                                <span id="default-status"></span>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button id="btn-save" class="btn primary">Save Configuration</button>
                            <button id="btn-cancel" class="btn secondary">Close</button>
                        </div>
                    </div>
                </div>

                <script nonce="${nonce}">
                    // Initial data
                    const providerId = "${this._providerId}";
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    /**
     * Clean up resources
     */
    public dispose() {
        ProviderSettingsPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
