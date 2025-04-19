import * as vscode from 'vscode';
import { logger } from '../logger';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import { diffEngine } from '../diff/diffEngine';
import { TextDecoder, TextEncoder } from 'util';

const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

export class FileSystemTool implements ITool {
    readonly id = 'file';
    readonly name = 'File System Operations';
    readonly description = 'Provides actions to read, write, diff, and patch files in the workspace. Paths can be relative to the workspace root or absolute.';

    private actions: { [key: string]: ITool } = {
        'readFile': new ReadFileTool(),
        'writeFile': new WriteFileTool(),
        'createDiff': new CreateDiffTool(),
        'applyDiff': new ApplyDiffTool(),
    };

    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const actionId = input.action as string;
        
        if (!actionId) {
            return { 
                success: false, 
                error: `Action parameter is required. Available actions: ${Object.keys(this.actions).join(', ')}` 
            };
        }
        
        const actionTool = this.actions[actionId];

        if (!actionTool) {
            return { 
                success: false, 
                error: `Unknown file system action: ${actionId}. Available actions: ${Object.keys(this.actions).join(', ')}` 
            };
        }

        // Pass the rest of the input to the specific tool
        const actionInput = { ...input };
        delete actionInput.action;

        return actionTool.execute(actionInput, context);
    }

    getSubActions(): ITool[] {
       return Object.values(this.actions);
    }

    getToolDescriptions(): string {
        return this.getSubActions().map(a =>
            `- ${this.id}.${a.id}: ${a.description}` +
            (a.inputSchema ? `\n  Arguments: ${JSON.stringify(a.inputSchema)}` : '')
        ).join('\n');
    }
}

export class ReadFileTool implements ITool {
    readonly id = 'readFile';
    readonly name = 'Read File';
    readonly description = 'Reads the content of a specified file.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file (relative to workspace root or absolute).' }
        },
        required: ['filePath']
    };

    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        
        if (!filePath) {
            return { success: false, error: "'filePath' is required." };
        }

        const fileUri = this.resolveWorkspacePath(filePath);
        if (!fileUri) {
            return { success: false, error: `Could not resolve file path: ${filePath}. Make sure it's relative to an open workspace or absolute.` };
        }

        try {
            logger.debug(`Reading file: ${fileUri.fsPath}`);
            const fileContentUint8 = await vscode.workspace.fs.readFile(fileUri);
            const fileContent = decoder.decode(fileContentUint8);
            logger.info(`Successfully read ${fileContent.length} characters from ${fileUri.fsPath}`);
            return { success: true, output: fileContent };
        } catch (error: any) {
            logger.error(`Error reading file ${fileUri.fsPath}:`, error);
            
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return { success: false, error: `File not found: ${filePath}` };
            }
            
            return { success: false, error: `Failed to read file: ${error.message || error}` };
        }
    }

    private resolveWorkspacePath(filePath: string): vscode.Uri | undefined {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            
            // Check if it's already absolute
            try {
                const uri = vscode.Uri.parse(filePath);
                if (uri.scheme) return uri; // Already absolute
            } catch (e) {
                // Ignore parsing errors, treat as relative
            }
            
            // If relative, join with workspace root
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        } else if (vscode.Uri.parse(filePath).scheme) {
            // Absolute path outside workspace
            return vscode.Uri.parse(filePath);
        }
        
        // Relative path but no workspace open
        logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
        return undefined;
    }
}

export class WriteFileTool implements ITool {
    readonly id = 'writeFile';
    readonly name = 'Write File';
    readonly description = 'Writes content to a specified file, overwriting existing content. Creates the file if it does not exist.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file (relative to workspace root or absolute).' },
            content: { type: 'string', description: 'The content to write to the file.' }
        },
        required: ['filePath', 'content']
    };

    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const content = input.content as string;

        if (!filePath || content === undefined) {
            return { success: false, error: "'filePath' and 'content' are required." };
        }
        
        if (typeof content !== 'string') {
            return { success: false, error: "'content' must be a string." };
        }

        const fileUri = this.resolveWorkspacePath(filePath);
        if (!fileUri) {
            return { success: false, error: `Could not resolve file path: ${filePath}. Make sure it's relative to an open workspace or absolute.` };
        }

        try {
            logger.debug(`Writing to file: ${fileUri.fsPath}`);
            const contentUint8 = encoder.encode(content);
            await vscode.workspace.fs.writeFile(fileUri, contentUint8);
            logger.info(`Successfully wrote ${content.length} characters to ${fileUri.fsPath}`);
            return { success: true, output: `File ${filePath} written successfully.` };
        } catch (error: any) {
            logger.error(`Error writing file ${fileUri.fsPath}:`, error);
            return { success: false, error: `Failed to write file: ${error.message || error}` };
        }
    }

    private resolveWorkspacePath(filePath: string): vscode.Uri | undefined {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            
            // Check if it's already absolute
            try {
                const uri = vscode.Uri.parse(filePath);
                if (uri.scheme) return uri; // Already absolute
            } catch (e) {
                // Ignore parsing errors, treat as relative
            }
            
            // If relative, join with workspace root
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        } else if (vscode.Uri.parse(filePath).scheme) {
            // Absolute path outside workspace
            return vscode.Uri.parse(filePath);
        }
        
        // Relative path but no workspace open
        logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
        return undefined;
    }
}

export class CreateDiffTool implements ITool {
    readonly id = 'createDiff';
    readonly name = 'Create Diff Patch';
    readonly description = 'Creates a unified diff patch between the content of a file and new provided content.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the original file (relative or absolute).' },
            newContent: { type: 'string', description: 'The proposed new content for the file.' }
        },
        required: ['filePath', 'newContent']
    };

    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const newContent = input.newContent as string;

        if (!filePath || newContent === undefined) {
            return { success: false, error: "'filePath' and 'newContent' are required." };
        }

        const fileUri = this.resolveWorkspacePath(filePath);
        if (!fileUri) {
            return { success: false, error: `Could not resolve file path: ${filePath}.` };
        }

        try {
            // Read the original file content
            let originalContent = '';
            try {
                const originalContentUint8 = await vscode.workspace.fs.readFile(fileUri);
                originalContent = decoder.decode(originalContentUint8);
            } catch (error: any) {
                if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                    // If file doesn't exist, treat original content as empty for diff creation
                    logger.debug(`File ${filePath} not found, creating diff against empty content.`);
                    originalContent = '';
                } else {
                    throw error; // Re-throw other read errors
                }
            }

            const patch = diffEngine.createPatch(filePath, filePath, originalContent, newContent);
            logger.info(`Successfully created diff patch for ${filePath}`);
            return { success: true, output: patch };

        } catch (error: any) {
            logger.error(`Error creating diff for ${filePath}:`, error);
            return { success: false, error: `Failed to create diff: ${error.message || error}` };
        }
    }

    private resolveWorkspacePath(filePath: string): vscode.Uri | undefined {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            
            // Check if it's already absolute
            try {
                const uri = vscode.Uri.parse(filePath);
                if (uri.scheme) return uri; // Already absolute
            } catch (e) {
                // Ignore parsing errors, treat as relative
            }
            
            // If relative, join with workspace root
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        } else if (vscode.Uri.parse(filePath).scheme) {
            // Absolute path outside workspace
            return vscode.Uri.parse(filePath);
        }
        
        // Relative path but no workspace open
        logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
        return undefined;
    }
}

export class ApplyDiffTool implements ITool {
    readonly id = 'applyDiff';
    readonly name = 'Apply Diff Patch';
    readonly description = 'Applies a unified diff patch to a specified file. IMPORTANT: The file content should match the state the patch was created against.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file to patch (relative or absolute).' },
            patch: { type: 'string', description: 'The unified diff patch string.' }
        },
        required: ['filePath', 'patch']
    };

    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const patch = input.patch as string;

        if (!filePath || !patch) {
            return { success: false, error: "'filePath' and 'patch' are required." };
        }

        const fileUri = this.resolveWorkspacePath(filePath);
        if (!fileUri) {
            return { success: false, error: `Could not resolve file path: ${filePath}.` };
        }

        try {
            // 1. Read the current content of the file
            let currentContent = '';
            try {
                const currentContentUint8 = await vscode.workspace.fs.readFile(fileUri);
                currentContent = decoder.decode(currentContentUint8);
            } catch (error: any) {
                if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                    // If the file doesn't exist, maybe the patch is creating it?
                    logger.warn(`File ${filePath} not found. Attempting to apply patch to empty content.`);
                    currentContent = '';
                } else {
                    throw error; // Re-throw other read errors
                }
            }

            // 2. Apply the patch
            const patchedContent = diffEngine.applyPatch(patch, currentContent);

            if (patchedContent === false) {
                // Patch failed to apply
                return { 
                    success: false, 
                    error: `Patch could not be applied cleanly to ${filePath}. The file content may have changed, or the patch is invalid/malformed.` 
                };
            }

            // 3. Write the patched content back to the file
            logger.debug(`Writing patched content back to: ${fileUri.fsPath}`);
            const patchedContentUint8 = encoder.encode(patchedContent);
            await vscode.workspace.fs.writeFile(fileUri, patchedContentUint8);

            logger.info(`Successfully applied patch to ${filePath}`);
            return { success: true, output: `Patch applied successfully to ${filePath}.` };

        } catch (error: any) {
            logger.error(`Error applying patch to ${filePath}:`, error);
            return { success: false, error: `Failed to apply patch: ${error.message || error}` };
        }
    }

    private resolveWorkspacePath(filePath: string): vscode.Uri | undefined {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            
            // Check if it's already absolute
            try {
                const uri = vscode.Uri.parse(filePath);
                if (uri.scheme) return uri; // Already absolute
            } catch (e) {
                // Ignore parsing errors, treat as relative
            }
            
            // If relative, join with workspace root
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        } else if (vscode.Uri.parse(filePath).scheme) {
            // Absolute path outside workspace
            return vscode.Uri.parse(filePath);
        }
        
        // Relative path but no workspace open
        logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
        return undefined;
    }
}

export const fileSystemTool = new FileSystemTool();
