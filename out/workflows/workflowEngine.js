"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeAnalysisWorkflow = exports.commonWorkflowSteps = exports.workflowRegistry = exports.WorkflowRegistry = exports.Workflow = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../logger");
const contextManager_1 = require("../modes/contextManager");
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
/**
 * Common workflow steps
 */
exports.commonWorkflowSteps = {
    /**
     * Input step - Collects input from the user
     */
    inputStep: {
        id: 'input',
        name: 'User Input',
        description: 'Collects input from the user',
        nextSteps: [],
        async execute(context) {
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
            }
            catch (error) {
                logger_1.logger.error('Error in input step:', error);
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
        async execute(context) {
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
            }
            catch (error) {
                logger_1.logger.error('Error in file selection step:', error);
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
        async execute(context) {
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
            }
            catch (error) {
                logger_1.logger.error('Error in folder selection step:', error);
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
        async execute(context) {
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
                    const contextSource = context.inputs.contextSource;
                    contextContent = await contextManager_1.contextManager.getContextContent(contextSource);
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
            }
            catch (error) {
                logger_1.logger.error('Error in AI generation step:', error);
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
        async execute(context) {
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
            }
            catch (error) {
                logger_1.logger.error('Error in file writing step:', error);
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
        async execute(context) {
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
            }
            catch (error) {
                logger_1.logger.error('Error in file reading step:', error);
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
        async execute(context) {
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
                }
                else if (typeof condition === 'string') {
                    // Expression condition (simple evaluation)
                    // In a real implementation, you would use a proper expression evaluator
                    try {
                        // eslint-disable-next-line no-eval
                        conditionResult = eval(condition);
                    }
                    catch (evalError) {
                        logger_1.logger.error('Error evaluating condition:', evalError);
                        return {
                            success: false,
                            error: `Error evaluating condition: ${evalError instanceof Error ? evalError.message : String(evalError)}`
                        };
                    }
                }
                else {
                    // Boolean condition
                    conditionResult = !!condition;
                }
                // Determine next step based on condition
                const nextStepId = conditionResult ? trueStepId : falseStepId;
                return {
                    success: true,
                    nextStepId
                };
            }
            catch (error) {
                logger_1.logger.error('Error in conditional step:', error);
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
        async execute(context) {
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
                const result = await vscode.window.showInformationMessage(message, { modal: true }, confirmLabel, cancelLabel);
                // Determine next step based on user response
                const nextStepId = result === confirmLabel ? confirmStepId : cancelStepId;
                return {
                    success: true,
                    nextStepId
                };
            }
            catch (error) {
                logger_1.logger.error('Error in user confirmation step:', error);
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
        async execute(context) {
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
            }
            catch (error) {
                logger_1.logger.error('Error in command execution step:', error);
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
        async execute(context) {
            try {
                const delayMs = context.inputs.delayMs || 1000;
                // Wait for the specified time
                await new Promise(resolve => setTimeout(resolve, delayMs));
                return {
                    success: true
                };
            }
            catch (error) {
                logger_1.logger.error('Error in delay step:', error);
                return {
                    success: false,
                    error: `Error in delay step: ${error instanceof Error ? error.message : String(error)}`
                };
            }
        }
    }
};
// Example workflows for reference
exports.codeAnalysisWorkflow = {
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
            async execute(context) {
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
                }
                catch (error) {
                    logger_1.logger.error('Failed to parse analysis result:', error);
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
exports.workflowRegistry.registerWorkflow(exports.codeAnalysisWorkflow);
//# sourceMappingURL=workflowEngine.js.map