import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';

export class CreateFileTool implements ITool {
    readonly id = 'createFile';
    readonly name = 'Create File';
    readonly description = 'Creates a new file at the specified path.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the new file (relative or absolute).' }
        },
        required: ['filePath']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        if (!filePath) return { success: false, error: "'filePath' is required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absPath = filePath.match(/^([a-zA-Z]:)?\\|\//) ? filePath : wsRoot ? `${wsRoot}/${filePath}` : filePath;
            const uri = vscode.Uri.file(absPath);
            await vscode.workspace.fs.writeFile(uri, new Uint8Array());
            return { success: true, output: `File created: ${filePath}` };
        } catch (error: any) {
            return { success: false, error: `Failed to create file: ${error.message || error}` };
        }
    }
}

export class DeleteFileTool implements ITool {
    readonly id = 'deleteFile';
    readonly name = 'Delete File';
    readonly description = 'Deletes the specified file.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file to delete (relative or absolute).' }
        },
        required: ['filePath']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        if (!filePath) return { success: false, error: "'filePath' is required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absPath = filePath.match(/^([a-zA-Z]:)?\\|\//) ? filePath : wsRoot ? `${wsRoot}/${filePath}` : filePath;
            const uri = vscode.Uri.file(absPath);
            await vscode.workspace.fs.delete(uri);
            return { success: true, output: `File deleted: ${filePath}` };
        } catch (error: any) {
            return { success: false, error: `Failed to delete file: ${error.message || error}` };
        }
    }
}

export class RenameFileTool implements ITool {
    readonly id = 'renameFile';
    readonly name = 'Rename File';
    readonly description = 'Renames a file from oldPath to newPath.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            oldPath: { type: 'string', description: 'Current file path.' },
            newPath: { type: 'string', description: 'New file path.' }
        },
        required: ['oldPath', 'newPath']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const oldPath = input.oldPath as string;
        const newPath = input.newPath as string;
        if (!oldPath || !newPath) return { success: false, error: "'oldPath' and 'newPath' are required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absOld = oldPath.match(/^([a-zA-Z]:)?\\|\//) ? oldPath : wsRoot ? `${wsRoot}/${oldPath}` : oldPath;
            const absNew = newPath.match(/^([a-zA-Z]:)?\\|\//) ? newPath : wsRoot ? `${wsRoot}/${newPath}` : newPath;
            const oldUri = vscode.Uri.file(absOld);
            const newUri = vscode.Uri.file(absNew);
            await vscode.workspace.fs.rename(oldUri, newUri);
            return { success: true, output: `Renamed file: ${oldPath} -> ${newPath}` };
        } catch (error: any) {
            return { success: false, error: `Failed to rename file: ${error.message || error}` };
        }
    }
}

export class CopyFileTool implements ITool {
    readonly id = 'copyFile';
    readonly name = 'Copy File';
    readonly description = 'Copies a file from sourcePath to destPath.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            sourcePath: { type: 'string', description: 'Source file path.' },
            destPath: { type: 'string', description: 'Destination file path.' }
        },
        required: ['sourcePath', 'destPath']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const sourcePath = input.sourcePath as string;
        const destPath = input.destPath as string;
        if (!sourcePath || !destPath) return { success: false, error: "'sourcePath' and 'destPath' are required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absSrc = sourcePath.match(/^([a-zA-Z]:)?\\|\//) ? sourcePath : wsRoot ? `${wsRoot}/${sourcePath}` : sourcePath;
            const absDst = destPath.match(/^([a-zA-Z]:)?\\|\//) ? destPath : wsRoot ? `${wsRoot}/${destPath}` : destPath;
            const srcUri = vscode.Uri.file(absSrc);
            const dstUri = vscode.Uri.file(absDst);
            await vscode.workspace.fs.copy(srcUri, dstUri);
            return { success: true, output: `Copied file: ${sourcePath} -> ${destPath}` };
        } catch (error: any) {
            return { success: false, error: `Failed to copy file: ${error.message || error}` };
        }
    }
}

export class CreateDirectoryTool implements ITool {
    readonly id = 'createDir';
    readonly name = 'Create Directory';
    readonly description = 'Creates a new directory at the specified path.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            dirPath: { type: 'string', description: 'Path to the new directory (relative or absolute).' }
        },
        required: ['dirPath']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const dirPath = input.dirPath as string;
        if (!dirPath) return { success: false, error: "'dirPath' is required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absPath = dirPath.match(/^([a-zA-Z]:)?\\|\//) ? dirPath : wsRoot ? `${wsRoot}/${dirPath}` : dirPath;
            const uri = vscode.Uri.file(absPath);
            await vscode.workspace.fs.createDirectory(uri);
            return { success: true, output: `Directory created: ${dirPath}` };
        } catch (error: any) {
            return { success: false, error: `Failed to create directory: ${error.message || error}` };
        }
    }
}

export class DeleteDirectoryTool implements ITool {
    readonly id = 'deleteDir';
    readonly name = 'Delete Directory';
    readonly description = 'Deletes the specified directory and its contents.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            dirPath: { type: 'string', description: 'Path to the directory to delete (relative or absolute).' }
        },
        required: ['dirPath']
    };
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const dirPath = input.dirPath as string;
        if (!dirPath) return { success: false, error: "'dirPath' is required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absPath = dirPath.match(/^([a-zA-Z]:)?\\|\//) ? dirPath : wsRoot ? `${wsRoot}/${dirPath}` : dirPath;
            const uri = vscode.Uri.file(absPath);
            await vscode.workspace.fs.delete(uri, { recursive: true });
            return { success: true, output: `Directory deleted: ${dirPath}` };
        } catch (error: any) {
            return { success: false, error: `Failed to delete directory: ${error.message || error}` };
        }
    }
}
