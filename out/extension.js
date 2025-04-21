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
        // Register operation modes
        logger_1.logger.info('Registering operation modes...');
        await (0, registerModes_1.registerModes)(context);
        logger_1.logger.info(`Operation modes available: ${operationMode_1.operationModeRegistry.getAllModes().length}`);
        // Log service initialization status
        logger_1.logger.info(`LLM providers available: ${llmService_1.llmService.listProviderIds().join(', ')}`);
        logger_1.logger.info(`Tools available: ${toolRegistry_1.toolRegistry.getAllTools().length}`);
        logger_1.logger.info(`System prompts available: ${promptManager_1.promptManager.listPromptNames().length}`);
        logger_1.logger.info(`Agents available: ${agentManager_1.agentManager.getAllAgents().length}`);
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
/**
 * Register UI components
 */
function registerUI(context) {
    try {
        console.log('Registering UI components...');
        logger_1.logger.info('Registering UI components...');
        // Register the agent tree view
        console.log('Registering agent tree view...');
        const agentTreeView = (0, agentTree_1.registerAgentTreeView)(context);
        logger_1.logger.info('Agent tree view registered');
        // Register the tools tree view
        console.log('Registering tools tree view...');
        const toolsTreeView = (0, toolsView_1.registerToolsTreeView)(context);
        logger_1.logger.info('Tools tree view registered');
        // Initialize status bar
        console.log('Initializing status bar...');
        statusBar_1.statusBarManager.initialize();
        context.subscriptions.push(statusBar_1.statusBarManager);
        logger_1.logger.info('Status bar initialized');
        console.log('UI components registered');
        logger_1.logger.info('UI components registered');
    }
    catch (error) {
        console.error('Error registering UI components:', error);
        logger_1.logger.error('Error registering UI components:', error);
    }
}
/**
 * Get the default agent. Can run interactively (prompting user) or non-interactively.
 * @param interactive If true, prompts user if no clear default is found. Defaults to true.
 */
async function getDefaultOrSelectedAgent(interactive = true) {
    const agents = agentManager_1.agentManager.getAllAgents();
    // Non-interactive checks first
    if (agents.length === 1) {
        logger_1.logger.debug('getDefaultOrSelectedAgent: Found single agent, using as default.');
        return agents[0]; // Use the only agent available
    }
    const defaultAgent = agents.find(agent => agent.name.toLowerCase() === 'default');
    if (defaultAgent) {
        logger_1.logger.debug('getDefaultOrSelectedAgent: Found agent named "default".');
        return defaultAgent; // Use agent named 'default'
    }
    // If interactive mode is disabled or no agents exist, return null without prompting
    if (!interactive || agents.length === 0) {
        if (agents.length === 0) {
            logger_1.logger.debug('getDefaultOrSelectedAgent: No agents available.');
        }
        else {
            logger_1.logger.debug('getDefaultOrSelectedAgent: No single/default agent found, and interactive mode is off.');
        }
        // Optionally show message only if interactive and no agents
        if (interactive && agents.length === 0) {
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
            vscode.window.showInformationMessage('Run Task command not fully implemented yet.');
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
        vscode.commands.registerCommand('codessa.askMode', async () => {
            vscode.window.showInformationMessage('Ask mode not fully implemented yet.');
        }),
        vscode.commands.registerCommand('codessa.chatMode', async () => {
            vscode.window.showInformationMessage('Chat mode not fully implemented yet.');
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
                { label: '$(gear) Open Settings', description: 'Configure Codessa extension', command: 'codessa.openSettings' },
                { label: '$(output) Show Logs', description: 'View extension logs', command: 'codessa.showLogs' }
            ];
            const selected = await vscode.window.showQuickPick(actions, {
                placeHolder: 'Select a Codessa action'
            });
            if (selected) {
                vscode.commands.executeCommand(selected.command);
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