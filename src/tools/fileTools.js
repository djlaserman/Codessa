"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileSystemTool = exports.ApplyDiffTool = exports.CreateDiffTool = exports.WriteFileTool = exports.ReadFileTool = exports.FileSystemTool = void 0;
var vscode = require("vscode");
var logger_1 = require("../logger");
var diffEngine_1 = require("../diff/diffEngine");
var util_1 = require("util");
var decoder = new util_1.TextDecoder('utf-8');
var encoder = new util_1.TextEncoder();
var FileSystemTool = /** @class */ (function () {
    function FileSystemTool() {
        this.id = 'file';
        this.name = 'File System Operations';
        this.description = 'Provides actions to read, write, diff, and patch files in the workspace. Paths can be relative to the workspace root or absolute.';
        this.actions = {
            'readFile': new ReadFileTool(),
            'writeFile': new WriteFileTool(),
            'createDiff': new CreateDiffTool(),
            'applyDiff': new ApplyDiffTool(),
        };
    }
    FileSystemTool.prototype.execute = function (input, context) {
        return __awaiter(this, void 0, void 0, function () {
            var actionId, actionTool, actionInput;
            return __generator(this, function (_a) {
                actionId = input.action;
                if (!actionId) {
                    return [2 /*return*/, {
                            success: false,
                            error: "Action parameter is required. Available actions: ".concat(Object.keys(this.actions).join(', '))
                        }];
                }
                actionTool = this.actions[actionId];
                if (!actionTool) {
                    return [2 /*return*/, {
                            success: false,
                            error: "Unknown file system action: ".concat(actionId, ". Available actions: ").concat(Object.keys(this.actions).join(', '))
                        }];
                }
                actionInput = __assign({}, input);
                delete actionInput.action;
                return [2 /*return*/, actionTool.execute(actionInput, context)];
            });
        });
    };
    FileSystemTool.prototype.getSubActions = function () {
        return Object.values(this.actions);
    };
    FileSystemTool.prototype.getToolDescriptions = function () {
        var _this = this;
        return this.getSubActions().map(function (a) {
            return "- ".concat(_this.id, ".").concat(a.id, ": ").concat(a.description) +
                (a.inputSchema ? "\n  Arguments: ".concat(JSON.stringify(a.inputSchema)) : '');
        }).join('\n');
    };
    return FileSystemTool;
}());
exports.FileSystemTool = FileSystemTool;
var ReadFileTool = /** @class */ (function () {
    function ReadFileTool() {
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
    ReadFileTool.prototype.execute = function (input, _context) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, fileUri, fileContentUint8, fileContent, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filePath = input.filePath;
                        if (!filePath) {
                            return [2 /*return*/, { success: false, error: "'filePath' is required." }];
                        }
                        fileUri = this.resolveWorkspacePath(filePath);
                        if (!fileUri) {
                            return [2 /*return*/, { success: false, error: "Could not resolve file path: ".concat(filePath, ". Make sure it's relative to an open workspace or absolute.") }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        logger_1.logger.debug("Reading file: ".concat(fileUri.fsPath));
                        return [4 /*yield*/, vscode.workspace.fs.readFile(fileUri)];
                    case 2:
                        fileContentUint8 = _a.sent();
                        fileContent = decoder.decode(fileContentUint8);
                        logger_1.logger.info("Successfully read ".concat(fileContent.length, " characters from ").concat(fileUri.fsPath));
                        return [2 /*return*/, { success: true, output: fileContent }];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error("Error reading file ".concat(fileUri.fsPath, ":"), error_1);
                        if (error_1 instanceof vscode.FileSystemError && error_1.code === 'FileNotFound') {
                            return [2 /*return*/, { success: false, error: "File not found: ".concat(filePath) }];
                        }
                        return [2 /*return*/, { success: false, error: "Failed to read file: ".concat(error_1.message || error_1) }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ReadFileTool.prototype.resolveWorkspacePath = function (filePath) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            var workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            // Check if it's already absolute
            try {
                var uri = vscode.Uri.parse(filePath);
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
        logger_1.logger.warn("Cannot resolve relative path \"".concat(filePath, "\" without an open workspace folder."));
        return undefined;
    };
    return ReadFileTool;
}());
exports.ReadFileTool = ReadFileTool;
var WriteFileTool = /** @class */ (function () {
    function WriteFileTool() {
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
    WriteFileTool.prototype.execute = function (input, _context) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, content, fileUri, contentUint8, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filePath = input.filePath;
                        content = input.content;
                        if (!filePath || content === undefined) {
                            return [2 /*return*/, { success: false, error: "'filePath' and 'content' are required." }];
                        }
                        if (typeof content !== 'string') {
                            return [2 /*return*/, { success: false, error: "'content' must be a string." }];
                        }
                        fileUri = this.resolveWorkspacePath(filePath);
                        if (!fileUri) {
                            return [2 /*return*/, { success: false, error: "Could not resolve file path: ".concat(filePath, ". Make sure it's relative to an open workspace or absolute.") }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        logger_1.logger.debug("Writing to file: ".concat(fileUri.fsPath));
                        contentUint8 = encoder.encode(content);
                        return [4 /*yield*/, vscode.workspace.fs.writeFile(fileUri, contentUint8)];
                    case 2:
                        _a.sent();
                        logger_1.logger.info("Successfully wrote ".concat(content.length, " characters to ").concat(fileUri.fsPath));
                        return [2 /*return*/, { success: true, output: "File ".concat(filePath, " written successfully.") }];
                    case 3:
                        error_2 = _a.sent();
                        logger_1.logger.error("Error writing file ".concat(fileUri.fsPath, ":"), error_2);
                        return [2 /*return*/, { success: false, error: "Failed to write file: ".concat(error_2.message || error_2) }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    WriteFileTool.prototype.resolveWorkspacePath = function (filePath) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            var workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            // Check if it's already absolute
            try {
                var uri = vscode.Uri.parse(filePath);
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
        logger_1.logger.warn("Cannot resolve relative path \"".concat(filePath, "\" without an open workspace folder."));
        return undefined;
    };
    return WriteFileTool;
}());
exports.WriteFileTool = WriteFileTool;
var CreateDiffTool = /** @class */ (function () {
    function CreateDiffTool() {
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
    CreateDiffTool.prototype.execute = function (input, _context) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, newContent, fileUri, originalContent, originalContentUint8, error_3, patch, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filePath = input.filePath;
                        newContent = input.newContent;
                        if (!filePath || newContent === undefined) {
                            return [2 /*return*/, { success: false, error: "'filePath' and 'newContent' are required." }];
                        }
                        fileUri = this.resolveWorkspacePath(filePath);
                        if (!fileUri) {
                            return [2 /*return*/, { success: false, error: "Could not resolve file path: ".concat(filePath, ".") }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        originalContent = '';
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, vscode.workspace.fs.readFile(fileUri)];
                    case 3:
                        originalContentUint8 = _a.sent();
                        originalContent = decoder.decode(originalContentUint8);
                        return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        if (error_3 instanceof vscode.FileSystemError && error_3.code === 'FileNotFound') {
                            // If file doesn't exist, treat original content as empty for diff creation
                            logger_1.logger.debug("File ".concat(filePath, " not found, creating diff against empty content."));
                            originalContent = '';
                        }
                        else {
                            throw error_3; // Re-throw other read errors
                        }
                        return [3 /*break*/, 5];
                    case 5:
                        patch = diffEngine_1.diffEngine.createPatch(filePath, filePath, originalContent, newContent);
                        logger_1.logger.info("Successfully created diff patch for ".concat(filePath));
                        return [2 /*return*/, { success: true, output: patch }];
                    case 6:
                        error_4 = _a.sent();
                        logger_1.logger.error("Error creating diff for ".concat(filePath, ":"), error_4);
                        return [2 /*return*/, { success: false, error: "Failed to create diff: ".concat(error_4.message || error_4) }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    CreateDiffTool.prototype.resolveWorkspacePath = function (filePath) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            var workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            // Check if it's already absolute
            try {
                var uri = vscode.Uri.parse(filePath);
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
        logger_1.logger.warn("Cannot resolve relative path \"".concat(filePath, "\" without an open workspace folder."));
        return undefined;
    };
    return CreateDiffTool;
}());
exports.CreateDiffTool = CreateDiffTool;
var ApplyDiffTool = /** @class */ (function () {
    function ApplyDiffTool() {
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
    ApplyDiffTool.prototype.execute = function (input, _context) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, patch, fileUri, currentContent, currentContentUint8, error_5, patchedContent, patchedContentUint8, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        filePath = input.filePath;
                        patch = input.patch;
                        if (!filePath || !patch) {
                            return [2 /*return*/, { success: false, error: "'filePath' and 'patch' are required." }];
                        }
                        fileUri = this.resolveWorkspacePath(filePath);
                        if (!fileUri) {
                            return [2 /*return*/, { success: false, error: "Could not resolve file path: ".concat(filePath, ".") }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        currentContent = '';
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, vscode.workspace.fs.readFile(fileUri)];
                    case 3:
                        currentContentUint8 = _a.sent();
                        currentContent = decoder.decode(currentContentUint8);
                        return [3 /*break*/, 5];
                    case 4:
                        error_5 = _a.sent();
                        if (error_5 instanceof vscode.FileSystemError && error_5.code === 'FileNotFound') {
                            // If the file doesn't exist, maybe the patch is creating it?
                            logger_1.logger.warn("File ".concat(filePath, " not found. Attempting to apply patch to empty content."));
                            currentContent = '';
                        }
                        else {
                            throw error_5; // Re-throw other read errors
                        }
                        return [3 /*break*/, 5];
                    case 5:
                        patchedContent = diffEngine_1.diffEngine.applyPatch(patch, currentContent);
                        if (patchedContent === false) {
                            // Patch failed to apply
                            return [2 /*return*/, {
                                    success: false,
                                    error: "Patch could not be applied cleanly to ".concat(filePath, ". The file content may have changed, or the patch is invalid/malformed.")
                                }];
                        }
                        // 3. Write the patched content back to the file
                        logger_1.logger.debug("Writing patched content back to: ".concat(fileUri.fsPath));
                        patchedContentUint8 = encoder.encode(patchedContent);
                        return [4 /*yield*/, vscode.workspace.fs.writeFile(fileUri, patchedContentUint8)];
                    case 6:
                        _a.sent();
                        logger_1.logger.info("Successfully applied patch to ".concat(filePath));
                        return [2 /*return*/, { success: true, output: "Patch applied successfully to ".concat(filePath, ".") }];
                    case 7:
                        error_6 = _a.sent();
                        logger_1.logger.error("Error applying patch to ".concat(filePath, ":"), error_6);
                        return [2 /*return*/, { success: false, error: "Failed to apply patch: ".concat(error_6.message || error_6) }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    ApplyDiffTool.prototype.resolveWorkspacePath = function (filePath) {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            var workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
            // Check if it's already absolute
            try {
                var uri = vscode.Uri.parse(filePath);
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
        logger_1.logger.warn("Cannot resolve relative path \"".concat(filePath, "\" without an open workspace folder."));
        return undefined;
    };
    return ApplyDiffTool;
}());
exports.ApplyDiffTool = ApplyDiffTool;
exports.fileSystemTool = new FileSystemTool();
