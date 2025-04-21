"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = exports.ToolRegistry = void 0;
const fileTools_1 = require("./fileTools");
const docsTool_1 = require("./docsTool");
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
            // More tools can be registered here
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