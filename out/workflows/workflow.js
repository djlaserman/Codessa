"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowRegistry = exports.WorkflowRegistry = exports.Workflow = void 0;
const logger_1 = require("../logger");
/**
 * Workflow class
 */
class Workflow {
    /**
     * Constructor
     */
    constructor(definition) {
        this.isRunning = false;
        this.isCancelled = false;
        this.definition = definition;
        this.context = {
            workflow: this,
            agent: {}, // Will be set before execution
            inputs: {},
            outputs: {},
            variables: {},
            history: []
        };
    }
    /**
     * Get the workflow definition
     */
    getDefinition() {
        return this.definition;
    }
    /**
     * Set the agent for this workflow
     */
    setAgent(agent) {
        this.context.agent = agent;
    }
    /**
     * Set inputs for this workflow
     */
    setInputs(inputs) {
        // Validate inputs
        for (const inputDef of this.definition.inputs) {
            if (inputDef.required && !(inputDef.id in inputs) && !('default' in inputDef)) {
                throw new Error(`Required input '${inputDef.id}' is missing`);
            }
        }
        // Set inputs with defaults
        this.context.inputs = {};
        for (const inputDef of this.definition.inputs) {
            if (inputDef.id in inputs) {
                this.context.inputs[inputDef.id] = inputs[inputDef.id];
            }
            else if ('default' in inputDef) {
                this.context.inputs[inputDef.id] = inputDef.default;
            }
        }
    }
    /**
     * Set a callback for progress updates
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }
    /**
     * Set a callback for workflow completion
     */
    onCompleted(callback) {
        this.onCompletedCallback = callback;
    }
    /**
     * Execute the workflow
     */
    async execute() {
        if (this.isRunning) {
            throw new Error('Workflow is already running');
        }
        this.isRunning = true;
        this.isCancelled = false;
        this.context.history = [];
        this.context.outputs = {};
        this.context.variables = {};
        try {
            logger_1.logger.info(`Starting workflow: ${this.definition.name}`);
            // Start with the first step
            let currentStepId = this.definition.startStepId;
            let totalSteps = 0;
            let completedSteps = 0;
            // Count total steps (approximately)
            const stepsMap = new Map();
            for (const step of this.definition.steps) {
                stepsMap.set(step.id, step);
                totalSteps++;
            }
            // Execute steps
            while (currentStepId && !this.isCancelled) {
                const step = this.definition.steps.find(s => s.id === currentStepId);
                if (!step) {
                    throw new Error(`Step with ID '${currentStepId}' not found`);
                }
                logger_1.logger.info(`Executing workflow step: ${step.name}`);
                // Record start time
                const startTime = new Date();
                this.context.history.push({
                    stepId: step.id,
                    startTime
                });
                // Report progress
                if (this.onProgressCallback) {
                    this.onProgressCallback(step.id, (completedSteps / totalSteps) * 100);
                }
                // Execute step
                let result;
                try {
                    result = await step.execute(this.context);
                }
                catch (error) {
                    logger_1.logger.error(`Error executing workflow step '${step.name}':`, error);
                    result = {
                        success: false,
                        error: `Error: ${error instanceof Error ? error.message : String(error)}`
                    };
                }
                // Record end time and result
                const historyEntry = this.context.history[this.context.history.length - 1];
                historyEntry.endTime = new Date();
                historyEntry.result = result;
                // Update completed steps
                completedSteps++;
                // Check result
                if (!result.success) {
                    logger_1.logger.error(`Workflow step '${step.name}' failed: ${result.error}`);
                    // Call completion callback
                    if (this.onCompletedCallback) {
                        this.onCompletedCallback(false, this.context.outputs);
                    }
                    this.isRunning = false;
                    return this.context.outputs;
                }
                // Determine next step
                if (result.nextStepId) {
                    // Explicit next step from result
                    currentStepId = result.nextStepId;
                }
                else if (step.nextSteps.length === 1) {
                    // Single next step
                    currentStepId = step.nextSteps[0];
                }
                else if (step.nextSteps.length > 1 && step.isConditional) {
                    // Multiple next steps for conditional step, but no explicit next step provided
                    throw new Error(`Conditional step '${step.name}' did not specify a next step`);
                }
                else if (step.nextSteps.length === 0) {
                    // End of workflow
                    currentStepId = '';
                }
                else {
                    // Default to first next step
                    currentStepId = step.nextSteps[0];
                }
            }
            logger_1.logger.info(`Workflow completed: ${this.definition.name}`);
            // Call completion callback
            if (this.onCompletedCallback) {
                this.onCompletedCallback(true, this.context.outputs);
            }
            return this.context.outputs;
        }
        catch (error) {
            logger_1.logger.error(`Error executing workflow:`, error);
            // Call completion callback
            if (this.onCompletedCallback) {
                this.onCompletedCallback(false, this.context.outputs);
            }
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Cancel the workflow
     */
    cancel() {
        if (this.isRunning) {
            this.isCancelled = true;
            logger_1.logger.info(`Cancelling workflow: ${this.definition.name}`);
        }
    }
    /**
     * Check if the workflow is running
     */
    isWorkflowRunning() {
        return this.isRunning;
    }
    /**
     * Get the workflow context
     */
    getContext() {
        return this.context;
    }
}
exports.Workflow = Workflow;
/**
 * Workflow registry
 */
class WorkflowRegistry {
    constructor() {
        this.workflows = new Map();
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!WorkflowRegistry.instance) {
            WorkflowRegistry.instance = new WorkflowRegistry();
        }
        return WorkflowRegistry.instance;
    }
    /**
     * Register a workflow
     */
    registerWorkflow(workflow) {
        this.workflows.set(workflow.id, workflow);
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
        return new Workflow(definition);
    }
}
exports.WorkflowRegistry = WorkflowRegistry;
// Export singleton instance
exports.workflowRegistry = WorkflowRegistry.getInstance();
//# sourceMappingURL=workflow.js.map