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
exports.AgentTreeDataProvider = void 0;
exports.registerAgentTreeView = registerAgentTreeView;
const vscode = __importStar(require("vscode"));
const agentManager_1 = require("../agents/agentManager");
const logger_1 = require("../logger");
const path = __importStar(require("path"));
/**
 * TreeItem representing an Agent in the sidebar tree view
 */
class AgentTreeItem extends vscode.TreeItem {
    constructor(agent, collapsibleState) {
        super(agent.name, collapsibleState);
        this.agent = agent;
        this.collapsibleState = collapsibleState;
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
    constructor(label, parent, type, value, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.parent = parent;
        this.type = type;
        this.value = value;
        this.collapsibleState = collapsibleState;
        // Set unique ID
        this.id = `${parent.id}-${type}-${value}`;
        // Define contextValue for context menu filtering
        this.contextValue = `agentProperty-${type}`;
        // Set appropriate icon
        let iconName = 'property.svg';
        if (type === 'tool')
            iconName = 'tool.svg';
        if (type === 'model')
            iconName = 'model.svg';
        if (type === 'chainedAgent')
            iconName = 'chain.svg';
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
class AgentTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        // Listen for agent changes to refresh the tree
        agentManager_1.agentManager.onAgentsChanged(() => this.refresh());
    }
    /**
     * Refresh the entire tree
     */
    refresh() {
        this._onDidChangeTreeData.fire(null);
    }
    /**
     * Get tree item representation for an element
     */
    getTreeItem(element) {
        return element;
    }
    /**
     * Get children of the provided element, or root elements if no element provided
     */
    getChildren(element) {
        if (!element) {
            // Root level - show all agents
            return Promise.resolve(this.getAgents());
        }
        else if (element instanceof AgentTreeItem) {
            // Agent level - show agent properties
            return Promise.resolve(this.getAgentProperties(element.agent));
        }
        return Promise.resolve([]);
    }
    /**
     * Get all agents as tree items
     */
    getAgents() {
        try {
            const agents = agentManager_1.agentManager.getAllAgents();
            if (agents.length === 0) {
                return [
                    new vscode.TreeItem('No agents configured', vscode.TreeItemCollapsibleState.None)
                ];
            }
            return agents.map(agent => new AgentTreeItem(agent, (agent.isSupervisor || agent.tools.size > 0 || agent.chainedAgentIds.length > 0)
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None));
        }
        catch (error) {
            logger_1.logger.error('Error getting agents for tree view:', error);
            return [
                new vscode.TreeItem('Error loading agents', vscode.TreeItemCollapsibleState.None)
            ];
        }
    }
    /**
     * Get agent properties as tree items
     */
    getAgentProperties(agent) {
        const items = [];
        // Add LLM model info
        if (agent.llmConfig) {
            const modelLabel = `Model: ${agent.llmConfig.provider} / ${agent.llmConfig.modelId}`;
            items.push(new AgentPropertyItem(modelLabel, agent, 'model', `${agent.llmConfig.provider}-${agent.llmConfig.modelId}`, vscode.TreeItemCollapsibleState.None));
        }
        // Add tools
        if (agent.tools.size > 0) {
            for (const [toolId, tool] of agent.tools.entries()) {
                items.push(new AgentPropertyItem(`Tool: ${tool.name || toolId}`, agent, 'tool', toolId, vscode.TreeItemCollapsibleState.None));
            }
        }
        // Add chained agents for supervisors
        if (agent.isSupervisor && agent.chainedAgentIds.length > 0) {
            for (const chainedId of agent.chainedAgentIds) {
                const chainedAgent = agentManager_1.agentManager.getAgent(chainedId);
                const name = chainedAgent ? chainedAgent.name : chainedId;
                items.push(new AgentPropertyItem(`Chain: ${name}`, agent, 'chainedAgent', chainedId, vscode.TreeItemCollapsibleState.None));
            }
        }
        return items;
    }
}
exports.AgentTreeDataProvider = AgentTreeDataProvider;
/**
 * Setup and register the agent tree view
 */
function registerAgentTreeView(context) {
    const treeDataProvider = new AgentTreeDataProvider();
    const treeView = vscode.window.createTreeView('codessaAgentView', {
        treeDataProvider,
        showCollapseAll: true,
        canSelectMany: false
    });
    context.subscriptions.push(treeView, vscode.commands.registerCommand('codessa.refreshAgentTree', () => treeDataProvider.refresh()), vscode.commands.registerCommand('codessa.openAgentPanel', (agentId) => {
        // Command handler to open agent panel implemented in extension.ts
        vscode.commands.executeCommand('codessa.openAgentDetailsPanel', agentId);
    }), vscode.commands.registerCommand('codessa.openToolDetails', (toolId) => {
        // Command handler to open tool details implemented in extension.ts
        vscode.commands.executeCommand('codessa.openToolDetailsPanel', toolId);
    }));
    return treeView;
}
//# sourceMappingURL=agentTree.js.map