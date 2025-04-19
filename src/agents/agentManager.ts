import * as vscode from 'vscode';
import { Agent } from './agent';
import { AgentConfig, getAgentConfigs, updateAgentConfigs } from '../config';
import { logger } from '../logger';

export class AgentManager {
    private agents: Map<string, Agent> = new Map();
    private onDidChangeAgentsEmitter = new vscode.EventEmitter<void>();
    readonly onDidChangeAgents: vscode.Event<void> = this.onDidChangeAgentsEmitter.event;

    constructor() {
        this.loadAgents();
    }

    getAllAgents(): Agent[] {
        return Array.from(this.agents.values());
    }

    getAgentById(id: string): Agent | undefined {
        return this.agents.get(id);
    }

    async loadAgents() {
        const configs = getAgentConfigs();
        this.agents.clear();
        for (const config of configs) {
            this.agents.set(config.id, new Agent(config));
        }
        this.onDidChangeAgentsEmitter.fire();
    }

    async saveAgents() {
        const configs: AgentConfig[] = this.getAllAgents().map(agent => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
            systemPromptName: agent.systemPromptName,
            llmConfig: agent.llmConfig,
            tools: agent.tools,
            isSupervisor: agent.isSupervisor
        }));
        await updateAgentConfigs(configs);
        this.onDidChangeAgentsEmitter.fire();
    }

    async createAgentInteractively(): Promise<void> {
        logger.debug("Starting interactive agent creation...");

        const name = await vscode.window.showInputBox({ prompt: "Enter a name for the new agent:", value: "My New Agent" });
        if (!name) return;
        const id = name.toLowerCase().replace(/\s+/g, '_');
        const systemPromptName = await vscode.window.showInputBox({ prompt: "Enter the system prompt name for this agent:", value: "default" });
        if (!systemPromptName) return;

        const config: AgentConfig = {
            id,
            name,
            description: '',
            systemPromptName,
            llmConfig: { provider: 'openai', modelId: 'gpt-3.5-turbo' },
            tools: new Map(),
            isSupervisor: false
        };
        this.agents.set(id, new Agent(config));
        await this.saveAgents();
        vscode.window.showInformationMessage(`Agent '${name}' created.`);
    }

    async deleteAgentInteractively(): Promise<void> {
        const agents = this.getAllAgents();
        if (agents.length === 0) {
            vscode.window.showWarningMessage('No agents to delete.');
            return;
        }
        const pick = await vscode.window.showQuickPick(agents.map(a => a.name), { placeHolder: 'Select an agent to delete' });
        if (!pick) return;
        const agent = agents.find(a => a.name === pick);
        if (!agent) return;
        this.agents.delete(agent.id);
        await this.saveAgents();
        vscode.window.showInformationMessage(`Agent '${agent.name}' deleted.`);
    }
}

export const agentManager = new AgentManager();
