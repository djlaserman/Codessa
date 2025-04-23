import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';

export class CodeIntelligenceTool implements ITool {
    readonly id = 'codeIntel';
    readonly name = 'Code Intelligence';
    readonly description = 'Go to definition, find references, symbol search, hover docs.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['gotoDefinition', 'findReferences', 'symbolSearch', 'hover'], description: 'Code intelligence action.' },
            filePath: { type: 'string', description: 'File path for action.' },
            position: { type: 'object', description: 'Cursor position.', properties: { line: { type: 'number' }, column: { type: 'number' } } },
            query: { type: 'string', description: 'Query for symbol search.' }
        },
        required: ['action']
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const action = input.action as string;
        try {
            if (action === 'gotoDefinition') {
                const { filePath, position } = input;
                if (!filePath || !position) return { success: false, error: "'filePath' and 'position' are required." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const pos = new vscode.Position(position.line, position.column);
                const locations = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', doc.uri, pos);
                return { success: true, output: locations };
            } else if (action === 'findReferences') {
                const { filePath, position } = input;
                if (!filePath || !position) return { success: false, error: "'filePath' and 'position' are required." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const pos = new vscode.Position(position.line, position.column);
                const locations = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', doc.uri, pos);
                return { success: true, output: locations };
            } else if (action === 'symbolSearch') {
                const query = input.query as string;
                if (!query) return { success: false, error: "'query' is required for symbol search." };
                const symbols = await vscode.commands.executeCommand<any[]>('vscode.executeWorkspaceSymbolProvider', query);
                return { success: true, output: symbols };
            } else if (action === 'hover') {
                const { filePath, position } = input;
                if (!filePath || !position) return { success: false, error: "'filePath' and 'position' are required." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const pos = new vscode.Position(position.line, position.column);
                const hovers = await vscode.commands.executeCommand<any[]>('vscode.executeHoverProvider', doc.uri, pos);
                return { success: true, output: hovers };
            } else {
                return { success: false, error: `Unknown code intelligence action: ${action}` };
            }
        } catch (error: any) {
            return { success: false, error: `Code intelligence action failed: ${error.message || error}` };
        }
    }
}

export const codeIntelligenceTool = new CodeIntelligenceTool();
