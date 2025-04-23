import * as vscode from 'vscode';
import { logger } from '../logger';
import { getConfig } from '../config';
import { IMemoryProvider, MemoryEntry, MemorySearchOptions, MemorySettings, MemorySource, MemoryType } from './types';
import { VectorMemoryManager } from './vectorMemory';
import { codessaMemoryProvider } from './codessa/codessaMemory';
import { langGraphMemory } from './codessa/langGraphMemory';
import { FileChunkingService } from './codessa/fileChunking';
import { v4 as uuidv4 } from 'uuid';

/**
 * Memory Manager
 * Central manager for all memory operations
 */
export class MemoryManager {
    private context: vscode.ExtensionContext | undefined;
    private memoryProvider: IMemoryProvider | undefined;
    private vectorMemoryManager: VectorMemoryManager | undefined;
    private initialized = false;
    private _onMemoriesChanged = new vscode.EventEmitter<void>();
    readonly onMemoriesChanged = this._onMemoriesChanged.event;

    /**
     * Initialize the memory manager
     */
    public async initialize(context: vscode.ExtensionContext): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            this.context = context;

            // Check if memory is enabled
            const memoryEnabled = getConfig<boolean>('memory.enabled', true);

            if (!memoryEnabled) {
                logger.info('Memory system is disabled');
                return;
            }

            // Initialize memory provider based on configuration
            const memorySystem = getConfig<string>('memory.system', 'codessa');

            if (memorySystem === 'codessa') {
                // Initialize Codessa memory provider
                this.memoryProvider = codessaMemoryProvider;
                await this.memoryProvider.initialize(context);

                // Initialize LangGraph memory
                await langGraphMemory.initialize();

                logger.info('Codessa memory provider initialized');
            } else {
                // Initialize basic vector memory manager
                this.vectorMemoryManager = VectorMemoryManager.getInstance();
                await this.vectorMemoryManager.initialize(context);

                logger.info('Basic vector memory manager initialized');
            }

            // Register event handlers
            if (this.memoryProvider) {
                if ('onMemoriesChanged' in this.memoryProvider) {
                    (this.memoryProvider as any).onMemoriesChanged(() => {
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
            logger.info('Memory manager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize memory manager:', error);
            throw error;
        }
    }

    /**
     * Add a memory
     */
    public async addMemory(contentOrEntry: string | Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            // Create memory entry
            const memoryEntry: Omit<MemoryEntry, 'id' | 'timestamp'> = typeof contentOrEntry === 'string'
                ? {
                    content: contentOrEntry,
                    metadata: {
                        source: MemorySource.USER,
                        type: MemoryType.SEMANTIC
                    }
                }
                : contentOrEntry;

            // Add to memory provider
            if (this.memoryProvider) {
                return await this.memoryProvider.addMemory(memoryEntry);
            } else if (this.vectorMemoryManager) {
                return await this.vectorMemoryManager.addMemory(memoryEntry);
            } else {
                throw new Error('No memory provider initialized');
            }
        } catch (error) {
            logger.error('Failed to add memory:', error);
            throw error;
        }
    }

    /**
     * Get all memories
     */
    public async getMemories(): Promise<MemoryEntry[]> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            if (this.memoryProvider) {
                return await this.memoryProvider.getMemories();
            } else if (this.vectorMemoryManager) {
                return await this.vectorMemoryManager.getMemories();
            } else {
                return [];
            }
        } catch (error) {
            logger.error('Failed to get memories:', error);
            return [];
        }
    }

    /**
     * Get a memory by ID
     */
    public async getMemory(id: string): Promise<MemoryEntry | undefined> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            if (this.memoryProvider) {
                return await this.memoryProvider.getMemory(id);
            } else if (this.vectorMemoryManager) {
                return await this.vectorMemoryManager.getMemory(id);
            } else {
                return undefined;
            }
        } catch (error) {
            logger.error(`Failed to get memory ${id}:`, error);
            return undefined;
        }
    }

    /**
     * Delete a memory by ID
     */
    public async deleteMemory(id: string): Promise<boolean> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            if (this.memoryProvider) {
                return await this.memoryProvider.deleteMemory(id);
            } else if (this.vectorMemoryManager) {
                return await this.vectorMemoryManager.deleteMemory(id);
            } else {
                return false;
            }
        } catch (error) {
            logger.error(`Failed to delete memory ${id}:`, error);
            return false;
        }
    }

    /**
     * Clear all memories
     */
    public async clearMemories(): Promise<void> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            if (this.memoryProvider) {
                await this.memoryProvider.clearMemories();
            } else if (this.vectorMemoryManager) {
                await this.vectorMemoryManager.clearMemories();
            }

            logger.info('All memories cleared');
        } catch (error) {
            logger.error('Failed to clear memories:', error);
            throw error;
        }
    }

    /**
     * Search memories
     */
    public async searchMemories(options: MemorySearchOptions): Promise<MemoryEntry[]> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            if (this.memoryProvider) {
                return await this.memoryProvider.searchMemories(options);
            } else if (this.vectorMemoryManager) {
                // Convert options to vector memory manager format
                return await this.vectorMemoryManager.searchMemories(options.query, options.limit);
            } else {
                return [];
            }
        } catch (error) {
            logger.error('Failed to search memories:', error);
            return [];
        }
    }

    /**
     * Search memories by semantic similarity
     */
    public async searchSimilarMemories(query: string, options: Partial<MemorySearchOptions> = {}): Promise<MemoryEntry[]> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            if (this.memoryProvider) {
                return await this.memoryProvider.searchSimilarMemories(query, options);
            } else if (this.vectorMemoryManager) {
                // Convert options to vector memory manager format
                return await this.vectorMemoryManager.searchSimilarMemories(query, options.limit);
            } else {
                return [];
            }
        } catch (error) {
            logger.error('Failed to search similar memories:', error);
            return [];
        }
    }

    /**
     * Process a message with LangGraph memory
     */
    public async processMessage(message: string): Promise<string> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            // Check if LangGraph memory is available
            if (getConfig<string>('memory.system', 'codessa') === 'codessa') {
                return await langGraphMemory.processMessage(message);
            } else {
                throw new Error('LangGraph memory not available');
            }
        } catch (error) {
            logger.error('Failed to process message with LangGraph memory:', error);
            throw error;
        }
    }

    /**
     * Chunk a file and store in memory
     */
    public async chunkFile(filePath: string): Promise<MemoryEntry[]> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            // Check if Codessa memory is available
            if (getConfig<string>('memory.system', 'codessa') === 'codessa') {
                return await FileChunkingService.chunkFile(filePath);
            } else {
                throw new Error('Codessa memory not available for file chunking');
            }
        } catch (error) {
            logger.error(`Failed to chunk file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Chunk a workspace folder and store in memory
     */
    public async chunkWorkspace(
        folderPath: string,
        includePatterns: string[] = ['**/*.{js,ts,jsx,tsx,py,java,c,cpp,cs,go,rb,php,html,css,md,json}'],
        excludePatterns: string[] = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
    ): Promise<MemoryEntry[]> {
        if (!this.initialized) {
            await this.initialize(this.context!);
        }

        try {
            // Check if Codessa memory is available
            if (getConfig<string>('memory.system', 'codessa') === 'codessa') {
                return await FileChunkingService.chunkWorkspace(folderPath, includePatterns, excludePatterns);
            } else {
                throw new Error('Codessa memory not available for workspace chunking');
            }
        } catch (error) {
            logger.error(`Failed to chunk workspace ${folderPath}:`, error);
            throw error;
        }
    }

    /**
     * Get memory settings
     */
    public getMemorySettings(): MemorySettings {
        if (this.memoryProvider && 'getMemorySettings' in this.memoryProvider) {
            return (this.memoryProvider as any).getMemorySettings();
        } else {
            // Return default settings
            return {
                enabled: getConfig<boolean>('memory.enabled', true),
                system: getConfig<'basic' | 'codessa'>('memory.system', 'codessa'),
                maxMemories: getConfig<number>('memory.maxMemories', 1000),
                relevanceThreshold: getConfig<number>('memory.relevanceThreshold', 0.7),
                contextWindowSize: getConfig<number>('memory.contextWindowSize', 5),
                conversationHistorySize: getConfig<number>('memory.conversationHistorySize', 100),
                vectorStore: getConfig<'memory' | 'chroma' | 'pinecone' | 'weaviate' | 'hnswlib'>('memory.vectorStore', 'chroma'),
                vectorStoreSettings: {
                    chroma: {
                        directory: getConfig<string>('memory.vectorStore.chroma.directory', './.codessa/chroma'),
                        collectionName: getConfig<string>('memory.vectorStore.chroma.collectionName', 'codessa_memories')
                    },
                    pinecone: {
                        apiKey: getConfig<string>('memory.vectorStore.pinecone.apiKey', ''),
                        environment: getConfig<string>('memory.vectorStore.pinecone.environment', ''),
                        indexName: getConfig<string>('memory.vectorStore.pinecone.indexName', 'codessa-memories')
                    }
                },
                database: getConfig<'sqlite' | 'mysql' | 'postgres' | 'mongodb' | 'redis'>('memory.database', 'sqlite'),
                databaseSettings: {
                    sqlite: {
                        filename: getConfig<string>('memory.database.sqlite.filename', './.codessa/memory.db')
                    },
                    mysql: {
                        host: getConfig<string>('memory.database.mysql.host', 'localhost'),
                        port: getConfig<number>('memory.database.mysql.port', 3306),
                        user: getConfig<string>('memory.database.mysql.user', 'root'),
                        password: getConfig<string>('memory.database.mysql.password', ''),
                        database: getConfig<string>('memory.database.mysql.database', 'codessa'),
                        table: getConfig<string>('memory.database.mysql.table', 'memories')
                    },
                    postgres: {
                        connectionString: getConfig<string>('memory.database.postgres.connectionString', ''),
                        schema: getConfig<string>('memory.database.postgres.schema', 'codessa')
                    },
                    mongodb: {
                        connectionString: getConfig<string>('memory.database.mongodb.connectionString', ''),
                        database: getConfig<string>('memory.database.mongodb.database', 'codessa'),
                        collection: getConfig<string>('memory.database.mongodb.collection', 'memories')
                    },
                    redis: {
                        url: getConfig<string>('memory.database.redis.url', ''),
                        keyPrefix: getConfig<string>('memory.database.redis.keyPrefix', 'codessa:')
                    }
                },
                fileChunking: {
                    chunkSize: getConfig<number>('memory.fileChunking.chunkSize', 1000),
                    chunkOverlap: getConfig<number>('memory.fileChunking.chunkOverlap', 200),
                    maxChunksPerFile: getConfig<number>('memory.fileChunking.maxChunksPerFile', 100)
                }
            };
        }
    }

    /**
     * Update memory settings
     */
    public async updateMemorySettings(settings: Partial<MemorySettings>): Promise<boolean> {
        try {
            if (this.memoryProvider && 'updateMemorySettings' in this.memoryProvider) {
                const result = await (this.memoryProvider as any).updateMemorySettings(settings);
                return result === true || result === undefined; // Handle both boolean returns and void returns
            } else {
                logger.error('Memory provider does not support updating settings');
                return false;
            }
        } catch (error) {
            logger.error('Failed to update memory settings:', error);
            return false;
        }
    }
}

// Export singleton instance
export const memoryManager = new MemoryManager();
