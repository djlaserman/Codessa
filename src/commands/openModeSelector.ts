import * as vscode from 'vscode';
import { ModeSelectorView } from '../ui/modeSelectorView';
import { ChatPanel } from '../ui/chatView';
import { agentManager } from '../agents/agentManager';
import { logger } from '../logger';

/**
 * Get the default agent or prompt the user to select one
 */
async function getDefaultOrSelectedAgent(): Promise<any> {
    const agents = agentManager.getAllAgents();

    if (agents.length === 0) {
        const createNew = await vscode.window.showInformationMessage(
            'No agents available. Would you like to create one?',
            'Create Agent', 'Cancel'
        );

        if (createNew === 'Create Agent') {
            vscode.commands.executeCommand('codessa.addAgent');
        }
        return null;
    }

    // If there's only one agent, use it as the default
    if (agents.length === 1) {
        return agents[0];
    }

    // Try to find an agent named 'default'
    const defaultAgent = agents.find(agent => agent.name.toLowerCase() === 'default');
    if (defaultAgent) {
        return defaultAgent;
    }

    // Otherwise, prompt the user to select an agent
    const selected = await vscode.window.showQuickPick(
        agents.map(agent => ({
            label: agent.name,
            description: agent.description || '',
            id: agent.id
        })),
        { placeHolder: 'Select an agent' }
    );

    if (selected) {
        return agentManager.getAgent(selected.id);
    }

    return null;
}

/**
 * Open the mode selector
 */
export async function openModeSelector(context: vscode.ExtensionContext): Promise<void> {
    try {
        logger.info('Opening mode selector...');

        // Create the mode selector view
        const modeSelectorView = ModeSelectorView.createOrShow(context.extensionUri, context);

        // Handle mode selection
        modeSelectorView.onModeSelected(async (mode) => {
            logger.info(`Mode selected: ${mode.displayName} (${mode.id})`);

            // Get the agent to use
            const agent = await getDefaultOrSelectedAgent();

            if (agent) {
                // Open chat panel with the selected mode
                ChatPanel.createOrShow(context.extensionUri, agent, context, mode);
            }
        });

        logger.info('Mode selector opened successfully');
    } catch (error) {
        logger.error('Error opening mode selector:', error);
        vscode.window.showErrorMessage(`Failed to open mode selector: ${error instanceof Error ? error.message : String(error)}`);
    }
}
