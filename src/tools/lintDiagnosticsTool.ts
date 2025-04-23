import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import { BatchLintTool, AutoFixAllTool, LintSummaryTool, DiagnosticsSearchTool } from './advancedLintDiagnosticsTool';

export class LintDiagnosticsTool implements ITool {
    readonly id = 'lintDiag';
    readonly name = 'Linting & Diagnostics (Advanced)';
    readonly description = 'Run linters, show diagnostics, apply quick fixes, batch lint/fix, generate summary, and search diagnostics.';
    readonly actions: { [key: string]: ITool } = {
        'list': {
            id: 'list', name: 'List Diagnostics', description: 'List diagnostics for a file.',
            inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
            async execute(input: ToolInput) {
                const filePath = input.filePath as string;
                if (!filePath) return { success: false, error: "'filePath' is required for diagnostics list." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const diags = vscode.languages.getDiagnostics(doc.uri);
                return { success: true, output: diags };
            }
        },
        'fix': {
            id: 'fix', name: 'Fix Diagnostic', description: 'Apply quick fix for a diagnostic.',
            inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, diagnosticIndex: { type: 'number' } }, required: ['filePath', 'diagnosticIndex'] },
            async execute(input: ToolInput) {
                const filePath = input.filePath as string;
                const diagnosticIndex = input.diagnosticIndex as number;
                if (!filePath || diagnosticIndex === undefined) return { success: false, error: "'filePath' and 'diagnosticIndex' required for fix." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const diags = vscode.languages.getDiagnostics(doc.uri);
                const diag = diags[diagnosticIndex];
                if (!diag) return { success: false, error: `No diagnostic at index ${diagnosticIndex}` };
                const actions = await vscode.commands.executeCommand<any[]>('vscode.executeCodeActionProvider', doc.uri, diag.range);
                if (actions && actions.length > 0) {
                    await vscode.commands.executeCommand(actions[0].command, ...(actions[0].arguments || []));
                    return { success: true, output: 'Quick fix applied.' };
                }
                return { success: false, error: 'No quick fix available.' };
            }
        },
        'run': {
            id: 'run', name: 'Run Linter', description: 'Run default linter for workspace.',
            inputSchema: { type: 'object', properties: {}, required: [] },
            async execute(_input: ToolInput) {
                await vscode.commands.executeCommand('workbench.action.tasks.runTask', 'lint');
                return { success: true, output: 'Lint task triggered.' };
            }
        },
        'batchLint': new BatchLintTool(),
        'autoFixAll': new AutoFixAllTool(),
        'lintSummary': new LintSummaryTool(),
        'diagnosticsSearch': new DiagnosticsSearchTool(),
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const action = input.action as string;
        try {
            if (action === 'list') {
                const filePath = input.filePath as string;
                if (!filePath) return { success: false, error: "'filePath' is required for diagnostics list." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const diags = vscode.languages.getDiagnostics(doc.uri);
                return { success: true, output: diags };
            } else if (action === 'fix') {
                const filePath = input.filePath as string;
                const diagnosticIndex = input.diagnosticIndex as number;
                if (!filePath || diagnosticIndex === undefined) return { success: false, error: "'filePath' and 'diagnosticIndex' required for fix." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const diags = vscode.languages.getDiagnostics(doc.uri);
                const diag = diags[diagnosticIndex];
                if (!diag) return { success: false, error: `No diagnostic at index ${diagnosticIndex}` };
                // Try to apply a code action for the diagnostic
                const actions = await vscode.commands.executeCommand<any[]>('vscode.executeCodeActionProvider', doc.uri, diag.range);
                if (actions && actions.length > 0) {
                    // Apply the first available quick fix
                    await vscode.commands.executeCommand(actions[0].command, ...(actions[0].arguments || []));
                    return { success: true, output: 'Quick fix applied.' };
                }
                return { success: false, error: 'No quick fix available.' };
            } else if (action === 'run') {
                // Run default linter for the workspace
                await vscode.commands.executeCommand('workbench.action.tasks.runTask', 'lint');
                return { success: true, output: 'Lint task triggered.' };
            } else {
                return { success: false, error: `Unknown lint/diagnostics action: ${action}` };
            }
        } catch (error: any) {
            return { success: false, error: `Lint/diagnostics action failed: ${error.message || error}` };
        }
    }
}

export const lintDiagnosticsTool = new LintDiagnosticsTool();
