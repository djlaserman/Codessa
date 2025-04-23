import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Agent } from '../agents/agent';
import { logger } from '../logger';
import { ContextSource, ContextType } from '../modes/operationMode';
import { contextManager } from '../modes/contextManager';

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

/**
 * Common workflow steps
 */
export const commonWorkflowSteps: Record<string, WorkflowStep> = {
    /**
     * Input step - Collects input from the user
     */
    inputStep: {
        id: 'input',
        name: 'User Input',
        description: 'Collects input from the user',
        nextSteps: [],
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const prompt = context.inputs.prompt || 'Please provide input:';
                const inputValue = await vscode.window.showInputBox({
                    prompt,
                    ignoreFocusOut: true
                });
                
                if (inputValue === undefined) {
                    // User cancelled
                    return {
                        success: false,
                        error: 'User cancelled input'
                    };
                }
                
                // Store the input in the context
                const outputKey = context.inputs.outputKey || 'userInput';
                context.outputs[outputKey] = inputValue;
                
                return {
                    success: true
                };
            } catch (error) {
                logger.error('Error in input step:', error);
                return {
                    success: false,
                    error: `Error collecting input: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * File selection step - Allows the user to select files
     */
    fileSelectionStep: {
        id: 'fileSelection',
        name: 'File Selection',
        description: 'Allows the user to select files',
        nextSteps: [],
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const canSelectMany = context.inputs.canSelectMany !== false;
                const fileUris = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany,
                    openLabel: context.inputs.openLabel || 'Select Files'
                });
                
                if (!fileUris || fileUris.length === 0) {
                    // User cancelled or didn't select any files
                    return {
                        success: false,
                        error: 'No files selected'
                    };
                }
                
                // Store the selected files in the context
                const outputKey = context.inputs.outputKey || 'selectedFiles';
                context.outputs[outputKey] = fileUris.map(uri => uri.fsPath);
                
                return {
                    success: true
                };
            } catch (error) {
                logger.error('Error in file selection step:', error);
                return {
                    success: false,
                    error: `Error selecting files: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * Folder selection step - Allows the user to select folders
     */
    folderSelectionStep: {
        id: 'folderSelection',
        name: 'Folder Selection',
        description: 'Allows the user to select folders',
        nextSteps: [],
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const canSelectMany = context.inputs.canSelectMany !== false;
                const folderUris = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany,
                    openLabel: context.inputs.openLabel || 'Select Folders'
                });
                
                if (!folderUris || folderUris.length === 0) {
                    // User cancelled or didn't select any folders
                    return {
                        success: false,
                        error: 'No folders selected'
                    };
                }
                
                // Store the selected folders in the context
                const outputKey = context.inputs.outputKey || 'selectedFolders';
                context.outputs[outputKey] = folderUris.map(uri => uri.fsPath);
                
                return {
                    success: true
                };
            } catch (error) {
                logger.error('Error in folder selection step:', error);
                return {
                    success: false,
                    error: `Error selecting folders: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * AI generation step - Generates content using the AI
     */
    aiGenerationStep: {
        id: 'aiGeneration',
        name: 'AI Generation',
        description: 'Generates content using the AI',
        nextSteps: [],
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const prompt = context.inputs.prompt;
                
                if (!prompt) {
                    return {
                        success: false,
                        error: 'No prompt provided for AI generation'
                    };
                }
                
                // Get context if specified
                let contextContent = '';
                if (context.inputs.contextSource) {
                    const contextSource: ContextSource = context.inputs.contextSource;
                    contextContent = await contextManager.getContextContent(contextSource);
                }
                
                // Prepare the full prompt
                const fullPrompt = contextContent ? `${contextContent}\n\n${prompt}` : prompt;
                
                // Generate content using the agent
                const response = await context.agent.generate(fullPrompt);
                
                // Store the generated content in the context
                const outputKey = context.inputs.outputKey || 'generatedContent';
                context.outputs[outputKey] = response;
                
                return {
                    success: true
                };
            } catch (error) {
                logger.error('Error in AI generation step:', error);
                return {
                    success: false,
                    error: `Error generating content: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * File writing step - Writes content to a file
     */
    fileWritingStep: {
        id: 'fileWriting',
        name: 'File Writing',
        description: 'Writes content to a file',
        nextSteps: [],
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const filePath = context.inputs.filePath;
                const content = context.inputs.content;
                
                if (!filePath) {
                    return {
                        success: false,
                        error: 'No file path provided for file writing'
                    };
                }
                
                if (content === undefined) {
                    return {
                        success: false,
                        error: 'No content provided for file writing'
                    };
                }
                
                // Ensure the directory exists
                const directory = path.dirname(filePath);
                await fs.promises.mkdir(directory, { recursive: true });
                
                // Write the file
                await fs.promises.writeFile(filePath, content, 'utf-8');
                
                // Store the file path in the context
                const outputKey = context.inputs.outputKey || 'writtenFilePath';
                context.outputs[outputKey] = filePath;
                
                return {
                    success: true
                };
            } catch (error) {
                logger.error('Error in file writing step:', error);
                return {
                    success: false,
                    error: `Error writing file: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * File reading step - Reads content from a file
     */
    fileReadingStep: {
        id: 'fileReading',
        name: 'File Reading',
        description: 'Reads content from a file',
        nextSteps: [],
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const filePath = context.inputs.filePath;
                
                if (!filePath) {
                    return {
                        success: false,
                        error: 'No file path provided for file reading'
                    };
                }
                
                // Read the file
                const content = await fs.promises.readFile(filePath, 'utf-8');
                
                // Store the content in the context
                const outputKey = context.inputs.outputKey || 'fileContent';
                context.outputs[outputKey] = content;
                
                return {
                    success: true
                };
            } catch (error) {
                logger.error('Error in file reading step:', error);
                return {
                    success: false,
                    error: `Error reading file: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * Conditional step - Branches based on a condition
     */
    conditionalStep: {
        id: 'conditional',
        name: 'Conditional',
        description: 'Branches based on a condition',
        nextSteps: [],
        isConditional: true,
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const condition = context.inputs.condition;
                const trueStepId = context.inputs.trueStepId;
                const falseStepId = context.inputs.falseStepId;
                
                if (!trueStepId || !falseStepId) {
                    return {
                        success: false,
                        error: 'True or false step ID not provided for conditional step'
                    };
                }
                
                // Evaluate the condition
                let conditionResult = false;
                
                if (typeof condition === 'function') {
                    // Function condition
                    conditionResult = await condition(context);
                } else if (typeof condition === 'string') {
                    // Expression condition (simple evaluation)
                    // In a real implementation, you would use a proper expression evaluator
                    try {
                        // eslint-disable-next-line no-eval
                        conditionResult = eval(condition);
                    } catch (evalError) {
                        logger.error('Error evaluating condition:', evalError);
                        return {
                            success: false,
                            error: `Error evaluating condition: ${evalError instanceof Error ? evalError.message : String(evalError)}`
                        };
                    }
                } else {
                    // Boolean condition
                    conditionResult = !!condition;
                }
                
                // Determine next step based on condition
                const nextStepId = conditionResult ? trueStepId : falseStepId;
                
                return {
                    success: true,
                    nextStepId
                };
            } catch (error) {
                logger.error('Error in conditional step:', error);
                return {
                    success: false,
                    error: `Error in conditional step: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * User confirmation step - Asks the user for confirmation
     */
    userConfirmationStep: {
        id: 'userConfirmation',
        name: 'User Confirmation',
        description: 'Asks the user for confirmation',
        nextSteps: [],
        isConditional: true,
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const message = context.inputs.message || 'Do you want to continue?';
                const confirmLabel = context.inputs.confirmLabel || 'Yes';
                const cancelLabel = context.inputs.cancelLabel || 'No';
                const confirmStepId = context.inputs.confirmStepId;
                const cancelStepId = context.inputs.cancelStepId;
                
                if (!confirmStepId || !cancelStepId) {
                    return {
                        success: false,
                        error: 'Confirm or cancel step ID not provided for user confirmation step'
                    };
                }
                
                // Ask for confirmation
                const result = await vscode.window.showInformationMessage(
                    message,
                    { modal: true },
                    confirmLabel,
                    cancelLabel
                );
                
                // Determine next step based on user response
                const nextStepId = result === confirmLabel ? confirmStepId : cancelStepId;
                
                return {
                    success: true,
                    nextStepId
                };
            } catch (error) {
                logger.error('Error in user confirmation step:', error);
                return {
                    success: false,
                    error: `Error in user confirmation step: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * Command execution step - Executes a VS Code command
     */
    commandExecutionStep: {
        id: 'commandExecution',
        name: 'Command Execution',
        description: 'Executes a VS Code command',
        nextSteps: [],
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const command = context.inputs.command;
                const args = context.inputs.args || [];
                
                if (!command) {
                    return {
                        success: false,
                        error: 'No command provided for command execution step'
                    };
                }
                
                // Execute the command
                const result = await vscode.commands.executeCommand(command, ...args);
                
                // Store the result in the context
                const outputKey = context.inputs.outputKey || 'commandResult';
                context.outputs[outputKey] = result;
                
                return {
                    success: true
                };
            } catch (error) {
                logger.error('Error in command execution step:', error);
                return {
                    success: false,
                    error: `Error executing command: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    },
    
    /**
     * Delay step - Waits for a specified amount of time
     */
    delayStep: {
        id: 'delay',
        name: 'Delay',
        description: 'Waits for a specified amount of time',
        nextSteps: [],
        async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
            try {
                const delayMs = context.inputs.delayMs || 1000;
                
                // Wait for the specified time
                await new Promise(resolve => setTimeout(resolve, delayMs));
                
                return {
                    success: true
                };
            } catch (error) {
                logger.error('Error in delay step:', error);
                return {
                    success: false,
                    error: `Error in delay step: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    }
};

// Example workflows for reference
export const codeAnalysisWorkflow: WorkflowDefinition = {
    id: 'codeAnalysis',
    name: 'Code Analysis',
    description: 'Analyzes code quality, finds potential issues, and suggests improvements',
    version: '1.0.0',
    inputs: [
        {
            id: 'filePath',
            name: 'File Path',
            description: 'Path to the file to analyze',
            type: 'string',
            required: true
        }
    ],
    outputs: [],
    startStepId: 'analyze',
    steps: [
        {
            id: 'analyze',
            name: 'Analyze File',
            description: 'Analyzes the specified file for quality issues',
            nextSteps: [],
            async execute(context: WorkflowContext): Promise<WorkflowStepResult> {
                const filePath = context.inputs.filePath;
                if (!filePath) {
                    return {
                        success: false,
                        error: 'No file path provided for analysis'
                    };
                }

                // Use file tool to read the file
                const fileResult = await context.agent.tools?.get('file')?.execute({
                    action: 'readFile',
                    filePath
                });

                if (!fileResult?.success || !fileResult.output) {
                    return {
                        success: false,
                        error: fileResult?.error || 'Failed to read file'
                    };
                }

                const analysisPrompt = `Analyze the following code for quality, potential issues, and improvements:

File: ${filePath}

${fileResult.output}

Provide your analysis in the following JSON format:
{
    "insights": ["list of key insights about the code"],
    "suggestions": ["list of specific improvement suggestions"],
    "dependencies": ["list of detected dependencies"]
}`;

                try {
                    const response = await context.agent.generate(analysisPrompt);
                    const result = JSON.parse(response);
                    return {
                        success: true,
                        output: result
                    };
                } catch (error) {
                    logger.error('Failed to parse analysis result:', error);
                    return {
                        success: false,
                        error: 'Failed to parse analysis result'
                    };
                }
            }
        }
    ]
};

// Register the example workflow
workflowRegistry.registerWorkflow(codeAnalysisWorkflow);
