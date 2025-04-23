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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const logger_1 = require("./logger");
const llmService_1 = require("./llm/llmService");
const toolRegistry_1 = require("./tools/toolRegistry");
const promptManager_1 = require("./agents/promptManager");
const agentManager_1 = require("./agents/agentManager");
const agentTree_1 = require("./ui/agentTree");
const toolsView_1 = require("./ui/toolsView");
const agentConfigPanel_1 = require("./ui/agentConfigPanel");
const dashboard_1 = require("./ui/dashboard");
const providerSettingsPanel_1 = require("./ui/providerSettingsPanel");
const statusBar_1 = require("./ui/statusBar");
const registerModes_1 = require("./commands/registerModes");
const chatViewProvider_1 = require("./ui/chatViewProvider");
const openModeSelector_1 = require("./commands/openModeSelector");
const operationMode_1 = require("./modes/operationMode");
const workflowEngine_1 = require("./workflows/workflowEngine");
const langgraph_1 = require("./workflows/langgraph");
const templates_1 = require("./workflows/langgraph/templates");
const advancedTemplates_1 = require("./workflows/langgraph/advancedTemplates");
const specializedTemplates_1 = require("./workflows/langgraph/specializedTemplates");
const memoryManager_1 = require("./memory/memoryManager");
const vectorMemory_1 = require("./memory/vectorMemory");
const workflowPanel_1 = require("./ui/workflowPanel");
const memoryView_1 = require("./ui/memoryView");
/**
 * Codessa: AI Coding Assistant Extension
 *
 * A VS Code extension that provides AI assistance for coding tasks
 * using various LLM providers (OpenAI, Ollama, etc.)
 */
async function activate(context) {
    // Show a notification to confirm activation
    vscode.window.showInformationMessage('Codessa extension is now active!');
    console.log('Activating Codessa extension...');
    logger_1.logger.info('Activating Codessa extension...');
    // Show the output channel
    logger_1.logger.show();
    // Initialize services
    try {
        // Initialize LLM service with context
        logger_1.logger.info('Initializing LLM service...');
        llmService_1.llmService.initialize(context);
        // Initialize memory system
        logger_1.logger.info('Initializing memory system...');
        memoryManager_1.memoryManager.initialize(context);
        await vectorMemory_1.vectorMemoryManager.initialize();
        // Register operation modes
        logger_1.logger.info('Registering operation modes...');
        await (0, registerModes_1.registerModes)(context);
        logger_1.logger.info(`Operation modes available: ${operationMode_1.operationModeRegistry.getAllModes().length}`);
        // Log service initialization status
        logger_1.logger.info(`LLM providers available: ${llmService_1.llmService.listProviderIds().join(', ')}`);
        logger_1.logger.info(`Tools available: ${toolRegistry_1.toolRegistry.getAllTools().length}`);
        logger_1.logger.info(`System prompts available: ${promptManager_1.promptManager.listPromptNames().length}`);
        logger_1.logger.info(`Agents available: ${agentManager_1.agentManager.getAllAgents().length}`);
        logger_1.logger.info(`Original workflows available: ${workflowEngine_1.workflowRegistry.getAllWorkflows().length}`);
        logger_1.logger.info(`LangGraph workflows available: ${langgraph_1.langGraphRegistry.getAllWorkflows().length}`);
        const memories = await memoryManager_1.memoryManager.getMemories();
        logger_1.logger.info(`Memory system initialized: ${memories.length} memories loaded`);
        // Register UI components
        registerUI(context);
        // Register commands
        registerCommands(context);
        // Display startup message
        const configuredProviders = llmService_1.llmService.getConfiguredProviders();
        if (configuredProviders.length === 0) {
            vscode.window.showInformationMessage('Codessa activated. Please configure an LLM provider in settings.', 'Open Chat')
                .then(selection => {
                if (selection === 'Open Chat') {
                    vscode.commands.executeCommand('codessa.openChatView');
                }
            });
        }
        else {
            vscode.window.showInformationMessage(`Codessa activated with ${configuredProviders.length} LLM providers.`, 'Open Chat')
                .then(selection => {
                if (selection === 'Open Chat') {
                    vscode.commands.executeCommand('codessa.openChatView');
                }
            });
        }
        let chatViewProvider;
        try {
            // Register the chat view provider
            chatViewProvider = new chatViewProvider_1.ChatViewProvider(context.extensionUri, context);
            context.subscriptions.push(vscode.window.registerWebviewViewProvider('codessa.chatViewSidebar', chatViewProvider, {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }));
            // Show the Codessa sidebar
            await vscode.commands.executeCommand('workbench.view.extension.codessa-sidebar');
            // Then show the chat view specifically
            await vscode.commands.executeCommand('codessa.chatViewSidebar.focus');
            logger_1.logger.info('Chat View initialized and shown in sidebar.');
        }
        catch (error) {
            logger_1.logger.error('Error registering ChatViewProvider:', error);
            vscode.window.showErrorMessage('Failed to register ChatViewProvider. Check logs for details.');
        }
    }
    catch (error) {
        logger_1.logger.error('Error activating Codessa extension:', error);
        vscode.window.showErrorMessage('Failed to activate Codessa extension. Check logs for details.');
    }
}
async function getDefaultOrSelectedAgent(interactive) {
    // If interactive parameter is not provided, default to true
    const isInteractive = interactive === undefined ? true : interactive;
    const agents = agentManager_1.agentManager.getAllAgents();
    // Non-interactive checks first
    if (agents.length === 1) {
        logger_1.logger.debug('getDefaultOrSelectedAgent: Found single agent, using as default.');
        return agents[0]; // Use the only agent available
    }
    // Try to get the default agent
    const defaultAgent = agentManager_1.agentManager.getDefaultAgent();
    if (defaultAgent) {
        logger_1.logger.debug('getDefaultOrSelectedAgent: Found agent named "default".');
        return defaultAgent;
    }
    // If interactive mode is disabled or no agents exist, return null without prompting
    if (!isInteractive || agents.length === 0) {
        if (agents.length === 0) {
            logger_1.logger.debug('getDefaultOrSelectedAgent: No agents available.');
        }
        else {
            logger_1.logger.debug('getDefaultOrSelectedAgent: No single/default agent found, and interactive mode is off.');
        }
        // Optionally show message only if interactive and no agents
        if (isInteractive && agents.length === 0) {
            const createNew = await vscode.window.showInformationMessage('No agents available. Would you like to create one?', 'Create Agent', 'Cancel');
            if (createNew === 'Create Agent') {
                vscode.commands.executeCommand('codessa.addAgent');
            }
        }
        return null;
    }
    // Interactive: Prompt user to select an agent if multiple exist and no 'default'
    logger_1.logger.debug('getDefaultOrSelectedAgent: Prompting user to select an agent.');
    const selected = await vscode.window.showQuickPick(agents.map(agent => ({
        label: agent.name,
        description: agent.description || '',
        id: agent.id
    })), { placeHolder: 'Select an agent' });
    if (selected) {
        logger_1.logger.debug(`getDefaultOrSelectedAgent: User selected agent ${selected.id}`);
        return agentManager_1.agentManager.getAgent(selected.id);
    }
    logger_1.logger.debug('getDefaultOrSelectedAgent: User did not select an agent.');
    return null;
}
/**
 * Register UI components
 */
function registerUI(context) {
    try {
        console.log('Registering UI components...');
        logger_1.logger.info('Registering UI components...');
        // Register the agent tree view using the provided registration function (handles events/context)
        const agentTreeView = (0, agentTree_1.registerAgentTreeView)(context);
        logger_1.logger.info('Agent tree view registered');
        // Register the tools tree view using the provided registration function (handles events/context)
        const toolsTreeView = (0, toolsView_1.registerToolsTreeView)(context);
        logger_1.logger.info('Tools tree view registered');
        // Focus the chat view in the sidebar
        vscode.commands.executeCommand('codessa.chatViewSidebar.focus');
        // Initialize status bar
        statusBar_1.statusBarManager.initialize();
        context.subscriptions.push(statusBar_1.statusBarManager);
        logger_1.logger.info('Status bar initialized');
    }
    catch (error) {
        console.error('Error registering UI components:', error);
        logger_1.logger.error('Error registering UI components:', error);
        vscode.window.showErrorMessage('Codessa failed to register UI components. Check logs for details.');
    }
}
function registerCommands(context) {
    // Register commands here
    console.log('Registering commands...');
    logger_1.logger.info('Registering commands...');
    // Register a simple test command
    const testCommand = vscode.commands.registerCommand('codessa.test', () => {
        vscode.window.showInformationMessage('Codessa test command executed!');
    });
    context.subscriptions.push(testCommand);
    const commands = [
        // Basic commands
        vscode.commands.registerCommand('codessa.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'codessa');
        }),
        vscode.commands.registerCommand('codessa.showLogs', () => {
            logger_1.logger.show();
        }),
        // Agent management commands
        vscode.commands.registerCommand('codessa.addAgent', async () => {
            agentConfigPanel_1.AgentConfigPanel.createOrShow(context.extensionUri, undefined, context);
        }),
        vscode.commands.registerCommand('codessa.editAgent', async (agentId) => {
            agentConfigPanel_1.AgentConfigPanel.createOrShow(context.extensionUri, agentId, context);
        }),
        vscode.commands.registerCommand('codessa.deleteAgent', async () => {
            const agents = agentManager_1.agentManager.getAllAgents();
            if (agents.length === 0) {
                vscode.window.showInformationMessage('No agents found to delete.');
                return;
            }
            const selected = await vscode.window.showQuickPick(agents.map(agent => ({ label: agent.name, id: agent.id })), { placeHolder: 'Select an agent to delete' });
            if (selected) {
                try {
                    const success = await agentManager_1.agentManager.deleteAgent(selected.id);
                    if (success) {
                        vscode.window.showInformationMessage(`Agent "${selected.label}" deleted successfully!`);
                    }
                    else {
                        vscode.window.showErrorMessage(`Failed to delete agent "${selected.label}".`);
                    }
                }
                catch (error) {
                    logger_1.logger.error('Error deleting agent:', error);
                    vscode.window.showErrorMessage('Failed to delete agent. Check logs for details.');
                }
            }
        }),
        // Panel commands
        vscode.commands.registerCommand('codessa.openAgentDetailsPanel', (agentId) => {
            const agent = agentManager_1.agentManager.getAgent(agentId);
            if (agent) {
                agentConfigPanel_1.AgentConfigPanel.createOrShow(context.extensionUri, agentId, context);
            }
            else {
                vscode.window.showErrorMessage(`Agent with ID ${agentId} not found.`);
            }
        }),
        vscode.commands.registerCommand('codessa.openDashboard', () => {
            dashboard_1.DashboardPanel.createOrShow(context.extensionUri, context);
        }),
        vscode.commands.registerCommand('codessa.openWorkflowManager', () => {
            workflowPanel_1.WorkflowPanel.createOrShow(context.extensionUri);
        }),
        vscode.commands.registerCommand('codessa.getWorkflows', async () => {
            try {
                // Get workflows from the original registry
                const workflows = workflowEngine_1.workflowRegistry.getAllWorkflows();
                // Convert to a format suitable for the UI
                return workflows.map(workflow => ({
                    id: workflow.id,
                    name: workflow.name,
                    description: workflow.description,
                    version: workflow.version,
                    steps: workflow.steps,
                    engine: 'original'
                }));
            }
            catch (error) {
                logger_1.logger.error('Error getting workflows:', error);
                return [];
            }
        }),
        vscode.commands.registerCommand('codessa.openChatView', () => {
            vscode.commands.executeCommand('workbench.view.extension.codessa-sidebar');
        }),
        vscode.commands.registerCommand('codessa.openSettingsView', () => {
            vscode.commands.executeCommand('codessa.openSettings');
        }),
        vscode.commands.registerCommand('codessa.openProviderSettings', async () => {
            // Get all available providers
            const providers = llmService_1.llmService.getAllProviders();
            if (providers.length === 0) {
                vscode.window.showInformationMessage('No LLM providers available.');
                return;
            }
            // Let user select a provider
            const selected = await vscode.window.showQuickPick(providers.map(provider => ({
                label: provider.displayName || provider.providerId,
                description: provider.description || '',
                detail: provider.isConfigured() ? 'Configured' : 'Not configured',
                id: provider.providerId
            })), { placeHolder: 'Select a provider to configure' });
            if (selected) {
                providerSettingsPanel_1.ProviderSettingsPanel.createOrShow(context.extensionUri, selected.id, context);
            }
        }),
        // Agent interaction commands
        vscode.commands.registerCommand('codessa.chatWithAgent', async () => {
            vscode.window.showInformationMessage('Chat with Agent command not fully implemented yet.');
        }),
        // Task commands
        vscode.commands.registerCommand('codessa.runTask', async () => {
            try {
                // Get all available workflows
                const workflows = workflowEngine_1.workflowRegistry.getAllWorkflows();
                if (workflows.length === 0) {
                    vscode.window.showInformationMessage('No workflows available.');
                    return;
                }
                // Let user select a workflow
                const selected = await vscode.window.showQuickPick(workflows.map(workflow => ({
                    label: workflow.name,
                    description: workflow.description,
                    detail: `Version: ${workflow.version}`,
                    id: workflow.id
                })), { placeHolder: 'Select a workflow to run' });
                if (!selected) {
                    return; // User cancelled
                }
                // Get the workflow
                const workflowInstance = workflowEngine_1.workflowRegistry.createWorkflowInstance(selected.id);
                // Get default agent or prompt user to select one
                const agent = await getDefaultOrSelectedAgent();
                if (!agent) {
                    vscode.window.showInformationMessage('No agent selected. Please create or select an agent first.');
                    return;
                }
                // Set the agent for the workflow
                workflowInstance.setAgent(agent);
                // Collect inputs for the workflow
                const workflowDef = workflowInstance.getDefinition();
                const inputs = {};
                for (const inputDef of workflowDef.inputs) {
                    if (inputDef.required && !('default' in inputDef)) {
                        // Prompt for required inputs
                        const inputValue = await vscode.window.showInputBox({
                            prompt: `Enter ${inputDef.name}`,
                            placeHolder: inputDef.description,
                            ignoreFocusOut: true
                        });
                        if (inputValue === undefined) {
                            vscode.window.showInformationMessage('Workflow cancelled.');
                            return; // User cancelled
                        }
                        inputs[inputDef.id] = inputValue;
                    }
                }
                // Set inputs
                workflowInstance.setInputs(inputs);
                // Show progress
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Running workflow: ${workflowDef.name}`,
                    cancellable: true
                }, async (progress, token) => {
                    // Set up progress callback
                    workflowInstance.onProgress((stepId, progressPercent) => {
                        const step = workflowDef.steps.find(s => s.id === stepId);
                        progress.report({
                            message: `Step: ${step?.name || stepId}`,
                            increment: progressPercent / workflowDef.steps.length
                        });
                    });
                    // Set up cancellation
                    token.onCancellationRequested(() => {
                        workflowInstance.cancel();
                    });
                    // Execute the workflow
                    try {
                        const result = await workflowInstance.execute();
                        // Show result
                        vscode.window.showInformationMessage(`Workflow '${workflowDef.name}' completed successfully.`);
                        // Log the result
                        logger_1.logger.info(`Workflow result:`, result);
                        return result;
                    }
                    catch (error) {
                        logger_1.logger.error(`Error executing workflow:`, error);
                        vscode.window.showErrorMessage(`Error executing workflow: ${error instanceof Error ? error.message : String(error)}`);
                        throw error;
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error running workflow:', error);
                vscode.window.showErrorMessage(`Error running workflow: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
        vscode.commands.registerCommand('codessa.startChat', async () => {
            vscode.commands.executeCommand('codessa.chatWithAgent');
        }),
        vscode.commands.registerCommand('codessa.editCode', async () => {
            vscode.window.showInformationMessage('Edit Code command not fully implemented yet.');
        }),
        vscode.commands.registerCommand('codessa.generateCode', async () => {
            vscode.window.showInformationMessage('Generate Code command not fully implemented yet.');
        }),
        vscode.commands.registerCommand('codessa.runSupervisorTask', async () => {
            vscode.window.showInformationMessage('Run Supervisor Task command not fully implemented yet.');
        }),
        vscode.commands.registerCommand('codessa.inlineAction', async () => {
            vscode.window.showInformationMessage('Inline Action command not fully implemented yet.');
        }),
        // Context menu commands
        vscode.commands.registerCommand('codessa.refreshAgentView', () => {
            vscode.commands.executeCommand('codessa.refreshAgentTree');
        }),
        vscode.commands.registerCommand('codessa.startChatWithAgentContext', (agentId) => {
            vscode.commands.executeCommand('codessa.chatWithAgent', agentId);
        }),
        vscode.commands.registerCommand('codessa.runEditTaskWithAgentContext', (agentId) => {
            vscode.window.showInformationMessage(`Edit task with agent ${agentId} not fully implemented yet.`);
        }),
        vscode.commands.registerCommand('codessa.runGenerateTaskWithAgentContext', (agentId) => {
            vscode.window.showInformationMessage(`Generate task with agent ${agentId} not fully implemented yet.`);
        }),
        vscode.commands.registerCommand('codessa.runGeneralTaskWithAgentContext', (agentId) => {
            vscode.window.showInformationMessage(`General task with agent ${agentId} not fully implemented yet.`);
        }),
        // Memory commands
        vscode.commands.registerCommand('codessa.openMemoryView', () => {
            const memoryView = new memoryView_1.MemoryView(context);
            memoryView.show();
        }),
        vscode.commands.registerCommand('codessa.addMemory', async () => {
            const content = await vscode.window.showInputBox({
                prompt: 'Enter memory content',
                placeHolder: 'Memory content...',
                ignoreFocusOut: true
            });
            if (!content)
                return;
            try {
                await memoryManager_1.memoryManager.addMemory(content);
                vscode.window.showInformationMessage('Memory added successfully!');
            }
            catch (error) {
                logger_1.logger.error('Error adding memory:', error);
                vscode.window.showErrorMessage(`Error adding memory: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
        vscode.commands.registerCommand('codessa.clearMemories', async () => {
            const confirm = await vscode.window.showWarningMessage('Are you sure you want to clear all memories? This cannot be undone.', { modal: true }, 'Yes', 'No');
            if (confirm !== 'Yes')
                return;
            try {
                await memoryManager_1.memoryManager.clearMemories();
                vscode.window.showInformationMessage('All memories cleared successfully!');
            }
            catch (error) {
                logger_1.logger.error('Error clearing memories:', error);
                vscode.window.showErrorMessage(`Error clearing memories: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
        vscode.commands.registerCommand('codessa.chunkFile', async () => {
            const fileUris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Chunk File',
                filters: {
                    'All Files': ['*']
                }
            });
            if (!fileUris || fileUris.length === 0)
                return;
            try {
                const filePath = fileUris[0].fsPath;
                const memories = await memoryManager_1.memoryManager.chunkFile(filePath);
                vscode.window.showInformationMessage(`File chunked successfully! Created ${memories.length} memory entries.`);
            }
            catch (error) {
                logger_1.logger.error('Error chunking file:', error);
                vscode.window.showErrorMessage(`Error chunking file: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
        vscode.commands.registerCommand('codessa.chunkWorkspace', async () => {
            const confirm = await vscode.window.showWarningMessage('This will chunk all files in the workspace and add them to memory. This may take a while. Continue?', { modal: true }, 'Yes', 'No');
            if (confirm !== 'Yes')
                return;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Chunking workspace files',
                    cancellable: true
                }, async (progress, token) => {
                    // Use progress to report status
                    progress.report({ message: 'Scanning workspace files...' });
                    // Set up cancellation
                    token.onCancellationRequested(() => {
                        logger_1.logger.info('Workspace chunking cancelled by user');
                    });
                    const folderPath = workspaceFolders[0].uri.fsPath;
                    const memories = await memoryManager_1.memoryManager.chunkWorkspace(folderPath);
                    vscode.window.showInformationMessage(`Workspace chunked successfully! Created ${memories.length} memory entries.`);
                });
            }
            catch (error) {
                logger_1.logger.error('Error chunking workspace:', error);
                vscode.window.showErrorMessage(`Error chunking workspace: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
        vscode.commands.registerCommand('codessa.runSupervisorTaskContext', (agentId) => {
            vscode.window.showInformationMessage(`Supervisor task with agent ${agentId} not fully implemented yet.`);
        }),
        vscode.commands.registerCommand('codessa.deleteAgentContext', (agentId) => {
            // Delete the agent directly without prompting
            agentManager_1.agentManager.deleteAgent(agentId).then(success => {
                if (success) {
                    vscode.window.showInformationMessage(`Agent deleted successfully!`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to delete agent.`);
                }
            }).catch(error => {
                logger_1.logger.error('Error deleting agent:', error);
                vscode.window.showErrorMessage('Failed to delete agent. Check logs for details.');
            });
        }),
        // Mode commands
        vscode.commands.registerCommand('codessa.openModeSelector', () => {
            (0, openModeSelector_1.openModeSelector)(context);
        }),
        vscode.commands.registerCommand('codessa.changeMode', async (modeId) => {
            try {
                // Get the mode from the registry
                const mode = operationMode_1.operationModeRegistry.getMode(modeId);
                if (!mode) {
                    throw new Error(`Mode '${modeId}' not found in registry`);
                }
                // Update the UI to reflect the mode change
                // We can't directly access the webview, so we'll broadcast an event
                // that the chat view can listen for
                vscode.commands.executeCommand('setContext', 'codessa.currentMode', modeId);
                // Try to notify any active webviews about the mode change
                try {
                    // This is a custom command that will be handled by the extension
                    vscode.commands.executeCommand('codessa.updateMode', modeId);
                }
                catch (err) {
                    // Ignore errors here, as the command might not be registered yet
                    logger_1.logger.debug('Error executing updateMode command:', err);
                }
                logger_1.logger.info(`Mode changed to: ${mode.displayName}`);
            }
            catch (error) {
                logger_1.logger.error('Error changing mode:', error);
                vscode.window.showErrorMessage(`Failed to change mode: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
        vscode.commands.registerCommand('codessa.askMode', async () => {
            vscode.window.showInformationMessage('Ask mode not fully implemented yet.');
        }),
        vscode.commands.registerCommand('codessa.chatMode', async () => {
            try {
                // Get the chat mode from the registry
                const chatMode = operationMode_1.operationModeRegistry.getMode('chat');
                if (!chatMode) {
                    throw new Error('Chat mode not found in registry');
                }
                // Get default agent or prompt user to select one
                const agent = await getDefaultOrSelectedAgent();
                if (!agent) {
                    vscode.window.showInformationMessage('No agent selected. Please create or select an agent first.');
                    return;
                }
                // Open the chat view in the sidebar
                await vscode.commands.executeCommand('workbench.view.extension.codessa-sidebar');
                await vscode.commands.executeCommand('codessa.chatViewSidebar.focus');
                // Set the mode to chat
                vscode.commands.executeCommand('codessa.changeMode', 'chat');
                logger_1.logger.info(`Chat mode activated with agent: ${agent.name}`);
                vscode.window.showInformationMessage(`Chat mode activated with agent: ${agent.name}`);
            }
            catch (error) {
                logger_1.logger.error('Error activating chat mode:', error);
                vscode.window.showErrorMessage(`Failed to activate chat mode: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
        vscode.commands.registerCommand('codessa.debugMode', async () => {
            vscode.window.showInformationMessage('Debug mode not fully implemented yet.');
        }),
        vscode.commands.registerCommand('codessa.editMode', async () => {
            vscode.window.showInformationMessage('Edit Mode not fully implemented yet.');
        }),
        vscode.commands.registerCommand('codessa.agentMode', async () => {
            vscode.window.showInformationMessage('Agent Mode not fully implemented yet.');
        }),
        vscode.commands.registerCommand('codessa.multiAgentMode', async () => {
            vscode.window.showInformationMessage('Multi-Agent Mode not fully implemented yet.');
        }),
        // Quick actions
        vscode.commands.registerCommand('codessa.updateMode', (modeId) => {
            // This command is used to notify the chat view about mode changes
            // It doesn't do anything directly, but is used as a broadcast mechanism
            logger_1.logger.debug(`Broadcasting mode update: ${modeId}`);
        }),
        vscode.commands.registerCommand('codessa.showQuickActions', async () => {
            const actions = [
                { label: '$(question) Ask Mode', description: 'Ask questions about your codebase', command: 'codessa.askMode' },
                { label: '$(comment-discussion) Chat Mode', description: 'Chat with an AI assistant', command: 'codessa.chatMode' },
                { label: '$(bug) Debug Mode', description: 'Debug issues with your code', command: 'codessa.debugMode' },
                { label: '$(edit) Edit Mode', description: 'AI-assisted code editing', command: 'codessa.editMode' },
                { label: '$(robot) Agent Mode', description: 'Autonomous AI agent', command: 'codessa.agentMode' },
                { label: '$(organization) Multi-Agent Mode', description: 'Team of AI agents', command: 'codessa.multiAgentMode' },
                { label: '$(settings-gear) Select Mode', description: 'Choose an operation mode', command: 'codessa.openModeSelector' },
                { label: '$(add) Create New Agent', description: 'Create a new AI agent', command: 'codessa.addAgent' },
                { label: '$(dashboard) Open Dashboard', description: 'View system status and agents', command: 'codessa.openDashboard' },
                { label: '$(server) Configure Providers', description: 'Configure LLM providers', command: 'codessa.openProviderSettings' },
                { label: '$(workflow) Workflow Manager', description: 'Manage and run workflows', command: 'codessa.openWorkflowManager' },
                { label: '$(gear) Open Settings', description: 'Configure Codessa extension', command: 'codessa.openSettings' },
                { label: '$(output) Show Logs', description: 'View extension logs', command: 'codessa.showLogs' },
                { label: '$(database) Memory Management', description: 'Manage agent memories', command: 'codessa.manageMemory' }
            ];
            const selected = await vscode.window.showQuickPick(actions, {
                placeHolder: 'Select a Codessa action'
            });
            if (selected) {
                vscode.commands.executeCommand(selected.command);
            }
        }),
        // Memory management commands
        vscode.commands.registerCommand('codessa.manageMemory', async () => {
            const actions = [
                { label: '$(info) View Memories', description: 'View all stored memories', command: 'codessa.viewMemories' },
                { label: '$(trash) Clear All Memories', description: 'Delete all stored memories', command: 'codessa.clearMemories' },
                { label: '$(settings) Memory Settings', description: 'Configure memory system', command: 'codessa.memorySettings' }
            ];
            const selected = await vscode.window.showQuickPick(actions, {
                placeHolder: 'Select a memory management action'
            });
            if (selected) {
                vscode.commands.executeCommand(selected.command);
            }
        }),
        vscode.commands.registerCommand('codessa.viewMemories', async () => {
            const memories = await memoryManager_1.memoryManager.getMemories();
            if (memories.length === 0) {
                vscode.window.showInformationMessage('No memories stored.');
                return;
            }
            const items = memories.map(memory => ({
                label: memory.metadata.type === 'user' ? '$(person) User' : '$(hubot) Assistant',
                description: memory.content.substring(0, 50) + (memory.content.length > 50 ? '...' : ''),
                detail: new Date(memory.timestamp).toLocaleString(),
                memory
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a memory to view',
                matchOnDescription: true,
                matchOnDetail: true
            });
            if (selected) {
                // Show memory details
                const panel = vscode.window.createWebviewPanel('memoryDetails', 'Memory Details', vscode.ViewColumn.One, {});
                panel.webview.html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Memory Details</title>
                    <style>
                        body { font-family: var(--vscode-font-family); padding: 20px; }
                        .memory-header { margin-bottom: 20px; }
                        .memory-content { background-color: var(--vscode-editor-background); padding: 10px; border-radius: 5px; white-space: pre-wrap; }
                        .memory-metadata { margin-top: 20px; }
                        .metadata-item { margin-bottom: 5px; }
                    </style>
                </head>
                <body>
                    <div class="memory-header">
                        <h2>Memory Details</h2>
                        <p>Created: ${new Date(selected.memory.timestamp).toLocaleString()}</p>
                    </div>
                    <div class="memory-content">${selected.memory.content}</div>
                    <div class="memory-metadata">
                        <h3>Metadata</h3>
                        <div class="metadata-item"><strong>Type:</strong> ${selected.memory.metadata.type}</div>
                        <div class="metadata-item"><strong>Source:</strong> ${selected.memory.metadata.source}</div>
                        ${selected.memory.metadata.agentId ? `<div class="metadata-item"><strong>Agent ID:</strong> ${selected.memory.metadata.agentId}</div>` : ''}
                        ${selected.memory.metadata.agentName ? `<div class="metadata-item"><strong>Agent Name:</strong> ${selected.memory.metadata.agentName}</div>` : ''}
                    </div>
                </body>
                </html>
                `;
            }
        }),
        vscode.commands.registerCommand('codessa.clearMemories', async () => {
            const confirm = await vscode.window.showWarningMessage('Are you sure you want to clear all memories? This action cannot be undone.', { modal: true }, 'Yes', 'No');
            if (confirm === 'Yes') {
                await memoryManager_1.memoryManager.clearMemories();
                vscode.window.showInformationMessage('All memories cleared successfully.');
            }
        }),
        vscode.commands.registerCommand('codessa.memorySettings', async () => {
            vscode.commands.executeCommand('workbench.action.openSettings', '@ext:codessa.memory');
        }),
        // LangGraph workflow commands
        vscode.commands.registerCommand('codessa.createLangGraphWorkflow', async () => {
            try {
                // Get default agent or prompt user to select one
                const agent = await getDefaultOrSelectedAgent();
                if (!agent) {
                    vscode.window.showInformationMessage('No agent selected. Please create or select an agent first.');
                    return;
                }
                // Prompt for workflow type
                const workflowType = await vscode.window.showQuickPick([
                    // Basic workflows
                    { label: 'Chat Workflow', description: 'Simple chat workflow with a single agent' },
                    { label: 'ReAct Workflow', description: 'Agent with tools using the ReAct pattern' },
                    { label: 'Memory-Enhanced Workflow', description: 'Agent with long-term memory capabilities' },
                    { label: 'Multi-Agent Workflow', description: 'Multiple agents coordinated by a supervisor' },
                    // Advanced workflows
                    { label: 'RAG Workflow', description: 'Retrieval Augmented Generation for enhanced responses' },
                    { label: 'Collaborative Workflow', description: 'Multiple specialized agents working together on complex tasks' },
                    { label: 'Memory-Enhanced Agent Workflow', description: 'Advanced agent with sophisticated memory capabilities' },
                    { label: 'Code Generation Workflow', description: 'Specialized workflow for generating and reviewing code' },
                    { label: 'Research Workflow', description: 'Autonomous research agent for gathering and synthesizing information' },
                    // Specialized workflows
                    { label: 'Document Q&A Workflow', description: 'Specialized workflow for answering questions about documents' },
                    { label: 'Code Refactoring Workflow', description: 'Specialized workflow for refactoring code' },
                    { label: 'Debugging Workflow', description: 'Specialized workflow for debugging code' }
                ], { placeHolder: 'Select workflow type' });
                if (!workflowType)
                    return;
                // Prompt for workflow name
                const workflowName = await vscode.window.showInputBox({
                    prompt: 'Enter workflow name',
                    placeHolder: 'My Workflow',
                    value: `${agent.name} ${workflowType.label}`
                });
                if (!workflowName)
                    return;
                // Prompt for workflow description
                const workflowDescription = await vscode.window.showInputBox({
                    prompt: 'Enter workflow description',
                    placeHolder: 'Description of the workflow...',
                    value: `${workflowType.description} using ${agent.name}`
                });
                if (!workflowDescription)
                    return;
                // Generate a unique ID
                const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                // Create the workflow based on type
                let workflow;
                switch (workflowType.label) {
                    case 'Chat Workflow':
                        workflow = (0, templates_1.createChatWorkflow)(workflowId, workflowName, workflowDescription, agent);
                        break;
                    case 'ReAct Workflow':
                        // Get available tools
                        const tools = toolRegistry_1.toolRegistry.getAllTools();
                        if (tools.length === 0) {
                            vscode.window.showInformationMessage('No tools available. Please create tools first.');
                            return;
                        }
                        // Let user select tools
                        const selectedTools = await vscode.window.showQuickPick(tools.map(tool => ({
                            label: tool.name,
                            description: tool.description,
                            tool
                        })), { placeHolder: 'Select tools to include', canPickMany: true });
                        if (!selectedTools || selectedTools.length === 0)
                            return;
                        // Convert ITool[] to Tool[] with type assertion
                        const toolsForWorkflow = selectedTools.map(item => item.tool);
                        workflow = (0, templates_1.createReActWorkflow)(workflowId, workflowName, workflowDescription, agent, toolsForWorkflow);
                        break;
                    case 'Memory-Enhanced Workflow': {
                        // Try to get the default LLM provider
                        const provider = llmService_1.llmService.getDefaultProvider();
                        if (!provider || typeof provider.generateEmbedding !== 'function') {
                            vscode.window.showErrorMessage('No default LLM provider with embeddings support found. Please configure a provider that supports embeddings.');
                            return;
                        }
                        // Create a simple Embeddings object compatible with MemoryVectorStore
                        const embeddings = {
                            embedQuery: async (text) => provider.generateEmbedding(text),
                            embedDocuments: async (docs) => Promise.all(docs.map(doc => provider.generateEmbedding(doc))),
                            // Add a dummy 'caller' property as required by the Embeddings interface
                            caller: undefined
                        };
                        // Import MemoryVectorStore directly to ensure correct type
                        const { MemoryVectorStore } = await Promise.resolve().then(() => __importStar(require('./memory/langchain/vectorStores/memoryVectorStore')));
                        const vectorStore = new MemoryVectorStore(embeddings);
                        workflow = (0, templates_1.createMemoryEnhancedWorkflow)(workflowId, workflowName, workflowDescription, agent, vectorStore);
                        break;
                    }
                    case 'Multi-Agent Workflow':
                        // Get available agents
                        const agents = agentManager_1.agentManager.getAllAgents();
                        if (agents.length <= 1) {
                            vscode.window.showInformationMessage('Not enough agents available. Please create at least two agents.');
                            return;
                        }
                        // Let user select agents
                        const selectedAgents = await vscode.window.showQuickPick(agents.filter(a => a.id !== agent.id).map(a => ({
                            label: a.name,
                            description: a.description || '',
                            agent: a
                        })), { placeHolder: 'Select agents to include', canPickMany: true });
                        if (!selectedAgents || selectedAgents.length === 0)
                            return;
                        workflow = (0, templates_1.createMultiAgentWorkflow)(workflowId, workflowName, workflowDescription, selectedAgents.map(item => item.agent), agent // Use the selected agent as supervisor
                        );
                        break;
                    case 'RAG Workflow':
                        // Get available retrieval tools
                        const retrievalTools = toolRegistry_1.toolRegistry.getAllTools().filter(tool => tool.name.toLowerCase().includes('search') ||
                            tool.name.toLowerCase().includes('retrieval') ||
                            tool.name.toLowerCase().includes('fetch') ||
                            tool.description.toLowerCase().includes('search') ||
                            tool.description.toLowerCase().includes('retrieval'));
                        if (retrievalTools.length === 0) {
                            vscode.window.showInformationMessage('No retrieval tools available. Please create a search or retrieval tool first.');
                            return;
                        }
                        // Let user select a retrieval tool
                        const selectedRetrievalTool = await vscode.window.showQuickPick(retrievalTools.map(tool => ({
                            label: tool.name,
                            description: tool.description,
                            tool
                        })), { placeHolder: 'Select a retrieval tool' });
                        if (!selectedRetrievalTool)
                            return;
                        workflow = (0, advancedTemplates_1.createRAGWorkflow)(workflowId, workflowName, workflowDescription, agent, selectedRetrievalTool.tool);
                        break;
                    case 'Collaborative Workflow':
                        // Get available agents for specialists
                        const specialistCandidates = agentManager_1.agentManager.getAllAgents();
                        if (specialistCandidates.length <= 1) {
                            vscode.window.showInformationMessage('Not enough agents available. Please create at least two agents.');
                            return;
                        }
                        // Let user select specialist agents
                        const selectedSpecialists = await vscode.window.showQuickPick(specialistCandidates.filter(a => a.id !== agent.id).map(a => ({
                            label: a.name,
                            description: a.description || '',
                            agent: a
                        })), { placeHolder: 'Select specialist agents', canPickMany: true });
                        if (!selectedSpecialists || selectedSpecialists.length === 0)
                            return;
                        // For each selected specialist, prompt for expertise
                        const specialists = [];
                        for (const specialist of selectedSpecialists) {
                            const expertise = await vscode.window.showInputBox({
                                prompt: `Enter expertise for ${specialist.label}`,
                                placeHolder: 'e.g., Code Generation, Data Analysis, UI Design',
                                value: specialist.description || ''
                            });
                            if (!expertise)
                                return; // User cancelled
                            specialists.push({
                                id: specialist.agent.id,
                                name: specialist.label,
                                agent: specialist.agent,
                                expertise
                            });
                        }
                        workflow = (0, advancedTemplates_1.createCollaborativeWorkflow)(workflowId, workflowName, workflowDescription, specialists, agent // Use the selected agent as supervisor
                        );
                        break;
                    case 'Memory-Enhanced Agent Workflow':
                        workflow = (0, advancedTemplates_1.createMemoryEnhancedAgentWorkflow)(workflowId, workflowName, workflowDescription, agent);
                        break;
                    case 'Code Generation Workflow':
                        // Get available agents for code review
                        const reviewerCandidates = agentManager_1.agentManager.getAllAgents();
                        // Let user select a code review agent
                        const selectedReviewer = await vscode.window.showQuickPick(reviewerCandidates.map(a => ({
                            label: a.name,
                            description: a.description || '',
                            agent: a
                        })), { placeHolder: 'Select a code review agent' });
                        if (!selectedReviewer)
                            return;
                        workflow = (0, advancedTemplates_1.createCodeGenerationWorkflow)(workflowId, workflowName, workflowDescription, agent, // Use the selected agent as code generator
                        selectedReviewer.agent // Use the selected agent as code reviewer
                        );
                        break;
                    case 'Research Workflow':
                        // Get available search tools
                        const searchTools = toolRegistry_1.toolRegistry.getAllTools().filter(tool => tool.name.toLowerCase().includes('search') ||
                            tool.description.toLowerCase().includes('search'));
                        if (searchTools.length === 0) {
                            vscode.window.showInformationMessage('No search tools available. Please create a search tool first.');
                            return;
                        }
                        // Let user select a search tool
                        const selectedSearchTool = await vscode.window.showQuickPick(searchTools.map(tool => ({
                            label: tool.name,
                            description: tool.description,
                            tool
                        })), { placeHolder: 'Select a search tool' });
                        if (!selectedSearchTool)
                            return;
                        workflow = (0, advancedTemplates_1.createResearchWorkflow)(workflowId, workflowName, workflowDescription, agent, selectedSearchTool.tool);
                        break;
                    case 'Document Q&A Workflow':
                        workflow = (0, specializedTemplates_1.createDocumentQAWorkflow)(workflowId, workflowName, workflowDescription, agent);
                        break;
                    case 'Code Refactoring Workflow':
                        workflow = (0, specializedTemplates_1.createCodeRefactoringWorkflow)(workflowId, workflowName, workflowDescription, agent);
                        break;
                    case 'Debugging Workflow':
                        workflow = (0, specializedTemplates_1.createDebuggingWorkflow)(workflowId, workflowName, workflowDescription, agent);
                        break;
                }
                if (workflow) {
                    vscode.window.showInformationMessage(`Workflow '${workflowName}' created successfully!`);
                    vscode.commands.executeCommand('codessa.openWorkflowManager');
                }
            }
            catch (error) {
                logger_1.logger.error('Error creating LangGraph workflow:', error);
                vscode.window.showErrorMessage(`Error creating workflow: ${error instanceof Error ? error.message : String(error)}`);
            }
        }),
        vscode.commands.registerCommand('codessa.runLangGraphWorkflow', async (workflowId) => {
            try {
                // Get the workflow
                const workflow = langgraph_1.langGraphRegistry.getWorkflow(workflowId);
                if (!workflow) {
                    vscode.window.showErrorMessage(`Workflow with ID '${workflowId}' not found.`);
                    return;
                }
                // Create workflow instance
                const workflowInstance = langgraph_1.langGraphRegistry.createWorkflowInstance(workflowId);
                // Prompt for input
                const input = await vscode.window.showInputBox({
                    prompt: `Enter input for workflow '${workflow.name}'`,
                    placeHolder: 'Input text...',
                });
                if (input === undefined)
                    return; // User cancelled
                // Show progress
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Running workflow: ${workflow.name}`,
                    cancellable: true
                }, async (progress) => {
                    // Prepare input
                    const inputData = {
                        messages: [{ role: 'user', content: input }]
                    };
                    // Execute workflow
                    const result = await workflowInstance.execute(inputData, {
                        onProgress: (state) => {
                            progress.report({
                                message: `Step: ${state.currentNode}`,
                                increment: 10
                            });
                        }
                    });
                    if (result.success) {
                        // Show result
                        // Get the last message content as string
                        const lastMessage = result.state.messages[result.state.messages.length - 1];
                        const output = typeof lastMessage?.content === 'string'
                            ? lastMessage.content
                            : 'No output';
                        // Show truncated output
                        vscode.window.showInformationMessage(`Workflow completed: ${output.substring(0, 100)}${output.length > 100 ? '...' : ''}`);
                    }
                    else {
                        vscode.window.showErrorMessage(`Workflow failed: ${result.error?.message || 'Unknown error'}`);
                    }
                });
            }
            catch (error) {
                logger_1.logger.error('Error running LangGraph workflow:', error);
                vscode.window.showErrorMessage(`Error running workflow: ${error instanceof Error ? error.message : String(error)}`);
            }
        })
    ];
    // Add to subscriptions
    commands.forEach(command => context.subscriptions.push(command));
    console.log(`Registered ${commands.length} commands`);
    logger_1.logger.info(`Registered ${commands.length} commands`);
}
function deactivate() {
    logger_1.logger.info('Deactivating Codessa extension...');
    // Clean up resources here
}
//# sourceMappingURL=extension.js.map