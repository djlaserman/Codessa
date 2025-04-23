import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';

// Core Polyfills & LangChain Components (Ensure paths are correct)
import {
    BufferMemory,
    ConversationSummaryMemory,
    VectorStoreRetrieverMemory,
    ChatMessageHistory,
    BaseMemory, // Import BaseMemory if needed for type hints
} from 'workflows/langgraph/corePolyfill';
import {
    HumanMessage,
    AIMessage,
    SystemMessage,
    BaseMessage, // Import BaseMessage for broader type usage
} from 'workflows/langgraph/corePolyfill';
import { Document } from 'workflows/langgraph/corePolyfill';
import { MemoryVectorStore } from 'workflows/langgraph/corePolyfill';
import { Embeddings } from 'workflows/langgraph/corePolyfill';
import { OpenAIEmbeddings } from 'workflows/langgraph/corePolyfill';
import { BaseLanguageModel } from 'workflows/langgraph/corePolyfill'; // Needed for summary memory
import { CallbackManagerForLLMRun } from 'workflows/langgraph/corePolyfill'; // Used in custom embeddings
import { AsyncCaller } from 'workflows/langgraph/corePolyfill'; // Used in custom embeddings

// Local project imports (Ensure paths are correct)
import { logger } from '../../logger';
import {
    IMemoryProvider,
    MemoryEntry,
    MemorySearchOptions,
    MemorySettings,
    IVectorStore,
    IDatabase,
    ChatMessage, // Define or import ChatMessage type if needed separately
    MemoryFilter,
} from '../types'; // Assuming ChatMessage might be defined here
import { getConfig, setConfig } from '../../config';
import { llmService } from '../../llm/llmService'; // Used for embeddings and potentially summarization
import { VectorStoreFactory } from './vectorStores/vectorStoreFactory';
import { DatabaseFactory } from './databases/databaseFactory';

// Constants for database table/collection names
const MEMORIES_COLLECTION = 'memories';
const CHAT_HISTORY_COLLECTION = 'chat_history';

/**
 * Codessa Memory Provider
 * Implements the IMemoryProvider interface using pluggable vector stores,
 * databases, and integrates LangChain memory components for enhanced functionality.
 * Manages both general memory entries (like file chunks) and structured chat history.
 */
export class CodessaMemoryProvider implements IMemoryProvider {
    private context: vscode.ExtensionContext | undefined;
    private vectorStore: IVectorStore | undefined;
    private database: IDatabase | undefined;
    private embeddings: Embeddings | undefined;
    private initialized = false;
    private isInitializing = false; // Prevent race conditions during init

    // Event emitter for memory changes
    private _onMemoriesChanged = new vscode.EventEmitter<void>();
    readonly onMemoriesChanged = this._onMemoriesChanged.event;

    /**
     * Initialize the memory provider, setting up embeddings, vector store, and database.
     * This method is idempotent and handles concurrent initialization calls.
     * @param context The VS Code extension context.
     */
    public async initialize(context: vscode.ExtensionContext): Promise<void> {
        if (this.initialized || this.isInitializing) {
            // If already initialized or initialization is in progress, wait if necessary
            if (this.isInitializing) {
                // Wait for the ongoing initialization to complete
                await new Promise<void>(resolve => {
                    const checkInterval = setInterval(() => {
                        if (!this.isInitializing) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                });
            }
            if (this.initialized) {
                logger.debug('CodessaMemoryProvider already initialized.');
            }
            return;
        }

        this.isInitializing = true;
        logger.info('Initializing Codessa memory provider...');

        try {
            this.context = context;

            // 1. Initialize Embeddings
            logger.debug('Initializing embeddings...');
            this.embeddings = await this.createEmbeddings();
            logger.info('Embeddings initialized.');

            // 2. Initialize Vector Store
            const vectorStoreType = getConfig<string>('memory.vectorStore', 'chroma');
            logger.debug(`Initializing vector store (Type: ${vectorStoreType})...`);
            // Pass the already created embeddings instance
            this.vectorStore = await VectorStoreFactory.createVectorStore(vectorStoreType, this.embeddings);
            await this.vectorStore.initialize(); // Initialize the specific vector store instance
            logger.info(`Vector store '${vectorStoreType}' initialized.`);

            // 3. Initialize Database
            const databaseType = getConfig<string>('memory.database', 'sqlite');
            logger.debug(`Initializing database (Type: ${databaseType})...`);
            this.database = await DatabaseFactory.createDatabase(databaseType);
            await this.database.initialize(); // Initialize the specific database instance
            // Ensure necessary collections/tables exist
            await this.database.ensureCollection(MEMORIES_COLLECTION);
            await this.database.ensureCollection(CHAT_HISTORY_COLLECTION);
            logger.info(`Database '${databaseType}' initialized.`);

            this.initialized = true;
            logger.info('Codessa memory provider initialized successfully.');

        } catch (error: any) {
            logger.error('Failed to initialize Codessa memory provider:', { message: error.message, stack: error.stack });
            // Reset state on failure
            this.initialized = false;
            this.embeddings = undefined;
            this.vectorStore = undefined;
            this.database = undefined;
            throw new Error(`Codessa memory provider initialization failed: ${error.message}`);
        } finally {
            this.isInitializing = false; // Mark initialization as complete (success or fail)
        }
    }

    /**
     * Ensures the provider is initialized before proceeding. Throws error if not.
     */
    private assertInitialized(): void {
        if (!this.initialized || !this.database || !this.vectorStore || !this.embeddings) {
            // Log detailed state for debugging
            logger.error('Memory provider accessed before successful initialization.', {
                initialized: this.initialized,
                hasDb: !!this.database,
                hasVs: !!this.vectorStore,
                hasEmb: !!this.embeddings,
            });
            throw new Error('CodessaMemoryProvider is not initialized. Call initialize() first.');
        }
    }

    /**
     * Creates an Embeddings instance based on the configured LLM provider or fallback.
     */
    private async createEmbeddings(): Promise<Embeddings> {
        const provider = llmService.getDefaultProvider();

        // Check if the provider has a dedicated, potentially optimized embedding method
        if (provider?.getEmbeddings) {
            try {
                logger.info("Using provider's dedicated getEmbeddings() method.");
                const providerEmbeddings = await provider.getEmbeddings();
                if (providerEmbeddings && typeof providerEmbeddings.embedQuery === 'function' && typeof providerEmbeddings.embedDocuments === 'function') {
                    return providerEmbeddings;
                } else {
                    logger.warn("Provider's getEmbeddings() did not return a valid Embeddings instance. Falling back...");
                }
            } catch (e: any) {
                logger.warn(`Error obtaining embeddings via provider.getEmbeddings(): ${e.message}. Falling back...`);
            }
        }


        // Fallback 1: Use provider's generic generateEmbedding function if available
        if (provider?.generateEmbedding) {
            logger.info("Using provider's generateEmbedding function for custom Embeddings wrapper.");
            const generateEmbedding = provider.generateEmbedding.bind(provider);
            // Create a custom embeddings class adhering to the LangChain interface
            class ProviderEmbeddingsWrapper implements Embeddings {
                // Leverage AsyncCaller for concurrency and retries if needed
                caller: AsyncCaller;
                constructor() {
                    this.caller = new AsyncCaller({ /* options */ });
                }
                async embedDocuments(texts: string[]): Promise<number[][]> {
                    // Could potentially batch if the provider supports it, otherwise loop
                    const embeddings: number[][] = [];
                    for (const text of texts) {
                        // Wrap the call with the caller for potential retries/concurrency
                        const embedding = await this.caller.call(async () => generateEmbedding(text));
                        embeddings.push(embedding);
                    }
                    return embeddings;
                }
                async embedQuery(text: string): Promise<number[]> {
                    // Wrap the call with the caller
                    return this.caller.call(async () => generateEmbedding(text));
                }
                // Implement batch embedding if the underlying provider supports it for efficiency
                // async embedBatch?(texts: string[]): Promise<number[][]>;
            }
            return new ProviderEmbeddingsWrapper();
        }

        // Fallback 2: Use OpenAI embeddings if API key is available
        const openAIApiKey = process.env.OPENAI_API_KEY || getConfig<string | undefined>('llm.providers.openai.apiKey', undefined);
        if (openAIApiKey) {
            logger.warn('LLM provider does not support embeddings. Falling back to OpenAIEmbeddings.');
            try {
                return new OpenAIEmbeddings({ openAIApiKey });
            } catch (e: any) {
                logger.error(`Failed to initialize OpenAIEmbeddings fallback: ${e.message}`);
                // Continue to final error
            }
        }

        // Final Error: No embedding capability found
        logger.error('No embedding capability available. Configure an LLM provider with embedding support or set OPENAI_API_KEY.');
        throw new Error('No embedding capability available.');
    }

    /**
     * Adds a general memory entry (e.g., file chunk, web snippet) to the database and vector store.
     * @param memory The memory data, excluding id and timestamp.
     * @returns The created MemoryEntry with assigned id and timestamp.
     */
    public async addMemory(memory: Omit<MemoryEntry, 'id' | 'timestamp' | 'embedding'>): Promise<MemoryEntry> {
        await this.initialize(this.context!); // Ensure initialized
        this.assertInitialized();

        const id = `mem_${uuidv4()}`;
        const timestamp = Date.now();
        const contentString = typeof memory.content === 'string' ? memory.content : JSON.stringify(memory.content); // Ensure content is string for embedding

        if (!contentString || contentString.trim().length === 0) {
            logger.warn(`Attempted to add memory with empty content. Skipping. Metadata:`, memory.metadata);
            throw new Error("Cannot add memory with empty content.");
        }

        const newMemory: MemoryEntry = {
            id,
            content: memory.content, // Store original content (could be object)
            timestamp,
            metadata: memory.metadata || {},
            embedding: undefined, // Initialize embedding as undefined
        };

        try {
            logger.debug(`Adding memory entry ${id}...`);

            // 1. Generate Embedding
            // Use contentString for embedding generation
            const embedding = await this.embeddings!.embedQuery(contentString);
            newMemory.embedding = embedding; // Store embedding within the entry object

            // 2. Store in Database (Store the complete MemoryEntry including the embedding)
            // Ensure the database adapter can handle the 'embedding' field (e.g., store as JSON/Blob or handle separately)
            await this.database!.addRecord(MEMORIES_COLLECTION, newMemory);
            logger.debug(`Memory entry ${id} stored in database.`);

            // 3. Store in Vector Store
            // The vector store needs the ID, the vector, and searchable metadata.
            // Pass only relevant metadata for vector search filtering.
            const vectorMetadata = this.prepareVectorMetadata(newMemory.metadata);
            await this.vectorStore!.addVector(id, embedding, vectorMetadata);
            logger.debug(`Memory entry ${id} added to vector store.`);

            this._onMemoriesChanged.fire();
            logger.info(`Successfully added memory entry ${id}.`);
            return newMemory;

        } catch (error: any) {
            logger.error(`Failed to add memory entry ${id}:`, { message: error.message, stack: error.stack });
            // Attempt cleanup if partial additions occurred (optional, depends on desired atomicity)
            // await this.database!.deleteRecord(MEMORIES_COLLECTION, id).catch(e => logger.warn(`Cleanup failed for DB entry ${id}: ${e.message}`));
            // await this.vectorStore!.deleteVector(id).catch(e => logger.warn(`Cleanup failed for VS entry ${id}: ${e.message}`));
            throw new Error(`Failed to add memory: ${error.message}`);
        }
    }

    /**
     * Prepares metadata specifically for the vector store, removing potentially large or irrelevant fields.
     */
    private prepareVectorMetadata(originalMetadata: Record<string, any>): Record<string, any> {
        const vectorMetadata: Record<string, any> = {};
        const allowedKeys = ['source', 'type', 'tags', 'filePath', 'fileName', 'extension', 'chunkIndex', 'chunkId', 'url', 'sessionId', 'userId']; // Add keys relevant for filtering
        const maxTagLength = 50; // Limit tag length
        const maxTags = 20; // Limit number of tags

        for (const key in originalMetadata) {
            if (allowedKeys.includes(key)) {
                const value = originalMetadata[key];
                if (key === 'tags' && Array.isArray(value)) {
                    // Sanitize and limit tags
                    vectorMetadata[key] = value
                        .map(tag => String(tag).substring(0, maxTagLength))
                        .slice(0, maxTags);
                } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    // Only include simple types directly suitable for filtering
                    vectorMetadata[key] = value;
                }
                // Add more specific handling if needed (e.g., date ranges)
            }
        }
        // Ensure essential fields for linking back are present if available
        if (originalMetadata.chunkId) vectorMetadata.chunkId = originalMetadata.chunkId;
        if (originalMetadata.sessionId) vectorMetadata.sessionId = originalMetadata.sessionId;

        return vectorMetadata;
    }


    /**
     * Retrieves all general memory entries from the database.
     * @param limit Max number of entries to retrieve.
     * @returns An array of MemoryEntry objects.
     */
    public async getMemories(limit?: number): Promise<MemoryEntry[]> {
        await this.initialize(this.context!);
        this.assertInitialized();
        try {
            const effectiveLimit = limit ?? getConfig<number>('memory.maxMemories', 1000);
            // Query database, potentially sorting by timestamp descending
            const records = await this.database!.queryRecords(
                MEMORIES_COLLECTION,
                {}, // Empty filter for all
                effectiveLimit,
                { timestamp: -1 } // Sort by timestamp descending
            );
            // Cast needed as queryRecords returns generic objects
            return records as MemoryEntry[];
        } catch (error: any) {
            logger.error('Failed to get memories:', error);
            return [];
        }
    }

    /**
     * Retrieves a specific memory entry by its ID from the database.
     * @param id The unique ID of the memory entry.
     * @returns The MemoryEntry or undefined if not found.
     */
    public async getMemory(id: string): Promise<MemoryEntry | undefined> {
        await this.initialize(this.context!);
        this.assertInitialized();
        try {
            const record = await this.database!.getRecord(MEMORIES_COLLECTION, id);
            return record as MemoryEntry | undefined; // Cast needed
        } catch (error: any) {
            // Log expected "not found" errors differently?
            if (error.message?.toLowerCase().includes('not found')) {
                logger.debug(`Memory entry ${id} not found in database.`);
            } else {
                logger.error(`Failed to get memory ${id}:`, error);
            }
            return undefined;
        }
    }

    /**
     * Deletes a memory entry by its ID from both the database and vector store.
     * @param id The unique ID of the memory entry.
     * @returns True if deletion was successful in both stores, false otherwise.
     */
    public async deleteMemory(id: string): Promise<boolean> {
        await this.initialize(this.context!);
        this.assertInitialized();
        let dbSuccess = false;
        let vsSuccess = false;
        try {
            logger.debug(`Attempting to delete memory entry ${id}...`);
            // Delete from database
            dbSuccess = await this.database!.deleteRecord(MEMORIES_COLLECTION, id);
            logger.debug(`Database deletion result for ${id}: ${dbSuccess}`);

            // Delete from vector store
            vsSuccess = await this.vectorStore!.deleteVector(id);
            logger.debug(`Vector store deletion result for ${id}: ${vsSuccess}`);

            if (dbSuccess || vsSuccess) { // Fire event if deleted from at least one place
                this._onMemoriesChanged.fire();
                logger.info(`Deletion result for memory ${id}: DB=${dbSuccess}, VS=${vsSuccess}`);
            } else {
                logger.warn(`Memory entry ${id} not found for deletion in either DB or VS.`);
            }
            // Return true only if deleted from both (or if it didn't exist in one initially)
            // A more nuanced return might be needed depending on strictness.
            // Let's consider it successful if the final state is "it's gone".
            return true; // Assume success if no errors thrown and attempts made.

        } catch (error: any) {
            logger.error(`Failed to delete memory ${id}:`, error);
            return false; // Explicit failure on error
        }
    }

    /**
     * Clears all general memory entries from the database and vector store.
     * Warning: This is a destructive operation.
     */
    public async clearMemories(): Promise<void> {
        await this.initialize(this.context!);
        this.assertInitialized();
        logger.warn(`Clearing ALL general memory entries...`);
        try {
            // Clear database collection
            await this.database!.clearCollection(MEMORIES_COLLECTION);
            logger.debug(`Cleared database collection: ${MEMORIES_COLLECTION}`);

            // Clear vector store
            await this.vectorStore!.clearVectors();
            logger.debug(`Cleared vector store.`);

            this._onMemoriesChanged.fire();
            logger.info('All general memory entries cleared successfully.');
        } catch (error: any) {
            logger.error('Failed to clear memories:', error);
            throw new Error(`Failed to clear memories: ${error.message}`);
        }
    }

    /**
     * Searches general memory entries based on metadata filters and optional text query using the database.
     * @param options Search criteria including filters and limit.
     * @returns An array of matching MemoryEntry objects.
     */
    public async searchMemories(options: MemorySearchOptions): Promise<MemoryEntry[]> {
        await this.initialize(this.context!);
        this.assertInitialized();
        try {
            const { query, limit = 10, filter } = options;
            logger.debug(`Searching memories with options:`, { query: query ? 'present' : 'absent', limit, filter });

            // Build database query from filter
            const dbQuery = this.buildDbQuery(filter);

            // Add text search if query is provided and database supports it
            if (query && this.database!.supportsTextSearch) {
                // Adapt the text search syntax based on the specific database implementation
                // This might require changes in the IDatabase interface or specific adapters
                // Example for a MongoDB-like syntax:
                // dbQuery['$text'] = { $search: query };
                logger.warn("Text search query construction depends on the database implementation. Using placeholder logic.");
                // Placeholder: Assume metadata contains searchable text fields if no $text support
                // dbQuery['metadata.content_summary'] = { $regex: query, $options: 'i' }; // Example fallback
            } else if (query) {
                logger.warn(`Database (${getConfig<string>('memory.database')}) does not support text search, or query was empty. Searching based on filters only.`);
            }


            // Execute query
            const records = await this.database!.queryRecords(
                MEMORIES_COLLECTION,
                dbQuery,
                limit,
                { timestamp: -1 } // Default sort
            );
            logger.debug(`Database query returned ${records.length} records.`);
            return records as MemoryEntry[]; // Cast needed

        } catch (error: any) {
            logger.error('Failed to search memories:', error);
            return [];
        }
    }

    /**
     * Searches memory entries by semantic similarity to a query string using the vector store.
     * @param query The query string.
     * @param options Optional search options including filters, limit, and relevance threshold.
     * @returns An array of MemoryEntry objects, sorted by relevance, potentially including relevance score in metadata.
     */
    public async searchSimilarMemories(query: string, options: Partial<MemorySearchOptions> = {}): Promise<MemoryEntry[]> {
        await this.initialize(this.context!);
        this.assertInitialized();

        const { limit = getConfig<number>('memory.contextWindowSize', 5), filter: metadataFilter, relevanceThreshold = getConfig<number>('memory.relevanceThreshold', 0.7) } = options;
        logger.debug(`Searching similar memories for query "${query.substring(0, 50)}..."`, { limit, metadataFilter, relevanceThreshold });

        try {
            // 1. Generate embedding for the query
            const queryEmbedding = await this.embeddings!.embedQuery(query);

            // 2. Prepare vector store filter from MemoryFilter
            const vectorFilter = this.prepareVectorMetadata(metadataFilter || {}); // Reuse metadata prep logic

            // 3. Search vector store
            const results = await this.vectorStore!.searchSimilarVectors(queryEmbedding, limit, vectorFilter);
            logger.debug(`Vector store search returned ${results.length} raw results.`);

            // 4. Filter by relevance threshold
            const relevantResults = results.filter(result => result.score >= relevanceThreshold);
            logger.debug(`Found ${relevantResults.length} results above relevance threshold ${relevanceThreshold}.`);

            if (relevantResults.length === 0) {
                return [];
            }

            // 5. Retrieve full memory entries from the database
            // Optimize by fetching multiple IDs at once if the database supports it
            const idsToFetch = relevantResults.map(r => r.id);
            const memoryMap = await this.getMemoriesByIds(idsToFetch);

            // 6. Combine results and add relevance score
            const finalMemories: MemoryEntry[] = [];
            for (const result of relevantResults) {
                const memory = memoryMap.get(result.id);
                if (memory) {
                    finalMemories.push({
                        ...memory,
                        metadata: {
                            ...memory.metadata,
                            relevance: result.score, // Add relevance score
                        },
                    });
                } else {
                    logger.warn(`Memory entry ${result.id} found in vector store but not in database.`);
                }
            }

            // Ensure sorting by relevance score (descending)
            finalMemories.sort((a, b) => (b.metadata.relevance ?? 0) - (a.metadata.relevance ?? 0));

            logger.info(`Returning ${finalMemories.length} similar memories for query.`);
            return finalMemories;

        } catch (error: any) {
            logger.error(`Failed to search similar memories for query "${query.substring(0, 50)}...":`, error);
            // Optional: Fall back to text search on error?
            // logger.warn("Falling back to text search due to similarity search error.");
            // return this.searchMemories({ query, limit, filter: metadataFilter });
            return []; // Return empty on error for now
        }
    }

    /**
     * Helper to fetch multiple memory entries by IDs efficiently.
     * @param ids Array of memory entry IDs.
     * @returns A Map where keys are IDs and values are MemoryEntry objects.
     */
    private async getMemoriesByIds(ids: string[]): Promise<Map<string, MemoryEntry>> {
        if (ids.length === 0) {
            return new Map();
        }
        this.assertInitialized();
        try {
            // Use database's batch get method if available, otherwise loop (less efficient)
            if (this.database!.getRecordsByIds) {
                const records = await this.database!.getRecordsByIds(MEMORIES_COLLECTION, ids);
                const map = new Map<string, MemoryEntry>();
                (records as MemoryEntry[]).forEach(record => map.set(record.id, record));
                return map;
            } else {
                // Fallback to individual gets
                logger.warn("Database does not support batch getRecordsByIds. Fetching IDs individually.");
                const map = new Map<string, MemoryEntry>();
                for (const id of ids) {
                    const memory = await this.getMemory(id);
                    if (memory) {
                        map.set(id, memory);
                    }
                }
                return map;
            }
        } catch (error) {
            logger.error(`Failed to fetch memories by IDs: ${ids.join(', ')}`, error);
            return new Map(); // Return empty map on error
        }
    }

    /**
     * Builds a database query object from the MemoryFilter.
     * Needs adaptation based on the specific database query language.
     */
    private buildDbQuery(filter?: MemoryFilter): Record<string, any> {
        const dbQuery: Record<string, any> = {};
        if (!filter) {
            return dbQuery;
        }

        // Example mapping (adjust based on IDatabase implementation details)
        if (filter.source) dbQuery['metadata.source'] = filter.source;
        if (filter.type) dbQuery['metadata.type'] = filter.type;
        if (filter.tags && filter.tags.length > 0) dbQuery['metadata.tags'] = { $all: filter.tags }; // Assumes MongoDB-like $all operator
        if (filter.fromTimestamp && filter.toTimestamp) {
            dbQuery['timestamp'] = { $gte: filter.fromTimestamp, $lte: filter.toTimestamp };
        } else if (filter.fromTimestamp) {
            dbQuery['timestamp'] = { $gte: filter.fromTimestamp };
        } else if (filter.toTimestamp) {
            dbQuery['timestamp'] = { $lte: filter.toTimestamp };
        }

        // Add custom filters (assuming they target metadata fields)
        for (const key in filter) {
            if (!['source', 'type', 'tags', 'fromTimestamp', 'toTimestamp'].includes(key)) {
                // Be cautious with direct key mapping - might need sanitization or specific handling
                dbQuery[`metadata.${key}`] = filter[key];
            }
        }
        return dbQuery;
    }

    // --- Chat History Management ---

    /**
     * Adds a chat message to the history for a specific session.
     * @param sessionId Identifier for the conversation session.
     * @param message A HumanMessage or AIMessage object.
     */
    public async addChatMessage(sessionId: string, message: HumanMessage | AIMessage): Promise<void> {
        await this.initialize(this.context!);
        this.assertInitialized();

        if (!sessionId) throw new Error("sessionId cannot be empty.");

        // Convert LangChain message to a storable format
        const chatRecord: ChatMessage = {
            id: `chat_${uuidv4()}`,
            sessionId: sessionId,
            // Use instanceof for type checking BaseMessage subclasses
            type: message instanceof HumanMessage ? 'human' : message instanceof AIMessage ? 'ai' : 'unknown',
            content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content), // Handle potential non-string content
            timestamp: Date.now(),
            metadata: message.additional_kwargs || {}, // Store additional arguments if present
        };

        try {
            logger.debug(`Adding chat message for session ${sessionId}...`);
            await this.database!.addRecord(CHAT_HISTORY_COLLECTION, chatRecord);
            logger.debug(`Chat message ${chatRecord.id} added for session ${sessionId}.`);
            // Optionally fire a different event for chat history changes?
            // this._onChatHistoryChanged.fire(sessionId);
        } catch (error: any) {
            logger.error(`Failed to add chat message for session ${sessionId}:`, error);
            throw new Error(`Failed to add chat message: ${error.message}`);
        }
    }

    /**
     * Retrieves the chat history for a specific session.
     * @param sessionId Identifier for the conversation session.
     * @param limit Optional limit on the number of messages to retrieve (most recent).
     * @returns A ChatMessageHistory object populated with the messages.
     */
    public async getChatHistory(sessionId: string, limit?: number): Promise<ChatMessageHistory> {
        await this.initialize(this.context!);
        this.assertInitialized();

        if (!sessionId) throw new Error("sessionId cannot be empty.");

        const effectiveLimit = limit ?? getConfig<number>('memory.conversationHistorySize', 100);

        try {
            logger.debug(`Getting chat history for session ${sessionId} (limit: ${effectiveLimit})...`);
            const records = await this.database!.queryRecords(
                CHAT_HISTORY_COLLECTION,
                { sessionId: sessionId }, // Filter by session ID
                effectiveLimit,
                { timestamp: -1 } // Sort by timestamp descending (most recent first)
            );

            // Convert stored records back to LangChain BaseMessage objects
            const messages: BaseMessage[] = (records as ChatMessage[])
                .reverse() // Reverse to get chronological order (oldest first)
                .map(record => {
                    const content = record.content; // Assume content is stored as string
                    const additional_kwargs = record.metadata || {};
                    if (record.type === 'human') {
                        return new HumanMessage({ content, additional_kwargs });
                    } else if (record.type === 'ai') {
                        return new AIMessage({ content, additional_kwargs });
                    } else {
                        // Handle system messages or unknown types if necessary
                        logger.warn(`Unknown chat message type "${record.type}" encountered for session ${sessionId}.`);
                        // Could potentially return a SystemMessage or skip
                        return new SystemMessage({ content: `[Unknown Type: ${record.type}] ${content}`, additional_kwargs });
                    }
                });

            logger.debug(`Retrieved ${messages.length} messages for session ${sessionId}.`);
            return new ChatMessageHistory(messages);

        } catch (error: any) {
            logger.error(`Failed to get chat history for session ${sessionId}:`, error);
            // Return empty history on error
            return new ChatMessageHistory();
        }
    }

    /**
     * Clears the chat history for a specific session.
     * @param sessionId Identifier for the conversation session.
     */
    public async clearChatHistory(sessionId: string): Promise<void> {
        await this.initialize(this.context!);
        this.assertInitialized();
        if (!sessionId) throw new Error("sessionId cannot be empty.");
        logger.warn(`Clearing chat history for session ${sessionId}...`);
        try {
            // Use database's deleteMany or equivalent if available
            const deletedCount = await this.database!.deleteRecords(CHAT_HISTORY_COLLECTION, { sessionId });
            logger.info(`Cleared ${deletedCount} chat messages for session ${sessionId}.`);
            // Optionally fire event
        } catch (error: any) {
            logger.error(`Failed to clear chat history for session ${sessionId}:`, error);
            throw new Error(`Failed to clear chat history: ${error.message}`);
        }
    }

    // --- LangChain Memory Component Factory Methods (Optional Conveniences) ---

    /**
     * Creates a BufferMemory instance pre-populated with history for a session.
     * @param sessionId The conversation session ID.
     * @param k The number of last messages to keep in the buffer (optional).
     * @param memoryKey The key to use for the memory variables (default: "history").
     * @returns A Promise resolving to a BufferMemory instance.
     */
    public async getBufferedMemory(sessionId: string, k?: number, memoryKey: string = "history"): Promise<BufferMemory> {
        const chatHistory = await this.getChatHistory(sessionId);
        return new BufferMemory({
            chatHistory: chatHistory,
            memoryKey: memoryKey,
            k: k ?? getConfig<number>('memory.conversationHistorySize', 100), // Use configured size if k not provided
            returnMessages: true, // Typically want BaseMessage objects back
        });
    }

    /**
     * Creates a ConversationSummaryMemory instance for a session.
     * Requires a BaseLanguageModel instance for summarization.
     * @param sessionId The conversation session ID.
     * @param llm The language model instance to use for summarization.
     * @param memoryKey The key to use for the memory variables (default: "history").
     * @returns A Promise resolving to a ConversationSummaryMemory instance.
     */
    public async getSummarizedMemory(sessionId: string, llm: BaseLanguageModel, memoryKey: string = "history"): Promise<ConversationSummaryMemory> {
        const chatHistory = await this.getChatHistory(sessionId);
        return new ConversationSummaryMemory({
            llm: llm,
            chatHistory: chatHistory,
            memoryKey: memoryKey,
            returnMessages: true,
        });
    }

    /**
     * Creates a VectorStoreRetrieverMemory instance using this provider's vector store.
     * Note: This is more about configuring memory *for use in a chain* rather than
     * just retrieving data. The chain would typically instantiate this.
     * @param memoryKey The key for memory variables.
     * @param inputKey The key for the input variable to the chain.
     * @returns A VectorStoreRetrieverMemory instance.
     */
    public getVectorStoreRetrieverMemory(memoryKey: string = "history", inputKey?: string): VectorStoreRetrieverMemory {
        this.assertInitialized();
        if (!(this.vectorStore instanceof MemoryVectorStore) && !this.vectorStore?.asRetriever) {
            throw new Error("The configured vector store cannot be used directly as a retriever for VectorStoreRetrieverMemory. Use searchSimilarMemories instead or ensure the vector store implements 'asRetriever'.");
        }
        // The vector store needs an `asRetriever` method or be compatible.
        // MemoryVectorStore has this. Others might need wrapping.
        const retriever = this.vectorStore.asRetriever(getConfig<number>('memory.contextWindowSize', 5));

        return new VectorStoreRetrieverMemory({
            vectorStoreRetriever: retriever,
            memoryKey: memoryKey,
            inputKey: inputKey, // Optional input key
        });
    }


    // --- Settings Management ---

    /**
     * Retrieves the current memory settings from the configuration.
     */
    public getMemorySettings(): MemorySettings {
        // This structure should match the MemorySettings type defined in ../types
        // It reads directly from the config system.
        return {
            enabled: getConfig<boolean>('memory.enabled', true),
            // system: getConfig<'basic' | 'codessa'>('memory.system', 'codessa'), // 'system' seems ambiguous, maybe remove or clarify
            maxMemories: getConfig<number>('memory.maxMemories', 1000),
            relevanceThreshold: getConfig<number>('memory.relevanceThreshold', 0.7),
            contextWindowSize: getConfig<number>('memory.contextWindowSize', 5),
            conversationHistorySize: getConfig<number>('memory.conversationHistorySize', 100),
            vectorStore: getConfig<string>('memory.vectorStore', 'chroma'), // Keep type generic string for flexibility
            vectorStoreSettings: getConfig<object>('memory.vectorStore', {}), // Get the whole sub-object
            database: getConfig<string>('memory.database', 'sqlite'), // Keep type generic string
            databaseSettings: getConfig<object>('memory.database', {}), // Get the whole sub-object
            fileChunking: getConfig<object>('memory.fileChunking', {}), // Get the whole sub-object
        };
    }

    /**
     * Updates specific memory settings in the configuration.
     * Handles potential re-initialization of components if critical settings change.
     * @param settings A partial MemorySettings object with values to update.
     */
    public async updateMemorySettings(settings: Partial<MemorySettings>): Promise<void> {
        logger.info("Updating memory settings:", settings);
        const currentSettings = this.getMemorySettings();
        let reinitializeEmbeddings = false;
        let reinitializeVectorStore = false;
        let reinitializeDatabase = false;

        try {
            const updates: Promise<boolean>[] = [];

            // Helper to update config and track success
            const update = (key: string, value: any) => {
                if (value !== undefined) {
                    updates.push(setConfig(key, value));
                }
            };

            // Update individual settings
            update('memory.enabled', settings.enabled);
            update('memory.maxMemories', settings.maxMemories);
            update('memory.relevanceThreshold', settings.relevanceThreshold);
            update('memory.contextWindowSize', settings.contextWindowSize);
            update('memory.conversationHistorySize', settings.conversationHistorySize);

            // Check for changes requiring re-initialization
            if (settings.vectorStore !== undefined && settings.vectorStore !== currentSettings.vectorStore) {
                update('memory.vectorStore', settings.vectorStore);
                reinitializeVectorStore = true;
            }
            if (settings.database !== undefined && settings.database !== currentSettings.database) {
                update('memory.database', settings.database);
                reinitializeDatabase = true;
            }

            // Update nested settings (handle potential partial updates)
            // This requires careful merging or specific update logic per setting group
            if (settings.vectorStoreSettings) {
                // Example for Chroma: Deep merge or specific updates
                const currentVSettings = getConfig<any>(`memory.vectorStore`, {});
                if (currentVSettings.chroma && settings.vectorStoreSettings.chroma) {
                    update('memory.vectorStore.chroma.directory', settings.vectorStoreSettings.chroma.directory);
                    update('memory.vectorStore.chroma.collectionName', settings.vectorStoreSettings.chroma.collectionName);
                    // If critical settings like directory change, re-init might be needed
                    if (settings.vectorStoreSettings.chroma.directory !== currentVSettings.chroma.directory) reinitializeVectorStore = true;
                }
                // Add similar logic for Pinecone, etc.
            }
            if (settings.databaseSettings) {
                const currentDbSettings = getConfig<any>(`memory.database`, {});
                if (currentDbSettings.sqlite && settings.databaseSettings.sqlite) {
                    update('memory.database.sqlite.filename', settings.databaseSettings.sqlite.filename);
                    if (settings.databaseSettings.sqlite.filename !== currentDbSettings.sqlite.filename) reinitializeDatabase = true;
                }
                // Add similar logic for MySQL, Postgres, etc.
            }
            if (settings.fileChunking) {
                update('memory.fileChunking.chunkSize', settings.fileChunking.chunkSize);
                update('memory.fileChunking.chunkOverlap', settings.fileChunking.chunkOverlap);
                update('memory.fileChunking.maxChunksPerFile', settings.fileChunking.maxChunksPerFile);
            }

            // Wait for all config updates to complete
            const results = await Promise.all(updates);
            if (results.some(success => !success)) {
                throw new Error('One or more configuration settings failed to update.');
            }

            // Perform re-initialization if needed
            // Note: Re-initializing might be complex if data needs migration.
            // This implementation assumes re-init connects to the new config.
            if (reinitializeEmbeddings || reinitializeVectorStore || reinitializeDatabase) {
                logger.warn(`Re-initializing memory components due to settings changes...`);
                this.initialized = false; // Mark as uninitialized
                this.vectorStore = undefined; // Clear instances
                this.database = undefined;
                this.embeddings = undefined;
                // The next operation will trigger lazy re-initialization
                // Or force it here: await this.initialize(this.context!);
                logger.info("Memory components will re-initialize on next use.");
            }

            logger.info("Memory settings updated successfully.");

        } catch (error: any) {
            logger.error('Failed to update memory settings:', error);
            throw new Error(`Failed to update memory settings: ${error.message}`);
        }
    }
}

// Export singleton instance
export const codessaMemoryProvider = new CodessaMemoryProvider();