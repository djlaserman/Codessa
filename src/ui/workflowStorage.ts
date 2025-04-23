import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const WORKFLOWS_FILENAME = 'codessa_workflows.json';

export class WorkflowStorage {
    static getStoragePath(context: vscode.ExtensionContext): string {
        // Prefer workspace storage, fallback to extension global storage
        const storagePath = context.storageUri?.fsPath || context.globalStorageUri.fsPath;
        return path.join(storagePath, WORKFLOWS_FILENAME);
    }

    static async loadWorkflows(context: vscode.ExtensionContext): Promise<any[]> {
        const filePath = WorkflowStorage.getStoragePath(context);
        try {
            if (fs.existsSync(filePath)) {
                const raw = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(raw);
            }
        } catch (err) {
            console.error('Failed to load workflows:', err);
        }
        return [];
    }

    static async saveWorkflows(context: vscode.ExtensionContext, workflows: any[]): Promise<void> {
        const filePath = WorkflowStorage.getStoragePath(context);
        try {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(workflows, null, 2), 'utf8');
        } catch (err) {
            console.error('Failed to save workflows:', err);
        }
    }
}
