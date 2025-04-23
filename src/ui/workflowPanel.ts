import * as vscode from 'vscode';
import { getNonce } from '../utils';
import { WorkflowStorage } from './workflowStorage';
import { logger } from '../logger';
import { getAllWorkflows, getWorkflowById, createWorkflowInstance } from '../workflows';
import { WorkflowDefinition } from '../workflows/workflowEngine';
import { GraphDefinition } from '../workflows/langgraph/types';

// Combined workflow type for UI
interface UIWorkflow {
    id: string;
    name: string;
    description: string;
    version: string;
    steps: any[];
    engine?: string;
}

// Helper function to convert workflow definitions to UI workflows
function convertToUIWorkflow(workflow: WorkflowDefinition | GraphDefinition): UIWorkflow {
    // Check if it's a GraphDefinition by looking for nodes property
    const isGraphDefinition = 'nodes' in workflow;

    return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || 'No description provided',
        version: isGraphDefinition ? (workflow as any).version || '1.0.0' : workflow.version,
        steps: isGraphDefinition ? (workflow as GraphDefinition).nodes : (workflow as WorkflowDefinition).steps,
        engine: isGraphDefinition ? 'langgraph' : 'original'
    };
}

/**
 * Workflow Panel
 * Provides a UI for managing workflows
 */
export class WorkflowPanel {
    // Persistent workflow storage
    private static _loadedWorkflows: any[] = [];

    public static readonly viewType = 'codessa.workflowPanel';
    private static currentPanel: WorkflowPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        // Load workflows from disk
        WorkflowStorage.loadWorkflows(vscode.extensions.getExtension('TekNerds-ITS.codessa')!.exports.context)
            .then(workflows => {
                WorkflowPanel._loadedWorkflows = workflows;
                this._update();
            });
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            () => {
                if (this._panel.visible) {
                    this._update();
                }
            },
            null,
            this._disposables
        );

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                // Tool picker: respond with all tools & actions
                if (message.command === 'getAvailableToolsWithActions') {
                    try {
                        const { toolRegistry } = await import('../tools/toolRegistry');
                        // Recursively serialize tools and actions for the webview
                        function serializeTool(tool: any) {
                            const out: any = {
                                id: tool.id,
                                name: tool.name || tool.id,
                                description: tool.description || '',
                                actions: undefined
                            };
                            if (tool.actions) {
                                out.actions = {};
                                for (const [subId, subTool] of Object.entries(tool.actions)) {
                                    out.actions[subId] = serializeTool(subTool);
                                }
                            }
                            return out;
                        }
                        const tools = toolRegistry.getAllTools().map(serializeTool);
                        this._panel.webview.postMessage({ type: 'availableToolsWithActions', tools });
                    } catch (err) {
                        this._panel.webview.postMessage({ type: 'availableToolsWithActions', tools: [], error: String(err) });
                    }
                    return;
                }
                if (message.command === 'getWorkflows') {
                    this._panel.webview.postMessage({ type: 'workflowsList', workflows: WorkflowPanel._loadedWorkflows });
                    return;
                }
                try {
                    logger.info(`Received message from webview: ${message.command}`);

                    switch (message.command) {
                        case 'createWorkflow':
                            vscode.commands.executeCommand('codessa.createWorkflow');
                            break;
                        case 'createLangGraphWorkflow':
                            vscode.commands.executeCommand('codessa.createLangGraphWorkflow');
                            break;
                        case 'editWorkflow':
                            if (message.engine === 'langgraph') {
                                vscode.commands.executeCommand('codessa.editLangGraphWorkflow', message.workflowId);
                            } else {
                                vscode.commands.executeCommand('codessa.editWorkflow', message.workflowId);
                            }
                            break;
                        case 'deleteWorkflow':
                            if (message.engine === 'langgraph') {
                                vscode.commands.executeCommand('codessa.deleteLangGraphWorkflow', message.workflowId);
                            } else {
                                vscode.commands.executeCommand('codessa.deleteWorkflow', message.workflowId);
                            }
                            break;
                        case 'runWorkflow':
                            if (message.engine === 'langgraph') {
                                vscode.commands.executeCommand('codessa.runLangGraphWorkflow', message.workflowId);
                            } else {
                                vscode.commands.executeCommand('codessa.runWorkflow', message.workflowId);
                            }
                            break;
                        case 'refreshWorkflows':
                            this._update();
                            break;
                        case 'saveWorkflow':
                            await this._handleSaveWorkflow(message.workflow);
                            this._update();
                            break;
                        default:
                            logger.warn(`Unknown command: ${message.command}`);
                    }
                } catch (error) {
                    logger.error('Error handling webview message:', error);
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (WorkflowPanel.currentPanel) {
            WorkflowPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            WorkflowPanel.viewType,
            'Codessa Workflows',
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,

                // And restrict the webview to only loading content from our extension's directory
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        WorkflowPanel.currentPanel = new WorkflowPanel(panel, extensionUri);
    }

    /**
     * Handle saving a workflow from the webview
     */
    private async _handleSaveWorkflow(workflow: { name: string, steps: any[] }) {
        WorkflowPanel._loadedWorkflows.push({
            id: `wf_${Date.now()}`,
            name: workflow.name,
            steps: workflow.steps,
            created: new Date().toISOString(),
        });
        await WorkflowStorage.saveWorkflows(vscode.extensions.getExtension('TekNerds-ITS.codessa')!.exports.context, WorkflowPanel._loadedWorkflows);
        logger.info(`Saved workflow: ${workflow.name} (${workflow.steps.length} steps)`);
    }

    private async _update() {
        const webview = this._panel.webview;

        this._panel.title = 'Codessa Workflows';
        this._panel.webview.html = await this._getHtmlForWebview(webview);
    }

    private async _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local paths to resources
        const stylePath = vscode.Uri.joinPath(this._extensionUri, 'media', 'workflow.css');
        const scriptPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'workflow.js');
        const toolPickerScriptPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'toolPicker.js');

        // Convert to webview URIs
        const styleUri = webview.asWebviewUri(stylePath);
        const scriptUri = webview.asWebviewUri(scriptPath);
        const toolPickerScriptUri = webview.asWebviewUri(toolPickerScriptPath);

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        try {
            // Get workflows from original registry
            const workflowsData: any[] = await vscode.commands.executeCommand('codessa.getWorkflows') || [];

            // Get workflows from LangGraph registry
            const allWorkflows = getAllWorkflows();

            // Create a map of existing workflow IDs for faster lookup
            const existingWorkflowIds = new Set(workflowsData.map(w => w.id));

            // Filter out workflows that are already in workflowsData
            const filteredLangGraphWorkflows = allWorkflows.filter(wf => {
                return !existingWorkflowIds.has(wf.id);
            });

            logger.info(`Found ${workflowsData.length} original workflows and ${filteredLangGraphWorkflows.length} LangGraph workflows`);

            // Example of using getWorkflowById and createWorkflowInstance
            if (filteredLangGraphWorkflows.length > 0) {
                const sampleWorkflowId = filteredLangGraphWorkflows[0].id;
                const workflowDetails = getWorkflowById(sampleWorkflowId);

                if (workflowDetails) {
                    // Access the workflow object correctly based on its type
                    const workflowName = workflowDetails.workflow.name;
                    logger.debug(`Sample workflow details: ${workflowName}`);

                    try {
                        // Create an instance but don't execute it
                        const instance = createWorkflowInstance(sampleWorkflowId);

                        // Check instance type and access properties accordingly
                        if ('getDefinition' in instance) {
                            // It's a Workflow instance
                            logger.debug(`Created workflow instance for: ${instance.getDefinition().name}`);
                        } else {
                            // It's a LangGraph instance
                            logger.debug(`Created LangGraph instance for workflow: ${workflowName}`);
                        }
                    } catch (error) {
                        logger.error(`Error creating workflow instance: ${error}`);
                    }
                }
            }

            // Create combined workflows array using our helper function
            const combinedWorkflows = [
                ...workflowsData,
                ...filteredLangGraphWorkflows.map(wf => convertToUIWorkflow(wf))
            ];

            // Convert workflows to JSON string for the webview
            const workflowsJson = JSON.stringify(combinedWorkflows);

            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Codessa Workflows</title>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Workflows</h1>
            <div class="actions">
                <button id="create-workflow" class="primary-button">Create Workflow</button>
                <button id="create-langgraph-workflow" class="primary-button">Create LangGraph Workflow</button>
                <button id="refresh-workflows" class="secondary-button">Refresh</button>
            </div>
        </div>

        <div id="workflow-list" class="workflow-list"></div>
        <div id="tool-picker-container" class="tool-picker-container"></div>
    </div>

    <script nonce="${nonce}">
        // Workflows data from extension
        const workflows = ${workflowsJson};
        // Get VS Code API
        const vscode = acquireVsCodeApi();
    </script>
    <script nonce="${nonce}" src="${toolPickerScriptUri}"></script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
        } catch (error) {
            logger.error('Error generating workflow panel HTML:', error);
            return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <title>Codessa Workflows - Error</title>
    <style>
        body { padding: 20px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); }
        .error { color: var(--vscode-errorForeground); margin: 20px 0; padding: 10px; border: 1px solid var(--vscode-errorForeground); }
        button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Error Loading Workflows</h1>
    <div class="error">
        <p>There was an error loading the workflows. Please try refreshing the panel.</p>
        <p>${error instanceof Error ? error.message : String(error)}</p>
    </div>
    <button id="refresh">Refresh</button>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        document.getElementById('refresh').addEventListener('click', () => {
            vscode.postMessage({ command: 'refreshWorkflows' });
        });
    </script>
</body>
</html>`;
        }
    }

    public dispose() {
        WorkflowPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
