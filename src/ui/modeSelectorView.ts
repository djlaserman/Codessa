import * as vscode from 'vscode';
import { getNonce } from '../utils';
import { IOperationMode, operationModeRegistry } from '../modes/operationMode';
import { logger } from '../logger';

/**
 * Mode selector webview panel
 */
export class ModeSelectorView {
    public static readonly viewType = 'codessa.modeSelector';
    private static currentPanel: ModeSelectorView | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _onModeSelected: vscode.EventEmitter<IOperationMode> = new vscode.EventEmitter<IOperationMode>();
    
    public readonly onModeSelected = this._onModeSelected.event;

    /**
     * Create or show the mode selector panel
     */
    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext): ModeSelectorView {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
            
        // If we already have a panel, show it
        if (ModeSelectorView.currentPanel) {
            ModeSelectorView.currentPanel._panel.reveal(column);
            return ModeSelectorView.currentPanel;
        }
        
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            ModeSelectorView.viewType,
            'Codessa - Select Mode',
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
        
        const modeSelectorView = new ModeSelectorView(panel, extensionUri);
        
        // Register panel with extension context
        context.subscriptions.push(panel);
        
        return modeSelectorView;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        
        // Set initial HTML content
        this._update();
        
        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'selectMode':
                        this._handleModeSelection(message.modeId);
                        break;
                }
            },
            null,
            this._disposables
        );
        
        // Cache the current panel
        ModeSelectorView.currentPanel = this;
    }

    /**
     * Handle mode selection
     */
    private _handleModeSelection(modeId: string): void {
        const mode = operationModeRegistry.getMode(modeId);
        
        if (mode) {
            logger.info(`Selected mode: ${mode.displayName} (${mode.id})`);
            this._onModeSelected.fire(mode);
            this._panel.dispose();
        } else {
            logger.error(`Mode not found: ${modeId}`);
        }
    }

    /**
     * Update the webview content
     */
    private _update() {
        const webview = this._panel.webview;
        webview.html = this._getWebviewContent(webview);
    }

    /**
     * Generate the webview HTML content
     */
    private _getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'modeSelector.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'modeSelector.css'));
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png'));
        const nonce = getNonce();
        
        // Get all available modes
        const modes = operationModeRegistry.getAllModes();
        const serializedModes = JSON.stringify(modes.map(mode => ({
            id: mode.id,
            displayName: mode.displayName,
            description: mode.description,
            icon: mode.icon,
            requiresHumanVerification: mode.requiresHumanVerification,
            supportsMultipleAgents: mode.supportsMultipleAgents
        })));
        
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Codessa - Select Mode</title>
                <link rel="stylesheet" href="${styleUri}">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource};">
            </head>
            <body>
                <div class="mode-selector-container">
                    <header class="mode-selector-header">
                        <img src="${logoUri}" alt="Codessa Logo" class="logo" />
                        <h1>Select Operation Mode</h1>
                    </header>
                    
                    <div class="modes-grid" id="modes-grid">
                        <!-- Modes will be inserted here by JavaScript -->
                    </div>
                </div>
                
                <script nonce="${nonce}">
                    // Available modes
                    const modes = ${serializedModes};
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    /**
     * Dispose of the panel
     */
    public dispose() {
        ModeSelectorView.currentPanel = undefined;
        
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
