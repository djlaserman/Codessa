import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import * as cp from 'child_process';

export class GitStashTool implements ITool {
    readonly id = 'stash';
    readonly name = 'Git Stash';
    readonly description = 'Stash changes in the current repository.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            args: { type: 'string', description: 'Additional arguments for git stash.' }
        },
        required: []
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        let args = input.args as string || '';
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec(`git stash ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        } catch (error: any) {
            return { success: false, error: `Git stash failed: ${error.message || error}` };
        }
    }
}

export class GitRevertTool implements ITool {
    readonly id = 'revert';
    readonly name = 'Git Revert';
    readonly description = 'Revert commits in the current repository.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            args: { type: 'string', description: 'Arguments for git revert (e.g., commit hash).' }
        },
        required: ['args']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        let args = input.args as string;
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec(`git revert ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        } catch (error: any) {
            return { success: false, error: `Git revert failed: ${error.message || error}` };
        }
    }
}

export class GitCherryPickTool implements ITool {
    readonly id = 'cherryPick';
    readonly name = 'Git Cherry-Pick';
    readonly description = 'Cherry-pick commits in the current repository.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            args: { type: 'string', description: 'Arguments for git cherry-pick (e.g., commit hash).' }
        },
        required: ['args']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        let args = input.args as string;
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec(`git cherry-pick ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        } catch (error: any) {
            return { success: false, error: `Git cherry-pick failed: ${error.message || error}` };
        }
    }
}

export class GitRebaseTool implements ITool {
    readonly id = 'rebase';
    readonly name = 'Git Rebase';
    readonly description = 'Rebase branches or commits in the current repository.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            args: { type: 'string', description: 'Arguments for git rebase (e.g., branch name).' }
        },
        required: ['args']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        let args = input.args as string;
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec(`git rebase ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        } catch (error: any) {
            return { success: false, error: `Git rebase failed: ${error.message || error}` };
        }
    }
}

export class GitTagTool implements ITool {
    readonly id = 'tag';
    readonly name = 'Git Tag';
    readonly description = 'Create, list, or delete tags in the current repository.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            args: { type: 'string', description: 'Arguments for git tag (e.g., tag name, -d for delete).' }
        },
        required: []
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        let args = input.args as string || '';
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec(`git tag ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        } catch (error: any) {
            return { success: false, error: `Git tag failed: ${error.message || error}` };
        }
    }
}

export class GitBranchGraphTool implements ITool {
    readonly id = 'branchGraph';
    readonly name = 'Git Branch Graph';
    readonly description = 'Show a graphical log of branches.';
    readonly inputSchema = {
        type: 'object',
        properties: {},
        required: []
    };
    async execute(_input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec('git log --oneline --graph --all --decorate', { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        } catch (error: any) {
            return { success: false, error: `Git branch graph failed: ${error.message || error}` };
        }
    }
}
