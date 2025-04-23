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
exports.lintDiagnosticsTool = exports.LintDiagnosticsTool = void 0;
const vscode = __importStar(require("vscode"));
const advancedLintDiagnosticsTool_1 = require("./advancedLintDiagnosticsTool");
class LintDiagnosticsTool {
    constructor() {
        this.id = 'lintDiag';
        this.name = 'Linting & Diagnostics (Advanced)';
        this.description = 'Run linters, show diagnostics, apply quick fixes, batch lint/fix, generate summary, and search diagnostics.';
        this.actions = {
            'list': {
                id: 'list', name: 'List Diagnostics', description: 'List diagnostics for a file.',
                inputSchema: { type: 'object', properties: { filePath: { type: 'string' } }, required: ['filePath'] },
                async execute(input) {
                    const filePath = input.filePath;
                    if (!filePath)
                        return { success: false, error: "'filePath' is required for diagnostics list." };
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    const diags = vscode.languages.getDiagnostics(doc.uri);
                    return { success: true, output: diags };
                }
            },
            'fix': {
                id: 'fix', name: 'Fix Diagnostic', description: 'Apply quick fix for a diagnostic.',
                inputSchema: { type: 'object', properties: { filePath: { type: 'string' }, diagnosticIndex: { type: 'number' } }, required: ['filePath', 'diagnosticIndex'] },
                async execute(input) {
                    const filePath = input.filePath;
                    const diagnosticIndex = input.diagnosticIndex;
                    if (!filePath || diagnosticIndex === undefined)
                        return { success: false, error: "'filePath' and 'diagnosticIndex' required for fix." };
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    const diags = vscode.languages.getDiagnostics(doc.uri);
                    const diag = diags[diagnosticIndex];
                    if (!diag)
                        return { success: false, error: `No diagnostic at index ${diagnosticIndex}` };
                    const actions = await vscode.commands.executeCommand('vscode.executeCodeActionProvider', doc.uri, diag.range);
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
                async execute(_input) {
                    await vscode.commands.executeCommand('workbench.action.tasks.runTask', 'lint');
                    return { success: true, output: 'Lint task triggered.' };
                }
            },
            'batchLint': new advancedLintDiagnosticsTool_1.BatchLintTool(),
            'autoFixAll': new advancedLintDiagnosticsTool_1.AutoFixAllTool(),
            'lintSummary': new advancedLintDiagnosticsTool_1.LintSummaryTool(),
            'diagnosticsSearch': new advancedLintDiagnosticsTool_1.DiagnosticsSearchTool(),
        };
    }
    async execute(input, _context) {
        const action = input.action;
        try {
            if (action === 'list') {
                const filePath = input.filePath;
                if (!filePath)
                    return { success: false, error: "'filePath' is required for diagnostics list." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const diags = vscode.languages.getDiagnostics(doc.uri);
                return { success: true, output: diags };
            }
            else if (action === 'fix') {
                const filePath = input.filePath;
                const diagnosticIndex = input.diagnosticIndex;
                if (!filePath || diagnosticIndex === undefined)
                    return { success: false, error: "'filePath' and 'diagnosticIndex' required for fix." };
                const doc = await vscode.workspace.openTextDocument(filePath);
                const diags = vscode.languages.getDiagnostics(doc.uri);
                const diag = diags[diagnosticIndex];
                if (!diag)
                    return { success: false, error: `No diagnostic at index ${diagnosticIndex}` };
                // Try to apply a code action for the diagnostic
                const actions = await vscode.commands.executeCommand('vscode.executeCodeActionProvider', doc.uri, diag.range);
                if (actions && actions.length > 0) {
                    // Apply the first available quick fix
                    await vscode.commands.executeCommand(actions[0].command, ...(actions[0].arguments || []));
                    return { success: true, output: 'Quick fix applied.' };
                }
                return { success: false, error: 'No quick fix available.' };
            }
            else if (action === 'run') {
                // Run default linter for the workspace
                await vscode.commands.executeCommand('workbench.action.tasks.runTask', 'lint');
                return { success: true, output: 'Lint task triggered.' };
            }
            else {
                return { success: false, error: `Unknown lint/diagnostics action: ${action}` };
            }
        }
        catch (error) {
            return { success: false, error: `Lint/diagnostics action failed: ${error.message || error}` };
        }
    }
}
exports.LintDiagnosticsTool = LintDiagnosticsTool;
exports.lintDiagnosticsTool = new LintDiagnosticsTool();
//# sourceMappingURL=lintDiagnosticsTool.js.map