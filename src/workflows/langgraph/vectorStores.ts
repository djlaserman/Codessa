/**
 * Vector store integration for LangGraph workflows
 */

import { StructuredTool } from './corePolyfill';
// @ts-ignore
import { z } from 'zod';
import { logger } from '../../logger';
import { memoryManager } from '../../memory/memoryManager';
import { vectorMemoryManager } from '../../memory/vectorMemory';
import { MemoryEntry, MemorySearchOptions } from '../../memory/types';

class MemoryRetrievalTool extends StructuredTool {
    name = 'memory-retrieval';
    description = 'Retrieves relevant memories based on the current conversation';
    schema = z.object({
        input: z.string().optional().describe('The query to search for in memories'),
        limit: z.number().optional().describe('Maximum number of memories to retrieve'),
        threshold: z.number().optional().describe('Similarity threshold for retrieval')
    });

    async _call(input: any): Promise<string> {
        try {
            // Parse input
            const query = typeof input === 'string' ? input : input.query || '';
            const limit = typeof input === 'object' && input.limit ? input.limit : 5;
            const threshold = typeof input === 'object' && input.threshold ? input.threshold : 0.7;

            if (!query) {
                return 'No query provided for memory retrieval';
            }

            logger.info(`Retrieving memories for query: "${query}" (limit: ${limit}, threshold: ${threshold})`);

            // Search for memories
            const searchOptions: MemorySearchOptions = {
                query,
                limit,
                threshold
            };

            // Try to use vector memory manager first
            let memories: MemoryEntry[] = [];
            try {
                if (vectorMemoryManager) {
                    memories = await vectorMemoryManager.searchSimilarMemories(query, limit);
                }
            } catch (error) {
                logger.error('Error searching vector memories:', error);
            }

            // Fall back to regular memory manager if needed
            if (memories.length === 0) {
                try {
                    memories = await memoryManager.searchMemories(searchOptions);
                } catch (error) {
                    logger.error('Error searching memories:', error);
                }
            }

            if (memories.length === 0) {
                return 'No relevant memories found';
            }

            // Format memories
            const formattedMemories = memories.map((memory, index) => {
                const timestamp = new Date(memory.timestamp).toLocaleString();
                const source = memory.metadata?.source || 'unknown';
                return `Memory ${index + 1} [${timestamp}] (Source: ${source}):\n${memory.content}`;
            }).join('\n\n');

            return `Retrieved ${memories.length} relevant memories:\n\n${formattedMemories}`;
        } catch (error) {
            logger.error('Error in memory retrieval tool:', error);
            return `Error retrieving memories: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}

class MemorySaveTool extends StructuredTool {
    name = 'memory-save';
    description = 'Saves important information from the conversation to memory';
    schema = z.object({
        input: z.string().optional().describe('The content to save to memory'),
        metadata: z.record(z.any()).optional().describe('Additional metadata for the memory')
    });

    async _call(input: any): Promise<string> {
        try {
            // Parse input
            const content = typeof input === 'string' ? input : input.content || '';
            const metadata = typeof input === 'object' && input.metadata ? input.metadata : {};

            if (!content) {
                return 'No content provided for memory save';
            }

            // Add default metadata
            const fullMetadata = {
                source: 'workflow',
                type: 'memory',
                ...metadata
            };

            logger.info(`Saving memory: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);

            // Create memory entry
            const memoryEntry: Partial<MemoryEntry> = {
                content,
                metadata: fullMetadata,
                timestamp: Date.now()
            };

            // Try to use vector memory manager first
            let success = false;
            try {
                if (vectorMemoryManager) {
                    await memoryManager.addMemory({
                        content,
                        metadata: {
                            source: 'conversation',
                            type: 'memory',
                            ...fullMetadata
                        }
                    });
                    success = true;
                }
            } catch (error) {
                logger.error('Error saving to vector memory:', error);
            }

            // Fall back to regular memory manager if needed
            if (!success) {
                try {
                    await memoryManager.addMemory({
                        content: typeof memoryEntry === 'string' ? memoryEntry : memoryEntry.content || '',
                        metadata: {
                            source: 'conversation',
                            type: 'memory',
                            ...(typeof memoryEntry === 'object' ? memoryEntry.metadata || {} : {})
                        }
                    });
                    success = true;
                } catch (error) {
                    logger.error('Error saving memory:', error);
                    throw error;
                }
            }

            return 'Memory saved successfully';
        } catch (error) {
            logger.error('Error in memory save tool:', error);
            return `Error saving memory: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}

class DocumentRetrievalTool extends StructuredTool {
    name = 'document-retrieval';
    description = 'Retrieves relevant documents based on a query';
    schema = z.object({
        input: z.string().optional().describe('The query to search for in documents'),
        limit: z.number().optional().describe('Maximum number of documents to retrieve'),
        collection: z.string().optional().describe('The collection to search in')
    });

    async _call(input: any): Promise<string> {
        try {
            // Parse input
            const query = typeof input === 'string' ? input : input.query || '';
            const limit = typeof input === 'object' && input.limit ? input.limit : 5;
            const collection = typeof input === 'object' && input.collection ? input.collection : 'documents';

            if (!query) {
                return 'No query provided for document retrieval';
            }

            logger.info(`Retrieving documents for query: "${query}" (limit: ${limit}, collection: ${collection})`);

            // Search for documents
            const searchOptions: MemorySearchOptions = {
                query,
                limit,
                filter: {
                    type: 'document',
                    collection
                }
            };

            // Try to use vector memory manager first
            let documents: MemoryEntry[] = [];
            try {
                if (vectorMemoryManager) {
                    documents = await vectorMemoryManager.searchSimilarMemories(query, limit);
                }
            } catch (error) {
                logger.error('Error searching vector documents:', error);
            }

            // Fall back to regular memory manager if needed
            if (documents.length === 0) {
                try {
                    documents = await memoryManager.searchMemories(searchOptions);
                } catch (error) {
                    logger.error('Error searching documents:', error);
                }
            }

            if (documents.length === 0) {
                return 'No relevant documents found';
            }

            // Format documents
            const formattedDocuments = documents.map((doc, index) => {
                const source = doc.metadata?.source || 'unknown';
                const title = doc.metadata?.title || `Document ${index + 1}`;
                return `Document: ${title} (Source: ${source})\n${doc.content}`;
            }).join('\n\n');

            return `Retrieved ${documents.length} relevant documents:\n\n${formattedDocuments}`;
        } catch (error) {
            logger.error('Error in document retrieval tool:', error);
            return `Error retrieving documents: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}

/**
 * Create a memory retrieval tool that uses the vector memory manager
 */
export function createMemoryRetrievalTool(): StructuredTool {
    return new MemoryRetrievalTool();
}

/**
 * Create a memory save tool that uses the vector memory manager
 */
export function createMemorySaveTool(): StructuredTool {
    return new MemorySaveTool();
}

/**
 * Create a document retrieval tool that uses the vector memory manager
 */
export function createDocumentRetrievalTool(): StructuredTool {
    return new DocumentRetrievalTool();
}
