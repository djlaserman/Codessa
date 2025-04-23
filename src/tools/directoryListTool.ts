import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';

export class DirectoryListTool implements ITool {
    readonly id = 'listDir';
    readonly name = 'List Directory';
    readonly description = 'Lists the contents of a directory (files and subdirectories).';
    readonly inputSchema = {
        type: 'object',
        properties: {
            dirPath: { type: 'string', description: 'Path to the directory (relative to workspace root or absolute).' }
        },
        required: ['dirPath']
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const dirPath = input.dirPath as string;
        if (!dirPath) {
            return { success: false, error: "'dirPath' is required." };
        }
        let dirUri: vscode.Uri | undefined;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            try {
                const uri = vscode.Uri.parse(dirPath);
                if (uri.scheme) dirUri = uri;
                else dirUri = vscode.Uri.joinPath(workspaceRoot, dirPath);
            } catch {
                dirUri = vscode.Uri.joinPath(workspaceRoot, dirPath);
            }
        } else {
            try {
                const uri = vscode.Uri.parse(dirPath);
                if (uri.scheme) dirUri = uri;
            } catch {}
        }
        if (!dirUri) {
            return { success: false, error: `Could not resolve directory path: ${dirPath}.` };
        }
        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            const result = entries.map(([name, type]) => ({
                name,
                type: type === vscode.FileType.Directory ? 'directory' : 'file'
            }));
            return { success: true, output: result };
        } catch (error: any) {
            return { success: false, error: `Failed to list directory: ${error.message || error}` };
        }
    }
}

export const directoryListTool = new DirectoryListTool();
