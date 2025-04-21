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
exports.showInformationMessage = showInformationMessage;
exports.showErrorMessage = showErrorMessage;
exports.showWarningMessage = showWarningMessage;
exports.showDetailedErrorMessage = showDetailedErrorMessage;
const vscode = __importStar(require("vscode"));
/**
 * Show an information message to the user
 * @param message The message to show
 * @param items Optional items to include as buttons
 * @returns A promise that resolves to the selected item or undefined
 */
function showInformationMessage(message, ...items) {
    return vscode.window.showInformationMessage(message, ...items);
}
/**
 * Show an error message to the user
 * @param message The message to show
 * @param items Optional items to include as buttons
 * @returns A promise that resolves to the selected item or undefined
 */
function showErrorMessage(message, ...items) {
    return vscode.window.showErrorMessage(message, ...items);
}
/**
 * Show a warning message to the user
 * @param message The message to show
 * @param items Optional items to include as buttons
 * @returns A promise that resolves to the selected item or undefined
 */
function showWarningMessage(message, ...items) {
    return vscode.window.showWarningMessage(message, ...items);
}
/**
 * Show a detailed error message with an option to view more details
 * @param message The main error message
 * @param details The detailed error information
 * @param buttons Additional buttons to show
 * @returns A promise that resolves to the selected item or undefined
 */
async function showDetailedErrorMessage(message, details, buttons = []) {
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
//# sourceMappingURL=notifications.js.map