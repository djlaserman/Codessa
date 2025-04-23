"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorStoreFactory = void 0;
const memoryVectorStore_1 = require("./memoryVectorStore");
const chromaVectorStore_1 = require("./chromaVectorStore");
const pineconeVectorStore_1 = require("./pineconeVectorStore");
const logger_1 = require("../../../logger");
/**
 * Factory for creating vector stores
 */
class VectorStoreFactory {
    /**
     * Create a vector store
     * @param type Vector store type
     * @param embeddings Embeddings
     * @returns Vector store instance
     */
    static async createVectorStore(type, embeddings) {
        logger_1.logger.info(`Creating vector store of type: ${type}`);
        switch (type) {
            case 'memory':
                return new memoryVectorStore_1.MemoryVectorStore(embeddings);
            case 'chroma':
                return new chromaVectorStore_1.ChromaVectorStore(embeddings);
            case 'pinecone':
                return new pineconeVectorStore_1.PineconeVectorStore(embeddings);
            default:
                logger_1.logger.warn(`Unknown vector store type: ${type}, falling back to memory vector store`);
                return new memoryVectorStore_1.MemoryVectorStore(embeddings);
        }
    }
}
exports.VectorStoreFactory = VectorStoreFactory;
//# sourceMappingURL=vectorStoreFactory.js.map