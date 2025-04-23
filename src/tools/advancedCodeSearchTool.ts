import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import * as cp from 'child_process';

export class FuzzySearchTool implements ITool {
    readonly id = 'fuzzySearch';
    readonly name = 'Fuzzy Code Search';
    readonly description = 'Performs fuzzy search over the codebase using ripgrep with smart-case and fuzzy matching.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Fuzzy search query.' },
            dirPath: { type: 'string', description: 'Directory to search.', default: '.' }
        },
        required: ['query']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const query = input.query as string;
        const dirPath = input.dirPath as string || '.';
        if (!query) return { success: false, error: "'query' is required." };
        let cwd = dirPath;
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
            cwd = dirPath.startsWith('/') || dirPath.match(/^.:\\/) ? dirPath : `${workspaceRoot}/${dirPath}`;
        }
        try {
            const result = await new Promise<string>((resolve, reject) => {
                cp.exec(`rg --no-heading --line-number --color never --smart-case "${query}"`, { cwd }, (err, stdout, stderr) => {
                    if (err && !stdout) return reject(stderr || err.message);
                    resolve(stdout);
                });
            });
            return { success: true, output: result.trim() };
        } catch (error: any) {
            return { success: false, error: `Fuzzy search failed: ${error.message || error}` };
        }
    }
}

export class SemanticSearchTool implements ITool {
    readonly id = 'semanticSearch';
    readonly name = 'Semantic Code Search';
    readonly description = 'Performs semantic search over the codebase using indexed embeddings.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Semantic search query.' },
            topK: { type: 'number', description: 'Number of top results to return.', default: 10 }
        },
        required: ['query']
    };
    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        // Extend AgentContext with optional vectorStore and embeddings for type safety
        type SemanticAgentContext = AgentContext & {
            vectorStore?: any;
            embeddings?: any;
        };
        const semanticContext = context as SemanticAgentContext;
        try {
            // Import polyfill classes
            const { MemoryVectorStore, Embeddings } = require('../workflows/langgraph/corePolyfill');
            const vectorStore = semanticContext?.vectorStore || new MemoryVectorStore();
            const embeddings = semanticContext?.embeddings || new Embeddings();
            const docs = await vectorStore.similaritySearch(input.query, input.topK || 10);
            if (!docs || docs.length === 0) {
                return { success: true, output: 'No similar code snippets found.' };
            }
            return { success: true, output: docs.map((doc: any) => doc.content).join('\n---\n') };
        } catch (err: any) {
            return { success: false, error: `Semantic search failed: ${err.message || err}` };
        }
    }
}

export class SearchPreviewTool implements ITool {
    readonly id = 'searchPreview';
    readonly name = 'Search Result Preview';
    readonly description = 'Provides a preview of code around a search result.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'File path for preview.' },
            line: { type: 'number', description: 'Line number for preview.' },
            context: { type: 'number', description: 'Number of lines before/after.', default: 3 }
        },
        required: ['filePath', 'line']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const { filePath, line, context } = input;
        const doc = await vscode.workspace.openTextDocument(filePath);
        const start = Math.max(0, line - (context || 3));
        const end = Math.min(doc.lineCount - 1, line + (context || 3));
        let lines: string[] = [];
        for (let i = start; i <= end; i++) {
            lines.push(doc.lineAt(i).text);
        }
        return { success: true, output: lines.join('\n') };
    }
}
