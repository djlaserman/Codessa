import * as vscode from 'vscode';
import { logger } from '../logger';
import { getNonce } from '../utils';
import { memoryManager } from '../memory/memoryManager';
import { MemoryEntry, MemorySearchOptions, MemorySettings, MemorySource, MemoryType } from '../memory/types';

/**
 * Memory View
 * Provides a UI for viewing and managing memories
 */
export class MemoryView {
    public static readonly viewType = 'codessa.memoryView';
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Show the memory view
     */
    public async show() {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        // Create panel
        this.panel = vscode.window.createWebviewPanel(
            MemoryView.viewType,
            'Codessa Memory',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this.context.extensionUri, 'media')
                ]
            }
        );

        // Set HTML content
        this.panel.webview.html = await this.getHtmlForWebview(this.panel.webview);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                try {
                    switch (message.command) {
                        case 'getMemories':
                            await this.handleGetMemories();
                            break;
                        case 'searchMemories':
                            await this.handleSearchMemories(message.query, message.options);
                            break;
                        case 'deleteMemory':
                            await this.handleDeleteMemory(message.id);
                            break;
                        case 'clearMemories':
                            await this.handleClearMemories();
                            break;
                        case 'getMemorySettings':
                            await this.handleGetMemorySettings();
                            break;
                        case 'updateMemorySettings':
                            await this.handleUpdateMemorySettings(message.settings);
                            break;
                        case 'chunkFile':
                            await this.handleChunkFile();
                            break;
                        case 'chunkWorkspace':
                            await this.handleChunkWorkspace();
                            break;
                    }
                } catch (error) {
                    logger.error('Error handling memory view message:', error);
                    this.panel?.webview.postMessage({
                        command: 'error',
                        message: error instanceof Error ? error.message : String(error)
                    });
                }
            },
            null,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(
            () => {
                this.panel = undefined;

                // Dispose of all disposables
                while (this.disposables.length) {
                    const disposable = this.disposables.pop();
                    if (disposable) {
                        disposable.dispose();
                    }
                }
            },
            null,
            this.disposables
        );

        // Register memory change listener
        memoryManager.onMemoriesChanged(() => {
            this.handleGetMemories();
        });
    }

    /**
     * Handle get memories request
     */
    private async handleGetMemories() {
        try {
            const memories = await memoryManager.getMemories();

            this.panel?.webview.postMessage({
                command: 'memories',
                memories
            });
        } catch (error) {
            logger.error('Error getting memories:', error);
            this.panel?.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle search memories request
     */
    private async handleSearchMemories(query: string, options: Partial<MemorySearchOptions> = {}) {
        try {
            const memories = await memoryManager.searchSimilarMemories(query, options);

            this.panel?.webview.postMessage({
                command: 'searchResults',
                memories
            });
        } catch (error) {
            logger.error('Error searching memories:', error);
            this.panel?.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle delete memory request
     */
    private async handleDeleteMemory(id: string) {
        try {
            const success = await memoryManager.deleteMemory(id);

            this.panel?.webview.postMessage({
                command: 'memoryDeleted',
                id,
                success
            });

            // Refresh memories
            await this.handleGetMemories();
        } catch (error) {
            logger.error(`Error deleting memory ${id}:`, error);
            this.panel?.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle clear memories request
     */
    private async handleClearMemories() {
        try {
            await memoryManager.clearMemories();

            this.panel?.webview.postMessage({
                command: 'memoriesCleared'
            });

            // Refresh memories
            await this.handleGetMemories();
        } catch (error) {
            logger.error('Error clearing memories:', error);
            this.panel?.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle get memory settings request
     */
    private async handleGetMemorySettings() {
        try {
            const settings = memoryManager.getMemorySettings();

            this.panel?.webview.postMessage({
                command: 'memorySettings',
                settings
            });
        } catch (error) {
            logger.error('Error getting memory settings:', error);
            this.panel?.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle update memory settings request
     */
    private async handleUpdateMemorySettings(settings: Partial<MemorySettings>) {
        try {
            const success = await memoryManager.updateMemorySettings(settings);

            if (success) {
                this.panel?.webview.postMessage({
                    command: 'memorySettingsUpdated',
                    success: true
                });

                // Refresh settings
                await this.handleGetMemorySettings();
            } else {
                this.panel?.webview.postMessage({
                    command: 'error',
                    message: 'Failed to update memory settings. Please check the logs for more information.'
                });
            }
        } catch (error) {
            logger.error('Error updating memory settings:', error);
            this.panel?.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle chunk file request
     */
    private async handleChunkFile() {
        try {
            // Show file picker
            const fileUris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Chunk File',
                filters: {
                    'All Files': ['*']
                }
            });

            if (!fileUris || fileUris.length === 0) {
                return;
            }

            // Chunk file
            const filePath = fileUris[0].fsPath;
            const memories = await memoryManager.chunkFile(filePath);

            this.panel?.webview.postMessage({
                command: 'fileChunked',
                filePath,
                count: memories.length
            });

            // Refresh memories
            await this.handleGetMemories();
        } catch (error) {
            logger.error('Error chunking file:', error);
            this.panel?.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle chunk workspace request
     */
    private async handleChunkWorkspace() {
        try {
            // Show confirmation dialog
            const result = await vscode.window.showWarningMessage(
                'This will chunk all files in the workspace and add them to memory. This may take a while. Continue?',
                { modal: true },
                'Yes',
                'No'
            );

            if (result !== 'Yes') {
                return;
            }

            // Get workspace folder
            const workspaceFolders = vscode.workspace.workspaceFolders;

            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder open');
            }

            // Show progress
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Chunking workspace files',
                    cancellable: true
                },
                async (progress, token) => {
                    // Chunk workspace
                    const folderPath = workspaceFolders[0].uri.fsPath;
                    const memories = await memoryManager.chunkWorkspace(folderPath);

                    this.panel?.webview.postMessage({
                        command: 'workspaceChunked',
                        folderPath,
                        count: memories.length
                    });

                    // Refresh memories
                    await this.handleGetMemories();
                }
            );
        } catch (error) {
            logger.error('Error chunking workspace:', error);
            this.panel?.webview.postMessage({
                command: 'error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Get HTML for webview
     */
    private async getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        // Get resource URIs
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'memoryView.js')
        );

        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'memoryView.css')
        );

        const codiconsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'codicon.css')
        );

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <link href="${styleUri}" rel="stylesheet" />
            <link href="${codiconsUri}" rel="stylesheet" />
            <title>Codessa Memory</title>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Codessa Memory</h1>
                    <div class="actions">
                        <button id="refreshBtn" title="Refresh Memories"><i class="codicon codicon-refresh"></i></button>
                        <button id="settingsBtn" title="Memory Settings"><i class="codicon codicon-gear"></i></button>
                        <button id="chunkFileBtn" title="Chunk File"><i class="codicon codicon-file-add"></i></button>
                        <button id="chunkWorkspaceBtn" title="Chunk Workspace"><i class="codicon codicon-folder-add"></i></button>
                        <button id="clearBtn" title="Clear All Memories"><i class="codicon codicon-trash"></i></button>
                    </div>
                </div>

                <div class="search-container">
                    <input type="text" id="searchInput" placeholder="Search memories..." />
                    <button id="searchBtn"><i class="codicon codicon-search"></i></button>
                </div>

                <div class="content">
                    <div id="memoriesList" class="memories-list"></div>
                    <div id="memoryDetail" class="memory-detail"></div>
                </div>

                <div id="settingsModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Memory Settings</h2>
                            <span class="close">&times;</span>
                        </div>
                        <div class="modal-body">
                            <div id="settingsForm"></div>
                        </div>
                        <div class="modal-footer">
                            <button id="saveSettingsBtn">Save</button>
                            <button id="cancelSettingsBtn">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>

            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
