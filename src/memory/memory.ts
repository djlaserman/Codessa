import * as vscode from 'vscode';
import { logger } from '../logger';
import { getConfig, setConfig } from '../config';

/**
 * Memory entry interface
 */
export interface MemoryEntry {
    id: string;
    content: string;
    timestamp: number;
    metadata: {
        source: string;
        type: string;
        tags?: string[];
        [key: string]: any;
    };
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
    query: string;
    limit?: number;
    filter?: {
        source?: string;
        type?: string;
        tags?: string[];
        fromTimestamp?: number;
        toTimestamp?: number;
        [key: string]: any;
    };
}

/**
 * Memory manager class
 */
export class MemoryManager {
    private static instance: MemoryManager;
    private memories: MemoryEntry[] = [];
    private context: vscode.ExtensionContext | undefined;
    private _onMemoriesChanged = new vscode.EventEmitter<void>();
    readonly onMemoriesChanged = this._onMemoriesChanged.event;

    private constructor() {}

    /**
     * Get the singleton instance
     */
    public static getInstance(): MemoryManager {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }

    /**
     * Initialize the memory manager
     */
    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        this.loadMemories();
    }

    /**
     * Load memories from storage
     */
    private loadMemories(): void {
        if (!this.context) {
            logger.error('Memory manager not initialized with context');
            return;
        }

        try {
            const savedMemories = this.context.globalState.get<MemoryEntry[]>('memories', []);
            this.memories = savedMemories;
            logger.info(`Loaded ${this.memories.length} memories from storage`);
        } catch (error) {
            logger.error('Failed to load memories:', error);
            this.memories = [];
        }
    }

    /**
     * Save memories to storage
     */
    private async saveMemories(): Promise<void> {
        if (!this.context) {
            logger.error('Memory manager not initialized with context');
            return;
        }

        try {
            await this.context.globalState.update('memories', this.memories);
            logger.debug(`Saved ${this.memories.length} memories to storage`);
        } catch (error) {
            logger.error('Failed to save memories:', error);
        }
    }

    /**
     * Add a memory
     */
    public async addMemory(memory: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
        const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const timestamp = Date.now();

        const newMemory: MemoryEntry = {
            id,
            content: memory.content,
            timestamp,
            metadata: memory.metadata
        };

        this.memories.push(newMemory);
        await this.saveMemories();
        this._onMemoriesChanged.fire();

        return newMemory;
    }

    /**
     * Get all memories
     */
    public getMemories(): MemoryEntry[] {
        return [...this.memories];
    }

    /**
     * Get a memory by ID
     */
    public getMemory(id: string): MemoryEntry | undefined {
        return this.memories.find(memory => memory.id === id);
    }

    /**
     * Delete a memory by ID
     */
    public async deleteMemory(id: string): Promise<boolean> {
        const initialLength = this.memories.length;
        this.memories = this.memories.filter(memory => memory.id !== id);

        if (this.memories.length < initialLength) {
            await this.saveMemories();
            this._onMemoriesChanged.fire();
            return true;
        }

        return false;
    }

    /**
     * Clear all memories
     */
    public async clearMemories(): Promise<void> {
        this.memories = [];
        await this.saveMemories();
        this._onMemoriesChanged.fire();
    }

    /**
     * Search memories
     * This is a simple implementation that will be enhanced with vector search
     */
    public searchMemories(options: MemorySearchOptions): MemoryEntry[] {
        const { query, limit = 10, filter } = options;

        // Filter memories based on metadata
        let filteredMemories = this.memories;
        
        if (filter) {
            if (filter.source) {
                filteredMemories = filteredMemories.filter(
                    memory => memory.metadata.source === filter.source
                );
            }
            
            if (filter.type) {
                filteredMemories = filteredMemories.filter(
                    memory => memory.metadata.type === filter.type
                );
            }
            
            if (filter.tags && filter.tags.length > 0) {
                filteredMemories = filteredMemories.filter(
                    memory => filter.tags!.every(tag => memory.metadata.tags?.includes(tag))
                );
            }
            
            if (filter.fromTimestamp) {
                filteredMemories = filteredMemories.filter(
                    memory => memory.timestamp >= filter.fromTimestamp!
                );
            }
            
            if (filter.toTimestamp) {
                filteredMemories = filteredMemories.filter(
                    memory => memory.timestamp <= filter.toTimestamp!
                );
            }
        }

        // Search by content (simple text search for now)
        if (query) {
            const lowerQuery = query.toLowerCase();
            filteredMemories = filteredMemories.filter(
                memory => memory.content.toLowerCase().includes(lowerQuery)
            );
        }

        // Sort by relevance (for now, just by timestamp)
        filteredMemories.sort((a, b) => b.timestamp - a.timestamp);

        // Limit results
        return filteredMemories.slice(0, limit);
    }

    /**
     * Get memory settings
     */
    public getMemorySettings(): MemorySettings {
        return {
            enabled: getConfig<boolean>('memory.enabled', true),
            maxMemories: getConfig<number>('memory.maxMemories', 1000),
            relevanceThreshold: getConfig<number>('memory.relevanceThreshold', 0.7),
            contextWindowSize: getConfig<number>('memory.contextWindowSize', 5)
        };
    }

    /**
     * Update memory settings
     */
    public async updateMemorySettings(settings: Partial<MemorySettings>): Promise<void> {
        if (settings.enabled !== undefined) {
            await setConfig('memory.enabled', settings.enabled);
        }
        
        if (settings.maxMemories !== undefined) {
            await setConfig('memory.maxMemories', settings.maxMemories);
        }
        
        if (settings.relevanceThreshold !== undefined) {
            await setConfig('memory.relevanceThreshold', settings.relevanceThreshold);
        }
        
        if (settings.contextWindowSize !== undefined) {
            await setConfig('memory.contextWindowSize', settings.contextWindowSize);
        }
    }
}

/**
 * Memory settings interface
 */
export interface MemorySettings {
    enabled: boolean;
    maxMemories: number;
    relevanceThreshold: number;
    contextWindowSize: number;
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();
