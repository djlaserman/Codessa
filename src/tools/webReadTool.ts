import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import axios from 'axios';
import { WebContentExtractTool, WebSnapshotTool } from './advancedWebTools';

export class WebReadTool implements ITool {
    readonly id = 'webRead';
    readonly name = 'Web Read (Advanced)';
    readonly description = 'Reads and extracts content, snapshot, and more from web pages.';
    readonly actions: { [key: string]: ITool } = {
        'read': {
            id: 'read', name: 'Read Web Page', description: 'Read the content of a web page (HTML/text).',
            inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
            async execute(input: ToolInput) {
                const url = input.url as string;
                if (!url) {
                    return { success: false, error: "'url' is required." };
                }
                try {
                    const response = await axios({ method: 'get', url });
                    const content = response.data;
                    return { success: true, output: typeof content === 'string' ? content : JSON.stringify(content) };
                } catch (error: any) {
                    return { success: false, error: `Failed to read URL: ${error.message || error}` };
                }
            }
        },
        'extract': new WebContentExtractTool(),
        'snapshot': new WebSnapshotTool(),
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const url = input.url as string;
        if (!url) {
            return { success: false, error: "'url' is required." };
        }
        try {
            const response = await axios({ method: 'get', url });
            const content = response.data;
            return { success: true, output: typeof content === 'string' ? content : JSON.stringify(content) };
        } catch (error: any) {
            return { success: false, error: `Failed to read URL: ${error.message || error}` };
        }
    }
}

export const webReadTool = new WebReadTool();
