import * as vscode from 'vscode';
import { operationModeRegistry } from '../modes/operationMode';
import { AskMode } from '../modes/askMode';
import { ChatMode } from '../modes/chatMode';
import { DebugMode } from '../modes/debugMode';
import { EditMode } from '../modes/editMode';
import { AgentMode } from '../modes/agentMode';
import { MultiAgentMode } from '../modes/multiAgentMode';
import { logger } from '../logger';

/**
 * Register all operation modes
 */
export async function registerModes(context: vscode.ExtensionContext): Promise<void> {
    try {
        logger.info('Registering operation modes...');
        
        // Register modes
        operationModeRegistry.registerMode(new AskMode());
        operationModeRegistry.registerMode(new ChatMode());
        operationModeRegistry.registerMode(new DebugMode());
        operationModeRegistry.registerMode(new EditMode());
        operationModeRegistry.registerMode(new AgentMode());
        operationModeRegistry.registerMode(new MultiAgentMode());
        
        // Set default mode
        operationModeRegistry.setDefaultMode('chat');
        
        // Initialize modes
        await operationModeRegistry.initializeModes(context);
        
        logger.info('Operation modes registered successfully');
    } catch (error) {
        logger.error('Error registering operation modes:', error);
        throw error;
    }
}
