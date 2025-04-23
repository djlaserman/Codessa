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
exports.DeleteDirectoryTool = exports.CreateDirectoryTool = exports.CopyFileTool = exports.RenameFileTool = exports.DeleteFileTool = exports.CreateFileTool = void 0;
const vscode = __importStar(require("vscode"));
class CreateFileTool {
    constructor() {
        this.id = 'createFile';
        this.name = 'Create File';
        this.description = 'Creates a new file at the specified path.';
        this.inputSchema = {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to the new file (relative or absolute).' }
            },
            required: ['filePath']
        };
    }
    async execute(input, _context) {
        const filePath = input.filePath;
        if (!filePath)
            return { success: false, error: "'filePath' is required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absPath = filePath.match(/^([a-zA-Z]:)?\\|\//) ? filePath : wsRoot ? `${wsRoot}/${filePath}` : filePath;
            const uri = vscode.Uri.file(absPath);
            await vscode.workspace.fs.writeFile(uri, new Uint8Array());
            return { success: true, output: `File created: ${filePath}` };
        }
        catch (error) {
            return { success: false, error: `Failed to create file: ${error.message || error}` };
        }
    }
}
exports.CreateFileTool = CreateFileTool;
class DeleteFileTool {
    constructor() {
        this.id = 'deleteFile';
        this.name = 'Delete File';
        this.description = 'Deletes the specified file.';
        this.inputSchema = {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to the file to delete (relative or absolute).' }
            },
            required: ['filePath']
        };
    }
    async execute(input, _context) {
        const filePath = input.filePath;
        if (!filePath)
            return { success: false, error: "'filePath' is required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absPath = filePath.match(/^([a-zA-Z]:)?\\|\//) ? filePath : wsRoot ? `${wsRoot}/${filePath}` : filePath;
            const uri = vscode.Uri.file(absPath);
            await vscode.workspace.fs.delete(uri);
            return { success: true, output: `File deleted: ${filePath}` };
        }
        catch (error) {
            return { success: false, error: `Failed to delete file: ${error.message || error}` };
        }
    }
}
exports.DeleteFileTool = DeleteFileTool;
class RenameFileTool {
    constructor() {
        this.id = 'renameFile';
        this.name = 'Rename File';
        this.description = 'Renames a file from oldPath to newPath.';
        this.inputSchema = {
            type: 'object',
            properties: {
                oldPath: { type: 'string', description: 'Current file path.' },
                newPath: { type: 'string', description: 'New file path.' }
            },
            required: ['oldPath', 'newPath']
        };
    }
    async execute(input, _context) {
        const oldPath = input.oldPath;
        const newPath = input.newPath;
        if (!oldPath || !newPath)
            return { success: false, error: "'oldPath' and 'newPath' are required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absOld = oldPath.match(/^([a-zA-Z]:)?\\|\//) ? oldPath : wsRoot ? `${wsRoot}/${oldPath}` : oldPath;
            const absNew = newPath.match(/^([a-zA-Z]:)?\\|\//) ? newPath : wsRoot ? `${wsRoot}/${newPath}` : newPath;
            const oldUri = vscode.Uri.file(absOld);
            const newUri = vscode.Uri.file(absNew);
            await vscode.workspace.fs.rename(oldUri, newUri);
            return { success: true, output: `Renamed file: ${oldPath} -> ${newPath}` };
        }
        catch (error) {
            return { success: false, error: `Failed to rename file: ${error.message || error}` };
        }
    }
}
exports.RenameFileTool = RenameFileTool;
class CopyFileTool {
    constructor() {
        this.id = 'copyFile';
        this.name = 'Copy File';
        this.description = 'Copies a file from sourcePath to destPath.';
        this.inputSchema = {
            type: 'object',
            properties: {
                sourcePath: { type: 'string', description: 'Source file path.' },
                destPath: { type: 'string', description: 'Destination file path.' }
            },
            required: ['sourcePath', 'destPath']
        };
    }
    async execute(input, _context) {
        const sourcePath = input.sourcePath;
        const destPath = input.destPath;
        if (!sourcePath || !destPath)
            return { success: false, error: "'sourcePath' and 'destPath' are required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absSrc = sourcePath.match(/^([a-zA-Z]:)?\\|\//) ? sourcePath : wsRoot ? `${wsRoot}/${sourcePath}` : sourcePath;
            const absDst = destPath.match(/^([a-zA-Z]:)?\\|\//) ? destPath : wsRoot ? `${wsRoot}/${destPath}` : destPath;
            const srcUri = vscode.Uri.file(absSrc);
            const dstUri = vscode.Uri.file(absDst);
            await vscode.workspace.fs.copy(srcUri, dstUri);
            return { success: true, output: `Copied file: ${sourcePath} -> ${destPath}` };
        }
        catch (error) {
            return { success: false, error: `Failed to copy file: ${error.message || error}` };
        }
    }
}
exports.CopyFileTool = CopyFileTool;
class CreateDirectoryTool {
    constructor() {
        this.id = 'createDir';
        this.name = 'Create Directory';
        this.description = 'Creates a new directory at the specified path.';
        this.inputSchema = {
            type: 'object',
            properties: {
                dirPath: { type: 'string', description: 'Path to the new directory (relative or absolute).' }
            },
            required: ['dirPath']
        };
    }
    async execute(input, _context) {
        const dirPath = input.dirPath;
        if (!dirPath)
            return { success: false, error: "'dirPath' is required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absPath = dirPath.match(/^([a-zA-Z]:)?\\|\//) ? dirPath : wsRoot ? `${wsRoot}/${dirPath}` : dirPath;
            const uri = vscode.Uri.file(absPath);
            await vscode.workspace.fs.createDirectory(uri);
            return { success: true, output: `Directory created: ${dirPath}` };
        }
        catch (error) {
            return { success: false, error: `Failed to create directory: ${error.message || error}` };
        }
    }
}
exports.CreateDirectoryTool = CreateDirectoryTool;
class DeleteDirectoryTool {
    constructor() {
        this.id = 'deleteDir';
        this.name = 'Delete Directory';
        this.description = 'Deletes the specified directory and its contents.';
        this.inputSchema = {
            type: 'object',
            properties: {
                dirPath: { type: 'string', description: 'Path to the directory to delete (relative or absolute).' }
            },
            required: ['dirPath']
        };
    }
    async execute(input, _context) {
        const dirPath = input.dirPath;
        if (!dirPath)
            return { success: false, error: "'dirPath' is required." };
        try {
            const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const absPath = dirPath.match(/^([a-zA-Z]:)?\\|\//) ? dirPath : wsRoot ? `${wsRoot}/${dirPath}` : dirPath;
            const uri = vscode.Uri.file(absPath);
            await vscode.workspace.fs.delete(uri, { recursive: true });
            return { success: true, output: `Directory deleted: ${dirPath}` };
        }
        catch (error) {
            return { success: false, error: `Failed to delete directory: ${error.message || error}` };
        }
    }
}
exports.DeleteDirectoryTool = DeleteDirectoryTool;
//# sourceMappingURL=advancedFileTools.js.map