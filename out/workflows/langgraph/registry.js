"use strict";
/**
 * Registry for LangGraph workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.langGraphRegistry = exports.LangGraphRegistry = void 0;
const graph_1 = require("./graph");
const logger_1 = require("../../logger");
/**
 * LangGraph workflow registry
 */
class LangGraphRegistry {
    /**
     * Private constructor for singleton
     */
    constructor() {
        this.workflows = new Map();
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!LangGraphRegistry.instance) {
            LangGraphRegistry.instance = new LangGraphRegistry();
        }
        return LangGraphRegistry.instance;
    }
    /**
     * Register a workflow
     */
    registerWorkflow(workflow) {
        this.workflows.set(workflow.id, workflow);
        logger_1.logger.info(`Registered workflow: ${workflow.name} (${workflow.id})`);
    }
    /**
     * Get a workflow by ID
     */
    getWorkflow(id) {
        return this.workflows.get(id);
    }
    /**
     * Get all registered workflows
     */
    getAllWorkflows() {
        return Array.from(this.workflows.values());
    }
    /**
     * Create a workflow instance
     */
    createWorkflowInstance(id) {
        const definition = this.getWorkflow(id);
        if (!definition) {
            throw new Error(`Workflow with ID '${id}' not found`);
        }
        return new graph_1.LangGraph(definition);
    }
    /**
     * Delete a workflow
     */
    deleteWorkflow(id) {
        return this.workflows.delete(id);
    }
}
exports.LangGraphRegistry = LangGraphRegistry;
// Export singleton instance
exports.langGraphRegistry = LangGraphRegistry.getInstance();
//# sourceMappingURL=registry.js.map