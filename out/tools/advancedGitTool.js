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
exports.GitBranchGraphTool = exports.GitTagTool = exports.GitRebaseTool = exports.GitCherryPickTool = exports.GitRevertTool = exports.GitStashTool = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
class GitStashTool {
    constructor() {
        this.id = 'stash';
        this.name = 'Git Stash';
        this.description = 'Stash changes in the current repository.';
        this.inputSchema = {
            type: 'object',
            properties: {
                args: { type: 'string', description: 'Additional arguments for git stash.' }
            },
            required: []
        };
    }
    async execute(input, _context) {
        let args = input.args || '';
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise((resolve, reject) => {
                cp.exec(`git stash ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout)
                        return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        }
        catch (error) {
            return { success: false, error: `Git stash failed: ${error.message || error}` };
        }
    }
}
exports.GitStashTool = GitStashTool;
class GitRevertTool {
    constructor() {
        this.id = 'revert';
        this.name = 'Git Revert';
        this.description = 'Revert commits in the current repository.';
        this.inputSchema = {
            type: 'object',
            properties: {
                args: { type: 'string', description: 'Arguments for git revert (e.g., commit hash).' }
            },
            required: ['args']
        };
    }
    async execute(input, _context) {
        let args = input.args;
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise((resolve, reject) => {
                cp.exec(`git revert ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout)
                        return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        }
        catch (error) {
            return { success: false, error: `Git revert failed: ${error.message || error}` };
        }
    }
}
exports.GitRevertTool = GitRevertTool;
class GitCherryPickTool {
    constructor() {
        this.id = 'cherryPick';
        this.name = 'Git Cherry-Pick';
        this.description = 'Cherry-pick commits in the current repository.';
        this.inputSchema = {
            type: 'object',
            properties: {
                args: { type: 'string', description: 'Arguments for git cherry-pick (e.g., commit hash).' }
            },
            required: ['args']
        };
    }
    async execute(input, _context) {
        let args = input.args;
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise((resolve, reject) => {
                cp.exec(`git cherry-pick ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout)
                        return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        }
        catch (error) {
            return { success: false, error: `Git cherry-pick failed: ${error.message || error}` };
        }
    }
}
exports.GitCherryPickTool = GitCherryPickTool;
class GitRebaseTool {
    constructor() {
        this.id = 'rebase';
        this.name = 'Git Rebase';
        this.description = 'Rebase branches or commits in the current repository.';
        this.inputSchema = {
            type: 'object',
            properties: {
                args: { type: 'string', description: 'Arguments for git rebase (e.g., branch name).' }
            },
            required: ['args']
        };
    }
    async execute(input, _context) {
        let args = input.args;
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise((resolve, reject) => {
                cp.exec(`git rebase ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout)
                        return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        }
        catch (error) {
            return { success: false, error: `Git rebase failed: ${error.message || error}` };
        }
    }
}
exports.GitRebaseTool = GitRebaseTool;
class GitTagTool {
    constructor() {
        this.id = 'tag';
        this.name = 'Git Tag';
        this.description = 'Create, list, or delete tags in the current repository.';
        this.inputSchema = {
            type: 'object',
            properties: {
                args: { type: 'string', description: 'Arguments for git tag (e.g., tag name, -d for delete).' }
            },
            required: []
        };
    }
    async execute(input, _context) {
        let args = input.args || '';
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise((resolve, reject) => {
                cp.exec(`git tag ${args}`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout)
                        return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        }
        catch (error) {
            return { success: false, error: `Git tag failed: ${error.message || error}` };
        }
    }
}
exports.GitTagTool = GitTagTool;
class GitBranchGraphTool {
    constructor() {
        this.id = 'branchGraph';
        this.name = 'Git Branch Graph';
        this.description = 'Show a graphical log of branches.';
        this.inputSchema = {
            type: 'object',
            properties: {},
            required: []
        };
    }
    async execute(_input, _context) {
        let cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        try {
            const result = await new Promise((resolve, reject) => {
                cp.exec('git log --oneline --graph --all --decorate', { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout)
                        return reject(stderr || err.message);
                    resolve(stdout || stderr);
                });
            });
            return { success: true, output: result.trim() };
        }
        catch (error) {
            return { success: false, error: `Git branch graph failed: ${error.message || error}` };
        }
    }
}
exports.GitBranchGraphTool = GitBranchGraphTool;
//# sourceMappingURL=advancedGitTool.js.map