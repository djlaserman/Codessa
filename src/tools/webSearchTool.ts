import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import axios from 'axios';
import { WebMultiSearchTool } from './advancedWebTools';

export class WebSearchTool implements ITool {
    readonly id = 'webSearch';
    readonly name = 'Web Search (Advanced)';
    readonly description = 'Performs web search using multiple providers and advanced options.';
    readonly actions: { [key: string]: ITool } = {
        'duckduckgo': {
            id: 'duckduckgo', name: 'DuckDuckGo Search', description: 'Web search using DuckDuckGo Instant Answer API.',
            inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
            async execute(input: ToolInput) {
                const query = input.query as string;
                if (!query) {
                    return { success: false, error: "'query' is required." };
                }
                try {
                    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
                    const response = await axios({ method: 'get', url });
                    const data = response.data;
                    let output = data.AbstractText || data.Answer || data.RelatedTopics?.[0]?.Text || 'No instant answer found.';
                    return { success: true, output };
                } catch (error: any) {
                    return { success: false, error: `Web search failed: ${error.message || error}` };
                }
            }
        },
        'multi': new WebMultiSearchTool(),
    };

    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const query = input.query as string;
        if (!query) {
            return { success: false, error: "'query' is required." };
        }
        try {
            const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
            const response = await axios({ method: 'get', url });
            const data = response.data;
            let output = data.AbstractText || data.Answer || data.RelatedTopics?.[0]?.Text || 'No instant answer found.';
            return { success: true, output };
        } catch (error: any) {
            return { success: false, error: `Web search failed: ${error.message || error}` };
        }
    }
}

export const webSearchTool = new WebSearchTool();
