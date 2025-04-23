"use strict";
/**
 * Memory implementation for LangGraph workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangGraphMemoryManager = void 0;
const messages_1 = require("@langchain/core/messages");
const logger_1 = require("../../logger");
// Helper function to get message type
function getMessageType(message) {
    if (message instanceof messages_1.HumanMessage) {
        return 'human';
    }
    else if (message instanceof messages_1.AIMessage) {
        return 'ai';
    }
    else if (message instanceof messages_1.SystemMessage) {
        return 'system';
    }
    else {
        // Default to system for unknown types
        return 'system';
    }
}
/**
 * LangGraph memory manager
 */
class LangGraphMemoryManager {
    /**
     * Constructor
     */
    constructor(namespace = 'default') {
        this.memories = new Map();
        this.namespace = namespace;
    }
    /**
     * Add a memory
     */
    async addMemory(content, metadata = {}) {
        try {
            const id = `${this.namespace}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const timestamp = Date.now();
            const entry = {
                id,
                content,
                metadata: {
                    ...metadata,
                    namespace: this.namespace
                },
                timestamp
            };
            this.memories.set(id, entry);
            logger_1.logger.info(`Added memory: ${id}`);
            return entry;
        }
        catch (error) {
            logger_1.logger.error('Error adding memory:', error);
            throw error;
        }
    }
    /**
     * Get a memory by ID
     */
    async getMemory(id) {
        return this.memories.get(id) || null;
    }
    /**
     * Search memories
     */
    async searchMemories(options) {
        try {
            // Simple keyword search for now
            // In a real implementation, this would use embeddings and vector search
            const { query, limit = 5, filter = {} } = options;
            const results = Array.from(this.memories.values())
                .filter(memory => {
                // Apply namespace filter
                if (filter.namespace && memory.metadata.namespace !== filter.namespace) {
                    return false;
                }
                // Apply custom filters
                for (const [key, value] of Object.entries(filter)) {
                    if (key === 'namespace')
                        continue; // Already handled
                    if (memory.metadata[key] !== value) {
                        return false;
                    }
                }
                // Apply text search
                return memory.content.toLowerCase().includes(query.toLowerCase());
            })
                .sort((a, b) => b.timestamp - a.timestamp) // Sort by recency
                .slice(0, limit);
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error searching memories:', error);
            throw error;
        }
    }
    /**
     * Delete a memory
     */
    async deleteMemory(id) {
        return this.memories.delete(id);
    }
    /**
     * Clear all memories
     */
    async clearMemories() {
        this.memories.clear();
    }
    /**
     * Get all memories
     */
    async getAllMemories() {
        return Array.from(this.memories.values());
    }
    /**
     * Extract memories from messages
     */
    async extractMemoriesFromMessages(messages) {
        const memories = [];
        for (const message of messages) {
            // Skip system messages
            const messageType = getMessageType(message);
            if (messageType === 'system')
                continue;
            // Get content as string
            const contentAsString = typeof message.content === 'string'
                ? message.content
                : JSON.stringify(message.content);
            // Create a memory entry for each message
            const entry = await this.addMemory(contentAsString, {
                type: messageType,
                role: messageType === 'human' ? 'user' : 'assistant'
            });
            memories.push(entry);
        }
        return memories;
    }
}
exports.LangGraphMemoryManager = LangGraphMemoryManager;
//# sourceMappingURL=memory.js.map