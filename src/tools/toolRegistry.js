"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = exports.ToolRegistry = void 0;
var fileTools_1 = require("./fileTools");
var docsTool_1 = require("./docsTool");
var logger_1 = require("../logger");
/**
 * Registry for all available tools in the extension.
 * Acts as a central access point for tool instances.
 */
var ToolRegistry = /** @class */ (function () {
    function ToolRegistry() {
        this.tools = new Map();
        this.registerBuiltInTools();
    }
    /**
     * Register built-in tools with the registry
     */
    ToolRegistry.prototype.registerBuiltInTools = function () {
        try {
            this.registerTool(fileTools_1.fileSystemTool);
            this.registerTool(docsTool_1.documentationTool);
            // More tools can be registered here
            logger_1.logger.info("Initialized ".concat(this.tools.size, " tools in registry."));
        }
        catch (error) {
            logger_1.logger.error("Error registering built-in tools:", error);
        }
    };
    /**
     * Registers a tool with the registry
     */
    ToolRegistry.prototype.registerTool = function (tool) {
        if (this.tools.has(tool.id)) {
            logger_1.logger.warn("Tool with ID '".concat(tool.id, "' is already registered. Overwriting."));
        }
        this.tools.set(tool.id, tool);
        logger_1.logger.debug("Registered tool: ".concat(tool.id));
    };
    /**
     * Gets a tool by ID
     */
    ToolRegistry.prototype.getTool = function (toolId) {
        return this.tools.get(toolId);
    };
    /**
     * Gets all registered tools
     */
    ToolRegistry.prototype.getAllTools = function () {
        return Array.from(this.tools.values());
    };
    /**
     * Converts array of tool IDs to a map of tool instances
     */
    ToolRegistry.prototype.getToolsByIds = function (toolIds) {
        var result = new Map();
        for (var _i = 0, toolIds_1 = toolIds; _i < toolIds_1.length; _i++) {
            var id = toolIds_1[_i];
            var tool = this.getTool(id);
            if (tool) {
                result.set(id, tool);
            }
            else {
                logger_1.logger.warn("Tool with ID '".concat(id, "' not found."));
            }
        }
        return result;
    };
    return ToolRegistry;
}());
exports.ToolRegistry = ToolRegistry;
exports.toolRegistry = new ToolRegistry();
