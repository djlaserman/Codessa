import { MemoryEntry, MemorySearchOptions } from '../memory/types';
import * as vscode from 'vscode';

/**
 * Vector Memory Manager interface
 */
export interface VectorMemoryManager {
    /**
     * Initialize the vector memory manager
     */
    initialize(context?: vscode.ExtensionContext): Promise<void>;

    /**
     * Event fired when memories change
     */
    onMemoriesChanged(listener: () => void): vscode.Disposable;

    /**
     * Add a memory
     */
    addMemory(content: string, metadata?: Record<string, any>): Promise<MemoryEntry>;

    /**
     * Get all memories
     */
    getMemories(): Promise<MemoryEntry[]>;

    /**
     * Get a memory by ID
     */
    getMemory(id: string): Promise<MemoryEntry | undefined>;

    /**
     * Delete a memory by ID
     */
    deleteMemory(id: string): Promise<boolean>;

    /**
     * Clear all memories
     */
    clearMemories(): Promise<void>;

    /**
     * Search memories
     */
    searchMemories(query: string, limit?: number): Promise<MemoryEntry[]>;

    /**
     * Search memories by semantic similarity
     */
    searchSimilarMemories(query: string, options?: Partial<MemorySearchOptions> | number): Promise<MemoryEntry[]>;
}
