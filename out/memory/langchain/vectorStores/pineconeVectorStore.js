"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PineconeVectorStore = void 0;
const pinecone_1 = require("@langchain/pinecone");
const documents_1 = require("@langchain/core/documents");
const logger_1 = require("../../../logger");
const config_1 = require("../../../config");
const pinecone_2 = require("@pinecone-database/pinecone");
/**
 * Pinecone vector store implementation
 */
class PineconeVectorStore {
    constructor(embeddings) {
        this.embeddings = embeddings;
        this.apiKey = (0, config_1.getConfig)('memory.vectorStore.pinecone.apiKey', '');
        this.environment = (0, config_1.getConfig)('memory.vectorStore.pinecone.environment', '');
        this.indexName = (0, config_1.getConfig)('memory.vectorStore.pinecone.indexName', 'codessa-memories');
    }
    /**
     * Initialize the vector store
     */
    async initialize() {
        try {
            if (!this.apiKey || !this.environment) {
                throw new Error('Pinecone API key and environment must be configured');
            }
            // Initialize Pinecone client
            this.pineconeClient = new pinecone_2.Pinecone({
                apiKey: this.apiKey,
                environment: this.environment
            });
            // IMPORTANT: The Pinecone index must be pre-created in the Pinecone dashboard.
            // This code assumes the index exists and is ready.
            const index = this.pineconeClient.index(this.indexName);
            // Initialize PineconeStore
            this.vectorStore = await pinecone_1.PineconeStore.fromExistingIndex(this.embeddings, {
                pineconeIndex: index
            });
            logger_1.logger.info(`Pinecone vector store initialized successfully with index ${this.indexName}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Pinecone vector store:', error);
            throw error;
        }
    }
    /**
     * Add a vector
     */
    async addVector(id, vector, metadata = {}) {
        if (!this.vectorStore || !this.pineconeClient) {
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
            // Get index
            const index = this.pineconeClient.index(this.indexName);
            // Add to vector store with pre-computed embedding
            await index.upsert([{
                    id,
                    values: vector,
                    metadata: {
                        ...metadata,
                        text: metadata.content || ''
                    }
                }]);
            logger_1.logger.debug(`Added vector with ID ${id} to Pinecone vector store`);
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
        if (!this.vectorStore || !this.pineconeClient) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Get index
            const index = this.pineconeClient.index(this.indexName);
            // Fetch vector
            const result = await index.fetch([id]);
            if (result.vectors[id]) {
                return result.vectors[id].values;
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
        if (!this.vectorStore || !this.pineconeClient) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Get index
            const index = this.pineconeClient.index(this.indexName);
            // Delete vector
            await index.deleteOne(id);
            logger_1.logger.debug(`Deleted vector with ID ${id} from Pinecone vector store`);
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
        if (!this.vectorStore || !this.pineconeClient) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Get index
            const index = this.pineconeClient.index(this.indexName);
            // Delete all vectors
            await index.deleteAll();
            logger_1.logger.info('Pinecone vector store cleared successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to clear Pinecone vector store:', error);
            throw error;
        }
    }
    /**
     * Search for similar vectors
     */
    async searchSimilarVectors(vector, limit = 5, filter) {
        if (!this.vectorStore || !this.pineconeClient) {
            throw new Error('Vector store not initialized');
        }
        try {
            // Get index
            const index = this.pineconeClient.index(this.indexName);
            // Search for similar vectors
            const results = await index.query({
                vector,
                topK: limit,
                includeMetadata: true,
                filter: filter
            });
            // Convert to expected format
            return (results.matches || []).map((match) => ({
                id: match.id,
                score: match.score
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to search similar vectors:', error);
            return [];
        }
    }
}
exports.PineconeVectorStore = PineconeVectorStore;
//# sourceMappingURL=pineconeVectorStore.js.map