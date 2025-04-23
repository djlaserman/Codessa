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
exports.editorActionsTool = exports.EditorActionsTool = void 0;
const vscode = __importStar(require("vscode"));
const advancedEditorActionsTool_1 = require("./advancedEditorActionsTool");
class EditorActionsTool {
    constructor() {
        this.id = 'editor';
        this.name = 'Editor Actions';
        this.description = 'Open, close, navigate, and edit files/tabs; move cursor; select text; multi-cursor; clipboard; batch edit; find/replace.';
        this.actions = {
            'open': {
                id: 'open', name: 'Open File', description: 'Open a file in the editor.',
                inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
                async execute(input) {
                    const filePath = input.filePath;
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc);
                    return { success: true, output: `Opened ${filePath}` };
                }
            },
            'close': {
                id: 'close', name: 'Close Editor', description: 'Close the active editor.',
                inputSchema: { type: 'object', properties: {}, required: [] },
                async execute() {
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                        return { success: true, output: 'Closed active editor' };
                    }
                    else {
                        return { success: false, error: 'No active editor to close.' };
                    }
                }
            },
            'goto': {
                id: 'goto', name: 'Go To Position', description: 'Move cursor to a specific position.',
                inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, line: { type: 'number' }, column: { type: 'number' } }, required: ['filePath', 'line'] },
                async execute(input) {
                    const filePath = input.filePath;
                    const line = input.line;
                    const column = input.column || 0;
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    const editor = await vscode.window.showTextDocument(doc);
                    const pos = new vscode.Position(line, column);
                    editor.selection = new vscode.Selection(pos, pos);
                    editor.revealRange(new vscode.Range(pos, pos));
                    return { success: true, output: `Moved cursor to ${filePath}:${line + 1}:${column + 1}` };
                }
            },
            'edit': {
                id: 'edit', name: 'Edit File', description: 'Edit file at a range or cursor.',
                inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, text: { type: 'string' }, range: { type: 'object' } }, required: ['filePath', 'text'] },
                async execute(input) {
                    const filePath = input.filePath;
                    const text = input.text;
                    const range = input.range;
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    const editor = await vscode.window.showTextDocument(doc);
                    await editor.edit(editBuilder => {
                        if (range && range.start && range.end) {
                            const start = new vscode.Position(range.start.line, range.start.column);
                            const end = new vscode.Position(range.end.line, range.end.column);
                            editBuilder.replace(new vscode.Range(start, end), text);
                        }
                        else {
                            editBuilder.insert(editor.selection.active, text);
                        }
                    });
                    return { success: true, output: `Edited ${filePath}` };
                }
            },
            'select': {
                id: 'select', name: 'Select Text', description: 'Select text in a file.',
                inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, range: { type: 'object' } }, required: ['filePath', 'range'] },
                async execute(input) {
                    const filePath = input.filePath;
                    const range = input.range;
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    const editor = await vscode.window.showTextDocument(doc);
                    const start = new vscode.Position(range.start.line, range.start.column);
                    const end = new vscode.Position(range.end.line, range.end.column);
                    editor.selection = new vscode.Selection(start, end);
                    editor.revealRange(new vscode.Range(start, end));
                    return { success: true, output: `Selected text in ${filePath}` };
                }
            },
            'multiCursor': new advancedEditorActionsTool_1.MultiCursorTool(),
            'clipboard': new advancedEditorActionsTool_1.ClipboardTool(),
            'batchEdit': new advancedEditorActionsTool_1.BatchEditTool(),
            'findReplace': new advancedEditorActionsTool_1.FindReplaceTool(),
        };
    }
    async execute(input, _context) {
        const actionId = input.action;
        if (!actionId) {
            return { success: false, error: `Action parameter is required. Available actions: ${Object.keys(this.actions).join(', ')}` };
        }
        const actionTool = this.actions[actionId];
        if (!actionTool) {
            return { success: false, error: `Unknown editor action: ${actionId}. Available actions: ${Object.keys(this.actions).join(', ')}` };
        }
        const actionInput = { ...input };
        delete actionInput.action;
        return actionTool.execute(actionInput);
    }
}
exports.EditorActionsTool = EditorActionsTool;
exports.editorActionsTool = new EditorActionsTool();
//# sourceMappingURL=editorActionsTool.js.map