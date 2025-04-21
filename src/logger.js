"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var vscode = require("vscode");
var config_1 = require("./config");
var LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
var Logger = /** @class */ (function () {
    function Logger() {
        var _this = this;
        this.currentLogLevel = 'info';
        this.outputChannel = vscode.window.createOutputChannel('Codessa');
        this.updateLogLevel();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(function (e) {
            if (e.affectsConfiguration('codessa.logLevel')) {
                _this.updateLogLevel();
            }
        });
    }
    Logger.prototype.updateLogLevel = function () {
        this.currentLogLevel = (0, config_1.getLogLevel)();
        this.debug("Log level set to: ".concat(this.currentLogLevel));
    };
    Logger.prototype.shouldLog = function (level) {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLogLevel];
    };
    Logger.prototype.formatMessage = function (level, message, details) {
        var timestamp = new Date().toISOString();
        var levelPadded = level.toUpperCase().padEnd(5);
        var formattedMessage = "[".concat(timestamp, "] ").concat(levelPadded, " ").concat(message);
        if (details) {
            if (details instanceof Error) {
                formattedMessage += "\n  Stack: ".concat(details.stack || 'No stack trace available');
            }
            else if (typeof details === 'object') {
                try {
                    formattedMessage += "\n  Details: ".concat(JSON.stringify(details, null, 2));
                }
                catch (e) {
                    formattedMessage += "\n  Details: [Object cannot be stringified]";
                }
            }
            else {
                formattedMessage += "\n  Details: ".concat(details);
            }
        }
        return formattedMessage;
    };
    Logger.prototype.log = function (level, message, details) {
        if (this.shouldLog(level)) {
            var formattedMessage = this.formatMessage(level, message, details);
            this.outputChannel.appendLine(formattedMessage);
            // For errors, also show notification
            if (level === 'error') {
                vscode.window.showErrorMessage(message);
            }
        }
    };
    Logger.prototype.debug = function (message, details) {
        this.log('debug', message, details);
    };
    Logger.prototype.info = function (message, details) {
        this.log('info', message, details);
    };
    Logger.prototype.warn = function (message, details) {
        this.log('warn', message, details);
    };
    Logger.prototype.error = function (message, details) {
        this.log('error', message, details);
    };
    /**
     * Show the output channel
     */
    Logger.prototype.show = function () {
        this.outputChannel.show();
    };
    /**
     * Clear the output channel
     */
    Logger.prototype.clear = function () {
        this.outputChannel.clear();
    };
    /**
     * Dispose the output channel
     */
    Logger.prototype.dispose = function () {
        this.outputChannel.dispose();
    };
    return Logger;
}());
exports.logger = new Logger();
