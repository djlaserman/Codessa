"use strict";
/**
 * Workflow engine
 *
 * This module provides a workflow engine for executing AI workflows.
 * It supports both the original workflow engine and the new LangGraph-based engine.
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllWorkflows = getAllWorkflows;
exports.getWorkflowById = getWorkflowById;
exports.createWorkflowInstance = createWorkflowInstance;
// Export original workflow engine
__exportStar(require("./workflowEngine"), exports);
// Export LangGraph workflow engine
__exportStar(require("./langgraph"), exports);
// Export workflow registry
const workflowEngine_1 = require("./workflowEngine");
const registry_1 = require("./langgraph/registry");
/**
 * Get all workflows from both registries
 */
function getAllWorkflows() {
    const originalWorkflows = workflowEngine_1.workflowRegistry.getAllWorkflows();
    const langGraphWorkflows = registry_1.langGraphRegistry.getAllWorkflows();
    return [...originalWorkflows, ...langGraphWorkflows];
}
/**
 * Get a workflow by ID from either registry
 */
function getWorkflowById(id) {
    // Try original registry first
    const originalWorkflow = workflowEngine_1.workflowRegistry.getWorkflow(id);
    if (originalWorkflow) {
        return {
            type: 'original',
            workflow: originalWorkflow
        };
    }
    // Try LangGraph registry
    const langGraphWorkflow = registry_1.langGraphRegistry.getWorkflow(id);
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
function createWorkflowInstance(id) {
    const workflow = getWorkflowById(id);
    if (!workflow) {
        throw new Error(`Workflow with ID '${id}' not found`);
    }
    if (workflow.type === 'original') {
        return workflowEngine_1.workflowRegistry.createWorkflowInstance(id);
    }
    else {
        return registry_1.langGraphRegistry.createWorkflowInstance(id);
    }
}
//# sourceMappingURL=index.js.map