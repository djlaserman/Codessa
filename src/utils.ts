import * as vscode from 'vscode';
import { logger } from './logger';

/**
 * Custom error class for Codessa-specific errors
 */
export class CodesssaError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'CodesssaError';
    }
}

/**
 * Handle errors consistently throughout the extension
 */
export function handleError(error: unknown, context: string): void {
    if (error instanceof CodesssaError) {
        logger.error(`${context}: [${error.code}] ${error.message}`, error.details);
        vscode.window.showErrorMessage(`${error.message} (${error.code})`);
    } else if (error instanceof Error) {
        logger.error(`${context}: ${error.message}`, error);
        vscode.window.showErrorMessage(`${context}: ${error.message}`);
    } else {
        logger.error(`${context}: Unknown error`, error);
        vscode.window.showErrorMessage(`${context}: An unexpected error occurred`);
    }
}

/**
 * Generate a nonce string for Content Security Policy
 */
export function getNonce(): string {
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
export async function withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    options: {
        showError?: boolean;
        rethrow?: boolean;
    } = {}
): Promise<T | undefined> {
    try {
        return await operation();
    } catch (error) {
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
export function createErrorHandler(context: string) {
    return (error: unknown) => handleError(error, context);
}

/**
 * Generate a unique ID with an optional prefix
 */
export function generateId(prefix?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Validate that required parameters are present
 */
export function validateRequired(params: Record<string, any>, required: string[]): void {
    const missing = required.filter(param => params[param] === undefined);
    if (missing.length > 0) {
        throw new CodesssaError(
            `Missing required parameters: ${missing.join(', ')}`,
            'MISSING_PARAMS'
        );
    }
}

/**
 * Convert an error to a string representation
 */
export function errorToString(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

/**
 * Show an error message with optional "Show Details" button
 */
export async function showDetailedError(
    message: string,
    details?: string,
    buttons: string[] = []
): Promise<string | undefined> {
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
export async function withProgress<T>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
): Promise<T> {
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false
        },
        task
    );
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return function executedFunction(...args: Parameters<T>) {
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
export async function withRetry<T>(
    operation: () => Promise<T>,
    options: {
        maxAttempts?: number;
        initialDelay?: number;
        maxDelay?: number;
        backoffFactor?: number;
    } = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2
    } = options;

    let attempt = 1;
    let delay = initialDelay;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= maxAttempts) {
                throw error;
            }

            logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            delay = Math.min(delay * backoffFactor, maxDelay);
            attempt++;
        }
    }
}

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function showQuickPick<T extends vscode.QuickPickItem>(items: T[], placeHolder: string): Promise<T | undefined> {
    return await vscode.window.showQuickPick(items, { placeHolder });
}

export async function showInputBox(prompt: string, placeHolder?: string, value?: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({ prompt, placeHolder, value });
}

// Simple delay function
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensures a file path is absolute within the workspace.
 * If relative, resolves it against the first workspace folder.
 * Returns undefined if no workspace is open and path is relative.
 */
export function resolveWorkspacePath(filePath: string): vscode.Uri | undefined {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        // Check if it's already absolute (has scheme like file://)
        try {
             const uri = vscode.Uri.parse(filePath);
             if (uri.scheme) return uri; // Already absolute
        } catch (e) {
            // Ignore parsing errors, treat as relative
        }
        // If relative, join with workspace root
        return vscode.Uri.joinPath(workspaceRoot, filePath);
    } else if (vscode.Uri.parse(filePath).scheme) {
         // Absolute path outside workspace (allow this)
         return vscode.Uri.parse(filePath);
    }
    // Relative path but no workspace open
    // logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
    return undefined;
}

