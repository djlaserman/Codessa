import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';

export class MultiCursorTool implements ITool {
    readonly id = 'multiCursor';
    readonly name = 'Multi-Cursor';
    readonly description = 'Add, remove, or move multiple cursors.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            positions: { type: 'array', items: { type: 'object', properties: { line: { type: 'number' }, column: { type: 'number' } } }, description: 'Array of positions for cursors.' }
        },
        required: ['positions']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const positions = input.positions as { line: number; column: number }[];
        const editor = vscode.window.activeTextEditor;
        if (!editor) return { success: false, error: 'No active editor.' };
        if (!positions || positions.length === 0) return { success: false, error: 'No positions provided.' };
        editor.selections = positions.map(pos => new vscode.Selection(pos.line, pos.column, pos.line, pos.column));
        return { success: true, output: `Set ${positions.length} cursors.` };
    }
}

export class ClipboardTool implements ITool {
    readonly id = 'clipboard';
    readonly name = 'Clipboard';
    readonly description = 'Cut, copy, or paste text.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['cut', 'copy', 'paste'], description: 'Clipboard action.' },
            text: { type: 'string', description: 'Text to copy or paste.' }
        },
        required: ['action']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const action = input.action as string;
        const text = input.text as string;
        const editor = vscode.window.activeTextEditor;
        if (!editor) return { success: false, error: 'No active editor.' };
        if (action === 'copy') {
            const selected = editor.document.getText(editor.selection);
            await vscode.env.clipboard.writeText(selected);
            return { success: true, output: 'Copied to clipboard.' };
        } else if (action === 'cut') {
            const selected = editor.document.getText(editor.selection);
            await vscode.env.clipboard.writeText(selected);
            await editor.edit(editBuilder => editBuilder.delete(editor.selection));
            return { success: true, output: 'Cut to clipboard.' };
        } else if (action === 'paste') {
            const pasteText = text || await vscode.env.clipboard.readText();
            await editor.edit(editBuilder => editBuilder.insert(editor.selection.active, pasteText));
            return { success: true, output: 'Pasted from clipboard.' };
        } else {
            return { success: false, error: `Unknown clipboard action: ${action}` };
        }
    }
}

export class BatchEditTool implements ITool {
    readonly id = 'batchEdit';
    readonly name = 'Batch Edit';
    readonly description = 'Perform multiple edits across files/locations.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            edits: {
                type: 'array', items: { type: 'object', properties: { filePath: { type: 'string' }, range: { type: 'object', properties: { start: { type: 'object', properties: { line: { type: 'number' }, column: { type: 'number' } } }, end: { type: 'object', properties: { line: { type: 'number' }, column: { type: 'number' } } } }, text: { type: 'string' } } }, description: 'Array of edits.' }
            },
        },
        required: ['edits']
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const edits = input.edits as { filePath: string; range: { start: { line: number; column: number }, end: { line: number; column: number } }, text: string }[];
        if (!edits || edits.length === 0) return { success: false, error: 'No edits provided.' };
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

export class FindReplaceTool implements ITool {
    readonly id = 'findReplace';
    readonly name = 'Find and Replace';
    readonly description = 'Find and replace text in a file or across files.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'File to search/replace.' },
            find: { type: 'string', description: 'Text or regex to find.' },
            replace: { type: 'string', description: 'Replacement text.' },
            isRegex: { type: 'boolean', description: 'Use regex?' }
        },
        required: ['filePath', 'find', 'replace']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const { filePath, find, replace, isRegex } = input;
        if (!filePath || !find || replace === undefined) return { success: false, error: 'Missing required fields.' };
        const doc = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(doc);
        const text = doc.getText();
        let newText: string;
        if (isRegex) {
            newText = text.replace(new RegExp(find, 'g'), replace);
        } else {
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
