/**
 * Memory implementation for LangGraph workflows
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from './corePolyfill';
import { logger } from '../../logger';

// Define message types for compatibility
type MessageType = 'human' | 'ai' | 'system';

// Helper function to get message type
function getMessageType(message: BaseMessage): MessageType {
    if (message instanceof HumanMessage) {
        return 'human';
    } else if (message instanceof AIMessage) {
        return 'ai';
    } else if (message instanceof SystemMessage) {
        return 'system';
    } else {
        // Default to system for unknown types
        return 'system';
    }
}

/**
 * Memory entry interface
 */
export interface MemoryEntry {
    id: string;
    content: string;
    metadata: Record<string, any>;
    timestamp: number;
    embedding?: number[];
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
    query: string;
    limit?: number;
    threshold?: number;
    filter?: Record<string, any>;
}

/**
 * Memory manager interface
 */
export interface IMemoryManager {
    addMemory(content: string, metadata?: Record<string, any>): Promise<MemoryEntry>;
    getMemory(id: string): Promise<MemoryEntry | null>;
    searchMemories(options: MemorySearchOptions): Promise<MemoryEntry[]>;
    deleteMemory(id: string): Promise<boolean>;
    clearMemories(): Promise<void>;
}

/**
 * LangGraph memory manager
 */
export class LangGraphMemoryManager implements IMemoryManager {
    private memories: Map<string, MemoryEntry>;
    private namespace: string;

    /**
     * Constructor
     */
    constructor(namespace: string = 'default') {
        this.memories = new Map();
        this.namespace = namespace;
    }

    /**
     * Add a memory
     */
    public async addMemory(content: string, metadata: Record<string, any> = {}): Promise<MemoryEntry> {
        try {
            const id = `${this.namespace}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const timestamp = Date.now();

            const entry: MemoryEntry = {
                id,
                content,
                metadata: {
                    ...metadata,
                    namespace: this.namespace
                },
                timestamp
            };

            this.memories.set(id, entry);
            logger.info(`Added memory: ${id}`);

            return entry;
        } catch (error) {
            logger.error('Error adding memory:', error);
            throw error;
        }
    }

    /**
     * Get a memory by ID
     */
    public async getMemory(id: string): Promise<MemoryEntry | null> {
        return this.memories.get(id) || null;
    }

    /**
     * Search memories
     */
    public async searchMemories(options: MemorySearchOptions): Promise<MemoryEntry[]> {
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
                        if (key === 'namespace') continue; // Already handled

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
        } catch (error) {
            logger.error('Error searching memories:', error);
            throw error;
        }
    }

    /**
     * Delete a memory
     */
    public async deleteMemory(id: string): Promise<boolean> {
        return this.memories.delete(id);
    }

    /**
     * Clear all memories
     */
    public async clearMemories(): Promise<void> {
        this.memories.clear();
    }

    /**
     * Get all memories
     */
    public async getAllMemories(): Promise<MemoryEntry[]> {
        return Array.from(this.memories.values());
    }

    /**
     * Extract memories from messages
     */
    public async extractMemoriesFromMessages(messages: BaseMessage[]): Promise<MemoryEntry[]> {
        const memories: MemoryEntry[] = [];

        for (const message of messages) {
            // Skip system messages
            const messageType = getMessageType(message);
            if (messageType === 'system') continue;

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
