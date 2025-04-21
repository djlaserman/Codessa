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
exports.CodesssaError = void 0;
exports.handleError = handleError;
exports.getNonce = getNonce;
exports.withErrorHandling = withErrorHandling;
exports.createErrorHandler = createErrorHandler;
exports.generateId = generateId;
exports.validateRequired = validateRequired;
exports.errorToString = errorToString;
exports.showDetailedError = showDetailedError;
exports.withProgress = withProgress;
exports.debounce = debounce;
exports.withRetry = withRetry;
exports.generateUUID = generateUUID;
exports.showQuickPick = showQuickPick;
exports.showInputBox = showInputBox;
exports.delay = delay;
exports.resolveWorkspacePath = resolveWorkspacePath;
const vscode = __importStar(require("vscode"));
const logger_1 = require("./logger");
/**
 * Custom error class for Codessa-specific errors
 */
class CodesssaError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CodesssaError';
    }
}
exports.CodesssaError = CodesssaError;
/**
 * Handle errors consistently throughout the extension
 */
function handleError(error, context) {
    if (error instanceof CodesssaError) {
        logger_1.logger.error(`${context}: [${error.code}] ${error.message}`, error.details);
        vscode.window.showErrorMessage(`${error.message} (${error.code})`);
    }
    else if (error instanceof Error) {
        logger_1.logger.error(`${context}: ${error.message}`, error);
        vscode.window.showErrorMessage(`${context}: ${error.message}`);
    }
    else {
        logger_1.logger.error(`${context}: Unknown error`, error);
        vscode.window.showErrorMessage(`${context}: An unexpected error occurred`);
    }
}
/**
 * Generate a nonce string for Content Security Policy
 */
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
/**
 * Run an async operation with proper error handling
 */
async function withErrorHandling(operation, context, options = {}) {
    try {
        return await operation();
    }
    catch (error) {
        if (options.showError !== false) {
            handleError(error, context);
        }
        if (options.rethrow) {
            throw error;
        }
        return undefined;
    }
}
/**
 * Create an error handler function for a specific context
 */
function createErrorHandler(context) {
    return (error) => handleError(error, context);
}
/**
 * Generate a unique ID with an optional prefix
 */
function generateId(prefix) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}
/**
 * Validate that required parameters are present
 */
function validateRequired(params, required) {
    const missing = required.filter(param => params[param] === undefined);
    if (missing.length > 0) {
        throw new CodesssaError(`Missing required parameters: ${missing.join(', ')}`, 'MISSING_PARAMS');
    }
}
/**
 * Convert an error to a string representation
 */
function errorToString(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
/**
 * Show an error message with optional "Show Details" button
 */
async function showDetailedError(message, details, buttons = []) {
    const items = [...buttons];
    if (details) {
        items.push('Show Details');
    }
    const selection = await vscode.window.showErrorMessage(message, ...items);
    if (selection === 'Show Details' && details) {
        const detailsDoc = await vscode.workspace.openTextDocument({
            content: details,
            language: 'text'
        });
        await vscode.window.showTextDocument(detailsDoc);
    }
    return selection;
}
/**
 * Execute a task with a progress indicator
 */
async function withProgress(title, task) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false
    }, task);
}
/**
 * Debounce a function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
/**
 * Retry an operation with exponential backoff
 */
async function withRetry(operation, options = {}) {
    const { maxAttempts = 3, initialDelay = 1000, maxDelay = 10000, backoffFactor = 2 } = options;
    let attempt = 1;
    let delay = initialDelay;
    while (true) {
        try {
            return await operation();
        }
        catch (error) {
            if (attempt >= maxAttempts) {
                throw error;
            }
            logger_1.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay = Math.min(delay * backoffFactor, maxDelay);
            attempt++;
        }
    }
}
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
async function showQuickPick(items, placeHolder) {
    return await vscode.window.showQuickPick(items, { placeHolder });
}
async function showInputBox(prompt, placeHolder, value) {
    return await vscode.window.showInputBox({ prompt, placeHolder, value });
}
// Simple delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Ensures a file path is absolute within the workspace.
 * If relative, resolves it against the first workspace folder.
 * Returns undefined if no workspace is open and path is relative.
 */
function resolveWorkspacePath(filePath) {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        // Check if it's already absolute (has scheme like file://)
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
        // Absolute path outside workspace (allow this)
        return vscode.Uri.parse(filePath);
    }
    // Relative path but no workspace open
    // logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
    return undefined;
}
//# sourceMappingURL=utils.js.map