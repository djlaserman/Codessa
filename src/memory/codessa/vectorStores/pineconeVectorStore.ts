import { Embeddings } from 'workflows/langgraph/corePolyfill';
import { PineconeStore } from 'workflows/langgraph/corePolyfill';
import { Document } from 'workflows/langgraph/corePolyfill'; // Used if addDocuments is chosen over addVectors
import { IVectorStore } from '../../types'; // Assuming path relative to the final file location
import { logger } from '../../../logger'; // Assuming path relative to the final file location
import { getConfig } from '../../../config'; // Assuming path relative to the final file location
import { PineconeClient, Vector, Index } from '@pinecone-database/pinecone'; // Use specific types

// Define the structure for Pinecone metadata more explicitly
type PineconeMetadata = Record<string, string | number | boolean | string[]>;

/**
 * Configuration interface for PineconeVectorStore
 */
interface PineconeConfig {
    apiKey: string;
    environment: string;
    indexName: string;
    namespace?: string; // Optional namespace for multi-tenancy
}

/**
 * Pinecone vector store implementation using the official Pinecone client and LangChain integration.
 * Handles initialization, adding, retrieving, deleting, clearing, and searching vectors in a Pinecone index.
 */
export class PineconeVectorStore implements IVectorStore {
    private embeddings: Embeddings;
    private config: PineconeConfig;
    private pineconeClient: PineconeClient | undefined;
    private pineconeIndex: Index<PineconeMetadata> | undefined;
    // PineconeStore from LangChain - used primarily for search abstraction if needed,
    // but direct client usage is often preferred for full feature access.
    // We will prioritize direct client usage for clarity and control,
    // but keep the instance if needed for LangChain compatibility methods.
    private langchainPineconeStore: PineconeStore | undefined;
    private initialized: boolean = false;
    private isInitializing: boolean = false;

    /**
     * Creates an instance of PineconeVectorStore.
     * @param embeddings - The embeddings model instance to use (primarily for LangChain compatibility if used).
     */
    constructor(embeddings: Embeddings) {
        this.embeddings = embeddings; // Store embeddings, mainly for potential LangChain Store usage

        const apiKey = getConfig<string>('memory.vectorStore.pinecone.apiKey', '');
        const environment = getConfig<string>('memory.vectorStore.pinecone.environment', '');
        const indexName = getConfig<string>('memory.vectorStore.pinecone.indexName', 'codessa-memories');
        const namespace = getConfig<string | undefined>('memory.vectorStore.pinecone.namespace', undefined); // Allow undefined namespace

        if (!apiKey || !environment || !indexName) {
            throw new Error('Pinecone configuration (apiKey, environment, indexName) is missing.');
        }

        this.config = {
            apiKey,
            environment,
            indexName,
            namespace,
        };

        logger.info(`PineconeVectorStore configured: Index='${this.config.indexName}', Environment='${this.config.environment}', Namespace='${this.config.namespace || '(default)'}'`);
    }

    /**
     * Initializes the connection to the Pinecone index.
     * Ensures the Pinecone client is ready and the target index is accessible.
     * This method is idempotent.
     * @throws {Error} If initialization fails (e.g., invalid credentials, index not found).
     */
    public async initialize(): Promise<void> {
        if (this.initialized || this.isInitializing) {
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
                logger.debug('PineconeVectorStore already initialized.');
            }
            return;
        }

        this.isInitializing = true;
        logger.info(`Initializing Pinecone vector store connection to index '${this.config.indexName}'...`);

        try {
            // 1. Initialize Pinecone Client
            this.pineconeClient = new PineconeClient();
            await this.pineconeClient.init({
                apiKey: this.config.apiKey,
                environment: this.config.environment,
            });
            logger.debug('Pinecone client initialized.');

            // 2. Get Index Handle
            // Note: This does NOT create the index. It must exist beforehand.
            this.pineconeIndex = this.pineconeClient.Index<PineconeMetadata>(this.config.indexName);
            logger.debug(`Handle obtained for Pinecone index '${this.config.indexName}'.`);

            // 3. Optional: Verify Index Connection (e.g., by describing stats)
            try {
                const stats = await this.pineconeIndex.describeIndexStats();
                logger.info(`Successfully connected to Pinecone index '${this.config.indexName}'. Stats:`, stats);
                // Store stats if needed, e.g., dimension: stats.dimension
            } catch (statsError: any) {
                logger.error(`Failed to verify connection or get stats for index '${this.config.indexName}'. Please ensure the index exists and credentials are correct.`, { message: statsError.message });
                throw new Error(`Failed to connect to Pinecone index '${this.config.indexName}': ${statsError.message}`);
            }

            // 4. Optional: Initialize LangChain PineconeStore if specific LangChain features are needed
            // This might be useful if integrating with chains that expect a LangChain VectorStore instance.
            // Otherwise, direct client usage (this.pineconeIndex) is sufficient.
            // this.langchainPineconeStore = await PineconeStore.fromExistingIndex(this.embeddings, {
            //     pineconeIndex: this.pineconeIndex,
            //     namespace: this.config.namespace,
            // });
            // logger.debug('LangChain PineconeStore wrapper initialized (optional).');


            this.initialized = true;
            logger.info(`Pinecone vector store initialized successfully for index '${this.config.indexName}'.`);

        } catch (error: any) {
            logger.error('Failed to initialize Pinecone vector store:', { message: error.message, stack: error.stack, config: { indexName: this.config.indexName, environment: this.config.environment, namespace: this.config.namespace } });
            this.initialized = false;
            this.pineconeClient = undefined;
            this.pineconeIndex = undefined;
            this.langchainPineconeStore = undefined;
            throw new Error(`Pinecone initialization failed: ${error.message}`);
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Throws an error if the vector store is not initialized.
     */
    private assertInitialized(): void {
        if (!this.initialized || !this.pineconeClient || !this.pineconeIndex) {
            logger.error('PineconeVectorStore accessed before successful initialization.', {
                initialized: this.initialized,
                hasClient: !!this.pineconeClient,
                hasIndex: !!this.pineconeIndex,
            });
            throw new Error('PineconeVectorStore is not initialized. Call initialize() first.');
        }
    }

    /**
     * Prepares metadata for Pinecone, ensuring compatibility.
     * Converts values to supported types (string, number, boolean, string[]).
     * Removes nested objects and unsupported types. Includes the original text content if provided.
     * @param metadata Raw metadata object.
     * @param textContent Optional text content associated with the vector.
     * @returns Sanitized metadata object suitable for Pinecone.
     */
    private sanitizeMetadata(metadata: Record<string, any>, textContent?: string): PineconeMetadata {
        const sanitized: PineconeMetadata = {};
        const MAX_METADATA_VALUE_LENGTH = 1024; // Example limit, adjust as needed
        const MAX_TAG_LENGTH = 100;
        const MAX_TAGS = 50;

        for (const key in metadata) {
            if (!Object.prototype.hasOwnProperty.call(metadata, key)) {
                continue;
            }

            const value = metadata[key];

            if (typeof value === 'string') {
                sanitized[key] = value.substring(0, MAX_METADATA_VALUE_LENGTH);
            } else if (typeof value === 'number' && Number.isFinite(value)) {
                sanitized[key] = value;
            } else if (typeof value === 'boolean') {
                sanitized[key] = value;
            } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
                // Ensure all items are strings and sanitize/limit them
                sanitized[key] = value
                    .map(tag => tag.substring(0, MAX_TAG_LENGTH))
                    .slice(0, MAX_TAGS);
            } else {
                // Log unsupported types/values
                logger.warn(`[${this.config.indexName}] Metadata key '${key}' has unsupported type '${typeof value}' or value. Skipping.`);
            }
        }

        // Optionally include the original text content in metadata if provided and not too long
        if (textContent && !sanitized['text']) { // Avoid overwriting if 'text' already exists
            sanitized['text'] = textContent.substring(0, MAX_METADATA_VALUE_LENGTH * 5); // Allow longer text field
        }

        return sanitized;
    }

    /**
     * Adds a vector with associated metadata to the Pinecone index.
     * Uses the direct Pinecone client for upserting.
     * @param id - A unique identifier for the vector.
     * @param vector - The vector embedding.
     * @param metadata - Metadata associated with the vector. Should contain simple key-value pairs.
     * @throws {Error} If the store is not initialized or if the upsert operation fails.
     */
    public async addVector(id: string, vector: number[], metadata: Record<string, any> = {}): Promise<void> {
        this.assertInitialized();

        // Extract potential text content for metadata inclusion
        const textContent = metadata?.content || metadata?.text || ''; // Look for common text fields
        const sanitizedMeta = this.sanitizeMetadata(metadata, typeof textContent === 'string' ? textContent : undefined);

        const vectorToUpsert: Vector<PineconeMetadata> = {
            id,
            values: vector,
            metadata: sanitizedMeta,
        };

        try {
            logger.debug(`[${this.config.indexName}] Upserting vector with ID ${id} (Namespace: ${this.config.namespace || 'none'})...`);
            const upsertRequest = {
                vectors: [vectorToUpsert],
                namespace: this.config.namespace,
            };
            await this.pineconeIndex!.upsert(upsertRequest);
            logger.info(`[${this.config.indexName}] Successfully upserted vector with ID ${id}.`);
        } catch (error: any) {
            logger.error(`[${this.config.indexName}] Failed to upsert vector with ID ${id}:`, { message: error.message, stack: error.stack, id, namespace: this.config.namespace });
            // Provide more context from Pinecone errors if possible
            if (error.response?.body) {
                logger.error(`[${this.config.indexName}] Pinecone error details:`, error.response.body);
            }
            throw new Error(`Failed to add vector ${id} to Pinecone: ${error.message}`);
        }
    }

    /**
     * Retrieves a vector embedding by its ID directly from Pinecone.
     * Note: This uses the direct Pinecone client, as it's not a standard part of the basic LangChain VectorStore interface.
     * @param id - The unique identifier of the vector to retrieve.
     * @returns The vector embedding as an array of numbers, or undefined if not found or on error.
     * @throws {Error} If the store is not initialized.
     */
    public async getVector(id: string): Promise<number[] | undefined> {
        this.assertInitialized();

        try {
            logger.debug(`[${this.config.indexName}] Fetching vector with ID ${id} (Namespace: ${this.config.namespace || 'none'})...`);
            const fetchResponse = await this.pineconeIndex!.fetch({ ids: [id], namespace: this.config.namespace });

            const record = fetchResponse?.vectors?.[id];
            if (record?.values) {
                logger.debug(`[${this.config.indexName}] Successfully fetched vector for ID ${id}.`);
                return record.values;
            } else {
                logger.debug(`[${this.config.indexName}] Vector with ID ${id} not found.`);
                return undefined;
            }
        } catch (error: any) {
            logger.error(`[${this.config.indexName}] Failed to fetch vector with ID ${id}:`, { message: error.message, stack: error.stack, id, namespace: this.config.namespace });
            if (error.response?.body) {
                logger.error(`[${this.config.indexName}] Pinecone error details:`, error.response.body);
            }
            // Don't throw, return undefined as per method signature on error
            return undefined;
        }
    }

    /**
     * Deletes a vector by its ID from the Pinecone index.
     * @param id - The unique identifier of the vector to delete.
     * @returns `true` if deletion was successful or the vector didn't exist, `false` on error.
     * @throws {Error} If the store is not initialized.
     */
    public async deleteVector(id: string): Promise<boolean> {
        this.assertInitialized();

        try {
            logger.debug(`[${this.config.indexName}] Deleting vector with ID ${id} (Namespace: ${this.config.namespace || 'none'})...`);
            await this.pineconeIndex!.delete1({ id, namespace: this.config.namespace }); // Use delete1 for single ID
            logger.info(`[${this.config.indexName}] Delete request successful for vector ID ${id} (vector may or may not have existed).`);
            return true; // Pinecone delete is idempotent, succeeds even if ID doesn't exist
        } catch (error: any) {
            logger.error(`[${this.config.indexName}] Failed to delete vector with ID ${id}:`, { message: error.message, stack: error.stack, id, namespace: this.config.namespace });
            if (error.response?.body) {
                logger.error(`[${this.config.indexName}] Pinecone error details:`, error.response.body);
            }
            return false;
        }
    }

    /**
     * Clears vectors from the Pinecone index.
     * If a namespace is configured, only that namespace is cleared.
     * If no namespace is configured, this will clear **ALL** vectors in the index.
     * **Warning:** This is a destructive operation.
     * @throws {Error} If the store is not initialized or if clearing fails.
     */
    public async clearVectors(): Promise<void> {
        this.assertInitialized();

        const target = this.config.namespace ? `namespace '${this.config.namespace}'` : 'the entire index';
        logger.warn(`[${this.config.indexName}] Attempting to clear all vectors from ${target}...`);

        try {
            if (this.config.namespace) {
                await this.pineconeIndex!.delete1({ namespace: this.config.namespace, deleteAll: true });
            } else {
                // Double-check or add safety config before allowing full index delete?
                // For now, proceed as configured.
                await this.pineconeIndex!.delete1({ deleteAll: true });
            }
            logger.info(`[${this.config.indexName}] Successfully cleared vectors from ${target}.`);
        } catch (error: any) {
            logger.error(`[${this.config.indexName}] Failed to clear vectors from ${target}:`, { message: error.message, stack: error.stack, namespace: this.config.namespace });
            if (error.response?.body) {
                logger.error(`[${this.config.indexName}] Pinecone error details:`, error.response.body);
            }
            throw new Error(`Failed to clear Pinecone vectors: ${error.message}`);
        }
    }

    /**
     * Searches for vectors similar to the provided query vector within the Pinecone index.
     * Supports metadata filtering using Pinecone's filter syntax.
     * @param vector - The query vector embedding.
     * @param limit - The maximum number of similar vectors to return.
     * @param filter - Optional metadata filter object conforming to Pinecone's filter syntax.
     *                 Example: `{ "genre": { "$eq": "fiction" }, "year": { "$gte": 2020 } }`
     * @returns A promise resolving to an array of objects, each containing the ID and similarity score.
     * @throws {Error} If the store is not initialized or if the search fails.
     */
    public async searchSimilarVectors(vector: number[], limit: number = 5, filter?: Record<string, any>): Promise<Array<{ id: string, score: number }>> {
        this.assertInitialized();

        if (!Array.isArray(vector) || vector.length === 0) {
            logger.error('Invalid query vector provided for similarity search.');
            throw new Error('Query vector must be a non-empty array of numbers.');
        }

        try {
            logger.debug(`[${this.config.indexName}] Searching for ${limit} similar vectors (Namespace: ${this.config.namespace || 'none'})...`, { filter: filter ? 'present' : 'absent' });

            const queryRequest = {
                vector,
                topK: limit,
                namespace: this.config.namespace,
                filter: filter, // Pass filter directly, assuming it's Pinecone compatible
                includeMetadata: false, // Don't need metadata here, just ID and score
                includeValues: false, // Don't need vector values
            };

            const queryResponse = await this.pineconeIndex!.query(queryRequest);

            const matches = queryResponse.matches || [];
            logger.debug(`[${this.config.indexName}] Pinecone query returned ${matches.length} matches.`);

            // Map results to the required format { id: string, score: number }
            const results = matches.map(match => ({
                id: match.id,
                // Ensure score is a number, default to 0 if missing (shouldn't happen with Pinecone)
                score: typeof match.score === 'number' ? match.score : 0,
            }));

            return results;

        } catch (error: any) {
            logger.error(`[${this.config.indexName}] Failed to search similar vectors:`, { message: error.message, stack: error.stack, limit, filter, namespace: this.config.namespace });
            if (error.response?.body) {
                logger.error(`[${this.config.indexName}] Pinecone error details:`, error.response.body);
            }
            // Return empty array on error as per original signature
            return [];
        }
    }

    /**
     * Provides direct access to the initialized Pinecone Index object for advanced operations.
     * Use with caution, as it bypasses the IVectorStore abstraction.
     * @returns The Pinecone Index instance.
     * @throws {Error} If the store is not initialized.
     */
    public getPineconeIndex(): Index<PineconeMetadata> {
        this.assertInitialized();
        return this.pineconeIndex!;
    }
}