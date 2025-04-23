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
exports.memoryManager = exports.MemoryManager = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const config_1 = require("../config");
const types_1 = require("./types");
const vectorMemory_1 = require("./vectorMemory");
const langchainMemory_1 = require("./langchain/langchainMemory");
const langGraphMemory_1 = require("./langchain/langGraphMemory");
const fileChunking_1 = require("./langchain/fileChunking");
/**
 * Memory Manager
 * Central manager for all memory operations
 */
class MemoryManager {
    constructor() {
        this.initialized = false;
        this._onMemoriesChanged = new vscode.EventEmitter();
        this.onMemoriesChanged = this._onMemoriesChanged.event;
    }
    /**
     * Initialize the memory manager
     */
    async initialize(context) {
        if (this.initialized) {
            return;
        }
        try {
            this.context = context;
            // Check if memory is enabled
            const memoryEnabled = (0, config_1.getConfig)('memory.enabled', true);
            if (!memoryEnabled) {
                logger_1.logger.info('Memory system is disabled');
                return;
            }
            // Initialize memory provider based on configuration
            const memorySystem = (0, config_1.getConfig)('memory.system', 'langchain');
            if (memorySystem === 'langchain') {
                // Initialize LangChain memory provider
                this.memoryProvider = langchainMemory_1.langchainMemoryProvider;
                await this.memoryProvider.initialize(context);
                // Initialize LangGraph memory
                await langGraphMemory_1.langGraphMemory.initialize();
                logger_1.logger.info('LangChain memory provider initialized');
            }
            else {
                // Initialize basic vector memory manager
                this.vectorMemoryManager = vectorMemory_1.VectorMemoryManager.getInstance();
                await this.vectorMemoryManager.initialize(context);
                logger_1.logger.info('Basic vector memory manager initialized');
            }
            // Register event handlers
            if (this.memoryProvider) {
                if ('onMemoriesChanged' in this.memoryProvider) {
                    this.memoryProvider.onMemoriesChanged(() => {
                        this._onMemoriesChanged.fire();
                    });
                }
            }
            if (this.vectorMemoryManager) {
                this.vectorMemoryManager.onMemoriesChanged(() => {
                    this._onMemoriesChanged.fire();
                });
            }
            this.initialized = true;
            logger_1.logger.info('Memory manager initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize memory manager:', error);
            throw error;
        }
    }
    /**
     * Add a memory
     */
    async addMemory(contentOrEntry) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            // Create memory entry
            const memoryEntry = typeof contentOrEntry === 'string'
                ? {
                    content: contentOrEntry,
                    metadata: {
                        source: types_1.MemorySource.USER,
                        type: types_1.MemoryType.SEMANTIC
                    }
                }
                : contentOrEntry;
            // Add to memory provider
            if (this.memoryProvider) {
                return await this.memoryProvider.addMemory(memoryEntry);
            }
            else if (this.vectorMemoryManager) {
                return await this.vectorMemoryManager.addMemory(memoryEntry);
            }
            else {
                throw new Error('No memory provider initialized');
            }
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
            if (this.memoryProvider) {
                return await this.memoryProvider.getMemories();
            }
            else if (this.vectorMemoryManager) {
                return await this.vectorMemoryManager.getMemories();
            }
            else {
                return [];
            }
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
            if (this.memoryProvider) {
                return await this.memoryProvider.getMemory(id);
            }
            else if (this.vectorMemoryManager) {
                return await this.vectorMemoryManager.getMemory(id);
            }
            else {
                return undefined;
            }
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
            if (this.memoryProvider) {
                return await this.memoryProvider.deleteMemory(id);
            }
            else if (this.vectorMemoryManager) {
                return await this.vectorMemoryManager.deleteMemory(id);
            }
            else {
                return false;
            }
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
            if (this.memoryProvider) {
                await this.memoryProvider.clearMemories();
            }
            else if (this.vectorMemoryManager) {
                await this.vectorMemoryManager.clearMemories();
            }
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
            if (this.memoryProvider) {
                return await this.memoryProvider.searchMemories(options);
            }
            else if (this.vectorMemoryManager) {
                // Convert options to vector memory manager format
                return await this.vectorMemoryManager.searchMemories(options.query, options.limit);
            }
            else {
                return [];
            }
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
            if (this.memoryProvider) {
                return await this.memoryProvider.searchSimilarMemories(query, options);
            }
            else if (this.vectorMemoryManager) {
                // Convert options to vector memory manager format
                return await this.vectorMemoryManager.searchSimilarMemories(query, options.limit);
            }
            else {
                return [];
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to search similar memories:', error);
            return [];
        }
    }
    /**
     * Process a message with LangGraph memory
     */
    async processMessage(message) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            // Check if LangGraph memory is available
            if ((0, config_1.getConfig)('memory.system', 'langchain') === 'langchain') {
                return await langGraphMemory_1.langGraphMemory.processMessage(message);
            }
            else {
                throw new Error('LangGraph memory not available');
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to process message with LangGraph memory:', error);
            throw error;
        }
    }
    /**
     * Chunk a file and store in memory
     */
    async chunkFile(filePath) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            // Check if LangChain memory is available
            if ((0, config_1.getConfig)('memory.system', 'langchain') === 'langchain') {
                return await fileChunking_1.FileChunkingService.chunkFile(filePath);
            }
            else {
                throw new Error('LangChain memory not available for file chunking');
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to chunk file ${filePath}:`, error);
            throw error;
        }
    }
    /**
     * Chunk a workspace folder and store in memory
     */
    async chunkWorkspace(folderPath, includePatterns = ['**/*.{js,ts,jsx,tsx,py,java,c,cpp,cs,go,rb,php,html,css,md,json}'], excludePatterns = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']) {
        if (!this.initialized) {
            await this.initialize(this.context);
        }
        try {
            // Check if LangChain memory is available
            if ((0, config_1.getConfig)('memory.system', 'langchain') === 'langchain') {
                return await fileChunking_1.FileChunkingService.chunkWorkspace(folderPath, includePatterns, excludePatterns);
            }
            else {
                throw new Error('LangChain memory not available for workspace chunking');
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to chunk workspace ${folderPath}:`, error);
            throw error;
        }
    }
    /**
     * Get memory settings
     */
    getMemorySettings() {
        if (this.memoryProvider && 'getMemorySettings' in this.memoryProvider) {
            return this.memoryProvider.getMemorySettings();
        }
        else {
            // Return default settings
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
    }
    /**
     * Update memory settings
     */
    async updateMemorySettings(settings) {
        try {
            if (this.memoryProvider && 'updateMemorySettings' in this.memoryProvider) {
                const result = await this.memoryProvider.updateMemorySettings(settings);
                return result === true || result === undefined; // Handle both boolean returns and void returns
            }
            else {
                logger_1.logger.error('Memory provider does not support updating settings');
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to update memory settings:', error);
            return false;
        }
    }
}
exports.MemoryManager = MemoryManager;
// Export singleton instance
exports.memoryManager = new MemoryManager();
//# sourceMappingURL=memoryManager.js.map