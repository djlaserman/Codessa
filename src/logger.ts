import * as vscode from 'vscode';
import { getLogLevel } from './config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

class Logger {
    private outputChannel: vscode.OutputChannel;
    private currentLogLevel: LogLevel = 'info';

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Codessa');
        this.updateLogLevel();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.logLevel')) {
                this.updateLogLevel();
            }
        });
    }

    private updateLogLevel(): void {
        this.currentLogLevel = getLogLevel() as LogLevel;
        this.debug(`Log level set to: ${this.currentLogLevel}`);
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLogLevel];
    }

    private formatMessage(level: LogLevel, message: string, details?: any): string {
        const timestamp = new Date().toISOString();
        const levelPadded = level.toUpperCase().padEnd(5);
        let formattedMessage = `[${timestamp}] ${levelPadded} ${message}`;

        if (details) {
            if (details instanceof Error) {
                formattedMessage += `\n  Stack: ${details.stack || 'No stack trace available'}`;
            } else if (typeof details === 'object') {
                try {
                    formattedMessage += `\n  Details: ${JSON.stringify(details, null, 2)}`;
                } catch (e) {
                    formattedMessage += `\n  Details: [Object cannot be stringified]`;
                }
            } else {
                formattedMessage += `\n  Details: ${details}`;
            }
        }

        return formattedMessage;
    }

    private log(level: LogLevel, message: string, details?: any): void {
        if (this.shouldLog(level)) {
            const formattedMessage = this.formatMessage(level, message, details);
            this.outputChannel.appendLine(formattedMessage);

            // For errors, also show notification
            if (level === 'error') {
                vscode.window.showErrorMessage(message);
            }
        }
    }

    debug(message: string, details?: any): void {
        this.log('debug', message, details);
    }

    info(message: string, details?: any): void {
        this.log('info', message, details);
    }

    warn(message: string, details?: any): void {
        this.log('warn', message, details);
    }

    error(message: string, details?: any): void {
        this.log('error', message, details);
    }

    /**
     * Show the output channel
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Clear the output channel
     */
    clear(): void {
        this.outputChannel.clear();
    }

    /**
     * Dispose the output channel
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}

export const logger = new Logger();
