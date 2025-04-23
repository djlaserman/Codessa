import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import { MultiCursorTool, ClipboardTool, BatchEditTool, FindReplaceTool } from './advancedEditorActionsTool';

export class EditorActionsTool implements ITool {
    readonly id = 'editor';
    readonly name = 'Editor Actions';
    readonly description = 'Open, close, navigate, and edit files/tabs; move cursor; select text; multi-cursor; clipboard; batch edit; find/replace.';
    readonly actions: { [key: string]: ITool } = {
        'open': {
            id: 'open', name: 'Open File', description: 'Open a file in the editor.',
            inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
            async execute(input: ToolInput) {
                const filePath = input.filePath as string;
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
                } else {
                    return { success: false, error: 'No active editor to close.' };
                }
            }
        },
        'goto': {
            id: 'goto', name: 'Go To Position', description: 'Move cursor to a specific position.',
            inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, line: { type: 'number' }, column: { type: 'number' } }, required: ['filePath', 'line'] },
            async execute(input: ToolInput) {
                const filePath = input.filePath as string;
                const line = input.line as number;
                const column = input.column as number || 0;
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
            async execute(input: ToolInput) {
                const filePath = input.filePath as string;
                const text = input.text as string;
                const range = input.range;
                const doc = await vscode.workspace.openTextDocument(filePath);
                const editor = await vscode.window.showTextDocument(doc);
                await editor.edit(editBuilder => {
                    if (range && range.start && range.end) {
                        const start = new vscode.Position(range.start.line, range.start.column);
                        const end = new vscode.Position(range.end.line, range.end.column);
                        editBuilder.replace(new vscode.Range(start, end), text);
                    } else {
                        editBuilder.insert(editor.selection.active, text);
                    }
                });
                return { success: true, output: `Edited ${filePath}` };
            }
        },
        'select': {
            id: 'select', name: 'Select Text', description: 'Select text in a file.',
            inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, range: { type: 'object' } }, required: ['filePath', 'range'] },
            async execute(input: ToolInput) {
                const filePath = input.filePath as string;
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
        'multiCursor': new MultiCursorTool(),
        'clipboard': new ClipboardTool(),
        'batchEdit': new BatchEditTool(),
        'findReplace': new FindReplaceTool(),
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const actionId = input.action as string;
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

export const editorActionsTool = new EditorActionsTool();
