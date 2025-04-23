import * as vscode from 'vscode';
import { logger } from '../logger';
import { Agent } from './agent';
import { AgentConfig, getAgents, saveAgents } from '../config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Manages the lifecycle and storage of agents
 */
export class AgentManager {
    private agents = new Map<string, Agent>();
    private _onAgentsChanged = new vscode.EventEmitter<void>();
    readonly onAgentsChanged = this._onAgentsChanged.event;

    constructor() {
        this.loadAgents();
    }

    /**
     * Load saved agents from configuration
     */
    loadAgents(): void {
        try {
            const agentConfigs = getAgents();
            this.agents.clear();

            agentConfigs.forEach(config => {
                try {
                    const agent = new Agent(config);
                    this.agents.set(agent.id, agent);
                } catch (error) {
                    logger.error(`Failed to load agent ${config.id}:`, error);
                }
            });

            logger.info(`Loaded ${this.agents.size} agents`);
            this._onAgentsChanged.fire();
        } catch (error) {
            logger.error("Failed to load agents:", error);
        }
    }

    /**
     * Get all available agents
     */
    getAllAgents(): Agent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get an agent by ID
     */
    getAgent(id: string): Agent | undefined {
        return this.agents.get(id);
    }

    /**
     * Get the default agent
     * First tries to find an agent named 'default', then returns the first agent if only one exists
     */
    getDefaultAgent(): Agent | undefined {
        const agents = this.getAllAgents();

        // If there's only one agent, use it as the default
        if (agents.length === 1) {
            return agents[0];
        }

        // Try to find an agent named 'default'
        return agents.find(agent => agent.name.toLowerCase() === 'default');
    }

    /**
     * Create a new agent
     */
    async createAgent(config: Omit<AgentConfig, 'id'>): Promise<Agent> {
        const id = uuidv4();
        const fullConfig: AgentConfig = {
            id,
            ...config
        };

        const agent = new Agent(fullConfig);
        this.agents.set(id, agent);

        // Save to configuration
        await this.saveAgents();

        logger.info(`Created new agent: ${agent.name} (${agent.id})`);
        this._onAgentsChanged.fire();
        return agent;
    }

    /**
     * Update an existing agent
     */
    async updateAgent(id: string, config: Partial<AgentConfig>): Promise<Agent | undefined> {
        const existingAgent = this.agents.get(id);
        if (!existingAgent) {
            logger.warn(`Agent with ID ${id} not found for update`);
            return undefined;
        }

        // Get current configs
        const allConfigs = getAgents();
        const index = allConfigs.findIndex(a => a.id === id);

        if (index >= 0) {
            // Update config
            const updatedConfig = {
                ...allConfigs[index],
                ...config,
                id // Ensure ID doesn't change
            };

            allConfigs[index] = updatedConfig;

            // Save configs
            const saved = await saveAgents(allConfigs);

            if (saved) {
                // Reload agents
                this.loadAgents(); // This will fire the onAgentsChanged event

                logger.info(`Updated agent: ${updatedConfig.name} (${id})`);
                return this.agents.get(id);
            } else {
                logger.error(`Failed to save agent: ${updatedConfig.name} (${id})`);
                return undefined;
            }
        }

        return undefined;
    }

    /**
     * Delete an agent
     */
    async deleteAgent(id: string): Promise<boolean> {
        if (!this.agents.has(id)) {
            logger.warn(`Agent with ID ${id} not found for deletion`);
            return false;
        }

        // Remove from memory
        this.agents.delete(id);

        // Get current configs and filter out the deleted one
        const allConfigs = getAgents().filter(a => a.id !== id);

        // Save updated configs
        await saveAgents(allConfigs);

        logger.info(`Deleted agent with ID ${id}`);
        this._onAgentsChanged.fire();
        return true;
    }

    /**
     * Save all agents to configuration
     */
    private async saveAgents(): Promise<boolean> {
        try {
            const configs = this.getAllAgents().map(agent => ({
                id: agent.id,
                name: agent.name,
                description: agent.description,
                systemPromptName: agent.systemPromptName,
                llm: agent.llmConfig,
                tools: Array.from(agent.tools.keys()),
                isSupervisor: agent.isSupervisor,
                chainedAgentIds: agent.chainedAgentIds
            }));

            const saved = await saveAgents(configs);
            if (saved) {
                logger.info(`Saved ${configs.length} agents to configuration`);
                return true;
            } else {
                logger.error(`Failed to save ${configs.length} agents to configuration`);
                return false;
            }
        } catch (error) {
            logger.error("Failed to save agents:", error);
            return false;
        }
    }
}

export const agentManager = new AgentManager();
