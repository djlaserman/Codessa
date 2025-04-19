import * as vscode from 'vscode';
import { getNonce } from './utils';
import { logger } from '../logger';
import { llmService } from '../llm/llmService';
import { agentManager } from '../agents/agentManager';
import { toolRegistry } from '../tools/toolRegistry';

/**
 * A dashboard webview that shows activity, analytics, and health status
 */
export class DashboardPanel {
    public static currentPanel: DashboardPanel | undefined;
    private static readonly viewType = 'codessaDashboard';
    
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _refreshInterval: NodeJS.Timer | undefined;
    
    /**
     * Create or show a dashboard panel
     */
    public static createOrShow(
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext
    ): DashboardPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
            
        // If we already have a panel, show it
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            return DashboardPanel.currentPanel;
        }
        
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            DashboardPanel.viewType,
            'Codessa Dashboard',
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
        
        const dashboardPanel = new DashboardPanel(panel, extensionUri);
        
        // Register panel with extension context
        context.subscriptions.push(panel);
        
        return dashboardPanel;
    }
    
    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        
        // Set initial HTML content
        this._update();
        
        // Set up auto-refresh (every 30 seconds)
        this._refreshInterval = setInterval(() => {
            this._update();
        }, 30000);
        
        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'refresh':
                        this._update();
                        break;
                    case 'openSettings':
                        vscode.commands.executeCommand('codessa.openSettings');
                        break;
                    case 'openAgent':
                        vscode.commands.executeCommand(
                            'codessa.openAgentDetailsPanel', 
                            message.agentId
                        );
                        break;
                    case 'createAgent':
                        vscode.commands.executeCommand('codessa.addAgent');
                        break;
                    case 'showLogs':
                        vscode.commands.executeCommand('codessa.showLogs');
                        break;
                }
            },
            null,
            this._disposables
        );
        
        // Cache the current panel
        DashboardPanel.currentPanel = this;
    }
    
    /**
     * Update dashboard content
     */
    private async _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Codessa Dashboard';
        
        // Gather data for the dashboard
        const dashboardData = await this._getDashboardData();
        
        // Update HTML content
        webview.html = this._getWebviewContent(webview, dashboardData);
    }
    
    /**
     * Gather data for the dashboard
     */
    private async _getDashboardData(): Promise<any> {
        try {
            // Get provider status
            const providers = llmService.listProviderIds();
            const configuredProviders = llmService.getConfiguredProviders();
            const providerStatus = providers.map(id => {
                const provider = llmService.getProvider(id);
                return {
                    id,
                    configured: provider ? provider.isConfigured() : false,
                    isDefault: false, // Will be set below if applicable
                };
            });
            
            // Get default provider
            const defaultProvider = llmService.getDefaultProvider();
            if (defaultProvider) {
                const defaultProviderStatus = providerStatus.find(p => p.id === defaultProvider.id);
                if (defaultProviderStatus) {
                    defaultProviderStatus.isDefault = true;
                }
            }
            
            // Get agents
            const agents = agentManager.getAllAgents().map(agent => ({
                id: agent.id,
                name: agent.name,
                description: agent.description || '',
                isSupervisor: agent.isSupervisor,
                toolCount: agent.tools.size,
                provider: agent.llmConfig?.provider || 'unknown',
                model: agent.llmConfig?.modelId || 'unknown'
            }));
            
            // Get tools
            const tools = toolRegistry.getAllTools().map(tool => ({
                id: tool.id,
                name: tool.name || tool.id,
                description: tool.description || ''
            }));
            
            // Return combined data
            return {
                providers: {
                    total: providers.length,
                    configured: configuredProviders.length,
                    list: providerStatus
                },
                agents: {
                    total: agents.length,
                    supervisors: agents.filter(a => a.isSupervisor).length,
                    list: agents
                },
                tools: {
                    total: tools.length,
                    list: tools
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error gathering dashboard data:', error);
            
            // Return minimal data
            return {
                error: `Failed to gather data: ${error}`,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Generate the webview HTML content
     */
    private _getWebviewContent(webview: vscode.Webview, data: any): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.js')
        );
        
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.css')
        );
        
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png')
        );
        
        const nonce = getNonce();
        
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Codessa Dashboard</title>
                <link rel="stylesheet" href="${styleUri}">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource}; font-src ${webview.cspSource};">
            </head>
            <body>
                <div class="dashboard-container">
                    <header class="dashboard-header">
                        <div class="logo-container">
                            <img src="${logoUri}" alt="Codessa Logo" class="logo" />
                            <h1>Codessa Dashboard</h1>
                        </div>
                        <div class="actions">
                            <button id="btn-refresh" title="Refresh dashboard" class="icon-button">
                                <span class="codicon codicon-refresh"></span>
                            </button>
                            <button id="btn-settings" title="Open settings" class="icon-button">
                                <span class="codicon codicon-gear"></span>
                            </button>
                            <button id="btn-logs" title="Show logs" class="icon-button">
                                <span class="codicon codicon-output"></span>
                            </button>
                        </div>
                    </header>
                    
                    <div class="dashboard-content">
                        <div class="dashboard-row">
                            <div class="dashboard-card status-card">
                                <h2>System Status</h2>
                                <div class="status-indicators">
                                    <div class="status-item ${data.providers?.configured > 0 ? 'status-ok' : 'status-warning'}">
                                        <span class="status-icon"></span>
                                        <span class="status-label">LLM Providers</span>
                                        <span class="status-value">${data.providers?.configured || 0}/${data.providers?.total || 0} configured</span>
                                    </div>
                                    <div class="status-item ${data.agents?.total > 0 ? 'status-ok' : 'status-warning'}">
                                        <span class="status-icon"></span>
                                        <span class="status-label">Agents</span>
                                        <span class="status-value">${data.agents?.total || 0} available</span>
                                    </div>
                                    <div class="status-item status-ok">
                                        <span class="status-icon"></span>
                                        <span class="status-label">Tools</span>
                                        <span class="status-value">${data.tools?.total || 0} available</span>
                                    </div>
                                </div>
                                <p class="last-updated">Last updated: <span id="timestamp"></span></p>
                            </div>
                        </div>
                        
                        <div class="dashboard-row">
                            <div class="dashboard-card">
                                <h2>Agents</h2>
                                <div class="card-actions">
                                    <button id="btn-create-agent" class="btn primary">Create Agent</button>
                                </div>
                                <div class="agents-list" id="agents-list">
                                    <!-- Agents will be inserted here by JavaScript -->
                                    ${data.error ? `<div class="error-message">${data.error}</div>` : ''}
                                    ${!data.error && (!data.agents || data.agents.total === 0) ? 
                                        `<div class="empty-message">No agents configured yet. Create your first agent to get started.</div>` : ''}
                                </div>
                            </div>
                        </div>
                        
                        <div class="dashboard-row">
                            <div class="dashboard-card">
                                <h2>LLM Providers</h2>
                                <div class="provider-list" id="provider-list">
                                    <!-- Providers will be inserted here by JavaScript -->
                                </div>
                            </div>
                            
                            <div class="dashboard-card">
                                <h2>Available Tools</h2>
                                <div class="tools-list" id="tools-list">
                                    <!-- Tools will be inserted here by JavaScript -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script nonce="${nonce}">
                    // Dashboard data
                    const dashboardData = ${JSON.stringify(data)};
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
    
    /**
     * Clean up resources
     */
    public dispose() {
        DashboardPanel.currentPanel = undefined;
        
        // Clear the refresh interval
        if (this._refreshInterval) {
            clearInterval(this._refreshInterval);
        }
        
        this._panel.dispose();
        
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
} 