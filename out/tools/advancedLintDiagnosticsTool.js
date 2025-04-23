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
exports.DiagnosticsSearchTool = exports.LintSummaryTool = exports.AutoFixAllTool = exports.BatchLintTool = void 0;
const vscode = __importStar(require("vscode"));
class BatchLintTool {
    constructor() {
        this.id = 'batchLint';
        this.name = 'Batch Lint';
        this.description = 'Run lint on multiple files or the entire workspace.';
        this.inputSchema = {
            type: 'object',
            properties: {
                files: { type: 'array', items: { type: 'string' }, description: 'Files to lint. If empty, lint all.' },
                linter: { type: 'string', description: 'Linter to use (e.g., eslint, stylelint, etc.).' }
            },
            required: []
        };
    }
    async execute(input, _context) {
        const files = input.files;
        const linter = input.linter || 'eslint';
        try {
            if (files && files.length > 0) {
                for (const file of files) {
                    await vscode.commands.executeCommand('workbench.action.tasks.runTask', `${linter}:lint`, { file });
                }
                return { success: true, output: `Linted ${files.length} files with ${linter}.` };
            }
            else {
                await vscode.commands.executeCommand('workbench.action.tasks.runTask', `${linter}:lint`);
                return { success: true, output: `Linted entire workspace with ${linter}.` };
            }
        }
        catch (error) {
            return { success: false, error: `Batch lint failed: ${error.message || error}` };
        }
    }
}
exports.BatchLintTool = BatchLintTool;
class AutoFixAllTool {
    constructor() {
        this.id = 'autoFixAll';
        this.name = 'Auto Fix All';
        this.description = 'Automatically fix all fixable lint errors in given files or workspace.';
        this.inputSchema = {
            type: 'object',
            properties: {
                files: { type: 'array', items: { type: 'string' }, description: 'Files to fix. If empty, fix all.' },
                linter: { type: 'string', description: 'Linter to use (e.g., eslint, stylelint, etc.).' }
            },
            required: []
        };
    }
    async execute(input, _context) {
        const files = input.files;
        const linter = input.linter || 'eslint';
        try {
            if (files && files.length > 0) {
                for (const file of files) {
                    await vscode.commands.executeCommand('workbench.action.tasks.runTask', `${linter}:fix`, { file });
                }
                return { success: true, output: `Auto-fixed ${files.length} files with ${linter}.` };
            }
            else {
                await vscode.commands.executeCommand('workbench.action.tasks.runTask', `${linter}:fix`);
                return { success: true, output: `Auto-fixed entire workspace with ${linter}.` };
            }
        }
        catch (error) {
            return { success: false, error: `Auto-fix all failed: ${error.message || error}` };
        }
    }
}
exports.AutoFixAllTool = AutoFixAllTool;
class LintSummaryTool {
    constructor() {
        this.id = 'lintSummary';
        this.name = 'Lint Summary';
        this.description = 'Generate a summary report of lint errors for the workspace.';
        this.inputSchema = {
            type: 'object',
            properties: {},
            required: []
        };
    }
    async execute(_input, _context) {
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
        }
        catch (error) {
            return { success: false, error: `Lint summary failed: ${error.message || error}` };
        }
    }
}
exports.LintSummaryTool = LintSummaryTool;
class DiagnosticsSearchTool {
    constructor() {
        this.id = 'diagnosticsSearch';
        this.name = 'Diagnostics Search';
        this.description = 'Search/filter diagnostics by message or severity.';
        this.inputSchema = {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Text to search for in diagnostics.' },
                severity: { type: 'number', description: 'Severity to filter (0=Error, 1=Warning, 2=Info, 3=Hint).' }
            },
            required: []
        };
    }
    async execute(input, _context) {
        const query = input.query;
        const severity = input.severity;
        try {
            const diagnostics = vscode.languages.getDiagnostics();
            let results = [];
            for (const [uri, diags] of diagnostics) {
                for (const diag of diags) {
                    if ((query && !diag.message.includes(query)) || (severity !== undefined && diag.severity !== severity))
                        continue;
                    results.push({ file: uri.fsPath, message: diag.message, severity: diag.severity, range: diag.range });
                }
            }
            return { success: true, output: results };
        }
        catch (error) {
            return { success: false, error: `Diagnostics search failed: ${error.message || error}` };
        }
    }
}
exports.DiagnosticsSearchTool = DiagnosticsSearchTool;
//# sourceMappingURL=advancedLintDiagnosticsTool.js.map