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
exports.codeSearchTool = exports.CodeSearchTool = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
const advancedCodeSearchTool_1 = require("./advancedCodeSearchTool");
class CodeSearchTool {
    constructor() {
        this.id = 'codeSearch';
        this.name = 'Code Search (ripgrep + advanced)';
        this.description = 'Searches codebase using ripgrep (rg), fuzzy search, semantic search, and provides result previews.';
        this.actions = {
            'basic': {
                id: 'basic', name: 'Basic Code Search', description: 'Searches codebase using ripgrep (rg). Returns matching lines.',
                inputSchema: { type: 'object', properties: { query: { type: 'string' }, dirPath: { type: 'string', default: '.' } }, required: ['query'] },
                async execute(input) {
                    const query = input.query;
                    const dirPath = input.dirPath || '.';
                    let cwd = dirPath;
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                        cwd = dirPath.startsWith('/') || dirPath.match(/^.:\\/) ? dirPath : `${workspaceRoot}/${dirPath}`;
                    }
                    const result = await new Promise((resolve, reject) => {
                        cp.exec(`rg --no-heading --line-number --color never "${query}"`, { cwd }, (err, stdout, stderr) => {
                            if (err && !stdout)
                                return reject(stderr || err.message);
                            resolve(stdout);
                        });
                    });
                    return { success: true, output: result.trim() };
                }
            },
            'fuzzySearch': new advancedCodeSearchTool_1.FuzzySearchTool(),
            'semanticSearch': new advancedCodeSearchTool_1.SemanticSearchTool(),
            'searchPreview': new advancedCodeSearchTool_1.SearchPreviewTool(),
        };
    }
    async execute(input, _context) {
        const actionId = input.action || 'basic';
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
exports.CodeSearchTool = CodeSearchTool;
exports.codeSearchTool = new CodeSearchTool();
//# sourceMappingURL=codeSearchTool.js.map