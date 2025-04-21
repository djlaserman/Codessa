import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { WorkflowStep, WorkflowContext, WorkflowStepResult } from './workflow';
import { logger } from '../logger';
import { ContextSource, ContextType } from '../modes/operationMode';
import { contextManager } from '../modes/contextManager';

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
