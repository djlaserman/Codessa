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
exports.AgentMode = void 0;
const vscode = __importStar(require("vscode"));
const operationMode_1 = require("./operationMode");
const logger_1 = require("../logger");
const contextManager_1 = require("./contextManager");
/**
 * Agent Mode - Autonomous operation with minimal user interaction
 */
class AgentMode extends operationMode_1.BaseOperationMode {
    constructor() {
        super(...arguments);
        this.id = 'agent';
        this.displayName = 'Agent';
        this.description = 'Autonomous AI agent that completes tasks with minimal user interaction';
        this.icon = '$(robot)';
        this.defaultContextType = operationMode_1.ContextType.ENTIRE_CODEBASE;
        this.requiresHumanVerification = false;
        this.supportsMultipleAgents = false;
        this.isRunning = false;
    }
    /**
     * Initialize the Agent mode
     */
    async initialize(context) {
        await super.initialize(context);
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.text = '$(robot) Agent: Idle';
        this.statusBarItem.tooltip = 'Codessa Agent Mode';
        this.statusBarItem.command = 'codessa.toggleAgentMode';
        context.subscriptions.push(this.statusBarItem);
    }
    /**
     * Process a user message in Agent mode
     */
    async processMessage(message, agent, contextSource, additionalParams) {
        try {
            logger_1.logger.info(`Processing message in Agent mode: ${message}`);
            // Start the agent
            await this.startAgent(message, agent, contextSource);
            return 'Agent started. I will work on this task autonomously and report back when finished.';
        }
        catch (error) {
            logger_1.logger.error('Error processing message in Agent mode:', error);
            return `Error starting agent: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    /**
     * Start the agent
     */
    async startAgent(task, agent, contextSource) {
        if (this.isRunning) {
            throw new Error('Agent is already running. Please wait for it to complete or cancel it.');
        }
        this.isRunning = true;
        this.cancelTokenSource = new vscode.CancellationTokenSource();
        // Update status bar
        if (this.statusBarItem) {
            this.statusBarItem.text = '$(robot) Agent: Running';
            this.statusBarItem.show();
        }
        // Start progress indicator
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Codessa Agent',
            cancellable: true
        }, async (progress, token) => {
            this.progressReporter = progress;
            // Handle cancellation
            token.onCancellationRequested(() => {
                this.cancelTokenSource?.cancel();
                this.stopAgent('User cancelled the operation');
            });
            progress.report({ message: 'Starting agent...' });
            try {
                // Get context content
                const contextContent = await contextManager_1.contextManager.getContextContent(contextSource);
                // Prepare the prompt with context
                const prompt = `
I need you to work on the following task autonomously:

${task}

Here is the context you need:

${contextContent}

Please work on this task step by step. For each step:
1. Explain what you're going to do
2. Execute the necessary actions
3. Verify the results
4. Move on to the next step

If you encounter any issues that you cannot resolve, explain the problem clearly.
`;
                // Execute the agent task
                if (this.cancelTokenSource) {
                    await this.executeAgentTask(prompt, agent, progress, this.cancelTokenSource.token);
                }
                else {
                    throw new Error('Cancellation token source is undefined');
                }
                // Complete the task
                this.stopAgent('Task completed successfully');
                // Show completion notification
                vscode.window.showInformationMessage('Agent has completed the task successfully.');
            }
            catch (error) {
                logger_1.logger.error('Error in agent execution:', error);
                this.stopAgent(`Error: ${error instanceof Error ? error.message : String(error)}`);
                // Show error notification
                vscode.window.showErrorMessage(`Agent encountered an error: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Execute the agent task
     */
    async executeAgentTask(prompt, agent, progress, token) {
        // Maximum number of steps to prevent infinite loops
        const MAX_STEPS = 20;
        let currentStep = 0;
        // Initial thinking
        progress.report({ message: 'Analyzing task and planning approach...' });
        // Generate initial plan
        const planResponse = await agent.generate(`${prompt}\n\nFirst, create a detailed plan for completing this task. Break it down into specific steps.`, this.getLLMParams(agent.getDefaultLLMParams()), token);
        // Report plan
        progress.report({ message: 'Plan created, starting execution...' });
        // Execute steps
        let currentContext = `${prompt}\n\nMy plan:\n${planResponse}\n\nNow I'll execute this plan step by step.`;
        while (currentStep < MAX_STEPS && !token.isCancellationRequested) {
            currentStep++;
            // Report progress
            progress.report({ message: `Executing step ${currentStep}...`, increment: 100 / MAX_STEPS });
            // Generate next step
            const stepPrompt = `${currentContext}\n\nStep ${currentStep}: `;
            const stepResponse = await agent.generate(stepPrompt, this.getLLMParams(agent.getDefaultLLMParams()), token);
            // Add step to context
            currentContext += `\n\nStep ${currentStep}:\n${stepResponse}`;
            // Check if task is complete
            if (stepResponse.toLowerCase().includes('task complete') ||
                stepResponse.toLowerCase().includes('all steps completed')) {
                break;
            }
            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Final report
        progress.report({ message: 'Generating final report...' });
        // Generate summary
        const summaryPrompt = `${currentContext}\n\nNow, provide a concise summary of what you've accomplished and any next steps or recommendations:`;
        const summaryResponse = await agent.generate(summaryPrompt, this.getLLMParams(agent.getDefaultLLMParams()), token);
        // Add summary to context
        currentContext += `\n\nSummary:\n${summaryResponse}`;
        // Create a report document
        const document = await vscode.workspace.openTextDocument({
            content: currentContext,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(document);
    }
    /**
     * Stop the agent
     */
    stopAgent(reason) {
        this.isRunning = false;
        this.cancelTokenSource?.dispose();
        this.cancelTokenSource = undefined;
        // Update status bar
        if (this.statusBarItem) {
            this.statusBarItem.text = '$(robot) Agent: Idle';
        }
        // Log reason
        logger_1.logger.info(`Agent stopped: ${reason}`);
    }
    /**
     * Get LLM parameters specific to Agent mode
     */
    getLLMParams(baseParams) {
        return {
            ...baseParams,
            temperature: 0.4, // Balanced temperature for creativity and precision
            maxTokens: 2000 // Longer responses for detailed reasoning
        };
    }
    /**
     * Get the system prompt for Agent mode
     */
    async getSystemPrompt(agent, contextSource) {
        return `
You are an autonomous AI agent capable of completing complex tasks with minimal human intervention.
Your goal is to work through tasks step by step, making progress independently.

When working on a task:
1. Analyze the problem thoroughly
2. Create a detailed plan
3. Execute each step methodically
4. Verify your work at each stage
5. Adapt your approach if you encounter obstacles
6. Provide clear explanations of your actions and reasoning

You have access to the codebase and can perform various actions like reading files, writing code,
running commands, and more. Use these capabilities wisely to accomplish your tasks.

Always be transparent about your thought process and limitations. If you encounter a situation
where you cannot proceed without human input, clearly explain the issue and what information
you need.
`;
    }
    /**
     * Get UI components specific to Agent mode
     */
    getUIComponents() {
        return {
            controlPanel: `
<div class="agent-control-panel">
    <div class="agent-status">
        <span id="agent-status-indicator" class="status-indicator"></span>
        <span id="agent-status-text">Idle</span>
    </div>
    <div class="agent-controls">
        <button id="btn-start-agent" title="Start Agent"><i class="codicon codicon-play"></i> Start</button>
        <button id="btn-stop-agent" title="Stop Agent" disabled><i class="codicon codicon-stop"></i> Stop</button>
    </div>
</div>
`,
            contextPanel: `
<div class="context-panel">
    <div class="context-header">
        <h3>Agent Context</h3>
        <div class="context-controls">
            <button id="btn-refresh-context" title="Refresh Context"><i class="codicon codicon-refresh"></i></button>
            <button id="btn-select-files" title="Select Files"><i class="codicon codicon-file-code"></i></button>
            <button id="btn-select-folders" title="Select Folders"><i class="codicon codicon-folder"></i></button>
        </div>
    </div>
    <div class="context-type">
        <select id="context-type-selector">
            <option value="entire_codebase">Entire Codebase</option>
            <option value="selected_files">Selected Files</option>
            <option value="current_file">Current File</option>
            <option value="custom">Custom</option>
        </select>
    </div>
    <div id="context-files-list" class="context-files-list"></div>
</div>
`,
            messageInput: `
<div class="message-input-container">
    <textarea id="message-input" placeholder="Describe the task for the agent to complete autonomously..."></textarea>
    <button id="btn-send" title="Send"><i class="codicon codicon-send"></i></button>
</div>
`
        };
    }
    /**
     * Handle mode-specific commands
     */
    async handleCommand(command, args) {
        switch (command) {
            case 'startAgent':
                if (!this.isRunning && args.length >= 3) {
                    const [task, agent, contextSource] = args;
                    await this.startAgent(task, agent, contextSource);
                }
                break;
            case 'stopAgent':
                if (this.isRunning) {
                    this.cancelTokenSource?.cancel();
                    this.stopAgent('User manually stopped the agent');
                }
                break;
        }
    }
}
exports.AgentMode = AgentMode;
//# sourceMappingURL=agentMode.js.map