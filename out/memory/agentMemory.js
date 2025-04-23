"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMemory = void 0;
exports.getAgentMemory = getAgentMemory;
const logger_1 = require("../logger");
const memory_1 = require("./memory");
const vectorMemory_1 = require("./vectorMemory");
const config_1 = require("../config");
/**
 * Agent memory integration
 */
class AgentMemory {
    constructor(agent) {
        this.conversationHistory = [];
        this.relevantMemories = [];
        this.agent = agent;
    }
    /**
     * Add a message to the agent's memory
     */
    async addMessage(role, content) {
        try {
            // Create memory entry
            const memory = await memory_1.memoryManager.addMemory({
                content,
                metadata: {
                    source: 'conversation',
                    type: role,
                    agentId: this.agent.id,
                    agentName: this.agent.name
                }
            });
            // Add to conversation history
            this.conversationHistory.push(memory);
            // Trim conversation history if needed
            const maxHistorySize = (0, config_1.getConfig)('memory.conversationHistorySize', 100);
            if (this.conversationHistory.length > maxHistorySize) {
                this.conversationHistory = this.conversationHistory.slice(-maxHistorySize);
            }
            logger_1.logger.debug(`Added ${role} message to agent memory: ${content.substring(0, 50)}...`);
        }
        catch (error) {
            logger_1.logger.error('Failed to add message to agent memory:', error);
        }
    }
    /**
     * Get conversation history
     */
    getConversationHistory() {
        return [...this.conversationHistory];
    }
    /**
     * Get relevant memories for a query
     */
    async getRelevantMemories(query) {
        try {
            // Check if memory is enabled
            const memoryEnabled = (0, config_1.getConfig)('memory.enabled', true);
            if (!memoryEnabled) {
                return [];
            }
            // Search for relevant memories
            this.relevantMemories = await vectorMemory_1.vectorMemoryManager.searchSimilarMemories(query, {
                limit: (0, config_1.getConfig)('memory.contextWindowSize', 5),
                filter: {
                    source: 'conversation',
                    agentId: this.agent.id
                }
            });
            return this.relevantMemories;
        }
        catch (error) {
            logger_1.logger.error('Failed to get relevant memories:', error);
            return [];
        }
    }
    /**
     * Clear conversation history
     */
    clearConversationHistory() {
        this.conversationHistory = [];
    }
    /**
     * Format memories for inclusion in prompts
     */
    formatMemoriesForPrompt(memories) {
        if (memories.length === 0) {
            return '';
        }
        const formattedMemories = memories.map(memory => {
            const role = memory.metadata.type === 'user' ? 'User' : 'Assistant';
            return `${role}: ${memory.content}`;
        }).join('\n\n');
        return `\n\nRelevant conversation history:\n${formattedMemories}\n\n`;
    }
    /**
     * Get a summary of the agent's memory
     */
    async getMemorySummary() {
        try {
            // Get all memories for this agent
            const memories = memory_1.memoryManager.searchMemories({
                query: '',
                limit: 1000,
                filter: {
                    agentId: this.agent.id
                }
            });
            if (memories.length === 0) {
                return 'No memories available.';
            }
            // Count by type
            const typeCounts = {};
            for (const memory of memories) {
                const type = memory.metadata.type;
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            }
            // Format summary
            const summary = [
                `Total memories: ${memories.length}`,
                'Memory types:',
                ...Object.entries(typeCounts).map(([type, count]) => `- ${type}: ${count}`)
            ].join('\n');
            return summary;
        }
        catch (error) {
            logger_1.logger.error('Failed to get memory summary:', error);
            return 'Failed to get memory summary.';
        }
    }
}
exports.AgentMemory = AgentMemory;
/**
 * Get agent memory for an agent
 */
function getAgentMemory(agent) {
    return new AgentMemory(agent);
}
//# sourceMappingURL=agentMemory.js.map