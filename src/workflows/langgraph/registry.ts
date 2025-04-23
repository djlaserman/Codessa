/**
 * Registry for LangGraph workflows
 */

import { LangGraph } from './graph';
import { GraphDefinition } from './types';
import { logger } from '../../logger';

/**
 * LangGraph workflow registry
 */
export class LangGraphRegistry {
    private static instance: LangGraphRegistry;
    private workflows: Map<string, GraphDefinition>;

    /**
     * Private constructor for singleton
     */
    private constructor() {
        this.workflows = new Map();
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): LangGraphRegistry {
        if (!LangGraphRegistry.instance) {
            LangGraphRegistry.instance = new LangGraphRegistry();
        }
        return LangGraphRegistry.instance;
    }

    /**
     * Register a workflow
     */
    public registerWorkflow(workflow: GraphDefinition): void {
        this.workflows.set(workflow.id, workflow);
        logger.info(`Registered workflow: ${workflow.name} (${workflow.id})`);
    }

    /**
     * Get a workflow by ID
     */
    public getWorkflow(id: string): GraphDefinition | undefined {
        return this.workflows.get(id);
    }

    /**
     * Get all registered workflows
     */
    public getAllWorkflows(): GraphDefinition[] {
        return Array.from(this.workflows.values());
    }

    /**
     * Create a workflow instance
     */
    public createWorkflowInstance(id: string): LangGraph {
        const definition = this.getWorkflow(id);
        
        if (!definition) {
            throw new Error(`Workflow with ID '${id}' not found`);
        }
        
        return new LangGraph(definition);
    }

    /**
     * Delete a workflow
     */
    public deleteWorkflow(id: string): boolean {
        return this.workflows.delete(id);
    }
}

// Export singleton instance
export const langGraphRegistry = LangGraphRegistry.getInstance();
