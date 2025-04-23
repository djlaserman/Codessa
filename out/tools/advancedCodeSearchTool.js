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
exports.SearchPreviewTool = exports.SemanticSearchTool = exports.FuzzySearchTool = void 0;
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
class FuzzySearchTool {
    constructor() {
        this.id = 'fuzzySearch';
        this.name = 'Fuzzy Code Search';
        this.description = 'Performs fuzzy search over the codebase using ripgrep with smart-case and fuzzy matching.';
        this.inputSchema = {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Fuzzy search query.' },
                dirPath: { type: 'string', description: 'Directory to search.', default: '.' }
            },
            required: ['query']
        };
    }
    async execute(input, _context) {
        const query = input.query;
        const dirPath = input.dirPath || '.';
        if (!query)
            return { success: false, error: "'query' is required." };
        let cwd = dirPath;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            cwd = dirPath.startsWith('/') || dirPath.match(/^.:\\/) ? dirPath : `${workspaceRoot}/${dirPath}`;
        }
        try {
            const result = await new Promise((resolve, reject) => {
                cp.exec(`rg --no-heading --line-number --color never --smart-case "${query}"`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout)
                        return reject(stderr || err.message);
                    resolve(stdout);
                });
            });
            return { success: true, output: result.trim() };
        }
        catch (error) {
            return { success: false, error: `Fuzzy search failed: ${error.message || error}` };
        }
    }
}
exports.FuzzySearchTool = FuzzySearchTool;
class SemanticSearchTool {
    constructor() {
        this.id = 'semanticSearch';
        this.name = 'Semantic Code Search';
        this.description = 'Performs semantic search over the codebase using indexed embeddings.';
        this.inputSchema = {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Semantic search query.' },
                topK: { type: 'number', description: 'Number of top results to return.', default: 10 }
            },
            required: ['query']
        };
    }
    async execute(input, context) {
        // Placeholder for actual embedding/semantic search integration
        // For now, just echo the query and topK
        return { success: true, output: `Semantic search for: ${input.query} (topK=${input.topK || 10}) [Integration needed]` };
    }
}
exports.SemanticSearchTool = SemanticSearchTool;
class SearchPreviewTool {
    constructor() {
        this.id = 'searchPreview';
        this.name = 'Search Result Preview';
        this.description = 'Provides a preview of code around a search result.';
        this.inputSchema = {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'File path for preview.' },
                line: { type: 'number', description: 'Line number for preview.' },
                context: { type: 'number', description: 'Number of lines before/after.', default: 3 }
            },
            required: ['filePath', 'line']
        };
    }
    async execute(input, _context) {
        const { filePath, line, context } = input;
        const doc = await vscode.workspace.openTextDocument(filePath);
        const start = Math.max(0, line - (context || 3));
        const end = Math.min(doc.lineCount - 1, line + (context || 3));
        let lines = [];
        for (let i = start; i <= end; i++) {
            lines.push(doc.lineAt(i).text);
        }
        return { success: true, output: lines.join('\n') };
    }
}
exports.SearchPreviewTool = SearchPreviewTool;
//# sourceMappingURL=advancedCodeSearchTool.js.map