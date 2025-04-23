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
exports.langchainMemoryProvider = exports.LangChainMemoryProvider = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../../logger");
const config_1 = require("../../config");
const openai_1 = require("@langchain/openai");
const llmService_1 = require("../../llm/llmService");
const vectorStoreFactory_1 = require("./vectorStores/vectorStoreFactory");
const databaseFactory_1 = require("./databases/databaseFactory");
const uuid_1 = require("uuid");
const async_caller_1 = require("@langchain/core/utils/async_caller");
/**
 * LangChain Memory Provider
 * Implements the IMemoryProvider interface using LangChain memory components
 */
class LangChainMemoryProvider {
    constructor() {
        this.initialized = false;
        this._onMemoriesChanged = new vscode.EventEmitter();
        this.onMemoriesChanged = this._onMemoriesChanged.event;
    }
    /**
     * Initialize the memory provider
     */
    async initialize(context) {
        if (this.initialized) {
            return;
        }
        try {
            this.context = context;
            // Initialize embeddings
            this.embeddings = await this.createEmbeddings();
            // Initialize vector store
            const vectorStoreType = (0, config_1.getConfig)('memory.vectorStore', 'chroma');
            this.vectorStore = await vectorStoreFactory_1.VectorStoreFactory.createVectorStore(vectorStoreType, this.embeddings);
            await this.vectorStore.initialize();
            // Initialize database
            const databaseType = (0, config_1.getConfig)('memory.database', 'sqlite');
            this.database = await databaseFactory_1.DatabaseFactory.createDatabase(databaseType);
            await this.database.initialize();
            this.initialized = true;
            logger_1.logger.info('LangChain memory provider initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize LangChain memory provider:', error);
            throw error;
        }
    }
    /**
     * Create embeddings based on the default LLM provider
     */
    async createEmbeddings() {
        const provider = llmService_1.llmService.getDefaultProvider();
        if (!provider?.generateEmbedding) {
            // Try to use OpenAI embeddings if available
            if (process.env.OPENAI_API_KEY) {
                logger_1.logger.warn('Provider does not support embeddings, falling back to OpenAI embeddings');
                return new openai_1.OpenAIEmbeddings({
                    openAIApiKey: process.env.OPENAI_API_KEY
                });
            }
            logger_1.logger.error('No embedding capability available - neither provider embedding nor OpenAI fallback');
            throw new Error('No embedding capability available. Please configure a provider with embedding support or set OPENAI_API_KEY.');
        }
        // Create a custom embeddings class that uses the provider's embedding function
        const generateEmbedding = provider.generateEmbedding.bind(provider);
        return {
            embedDocuments: async (texts) => {
                const embeddings = [];
                for (const text of texts) {
                    const embedding = await generateEmbedding(text);
                    embeddings.push(embedding);
                }
                return embeddings;
            },
            embedQuery: async (text) => {
                return await generateEmbedding(text);
            },
            caller: new async_caller_1.AsyncCaller({
                maxConcurrency: 1,
                maxRetries: 6
            })
        };
    }
    /**
     * Add a memory
     */
    async addMemory(memory) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            const id = `mem_${(0, uuid_1.v4)()}`;
            const timestamp = Date.now();
            const newMemory = {
                id,
                content: memory.content,
                timestamp,
                metadata: memory.metadata
            };
            // Store in database
            await this.database.addRecord('memories', newMemory);
            // Generate embedding and store in vector store
            if (this.embeddings) {
                const embedding = await this.embeddings.embedQuery(memory.content);
                newMemory.embedding = embedding;
                await this.vectorStore.addVector(id, embedding, memory.metadata);
            }
            this._onMemoriesChanged.fire();
            return newMemory;
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
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            const records = await this.database.queryRecords('memories', {}, (0, config_1.getConfig)('memory.maxMemories', 1000));
            return records;
        }
        catch (error) {
            logger_1.logger.error('Failed to get memories:', error);
            return [];
        }
    }
    /**
     * Get a memory by ID
     */
    async getMemory(id) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            const record = await this.database.getRecord('memories', id);
            return record;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get memory ${id}:`, error);
            return undefined;
        }
    }
    /**
     * Delete a memory by ID
     */
    async deleteMemory(id) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            // Delete from database
            const dbResult = await this.database.deleteRecord('memories', id);
            // Delete from vector store
            const vsResult = await this.vectorStore.deleteVector(id);
            this._onMemoriesChanged.fire();
            return dbResult && vsResult;
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete memory ${id}:`, error);
            return false;
        }
    }
    /**
     * Clear all memories
     */
    async clearMemories() {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            // Clear database
            await this.database.clearCollection('memories');
            // Clear vector store
            await this.vectorStore.clearVectors();
            this._onMemoriesChanged.fire();
            logger_1.logger.info('All memories cleared');
        }
        catch (error) {
            logger_1.logger.error('Failed to clear memories:', error);
            throw error;
        }
    }
    /**
     * Search memories
     */
    async searchMemories(options) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            const { query, limit = 10, filter } = options;
            // Build database query
            const dbQuery = {};
            if (filter) {
                if (filter.source) {
                    dbQuery['metadata.source'] = filter.source;
                }
                if (filter.type) {
                    dbQuery['metadata.type'] = filter.type;
                }
                if (filter.tags && filter.tags.length > 0) {
                    dbQuery['metadata.tags'] = { $all: filter.tags };
                }
                if (filter.fromTimestamp) {
                    dbQuery['timestamp'] = { $gte: filter.fromTimestamp };
                }
                if (filter.toTimestamp) {
                    if (dbQuery['timestamp']) {
                        dbQuery['timestamp'].$lte = filter.toTimestamp;
                    }
                    else {
                        dbQuery['timestamp'] = { $lte: filter.toTimestamp };
                    }
                }
                // Add any custom filters
                for (const key in filter) {
                    if (!['source', 'type', 'tags', 'fromTimestamp', 'toTimestamp'].includes(key)) {
                        dbQuery[`metadata.${key}`] = filter[key];
                    }
                }
            }
            // Add text search if query is provided
            if (query) {
                dbQuery['$text'] = { $search: query };
            }
            // Execute query
            const records = await this.database.queryRecords('memories', dbQuery, limit);
            return records;
        }
        catch (error) {
            logger_1.logger.error('Failed to search memories:', error);
            return [];
        }
    }
    /**
     * Search memories by semantic similarity
     */
    async searchSimilarMemories(query, options = {}) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            if (!this.embeddings || !this.vectorStore) {
                logger_1.logger.warn('Vector search not available, falling back to text search');
                return this.searchMemories({ query, ...options });
            }
            // Generate embedding for query
            const queryEmbedding = await this.embeddings.embedQuery(query);
            // Build filter
            const filter = {};
            if (options.filter) {
                if (options.filter.source) {
                    filter['source'] = options.filter.source;
                }
                if (options.filter.type) {
                    filter['type'] = options.filter.type;
                }
                if (options.filter.tags) {
                    filter['tags'] = options.filter.tags;
                }
                // Add any custom filters
                for (const key in options.filter) {
                    if (!['source', 'type', 'tags', 'fromTimestamp', 'toTimestamp'].includes(key)) {
                        filter[key] = options.filter[key];
                    }
                }
            }
            // Search vector store
            const limit = options.limit || (0, config_1.getConfig)('memory.contextWindowSize', 5);
            const relevanceThreshold = (0, config_1.getConfig)('memory.relevanceThreshold', 0.7);
            const results = await this.vectorStore.searchSimilarVectors(queryEmbedding, limit, filter);
            // Filter by relevance threshold
            const relevantResults = results.filter(result => result.score >= relevanceThreshold);
            // Get full memory entries
            const memories = [];
            for (const result of relevantResults) {
                const memory = await this.getMemory(result.id);
                if (memory) {
                    // Add relevance score to memory
                    memories.push({
                        ...memory,
                        metadata: {
                            ...memory.metadata,
                            relevance: result.score
                        }
                    });
                }
            }
            return memories;
        }
        catch (error) {
            logger_1.logger.error('Failed to search similar memories:', error);
            // Fall back to text search
            return this.searchMemories({ query, ...options });
        }
    }
    /**
     * Get memory settings
     */
    getMemorySettings() {
        return {
            enabled: (0, config_1.getConfig)('memory.enabled', true),
            system: (0, config_1.getConfig)('memory.system', 'langchain'),
            maxMemories: (0, config_1.getConfig)('memory.maxMemories', 1000),
            relevanceThreshold: (0, config_1.getConfig)('memory.relevanceThreshold', 0.7),
            contextWindowSize: (0, config_1.getConfig)('memory.contextWindowSize', 5),
            conversationHistorySize: (0, config_1.getConfig)('memory.conversationHistorySize', 100),
            vectorStore: (0, config_1.getConfig)('memory.vectorStore', 'chroma'),
            vectorStoreSettings: {
                chroma: {
                    directory: (0, config_1.getConfig)('memory.vectorStore.chroma.directory', './.codessa/chroma'),
                    collectionName: (0, config_1.getConfig)('memory.vectorStore.chroma.collectionName', 'codessa_memories')
                },
                pinecone: {
                    apiKey: (0, config_1.getConfig)('memory.vectorStore.pinecone.apiKey', ''),
                    environment: (0, config_1.getConfig)('memory.vectorStore.pinecone.environment', ''),
                    indexName: (0, config_1.getConfig)('memory.vectorStore.pinecone.indexName', 'codessa-memories')
                }
            },
            database: (0, config_1.getConfig)('memory.database', 'sqlite'),
            databaseSettings: {
                sqlite: {
                    filename: (0, config_1.getConfig)('memory.database.sqlite.filename', './.codessa/memory.db')
                },
                mysql: {
                    host: (0, config_1.getConfig)('memory.database.mysql.host', 'localhost'),
                    port: (0, config_1.getConfig)('memory.database.mysql.port', 3306),
                    user: (0, config_1.getConfig)('memory.database.mysql.user', 'root'),
                    password: (0, config_1.getConfig)('memory.database.mysql.password', ''),
                    database: (0, config_1.getConfig)('memory.database.mysql.database', 'codessa'),
                    table: (0, config_1.getConfig)('memory.database.mysql.table', 'memories')
                },
                postgres: {
                    connectionString: (0, config_1.getConfig)('memory.database.postgres.connectionString', ''),
                    schema: (0, config_1.getConfig)('memory.database.postgres.schema', 'codessa')
                },
                mongodb: {
                    connectionString: (0, config_1.getConfig)('memory.database.mongodb.connectionString', ''),
                    database: (0, config_1.getConfig)('memory.database.mongodb.database', 'codessa'),
                    collection: (0, config_1.getConfig)('memory.database.mongodb.collection', 'memories')
                },
                redis: {
                    url: (0, config_1.getConfig)('memory.database.redis.url', ''),
                    keyPrefix: (0, config_1.getConfig)('memory.database.redis.keyPrefix', 'codessa:')
                }
            },
            fileChunking: {
                chunkSize: (0, config_1.getConfig)('memory.fileChunking.chunkSize', 1000),
                chunkOverlap: (0, config_1.getConfig)('memory.fileChunking.chunkOverlap', 200),
                maxChunksPerFile: (0, config_1.getConfig)('memory.fileChunking.maxChunksPerFile', 100)
            }
        };
    }
    /**
     * Update memory settings
     */
    async updateMemorySettings(settings) {
        try {
            let success = true;
            // Update settings
            if (settings.enabled !== undefined) {
                success = success && await (0, config_1.setConfig)('memory.enabled', settings.enabled);
            }
            if (settings.system !== undefined) {
                success = success && await (0, config_1.setConfig)('memory.system', settings.system);
            }
            if (settings.maxMemories !== undefined) {
                success = success && await (0, config_1.setConfig)('memory.maxMemories', settings.maxMemories);
            }
            if (settings.relevanceThreshold !== undefined) {
                success = success && await (0, config_1.setConfig)('memory.relevanceThreshold', settings.relevanceThreshold);
            }
            if (settings.contextWindowSize !== undefined) {
                success = success && await (0, config_1.setConfig)('memory.contextWindowSize', settings.contextWindowSize);
            }
            if (settings.conversationHistorySize !== undefined) {
                success = success && await (0, config_1.setConfig)('memory.conversationHistorySize', settings.conversationHistorySize);
            }
            if (settings.vectorStore !== undefined) {
                success = success && await (0, config_1.setConfig)('memory.vectorStore', settings.vectorStore);
                // Reinitialize vector store if changed
                if (this.initialized) {
                    try {
                        this.vectorStore = await vectorStoreFactory_1.VectorStoreFactory.createVectorStore(settings.vectorStore, this.embeddings);
                        await this.vectorStore.initialize();
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to reinitialize vector store:', error);
                        success = false;
                    }
                }
            }
            if (settings.database !== undefined) {
                success = success && await (0, config_1.setConfig)('memory.database', settings.database);
                // Reinitialize database if changed
                if (this.initialized) {
                    try {
                        this.database = await databaseFactory_1.DatabaseFactory.createDatabase(settings.database);
                        await this.database.initialize();
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to reinitialize database:', error);
                        success = false;
                    }
                }
            }
            // Update vector store settings
            if (settings.vectorStoreSettings) {
                if (settings.vectorStoreSettings.chroma) {
                    if (settings.vectorStoreSettings.chroma.directory) {
                        success = success && await (0, config_1.setConfig)('memory.vectorStore.chroma.directory', settings.vectorStoreSettings.chroma.directory);
                    }
                    if (settings.vectorStoreSettings.chroma.collectionName) {
                        success = success && await (0, config_1.setConfig)('memory.vectorStore.chroma.collectionName', settings.vectorStoreSettings.chroma.collectionName);
                    }
                }
                if (settings.vectorStoreSettings.pinecone) {
                    if (settings.vectorStoreSettings.pinecone.apiKey) {
                        success = success && await (0, config_1.setConfig)('memory.vectorStore.pinecone.apiKey', settings.vectorStoreSettings.pinecone.apiKey);
                    }
                    if (settings.vectorStoreSettings.pinecone.environment) {
                        success = success && await (0, config_1.setConfig)('memory.vectorStore.pinecone.environment', settings.vectorStoreSettings.pinecone.environment);
                    }
                    if (settings.vectorStoreSettings.pinecone.indexName) {
                        success = success && await (0, config_1.setConfig)('memory.vectorStore.pinecone.indexName', settings.vectorStoreSettings.pinecone.indexName);
                    }
                }
            }
            // Update database settings
            if (settings.databaseSettings) {
                if (settings.databaseSettings.sqlite && settings.databaseSettings.sqlite.filename) {
                    success = success && await (0, config_1.setConfig)('memory.database.sqlite.filename', settings.databaseSettings.sqlite.filename);
                }
                if (settings.databaseSettings.mysql) {
                    if (settings.databaseSettings.mysql.host) {
                        success = success && await (0, config_1.setConfig)('memory.database.mysql.host', settings.databaseSettings.mysql.host);
                    }
                    if (settings.databaseSettings.mysql.port) {
                        success = success && await (0, config_1.setConfig)('memory.database.mysql.port', settings.databaseSettings.mysql.port);
                    }
                    if (settings.databaseSettings.mysql.user) {
                        success = success && await (0, config_1.setConfig)('memory.database.mysql.user', settings.databaseSettings.mysql.user);
                    }
                    if (settings.databaseSettings.mysql.password) {
                        success = success && await (0, config_1.setConfig)('memory.database.mysql.password', settings.databaseSettings.mysql.password);
                    }
                    if (settings.databaseSettings.mysql.database) {
                        success = success && await (0, config_1.setConfig)('memory.database.mysql.database', settings.databaseSettings.mysql.database);
                    }
                    if (settings.databaseSettings.mysql.table) {
                        success = success && await (0, config_1.setConfig)('memory.database.mysql.table', settings.databaseSettings.mysql.table);
                    }
                }
                if (settings.databaseSettings.postgres) {
                    if (settings.databaseSettings.postgres.connectionString) {
                        success = success && await (0, config_1.setConfig)('memory.database.postgres.connectionString', settings.databaseSettings.postgres.connectionString);
                    }
                    if (settings.databaseSettings.postgres.schema) {
                        success = success && await (0, config_1.setConfig)('memory.database.postgres.schema', settings.databaseSettings.postgres.schema);
                    }
                }
                if (settings.databaseSettings.mongodb) {
                    if (settings.databaseSettings.mongodb.connectionString) {
                        success = success && await (0, config_1.setConfig)('memory.database.mongodb.connectionString', settings.databaseSettings.mongodb.connectionString);
                    }
                    if (settings.databaseSettings.mongodb.database) {
                        success = success && await (0, config_1.setConfig)('memory.database.mongodb.database', settings.databaseSettings.mongodb.database);
                    }
                    if (settings.databaseSettings.mongodb.collection) {
                        success = success && await (0, config_1.setConfig)('memory.database.mongodb.collection', settings.databaseSettings.mongodb.collection);
                    }
                }
                if (settings.databaseSettings.redis) {
                    if (settings.databaseSettings.redis.url) {
                        success = success && await (0, config_1.setConfig)('memory.database.redis.url', settings.databaseSettings.redis.url);
                    }
                    if (settings.databaseSettings.redis.keyPrefix) {
                        success = success && await (0, config_1.setConfig)('memory.database.redis.keyPrefix', settings.databaseSettings.redis.keyPrefix);
                    }
                }
            }
            // Update file chunking settings
            if (settings.fileChunking) {
                if (settings.fileChunking.chunkSize !== undefined) {
                    success = success && await (0, config_1.setConfig)('memory.fileChunking.chunkSize', settings.fileChunking.chunkSize);
                }
                if (settings.fileChunking.chunkOverlap !== undefined) {
                    success = success && await (0, config_1.setConfig)('memory.fileChunking.chunkOverlap', settings.fileChunking.chunkOverlap);
                }
                if (settings.fileChunking.maxChunksPerFile !== undefined) {
                    success = success && await (0, config_1.setConfig)('memory.fileChunking.maxChunksPerFile', settings.fileChunking.maxChunksPerFile);
                }
            }
            if (success && this.context) {
                // Reinitialize memory system if needed
                if (this.initialized) {
                    try {
                        await this.initialize(this.context);
                        logger_1.logger.info('Memory settings updated and system reinitialized successfully');
                    }
                    catch (error) {
                        logger_1.logger.error('Failed to reinitialize memory system after settings update:', error);
                        success = false;
                    }
                }
                else {
                    logger_1.logger.info('Memory settings updated successfully');
                }
            }
            else {
                logger_1.logger.error('Failed to update some memory settings');
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to update memory settings:', error);
        }
    }
}
exports.LangChainMemoryProvider = LangChainMemoryProvider;
// Export singleton instance
exports.langchainMemoryProvider = new LangChainMemoryProvider();
//# sourceMappingURL=langchainMemory.js.map