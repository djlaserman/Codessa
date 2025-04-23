"use strict";
/**
 * Vector store integration for LangGraph workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryRetrievalTool = createMemoryRetrievalTool;
exports.createMemorySaveTool = createMemorySaveTool;
exports.createDocumentRetrievalTool = createDocumentRetrievalTool;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const logger_1 = require("../../logger");
const memoryManager_1 = require("../../memory/memoryManager");
const vectorMemory_1 = require("../../memory/vectorMemory");
class MemoryRetrievalTool extends tools_1.StructuredTool {
    constructor() {
        super(...arguments);
        this.name = 'memory-retrieval';
        this.description = 'Retrieves relevant memories based on the current conversation';
        this.schema = zod_1.z.object({
            input: zod_1.z.string().optional().describe('The query to search for in memories'),
            limit: zod_1.z.number().optional().describe('Maximum number of memories to retrieve'),
            threshold: zod_1.z.number().optional().describe('Similarity threshold for retrieval')
        });
    }
    async _call(input) {
        try {
            // Parse input
            const query = typeof input === 'string' ? input : input.query || '';
            const limit = typeof input === 'object' && input.limit ? input.limit : 5;
            const threshold = typeof input === 'object' && input.threshold ? input.threshold : 0.7;
            if (!query) {
                return 'No query provided for memory retrieval';
            }
            logger_1.logger.info(`Retrieving memories for query: "${query}" (limit: ${limit}, threshold: ${threshold})`);
            // Search for memories
            const searchOptions = {
                query,
                limit,
                threshold
            };
            // Try to use vector memory manager first
            let memories = [];
            try {
                if (vectorMemory_1.vectorMemoryManager) {
                    memories = await vectorMemory_1.vectorMemoryManager.searchSimilarMemories(query, limit);
                }
            }
            catch (error) {
                logger_1.logger.error('Error searching vector memories:', error);
            }
            // Fall back to regular memory manager if needed
            if (memories.length === 0) {
                try {
                    memories = await memoryManager_1.memoryManager.searchMemories(searchOptions);
                }
                catch (error) {
                    logger_1.logger.error('Error searching memories:', error);
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
        }
        catch (error) {
            logger_1.logger.error('Error in memory retrieval tool:', error);
            return `Error retrieving memories: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
class MemorySaveTool extends tools_1.StructuredTool {
    constructor() {
        super(...arguments);
        this.name = 'memory-save';
        this.description = 'Saves important information from the conversation to memory';
        this.schema = zod_1.z.object({
            input: zod_1.z.string().optional().describe('The content to save to memory'),
            metadata: zod_1.z.record(zod_1.z.any()).optional().describe('Additional metadata for the memory')
        });
    }
    async _call(input) {
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
            logger_1.logger.info(`Saving memory: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
            // Create memory entry
            const memoryEntry = {
                content,
                metadata: fullMetadata,
                timestamp: Date.now()
            };
            // Try to use vector memory manager first
            let success = false;
            try {
                if (vectorMemory_1.vectorMemoryManager) {
                    await memoryManager_1.memoryManager.addMemory({
                        content,
                        metadata: {
                            source: 'conversation',
                            type: 'memory',
                            ...fullMetadata
                        }
                    });
                    success = true;
                }
            }
            catch (error) {
                logger_1.logger.error('Error saving to vector memory:', error);
            }
            // Fall back to regular memory manager if needed
            if (!success) {
                try {
                    await memoryManager_1.memoryManager.addMemory({
                        content: typeof memoryEntry === 'string' ? memoryEntry : memoryEntry.content || '',
                        metadata: {
                            source: 'conversation',
                            type: 'memory',
                            ...(typeof memoryEntry === 'object' ? memoryEntry.metadata || {} : {})
                        }
                    });
                    success = true;
                }
                catch (error) {
                    logger_1.logger.error('Error saving memory:', error);
                    throw error;
                }
            }
            return 'Memory saved successfully';
        }
        catch (error) {
            logger_1.logger.error('Error in memory save tool:', error);
            return `Error saving memory: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
class DocumentRetrievalTool extends tools_1.StructuredTool {
    constructor() {
        super(...arguments);
        this.name = 'document-retrieval';
        this.description = 'Retrieves relevant documents based on a query';
        this.schema = zod_1.z.object({
            input: zod_1.z.string().optional().describe('The query to search for in documents'),
            limit: zod_1.z.number().optional().describe('Maximum number of documents to retrieve'),
            collection: zod_1.z.string().optional().describe('The collection to search in')
        });
    }
    async _call(input) {
        try {
            // Parse input
            const query = typeof input === 'string' ? input : input.query || '';
            const limit = typeof input === 'object' && input.limit ? input.limit : 5;
            const collection = typeof input === 'object' && input.collection ? input.collection : 'documents';
            if (!query) {
                return 'No query provided for document retrieval';
            }
            logger_1.logger.info(`Retrieving documents for query: "${query}" (limit: ${limit}, collection: ${collection})`);
            // Search for documents
            const searchOptions = {
                query,
                limit,
                filter: {
                    type: 'document',
                    collection
                }
            };
            // Try to use vector memory manager first
            let documents = [];
            try {
                if (vectorMemory_1.vectorMemoryManager) {
                    documents = await vectorMemory_1.vectorMemoryManager.searchSimilarMemories(query, limit);
                }
            }
            catch (error) {
                logger_1.logger.error('Error searching vector documents:', error);
            }
            // Fall back to regular memory manager if needed
            if (documents.length === 0) {
                try {
                    documents = await memoryManager_1.memoryManager.searchMemories(searchOptions);
                }
                catch (error) {
                    logger_1.logger.error('Error searching documents:', error);
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
        }
        catch (error) {
            logger_1.logger.error('Error in document retrieval tool:', error);
            return `Error retrieving documents: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
/**
 * Create a memory retrieval tool that uses the vector memory manager
 */
function createMemoryRetrievalTool() {
    return new MemoryRetrievalTool();
}
/**
 * Create a memory save tool that uses the vector memory manager
 */
function createMemorySaveTool() {
    return new MemorySaveTool();
}
/**
 * Create a document retrieval tool that uses the vector memory manager
 */
function createDocumentRetrievalTool() {
    return new DocumentRetrievalTool();
}
//# sourceMappingURL=vectorStores.js.map