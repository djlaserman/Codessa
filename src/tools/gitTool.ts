import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import * as cp from 'child_process';
import { GitStashTool, GitRevertTool, GitCherryPickTool, GitRebaseTool, GitTagTool, GitBranchGraphTool } from './advancedGitTool';

export class GitTool implements ITool {
    readonly id = 'git';
    readonly name = 'Git Operations (Advanced)';
    readonly description = 'Stage, commit, push, pull, branch, diff, log, stash, revert, cherry-pick, rebase, tag, and show branch graph.';
    readonly actions: { [key: string]: ITool } = {
        'status': {
            id: 'status', name: 'Git Status', description: 'Show git status.',
            inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: [] },
            async execute(input: ToolInput) {
                let args = input.args as string || '';
                let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`git status ${args}`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout || stderr);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'add': {
            id: 'add', name: 'Git Add', description: 'Stage files for commit.',
            inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'] },
            async execute(input: ToolInput) {
                let args = input.args as string;
                let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`git add ${args}`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout || stderr);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'commit': {
            id: 'commit', name: 'Git Commit', description: 'Commit staged changes.',
            inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'] },
            async execute(input: ToolInput) {
                let args = input.args as string;
                let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`git commit ${args}`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout || stderr);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'push': {
            id: 'push', name: 'Git Push', description: 'Push commits to remote.',
            inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'] },
            async execute(input: ToolInput) {
                let args = input.args as string;
                let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`git push ${args}`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout || stderr);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'pull': {
            id: 'pull', name: 'Git Pull', description: 'Pull from remote.',
            inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'] },
            async execute(input: ToolInput) {
                let args = input.args as string;
                let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`git pull ${args}`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout || stderr);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'branch': {
            id: 'branch', name: 'Git Branch', description: 'Manage branches.',
            inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: [] },
            async execute(input: ToolInput) {
                let args = input.args as string || '';
                let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`git branch ${args}`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout || stderr);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'diff': {
            id: 'diff', name: 'Git Diff', description: 'Show diff.',
            inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: [] },
            async execute(input: ToolInput) {
                let args = input.args as string || '';
                let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`git diff ${args}`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout || stderr);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'log': {
            id: 'log', name: 'Git Log', description: 'Show log.',
            inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: [] },
            async execute(input: ToolInput) {
                let args = input.args as string || '';
                let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                const result = await new Promise<string>((resolve, reject) => {
                    cp.exec(`git log ${args}`, { cwd }, (err, stdout, stderr) => {
                        if (err && !stdout) return reject(stderr || err.message);
                        resolve(stdout || stderr);
                    });
                });
                return { success: true, output: result.trim() };
            }
        },
        'stash': new GitStashTool(),
        'revert': new GitRevertTool(),
        'cherryPick': new GitCherryPickTool(),
        'rebase': new GitRebaseTool(),
        'tag': new GitTagTool(),
        'branchGraph': new GitBranchGraphTool(),
    };


    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const action = input.action as string;
        const args = input.args as string || '';
        let command = '';
        switch (action) {
            case 'status': command = 'git status ' + args; break;
            case 'add': command = 'git add ' + args; break;
            case 'commit': command = 'git commit ' + args; break;
            case 'push': command = 'git push ' + args; break;
            case 'pull': command = 'git pull ' + args; break;
            case 'branch': command = 'git branch ' + args; break;
            case 'diff': command = 'git diff ' + args; break;
            case 'log': command = 'git log ' + args; break;
            default: return { success: false, error: `Unknown git action: ${action}` };
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
            return { success: false, error: `Git command failed: ${error.message || error}` };
        }
    }
}

export const gitTool = new GitTool();
