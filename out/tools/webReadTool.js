"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webReadTool = exports.WebReadTool = void 0;
const axios_1 = __importDefault(require("axios"));
const advancedWebTools_1 = require("./advancedWebTools");
class WebReadTool {
    constructor() {
        this.id = 'webRead';
        this.name = 'Web Read (Advanced)';
        this.description = 'Reads and extracts content, snapshot, and more from web pages.';
        this.actions = {
            'read': {
                id: 'read', name: 'Read Web Page', description: 'Read the content of a web page (HTML/text).',
                inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
                async execute(input) {
                    const url = input.url;
                    if (!url) {
                        return { success: false, error: "'url' is required." };
                    }
                    try {
                        const response = await (0, axios_1.default)({ method: 'get', url });
                        const content = response.data;
                        return { success: true, output: typeof content === 'string' ? content : JSON.stringify(content) };
                    }
                    catch (error) {
                        return { success: false, error: `Failed to read URL: ${error.message || error}` };
                    }
                }
            },
            'extract': new advancedWebTools_1.WebContentExtractTool(),
            'snapshot': new advancedWebTools_1.WebSnapshotTool(),
        };
    }
    async execute(input, _context) {
        const url = input.url;
        if (!url) {
            return { success: false, error: "'url' is required." };
        }
        try {
            const response = await (0, axios_1.default)({ method: 'get', url });
            const content = response.data;
            return { success: true, output: typeof content === 'string' ? content : JSON.stringify(content) };
        }
        catch (error) {
            return { success: false, error: `Failed to read URL: ${error.message || error}` };
        }
    }
}
exports.WebReadTool = WebReadTool;
exports.webReadTool = new WebReadTool();
//# sourceMappingURL=webReadTool.js.map