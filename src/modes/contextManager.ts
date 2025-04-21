import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ContextSource, ContextType } from './operationMode';
import { logger } from '../logger';

/**
 * Manages context for operation modes
 */
export class ContextManager {
    private static instance: ContextManager;
    private context: vscode.ExtensionContext | undefined;
    private workspaceRoot: string | undefined;

    private constructor() {
        // Get workspace root
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            this.workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): ContextManager {
        if (!ContextManager.instance) {
            ContextManager.instance = new ContextManager();
        }
        return ContextManager.instance;
    }

    /**
     * Initialize the context manager
     */
    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
    }

    /**
     * Get context content based on context source
     */
    public async getContextContent(contextSource: ContextSource): Promise<string> {
        try {
            switch (contextSource.type) {
                case ContextType.NONE:
                    return '';
                
                case ContextType.ENTIRE_CODEBASE:
                    return await this.getEntireCodebaseContext();
                
                case ContextType.SELECTED_FILES:
                    return await this.getSelectedFilesContext(contextSource.files || []);
                
                case ContextType.CURRENT_FILE:
                    return await this.getCurrentFileContext();
                
                case ContextType.CUSTOM:
                    return contextSource.customContent || '';
                
                default:
                    return '';
            }
        } catch (error) {
            logger.error('Error getting context content:', error);
            return '';
        }
    }

    /**
     * Get context for the entire codebase
     * Note: This is a simplified implementation. In a real-world scenario,
     * you would want to use a more sophisticated approach to handle large codebases.
     */
    private async getEntireCodebaseContext(): Promise<string> {
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
        } catch (error) {
            logger.error('Error getting entire codebase context:', error);
            return 'Error getting codebase context.';
        }
    }

    /**
     * Get context for selected files
     */
    private async getSelectedFilesContext(filePaths: string[]): Promise<string> {
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
                } catch (error) {
                    logger.error(`Error reading file ${filePath}:`, error);
                    context += `
File: ${filePath}
Error reading file.

`;
                }
            }
            
            return context;
        } catch (error) {
            logger.error('Error getting selected files context:', error);
            return 'Error getting selected files context.';
        }
    }

    /**
     * Get context for the current file
     */
    private async getCurrentFileContext(): Promise<string> {
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
        } catch (error) {
            logger.error('Error getting current file context:', error);
            return 'Error getting current file context.';
        }
    }

    /**
     * Get a file tree representation of the workspace
     */
    private async getFileTree(rootPath: string, depth: number = 3): Promise<string> {
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
                } else if (stats.isFile()) {
                    tree += `${file}\n`;
                }
            }
            
            return tree;
        } catch (error) {
            logger.error('Error getting file tree:', error);
            return 'Error getting file tree.';
        }
    }

    /**
     * Get content of key files in the workspace
     */
    private async getKeyFiles(rootPath: string): Promise<string> {
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
                } catch (error) {
                    logger.debug(`Error reading key file ${pattern}:`, error);
                }
            }
            
            return keyFilesContent;
        } catch (error) {
            logger.error('Error getting key files:', error);
            return 'Error getting key files.';
        }
    }

    /**
     * Create a context source from a selection
     */
    public async createContextFromSelection(): Promise<ContextSource> {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return { type: ContextType.NONE };
        }
        
        const document = editor.document;
        const selection = editor.selection;
        
        if (selection.isEmpty) {
            // No selection, use the entire file
            return {
                type: ContextType.CURRENT_FILE
            };
        } else {
            // Use the selected text
            const selectedText = document.getText(selection);
            
            return {
                type: ContextType.CUSTOM,
                customContent: selectedText
            };
        }
    }

    /**
     * Create a context source from a file picker
     */
    public async createContextFromFilePicker(): Promise<ContextSource> {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: 'Select Files for Context'
        });
        
        if (!files || files.length === 0) {
            return { type: ContextType.NONE };
        }
        
        return {
            type: ContextType.SELECTED_FILES,
            files: files.map(file => file.fsPath)
        };
    }

    /**
     * Create a context source from a folder picker
     */
    public async createContextFromFolderPicker(): Promise<ContextSource> {
        const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: true,
            openLabel: 'Select Folders for Context'
        });
        
        if (!folders || folders.length === 0) {
            return { type: ContextType.NONE };
        }
        
        return {
            type: ContextType.SELECTED_FILES,
            folders: folders.map(folder => folder.fsPath)
        };
    }

    /**
     * Create a context source from external resources
     */
    public async createContextFromExternalResources(urls: string[]): Promise<ContextSource> {
        return {
            type: ContextType.CUSTOM,
            externalResources: urls
        };
    }
}

// Export singleton instance
export const contextManager = ContextManager.getInstance();
