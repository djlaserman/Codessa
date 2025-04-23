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
exports.vectorMemoryManager = exports.VectorMemoryManager = void 0;
const logger_1 = require("../logger");
const memory_1 = require("./memory");
const llmService_1 = require("../llm/llmService");
const config_1 = require("../config");
const vscode = __importStar(require("vscode"));
/**
 * Vector memory manager for semantic search
 */
class VectorMemoryManager {
    constructor() {
        this.vectors = [];
        this.initialized = false;
        this._onMemoriesChanged = new vscode.EventEmitter();
    }
    /**
     * Register a listener for memory changes
     */
    onMemoriesChanged(listener) {
        return this._onMemoriesChanged.event(listener);
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!VectorMemoryManager.instance) {
            VectorMemoryManager.instance = new VectorMemoryManager();
        }
        return VectorMemoryManager.instance;
    }
    /**
     * Initialize the vector memory manager
     */
    async initialize(context) {
        if (this.initialized) {
            return;
        }
        try {
            // Load existing memories and generate vectors
            const memories = memory_1.memoryManager.getMemories();
            logger_1.logger.info(`Initializing vector memory with ${memories.length} memories`);
            // Generate vectors for all memories (in batches to avoid overloading)
            const batchSize = 10;
            for (let i = 0; i < memories.length; i += batchSize) {
                const batch = memories.slice(i, i + batchSize);
                await Promise.all(batch.map(memory => this.addMemoryVector(memory)));
                logger_1.logger.debug(`Processed vector batch ${i / batchSize + 1}/${Math.ceil(memories.length / batchSize)}`);
            }
            // Listen for memory changes
            memory_1.memoryManager.onMemoriesChanged(() => {
                this.syncWithMemoryManager();
                this._onMemoriesChanged.fire();
            });
            this.initialized = true;
            logger_1.logger.info('Vector memory initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize vector memory:', error);
        }
    }
    /**
     * Sync with memory manager
     */
    async syncWithMemoryManager() {
        try {
            const memories = memory_1.memoryManager.getMemories();
            const memoryIds = new Set(memories.map(memory => memory.id));
            const vectorIds = new Set(this.vectors.map(vector => vector.memoryId));
            // Remove vectors for deleted memories
            this.vectors = this.vectors.filter(vector => memoryIds.has(vector.memoryId));
            // Add vectors for new memories
            const newMemories = memories.filter(memory => !vectorIds.has(memory.id));
            for (const memory of newMemories) {
                await this.addMemoryVector(memory);
            }
            logger_1.logger.debug(`Synced vector memory: ${this.vectors.length} vectors for ${memories.length} memories`);
        }
        catch (error) {
            logger_1.logger.error('Failed to sync vector memory:', error);
        }
    }
    /**
     * Add a vector for a memory
     */
    async addMemoryVector(memory) {
        try {
            // Generate vector using the default provider
            const provider = llmService_1.llmService.getDefaultProvider();
            if (!provider) {
                logger_1.logger.warn('No default provider available for vector embedding');
                return;
            }
            // Check if provider supports embeddings
            if (!provider.generateEmbedding) {
                logger_1.logger.warn(`Provider ${provider.providerId} does not support embeddings`);
                return;
            }
            // Generate embedding
            const embedding = await provider.generateEmbedding(memory.content);
            // Store vector
            this.vectors.push({
                memoryId: memory.id,
                vector: embedding
            });
            logger_1.logger.debug(`Added vector for memory ${memory.id}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to add vector for memory ${memory.id}:`, error);
        }
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
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
    async addMemory(contentOrEntry) {
        try {
            // Convert string to memory entry if needed
            let entry;
            if (typeof contentOrEntry === 'string') {
                const defaultSource = (0, config_1.getConfig)('memory.vector.defaultSource', 'unknown');
                const defaultType = (0, config_1.getConfig)('memory.vector.defaultType', 'generic');
                entry = { content: contentOrEntry, metadata: { source: defaultSource, type: defaultType } };
            }
            else {
                entry = contentOrEntry;
            }
            // Create a memory entry using the memory manager
            const memoryEntry = await memory_1.memoryManager.addMemory(entry);
            // Add vector for the new memory
            await this.addMemoryVector(memoryEntry);
            return memoryEntry;
        }
        catch (error) {
            logger_1.logger.error('Failed to add memory:', error);
            throw error;
        }
    }
    /**
     * Get all memories
     */
    async getMemories() {
        return memory_1.memoryManager.getMemories();
    }
    /**
     * Get a memory by ID
     */
    async getMemory(id) {
        return memory_1.memoryManager.getMemory(id);
    }
    /**
     * Delete a memory by ID
     */
    async deleteMemory(id) {
        // Remove from vector store
        this.vectors = this.vectors.filter(v => v.memoryId !== id);
        // Delete from memory manager
        return await memory_1.memoryManager.deleteMemory(id);
    }
    /**
     * Clear all memories
     */
    async clearMemories() {
        // Clear vectors
        this.vectors = [];
        // Clear memories in memory manager
        await memory_1.memoryManager.clearMemories();
    }
    /**
     * Search memories by text
     */
    async searchMemories(query, limit = 10) {
        return memory_1.memoryManager.searchMemories({
            query,
            limit
        });
    }
    /**
     * Search memories by semantic similarity
     */
    async searchSimilarMemories(query, options = {}) {
        // Handle the case where options is a number (limit)
        const opts = typeof options === 'number' ? { limit: options } : options;
        try {
            if (!this.initialized) {
                await this.initialize();
            }
            // Generate vector for query
            const provider = llmService_1.llmService.getDefaultProvider();
            if (!provider || !provider.generateEmbedding) {
                logger_1.logger.warn('No provider with embedding support available');
                // Fall back to text search
                return memory_1.memoryManager.searchMemories({
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
            const relevanceThreshold = (0, config_1.getConfig)('memory.relevanceThreshold', 0.7);
            const relevantScores = scores.filter(score => score.similarity >= relevanceThreshold);
            // Get memories for relevant scores
            const memories = relevantScores.map(score => {
                const memory = memory_1.memoryManager.getMemory(score.memoryId);
                return memory ? { ...memory, relevance: score.similarity } : undefined;
            }).filter(Boolean);
            // Apply additional filters
            let filteredMemories = memories;
            if (opts.filter) {
                if (opts.filter.source) {
                    filteredMemories = filteredMemories.filter(memory => memory.metadata.source === opts.filter.source);
                }
                if (opts.filter.type) {
                    filteredMemories = filteredMemories.filter(memory => memory.metadata.type === opts.filter.type);
                }
                if (opts.filter.tags && opts.filter.tags.length > 0) {
                    filteredMemories = filteredMemories.filter(memory => opts.filter.tags.every(tag => memory.metadata.tags?.includes(tag)));
                }
                if (opts.filter.fromTimestamp) {
                    filteredMemories = filteredMemories.filter(memory => memory.timestamp >= opts.filter.fromTimestamp);
                }
                if (opts.filter.toTimestamp) {
                    filteredMemories = filteredMemories.filter(memory => memory.timestamp <= opts.filter.toTimestamp);
                }
            }
            // Apply limit
            const limit = opts.limit || 10;
            return filteredMemories.slice(0, limit);
        }
        catch (error) {
            logger_1.logger.error('Error in semantic search:', error);
            // Fall back to text search
            return memory_1.memoryManager.searchMemories({ query, ...opts });
        }
    }
}
exports.VectorMemoryManager = VectorMemoryManager;
// Export singleton instance
exports.vectorMemoryManager = VectorMemoryManager.getInstance();
//# sourceMappingURL=vectorMemory.js.map