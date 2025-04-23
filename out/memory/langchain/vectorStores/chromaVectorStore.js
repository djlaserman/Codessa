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
exports.ChromaVectorStore = void 0;
const chroma_1 = require("@langchain/chroma");
const documents_1 = require("@langchain/core/documents");
const logger_1 = require("../../../logger");
const config_1 = require("../../../config");
const fs = __importStar(require("fs"));
/**
 * Chroma vector store implementation
 */
class ChromaVectorStore {
    constructor(embeddings) {
        this.embeddings = embeddings;
        this.collectionName = (0, config_1.getConfig)('memory.vectorStore.chroma.collectionName', 'codessa_memories');
        this.directory = (0, config_1.getConfig)('memory.vectorStore.chroma.directory', './.codessa/chroma');
    }
    /**
     * Initialize the vector store
     */
    async initialize() {
        try {
            // Ensure directory exists
            if (!fs.existsSync(this.directory)) {
                fs.mkdirSync(this.directory, { recursive: true });
            }
            // Initialize Chroma
            this.vectorStore = new chroma_1.Chroma({
                embeddings: this.embeddings,
                collectionName: this.collectionName,
                collectionMetadata: {
                    'hnsw:space': 'cosine'
                },
                url: undefined, // Use local instance
                path: this.directory
            });
            logger_1.logger.info(`Chroma vector store initialized successfully at ${this.directory}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Chroma vector store:', error);
            throw error;
        }
    }
    /**
     * Add a vector
     */
    async addVector(id, vector, metadata = {}) {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Create document
            const document = new documents_1.Document({
                pageContent: metadata.content || '',
                metadata: {
                    ...metadata,
                    id
                }
            });
            // Add to vector store (Chroma will compute embeddings internally)
            await this.vectorStore.addDocuments([document], [id]);
            logger_1.logger.debug(`Added document with ID ${id} to Chroma vector store`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to add vector with ID ${id}:`, error);
            throw error;
        }
    }
    /**
     * Get a vector by ID
     */
    async getVector(id) {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Use similaritySearch to retrieve document by ID
            const results = await this.vectorStore.similaritySearch('', 10);
            const match = results.find((doc) => doc.metadata && doc.metadata.id === id);
            if (match) {
                return match;
            }
            return undefined;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get vector with ID ${id}:`, error);
            return undefined;
        }
    }
    /**
     * Delete a vector by ID
     */
    async deleteVector(id) {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }
        try {
            await this.vectorStore.delete([id]);
            logger_1.logger.debug(`Deleted vector with ID ${id} from Chroma vector store`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete vector with ID ${id}:`, error);
            return false;
        }
    }
    /**
     * Clear all vectors
     */
    async clearVectors() {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Delete all documents by retrieving all IDs and passing them to delete
            const allDocs = await this.vectorStore.similaritySearch('', 9999);
            const allIds = allDocs.map((doc) => doc.metadata?.id).filter((id) => !!id);
            if (allIds.length > 0) {
                await this.vectorStore.delete(allIds);
            }
            logger_1.logger.info('Chroma vector store cleared successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to clear Chroma vector store:', error);
            throw error;
        }
    }
    /**
     * Search for similar vectors
     */
    async searchSimilarVectors(vector, limit = 5, filter) {
        if (!this.vectorStore) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Convert filter to Chroma where clause
            const where = {};
            if (filter) {
                for (const key in filter) {
                    where[`metadata.${key}`] = filter[key];
                }
            }
            // Search for similar vectors
            // Chroma does not expose direct vector search; use similaritySearch with an empty string query and filter if needed
            const results = await this.vectorStore.similaritySearch('', limit);
            return results
                .filter((doc) => {
                if (!filter)
                    return true;
                return Object.entries(filter).every(([key, value]) => doc.metadata && doc.metadata[key] === value);
            })
                .map((doc) => ({
                id: doc.metadata?.id,
                score: doc.score || 1
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to search similar vectors:', error);
            return [];
        }
    }
}
exports.ChromaVectorStore = ChromaVectorStore;
//# sourceMappingURL=chromaVectorStore.js.map