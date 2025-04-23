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
exports.codeIntelligenceTool = exports.CodeIntelligenceTool = void 0;
const vscode = __importStar(require("vscode"));
class CodeIntelligenceTool {
    constructor() {
        this.id = 'codeIntel';
        this.name = 'Code Intelligence';
        this.description = 'Go to definition, find references, symbol search, hover docs.';
        this.inputSchema = {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['gotoDefinition', 'findReferences', 'symbolSearch', 'hover'], description: 'Code intelligence action.' },
                filePath: { type: 'string', description: 'File path for action.' },
                position: { type: 'object', description: 'Cursor position.', properties: { line: { type: 'number' }, column: { type: 'number' } } },
                query: { type: 'string', description: 'Query for symbol search.' }
            },
            required: ['action']
        };
    }
    async execute(input, _context) {
        const action = input.action;
        try {
            if (action === 'gotoDefinition') {
                const { filePath, position } = input;
                if (!filePath || !position)
                    return { success: false, error: "'filePath' and 'position' are required." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const pos = new vscode.Position(position.line, position.column);
                const locations = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', doc.uri, pos);
                return { success: true, output: locations };
            }
            else if (action === 'findReferences') {
                const { filePath, position } = input;
                if (!filePath || !position)
                    return { success: false, error: "'filePath' and 'position' are required." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const pos = new vscode.Position(position.line, position.column);
                const locations = await vscode.commands.executeCommand('vscode.executeReferenceProvider', doc.uri, pos);
                return { success: true, output: locations };
            }
            else if (action === 'symbolSearch') {
                const query = input.query;
                if (!query)
                    return { success: false, error: "'query' is required for symbol search." };
                const symbols = await vscode.commands.executeCommand('vscode.executeWorkspaceSymbolProvider', query);
                return { success: true, output: symbols };
            }
            else if (action === 'hover') {
                const { filePath, position } = input;
                if (!filePath || !position)
                    return { success: false, error: "'filePath' and 'position' are required." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const pos = new vscode.Position(position.line, position.column);
                const hovers = await vscode.commands.executeCommand('vscode.executeHoverProvider', doc.uri, pos);
                return { success: true, output: hovers };
            }
            else {
                return { success: false, error: `Unknown code intelligence action: ${action}` };
            }
        }
        catch (error) {
            return { success: false, error: `Code intelligence action failed: ${error.message || error}` };
        }
    }
}
exports.CodeIntelligenceTool = CodeIntelligenceTool;
exports.codeIntelligenceTool = new CodeIntelligenceTool();
//# sourceMappingURL=codeIntelligenceTool.js.map