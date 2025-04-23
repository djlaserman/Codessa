"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = exports.ToolRegistry = void 0;
const fileTools_1 = require("./fileTools");
const docsTool_1 = require("./docsTool");
const directoryListTool_1 = require("./directoryListTool");
const codeSearchTool_1 = require("./codeSearchTool");
const terminalCommandTool_1 = require("./terminalCommandTool");
const webSearchTool_1 = require("./webSearchTool");
const webReadTool_1 = require("./webReadTool");
const memoryTool_1 = require("./memoryTool");
const memoryManager_1 = require("../memory/memoryManager");
const browserPreviewTool_1 = require("./browserPreviewTool");
const deployWebAppTool_1 = require("./deployWebAppTool");
const gitTool_1 = require("./gitTool");
const editorActionsTool_1 = require("./editorActionsTool");
const codeIntelligenceTool_1 = require("./codeIntelligenceTool");
const codeGenerationTool_1 = require("./codeGenerationTool");
const lintDiagnosticsTool_1 = require("./lintDiagnosticsTool");
const logger_1 = require("../logger");
/**
 * Registry for all available tools in the extension.
 * Acts as a central access point for tool instances.
 */
class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.registerBuiltInTools();
    }
    /**
     * Register built-in tools with the registry
     */
    registerBuiltInTools() {
        try {
            this.registerTool(fileTools_1.fileSystemTool);
            this.registerTool(docsTool_1.documentationTool);
            this.registerTool(directoryListTool_1.directoryListTool);
            this.registerTool(codeSearchTool_1.codeSearchTool);
            this.registerTool(terminalCommandTool_1.terminalCommandTool);
            this.registerTool(webSearchTool_1.webSearchTool);
            this.registerTool(webReadTool_1.webReadTool);
            this.registerTool(new memoryTool_1.MemoryTool(memoryManager_1.memoryManager));
            this.registerTool(browserPreviewTool_1.browserPreviewTool);
            this.registerTool(deployWebAppTool_1.deployWebAppTool);
            this.registerTool(gitTool_1.gitTool);
            this.registerTool(editorActionsTool_1.editorActionsTool);
            this.registerTool(codeIntelligenceTool_1.codeIntelligenceTool);
            this.registerTool(codeGenerationTool_1.codeGenerationTool);
            this.registerTool(lintDiagnosticsTool_1.lintDiagnosticsTool);
            logger_1.logger.info(`Initialized ${this.tools.size} tools in registry.`);
        }
        catch (error) {
            logger_1.logger.error("Error registering built-in tools:", error);
        }
    }
    /**
     * Registers a tool with the registry
     */
    registerTool(tool) {
        if (this.tools.has(tool.id)) {
            logger_1.logger.warn(`Tool with ID '${tool.id}' is already registered. Overwriting.`);
        }
        this.tools.set(tool.id, tool);
        logger_1.logger.debug(`Registered tool: ${tool.id}`);
    }
    /**
     * Gets a tool by ID
     */
    getTool(toolId) {
        return this.tools.get(toolId);
    }
    /**
     * Gets all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Converts array of tool IDs to a map of tool instances
     */
    getToolsByIds(toolIds) {
        const result = new Map();
        for (const id of toolIds) {
            const tool = this.getTool(id);
            if (tool) {
                result.set(id, tool);
            }
            else {
                logger_1.logger.warn(`Tool with ID '${id}' not found.`);
            }
        }
        return result;
    }
}
exports.ToolRegistry = ToolRegistry;
exports.toolRegistry = new ToolRegistry();
//# sourceMappingURL=toolRegistry.js.map