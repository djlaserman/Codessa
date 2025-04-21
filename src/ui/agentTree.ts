import * as vscode from 'vscode';
import { Agent } from '../agents/agent';
import { agentManager } from '../agents/agentManager';
import { logger } from '../logger';
import * as path from 'path';

/**
 * TreeItem representing an Agent in the sidebar tree view
 */
class AgentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly agent: Agent,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(agent.name, collapsibleState);

        this.id = agent.id;
        this.tooltip = agent.description || agent.name;
        this.description = agent.isSupervisor ? 'Supervisor' : '';

        // Set context for contextual menus
        this.contextValue = agent.isSupervisor ? 'supervisorAgent' : 'agent';

        // Choose icon based on agent type
        const iconName = agent.isSupervisor ? 'agent-supervisor.svg' : 'agent.svg';
        this.iconPath = {
            light: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'light', iconName)),
            dark: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'dark', iconName))
        };

        // Command to run when the tree item is clicked
        this.command = {
            command: 'codessa.openAgentPanel',
            title: 'Open Agent',
            arguments: [agent.id]
        };
    }
}

/**
 * TreeItem representing agent operations like tools
 */
class AgentPropertyItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly parent: Agent,
        public readonly type: 'tool' | 'model' | 'chainedAgent',
        public readonly value: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);

        // Set unique ID
        this.id = `${parent.id}-${type}-${value}`;

        // Define contextValue for context menu filtering
        this.contextValue = `agentProperty-${type}`;

        // Set appropriate icon
        let iconName = 'property.svg';
        if (type === 'tool') iconName = 'tool.svg';
        if (type === 'model') iconName = 'model.svg';
        if (type === 'chainedAgent') iconName = 'chain.svg';

        this.iconPath = {
            light: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'light', iconName)),
            dark: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'dark', iconName))
        };

        // Clicking opens details panel for some property types
        if (type === 'tool' || type === 'chainedAgent') {
            this.command = {
                command: type === 'tool' ? 'codessa.openToolDetails' : 'codessa.openAgentPanel',
                title: 'Open Details',
                arguments: [type === 'tool' ? value : value]
            };
        }
    }
}

/**
 * Tree data provider for the agent sidebar
 */
export class AgentTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | null> = new vscode.EventEmitter<vscode.TreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | null> = this._onDidChangeTreeData.event;

    constructor() {
        // Listen for agent changes to refresh the tree
        agentManager.onAgentsChanged(() => this.refresh());
    }

    /**
     * Refresh the entire tree
     */
    refresh(): void {
        this._onDidChangeTreeData.fire(null);
    }

    /**
     * Get tree item representation for an element
     */
    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children of the provided element, or root elements if no element provided
     */
    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            // Root level - show all agents
            return Promise.resolve(this.getAgents());
        } else if (element instanceof AgentTreeItem) {
            // Agent level - show agent properties
            return Promise.resolve(this.getAgentProperties(element.agent));
        }

        return Promise.resolve([]);
    }

    /**
     * Get all agents as tree items
     */
    private getAgents(): vscode.TreeItem[] {
        try {
            const agents = agentManager.getAllAgents();

            if (agents.length === 0) {
                return [
                    new vscode.TreeItem('No agents configured', vscode.TreeItemCollapsibleState.None)
                ];
            }

            return agents.map(agent => new AgentTreeItem(
                agent,
                (agent.isSupervisor || agent.tools.size > 0 || agent.chainedAgentIds.length > 0)
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None
            ));
        } catch (error) {
            logger.error('Error getting agents for tree view:', error);
            return [
                new vscode.TreeItem('Error loading agents', vscode.TreeItemCollapsibleState.None)
            ];
        }
    }

    /**
     * Get agent properties as tree items
     */
    private getAgentProperties(agent: Agent): vscode.TreeItem[] {
        const items: vscode.TreeItem[] = [];

        // Add LLM model info
        if (agent.llmConfig) {
            const modelLabel = `Model: ${agent.llmConfig.provider} / ${agent.llmConfig.modelId}`;
            items.push(new AgentPropertyItem(
                modelLabel,
                agent,
                'model',
                `${agent.llmConfig.provider}-${agent.llmConfig.modelId}`,
                vscode.TreeItemCollapsibleState.None
            ));
        }

        // Add tools
        if (agent.tools.size > 0) {
            for (const [toolId, tool] of agent.tools.entries()) {
                items.push(new AgentPropertyItem(
                    `Tool: ${tool.name || toolId}`,
                    agent,
                    'tool',
                    toolId,
                    vscode.TreeItemCollapsibleState.None
                ));
            }
        }

        // Add chained agents for supervisors
        if (agent.isSupervisor && agent.chainedAgentIds.length > 0) {
            for (const chainedId of agent.chainedAgentIds) {
                const chainedAgent = agentManager.getAgent(chainedId);
                const name = chainedAgent ? chainedAgent.name : chainedId;

                items.push(new AgentPropertyItem(
                    `Chain: ${name}`,
                    agent,
                    'chainedAgent',
                    chainedId,
                    vscode.TreeItemCollapsibleState.None
                ));
            }
        }

        return items;
    }
}

/**
 * Setup and register the agent tree view
 */
export function registerAgentTreeView(context: vscode.ExtensionContext): vscode.TreeView<vscode.TreeItem> {
    const treeDataProvider = new AgentTreeDataProvider();
    const treeView = vscode.window.createTreeView('codessaAgentView', {
        treeDataProvider,
        showCollapseAll: true,
        canSelectMany: false
    });

    context.subscriptions.push(
        treeView,
        vscode.commands.registerCommand('codessa.refreshAgentTree', () => treeDataProvider.refresh()),
        vscode.commands.registerCommand('codessa.openAgentPanel', (agentId: string) => {
            // Command handler to open agent panel implemented in extension.ts
            vscode.commands.executeCommand('codessa.openAgentDetailsPanel', agentId);
        }),
        vscode.commands.registerCommand('codessa.openToolDetails', (toolId: string) => {
            // Command handler to open tool details implemented in extension.ts
            vscode.commands.executeCommand('codessa.openToolDetailsPanel', toolId);
        })
    );

    return treeView;
}
