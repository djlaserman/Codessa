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
exports.ModeSelectorView = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("../utils");
const operationMode_1 = require("../modes/operationMode");
const logger_1 = require("../logger");
/**
 * Mode selector webview panel
 */
class ModeSelectorView {
    /**
     * Create or show the mode selector panel
     */
    static createOrShow(extensionUri, context) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it
        if (ModeSelectorView.currentPanel) {
            ModeSelectorView.currentPanel._panel.reveal(column);
            return ModeSelectorView.currentPanel;
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(ModeSelectorView.viewType, 'Codessa - Select Mode', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(extensionUri, 'resources')
            ]
        });
        const modeSelectorView = new ModeSelectorView(panel, extensionUri);
        // Register panel with extension context
        context.subscriptions.push(panel);
        return modeSelectorView;
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._onModeSelected = new vscode.EventEmitter();
        this.onModeSelected = this._onModeSelected.event;
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set initial HTML content
        this._update();
        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'selectMode':
                    this._handleModeSelection(message.modeId);
                    break;
            }
        }, null, this._disposables);
        // Cache the current panel
        ModeSelectorView.currentPanel = this;
    }
    /**
     * Handle mode selection
     */
    _handleModeSelection(modeId) {
        const mode = operationMode_1.operationModeRegistry.getMode(modeId);
        if (mode) {
            logger_1.logger.info(`Selected mode: ${mode.displayName} (${mode.id})`);
            this._onModeSelected.fire(mode);
            this._panel.dispose();
        }
        else {
            logger_1.logger.error(`Mode not found: ${modeId}`);
        }
    }
    /**
     * Update the webview content
     */
    _update() {
        const webview = this._panel.webview;
        webview.html = this._getWebviewContent(webview);
    }
    /**
     * Generate the webview HTML content
     */
    _getWebviewContent(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'modeSelector.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'modeSelector.css'));
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png'));
        const nonce = (0, utils_1.getNonce)();
        // Get all available modes
        const modes = operationMode_1.operationModeRegistry.getAllModes();
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
    dispose() {
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
exports.ModeSelectorView = ModeSelectorView;
ModeSelectorView.viewType = 'codessa.modeSelector';
//# sourceMappingURL=modeSelectorView.js.map