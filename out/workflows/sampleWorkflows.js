"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflows = exports.documentationWorkflow = exports.refactoringWorkflow = exports.codeAnalysisWorkflow = void 0;
const logger_1 = require("../logger");
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
exports.refactoringWorkflow = {
    id: 'refactoring',
    name: 'Code Refactoring',
    description: 'Refactors code to improve maintainability and readability',
    version: '1.0.0',
    inputs: [
        {
            id: 'filePath',
            name: 'File Path',
            description: 'Path to the file to refactor',
            type: 'string',
            required: true
        }
    ],
    outputs: [],
    startStepId: 'plan',
    steps: [
        {
            id: 'plan',
            name: 'Plan Refactoring',
            description: 'Creates a refactoring plan',
            nextSteps: ['execute'],
            async execute(context) {
                const filePath = context.inputs.filePath;
                if (!filePath) {
                    return {
                        success: false,
                        error: 'No file path provided for refactoring'
                    };
                }
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
                const planPrompt = `Create a detailed refactoring plan for the following code:

File: ${filePath}

${fileResult.output}

Focus on:
1. Improving code organization
2. Reducing complexity
3. Enhancing readability
4. Following best practices

Provide your plan and explain the reasoning behind each change.`;
                try {
                    const response = await context.agent.generate(planPrompt);
                    return {
                        success: true,
                        output: response
                    };
                }
                catch (error) {
                    logger_1.logger.error('Failed to generate refactoring plan:', error);
                    return {
                        success: false,
                        error: 'Failed to generate refactoring plan'
                    };
                }
            }
        },
        {
            id: 'execute',
            name: 'Execute Refactoring',
            description: 'Executes the refactoring plan',
            nextSteps: [],
            async execute(context) {
                const filePath = context.inputs.filePath;
                if (!filePath) {
                    return {
                        success: false,
                        error: 'No file path provided for refactoring'
                    };
                }
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
                const refactoringPrompt = `Refactor the following code based on the established plan:

File: ${filePath}

${fileResult.output}

Generate the refactored code as a unified diff patch.`;
                try {
                    const response = await context.agent.generate(refactoringPrompt);
                    return {
                        success: true,
                        output: response
                    };
                }
                catch (error) {
                    logger_1.logger.error('Failed to execute refactoring:', error);
                    return {
                        success: false,
                        error: 'Failed to execute refactoring'
                    };
                }
            }
        }
    ]
};
exports.documentationWorkflow = {
    id: 'documentation',
    name: 'Documentation Generator',
    description: 'Generates comprehensive documentation for code',
    version: '1.0.0',
    inputs: [
        {
            id: 'filePath',
            name: 'File Path',
            description: 'Path to the file to document',
            type: 'string',
            required: true
        }
    ],
    outputs: [],
    startStepId: 'generate',
    steps: [
        {
            id: 'generate',
            name: 'Generate API Documentation',
            description: 'Generates API documentation',
            nextSteps: ['save'],
            async execute(context) {
                const filePath = context.inputs.filePath;
                if (!filePath) {
                    return {
                        success: false,
                        error: 'No file path provided for documentation'
                    };
                }
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
                const docPrompt = `Generate comprehensive documentation for the following code:

File: ${filePath}

${fileResult.output}

Include:
1. Overview of the module/class/functions
2. Detailed API documentation for each public interface
3. Usage examples
4. Parameters and return values
5. Dependencies and requirements

Format the documentation in Markdown.`;
                try {
                    const response = await context.agent.generate(docPrompt);
                    return {
                        success: true,
                        output: response
                    };
                }
                catch (error) {
                    logger_1.logger.error('Failed to generate documentation:', error);
                    return {
                        success: false,
                        error: 'Failed to generate documentation'
                    };
                }
            }
        },
        {
            id: 'save',
            name: 'Save Documentation',
            description: 'Saves documentation to file',
            nextSteps: [],
            async execute(context) {
                const filePath = context.inputs.filePath;
                if (!filePath) {
                    return {
                        success: false,
                        error: 'No file path provided for documentation'
                    };
                }
                try {
                    const docContent = await context.agent.generate('Format the documentation for saving');
                    const docPath = filePath.replace(/\.[^.]+$/, '.md');
                    const writeResult = await context.agent.tools?.get('file')?.execute({
                        action: 'writeFile',
                        filePath: docPath,
                        content: docContent
                    });
                    if (!writeResult?.success) {
                        return {
                            success: false,
                            error: writeResult?.error || 'Failed to save documentation'
                        };
                    }
                    return { success: true };
                }
                catch (error) {
                    logger_1.logger.error('Failed to save documentation:', error);
                    return {
                        success: false,
                        error: 'Failed to save documentation'
                    };
                }
            }
        }
    ]
};
exports.workflows = {
    codeAnalysis: exports.codeAnalysisWorkflow,
    refactoring: exports.refactoringWorkflow,
    documentation: exports.documentationWorkflow
};
//# sourceMappingURL=sampleWorkflows.js.map