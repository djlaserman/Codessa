import * as vscode from 'vscode';
import { logger } from './logger';
import { llmService } from './llm/llmService';
import { toolRegistry } from './tools/toolRegistry';
import { promptManager } from './agents/promptManager';
import { agentManager } from './agents/agentManager';
import { registerAgentTreeView } from './ui/agentTree';
import { ChatPanel } from './ui/chatView';
import { AgentConfigPanel } from './ui/agentConfigPanel';
import { DashboardPanel } from './ui/dashboard';
import { statusBarManager } from './ui/statusBar';

/**
 * Codessa: AI Coding Assistant Extension
 * 
 * A VS Code extension that provides AI assistance for coding tasks
 * using various LLM providers (OpenAI, Ollama, etc.)
 */
export function activate(context: vscode.ExtensionContext) {
    logger.info('Activating Codessa extension...');

    // Initialize services
    try {
        // Service initialization happens automatically via their constructors
        logger.info(`LLM providers available: ${llmService.listProviderIds().join(', ')}`);
        logger.info(`Tools available: ${toolRegistry.getAllTools().length}`);
        logger.info(`System prompts available: ${promptManager.listPromptNames().length}`);
        logger.info(`Agents available: ${agentManager.getAllAgents().length}`);
        
        // Register UI components
        registerUI(context);
        
        // Register commands
        registerCommands(context);
        
        // Display startup message
        const configuredProviders = llmService.getConfiguredProviders();
        if (configuredProviders.length === 0) {
            vscode.window.showInformationMessage('Codessa activated. Please configure an LLM provider in settings.');
        } else {
            vscode.window.showInformationMessage(`Codessa activated with ${configuredProviders.length} LLM providers.`);
        }
    } catch (error) {
        logger.error('Error activating Codessa extension:', error);
        vscode.window.showErrorMessage('Failed to activate Codessa extension. Check logs for details.');
    }
}

/**
 * Register UI components
 */
function registerUI(context: vscode.ExtensionContext) {
    try {
        // Register the agent tree view
        const treeView = registerAgentTreeView(context);
        
        // Initialize status bar
        statusBarManager.initialize();
        context.subscriptions.push(statusBarManager);
        
        logger.info('UI components registered');
    } catch (error) {
        logger.error('Error registering UI components:', error);
    }
}

function registerCommands(context: vscode.ExtensionContext) {
    // Register commands here
    const commands = [
        vscode.commands.registerCommand('codessa.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'codessa');
        }),
        
        vscode.commands.registerCommand('codessa.showLogs', () => {
            logger.show();
        }),
        
        vscode.commands.registerCommand('codessa.addAgent', async () => {
            AgentConfigPanel.createOrShow(context.extensionUri, undefined, context);
        }),
        
        vscode.commands.registerCommand('codessa.editAgent', async (agentId: string) => {
            AgentConfigPanel.createOrShow(context.extensionUri, agentId, context);
        }),
        
        vscode.commands.registerCommand('codessa.deleteAgent', async () => {
            const agents = agentManager.getAllAgents();
            
            if (agents.length === 0) {
                vscode.window.showInformationMessage('No agents found to delete.');
                return;
            }
            
            const selected = await vscode.window.showQuickPick(
                agents.map(agent => ({ label: agent.name, id: agent.id })),
                { placeHolder: 'Select an agent to delete' }
            );
            
            if (selected) {
                try {
                    const success = await agentManager.deleteAgent(selected.id);
                    if (success) {
                        vscode.window.showInformationMessage(`Agent "${selected.label}" deleted successfully!`);
                    } else {
                        vscode.window.showErrorMessage(`Failed to delete agent "${selected.label}".`);
                    }
                } catch (error) {
                    logger.error('Error deleting agent:', error);
                    vscode.window.showErrorMessage('Failed to delete agent. Check logs for details.');
                }
            }
        }),
        
        vscode.commands.registerCommand('codessa.openAgentDetailsPanel', (agentId: string) => {
            const agent = agentManager.getAgent(agentId);
            if (agent) {
                AgentConfigPanel.createOrShow(context.extensionUri, agentId, context);
            } else {
                vscode.window.showErrorMessage(`Agent with ID ${agentId} not found.`);
            }
        }),
        
        vscode.commands.registerCommand('codessa.openDashboard', () => {
            DashboardPanel.createOrShow(context.extensionUri, context);
        }),
        
        vscode.commands.registerCommand('codessa.chatWithAgent', async (agentId?: string) => {
            // If no agent ID provided, prompt the user to select one
            if (!agentId) {
                const agents = agentManager.getAllAgents();
                
                if (agents.length === 0) {
                    const createNew = await vscode.window.showInformationMessage(
                        'No agents found. Would you like to create one?',
                        'Create Agent', 'Cancel'
                    );
                    
                    if (createNew === 'Create Agent') {
                        vscode.commands.executeCommand('codessa.addAgent');
                    }
                    return;
                }
                
                const selected = await vscode.window.showQuickPick(
                    agents.map(agent => ({ label: agent.name, id: agent.id, description: agent.description })),
                    { placeHolder: 'Select an agent to chat with' }
                );
                
                if (!selected) {
                    return;
                }
                
                agentId = selected.id;
            }
            
            const agent = agentManager.getAgent(agentId);
            if (agent) {
                ChatPanel.createOrShow(context.extensionUri, agent, context);
            } else {
                vscode.window.showErrorMessage(`Agent with ID ${agentId} not found.`);
            }
        }),
        
        vscode.commands.registerCommand('codessa.showQuickActions', async () => {
            const actions = [
                { label: '$(comment-discussion) Chat with Agent', description: 'Start a chat with an AI agent', command: 'codessa.chatWithAgent' },
                { label: '$(add) Create New Agent', description: 'Create a new AI agent', command: 'codessa.addAgent' },
                { label: '$(dashboard) Open Dashboard', description: 'View system status and agents', command: 'codessa.openDashboard' },
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
    logger.info(`Registered ${commands.length} commands`);
}

export function deactivate() {
    logger.info('Deactivating Codessa extension...');
    // Clean up resources here
}
