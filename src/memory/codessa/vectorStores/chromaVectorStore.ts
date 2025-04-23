import { Embeddings } from 'workflows/langgraph/corePolyfill';
import { Chroma } from 'workflows/langgraph/corePolyfill';
import { Document } from 'workflows/langgraph/corePolyfill';
import { IVectorStore } from '../../types'; // Assuming this path is correct relative to the final file location
import { logger } from '../../../logger'; // Assuming this path is correct relative to the final file location
import { getConfig } from '../../../config'; // Assuming this path is correct relative to the final file location
import * as path from 'path';
import * as fs from 'fs';

// Define expected response structures if not provided by the polyfill's types
interface ChromaGetResponse {
    ids: string[];
    embeddings: number[][] | null;
    documents: string[] | null;
    metadatas: Record<string, any>[] | null;
}

// Interface representing the expected methods on the polyfilled Chroma class instance
// Based on common LangChain Chroma wrapper patterns and the methods used in the original code.
interface IChromaPolyfillInstance {
    addDocuments(documents: Document[], options?: { ids?: string[] }): Promise<string[]>;
    get(options?: {
        ids?: string[];
        where?: Record<string, any>;
        limit?: number;
        offset?: number;
        include?: ('documents' | 'metadatas' | 'embeddings')[];
        whereDocument?: Record<string, any>;
    }): Promise<ChromaGetResponse>;
    delete(options?: {
        ids?: string[];
        where?: Record<string, any>;
        whereDocument?: Record<string, any>;
    }): Promise<string[]>; // Returns IDs of deleted items
    similaritySearchWithScore(
        query: string, // LangChain standard often uses text query
        k: number,
        filter?: Record<string, any> | undefined,
        // include?: ('documents' | 'metadatas' | 'distances')[] | undefined // Not standard in similaritySearchWithScore
    ): Promise<[Document, number][]>; // Returns Documents and scores

    // If the polyfill *truly* supports direct vector search (less common in basic LangChain wrappers):
    similaritySearchByVectorWithScore?(
        embedding: number[],
        k: number,
        filter?: Record<string, any> | undefined,
    ): Promise<[Document, number][]>;
}

/**
 * Configuration interface for ChromaVectorStore
 */
interface ChromaVectorStoreConfig {
    collectionName: string;
    directory: string;
    vectorSpace: 'cosine' | 'l2' | 'ip'; // Inner product
}

/**
 * Chroma vector store implementation using a polyfill.
 * Provides production-ready features for managing vector embeddings with Chroma.
 */
export class ChromaVectorStore implements IVectorStore {
    // Use the specific polyfill instance type
    private vectorStore: IChromaPolyfillInstance | undefined;
    private readonly embeddings: Embeddings;
    private readonly config: ChromaVectorStoreConfig;
    private isInitialized: boolean = false;
    private isInitializing: boolean = false; // Prevent race conditions

    /**
     * Creates an instance of ChromaVectorStore.
     * @param embeddings - The embeddings model instance to use.
     */
    constructor(embeddings: Embeddings) {
        this.embeddings = embeddings;

        const collectionName = getConfig<string>('memory.vectorStore.chroma.collectionName', 'codessa_memories');
        const directory = getConfig<string>('memory.vectorStore.chroma.directory', path.resolve(process.cwd(), '.codessa/chroma')); // Ensure absolute path
        const vectorSpace = getConfig<'cosine' | 'l2' | 'ip'>('memory.vectorStore.chroma.vectorSpace', 'cosine');

        this.config = {
            collectionName,
            directory,
            vectorSpace,
        };

        logger.info(`ChromaVectorStore configured: Collection='${this.config.collectionName}', Directory='${this.config.directory}', Space='${this.config.vectorSpace}'`);
    }

    /**
     * Initializes the Chroma vector store.
     * Creates the persistence directory if it doesn't exist and connects to the Chroma collection.
     * This method must be called before any other operations and is idempotent.
     * @throws {Error} If initialization fails.
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized || this.isInitializing) {
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
            if (this.isInitialized) {
                logger.debug('ChromaVectorStore already initialized.');
            }
            return;
        }

        this.isInitializing = true;
        logger.info(`Initializing Chroma vector store at ${this.config.directory} for collection ${this.config.collectionName}...`);

        try {
            // Ensure directory exists using async fs operations
            await fs.promises.mkdir(this.config.directory, { recursive: true });
            logger.debug(`Persistence directory ensured: ${this.config.directory}`);

            // Initialize Chroma using Chroma.fromDocuments factory pattern.
            // This pattern is common for creating/connecting to a persistent collection.
            // Using it with an empty array ensures the collection exists or is created.
            // The options object needs correct keys.
            this.vectorStore = await Chroma.fromDocuments(
                [], // Empty documents array to ensure collection exists/connects
                this.embeddings,
                {
                    collectionName: this.config.collectionName,
                    persistDirectory: this.config.directory, // Correct key for persistence path
                    collectionMetadata: { // Correct key for metadata
                        'hnsw:space': this.config.vectorSpace,
                    },
                    // url: undefined, // Explicitly undefined if using local path
                }
                // Cast to our expected interface after the await resolves
            ) as unknown as IChromaPolyfillInstance;


            if (!this.vectorStore) {
                throw new Error('Failed to get a valid Chroma instance from the polyfill.');
            }

            // Optional: Verify connection if possible (e.g., try a simple operation like count)
            // This depends heavily on the polyfill's capabilities.
            // await this.vectorStore.count(); // Example, if count() exists

            this.isInitialized = true;
            logger.info(`Chroma vector store initialized successfully. Collection: ${this.config.collectionName}`);
        } catch (error: any) {
            logger.error('Failed to initialize Chroma vector store:', {
                message: error.message,
                stack: error.stack,
                config: this.config
            });
            // Clear potentially partial state
            this.vectorStore = undefined;
            this.isInitialized = false;
            throw new Error(`Chroma initialization failed: ${error.message}`);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Throws an error if the vector store is not initialized.
     */
    private assertInitialized(): void {
        if (!this.isInitialized || !this.vectorStore) {
            logger.error('ChromaVectorStore accessed before successful initialization.', {
                initialized: this.isInitialized,
                hasStore: !!this.vectorStore,
            });
            throw new Error('ChromaVectorStore is not initialized. Call initialize() first.');
        }
    }

    /**
     * Adds a document to the vector store.
     * The vector embedding is generated internally by Chroma using the provided text content
     * and the embeddings model configured during initialization. The `vector` parameter is ignored.
     * @param id - A unique identifier for the vector/document.
     * @param vector - The vector embedding (ignored in this implementation).
     * @param metadata - Metadata associated with the vector, must include `content` field for embedding generation.
     * @throws {Error} If the store is not initialized or if the addition fails.
     */
    public async addVector(id: string, vector: number[], metadata: Record<string, any>): Promise<void> {
        // Call assertInitialized correctly inside the method
        this.assertInitialized();

        const pageContent = metadata?.content;
        if (typeof pageContent !== 'string' || pageContent.trim() === '') {
            logger.warn(`Metadata must include a non-empty 'content' field for ID ${id}. Skipping addition.`);
            throw new Error(`Missing or empty 'content' in metadata for adding vector with ID ${id}`);
        }

        // Create a document suitable for Chroma's addDocuments method
        // Correct Document instantiation
        const document = new Document({
            pageContent: pageContent,
            metadata: {
                ...metadata,
                // Use a consistent key, e.g., `doc_id` to avoid clashes
                doc_id: id
            }
        });

        try {
            logger.debug(`Adding document with ID ${id} to Chroma collection ${this.config.collectionName}`);
            // Correct call to addDocuments, passing an array and options object
            const addedIds = await this.vectorStore!.addDocuments([document], { ids: [id] });

            if (!addedIds || addedIds.length === 0 || !addedIds.includes(id)) {
                logger.warn(`Chroma addDocuments may not have confirmed addition for ID ${id}. Response: ${JSON.stringify(addedIds)}`);
                // Optionally throw error depending on strictness required
                // throw new Error(`Failed to confirm addition of document with ID ${id}`);
            } else {
                logger.info(`Successfully added document with ID ${id} to Chroma.`);
            }

        } catch (error: any) {
            logger.error(`Failed to add document with ID ${id} to Chroma:`, {
                message: error.message,
                stack: error.stack,
                id: id,
                // Avoid logging potentially large/sensitive metadata directly in production errors
                metadataKeys: Object.keys(metadata)
            });
            throw new Error(`Failed to add vector for ID ${id}: ${error.message}`);
        }
    }

    /**
     * Retrieves a vector embedding by its ID.
     * @param id - The unique identifier of the vector to retrieve.
     * @returns The vector embedding as an array of numbers, or undefined if not found or on error.
     * @throws {Error} If the store is not initialized.
     */
    public async getVector(id: string): Promise<number[] | undefined> {
        // Call assertInitialized correctly inside the method
        this.assertInitialized();

        try {
            logger.debug(`Attempting to retrieve vector with ID ${id} from Chroma collection ${this.config.collectionName}`);

            // Correct call to 'get' method with proper options object
            const result: ChromaGetResponse = await this.vectorStore!.get({
                ids: [id],
                include: ['embeddings'] // Request only embeddings
            });

            // Process the response correctly
            if (result && result.embeddings && result.embeddings.length > 0 && result.ids?.includes(id)) {
                const index = result.ids.indexOf(id);
                if (index !== -1 && result.embeddings[index]) {
                    logger.debug(`Successfully retrieved vector for ID ${id}.`);
                    return result.embeddings[index];
                }
            }

            logger.debug(`Vector with ID ${id} not found in Chroma collection ${this.config.collectionName}.`);
            return undefined;
        } catch (error: any) {
            // Handle cases where 'get' might not be implemented or fails
            if (error.message?.includes('not implemented') || error.message?.includes('method not found')) {
                logger.warn(`Chroma polyfill does not support the 'get' method for ID ${id}. Direct retrieval not possible.`);
            } else {
                logger.error(`Failed to get vector with ID ${id} from Chroma:`, {
                    message: error.message,
                    stack: error.stack,
                    id: id
                });
            }
            // Regardless of error reason, return undefined as vector couldn't be retrieved
            return undefined;
        }
    }

    /**
     * Deletes a vector by its ID.
     * @param id - The unique identifier of the vector to delete.
     * @returns `true` if deletion was successful or the vector didn't exist, `false` on error.
     * @throws {Error} If the store is not initialized.
     */
    public async deleteVector(id: string): Promise<boolean> {
        // Call assertInitialized correctly inside the method
        this.assertInitialized();

        try {
            logger.debug(`Attempting to delete vector with ID ${id} from Chroma collection ${this.config.collectionName}`);
            // Correct call to 'delete' method with proper options object
            const deletedIds = await this.vectorStore!.delete({ ids: [id] });

            // Chroma's delete often returns the IDs *attempted* to delete, not necessarily confirming existence.
            // Success here means the API call didn't throw an error.
            logger.info(`Delete request successful for vector ID ${id} (vector may or may not have existed).`);
            return true; // Return true as the operation completed without error

        } catch (error: any) {
            logger.error(`Failed to delete vector with ID ${id} from Chroma:`, {
                message: error.message,
                stack: error.stack,
                id: id
            });
            return false;
        }
    }

    /**
     * Clears all vectors from the collection.
     * Warning: This is a destructive operation.
     * @throws {Error} If the store is not initialized or if clearing fails.
     */
    public async clearVectors(): Promise<void> {
        // Call assertInitialized correctly inside the method
        this.assertInitialized();
        logger.warn(`Attempting to clear all vectors from Chroma collection ${this.config.collectionName}...`);

        try {
            // Try deleting all documents using a broad filter (e.g., where: {}).
            // This depends on the polyfill supporting this feature in the 'delete' method.
            try {
                // Correct call to 'delete' with 'where' option
                await this.vectorStore!.delete({ where: {} });
                logger.info(`Successfully cleared all vectors from Chroma collection ${this.config.collectionName} using empty where clause.`);
                return; // Exit if successful
            } catch (e: any) {
                // If `where: {}` is not supported or fails, log it and try the fallback.
                logger.warn(`Clearing using empty 'where' clause failed or is not supported by polyfill: ${e.message}. Attempting fallback...`);
            }

            // Fallback: Get all document IDs and delete them (less efficient)
            logger.debug("Fallback: Retrieving all document IDs for clearing...");
            // Correct call to 'get' to retrieve all IDs (potentially limited by Chroma server settings)
            const allDocsResponse = await this.vectorStore!.get({
                // No filter needed, get all
                include: [], // Only need IDs
                // limit: large_number // Optional: if needed and supported
            });

            if (allDocsResponse && allDocsResponse.ids && allDocsResponse.ids.length > 0) {
                const allIds = allDocsResponse.ids;
                logger.debug(`Retrieved ${allIds.length} IDs for clearing. Deleting in batches...`);

                // Delete IDs in batches to avoid potential request size limits
                const batchSize = 100; // Adjust batch size as needed
                for (let i = 0; i < allIds.length; i += batchSize) {
                    const batchIds = allIds.slice(i, i + batchSize);
                    // Correct call to 'delete' with 'ids' option
                    await this.vectorStore!.delete({ ids: batchIds });
                    logger.debug(`Deleted batch ${i / batchSize + 1} of IDs.`);
                }
                logger.info(`Successfully cleared all ${allIds.length} vectors from Chroma collection ${this.config.collectionName} using ID list fallback.`);
            } else {
                logger.info(`Chroma collection ${this.config.collectionName} is already empty or no IDs were retrieved.`);
            }
        } catch (error: any) {
            logger.error(`Failed to clear Chroma vector store collection ${this.config.collectionName}:`, {
                message: error.message,
                stack: error.stack,
            });
            throw new Error(`Failed to clear vectors: ${error.message}`);
        }
    }

    /**
     * Searches for vectors similar to the provided query vector.
     * Uses `similaritySearchByVectorWithScore` if available, otherwise falls back to `similaritySearchWithScore`.
     * @param vector - The query vector embedding.
     * @param limit - The maximum number of similar vectors to return.
     * @param filter - Optional metadata filter to apply during the search (key-value pairs, syntax depends on Chroma implementation).
     * @returns A promise resolving to an array of objects, each containing the ID and similarity score.
     * @throws {Error} If the store is not initialized or if the search fails.
     */
    public async searchSimilarVectors(vector: number[], limit: number = 5, filter?: Record<string, any>): Promise<Array<{ id: string, score: number }>> {
        // Call assertInitialized correctly inside the method
        this.assertInitialized();

        if (!Array.isArray(vector) || vector.length === 0) {
            logger.error('Invalid query vector provided for similarity search.');
            throw new Error('Query vector must be a non-empty array of numbers.');
        }

        try {
            logger.debug(`Searching for ${limit} similar vectors in Chroma collection ${this.config.collectionName}`, { filter: filter ? 'present' : 'absent' });

            let resultsWithScores: [Document<Record<string, any>>, number][] = [];

            // Prefer direct vector search if available in the polyfill
            if (this.vectorStore!.similaritySearchByVectorWithScore) {
                logger.debug("Using similaritySearchByVectorWithScore...");
                resultsWithScores = await this.vectorStore!.similaritySearchByVectorWithScore(
                    vector,
                    limit,
                    filter
                );
            } else if (this.vectorStore!.similaritySearchWithScore) {
                // Fallback: Use text-based search with an empty query string.
                // This relies on Chroma/LangChain implementation details where an empty query
                // might still trigger vector search if embeddings are managed internally,
                // OR it might perform poorly if it expects actual text.
                // A dummy query string might be needed if empty string fails.
                logger.warn("Polyfill lacks similaritySearchByVectorWithScore. Falling back to similaritySearchWithScore with an empty query. Accuracy may vary.");
                const dummyQuery = ""; // Or perhaps a representation of the vector if needed?
                resultsWithScores = await this.vectorStore!.similaritySearchWithScore(
                    dummyQuery,
                    limit,
                    filter
                );
            } else {
                throw new Error("Chroma polyfill instance does not support required similarity search methods (similaritySearchByVectorWithScore or similaritySearchWithScore).");
            }


            if (!resultsWithScores) {
                logger.warn('Similarity search returned null or undefined results.');
                return [];
            }

            // Map results to the required format: { id: string, score: number }
            const mappedResults = resultsWithScores.map(([doc, score]) => {
                // Attempt to extract the original ID stored in metadata under 'doc_id'
                const id = doc.metadata?.doc_id;
                if (!id) {
                    logger.warn(`Found similar document without 'doc_id' in metadata:`, doc.metadata);
                    return null; // Skip results without our designated ID field
                }

                // Score interpretation: LangChain's similaritySearchWithScore typically returns
                // a similarity score (higher is better), often cosine similarity [0, 1].
                // If it returns distance, conversion is needed (as done previously).
                // We assume the returned 'score' is already a similarity score.
                const similarityScore = typeof score === 'number' ? score : 0; // Default to 0 if score is invalid

                return { id: String(id), score: similarityScore };
            }).filter(result => result !== null) as Array<{ id: string, score: number }>; // Filter out nulls

            logger.info(`Found ${mappedResults.length} similar vector(s) matching criteria.`);
            return mappedResults;

        } catch (error: any) {
            logger.error('Failed to search for similar vectors in Chroma:', {
                message: error.message,
                stack: error.stack,
                limit: limit,
                filterKeys: filter ? Object.keys(filter) : [], // Avoid logging sensitive filter values
            });
            // Return empty array on error
            return [];
        }
    }
}