import { Embeddings } from '../../../workflows/langgraph/corePolyfill';
import { IVectorStore } from '../../types';
import { MemoryVectorStore } from './memoryVectorStore';
import { ChromaVectorStore } from './chromaVectorStore';
import { PineconeVectorStore } from './pineconeVectorStore';
import { logger } from '../../../logger';

/**
 * Factory for creating vector stores
 */
export class VectorStoreFactory {
    /**
     * Create a vector store
     * @param type Vector store type
     * @param embeddings Embeddings
     * @returns Vector store instance
     */
    public static async createVectorStore(type: string, embeddings: Embeddings): Promise<IVectorStore> {
        logger.info(`Creating vector store of type: ${type}`);
        
        switch (type) {
            case 'memory':
                return new MemoryVectorStore(embeddings);
            case 'chroma':
                return new ChromaVectorStore(embeddings);
            case 'pinecone':
                return new PineconeVectorStore(embeddings);
            default:
                logger.warn(`Unknown vector store type: ${type}, falling back to memory vector store`);
                return new MemoryVectorStore(embeddings);
        }
    }
}
