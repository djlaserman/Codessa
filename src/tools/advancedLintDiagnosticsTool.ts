import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';

export class BatchLintTool implements ITool {
    readonly id = 'batchLint';
    readonly name = 'Batch Lint';
    readonly description = 'Run lint on multiple files or the entire workspace.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Files to lint. If empty, lint all.' },
            linter: { type: 'string', description: 'Linter to use (e.g., eslint, stylelint, etc.).' }
        },
        required: []
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const files = input.files as string[] | undefined;
        const linter = input.linter as string || 'eslint';
        try {
            if (files && files.length > 0) {
                for (const file of files) {
                    await vscode.commands.executeCommand('workbench.action.tasks.runTask', `${linter}:lint`, { file });
                }
                return { success: true, output: `Linted ${files.length} files with ${linter}.` };
            } else {
                await vscode.commands.executeCommand('workbench.action.tasks.runTask', `${linter}:lint`);
                return { success: true, output: `Linted entire workspace with ${linter}.` };
            }
        } catch (error: any) {
            return { success: false, error: `Batch lint failed: ${error.message || error}` };
        }
    }
}

export class AutoFixAllTool implements ITool {
    readonly id = 'autoFixAll';
    readonly name = 'Auto Fix All';
    readonly description = 'Automatically fix all fixable lint errors in given files or workspace.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Files to fix. If empty, fix all.' },
            linter: { type: 'string', description: 'Linter to use (e.g., eslint, stylelint, etc.).' }
        },
        required: []
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const files = input.files as string[] | undefined;
        const linter = input.linter as string || 'eslint';
        try {
            if (files && files.length > 0) {
                for (const file of files) {
                    await vscode.commands.executeCommand('workbench.action.tasks.runTask', `${linter}:fix`, { file });
                }
                return { success: true, output: `Auto-fixed ${files.length} files with ${linter}.` };
            } else {
                await vscode.commands.executeCommand('workbench.action.tasks.runTask', `${linter}:fix`);
                return { success: true, output: `Auto-fixed entire workspace with ${linter}.` };
            }
        } catch (error: any) {
            return { success: false, error: `Auto-fix all failed: ${error.message || error}` };
        }
    }
}

export class LintSummaryTool implements ITool {
    readonly id = 'lintSummary';
    readonly name = 'Lint Summary';
    readonly description = 'Generate a summary report of lint errors for the workspace.';
    readonly inputSchema = {
        type: 'object',
        properties: {},
        required: []
    };
    async execute(_input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        try {
            const diagnostics = vscode.languages.getDiagnostics();
            let total = 0;
            let files = 0;
            let summary = diagnostics.map(([uri, diags]) => {
                files++;
                total += diags.length;
                return `${uri.fsPath}: ${diags.length} issues`;
            }).join('\n');
            return { success: true, output: `Total files: ${files}\nTotal issues: ${total}\n${summary}` };
        } catch (error: any) {
            return { success: false, error: `Lint summary failed: ${error.message || error}` };
        }
    }
}

export class DiagnosticsSearchTool implements ITool {
    readonly id = 'diagnosticsSearch';
    readonly name = 'Diagnostics Search';
    readonly description = 'Search/filter diagnostics by message or severity.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Text to search for in diagnostics.' },
            severity: { type: 'number', description: 'Severity to filter (0=Error, 1=Warning, 2=Info, 3=Hint).' }
        },
        required: []
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const query = input.query as string | undefined;
        const severity = input.severity as number | undefined;
        try {
            const diagnostics = vscode.languages.getDiagnostics();
            let results: any[] = [];
            for (const [uri, diags] of diagnostics) {
                for (const diag of diags) {
                    if ((query && !diag.message.includes(query)) || (severity !== undefined && diag.severity !== severity)) continue;
                    results.push({ file: uri.fsPath, message: diag.message, severity: diag.severity, range: diag.range });
                }
            }
            return { success: true, output: results };
        } catch (error: any) {
            return { success: false, error: `Diagnostics search failed: ${error.message || error}` };
        }
    }
}
