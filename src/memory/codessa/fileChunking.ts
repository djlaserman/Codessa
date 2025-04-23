import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit'; // For concurrent processing
import { Readable, PassThrough } from 'stream';
import { promisify } from 'util';
import * as streamPromises from 'stream/promises'; // Use stream/promises for pipeline

// Core Polyfills (Ensure these paths are correct and polyfills are robust)
import { RecursiveCharacterTextSplitter } from 'workflows/langgraph/corePolyfill';
// Document might be used by specific chunkers or extractors later
// import { Document } from 'workflows/langgraph/corePolyfill';

// Local project imports (Ensure these paths are correct)
import { logger } from '../../logger';
import { getConfig } from '../../config';
import { MemoryEntry, MemorySource, MemoryType } from '../types';

// === Configuration ===

interface UniversalChunkingConfig {
    // General
    defaultChunkSize: number;
    defaultChunkOverlap: number;
    maxChunksPerSource: number; // Limit chunks per *any* source
    concurrencyLimit: number; // Concurrency for batch processing

    // Text specific
    textChunkingStrategy: 'recursive' | 'semantic' | string; // Allow custom named strategies
    recursiveSeparators: Record<string, string[]>; // Language specific separators
    defaultTextSeparators: string[];

    // Binary specific
    binaryChunkingStrategy: 'fixed' | string; // Allow custom named strategies
    fixedBinaryChunkSize: number; // Size for fixed binary chunks

    // Source specific (Examples)
    localFile: {
        maxFileSizeMB: number;
        allowedExtensions: string[]; // If empty, allow all (after exclusion)
        excludedPatterns: string[]; // Glob patterns for exclusion
    };
    // httpSource: { timeoutMs: number; maxRedirects: number; }; // Example
    // s3Source: { region: string; }; // Example
}

// === Interfaces ===

/**
 * Represents a source of data to be chunked (file, URL, DB query, etc.).
 */
interface IDataSource {
    /** Unique identifier for the source (e.g., file path, URL, db://table/id) */
    getUri(): string;
    /** Provides metadata about the source */
    getMetadata(): Promise<DataSourceMetadata>;
    /** Returns a readable stream of the source's content */
    getContentStream(): Promise<Readable>;
    /** Optional: Cleanup resources associated with the source */
    cleanup?(): Promise<void>;
}

interface DataSourceMetadata {
    uri: string;
    sourceType: string; // e.g., 'local_file', 'http_url', 's3_object', 'postgres_query'
    size?: number; // Size in bytes, if known
    lastModified?: Date;
    mimeType?: string; // Detected or provided MIME type
    fileName?: string; // Original file name, if applicable
    [key: string]: any; // Allow for additional source-specific metadata
}

/**
 * Extracts meaningful content (text, raw bytes, structured data) from a data source stream.
 */
interface IContentExtractor {
    /** Unique name for this extractor */
    getName(): string;
    /** Checks if this extractor can handle the given metadata */
    supports(metadata: DataSourceMetadata): boolean;
    /** Extracts content from the stream */
    extract(stream: Readable, metadata: DataSourceMetadata): Promise<ExtractedContent>;
}

interface ExtractedContent {
    /** The primary content type extracted (e.g., 'text/plain', 'application/pdf', 'image/jpeg', 'application/octet-stream') */
    contentType: string;
    /** The extracted content (string for text, Buffer for binary/raw) */
    content: string | Buffer;
    /** Additional metadata extracted from the content (e.g., PDF pages, image dimensions, text language) */
    metadata: Record<string, any>;
}

/**
 * Defines a strategy for splitting extracted content into chunks.
 */
interface IChunkingStrategy {
    /** Unique name for this strategy */
    getName(): string;
    /** Checks if this strategy applies to the extracted content type */
    supports(contentType: string): boolean;
    /** Chunks the content using an AsyncGenerator */
    chunk(content: ExtractedContent, config: UniversalChunkingConfig, sourceMetadata: DataSourceMetadata): AsyncGenerator<ChunkData>;
}

interface ChunkData {
    /** The content of the chunk (string or Buffer) */
    content: string | Buffer;
    /** Metadata specific to this chunk (e.g., chunk index, position) */
    metadata: Record<string, any>;
}

/**
 * Interface for the final step: storing the generated memory entry.
 * (This was previously implicitly `codessaMemoryProvider`)
 */
interface IMemoryStorer {
    storeMemory(entryData: { content: string | Buffer; metadata: Record<string, any> }): Promise<MemoryEntry>;
}

// === Results ===

interface ProcessResult {
    sourceUri: string;
    success: boolean;
    status: 'processed' | 'skipped' | 'error';
    chunkCount: number;
    addedEntries: MemoryEntry[];
    message?: string; // Reason for skip or error details
    metadata?: DataSourceMetadata;
    extractedContentType?: string;
    chunkingStrategyUsed?: string;
}

interface BatchProcessResult {
    totalSources: number;
    processedSources: number;
    skippedSources: number;
    failedSources: number;
    totalChunksAdded: number;
    results: ProcessResult[];
    errors: { uri: string; error: string }[];
}


// === Core Service ===

export class UniversalChunkingService {
    private readonly config: UniversalChunkingConfig;
    private readonly extractors: IContentExtractor[];
    private readonly chunkingStrategies: IChunkingStrategy[];
    private readonly memoryStorer: IMemoryStorer;

    constructor(
        config: UniversalChunkingConfig,
        extractors: IContentExtractor[],
        chunkingStrategies: IChunkingStrategy[],
        memoryStorer: IMemoryStorer
    ) {
        this.config = this.validateConfig(config);
        this.extractors = extractors;
        this.chunkingStrategies = chunkingStrategies;
        this.memoryStorer = memoryStorer;

        if (this.extractors.length === 0) {
            throw new Error("UniversalChunkingService requires at least one IContentExtractor.");
        }
        if (this.chunkingStrategies.length === 0) {
            throw new Error("UniversalChunkingService requires at least one IChunkingStrategy.");
        }
        logger.info("UniversalChunkingService initialized.");
    }

    private validateConfig(config: UniversalChunkingConfig): UniversalChunkingConfig {
        // Add thorough validation for all config options here
        config.defaultChunkSize = Math.max(50, config.defaultChunkSize || 1000);
        config.defaultChunkOverlap = Math.max(0, config.defaultChunkOverlap || 200);
        config.maxChunksPerSource = Math.max(1, config.maxChunksPerSource || 500);
        config.concurrencyLimit = Math.max(1, config.concurrencyLimit || 5);
        config.fixedBinaryChunkSize = Math.max(128, config.fixedBinaryChunkSize || 4096);
        config.localFile = config.localFile || { maxFileSizeMB: 100, allowedExtensions: [], excludedPatterns: [] };
        config.localFile.maxFileSizeMB = Math.max(0.1, config.localFile.maxFileSizeMB || 100);
        // Ensure overlap is less than chunk size
        config.defaultChunkOverlap = Math.min(config.defaultChunkOverlap, config.defaultChunkSize - 10);
        return config;
    }

    /**
     * Processes a batch of data sources concurrently.
     * @param dataSources An array of IDataSource instances.
     * @param progressCallback Optional callback for progress updates.
     * @returns A promise resolving to a BatchProcessResult.
     */
    public async processBatch(
        dataSources: IDataSource[],
        progressCallback?: (processed: number, total: number, currentUri?: string) => void
    ): Promise<BatchProcessResult> {
        const totalSources = dataSources.length;
        logger.info(`Starting batch processing for ${totalSources} data sources with concurrency ${this.config.concurrencyLimit}.`);

        const limit = pLimit(this.config.concurrencyLimit);
        const results: ProcessResult[] = [];
        let processedCount = 0;

        const processingPromises = dataSources.map((source, index) =>
            limit(async () => {
                const uri = source.getUri();
                logger.debug(`[Batch ${index + 1}/${totalSources}] Processing source: ${uri}`);
                if (progressCallback) {
                    progressCallback(processedCount, totalSources, uri);
                }
                const result = await this.processDataSource(source);
                results.push(result);
                processedCount++;
                if (progressCallback) {
                    // Update progress after completion
                    progressCallback(processedCount, totalSources);
                }
                logger.debug(`[Batch ${index + 1}/${totalSources}] Finished source: ${uri} - Status: ${result.status}`);
                return result; // p-limit expects a return value
            })
        );

        // Wait for all promises to settle
        await Promise.allSettled(processingPromises);

        // Aggregate results
        const batchResult: BatchProcessResult = {
            totalSources,
            processedSources: results.filter(r => r.status === 'processed').length,
            skippedSources: results.filter(r => r.status === 'skipped').length,
            failedSources: results.filter(r => r.status === 'error').length,
            totalChunksAdded: results.reduce((sum, r) => sum + r.chunkCount, 0),
            results: results,
            errors: results.filter(r => r.status === 'error').map(r => ({ uri: r.sourceUri, error: r.message || 'Unknown error' })),
        };

        logger.info(`Batch processing completed. Processed: ${batchResult.processedSources}, Skipped: ${batchResult.skippedSources}, Failed: ${batchResult.failedSources}, Chunks Added: ${batchResult.totalChunksAdded}`);
        if (batchResult.failedSources > 0) {
            logger.warn(`Batch processing encountered ${batchResult.failedSources} errors.`);
        }

        return batchResult;
    }


    /**
     * Processes a single data source: gets metadata, extracts content, chunks, and stores memory entries.
     * @param dataSource The IDataSource instance to process.
     * @returns A promise resolving to a ProcessResult.
     */
    public async processDataSource(dataSource: IDataSource): Promise<ProcessResult> {
        const sourceUri = dataSource.getUri();
        let metadata: DataSourceMetadata | undefined;
        let stream: Readable | undefined;
        let result: ProcessResult = { // Initialize result object
            sourceUri,
            success: false,
            status: 'error', // Default to error
            chunkCount: 0,
            addedEntries: [],
            message: 'Processing did not complete.',
        };

        try {
            // 1. Get Metadata
            logger.debug(`[${sourceUri}] Getting metadata...`);
            metadata = await dataSource.getMetadata();
            result.metadata = metadata; // Store metadata in result

            // 2. Check Preconditions (e.g., size limits for specific source types)
            if (metadata.sourceType === 'local_file' && metadata.size) {
                const fileSizeMB = metadata.size / (1024 * 1024);
                if (fileSizeMB > this.config.localFile.maxFileSizeMB) {
                    logger.warn(`[${sourceUri}] Skipping: File size ${fileSizeMB.toFixed(2)}MB exceeds limit ${this.config.localFile.maxFileSizeMB}MB.`);
                    return { ...result, success: false, status: 'skipped', message: `File size exceeds limit (${this.config.localFile.maxFileSizeMB}MB)` };
                }
                if (metadata.size === 0) {
                     logger.info(`[${sourceUri}] Skipping: File is empty.`);
                     return { ...result, success: false, status: 'skipped', message: 'Source is empty.' };
                }
            }
            // Add more source-specific precondition checks here

            // 3. Find Suitable Extractor
            logger.debug(`[${sourceUri}] Finding content extractor...`);
            const extractor = this.findExtractor(metadata);
            if (!extractor) {
                logger.warn(`[${sourceUri}] Skipping: No suitable content extractor found for metadata:`, metadata);
                return { ...result, success: false, status: 'skipped', message: 'No suitable content extractor found.' };
            }
            logger.debug(`[${sourceUri}] Using extractor: ${extractor.getName()}`);

            // 4. Get Content Stream
            logger.debug(`[${sourceUri}] Getting content stream...`);
            stream = await dataSource.getContentStream();

            // 5. Extract Content
            logger.debug(`[${sourceUri}] Extracting content...`);
            const extractedContent = await extractor.extract(stream, metadata);
            result.extractedContentType = extractedContent.contentType; // Store content type

            // Handle empty extracted content
            if ((typeof extractedContent.content === 'string' && extractedContent.content.length === 0) ||
                (Buffer.isBuffer(extractedContent.content) && extractedContent.content.length === 0)) {
                 logger.info(`[${sourceUri}] Skipping: Extracted content is empty.`);
                 // Consider this success, but skipped chunking
                 return { ...result, success: true, status: 'skipped', message: 'Extracted content is empty.', chunkCount: 0 };
            }

            // 6. Find Suitable Chunking Strategy
            logger.debug(`[${sourceUri}] Finding chunking strategy for content type: ${extractedContent.contentType}...`);
            const chunker = this.findChunkingStrategy(extractedContent.contentType);
            if (!chunker) {
                logger.warn(`[${sourceUri}] Skipping: No suitable chunking strategy found for content type: ${extractedContent.contentType}`);
                return { ...result, success: false, status: 'skipped', message: `No chunking strategy for ${extractedContent.contentType}` };
            }
            logger.debug(`[${sourceUri}] Using chunking strategy: ${chunker.getName()}`);
            result.chunkingStrategyUsed = chunker.getName(); // Store strategy used

            // 7. Chunk Content and Store Memory Entries
            logger.debug(`[${sourceUri}] Chunking content and storing entries...`);
            let chunkIndex = 0;
            const addedEntries: MemoryEntry[] = [];

            for await (const chunk of chunker.chunk(extractedContent, this.config, metadata)) {
                if (chunkIndex >= this.config.maxChunksPerSource) {
                    logger.warn(`[${sourceUri}] Reached maximum chunk limit (${this.config.maxChunksPerSource}). Stopping chunking for this source.`);
                    break;
                }

                // Simple check for effectively empty chunks (whitespace string or empty buffer)
                const isEmptyChunk = (typeof chunk.content === 'string' && chunk.content.trim().length === 0) ||
                                     (Buffer.isBuffer(chunk.content) && chunk.content.length === 0);

                if (isEmptyChunk) {
                    logger.debug(`[${sourceUri}] Skipping empty chunk at index ${chunkIndex}.`);
                    continue; // Don't increment chunkIndex for skipped empty chunks
                }

                const entryMetadata = this.prepareMemoryEntryMetadata(
                    metadata,
                    extractedContent,
                    chunk.metadata,
                    chunkIndex,
                    sourceUri
                );

                try {
                    const addedEntry = await this.memoryStorer.storeMemory({
                        content: chunk.content, // Pass string or Buffer directly
                        metadata: entryMetadata,
                    });
                    // Ensure the returned entry has an ID and merged metadata
                     if (!addedEntry.id) {
                        logger.warn(`[${sourceUri}] Memory storer did not return an ID for chunk ${chunkIndex}. Assigning fallback.`);
                        addedEntry.id = entryMetadata.chunkId || `chunk_${uuidv4()}`; // Use generated chunkId or UUID
                    }
                    addedEntry.metadata = { ...entryMetadata, ...addedEntry.metadata }; // Merge metadata
                    addedEntries.push(addedEntry);
                    chunkIndex++; // Increment only for successfully added non-empty chunks
                } catch (storeError: any) {
                    logger.error(`[${sourceUri}] Failed to store chunk ${chunkIndex}:`, storeError);
                    // Decide on error strategy: stop processing this source or continue?
                    // For now, stop processing this source on storage error.
                    throw new Error(`Failed to store chunk ${chunkIndex}: ${storeError.message}`);
                }
            }

            logger.info(`[${sourceUri}] Successfully processed and stored ${chunkIndex} chunks.`);
            result = {
                ...result,
                success: true,
                status: 'processed',
                chunkCount: chunkIndex,
                addedEntries: addedEntries,
                message: `Processed successfully with ${chunkIndex} chunks.`,
            };
            return result;

        } catch (error: any) {
            logger.error(`[${sourceUri}] Failed to process source:`, { message: error.message, stack: error.stack });
             // Ensure result reflects the error state
             result = {
                ...result, // Keep any previously set fields like metadata if available
                success: false,
                status: 'error',
                message: error.message || 'Unknown processing error.',
             };
            return result;
        } finally {
            // 8. Cleanup Data Source (if applicable)
            if (dataSource.cleanup) {
                try {
                    logger.debug(`[${sourceUri}] Cleaning up data source...`);
                    await dataSource.cleanup();
                } catch (cleanupError: any) {
                    logger.warn(`[${sourceUri}] Error during data source cleanup:`, cleanupError);
                }
            }
            // Ensure stream is destroyed if it exists and wasn't fully consumed or errored
            if (stream && !stream.destroyed) {
                stream.destroy();
            }
        }
    }

    private findExtractor(metadata: DataSourceMetadata): IContentExtractor | undefined {
        // Find the first extractor that supports the metadata
        return this.extractors.find(e => e.supports(metadata));
    }

    private findChunkingStrategy(contentType: string): IChunkingStrategy | undefined {
        // Find the first strategy that supports the content type
        return this.chunkingStrategies.find(cs => cs.supports(contentType));
    }

    private prepareMemoryEntryMetadata(
        sourceMetadata: DataSourceMetadata,
        extractedContent: ExtractedContent,
        chunkMetadata: Record<string, any>,
        chunkIndex: number,
        sourceUri: string
    ): Record<string, any> {
        // Combine metadata from all stages
        const combined = {
            // Source Info
            sourceUri: sourceUri,
            sourceType: sourceMetadata.sourceType,
            fileName: sourceMetadata.fileName,
            fileExtension: sourceMetadata.fileName ? path.extname(sourceMetadata.fileName).toLowerCase() : undefined,
            fileSize: sourceMetadata.size,
            fileMtime: sourceMetadata.lastModified?.toISOString(),

            // Extraction Info
            extractedContentType: extractedContent.contentType,
            ...extractedContent.metadata, // Metadata from the extractor (e.g., page number)

            // Chunking Info
            chunkIndex: chunkIndex,
            chunkId: `${sourceUri}::chunk_${chunkIndex}`, // Generate a predictable chunk ID
            ...chunkMetadata, // Metadata from the chunker itself

            // Standard Memory Entry Fields (Map from source/chunk info)
            id: `mem_${uuidv4()}`, // Let storer override this
            timestamp: Date.now(),
            // Determine MemorySource and MemoryType based on sourceType/contentType
            source: this.mapToMemorySource(sourceMetadata.sourceType),
            type: this.mapToMemoryType(extractedContent.contentType, sourceMetadata.sourceType),
            tags: this.generateTags(sourceMetadata, extractedContent),
        };

        // Remove undefined fields for cleaner metadata
        Object.keys(combined).forEach(key => (combined[key] === undefined) && delete combined[key]);
        return combined;
    }

    // Helper methods to map to your specific MemorySource/MemoryType enums
    private mapToMemorySource(sourceType: string): MemorySource {
        // Example mapping
        if (sourceType === 'local_file' || sourceType === 'http_url' || sourceType === 's3_object') return MemorySource.FILE;
        if (sourceType.includes('db') || sourceType.includes('database')) return MemorySource.DATABASE;
        // Add other mappings (WEB, USER_INPUT, etc.)
        return MemorySource.UNKNOWN; // Default
    }

    private mapToMemoryType(contentType: string, sourceType: string): MemoryType {
         // Example mapping - refine based on your needs
         if (contentType.startsWith('text/')) return MemoryType.TEXT;
         if (contentType.includes('pdf')) return MemoryType.DOCUMENT;
         if (contentType.includes('word') || contentType.includes('opendocument.text')) return MemoryType.DOCUMENT;
         if (contentType.startsWith('image/')) return MemoryType.IMAGE;
         if (contentType.startsWith('audio/')) return MemoryType.AUDIO;
         if (contentType.startsWith('video/')) return MemoryType.VIDEO;
         if (contentType === 'application/octet-stream' || contentType.includes('binary')) return MemoryType.BINARY;
         // Fallback based on source if content type is generic
         if (sourceType === 'local_file') return MemoryType.FILE; // Generic file
         return MemoryType.UNKNOWN; // Default
    }

     private generateTags(sourceMetadata: DataSourceMetadata, extractedContent: ExtractedContent): string[] {
        const tags = new Set<string>();
        tags.add(this.mapToMemorySource(sourceMetadata.sourceType).toLowerCase());
        tags.add(this.mapToMemoryType(extractedContent.contentType, sourceMetadata.sourceType).toLowerCase());

        if (sourceMetadata.fileName) {
            const ext = path.extname(sourceMetadata.fileName).toLowerCase().replace('.', '');
            if (ext) {
                tags.add(`ext:${ext}`);
            }
        }
        if (extractedContent.contentType) {
            tags.add(`mime:${extractedContent.contentType.replace('/', '_')}`);
        }
        // Add tags from extracted metadata if available (e.g., language)
        if (extractedContent.metadata?.language) {
            tags.add(`lang:${extractedContent.metadata.language}`);
        }

        return Array.from(tags);
    }
}


// === Default Implementations (Examples) ===

// --- Data Sources ---

export class LocalFileSource implements IDataSource {
    private readonly filePath: string;
    private readonly uri: string;

    constructor(filePath: string) {
        if (!path.isAbsolute(filePath)) {
            throw new Error(`LocalFileSource requires an absolute path. Received: ${filePath}`);
        }
        this.filePath = filePath;
        this.uri = `file://${this.filePath}`; // Use file URI scheme
    }

    getUri(): string {
        return this.uri;
    }

    async getMetadata(): Promise<DataSourceMetadata> {
        try {
            const stats = await fs.promises.stat(this.filePath);
            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${this.filePath}`);
            }
            // Basic MIME type detection (can be improved with libraries like 'mime-types' or 'file-type')
            const mimeType = this.detectMimeType(this.filePath);

            return {
                uri: this.uri,
                sourceType: 'local_file',
                size: stats.size,
                lastModified: stats.mtime,
                fileName: path.basename(this.filePath),
                mimeType: mimeType,
                filePath: this.filePath, // Include original path if needed downstream
            };
        } catch (error: any) {
            logger.error(`[${this.uri}] Error getting metadata:`, error);
            throw new Error(`Failed to get metadata for ${this.filePath}: ${error.message}`);
        }
    }

    async getContentStream(): Promise<Readable> {
        try {
            // Create stream only when requested
            const stream = fs.createReadStream(this.filePath);
            stream.on('error', (err) => {
                 logger.error(`[${this.uri}] Error reading file stream:`, err);
                 // Error handling is crucial for streams
            });
            return stream;
        } catch (error: any) {
            logger.error(`[${this.uri}] Error creating read stream:`, error);
            throw new Error(`Failed to create read stream for ${this.filePath}: ${error.message}`);
        }
    }

    // Basic MIME detection based on extension - replace with a robust library
    private detectMimeType(filePath: string): string | undefined {
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap: Record<string, string> = {
            '.txt': 'text/plain', '.md': 'text/markdown', '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
            '.json': 'application/json', '.xml': 'application/xml', '.pdf': 'application/pdf',
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
            '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
            '.mp4': 'video/mp4', '.webm': 'video/webm',
            '.zip': 'application/zip', '.gz': 'application/gzip',
            // Add many more...
        };
        return mimeMap[ext] || 'application/octet-stream'; // Default binary
    }

    // No cleanup needed for simple file reads
    // async cleanup(): Promise<void> {}
}

// --- Content Extractors ---

export class TextExtractor implements IContentExtractor {
    private readonly supportedMimeTypes: Set<string>;
    private readonly defaultEncoding: BufferEncoding;

    constructor(supportedMimeTypes: string[] = ['text/plain', 'text/markdown', 'text/html', 'text/css', 'text/javascript', 'application/json', 'application/xml'], defaultEncoding: BufferEncoding = 'utf-8') {
        this.supportedMimeTypes = new Set(supportedMimeTypes);
        this.defaultEncoding = defaultEncoding;
    }

    getName(): string { return 'TextExtractor'; }

    supports(metadata: DataSourceMetadata): boolean {
        // Support if MIME type matches OR if it's a file with a known text extension and no specific binary MIME
        const isSupportedMime = metadata.mimeType ? this.supportedMimeTypes.has(metadata.mimeType) : false;
        const isLikelyTextFile = metadata.sourceType === 'local_file' &&
                                 metadata.fileName &&
                                 ['.txt', '.md', '.log', '.csv', '.tsv', '.html', '.css', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rb', '.php', '.sh', '.bash', '.ps1', '.xml', '.json', '.yaml', '.yml', '.sql', '.graphql', '.gql', '.dockerfile', '.tf', '.hcl', '.swift', '.kt', '.kts', '.groovy', '.scala', '.rs', '.lua', '.pl', '.pm', '.r', '.dart', '.vue', '.svelte']
                                 .includes(path.extname(metadata.fileName).toLowerCase()) &&
                                 (!metadata.mimeType || metadata.mimeType === 'application/octet-stream'); // Allow override if explicitly binary

        return isSupportedMime || isLikelyTextFile;
    }

    async extract(stream: Readable, metadata: DataSourceMetadata): Promise<ExtractedContent> {
        try {
            // Read the entire stream into a buffer, then decode
            // For *very* large text files, stream processing line-by-line might be better,
            // but requires changes in chunking strategies too. This is simpler for now.
            const buffer = await this.streamToBuffer(stream);
            const content = buffer.toString(this.defaultEncoding); // Assume UTF-8, could try detecting encoding

            // TODO: Add language detection using a library (e.g., 'franc')
            // const language = detectLanguage(content);

            return {
                contentType: metadata.mimeType || 'text/plain', // Use detected MIME or default
                content: content,
                metadata: {
                    encoding: this.defaultEncoding,
                    // language: language // Add detected language if available
                },
            };
        } catch (error: any) {
            logger.error(`[${metadata.uri}] Error extracting text content:`, error);
            throw new Error(`Failed to extract text content: ${error.message}`);
        }
    }

    private async streamToBuffer(stream: Readable): Promise<Buffer> {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
}

export class BinaryExtractor implements IContentExtractor {
    getName(): string { return 'BinaryExtractor'; }

    supports(metadata: DataSourceMetadata): boolean {
        // Acts as a fallback for anything not handled by other extractors
        return true;
    }

    async extract(stream: Readable, metadata: DataSourceMetadata): Promise<ExtractedContent> {
         try {
            // Read the entire stream into a buffer
            const buffer = await this.streamToBuffer(stream);
            return {
                contentType: metadata.mimeType || 'application/octet-stream',
                content: buffer,
                metadata: {}, // No specific metadata extracted from raw bytes
            };
        } catch (error: any) {
            logger.error(`[${metadata.uri}] Error extracting binary content:`, error);
            throw new Error(`Failed to extract binary content: ${error.message}`);
        }
    }

     private async streamToBuffer(stream: Readable): Promise<Buffer> {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
}

// --- Chunking Strategies ---

export class RecursiveTextChunker implements IChunkingStrategy {
    getName(): string { return 'RecursiveTextChunker'; }

    supports(contentType: string): boolean {
        return contentType.startsWith('text/');
    }

    async *chunk(extracted: ExtractedContent, config: UniversalChunkingConfig, sourceMetadata: DataSourceMetadata): AsyncGenerator<ChunkData> {
        if (typeof extracted.content !== 'string') {
            logger.warn(`[${sourceMetadata.uri}] RecursiveTextChunker received non-string content type ${extracted.contentType}. Skipping.`);
            return;
        }

        const content = extracted.content;
        const chunkSize = config.defaultChunkSize;
        const chunkOverlap = config.defaultChunkOverlap;
        const extension = sourceMetadata.fileName ? path.extname(sourceMetadata.fileName).toLowerCase() : '.txt'; // Default extension

        // Get separators based on config or default
        const separators = config.recursiveSeparators?.[extension] ?? config.defaultTextSeparators ?? this.getDefaultSeparators();

        try {
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize,
                chunkOverlap,
                separators,
                keepSeparator: false,
                lengthFunction: (text) => text.length,
            });

            const textChunks = await splitter.splitText(content);

            for (let i = 0; i < textChunks.length; i++) {
                const chunkContent = textChunks[i];
                 // Skip whitespace-only chunks
                if (chunkContent.trim().length > 0) {
                    yield {
                        content: chunkContent,
                        metadata: {
                            chunker: this.getName(),
                            originalLength: chunkContent.length,
                            // Add line numbers if feasible/needed (requires more complex tracking)
                        },
                    };
                } else {
                     logger.debug(`[${sourceMetadata.uri}] Skipping whitespace-only text chunk at index ${i}.`);
                }
            }
        } catch (error: any) {
            logger.error(`[${sourceMetadata.uri}] Error during recursive text chunking:`, error);
            // Re-throw or handle as needed; maybe yield an error chunk?
            throw new Error(`Recursive text chunking failed: ${error.message}`);
        }
    }

    private getDefaultSeparators(): string[] {
         return ['\n\n', '\n', '. ', '? ', '! ', ' ', ''];
    }
}

export class FixedSizeBinaryChunker implements IChunkingStrategy {
    getName(): string { return 'FixedSizeBinaryChunker'; }

    supports(contentType: string): boolean {
        // Apply to generic binary or any type not handled by text chunkers
        return contentType === 'application/octet-stream' || !contentType.startsWith('text/');
    }

    async *chunk(extracted: ExtractedContent, config: UniversalChunkingConfig, sourceMetadata: DataSourceMetadata): AsyncGenerator<ChunkData> {
        if (!Buffer.isBuffer(extracted.content)) {
            logger.warn(`[${sourceMetadata.uri}] FixedSizeBinaryChunker received non-buffer content type ${extracted.contentType}. Skipping.`);
            return;
        }

        const buffer = extracted.content;
        const chunkSize = config.fixedBinaryChunkSize; // Use binary-specific chunk size
        const totalSize = buffer.length;

        if (totalSize === 0) {
            return; // No chunks for empty buffer
        }

        logger.debug(`[${sourceMetadata.uri}] Chunking binary data (${totalSize} bytes) into fixed sizes of ${chunkSize} bytes.`);

        for (let i = 0; i < totalSize; i += chunkSize) {
            const end = Math.min(i + chunkSize, totalSize);
            const chunkContent = buffer.slice(i, end);

            if (chunkContent.length > 0) {
                yield {
                    content: chunkContent, // Yield Buffer directly
                    metadata: {
                        chunker: this.getName(),
                        startByte: i,
                        endByte: end,
                        chunkSize: chunkContent.length,
                    },
                };
            }
        }
    }
}

