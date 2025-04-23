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
exports.FindReplaceTool = exports.BatchEditTool = exports.ClipboardTool = exports.MultiCursorTool = void 0;
const vscode = __importStar(require("vscode"));
class MultiCursorTool {
    constructor() {
        this.id = 'multiCursor';
        this.name = 'Multi-Cursor';
        this.description = 'Add, remove, or move multiple cursors.';
        this.inputSchema = {
            type: 'object',
            properties: {
                positions: { type: 'array', items: { type: 'object', properties: { line: { type: 'number' }, column: { type: 'number' } } }, description: 'Array of positions for cursors.' }
            },
            required: ['positions']
        };
    }
    async execute(input, _context) {
        const positions = input.positions;
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return { success: false, error: 'No active editor.' };
        if (!positions || positions.length === 0)
            return { success: false, error: 'No positions provided.' };
        editor.selections = positions.map(pos => new vscode.Selection(pos.line, pos.column, pos.line, pos.column));
        return { success: true, output: `Set ${positions.length} cursors.` };
    }
}
exports.MultiCursorTool = MultiCursorTool;
class ClipboardTool {
    constructor() {
        this.id = 'clipboard';
        this.name = 'Clipboard';
        this.description = 'Cut, copy, or paste text.';
        this.inputSchema = {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['cut', 'copy', 'paste'], description: 'Clipboard action.' },
                text: { type: 'string', description: 'Text to copy or paste.' }
            },
            required: ['action']
        };
    }
    async execute(input, _context) {
        const action = input.action;
        const text = input.text;
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return { success: false, error: 'No active editor.' };
        if (action === 'copy') {
            const selected = editor.document.getText(editor.selection);
            await vscode.env.clipboard.writeText(selected);
            return { success: true, output: 'Copied to clipboard.' };
        }
        else if (action === 'cut') {
            const selected = editor.document.getText(editor.selection);
            await vscode.env.clipboard.writeText(selected);
            await editor.edit(editBuilder => editBuilder.delete(editor.selection));
            return { success: true, output: 'Cut to clipboard.' };
        }
        else if (action === 'paste') {
            const pasteText = text || await vscode.env.clipboard.readText();
            await editor.edit(editBuilder => editBuilder.insert(editor.selection.active, pasteText));
            return { success: true, output: 'Pasted from clipboard.' };
        }
        else {
            return { success: false, error: `Unknown clipboard action: ${action}` };
        }
    }
}
exports.ClipboardTool = ClipboardTool;
class BatchEditTool {
    constructor() {
        this.id = 'batchEdit';
        this.name = 'Batch Edit';
        this.description = 'Perform multiple edits across files/locations.';
        this.inputSchema = {
            type: 'object',
            properties: {
                edits: {
                    type: 'array', items: { type: 'object', properties: { filePath: { type: 'string' }, range: { type: 'object', properties: { start: { type: 'object', properties: { line: { type: 'number' }, column: { type: 'number' } } }, end: { type: 'object', properties: { line: { type: 'number' }, column: { type: 'number' } } } }, text: { type: 'string' } } }, description: 'Array of edits.' }
                },
            },
            required: ['edits']
        };
    }
    async execute(input, _context) {
        const edits = input.edits;
        if (!edits || edits.length === 0)
            return { success: false, error: 'No edits provided.' };
        for (const edit of edits) {
            const doc = await vscode.workspace.openTextDocument(edit.filePath);
            const editor = await vscode.window.showTextDocument(doc);
            await editor.edit(editBuilder => {
                const start = new vscode.Position(edit.range.start.line, edit.range.start.column);
                const end = new vscode.Position(edit.range.end.line, edit.range.end.column);
                editBuilder.replace(new vscode.Range(start, end), edit.text);
            });
        }
        return { success: true, output: `Applied ${edits.length} edits.` };
    }
}
exports.BatchEditTool = BatchEditTool;
class FindReplaceTool {
    constructor() {
        this.id = 'findReplace';
        this.name = 'Find and Replace';
        this.description = 'Find and replace text in a file or across files.';
        this.inputSchema = {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'File to search/replace.' },
                find: { type: 'string', description: 'Text or regex to find.' },
                replace: { type: 'string', description: 'Replacement text.' },
                isRegex: { type: 'boolean', description: 'Use regex?' }
            },
            required: ['filePath', 'find', 'replace']
        };
    }
    async execute(input, _context) {
        const { filePath, find, replace, isRegex } = input;
        if (!filePath || !find || replace === undefined)
            return { success: false, error: 'Missing required fields.' };
        const doc = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(doc);
        const text = doc.getText();
        let newText;
        if (isRegex) {
            newText = text.replace(new RegExp(find, 'g'), replace);
        }
        else {
            newText = text.split(find).join(replace);
        }
        const start = new vscode.Position(0, 0);
        const end = new vscode.Position(doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length);
        await editor.edit(editBuilder => {
            editBuilder.replace(new vscode.Range(start, end), newText);
        });
        return { success: true, output: `Replaced '${find}' with '${replace}' in ${filePath}.` };
    }
}
exports.FindReplaceTool = FindReplaceTool;
//# sourceMappingURL=advancedEditorActionsTool.js.map