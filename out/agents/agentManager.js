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
exports.agentManager = exports.AgentManager = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const agent_1 = require("./agent");
const config_1 = require("../config");
const uuid_1 = require("uuid");
/**
 * Manages the lifecycle and storage of agents
 */
class AgentManager {
    constructor() {
        this.agents = new Map();
        this._onAgentsChanged = new vscode.EventEmitter();
        this.onAgentsChanged = this._onAgentsChanged.event;
        this.loadAgents();
    }
    /**
     * Load saved agents from configuration
     */
    loadAgents() {
        try {
            const agentConfigs = (0, config_1.getAgents)();
            this.agents.clear();
            agentConfigs.forEach(config => {
                try {
                    const agent = new agent_1.Agent(config);
                    this.agents.set(agent.id, agent);
                }
                catch (error) {
                    logger_1.logger.error(`Failed to load agent ${config.id}:`, error);
                }
            });
            logger_1.logger.info(`Loaded ${this.agents.size} agents`);
            this._onAgentsChanged.fire();
        }
        catch (error) {
            logger_1.logger.error("Failed to load agents:", error);
        }
    }
    /**
     * Get all available agents
     */
    getAllAgents() {
        return Array.from(this.agents.values());
    }
    /**
     * Get an agent by ID
     */
    getAgent(id) {
        return this.agents.get(id);
    }
    /**
     * Get the default agent
     * First tries to find an agent named 'default', then returns the first agent if only one exists
     */
    getDefaultAgent() {
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
    async createAgent(config) {
        const id = (0, uuid_1.v4)();
        const fullConfig = {
            id,
            ...config
        };
        const agent = new agent_1.Agent(fullConfig);
        this.agents.set(id, agent);
        // Save to configuration
        await this.saveAgents();
        logger_1.logger.info(`Created new agent: ${agent.name} (${agent.id})`);
        this._onAgentsChanged.fire();
        return agent;
    }
    /**
     * Update an existing agent
     */
    async updateAgent(id, config) {
        const existingAgent = this.agents.get(id);
        if (!existingAgent) {
            logger_1.logger.warn(`Agent with ID ${id} not found for update`);
            return undefined;
        }
        // Get current configs
        const allConfigs = (0, config_1.getAgents)();
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
            const saved = await (0, config_1.saveAgents)(allConfigs);
            if (saved) {
                // Reload agents
                this.loadAgents(); // This will fire the onAgentsChanged event
                logger_1.logger.info(`Updated agent: ${updatedConfig.name} (${id})`);
                return this.agents.get(id);
            }
            else {
                logger_1.logger.error(`Failed to save agent: ${updatedConfig.name} (${id})`);
                return undefined;
            }
        }
        return undefined;
    }
    /**
     * Delete an agent
     */
    async deleteAgent(id) {
        if (!this.agents.has(id)) {
            logger_1.logger.warn(`Agent with ID ${id} not found for deletion`);
            return false;
        }
        // Remove from memory
        this.agents.delete(id);
        // Get current configs and filter out the deleted one
        const allConfigs = (0, config_1.getAgents)().filter(a => a.id !== id);
        // Save updated configs
        await (0, config_1.saveAgents)(allConfigs);
        logger_1.logger.info(`Deleted agent with ID ${id}`);
        this._onAgentsChanged.fire();
        return true;
    }
    /**
     * Save all agents to configuration
     */
    async saveAgents() {
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
            const saved = await (0, config_1.saveAgents)(configs);
            if (saved) {
                logger_1.logger.info(`Saved ${configs.length} agents to configuration`);
                return true;
            }
            else {
                logger_1.logger.error(`Failed to save ${configs.length} agents to configuration`);
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error("Failed to save agents:", error);
            return false;
        }
    }
}
exports.AgentManager = AgentManager;
exports.agentManager = new AgentManager();
//# sourceMappingURL=agentManager.js.map