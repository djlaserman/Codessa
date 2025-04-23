import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import * as cp from 'child_process';
import { FuzzySearchTool, SemanticSearchTool, SearchPreviewTool } from './advancedCodeSearchTool';

export class CodeSearchTool implements ITool {
    readonly id = 'codeSearch';
    readonly name = 'Code Search (ripgrep + advanced)';
    readonly description = 'Searches codebase using ripgrep (rg), fuzzy search, semantic search, and provides result previews.';
    readonly actions: { [key: string]: ITool } = {
        'basic': {
            id: 'basic', name: 'Basic Code Search', description: 'Searches codebase using ripgrep (rg). Returns matching lines.',
            inputSchema: { type: 'object', properties: { query: { type: 'string' }, dirPath: { type: 'string', default: '.' } }, required: ['query'] },
            async execute(input: ToolInput) {
                const query = input.query as string;
                const dirPath = input.dirPath as string || '.';
                let cwd = dirPath;
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                    cwd = dirPath.startsWith('/') || dirPath.match(/^.:\\/) ? dirPath : `${workspaceRoot}/${dirPath}`;
                }
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`rg --no-heading --line-number --color never "${query}"`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'fuzzySearch': new FuzzySearchTool(),
        'semanticSearch': new SemanticSearchTool(),
        'searchPreview': new SearchPreviewTool(),
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const actionId = input.action as string || 'basic';
        if (!actionId) {
            return { success: false, error: `Action parameter is required. Available actions: ${Object.keys(this.actions).join(', ')}` };
        }
        const actionTool = this.actions[actionId];
        if (!actionTool) {
            return { success: false, error: `Unknown code search action: ${actionId}. Available actions: ${Object.keys(this.actions).join(', ')}` };
        }
        const actionInput = { ...input };
        delete actionInput.action;
        return actionTool.execute(actionInput);
    }
}

export const codeSearchTool = new CodeSearchTool();
