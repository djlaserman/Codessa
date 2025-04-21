import * as vscode from 'vscode';
import { toolRegistry } from '../tools/toolRegistry';
import { logger } from '../logger';
import * as path from 'path';

/**
 * TreeItem representing a Tool in the sidebar tree view
 */
class ToolTreeItem extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly description: string
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);

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
export class ToolsTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | null> = new vscode.EventEmitter<vscode.TreeItem | null>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | null> = this._onDidChangeTreeData.event;

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
            // Root level - show all tools
            return Promise.resolve(this.getTools());
        }

        return Promise.resolve([]);
    }

    /**
     * Get all tools as tree items
     */
    private getTools(): vscode.TreeItem[] {
        try {
            const tools = toolRegistry.getAllTools();

            if (tools.length === 0) {
                return [
                    new vscode.TreeItem('No tools available', vscode.TreeItemCollapsibleState.None)
                ];
            }

            return tools.map(tool => new ToolTreeItem(
                tool.id,
                tool.name || tool.id,
                tool.description || ''
            ));
        } catch (error) {
            logger.error('Error getting tools for tree view:', error);
            return [
                new vscode.TreeItem('Error loading tools', vscode.TreeItemCollapsibleState.None)
            ];
        }
    }
}

/**
 * Setup and register the tools tree view
 */
export function registerToolsTreeView(context: vscode.ExtensionContext): vscode.TreeView<vscode.TreeItem> {
    const treeDataProvider = new ToolsTreeDataProvider();
    const treeView = vscode.window.createTreeView('codessaToolsView', {
        treeDataProvider,
        showCollapseAll: false,
        canSelectMany: false
    });

    context.subscriptions.push(
        treeView,
        vscode.commands.registerCommand('codessa.refreshToolsView', () => treeDataProvider.refresh())
    );

    return treeView;
}
