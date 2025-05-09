"use strict";
/**
 * UI Utilities for Codessa
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNonce = getNonce;
exports.formatTimestamp = formatTimestamp;
exports.escapeHtml = escapeHtml;
exports.isValidUrl = isValidUrl;
exports.truncateString = truncateString;
/**
 * Generate a nonce string for Content Security Policy
 * @returns A random nonce string
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
 * Format a timestamp to a readable date/time string
 * @param timestamp The timestamp to format
 * @returns A formatted date/time string
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
/**
 * Escape HTML special characters to prevent XSS
 * @param text The text to escape
 * @returns Escaped text safe for HTML insertion
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
/**
 * Check if a string is a valid URL
 * @param str The string to check
 * @returns True if the string is a valid URL
 */
function isValidUrl(str) {
    try {
        new URL(str);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Truncate a string to a maximum length with ellipsis
 * @param str The string to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
function truncateString(str, maxLength) {
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength - 3) + '...';
}
//# sourceMappingURL=utils.js.map