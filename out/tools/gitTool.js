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
exports.gitTool = exports.GitTool = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const advancedGitTool_1 = require("./advancedGitTool");
class GitTool {
    constructor() {
        this.id = 'git';
        this.name = 'Git Operations (Advanced)';
        this.description = 'Stage, commit, push, pull, branch, diff, log, stash, revert, cherry-pick, rebase, tag, and show branch graph.';
        this.actions = {
            'status': {
                id: 'status', name: 'Git Status', description: 'Show git status.',
                inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: [] },
                async execute(input) {
                    let args = input.args || '';
                    let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`git status ${args}`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'add': {
                id: 'add', name: 'Git Add', description: 'Stage files for commit.',
                inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'] },
                async execute(input) {
                    let args = input.args;
                    let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`git add ${args}`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'commit': {
                id: 'commit', name: 'Git Commit', description: 'Commit staged changes.',
                inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'] },
                async execute(input) {
                    let args = input.args;
                    let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`git commit ${args}`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'push': {
                id: 'push', name: 'Git Push', description: 'Push commits to remote.',
                inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'] },
                async execute(input) {
                    let args = input.args;
                    let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`git push ${args}`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'pull': {
                id: 'pull', name: 'Git Pull', description: 'Pull from remote.',
                inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'] },
                async execute(input) {
                    let args = input.args;
                    let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`git pull ${args}`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'branch': {
                id: 'branch', name: 'Git Branch', description: 'Manage branches.',
                inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: [] },
                async execute(input) {
                    let args = input.args || '';
                    let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`git branch ${args}`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'diff': {
                id: 'diff', name: 'Git Diff', description: 'Show diff.',
                inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: [] },
                async execute(input) {
                    let args = input.args || '';
                    let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`git diff ${args}`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'log': {
                id: 'log', name: 'Git Log', description: 'Show log.',
                inputSchema: { type: 'object', properties: { args: { type: 'string' } }, required: [] },
                async execute(input) {
                    let args = input.args || '';
                    let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`git log ${args}`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout || stderr);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'stash': new advancedGitTool_1.GitStashTool(),
            'revert': new advancedGitTool_1.GitRevertTool(),
            'cherryPick': new advancedGitTool_1.GitCherryPickTool(),
            'rebase': new advancedGitTool_1.GitRebaseTool(),
            'tag': new advancedGitTool_1.GitTagTool(),
            'branchGraph': new advancedGitTool_1.GitBranchGraphTool(),
        };
    }
    async execute(input, _context) {
        const action = input.action;
        const args = input.args || '';
        let command = '';
        switch (action) {
            case 'status':
                command = 'git status ' + args;
                break;
            case 'add':
                command = 'git add ' + args;
                break;
            case 'commit':
                command = 'git commit ' + args;
                break;
            case 'push':
                command = 'git push ' + args;
                break;
            case 'pull':
                command = 'git pull ' + args;
                break;
            case 'branch':
                command = 'git branch ' + args;
                break;
            case 'diff':
                command = 'git diff ' + args;
                break;
            case 'log':
                command = 'git log ' + args;
                break;
            default: return { success: false, error: `Unknown git action: ${action}` };
        }
        let cwd = undefined;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
        try {
            const result = await new Promise((resolve, reject) => {
                cp.exec(command, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout)
                        return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        }
        catch (error) {
            return { success: false, error: `Git command failed: ${error.message || error}` };
        }
    }
}
exports.GitTool = GitTool;
exports.gitTool = new GitTool();
//# sourceMappingURL=gitTool.js.map