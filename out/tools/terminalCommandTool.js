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
exports.terminalCommandTool = exports.TerminalCommandTool = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
class TerminalCommandTool {
    constructor() {
        this.id = 'terminalCmd';
        this.name = 'Terminal Command';
        this.description = 'Executes a shell command in the workspace root and returns output.';
        this.inputSchema = {
            type: 'object',
            properties: {
                command: { type: 'string', description: 'Shell command to execute.' }
            },
            required: ['command']
        };
    }
    async execute(input, _context) {
        const command = input.command;
        if (!command) {
            return { success: false, error: "'command' is required." };
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
            return { success: false, error: `Command failed: ${error.message || error}` };
        }
    }
}
exports.TerminalCommandTool = TerminalCommandTool;
exports.terminalCommandTool = new TerminalCommandTool();
//# sourceMappingURL=terminalCommandTool.js.map