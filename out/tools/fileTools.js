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
exports.fileSystemTool = exports.ApplyDiffTool = exports.CreateDiffTool = exports.WriteFileTool = exports.ReadFileTool = exports.FileSystemTool = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const diffEngine_1 = require("../diff/diffEngine");
const util_1 = require("util");
const advancedFileTools_1 = require("./advancedFileTools");
const decoder = new util_1.TextDecoder('utf-8');
const encoder = new util_1.TextEncoder();
class FileSystemTool {
    constructor() {
        this.id = 'file';
        this.name = 'File System Operations';
        this.description = 'Provides actions to read, write, diff, patch, create, delete, rename, copy files, and create/delete directories in the workspace. Paths can be relative to the workspace root or absolute.';
        this.actions = {
            'readFile': new ReadFileTool(),
            'writeFile': new WriteFileTool(),
            'createDiff': new CreateDiffTool(),
            'applyDiff': new ApplyDiffTool(),
            'createFile': new advancedFileTools_1.CreateFileTool(),
            'deleteFile': new advancedFileTools_1.DeleteFileTool(),
            'renameFile': new advancedFileTools_1.RenameFileTool(),
            'copyFile': new advancedFileTools_1.CopyFileTool(),
            'createDir': new advancedFileTools_1.CreateDirectoryTool(),
            'deleteDir': new advancedFileTools_1.DeleteDirectoryTool(),
        };
    }
    async execute(input, context) {
        const actionId = input.action;
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
    getSubActions() {
        return Object.values(this.actions);
    }
    getToolDescriptions() {
        return this.getSubActions().map(a => `- ${this.id}.${a.id}: ${a.description}` +
            (a.inputSchema ? `\n  Arguments: ${JSON.stringify(a.inputSchema)}` : '')).join('\n');
    }
}
exports.FileSystemTool = FileSystemTool;
class ReadFileTool {
    constructor() {
        this.id = 'readFile';
        this.name = 'Read File';
        this.description = 'Reads the content of a specified file.';
        this.inputSchema = {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to the file (relative to workspace root or absolute).' }
            },
            required: ['filePath']
        };
    }
    async execute(input, _context) {
        const filePath = input.filePath;
        if (!filePath) {
            return { success: false, error: "'filePath' is required." };
        }
        const fileUri = this.resolveWorkspacePath(filePath);
        if (!fileUri) {
            return { success: false, error: `Could not resolve file path: ${filePath}. Make sure it's relative to an open workspace or absolute.` };
        }
        try {
            logger_1.logger.debug(`Reading file: ${fileUri.fsPath}`);
            const fileContentUint8 = await vscode.workspace.fs.readFile(fileUri);
            const fileContent = decoder.decode(fileContentUint8);
            logger_1.logger.info(`Successfully read ${fileContent.length} characters from ${fileUri.fsPath}`);
            return { success: true, output: fileContent };
        }
        catch (error) {
            logger_1.logger.error(`Error reading file ${fileUri.fsPath}:`, error);
            if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                return { success: false, error: `File not found: ${filePath}` };
            }
            return { success: false, error: `Failed to read file: ${error.message || error}` };
        }
    }
    resolveWorkspacePath(filePath) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            // Check if it's already absolute
            try {
                const uri = vscode.Uri.parse(filePath);
                if (uri.scheme)
                    return uri; // Already absolute
            }
            catch (e) {
                // Ignore parsing errors, treat as relative
            }
            // If relative, join with workspace root
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        }
        else if (vscode.Uri.parse(filePath).scheme) {
            // Absolute path outside workspace
            return vscode.Uri.parse(filePath);
        }
        // Relative path but no workspace open
        logger_1.logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
        return undefined;
    }
}
exports.ReadFileTool = ReadFileTool;
class WriteFileTool {
    constructor() {
        this.id = 'writeFile';
        this.name = 'Write File';
        this.description = 'Writes content to a specified file, overwriting existing content. Creates the file if it does not exist.';
        this.inputSchema = {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to the file (relative to workspace root or absolute).' },
                content: { type: 'string', description: 'The content to write to the file.' }
            },
            required: ['filePath', 'content']
        };
    }
    async execute(input, _context) {
        const filePath = input.filePath;
        const content = input.content;
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
            logger_1.logger.debug(`Writing to file: ${fileUri.fsPath}`);
            const contentUint8 = encoder.encode(content);
            await vscode.workspace.fs.writeFile(fileUri, contentUint8);
            logger_1.logger.info(`Successfully wrote ${content.length} characters to ${fileUri.fsPath}`);
            return { success: true, output: `File ${filePath} written successfully.` };
        }
        catch (error) {
            logger_1.logger.error(`Error writing file ${fileUri.fsPath}:`, error);
            return { success: false, error: `Failed to write file: ${error.message || error}` };
        }
    }
    resolveWorkspacePath(filePath) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            // Check if it's already absolute
            try {
                const uri = vscode.Uri.parse(filePath);
                if (uri.scheme)
                    return uri; // Already absolute
            }
            catch (e) {
                // Ignore parsing errors, treat as relative
            }
            // If relative, join with workspace root
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        }
        else if (vscode.Uri.parse(filePath).scheme) {
            // Absolute path outside workspace
            return vscode.Uri.parse(filePath);
        }
        // Relative path but no workspace open
        logger_1.logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
        return undefined;
    }
}
exports.WriteFileTool = WriteFileTool;
class CreateDiffTool {
    constructor() {
        this.id = 'createDiff';
        this.name = 'Create Diff Patch';
        this.description = 'Creates a unified diff patch between the content of a file and new provided content.';
        this.inputSchema = {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to the original file (relative or absolute).' },
                newContent: { type: 'string', description: 'The proposed new content for the file.' }
            },
            required: ['filePath', 'newContent']
        };
    }
    async execute(input, _context) {
        const filePath = input.filePath;
        const newContent = input.newContent;
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
            }
            catch (error) {
                if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                    // If file doesn't exist, treat original content as empty for diff creation
                    logger_1.logger.debug(`File ${filePath} not found, creating diff against empty content.`);
                    originalContent = '';
                }
                else {
                    throw error; // Re-throw other read errors
                }
            }
            const patch = diffEngine_1.diffEngine.createPatch(filePath, filePath, originalContent, newContent);
            logger_1.logger.info(`Successfully created diff patch for ${filePath}`);
            return { success: true, output: patch };
        }
        catch (error) {
            logger_1.logger.error(`Error creating diff for ${filePath}:`, error);
            return { success: false, error: `Failed to create diff: ${error.message || error}` };
        }
    }
    resolveWorkspacePath(filePath) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            // Check if it's already absolute
            try {
                const uri = vscode.Uri.parse(filePath);
                if (uri.scheme)
                    return uri; // Already absolute
            }
            catch (e) {
                // Ignore parsing errors, treat as relative
            }
            // If relative, join with workspace root
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        }
        else if (vscode.Uri.parse(filePath).scheme) {
            // Absolute path outside workspace
            return vscode.Uri.parse(filePath);
        }
        // Relative path but no workspace open
        logger_1.logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
        return undefined;
    }
}
exports.CreateDiffTool = CreateDiffTool;
class ApplyDiffTool {
    constructor() {
        this.id = 'applyDiff';
        this.name = 'Apply Diff Patch';
        this.description = 'Applies a unified diff patch to a specified file. IMPORTANT: The file content should match the state the patch was created against.';
        this.inputSchema = {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to the file to patch (relative or absolute).' },
                patch: { type: 'string', description: 'The unified diff patch string.' }
            },
            required: ['filePath', 'patch']
        };
    }
    async execute(input, _context) {
        const filePath = input.filePath;
        const patch = input.patch;
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
            }
            catch (error) {
                if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                    // If the file doesn't exist, maybe the patch is creating it?
                    logger_1.logger.warn(`File ${filePath} not found. Attempting to apply patch to empty content.`);
                    currentContent = '';
                }
                else {
                    throw error; // Re-throw other read errors
                }
            }
            // 2. Apply the patch
            const patchedContent = diffEngine_1.diffEngine.applyPatch(patch, currentContent);
            if (patchedContent === false) {
                // Patch failed to apply
                return {
                    success: false,
                    error: `Patch could not be applied cleanly to ${filePath}. The file content may have changed, or the patch is invalid/malformed.`
                };
            }
            // 3. Write the patched content back to the file
            logger_1.logger.debug(`Writing patched content back to: ${fileUri.fsPath}`);
            const patchedContentUint8 = encoder.encode(patchedContent);
            await vscode.workspace.fs.writeFile(fileUri, patchedContentUint8);
            logger_1.logger.info(`Successfully applied patch to ${filePath}`);
            return { success: true, output: `Patch applied successfully to ${filePath}.` };
        }
        catch (error) {
            logger_1.logger.error(`Error applying patch to ${filePath}:`, error);
            return { success: false, error: `Failed to apply patch: ${error.message || error}` };
        }
    }
    resolveWorkspacePath(filePath) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            // Check if it's already absolute
            try {
                const uri = vscode.Uri.parse(filePath);
                if (uri.scheme)
                    return uri; // Already absolute
            }
            catch (e) {
                // Ignore parsing errors, treat as relative
            }
            // If relative, join with workspace root
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        }
        else if (vscode.Uri.parse(filePath).scheme) {
            // Absolute path outside workspace
            return vscode.Uri.parse(filePath);
        }
        // Relative path but no workspace open
        logger_1.logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
        return undefined;
    }
}
exports.ApplyDiffTool = ApplyDiffTool;
exports.fileSystemTool = new FileSystemTool();
//# sourceMappingURL=fileTools.js.map