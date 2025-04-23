import { logger } from '../logger';
import { MemoryEntry, MemorySearchOptions, memoryManager } from './memory';
import { llmService } from '../llm/llmService';
import { getConfig } from '../config';
import * as vscode from 'vscode';

/**
 * Vector representation of a memory
 */
interface MemoryVector {
    memoryId: string;
    vector: number[];
}

/**
 * Vector memory manager for semantic search
 */
export class VectorMemoryManager implements VectorMemoryManager {
    private static instance: VectorMemoryManager;
    private vectors: MemoryVector[] = [];
    private initialized = false;

    private constructor() {}

    private _onMemoriesChanged = new vscode.EventEmitter<void>();

    /**
     * Register a listener for memory changes
     */
    public onMemoriesChanged(listener: () => void): vscode.Disposable {
        return this._onMemoriesChanged.event(listener);
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): VectorMemoryManager {
        if (!VectorMemoryManager.instance) {
            VectorMemoryManager.instance = new VectorMemoryManager();
        }
        return VectorMemoryManager.instance;
    }

    /**
     * Initialize the vector memory manager
     */
    public async initialize(context?: vscode.ExtensionContext): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Load existing memories and generate vectors
            const memories = memoryManager.getMemories();
            logger.info(`Initializing vector memory with ${memories.length} memories`);

            // Generate vectors for all memories (in batches to avoid overloading)
            const batchSize = 10;
            for (let i = 0; i < memories.length; i += batchSize) {
                const batch = memories.slice(i, i + batchSize);
                await Promise.all(batch.map(memory => this.addMemoryVector(memory)));
                logger.debug(`Processed vector batch ${i / batchSize + 1}/${Math.ceil(memories.length / batchSize)}`);
            }

            // Listen for memory changes
            memoryManager.onMemoriesChanged(() => {
                this.syncWithMemoryManager();
                this._onMemoriesChanged.fire();
            });

            this.initialized = true;
            logger.info('Vector memory initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize vector memory:', error);
        }
    }

    /**
     * Sync with memory manager
     */
    private async syncWithMemoryManager(): Promise<void> {
        try {
            const memories = memoryManager.getMemories();
            const memoryIds = new Set(memories.map(memory => memory.id));
            const vectorIds = new Set(this.vectors.map(vector => vector.memoryId));

            // Remove vectors for deleted memories
            this.vectors = this.vectors.filter(vector => memoryIds.has(vector.memoryId));

            // Add vectors for new memories
            const newMemories = memories.filter(memory => !vectorIds.has(memory.id));
            for (const memory of newMemories) {
                await this.addMemoryVector(memory);
            }

            logger.debug(`Synced vector memory: ${this.vectors.length} vectors for ${memories.length} memories`);
        } catch (error) {
            logger.error('Failed to sync vector memory:', error);
        }
    }

    /**
     * Add a vector for a memory
     */
    private async addMemoryVector(memory: MemoryEntry): Promise<void> {
        try {
            // Generate vector using the default provider
            const provider = llmService.getDefaultProvider();
            if (!provider) {
                logger.warn('No default provider available for vector embedding');
                return;
            }

            // Check if provider supports embeddings
            if (!provider.generateEmbedding) {
                logger.warn(`Provider ${provider.providerId} does not support embeddings`);
                return;
            }

            // Generate embedding
            const embedding = await provider.generateEmbedding(memory.content);

            // Store vector
            this.vectors.push({
                memoryId: memory.id,
                vector: embedding
            });

            logger.debug(`Added vector for memory ${memory.id}`);
        } catch (error) {
            logger.error(`Failed to add vector for memory ${memory.id}:`, error);
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Add a memory with content and metadata
     */
    public async addMemory(contentOrEntry: string | Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
        try {
            // Convert string to memory entry if needed
            let entry: Omit<MemoryEntry, 'id' | 'timestamp'>;
            if (typeof contentOrEntry === 'string') {
                const defaultSource = getConfig<string>('memory.vector.defaultSource', 'unknown');
                const defaultType = getConfig<string>('memory.vector.defaultType', 'generic');
                entry = { content: contentOrEntry, metadata: { source: defaultSource, type: defaultType } };
            } else {
                entry = contentOrEntry;
            }
            // Create a memory entry using the memory manager
            const memoryEntry = await memoryManager.addMemory(entry);

            // Add vector for the new memory
            await this.addMemoryVector(memoryEntry);

            return memoryEntry;
        } catch (error) {
            logger.error('Failed to add memory:', error);
            throw error;
        }
    }

    /**
     * Get all memories
     */
    public async getMemories(): Promise<MemoryEntry[]> {
        return memoryManager.getMemories();
    }

    /**
     * Get a memory by ID
     */
    public async getMemory(id: string): Promise<MemoryEntry | undefined> {
        return memoryManager.getMemory(id);
    }

    /**
     * Delete a memory by ID
     */
    public async deleteMemory(id: string): Promise<boolean> {
        // Remove from vector store
        this.vectors = this.vectors.filter(v => v.memoryId !== id);

        // Delete from memory manager
        return await memoryManager.deleteMemory(id);
    }

    /**
     * Clear all memories
     */
    public async clearMemories(): Promise<void> {
        // Clear vectors
        this.vectors = [];

        // Clear memories in memory manager
        await memoryManager.clearMemories();
    }

    /**
     * Search memories by text
     */
    public async searchMemories(query: string, limit: number = 10): Promise<MemoryEntry[]> {
        return memoryManager.searchMemories({
            query,
            limit
        });
    }

    /**
     * Search memories by semantic similarity
     */
    public async searchSimilarMemories(query: string, options: Partial<MemorySearchOptions> | number = {}): Promise<MemoryEntry[]> {
        // Handle the case where options is a number (limit)
        const opts: Partial<MemorySearchOptions> = typeof options === 'number' ? { limit: options } : options;
        try {
            if (!this.initialized) {
                await this.initialize();
            }

            // Generate vector for query
            const provider = llmService.getDefaultProvider();
            if (!provider || !provider.generateEmbedding) {
                logger.warn('No provider with embedding support available');
                // Fall back to text search
                return memoryManager.searchMemories({
                    query,
                    limit: typeof options === 'number' ? options : options.limit,
                    filter: typeof options === 'object' ? options.filter : undefined
                });
            }

            const queryVector = await provider.generateEmbedding(query);

            // Calculate similarity scores
            const scores = this.vectors.map(vector => ({
                memoryId: vector.memoryId,
                similarity: this.cosineSimilarity(queryVector, vector.vector)
            }));

            // Sort by similarity
            scores.sort((a, b) => b.similarity - a.similarity);

            // Apply relevance threshold
            const relevanceThreshold = getConfig<number>('memory.relevanceThreshold', 0.7);
            const relevantScores = scores.filter(score => score.similarity >= relevanceThreshold);

            // Get memories for relevant scores
            const memories = relevantScores.map(score => {
                const memory = memoryManager.getMemory(score.memoryId);
                return memory ? { ...memory, relevance: score.similarity } : undefined;
            }).filter(Boolean) as (MemoryEntry & { relevance: number })[];

            // Apply additional filters
            let filteredMemories = memories;
            if (opts.filter) {
                if (opts.filter.source) {
                    filteredMemories = filteredMemories.filter(
                        memory => memory.metadata.source === opts.filter!.source
                    );
                }

                if (opts.filter.type) {
                    filteredMemories = filteredMemories.filter(
                        memory => memory.metadata.type === opts.filter!.type
                    );
                }

                if (opts.filter.tags && opts.filter.tags.length > 0) {
                    filteredMemories = filteredMemories.filter(
                        memory => opts.filter!.tags!.every(tag => memory.metadata.tags?.includes(tag))
                    );
                }

                if (opts.filter.fromTimestamp) {
                    filteredMemories = filteredMemories.filter(
                        memory => memory.timestamp >= opts.filter!.fromTimestamp!
                    );
                }

                if (opts.filter.toTimestamp) {
                    filteredMemories = filteredMemories.filter(
                        memory => memory.timestamp <= opts.filter!.toTimestamp!
                    );
                }
            }

            // Apply limit
            const limit = opts.limit || 10;
            return filteredMemories.slice(0, limit);
        } catch (error) {
            logger.error('Error in semantic search:', error);
            // Fall back to text search
            return memoryManager.searchMemories({ query, ...opts });
        }
    }
}

// Export singleton instance
export const vectorMemoryManager = VectorMemoryManager.getInstance();
