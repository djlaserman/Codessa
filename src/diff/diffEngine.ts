/// <reference path="../types/diff.d.ts" />
import * as diff from 'diff';
import { logger } from '../logger';
import * as vscode from 'vscode';

export interface DiffHunk extends diff.Hunk {}
export interface ApplyPatchOptions extends diff.ApplyPatchOptions {}
export interface CreatePatchOptions extends diff.CreatePatchOptions {}

class DiffEngine {
    /**
     * Creates a unified diff patch string between two text contents.
     * @param oldFileName Name/path of the old file (for patch header).
     * @param newFileName Name/path of the new file (for patch header).
     * @param oldStr Content of the old file.
     * @param newStr Content of the new file.
     * @param options Optional diff options.
     * @returns The unified diff patch string.
     */
    createPatch(oldFileName: string, newFileName: string, oldStr: string, newStr: string, options?: CreatePatchOptions): string {
        logger.debug(`Creating patch between "${oldFileName}" and "${newFileName}"`);
        try {
            // Ensure consistent line endings (Unix-style) before diffing for reliability
            const cleanOldStr = oldStr.replace(/\r\n/g, '\n');
            const cleanNewStr = newStr.replace(/\r\n/g, '\n');
            // Extract context from options if provided
            const context = options?.context;
            return diff.createPatch(oldFileName, cleanOldStr, cleanNewStr, '', '', context ? String(context) : undefined);
        } catch (error) {
            logger.error(`Error creating patch for "${oldFileName}":`, error);
            throw error; // Re-throw to be handled by caller
        }
    }

    /**
     * Applies a unified diff patch to a string.
     * IMPORTANT: This is sensitive to the exact content the patch was created against.
     * @param patch The unified diff patch string.
     * @param oldStr The original string the patch was created against.
     * @param options Optional patch application options (e.g., fuzz factor).
     * @returns The patched string, or false if the patch cannot be applied cleanly.
     */
    applyPatch(patch: string, oldStr: string, options?: ApplyPatchOptions): string | false {
        logger.debug(`Attempting to apply patch...`);
        try {
            // Ensure consistent line endings (Unix-style) before patching
            const cleanOldStr = oldStr.replace(/\r\n/g, '\n');
            // The patch itself should ideally already use \n, but we parse it anyway
            const result = diff.applyPatch(cleanOldStr, patch, options);

            if (result === false) {
                logger.warn("Patch could not be applied cleanly.");
                // Optionally try parsing the patch to see which hunk failed
                const parsed = diff.parsePatch(patch);
                logger.debug("Parsed patch hunks:", parsed);
            } else {
                logger.debug("Patch applied successfully.");
            }
            return result;
        } catch (error: any) {
            // `diff.applyPatch` can throw errors for malformed patches
            logger.error("Error applying patch:", error);
            if (error.message?.includes('hunk')) {
                // More specific error from the diff library
                vscode.window.showWarningMessage(`Patch application failed: ${error.message}. The file content might have changed since the patch was generated.`);
            }
            return false; // Indicate failure
        }
    }

    /**
     * Parses a patch string into its component hunks.
     * @param patch The unified diff patch string.
     * @returns An array of parsed patch objects, or throws on error.
     */
    parsePatch(patch: string): diff.ParsedDiff[] {
        logger.debug("Parsing patch string.");
        try {
            return diff.parsePatch(patch);
        } catch (error) {
            logger.error("Error parsing patch string:", error);
            throw error;
        }
    }

    /**
     * Applies multiple patches sequentially to a string.
     * Stops and returns the intermediate result if any patch fails.
     * @param patches Array of patch strings.
     * @param initialStr The starting string content.
     * @param options Optional patch application options.
     * @returns The final string content after applying all successful patches, or false if any patch failed.
     */
    applyMultiplePatches(patches: string[], initialStr: string, options?: ApplyPatchOptions): string | false {
        logger.debug(`Applying ${patches.length} patches sequentially.`);
        let currentContent: string | false = initialStr;

        for (let i = 0; i < patches.length; i++) {
            const patch = patches[i];
            // Use typeof check to avoid TypeScript comparison error
            if (typeof currentContent === 'boolean') {
                logger.error(`Cannot apply patch ${i + 1}, previous patch failed.`);
                return false; // Stop if a previous patch failed
            }
            logger.debug(`Applying patch ${i + 1}...`);
            currentContent = this.applyPatch(patch, currentContent, options);

            if (currentContent === false) {
                logger.error(`Failed to apply patch ${i + 1}.`);
                return false;
            }
        }

        logger.info(`Successfully applied ${patches.length} patches.`);
        return currentContent;
    }
}

export const diffEngine = new DiffEngine();
