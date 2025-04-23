import * as vscode from 'vscode';
import * as z from 'zod';

/**
 * Memory entry interface
 */
export interface MemoryEntry {
    id: string;
    content: string;
    timestamp: number;
    embedding?: number[];
    metadata: {
        source: string;
        type: string;
        tags?: string[];
        [key: string]: any;
    };
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
    query: string;
    limit?: number;
    threshold?: number;
    filter?: {
        source?: string;
        type?: string;
        tags?: string[];
        fromTimestamp?: number;
        toTimestamp?: number;
        [key: string]: any;
    };
}

/**
 * Memory settings interface
 */
export interface MemorySettings {
    enabled: boolean;
    system: 'basic' | 'codessa';
    maxMemories: number;
    relevanceThreshold: number;
    contextWindowSize: number;
    conversationHistorySize: number;
    vectorStore: 'memory' | 'chroma' | 'pinecone' | 'weaviate' | 'hnswlib';
    vectorStoreSettings: {
        chroma: {
            directory: string;
            collectionName: string;
        };
        pinecone: {
            apiKey: string;
            environment: string;
            indexName: string;
        };
    };
    database: 'sqlite' | 'mysql' | 'postgres' | 'mongodb' | 'redis';
    databaseSettings: {
        sqlite: {
            filename: string;
        };
        mysql: {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
            table: string;
        };
        postgres: {
            connectionString: string;
            schema: string;
        };
        mongodb: {
            connectionString: string;
            database: string;
            collection: string;
        };
        redis: {
            url: string;
            keyPrefix: string;
        };
    };
    fileChunking: {
        chunkSize: number;
        chunkOverlap: number;
        maxChunksPerFile: number;
    };
}

/**
 * Base memory provider interface
 */
export interface IMemoryProvider {
    /**
     * Initialize the memory provider
     */
    initialize(context: vscode.ExtensionContext): Promise<void>;

    /**
     * Add a memory
     */
    addMemory(memory: Omit<MemoryEntry, 'id' | 'timestamp'>): Promise<MemoryEntry>;

    /**
     * Get all memories
     */
    getMemories(): Promise<MemoryEntry[]>;

    /**
     * Get a memory by ID
     */
    getMemory(id: string): Promise<MemoryEntry | undefined>;

    /**
     * Delete a memory by ID
     */
    deleteMemory(id: string): Promise<boolean>;

    /**
     * Clear all memories
     */
    clearMemories(): Promise<void>;

    /**
     * Search memories
     */
    searchMemories(options: MemorySearchOptions): Promise<MemoryEntry[]>;

    /**
     * Search memories by semantic similarity
     */
    searchSimilarMemories(query: string, options?: Partial<MemorySearchOptions>): Promise<MemoryEntry[]>;

    /**
     * Get memory settings
     */
    getMemorySettings(): MemorySettings;

    /**
     * Update memory settings
     */
    updateMemorySettings(settings: Partial<MemorySettings>): Promise<void>;
}

/**
 * Vector store interface
 */
export interface IVectorStore {
    /**
     * Initialize the vector store
     */
    initialize(): Promise<void>;

    /**
     * Add a vector
     */
    addVector(id: string, vector: number[], metadata?: Record<string, any>): Promise<void>;

    /**
     * Get a vector by ID
     */
    getVector(id: string): Promise<number[] | undefined>;

    /**
     * Delete a vector by ID
     */
    deleteVector(id: string): Promise<boolean>;

    /**
     * Clear all vectors
     */
    clearVectors(): Promise<void>;

    /**
     * Search for similar vectors
     */
    searchSimilarVectors(vector: number[], limit?: number, filter?: Record<string, any>): Promise<Array<{id: string, score: number}>>;
}

/**
 * Database interface
 */
export interface IDatabase {
    /**
     * Initialize the database
     */
    initialize(): Promise<void>;

    /**
     * Add a record
     */
    addRecord(collection: string, record: Record<string, any>): Promise<string>;

    /**
     * Get a record by ID
     */
    getRecord(collection: string, id: string): Promise<Record<string, any> | undefined>;

    /**
     * Update a record
     */
    updateRecord(collection: string, id: string, record: Record<string, any>): Promise<boolean>;

    /**
     * Delete a record
     */
    deleteRecord(collection: string, id: string): Promise<boolean>;

    /**
     * Query records
     */
    queryRecords(collection: string, query: Record<string, any>, limit?: number): Promise<Record<string, any>[]>;

    /**
     * Clear all records in a collection
     */
    clearCollection(collection: string): Promise<void>;
}

/**
 * Memory type
 */
export enum MemoryType {
    CONVERSATION = 'conversation',
    SEMANTIC = 'semantic',
    PROJECT = 'project',
    USER_PREFERENCE = 'user_preference',
    CODE = 'code',
    FILE = 'file'
}

/**
 * Memory source
 */
export enum MemorySource {
    CONVERSATION = 'conversation',
    FILE = 'file',
    WORKSPACE = 'workspace',
    USER = 'user',
    SYSTEM = 'system'
}
