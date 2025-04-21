import * as vscode from 'vscode';
import { logger } from '../logger';
import { llmService } from '../llm/llmService';
import { agentManager } from '../agents/agentManager';

/**
 * Manages status bar items for Codessa
 */
export class StatusBarManager {
    private mainStatusBarItem: vscode.StatusBarItem;
    private modelStatusBarItem: vscode.StatusBarItem;
    private agentStatusBarItem: vscode.StatusBarItem;

    constructor() {
        // Create main status bar item
        this.mainStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100 // High priority (lower number = higher priority)
        );
        this.mainStatusBarItem.text = "$(hubot) Codessa";
        this.mainStatusBarItem.tooltip = "Codessa AI Coding Assistant";
        this.mainStatusBarItem.command = "codessa.showQuickActions";

        // Create model status item
        this.modelStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            99
        );

        // Create agent status item
        this.agentStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            98
        );
    }

    /**
     * Initialize and show status bar items
     */
    initialize(): void {
        this.updateModelStatus();
        this.updateAgentStatus();

        // Listen for LLM provider changes
        llmService.onProvidersChanged(() => {
            this.updateModelStatus();
        });

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.defaultModel') || 
                e.affectsConfiguration('codessa.providers')) {
                this.updateModelStatus();
            }
        });

        this.mainStatusBarItem.show();
    }

    /**
     * Update model status bar item to show current default model
     */
    updateModelStatus(): void {
        if (!this.modelStatusBarItem) {
            return;
        }

        try {
            const configuredProviders = llmService.getConfiguredProviders();
            if (configuredProviders.length === 0) {
                this.modelStatusBarItem.text = "$(alert) No LLM Configured";
                this.modelStatusBarItem.tooltip = "Click to configure an LLM provider";
                this.modelStatusBarItem.command = "codessa.openSettings";
                this.modelStatusBarItem.show();
                return;
            }

            // Get the default provider
            const defaultProvider = llmService.getDefaultProvider();
            if (!defaultProvider) {
                this.modelStatusBarItem.text = "$(alert) LLM Error";
                this.modelStatusBarItem.tooltip = "Default LLM provider not found";
                this.modelStatusBarItem.command = "codessa.openSettings";
                this.modelStatusBarItem.show();
                return;
            }

            const modelConfig = llmService.getDefaultModelConfig();
            const temperature = modelConfig.options?.temperature ?? 0.7;

            this.modelStatusBarItem.text = `$(server) ${modelConfig.provider}/${modelConfig.modelId} (${temperature})`;
            this.modelStatusBarItem.tooltip = "Current default LLM provider and model\nClick to change settings";
            this.modelStatusBarItem.command = "codessa.openSettings";
            this.modelStatusBarItem.show();
        } catch (error) {
            logger.error("Error updating model status:", error);
            this.modelStatusBarItem.text = "$(alert) LLM Error";
            this.modelStatusBarItem.tooltip = "Error getting LLM status";
            this.modelStatusBarItem.command = "codessa.openSettings";
            this.modelStatusBarItem.show();
        }
    }

    /**
     * Update agent status bar item to show available agents
     */
    updateAgentStatus(): void {
        if (!this.agentStatusBarItem) {
            return;
        }

        try {
            const agents = agentManager.getAllAgents();

            if (agents.length === 0) {
                this.agentStatusBarItem.text = "$(person-add) Create Agent";
                this.agentStatusBarItem.tooltip = "No agents configured. Click to create one.";
                this.agentStatusBarItem.command = "codessa.addAgent";
                this.agentStatusBarItem.show();
                return;
            }

            this.agentStatusBarItem.text = `$(person) ${agents.length} Agent${agents.length > 1 ? 's' : ''}`;
            this.agentStatusBarItem.tooltip = `${agents.length} agent${agents.length > 1 ? 's' : ''} available`;
            this.agentStatusBarItem.command = "codessa.showAgentList";
            this.agentStatusBarItem.show();
        } catch (error) {
            logger.error("Error updating agent status:", error);
            this.agentStatusBarItem.hide();
        }
    }

    /**
     * Show activity indicator when an agent is processing
     * @param isActive Whether an agent is actively processing
     */
    setActivityIndicator(isActive: boolean): void {
        if (isActive) {
            this.mainStatusBarItem.text = "$(sync~spin) Codessa";
            this.mainStatusBarItem.tooltip = "Codessa is processing...";
        } else {
            this.mainStatusBarItem.text = "$(hubot) Codessa";
            this.mainStatusBarItem.tooltip = "Codessa AI Coding Assistant";
        }
    }

    /**
     * Dispose all status bar items
     */
    dispose(): void {
        this.mainStatusBarItem.dispose();
        this.modelStatusBarItem.dispose();
        this.agentStatusBarItem.dispose();
    }
}

/**
 * Status bar manager singleton
 */
export const statusBarManager = new StatusBarManager();