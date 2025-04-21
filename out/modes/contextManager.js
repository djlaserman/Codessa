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
exports.contextManager = exports.ContextManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const operationMode_1 = require("./operationMode");
const logger_1 = require("../logger");
/**
 * Manages context for operation modes
 */
class ContextManager {
    constructor() {
        // Get workspace root
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!ContextManager.instance) {
            ContextManager.instance = new ContextManager();
        }
        return ContextManager.instance;
    }
    /**
     * Initialize the context manager
     */
    initialize(context) {
        this.context = context;
    }
    /**
     * Get context content based on context source
     */
    async getContextContent(contextSource) {
        try {
            switch (contextSource.type) {
                case operationMode_1.ContextType.NONE:
                    return '';
                case operationMode_1.ContextType.ENTIRE_CODEBASE:
                    return await this.getEntireCodebaseContext();
                case operationMode_1.ContextType.SELECTED_FILES:
                    return await this.getSelectedFilesContext(contextSource.files || []);
                case operationMode_1.ContextType.CURRENT_FILE:
                    return await this.getCurrentFileContext();
                case operationMode_1.ContextType.CUSTOM:
                    return contextSource.customContent || '';
                default:
                    return '';
            }
        }
        catch (error) {
            logger_1.logger.error('Error getting context content:', error);
            return '';
        }
    }
    /**
     * Get context for the entire codebase
     * Note: This is a simplified implementation. In a real-world scenario,
     * you would want to use a more sophisticated approach to handle large codebases.
     */
    async getEntireCodebaseContext() {
        if (!this.workspaceRoot) {
            return 'No workspace open.';
        }
        try {
            // Get a summary of the codebase structure
            const fileTree = await this.getFileTree(this.workspaceRoot);
            // Get content of key files (this is simplified)
            const keyFiles = await this.getKeyFiles(this.workspaceRoot);
            return `
Workspace structure:
${fileTree}

Key files:
${keyFiles}
`;
        }
        catch (error) {
            logger_1.logger.error('Error getting entire codebase context:', error);
            return 'Error getting codebase context.';
        }
    }
    /**
     * Get context for selected files
     */
    async getSelectedFilesContext(filePaths) {
        if (filePaths.length === 0) {
            return 'No files selected.';
        }
        try {
            let context = '';
            for (const filePath of filePaths) {
                try {
                    const content = await fs.promises.readFile(filePath, 'utf-8');
                    const relativePath = this.workspaceRoot ? path.relative(this.workspaceRoot, filePath) : filePath;
                    context += `
File: ${relativePath}
\`\`\`
${content}
\`\`\`

`;
                }
                catch (error) {
                    logger_1.logger.error(`Error reading file ${filePath}:`, error);
                    context += `
File: ${filePath}
Error reading file.

`;
                }
            }
            return context;
        }
        catch (error) {
            logger_1.logger.error('Error getting selected files context:', error);
            return 'Error getting selected files context.';
        }
    }
    /**
     * Get context for the current file
     */
    async getCurrentFileContext() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return 'No file open.';
        }
        try {
            const document = editor.document;
            const content = document.getText();
            const fileName = document.fileName;
            const relativePath = this.workspaceRoot ? path.relative(this.workspaceRoot, fileName) : fileName;
            return `
File: ${relativePath}
\`\`\`
${content}
\`\`\`
`;
        }
        catch (error) {
            logger_1.logger.error('Error getting current file context:', error);
            return 'Error getting current file context.';
        }
    }
    /**
     * Get a file tree representation of the workspace
     */
    async getFileTree(rootPath, depth = 3) {
        try {
            const files = await fs.promises.readdir(rootPath);
            let tree = '';
            for (const file of files) {
                // Skip node_modules, .git, etc.
                if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') {
                    continue;
                }
                const filePath = path.join(rootPath, file);
                const stats = await fs.promises.stat(filePath);
                if (stats.isDirectory() && depth > 0) {
                    tree += `${file}/\n`;
                    const subTree = await this.getFileTree(filePath, depth - 1);
                    tree += subTree.split('\n').map(line => `  ${line}`).join('\n') + '\n';
                }
                else if (stats.isFile()) {
                    tree += `${file}\n`;
                }
            }
            return tree;
        }
        catch (error) {
            logger_1.logger.error('Error getting file tree:', error);
            return 'Error getting file tree.';
        }
    }
    /**
     * Get content of key files in the workspace
     */
    async getKeyFiles(rootPath) {
        try {
            // Key files to look for
            const keyFilePatterns = [
                'package.json',
                'tsconfig.json',
                'README.md',
                'src/index.ts',
                'src/index.js',
                'src/main.ts',
                'src/main.js',
                'src/app.ts',
                'src/app.js'
            ];
            let keyFilesContent = '';
            for (const pattern of keyFilePatterns) {
                const filePath = path.join(rootPath, pattern);
                try {
                    if (fs.existsSync(filePath)) {
                        const content = await fs.promises.readFile(filePath, 'utf-8');
                        keyFilesContent += `
File: ${pattern}
\`\`\`
${content}
\`\`\`

`;
                    }
                }
                catch (error) {
                    logger_1.logger.debug(`Error reading key file ${pattern}:`, error);
                }
            }
            return keyFilesContent;
        }
        catch (error) {
            logger_1.logger.error('Error getting key files:', error);
            return 'Error getting key files.';
        }
    }
    /**
     * Create a context source from a selection
     */
    async createContextFromSelection() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return { type: operationMode_1.ContextType.NONE };
        }
        const document = editor.document;
        const selection = editor.selection;
        if (selection.isEmpty) {
            // No selection, use the entire file
            return {
                type: operationMode_1.ContextType.CURRENT_FILE
            };
        }
        else {
            // Use the selected text
            const selectedText = document.getText(selection);
            return {
                type: operationMode_1.ContextType.CUSTOM,
                customContent: selectedText
            };
        }
    }
    /**
     * Create a context source from a file picker
     */
    async createContextFromFilePicker() {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: 'Select Files for Context'
        });
        if (!files || files.length === 0) {
            return { type: operationMode_1.ContextType.NONE };
        }
        return {
            type: operationMode_1.ContextType.SELECTED_FILES,
            files: files.map(file => file.fsPath)
        };
    }
    /**
     * Create a context source from a folder picker
     */
    async createContextFromFolderPicker() {
        const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: true,
            openLabel: 'Select Folders for Context'
        });
        if (!folders || folders.length === 0) {
            return { type: operationMode_1.ContextType.NONE };
        }
        return {
            type: operationMode_1.ContextType.SELECTED_FILES,
            folders: folders.map(folder => folder.fsPath)
        };
    }
    /**
     * Create a context source from external resources
     */
    async createContextFromExternalResources(urls) {
        return {
            type: operationMode_1.ContextType.CUSTOM,
            externalResources: urls
        };
    }
}
exports.ContextManager = ContextManager;
// Export singleton instance
exports.contextManager = ContextManager.getInstance();
//# sourceMappingURL=contextManager.js.map