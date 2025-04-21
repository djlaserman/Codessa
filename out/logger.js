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
exports.logger = void 0;
const vscode = __importStar(require("vscode"));
const config_1 = require("./config");
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};
class Logger {
    constructor() {
        this.currentLogLevel = 'info';
        this.outputChannel = vscode.window.createOutputChannel('Codessa');
        this.updateLogLevel();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.logLevel')) {
                this.updateLogLevel();
            }
        });
    }
    updateLogLevel() {
        this.currentLogLevel = (0, config_1.getLogLevel)();
        this.debug(`Log level set to: ${this.currentLogLevel}`);
    }
    shouldLog(level) {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLogLevel];
    }
    formatMessage(level, message, details) {
        const timestamp = new Date().toISOString();
        const levelPadded = level.toUpperCase().padEnd(5);
        let formattedMessage = `[${timestamp}] ${levelPadded} ${message}`;
        if (details) {
            if (details instanceof Error) {
                formattedMessage += `\n  Stack: ${details.stack || 'No stack trace available'}`;
            }
            else if (typeof details === 'object') {
                try {
                    formattedMessage += `\n  Details: ${JSON.stringify(details, null, 2)}`;
                }
                catch (e) {
                    formattedMessage += `\n  Details: [Object cannot be stringified]`;
                }
            }
            else {
                formattedMessage += `\n  Details: ${details}`;
            }
        }
        return formattedMessage;
    }
    log(level, message, details) {
        if (this.shouldLog(level)) {
            const formattedMessage = this.formatMessage(level, message, details);
            this.outputChannel.appendLine(formattedMessage);
            // For errors, also show notification
            if (level === 'error') {
                vscode.window.showErrorMessage(message);
            }
        }
    }
    debug(message, details) {
        this.log('debug', message, details);
    }
    info(message, details) {
        this.log('info', message, details);
    }
    warn(message, details) {
        this.log('warn', message, details);
    }
    error(message, details) {
        this.log('error', message, details);
    }
    /**
     * Show the output channel
     */
    show() {
        this.outputChannel.show();
    }
    /**
     * Clear the output channel
     */
    clear() {
        this.outputChannel.clear();
    }
    /**
     * Dispose the output channel
     */
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map