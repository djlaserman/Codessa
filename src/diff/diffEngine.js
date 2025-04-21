"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffEngine = void 0;
/// <reference path="../types/diff.d.ts" />
var diff = require("diff");
var logger_1 = require("../logger");
var vscode = require("vscode");
var DiffEngine = /** @class */ (function () {
    function DiffEngine() {
    }
    /**
     * Creates a unified diff patch string between two text contents.
     * @param oldFileName Name/path of the old file (for patch header).
     * @param newFileName Name/path of the new file (for patch header).
     * @param oldStr Content of the old file.
     * @param newStr Content of the new file.
     * @param options Optional diff options.
     * @returns The unified diff patch string.
     */
    DiffEngine.prototype.createPatch = function (oldFileName, newFileName, oldStr, newStr, options) {
        logger_1.logger.debug("Creating patch between \"".concat(oldFileName, "\" and \"").concat(newFileName, "\""));
        try {
            // Ensure consistent line endings (Unix-style) before diffing for reliability
            var cleanOldStr = oldStr.replace(/\r\n/g, '\n');
            var cleanNewStr = newStr.replace(/\r\n/g, '\n');
            // Extract context from options if provided
            var context_1 = options === null || options === void 0 ? void 0 : options.context;
            return diff.createPatch(oldFileName, cleanOldStr, cleanNewStr, '', '', context_1 ? String(context_1) : undefined);
        }
        catch (error) {
            logger_1.logger.error("Error creating patch for \"".concat(oldFileName, "\":"), error);
            throw error; // Re-throw to be handled by caller
        }
    };
    /**
     * Applies a unified diff patch to a string.
     * IMPORTANT: This is sensitive to the exact content the patch was created against.
     * @param patch The unified diff patch string.
     * @param oldStr The original string the patch was created against.
     * @param options Optional patch application options (e.g., fuzz factor).
     * @returns The patched string, or false if the patch cannot be applied cleanly.
     */
    DiffEngine.prototype.applyPatch = function (patch, oldStr, options) {
        var _a;
        logger_1.logger.debug("Attempting to apply patch...");
        try {
            // Ensure consistent line endings (Unix-style) before patching
            var cleanOldStr = oldStr.replace(/\r\n/g, '\n');
            // The patch itself should ideally already use \n, but we parse it anyway
            var result = diff.applyPatch(cleanOldStr, patch, options);
            if (result === false) {
                logger_1.logger.warn("Patch could not be applied cleanly.");
                // Optionally try parsing the patch to see which hunk failed
                var parsed = diff.parsePatch(patch);
                logger_1.logger.debug("Parsed patch hunks:", parsed);
            }
            else {
                logger_1.logger.debug("Patch applied successfully.");
            }
            return result;
        }
        catch (error) {
            // `diff.applyPatch` can throw errors for malformed patches
            logger_1.logger.error("Error applying patch:", error);
            if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('hunk')) {
                // More specific error from the diff library
                vscode.window.showWarningMessage("Patch application failed: ".concat(error.message, ". The file content might have changed since the patch was generated."));
            }
            return false; // Indicate failure
        }
    };
    /**
     * Parses a patch string into its component hunks.
     * @param patch The unified diff patch string.
     * @returns An array of parsed patch objects, or throws on error.
     */
    DiffEngine.prototype.parsePatch = function (patch) {
        logger_1.logger.debug("Parsing patch string.");
        try {
            return diff.parsePatch(patch);
        }
        catch (error) {
            logger_1.logger.error("Error parsing patch string:", error);
            throw error;
        }
    };
    /**
     * Applies multiple patches sequentially to a string.
     * Stops and returns the intermediate result if any patch fails.
     * @param patches Array of patch strings.
     * @param initialStr The starting string content.
     * @param options Optional patch application options.
     * @returns The final string content after applying all successful patches, or false if any patch failed.
     */
    DiffEngine.prototype.applyMultiplePatches = function (patches, initialStr, options) {
        logger_1.logger.debug("Applying ".concat(patches.length, " patches sequentially."));
        var currentContent = initialStr;
        for (var i = 0; i < patches.length; i++) {
            var patch = patches[i];
            // Use typeof check to avoid TypeScript comparison error
            if (typeof currentContent === 'boolean') {
                logger_1.logger.error("Cannot apply patch ".concat(i + 1, ", previous patch failed."));
                return false; // Stop if a previous patch failed
            }
            logger_1.logger.debug("Applying patch ".concat(i + 1, "..."));
            currentContent = this.applyPatch(patch, currentContent, options);
            if (currentContent === false) {
                logger_1.logger.error("Failed to apply patch ".concat(i + 1, "."));
                return false;
            }
        }
        logger_1.logger.info("Successfully applied ".concat(patches.length, " patches."));
        return currentContent;
    };
    return DiffEngine;
}());
exports.diffEngine = new DiffEngine();
