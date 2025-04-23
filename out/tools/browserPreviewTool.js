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
exports.browserPreviewTool = exports.BrowserPreviewTool = void 0;
const vscode = __importStar(require("vscode"));
class BrowserPreviewTool {
    constructor() {
        this.id = 'browserPreview';
        this.name = 'Browser Preview';
        this.description = 'Opens a browser preview for a local web server.';
        this.inputSchema = {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL of the local web server (e.g. http://localhost:3000)' }
            },
            required: ['url']
        };
    }
    async execute(input, _context) {
        const url = input.url;
        if (!url) {
            return { success: false, error: "'url' is required." };
        }
        try {
            await vscode.env.openExternal(vscode.Uri.parse(url));
            return { success: true, output: `Opened browser preview for ${url}` };
        }
        catch (error) {
            return { success: false, error: `Failed to open browser preview: ${error.message || error}` };
        }
    }
}
exports.BrowserPreviewTool = BrowserPreviewTool;
exports.browserPreviewTool = new BrowserPreviewTool();
//# sourceMappingURL=browserPreviewTool.js.map