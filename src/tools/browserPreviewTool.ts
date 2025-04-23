import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import * as vscode from 'vscode';

export class BrowserPreviewTool implements ITool {
    readonly id = 'browserPreview';
    readonly name = 'Browser Preview';
    readonly description = 'Opens a browser preview for a local web server.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            url: { type: 'string', description: 'URL of the local web server (e.g. http://localhost:3000)' }
        },
        required: ['url']
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const url = input.url as string;
        if (!url) {
            return { success: false, error: "'url' is required." };
        }
        try {
            await vscode.env.openExternal(vscode.Uri.parse(url));
            return { success: true, output: `Opened browser preview for ${url}` };
        } catch (error: any) {
            return { success: false, error: `Failed to open browser preview: ${error.message || error}` };
        }
    }
}

export const browserPreviewTool = new BrowserPreviewTool();
