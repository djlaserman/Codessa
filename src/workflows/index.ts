/**
 * Workflow engine
 * 
 * This module provides a workflow engine for executing AI workflows.
 * It supports both the original workflow engine and the new LangGraph-based engine.
 */

// Export original workflow engine
export * from './workflowEngine';

// Export LangGraph workflow engine
export * from './langgraph';

// Export workflow registry
import { workflowRegistry } from './workflowEngine';
import { langGraphRegistry } from './langgraph/registry';

/**
 * Get all workflows from both registries
 */
export function getAllWorkflows() {
    const originalWorkflows = workflowRegistry.getAllWorkflows();
    const langGraphWorkflows = langGraphRegistry.getAllWorkflows();
    
    return [...originalWorkflows, ...langGraphWorkflows];
}

/**
 * Get a workflow by ID from either registry
 */
export function getWorkflowById(id: string) {
    // Try original registry first
    const originalWorkflow = workflowRegistry.getWorkflow(id);
    if (originalWorkflow) {
        return { 
            type: 'original', 
            workflow: originalWorkflow 
        };
    }
    
    // Try LangGraph registry
    const langGraphWorkflow = langGraphRegistry.getWorkflow(id);
    if (langGraphWorkflow) {
        return { 
            type: 'langgraph', 
            workflow: langGraphWorkflow 
        };
    }
    
    // Not found
    return null;
}

/**
 * Create a workflow instance
 */
export function createWorkflowInstance(id: string) {
    const workflow = getWorkflowById(id);
    
    if (!workflow) {
        throw new Error(`Workflow with ID '${id}' not found`);
    }
    
    if (workflow.type === 'original') {
        return workflowRegistry.createWorkflowInstance(id);
    } else {
        return langGraphRegistry.createWorkflowInstance(id);
    }
}
