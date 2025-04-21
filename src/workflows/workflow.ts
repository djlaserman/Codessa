import * as vscode from 'vscode';
import { Agent } from '../agents/agent';
import { logger } from '../logger';

/**
 * Workflow step definition
 */
export interface WorkflowStep {
    id: string;
    name: string;
    description: string;
    execute: (context: WorkflowContext) => Promise<WorkflowStepResult>;
    nextSteps: string[];
    isConditional?: boolean;
}

/**
 * Workflow step result
 */
export interface WorkflowStepResult {
    success: boolean;
    nextStepId?: string;
    output?: any;
    error?: string;
}

/**
 * Workflow context
 */
export interface WorkflowContext {
    workflow: Workflow;
    agent: Agent;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    variables: Record<string, any>;
    history: {
        stepId: string;
        startTime: Date;
        endTime?: Date;
        result?: WorkflowStepResult;
    }[];
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    version: string;
    steps: WorkflowStep[];
    inputs: {
        id: string;
        name: string;
        description: string;
        type: 'string' | 'number' | 'boolean' | 'object' | 'array';
        required: boolean;
        default?: any;
    }[];
    outputs: {
        id: string;
        name: string;
        description: string;
        type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    }[];
    startStepId: string;
}

/**
 * Workflow class
 */
export class Workflow {
    private definition: WorkflowDefinition;
    private context: WorkflowContext;
    private isRunning = false;
    private isCancelled = false;
    private onProgressCallback?: (stepId: string, progress: number) => void;
    private onCompletedCallback?: (success: boolean, outputs: Record<string, any>) => void;

    /**
     * Constructor
     */
    constructor(definition: WorkflowDefinition) {
        this.definition = definition;
        this.context = {
            workflow: this,
            agent: {} as Agent, // Will be set before execution
            inputs: {},
            outputs: {},
            variables: {},
            history: []
        };
    }

    /**
     * Get the workflow definition
     */
    public getDefinition(): WorkflowDefinition {
        return this.definition;
    }

    /**
     * Set the agent for this workflow
     */
    public setAgent(agent: Agent): void {
        this.context.agent = agent;
    }

    /**
     * Set inputs for this workflow
     */
    public setInputs(inputs: Record<string, any>): void {
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
            } else if ('default' in inputDef) {
                this.context.inputs[inputDef.id] = inputDef.default;
            }
        }
    }

    /**
     * Set a callback for progress updates
     */
    public onProgress(callback: (stepId: string, progress: number) => void): void {
        this.onProgressCallback = callback;
    }

    /**
     * Set a callback for workflow completion
     */
    public onCompleted(callback: (success: boolean, outputs: Record<string, any>) => void): void {
        this.onCompletedCallback = callback;
    }

    /**
     * Execute the workflow
     */
    public async execute(): Promise<Record<string, any>> {
        if (this.isRunning) {
            throw new Error('Workflow is already running');
        }

        this.isRunning = true;
        this.isCancelled = false;
        this.context.history = [];
        this.context.outputs = {};
        this.context.variables = {};

        try {
            logger.info(`Starting workflow: ${this.definition.name}`);
            
            // Start with the first step
            let currentStepId = this.definition.startStepId;
            let totalSteps = 0;
            let completedSteps = 0;
            
            // Count total steps (approximately)
            const stepsMap = new Map<string, WorkflowStep>();
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
                
                logger.info(`Executing workflow step: ${step.name}`);
                
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
                let result: WorkflowStepResult;
                try {
                    result = await step.execute(this.context);
                } catch (error) {
                    logger.error(`Error executing workflow step '${step.name}':`, error);
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
                    logger.error(`Workflow step '${step.name}' failed: ${result.error}`);
                    
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
                } else if (step.nextSteps.length === 1) {
                    // Single next step
                    currentStepId = step.nextSteps[0];
                } else if (step.nextSteps.length > 1 && step.isConditional) {
                    // Multiple next steps for conditional step, but no explicit next step provided
                    throw new Error(`Conditional step '${step.name}' did not specify a next step`);
                } else if (step.nextSteps.length === 0) {
                    // End of workflow
                    currentStepId = '';
                } else {
                    // Default to first next step
                    currentStepId = step.nextSteps[0];
                }
            }
            
            logger.info(`Workflow completed: ${this.definition.name}`);
            
            // Call completion callback
            if (this.onCompletedCallback) {
                this.onCompletedCallback(true, this.context.outputs);
            }
            
            return this.context.outputs;
        } catch (error) {
            logger.error(`Error executing workflow:`, error);
            
            // Call completion callback
            if (this.onCompletedCallback) {
                this.onCompletedCallback(false, this.context.outputs);
            }
            
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Cancel the workflow
     */
    public cancel(): void {
        if (this.isRunning) {
            this.isCancelled = true;
            logger.info(`Cancelling workflow: ${this.definition.name}`);
        }
    }

    /**
     * Check if the workflow is running
     */
    public isWorkflowRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get the workflow context
     */
    public getContext(): WorkflowContext {
        return this.context;
    }
}

/**
 * Workflow registry
 */
export class WorkflowRegistry {
    private static instance: WorkflowRegistry;
    private workflows = new Map<string, WorkflowDefinition>();

    private constructor() {}

    /**
     * Get the singleton instance
     */
    public static getInstance(): WorkflowRegistry {
        if (!WorkflowRegistry.instance) {
            WorkflowRegistry.instance = new WorkflowRegistry();
        }
        return WorkflowRegistry.instance;
    }

    /**
     * Register a workflow
     */
    public registerWorkflow(workflow: WorkflowDefinition): void {
        this.workflows.set(workflow.id, workflow);
    }

    /**
     * Get a workflow by ID
     */
    public getWorkflow(id: string): WorkflowDefinition | undefined {
        return this.workflows.get(id);
    }

    /**
     * Get all registered workflows
     */
    public getAllWorkflows(): WorkflowDefinition[] {
        return Array.from(this.workflows.values());
    }

    /**
     * Create a workflow instance
     */
    public createWorkflowInstance(id: string): Workflow {
        const definition = this.getWorkflow(id);
        
        if (!definition) {
            throw new Error(`Workflow with ID '${id}' not found`);
        }
        
        return new Workflow(definition);
    }
}

// Export singleton instance
export const workflowRegistry = WorkflowRegistry.getInstance();
