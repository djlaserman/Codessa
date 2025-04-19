import * as vscode from 'vscode';

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function showQuickPick<T extends vscode.QuickPickItem>(items: T[], placeholder: string): Promise<T | undefined> {
    return await vscode.window.showQuickPick(items, { placeholder });
}

export async function showInputBox(prompt: string, placeholder?: string, value?: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({ prompt, placeholder, value });
}

// Simple delay function
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function showQuickPick<T extends vscode.QuickPickItem>(items: T[], placeholder: string): Promise<T | undefined> {
    return await vscode.window.showQuickPick(items, { placeholder });
}

export async function showInputBox(prompt: string, placeholder?: string, value?: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({ prompt, placeholder, value });
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

import { logger } from './logger';
