"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSearchTool = exports.WebSearchTool = void 0;
const axios_1 = __importDefault(require("axios"));
const advancedWebTools_1 = require("./advancedWebTools");
class WebSearchTool {
    constructor() {
        this.id = 'webSearch';
        this.name = 'Web Search (Advanced)';
        this.description = 'Performs web search using multiple providers and advanced options.';
        this.actions = {
            'duckduckgo': {
                id: 'duckduckgo', name: 'DuckDuckGo Search', description: 'Web search using DuckDuckGo Instant Answer API.',
                inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
                async execute(input) {
                    const query = input.query;
                    if (!query) {
                        return { success: false, error: "'query' is required." };
                    }
                    try {
                        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
                        const response = await (0, axios_1.default)({ method: 'get', url });
                        const data = response.data;
                        let output = data.AbstractText || data.Answer || data.RelatedTopics?.[0]?.Text || 'No instant answer found.';
                        return { success: true, output };
                    }
                    catch (error) {
                        return { success: false, error: `Web search failed: ${error.message || error}` };
                    }
                }
            },
            'multi': new advancedWebTools_1.WebMultiSearchTool(),
        };
    }
    async execute(input, _context) {
        const query = input.query;
        if (!query) {
            return { success: false, error: "'query' is required." };
        }
        try {
            const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
            const response = await (0, axios_1.default)({ method: 'get', url });
            const data = response.data;
            let output = data.AbstractText || data.Answer || data.RelatedTopics?.[0]?.Text || 'No instant answer found.';
            return { success: true, output };
        }
        catch (error) {
            return { success: false, error: `Web search failed: ${error.message || error}` };
        }
    }
}
exports.WebSearchTool = WebSearchTool;
exports.webSearchTool = new WebSearchTool();
//# sourceMappingURL=webSearchTool.js.map