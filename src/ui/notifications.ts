import * as vscode from 'vscode';

/**
 * Show an information message to the user
 * @param message The message to show
 * @param items Optional items to include as buttons
 * @returns A promise that resolves to the selected item or undefined
 */
export function showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
}

/**
 * Show an error message to the user
 * @param message The message to show
 * @param items Optional items to include as buttons
 * @returns A promise that resolves to the selected item or undefined
 */
export function showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message, ...items);
}

/**
 * Show a warning message to the user
 * @param message The message to show
 * @param items Optional items to include as buttons
 * @returns A promise that resolves to the selected item or undefined
 */
export function showWarningMessage(message: string, ...items: string[]): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(message, ...items);
}

/**
 * Show a detailed error message with an option to view more details
 * @param message The main error message
 * @param details The detailed error information
 * @param buttons Additional buttons to show
 * @returns A promise that resolves to the selected item or undefined
 */
export async function showDetailedErrorMessage(
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
