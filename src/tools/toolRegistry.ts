import { ITool } from './tool';
import { fileSystemTool } from './fileTools';
import { documentationTool } from './docsTool';
import { logger } from '../logger';

/**
 * Registry for all available tools in the extension.
 * Acts as a central access point for tool instances.
 */
export class ToolRegistry {
    private tools = new Map<string, ITool>();

    constructor() {
        this.registerBuiltInTools();
    }

    /**
     * Register built-in tools with the registry
     */
    private registerBuiltInTools() {
        try {
            this.registerTool(fileSystemTool);
            this.registerTool(documentationTool);
            // More tools can be registered here

            logger.info(`Initialized ${this.tools.size} tools in registry.`);
        } catch (error) {
            logger.error("Error registering built-in tools:", error);
        }
    }

    /**
     * Registers a tool with the registry
     */
    registerTool(tool: ITool): void {
        if (this.tools.has(tool.id)) {
            logger.warn(`Tool with ID '${tool.id}' is already registered. Overwriting.`);
        }
        this.tools.set(tool.id, tool);
        logger.debug(`Registered tool: ${tool.id}`);
    }

    /**
     * Gets a tool by ID
     */
    getTool(toolId: string): ITool | undefined {
        return this.tools.get(toolId);
    }

    /**
     * Gets all registered tools
     */
    getAllTools(): ITool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Converts array of tool IDs to a map of tool instances
     */
    getToolsByIds(toolIds: string[]): Map<string, ITool> {
        const result = new Map<string, ITool>();
        
        for (const id of toolIds) {
            const tool = this.getTool(id);
            if (tool) {
                result.set(id, tool);
            } else {
                logger.warn(`Tool with ID '${id}' not found.`);
            }
        }
        
        return result;
    }
}

export const toolRegistry = new ToolRegistry(); 