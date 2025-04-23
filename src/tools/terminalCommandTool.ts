import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import * as cp from 'child_process';

export class TerminalCommandTool implements ITool {
    readonly id = 'terminalCmd';
    readonly name = 'Terminal Command';
    readonly description = 'Executes a shell command in the workspace root and returns output.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            command: { type: 'string', description: 'Shell command to execute.' }
        },
        required: ['command']
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const command = input.command as string;
        if (!command) {
            return { success: false, error: "'command' is required." };
        }
        let cwd: string | undefined = undefined;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
        try {
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec(command, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        } catch (error: any) {
            return { success: false, error: `Command failed: ${error.message || error}` };
        }
    }
}

export const terminalCommandTool = new TerminalCommandTool();
