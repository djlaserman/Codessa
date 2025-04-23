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
exports.ToolsTreeDataProvider = void 0;
exports.registerToolsTreeView = registerToolsTreeView;
const vscode = __importStar(require("vscode"));
const toolRegistry_1 = require("../tools/toolRegistry");
const logger_1 = require("../logger");
const path = __importStar(require("path"));
/**
 * TreeItem representing a Tool in the sidebar tree view
 */
class ToolTreeItem extends vscode.TreeItem {
    constructor(id, name, description, collapsible = false) {
        super(name, collapsible ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.id = id;
        this.name = name;
        this.description = description;
        this.collapsible = collapsible;
        this.tooltip = description;
        this.contextValue = 'tool';
        // Set icon
        this.iconPath = {
            light: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'light', 'tool.svg')),
            dark: vscode.Uri.file(path.join(__filename, '..', '..', '..', 'resources', 'dark', 'tool.svg'))
        };
    }
}
/**
 * Tree data provider for the tools sidebar
 */
class ToolsTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
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
            // Root level - show all tools
            return Promise.resolve(this.getTools());
        }
        // If the element is a parent tool with sub-actions, show its sub-actions
        const id = element.id;
        const tool = toolRegistry_1.toolRegistry.getTool(id);
        if (tool && tool.actions) {
            return Promise.resolve(Object.entries(tool.actions).map(([subId, subTool]) => {
                // subTool may be ToolAction or ITool; normalize to ITool shape for tree
                const name = subTool.name || subId;
                const description = subTool.description || '';
                const hasActions = !!subTool.actions;
                return new ToolTreeItem(`${tool.id}.${subId}`, name, description, hasActions);
            }));
        }
        return Promise.resolve([]);
    }
    /**
     * Get all tools as tree items
     */
    getTools() {
        try {
            const tools = toolRegistry_1.toolRegistry.getAllTools();
            if (tools.length === 0) {
                return [
                    new vscode.TreeItem('No tools available', vscode.TreeItemCollapsibleState.None)
                ];
            }
            // Show parent tools as collapsible if they have sub-actions
            return tools.map(tool => {
                const name = tool.name || tool.id;
                const description = tool.description || '';
                const hasActions = !!tool.actions;
                return new ToolTreeItem(tool.id, name, description, hasActions);
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting tools for tree view:', error);
            return [
                new vscode.TreeItem('Error loading tools', vscode.TreeItemCollapsibleState.None)
            ];
        }
    }
}
exports.ToolsTreeDataProvider = ToolsTreeDataProvider;
/**
 * Setup and register the tools tree view
 */
function registerToolsTreeView(context) {
    const treeDataProvider = new ToolsTreeDataProvider();
    const treeView = vscode.window.createTreeView('codessaToolsView', {
        treeDataProvider,
        showCollapseAll: false,
        canSelectMany: false
    });
    context.subscriptions.push(treeView, vscode.commands.registerCommand('codessa.refreshToolsView', () => treeDataProvider.refresh()));
    return treeView;
}
//# sourceMappingURL=toolsView.js.map