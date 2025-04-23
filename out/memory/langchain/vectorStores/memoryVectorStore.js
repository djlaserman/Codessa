"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryVectorStore = void 0;
const documents_1 = require("@langchain/core/documents");
const logger_1 = require("../../../logger");
/**
 * In-memory vector store implementation
 */
class MemoryVectorStore {
    constructor(embeddings) {
        this.documents = [];
        this.embeddings = embeddings;
    }
    /**
     * Initialize the vector store
     */
    async initialize() {
        try {
            logger_1.logger.info('Memory vector store initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize memory vector store:', error);
            throw error;
        }
    }
    /**
     * Add documents
     */
    async addDocuments(documents) {
        try {
            this.documents.push(...documents);
            logger_1.logger.debug(`Added ${documents.length} documents to memory vector store`);
        }
        catch (error) {
            logger_1.logger.error('Failed to add documents:', error);
            throw error;
        }
    }
    /**
     * Add a vector
     */
    async addVector(id, vector, metadata = {}) {
        try {
            // Create document
            const document = new documents_1.Document({
                pageContent: metadata.content || '',
                metadata: {
                    ...metadata,
                    id
                }
            });
            // Add document
            await this.addDocuments([document]);
            logger_1.logger.debug(`Added vector with ID ${id} to memory vector store`);
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
        try {
            logger_1.logger.warn('Getting vectors by ID is not supported by MemoryVectorStore');
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
        try {
            logger_1.logger.warn('Deleting vectors by ID is not supported by MemoryVectorStore');
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
        try {
            this.documents = [];
            logger_1.logger.info('Memory vector store cleared successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to clear memory vector store:', error);
            throw error;
        }
    }
    /**
     * Search for similar vectors
     */
    async searchSimilarVectors(vector, limit = 5, filter) {
        try {
            logger_1.logger.error('Failed to search similar vectors: Not implemented');
            return [];
        }
        catch (error) {
            logger_1.logger.error('Failed to search similar vectors:', error);
            return [];
        }
    }
    /**
     * Search for similar documents
     */
    async similaritySearch(query, k = 4) {
        try {
            // Simple implementation that returns all documents
            // In a real implementation, this would use embeddings and vector similarity
            return this.documents.slice(0, k).map(doc => ({
                pageContent: doc.pageContent,
                metadata: doc.metadata
            }));
        }
        catch (error) {
            logger_1.logger.error('Failed to perform similarity search:', error);
            return [];
        }
    }
}
exports.MemoryVectorStore = MemoryVectorStore;
//# sourceMappingURL=memoryVectorStore.js.map