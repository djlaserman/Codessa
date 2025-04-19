import * as vscode from 'vscode';
import { getLogLevel } from './config';

// Define log levels
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

class Logger {
    private outputChannel: vscode.OutputChannel;
    private currentLogLevel: number = LOG_LEVELS.info;

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
        const configLevel = getLogLevel();
        this.currentLogLevel = LOG_LEVELS[configLevel as LogLevel] ?? LOG_LEVELS.info;
    }

    private log(level: LogLevel, message: string, ...args: any[]): void {
        if (LOG_LEVELS[level] < this.currentLogLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0
            ? args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')
            : '';
        
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message} ${formattedArgs}`;
        
        this.outputChannel.appendLine(logMessage);
        
        // For errors, also write to developer console if available
        if (level === 'error' && typeof vscode.window.showErrorMessage === 'function') {
            vscode.window.showErrorMessage(`[Codessa] ${message}`);
        }
    }

    debug(message: string, ...args: any[]): void {
        this.log('debug', message, ...args);
    }

    info(message: string, ...args: any[]): void {
        this.log('info', message, ...args);
    }

    warn(message: string, ...args: any[]): void {
        this.log('warn', message, ...args);
    }

    error(message: string, ...args: any[]): void {
        this.log('error', message, ...args);
    }

    show(): void {
        this.outputChannel.show();
    }
}

export const logger = new Logger();
