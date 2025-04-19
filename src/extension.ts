import * as vscode from 'vscode';
import { logger } from './logger';
import { llmService } from './llm/llmService';
import { promptManager } from './prompts/promptManager';
import { agentManager } from './agents/agentManager';
import { AgentTreeDataProvider } from './ui/agentTreeView';

export function activate(context: vscode.ExtensionContext) {
    logger.info('Congratulations, your extension "agentic-coding-assistant" is now active!');

    // Initialize services (order might matter depending on dependencies)
    // Ensure config is read, providers registered, prompts loaded, agents loaded
    promptManager.loadPrompts();
    agentManager.loadAgents();

    // Register Agent Tree View
    const agentTreeProvider = new AgentTreeDataProvider(context);
    vscode.window.registerTreeDataProvider('agenticAssistantView', agentTreeProvider);

    // Register commands (examples)
    context.subscriptions.push(
        vscode.commands.registerCommand('agentic.runTask', async () => {
            // Implementation for running a general agentic task
        }),
        vscode.commands.registerCommand('agentic.inlineGenerate', async () => {
            // Implementation for inline code generation
        }),
        vscode.commands.registerCommand('agentic.configureProviders', async () => {
            // Implementation for configuring providers
        }),
        vscode.commands.registerCommand('agentic.manageAgents', async () => {
            // Implementation for managing agents
        }),
        vscode.commands.registerCommand('agentic.refreshAgentView', () => {
            agentTreeProvider.refresh();
        })
    );
}

export function deactivate() {
    logger.info("Agentic Coding Assistant deactivated.");
}
