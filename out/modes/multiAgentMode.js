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
exports.MultiAgentMode = void 0;
const vscode = __importStar(require("vscode"));
const operationMode_1 = require("./operationMode");
const logger_1 = require("../logger");
const contextManager_1 = require("./contextManager");
/**
 * Multi-Agent Mode - Team of agents with supervisor coordination
 */
class MultiAgentMode extends operationMode_1.BaseOperationMode {
    constructor() {
        super(...arguments);
        this.id = 'multi-agent';
        this.displayName = 'Multi-Agent';
        this.description = 'Team of AI agents working together on complex tasks';
        this.icon = '$(organization)';
        this.defaultContextType = operationMode_1.ContextType.ENTIRE_CODEBASE;
        this.requiresHumanVerification = false;
        this.supportsMultipleAgents = true;
        this.isRunning = false;
        this.agents = new Map();
        this.conversationLog = [];
        // Predefined agent roles
        this.predefinedRoles = [
            {
                id: 'supervisor',
                name: 'Supervisor',
                description: 'Coordinates the team and ensures the task is completed effectively',
                systemPrompt: `
You are the supervisor of a team of AI agents working together on a complex task.
Your role is to:
1. Understand the overall task and break it down into subtasks
2. Assign subtasks to appropriate team members based on their expertise
3. Monitor progress and provide guidance when needed
4. Integrate the work of different team members
5. Ensure the final solution meets the requirements

You should maintain a high-level view of the project and help resolve any conflicts or issues that arise.
Communicate clearly and provide constructive feedback to team members.
`
            },
            {
                id: 'architect',
                name: 'Architect',
                description: 'Designs the overall structure and architecture of the solution',
                systemPrompt: `
You are the architect in a team of AI agents working on a software project.
Your role is to:
1. Design the overall structure and architecture of the solution
2. Make high-level technical decisions
3. Ensure the design is scalable, maintainable, and meets requirements
4. Create diagrams and documentation to communicate the architecture
5. Review implementation to ensure it aligns with the architectural vision

Focus on creating clean, modular designs that follow best practices and patterns.
Consider trade-offs between different approaches and justify your decisions.
`
            },
            {
                id: 'developer',
                name: 'Developer',
                description: 'Implements the solution based on the architect\'s design',
                systemPrompt: `
You are a developer in a team of AI agents working on a software project.
Your role is to:
1. Implement features and components based on the architect's design
2. Write clean, efficient, and well-documented code
3. Follow coding standards and best practices
4. Create unit tests to ensure code quality
5. Refactor code as needed to improve quality

Focus on writing code that is not only functional but also maintainable and readable.
Pay attention to edge cases and error handling in your implementation.
`
            },
            {
                id: 'tester',
                name: 'Tester',
                description: 'Tests the solution to ensure it meets requirements and is free of bugs',
                systemPrompt: `
You are a tester in a team of AI agents working on a software project.
Your role is to:
1. Create test plans and test cases based on requirements
2. Execute tests to verify functionality
3. Identify and report bugs and issues
4. Verify fixes and perform regression testing
5. Ensure the solution meets quality standards

Be thorough in your testing approach, considering edge cases and potential failure points.
Provide clear, detailed bug reports that help developers understand and fix issues.
`
            },
            {
                id: 'reviewer',
                name: 'Reviewer',
                description: 'Reviews code and provides feedback to improve quality',
                systemPrompt: `
You are a code reviewer in a team of AI agents working on a software project.
Your role is to:
1. Review code for quality, correctness, and adherence to standards
2. Identify potential bugs, performance issues, and security vulnerabilities
3. Suggest improvements and best practices
4. Ensure code is maintainable and follows the project's style guide
5. Provide constructive feedback to developers

Be thorough but fair in your reviews, focusing on helping improve the code rather than criticizing.
Consider both technical correctness and readability in your feedback.
`
            }
        ];
    }
    /**
     * Initialize the Multi-Agent mode
     */
    async initialize(context) {
        await super.initialize(context);
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.text = '$(organization) Multi-Agent: Idle';
        this.statusBarItem.tooltip = 'Codessa Multi-Agent Mode';
        this.statusBarItem.command = 'codessa.toggleMultiAgentMode';
        context.subscriptions.push(this.statusBarItem);
    }
    /**
     * Process a user message in Multi-Agent mode
     */
    async processMessage(message, agent, contextSource) {
        try {
            logger_1.logger.info(`Processing message in Multi-Agent mode: ${message}`);
            // If agents are not set up, create them
            if (this.agents.size === 0) {
                await this.setupAgents(agent);
            }
            // Start the multi-agent system
            await this.startMultiAgentSystem(message, contextSource);
            return 'Multi-Agent system started. The team will work on this task collaboratively and report back when finished.';
        }
        catch (error) {
            logger_1.logger.error('Error processing message in Multi-Agent mode:', error);
            return `Error starting multi-agent system: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
    /**
     * Set up agents for the multi-agent system
     */
    async setupAgents(baseAgent) {
        // Clear existing agents
        this.agents.clear();
        // Create instances for each role
        for (const role of this.predefinedRoles) {
            // Clone the base agent
            const agentInstance = {
                id: `agent-${role.id}`,
                role,
                agent: baseAgent, // In a real implementation, you would create separate agent instances
                messages: []
            };
            this.agents.set(role.id, agentInstance);
        }
        // Set supervisor agent
        this.supervisorAgent = baseAgent;
    }
    /**
     * Start the multi-agent system
     */
    async startMultiAgentSystem(task, contextSource) {
        if (this.isRunning) {
            throw new Error('Multi-Agent system is already running. Please wait for it to complete or cancel it.');
        }
        this.isRunning = true;
        this.cancelTokenSource = new vscode.CancellationTokenSource();
        const token = this.cancelTokenSource.token; // Store token in a local variable
        // Update status bar
        if (this.statusBarItem) {
            this.statusBarItem.text = '$(organization) Multi-Agent: Running';
            this.statusBarItem.show();
        }
        // Start progress indicator
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Codessa Multi-Agent System',
            cancellable: true
        }, async (progress, progressToken) => {
            this.progressReporter = progress;
            // Handle cancellation
            progressToken.onCancellationRequested(() => {
                this.cancelTokenSource?.cancel();
                this.stopMultiAgentSystem('User cancelled the operation');
            });
            progress.report({ message: 'Starting multi-agent system...' });
            try {
                // Get context content
                const contextContent = await contextManager_1.contextManager.getContextContent(contextSource);
                // Clear conversation log
                this.conversationLog = [];
                // Initialize the task with the supervisor
                await this.runSupervisorPhase(task, contextContent, progress, token);
                // Complete the task
                this.stopMultiAgentSystem('Task completed successfully');
                // Show completion notification
                vscode.window.showInformationMessage('Multi-Agent system has completed the task successfully.');
                // Create a report document
                await this.createReport();
            }
            catch (error) {
                logger_1.logger.error('Error in multi-agent execution:', error);
                this.stopMultiAgentSystem(`Error: ${error instanceof Error ? error.message : String(error)}`);
                // Show error notification
                vscode.window.showErrorMessage(`Multi-Agent system encountered an error: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * Run the supervisor phase of the multi-agent system
     */
    async runSupervisorPhase(task, contextContent, progress, token) {
        if (!this.supervisorAgent) {
            throw new Error('Supervisor agent not initialized');
        }
        // Maximum number of iterations
        const MAX_ITERATIONS = 10;
        let currentIteration = 0;
        // Initial prompt for the supervisor
        const supervisorPrompt = `
You are the supervisor of a multi-agent team working on the following task:

${task}

Here is the context you need:

${contextContent}

Your team consists of the following agents:
${Array.from(this.agents.values()).map(agent => `- ${agent.role.name}: ${agent.role.description}`).join('\n')}

As the supervisor, you need to:
1. Analyze the task and break it down into subtasks
2. Assign each subtask to the appropriate team member
3. Coordinate the work of the team
4. Integrate the results into a final solution

Please start by analyzing the task and creating a plan.
`;
        // Log supervisor prompt
        this.logMessage('supervisor', 'system', supervisorPrompt);
        // Generate initial plan
        progress.report({ message: 'Supervisor is analyzing the task and creating a plan...' });
        const planResponse = await this.supervisorAgent.generate(supervisorPrompt, this.getLLMParams(this.supervisorAgent.getDefaultLLMParams()), token);
        // Log supervisor response
        this.logMessage('supervisor', 'assistant', planResponse);
        // Execute the multi-agent workflow
        while (currentIteration < MAX_ITERATIONS && !token.isCancellationRequested) {
            currentIteration++;
            // Report progress
            progress.report({
                message: `Iteration ${currentIteration}: Executing multi-agent workflow...`,
                increment: 100 / MAX_ITERATIONS
            });
            // For each agent (except supervisor), generate a response
            for (const [roleId, agentInstance] of this.agents.entries()) {
                if (roleId === 'supervisor')
                    continue;
                // Generate prompt for this agent
                const agentPrompt = `
You are the ${agentInstance.role.name} in a multi-agent team working on the following task:

${task}

The supervisor has created the following plan:

${planResponse}

Your specific role is: ${agentInstance.role.description}

Based on the plan, what actions will you take for this iteration?
`;
                // Log agent prompt
                this.logMessage(roleId, 'system', agentPrompt);
                // Generate agent response
                progress.report({ message: `${agentInstance.role.name} is working...` });
                const agentResponse = await agentInstance.agent.generate(agentPrompt, this.getLLMParams(agentInstance.agent.getDefaultLLMParams()), token);
                // Log agent response
                this.logMessage(roleId, 'assistant', agentResponse);
                // Small delay to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            // Generate supervisor coordination message
            const coordinationPrompt = `
You are the supervisor of the multi-agent team. Here's the current state of the project:

Task: ${task}

Your initial plan:
${planResponse}

Team member updates:
${Array.from(this.agents.entries())
                .filter(([id]) => id !== 'supervisor')
                .map(([id, instance]) => {
                const lastMessage = this.getLastMessageForAgent(id);
                return `${instance.role.name}: ${lastMessage || 'No update yet'}`;
            })
                .join('\n\n')}

Based on these updates, provide coordination and guidance for the next iteration.
If the task is complete, indicate that clearly.
`;
            // Log coordination prompt
            this.logMessage('supervisor', 'system', coordinationPrompt);
            // Generate supervisor response
            progress.report({ message: 'Supervisor is coordinating the team...' });
            const coordinationResponse = await this.supervisorAgent.generate(coordinationPrompt, this.getLLMParams(this.supervisorAgent.getDefaultLLMParams()), token);
            // Log supervisor response
            this.logMessage('supervisor', 'assistant', coordinationResponse);
            // Check if task is complete
            if (coordinationResponse && (coordinationResponse.toLowerCase().includes('task complete') ||
                coordinationResponse.toLowerCase().includes('task is complete'))) {
                break;
            }
            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Final summary from supervisor
        const summaryPrompt = `
You are the supervisor of the multi-agent team. The task is now complete.

Task: ${task}

Please provide a comprehensive summary of what the team has accomplished, including:
1. The original task and objectives
2. The approach taken by the team
3. The contributions of each team member
4. The final solution or outcome
5. Any challenges faced and how they were overcome
6. Recommendations for future work or improvements

This summary will be included in the final report.
`;
        // Log summary prompt
        this.logMessage('supervisor', 'system', summaryPrompt);
        // Generate summary
        progress.report({ message: 'Generating final summary...' });
        const summaryResponse = await this.supervisorAgent.generate(summaryPrompt, this.getLLMParams(this.supervisorAgent.getDefaultLLMParams()), token);
        // Log summary response
        this.logMessage('supervisor', 'assistant', summaryResponse);
    }
    /**
     * Stop the multi-agent system
     */
    stopMultiAgentSystem(reason) {
        this.isRunning = false;
        this.cancelTokenSource?.dispose();
        this.cancelTokenSource = undefined;
        // Update status bar
        if (this.statusBarItem) {
            this.statusBarItem.text = '$(organization) Multi-Agent: Idle';
        }
        // Log reason
        logger_1.logger.info(`Multi-Agent system stopped: ${reason}`);
    }
    /**
     * Log a message in the conversation log
     */
    logMessage(agentId, role, content) {
        this.conversationLog.push({
            agent: agentId,
            message: `[${role}] ${content}`,
            timestamp: new Date()
        });
    }
    /**
     * Get the last message for a specific agent
     */
    getLastMessageForAgent(agentId) {
        // Filter messages for this agent and get the last one
        const agentMessages = this.conversationLog
            .filter(log => log.agent === agentId && log.message.startsWith('[assistant]'));
        if (agentMessages.length === 0) {
            return undefined;
        }
        const lastMessage = agentMessages[agentMessages.length - 1];
        return lastMessage.message.replace('[assistant] ', '');
    }
    /**
     * Create a report document
     */
    async createReport() {
        // Generate report content
        let reportContent = '# Multi-Agent Task Report\n\n';
        // Add timestamp
        reportContent += `Generated on: ${new Date().toLocaleString()}\n\n`;
        // Add team members
        reportContent += '## Team Members\n\n';
        for (const [roleId, agentInstance] of this.agents.entries()) {
            reportContent += `### ${agentInstance.role.name}\n`;
            reportContent += `${agentInstance.role.description}\n\n`;
        }
        // Add conversation log
        reportContent += '## Conversation Log\n\n';
        for (const log of this.conversationLog) {
            if (log.message.startsWith('[assistant]')) {
                const agentName = this.agents.get(log.agent)?.role.name || log.agent;
                reportContent += `### ${agentName} (${log.timestamp.toLocaleTimeString()})\n\n`;
                reportContent += `${log.message.replace('[assistant] ', '')}\n\n`;
            }
        }
        // Create a document
        const document = await vscode.workspace.openTextDocument({
            content: reportContent,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(document);
    }
    /**
     * Get LLM parameters specific to Multi-Agent mode
     */
    getLLMParams(baseParams) {
        return {
            ...baseParams,
            temperature: 0.5, // Balanced temperature for creativity and precision
            maxTokens: 2000 // Longer responses for detailed reasoning
        };
    }
    /**
     * Get the system prompt for Multi-Agent mode
     */
    async getSystemPrompt(_agent, _contextSource) {
        return `
You are coordinating a team of AI agents working together on complex tasks.
Each agent has a specific role and expertise, and they collaborate to solve problems.

The team includes:
- Supervisor: Coordinates the team and ensures the task is completed effectively
- Architect: Designs the overall structure and architecture of the solution
- Developer: Implements the solution based on the architect's design
- Tester: Tests the solution to ensure it meets requirements and is free of bugs
- Reviewer: Reviews code and provides feedback to improve quality

Your role is to facilitate communication between these agents and help them work together effectively.
You should understand the strengths and limitations of each agent and assign tasks accordingly.
`;
    }
    /**
     * Get UI components specific to Multi-Agent mode
     */
    getUIComponents() {
        return {
            controlPanel: `
<div class="multi-agent-control-panel">
    <div class="multi-agent-status">
        <span id="multi-agent-status-indicator" class="status-indicator"></span>
        <span id="multi-agent-status-text">Idle</span>
    </div>
    <div class="multi-agent-controls">
        <button id="btn-start-multi-agent" title="Start Multi-Agent System"><i class="codicon codicon-play"></i> Start</button>
        <button id="btn-stop-multi-agent" title="Stop Multi-Agent System" disabled><i class="codicon codicon-stop"></i> Stop</button>
    </div>
    <div class="multi-agent-team">
        <h4>Team Configuration</h4>
        <div id="multi-agent-team-members" class="team-members-list">
            <!-- Team members will be added here dynamically -->
        </div>
        <button id="btn-add-agent" title="Add Agent"><i class="codicon codicon-add"></i> Add Agent</button>
    </div>
</div>
`,
            contextPanel: `
<div class="context-panel">
    <div class="context-header">
        <h3>Multi-Agent Context</h3>
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
    <textarea id="message-input" placeholder="Describe the task for the multi-agent team to complete..."></textarea>
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
            case 'startMultiAgentSystem':
                if (!this.isRunning && args.length >= 3) {
                    const [task, agent, contextSource] = args;
                    await this.setupAgents(agent);
                    await this.startMultiAgentSystem(task, contextSource);
                }
                break;
            case 'stopMultiAgentSystem':
                if (this.isRunning) {
                    this.cancelTokenSource?.cancel();
                    this.stopMultiAgentSystem('User manually stopped the multi-agent system');
                }
                break;
            case 'addAgentRole':
                if (args.length >= 1) {
                    const role = args[0];
                    this.predefinedRoles.push(role);
                }
                break;
        }
    }
}
exports.MultiAgentMode = MultiAgentMode;
//# sourceMappingURL=multiAgentMode.js.map