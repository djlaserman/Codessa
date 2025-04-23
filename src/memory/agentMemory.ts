import { Agent } from '../agents/agent';
import { logger } from '../logger';
import { memoryManager, MemoryEntry } from './memory';
import { vectorMemoryManager } from './vectorMemory';
import { getConfig } from '../config';

/**
 * Agent memory integration
 */
export class AgentMemory {
    private agent: Agent;
    private conversationHistory: MemoryEntry[] = [];
    private relevantMemories: MemoryEntry[] = [];

    constructor(agent: Agent) {
        this.agent = agent;
    }

    /**
     * Add a message to the agent's memory
     */
    public async addMessage(role: 'user' | 'assistant', content: string): Promise<void> {
        try {
            // Create memory entry
            const memory = await memoryManager.addMemory({
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
            const maxHistorySize = getConfig<number>('memory.conversationHistorySize', 100);
            if (this.conversationHistory.length > maxHistorySize) {
                this.conversationHistory = this.conversationHistory.slice(-maxHistorySize);
            }

            logger.debug(`Added ${role} message to agent memory: ${content.substring(0, 50)}...`);
        } catch (error) {
            logger.error('Failed to add message to agent memory:', error);
        }
    }

    /**
     * Get conversation history
     */
    public getConversationHistory(): MemoryEntry[] {
        return [...this.conversationHistory];
    }

    /**
     * Get relevant memories for a query
     */
    public async getRelevantMemories(query: string): Promise<MemoryEntry[]> {
        try {
            // Check if memory is enabled
            const memoryEnabled = getConfig<boolean>('memory.enabled', true);
            if (!memoryEnabled) {
                return [];
            }

            // Search for relevant memories
            this.relevantMemories = await vectorMemoryManager.searchSimilarMemories(query, {
                limit: getConfig<number>('memory.contextWindowSize', 5),
                filter: {
                    source: 'conversation',
                    agentId: this.agent.id
                }
            });

            return this.relevantMemories;
        } catch (error) {
            logger.error('Failed to get relevant memories:', error);
            return [];
        }
    }

    /**
     * Clear conversation history
     */
    public clearConversationHistory(): void {
        this.conversationHistory = [];
    }

    /**
     * Format memories for inclusion in prompts
     */
    public formatMemoriesForPrompt(memories: MemoryEntry[]): string {
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
    public async getMemorySummary(): Promise<string> {
        try {
            // Get all memories for this agent
            const memories = memoryManager.searchMemories({
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
            const typeCounts: Record<string, number> = {};
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
        } catch (error) {
            logger.error('Failed to get memory summary:', error);
            return 'Failed to get memory summary.';
        }
    }
}

/**
 * Get agent memory for an agent
 */
export function getAgentMemory(agent: Agent): AgentMemory {
    return new AgentMemory(agent);
}
