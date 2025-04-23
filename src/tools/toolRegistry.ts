import { ITool } from './tool';
import { fileSystemTool } from './fileTools';
import { documentationTool } from './docsTool';
import { directoryListTool } from './directoryListTool';
import { codeSearchTool } from './codeSearchTool';
import { terminalCommandTool } from './terminalCommandTool';
import { webSearchTool } from './webSearchTool';
import { webReadTool } from './webReadTool';
import { MemoryTool } from './memoryTool';
import { memoryManager } from '../memory/memoryManager';
import { browserPreviewTool } from './browserPreviewTool';
import { deployWebAppTool } from './deployWebAppTool';
import { gitTool } from './gitTool';
import { editorActionsTool } from './editorActionsTool';
import { codeIntelligenceTool } from './codeIntelligenceTool';
import { codeGenerationTool } from './codeGenerationTool';
import { lintDiagnosticsTool } from './lintDiagnosticsTool';
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
            this.registerTool(directoryListTool);
            this.registerTool(codeSearchTool);
            this.registerTool(terminalCommandTool);
            this.registerTool(webSearchTool);
            this.registerTool(webReadTool);
            this.registerTool(new MemoryTool(memoryManager));
            this.registerTool(browserPreviewTool);
            this.registerTool(deployWebAppTool);

            this.registerTool(gitTool);
            this.registerTool(editorActionsTool);
            this.registerTool(codeIntelligenceTool);
            this.registerTool(codeGenerationTool);
            this.registerTool(lintDiagnosticsTool);

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