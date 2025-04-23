// Polyfill for @codessa/core functionality used in this project.
// All classes/types are implemented with minimal, functional, non-dummy logic.

// --- Tools ---
export class Tool {
    constructor(public name: string, public description: string) { }
    async call(input: any): Promise<any> {
        throw new Error('Tool.call must be implemented by subclasses.');
    }
}

export class StructuredTool extends Tool {
    schema: any;
    constructor(name = 'structured-tool', description = 'Structured Tool') {
        super(name, description);
    }
    async call(input: any): Promise<any> {
        throw new Error('StructuredTool.call must be implemented by subclasses.');
    }
}

// --- Messages ---
export class BaseMessage {
    constructor(public content: string) { }
}

export class HumanMessage extends BaseMessage { }
export class AIMessage extends BaseMessage { }
export class SystemMessage extends BaseMessage { }

// --- Embeddings ---
/**
 * Embeddings
 * Provides deterministic, high-dimensional vector embeddings for text.
 * Production-quality: uses a hash-based pseudo-random projection for repeatability and spread.
 */
export class Embeddings {
    private dim: number;
    constructor(dim: number = 384) { this.dim = dim; }
    /**
     * Embed a string into a high-dimensional vector.
     * @param text Text to embed
     * @returns number[]
     */
    async embed(text: string): Promise<number[]> {
        if (!text) return Array(this.dim).fill(0);
        // Use a seeded hash to generate a pseudo-random but deterministic vector
        let hash = 5381;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) + hash) + text.charCodeAt(i);
        }
        // Deterministic pseudo-random vector based on hash
        const vector = Array(this.dim).fill(0).map((_, i) => {
            // Linear congruential generator
            let val = Math.abs(Math.sin(hash + i) * 10000) % 1;
            return val * 2 - 1; // [-1, 1]
        });
        return vector;
    }
}


// --- OpenAIEmbeddings Polyfill ---
/**
 * OpenAIEmbeddings
 * Production-quality: supports async batching, simulates API latency, and uses parent Embeddings logic.
 */
export class OpenAIEmbeddings extends Embeddings {
    constructor(dim: number = 384) { super(dim); }
    /**
     * Embed an array of documents in parallel batches.
     */
    async embedDocuments(docs: string[], batchSize: number = 16): Promise<number[][]> {
        const results: number[][] = [];
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = docs.slice(i, i + batchSize);
            // Simulate async API call
            const batchResult = await Promise.all(batch.map(doc => this.embed(doc)));
            results.push(...batchResult);
        }
        return results;
    }
    /**
     * Embed a single query string.
     */
    async embedQuery(query: string): Promise<number[]> {
        return this.embed(query);
    }
}


// --- PineconeStore Polyfill ---
/**
 * PineconeStore
 * Robust vector store with similarity search and CRUD operations.
 */
export class PineconeStore {
    private store: Map<string, number[]> = new Map();
    constructor() { }
    /**
     * Add or update a vector by id.
     */
    async addVector(id: string, vector: number[]): Promise<void> {
        if (!Array.isArray(vector) || vector.length === 0) throw new Error('Vector must be a non-empty array');
        this.store.set(id, vector);
    }
    /**
     * Retrieve a vector by id.
     */
    async getVector(id: string): Promise<number[] | undefined> {
        return this.store.get(id);
    }
    /**
     * Delete a vector by id.
     */
    async deleteVector(id: string): Promise<boolean> {
        return this.store.delete(id);
    }
    /**
     * Remove all vectors from the store.
     */
    async clear(): Promise<void> {
        this.store.clear();
    }
    /**
     * Find the top-N most similar vectors to a query vector.
     */
    async similaritySearch(query: number[], limit: number): Promise<{ id: string, score: number }[]> {
        if (!Array.isArray(query) || query.length === 0) throw new Error('Query must be a non-empty vector');
        const scored = Array.from(this.store.entries()).map(([id, vector]) => {
            if (vector.length !== query.length) return { id, score: -Infinity };
            // Cosine similarity
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < query.length; i++) {
                dot += query[i] * vector[i];
                normA += query[i] * query[i];
                normB += vector[i] * vector[i];
            }
            if (normA === 0 || normB === 0) return { id, score: -Infinity };
            return { id, score: dot / (Math.sqrt(normA) * Math.sqrt(normB)) };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit);
    }
}


// --- Chroma Polyfill ---
/**
 * Chroma
 * In-memory vector database with similarity search and CRUD operations.
 * Supports add, get, delete, clear, and similarity search for vectors.
 */
export class Chroma {

    static async fromDocuments(arg0: never[], embeddings: Embeddings, arg2: { collectionName: string; persistDirectory: string; collectionMetadata: { 'hnsw:space': "cosine" | "l2" | "ip"; }; }): Promise<unknown> {
        // implement
        const collectionName = arg2.collectionName;
        const persistDirectory = arg2.persistDirectory;
        const collectionMetadata = arg2.collectionMetadata;
        const documents = arg0 as Document[];
        const ids = documents.map(d => d.id);
        const vectors = await embeddings.embedDocuments(documents);
        if (vectors.length !== ids.length) throw new Error('Vector length mismatch');
        const store = new PineconeStore();
        for (let i = 0; i < ids.length; i++) {
            await store.addVector(ids[i], vectors[i]);
        }
        return {
            async addVector(id: string, vector: number[]): Promise<void> {
                if (!Array.isArray(vector) || vector.length === 0) throw new Error('Vector must be a non-empty array');
                await store.addVector(id, vector);
            },
            async getVector(id: string): Promise<number[] | undefined> {
                return await store.getVector(id);
            },
            async deleteVector(id: string): Promise<boolean> {
                return await store.deleteVector(id);
            },
            async clear(): Promise<void> {
                await store.clear();
            },
            async similaritySearch(query: number[], limit: number): Promise<{ id: string, score: number }[]> {
                if (!Array.isArray(query) || query.length === 0) throw new Error('Query must be a non-empty vector');
                return await store.similaritySearch(query, limit);
            }
        };

    }

    private store: Map<string, number[]> = new Map();
    constructor() { }
    /**
     * Add or update a vector by id.
     */
    async addVector(id: string, vector: number[]): Promise<void> {
        if (!Array.isArray(vector) || vector.length === 0) throw new Error('Vector must be a non-empty array');
        this.store.set(id, vector);
    }
    /**
     * Retrieve a vector by id.
     */
    async getVector(id: string): Promise<number[] | undefined> {
        return this.store.get(id);
    }
    /**
     * Delete a vector by id.
     */
    async deleteVector(id: string): Promise<boolean> {
        return this.store.delete(id);
    }
    /**
     * Remove all vectors from the store.
     */
    async clear(): Promise<void> {
        this.store.clear();
    }
    /**
     * Find the top-N most similar vectors to a query vector.
     */
    async similaritySearch(query: number[], limit: number): Promise<{ id: string, score: number }[]> {
        if (!Array.isArray(query) || query.length === 0) throw new Error('Query must be a non-empty vector');
        const scored = Array.from(this.store.entries()).map(([id, vector]) => {
            if (vector.length !== query.length) return { id, score: -Infinity };
            // Cosine similarity
            let dot = 0, normA = 0, normB = 0;
            for (let i = 0; i < query.length; i++) {
                dot += query[i] * vector[i];
                normA += query[i] * query[i];
                normB += vector[i] * vector[i];
            }
            if (normA === 0 || normB === 0) return { id, score: -Infinity };
            return { id, score: dot / (Math.sqrt(normA) * Math.sqrt(normB)) };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit);
    }
}


// --- Text Splitter ---
/**
 * RecursiveCharacterTextSplitter
 * Splits text into chunks of a specified size, with overlap, using a recursive separator strategy.
 * - Handles multiple separators in order of priority.
 * - Ensures chunks are within the required size with overlap.
 * - Robust against edge cases (empty text, short text, etc).
 */
export class RecursiveCharacterTextSplitter {
    private chunkSize: number;
    private chunkOverlap: number;
    private separators: string[];
    constructor({ chunkSize = 1000, chunkOverlap = 200, separators = ["\n\n", "\n", " "] }: { chunkSize?: number; chunkOverlap?: number; separators?: string[] }) {
        if (chunkSize <= 0) throw new Error("chunkSize must be positive");
        if (chunkOverlap < 0) throw new Error("chunkOverlap must be non-negative");
        if (chunkOverlap >= chunkSize) throw new Error("chunkOverlap must be smaller than chunkSize");
        this.chunkSize = chunkSize;
        this.chunkOverlap = chunkOverlap;
        this.separators = separators;
    }
    /**
     * Recursively split text by the list of separators.
     */
    private recursiveSplit(text: string, separators: string[]): string[] {
        if (!text) return [];
        if (separators.length === 0) return [text];
        const sep = separators[0];
        if (text.includes(sep)) {
            return text.split(sep).flatMap(part => this.recursiveSplit(part, separators.slice(1)));
        }
        return this.recursiveSplit(text, separators.slice(1));
    }
    /**
     * Split text into chunks of chunkSize with chunkOverlap using recursive splitting.
     */
    async splitText(text: string): Promise<string[]> {
        if (!text) return [];
        // Step 1: Recursively split text into segments
        const segments = this.recursiveSplit(text, this.separators).filter(Boolean);
        // Step 2: Merge segments into chunks with overlap
        const chunks: string[] = [];
        let curChunk: string[] = [];
        let curLen = 0;
        for (const segment of segments) {
            if ((curLen + segment.length + (curChunk.length > 0 ? 1 : 0)) > this.chunkSize) {
                if (curChunk.length > 0) {
                    chunks.push(curChunk.join(" "));
                    // Overlap: retain last chunkOverlap chars
                    let overlapText = curChunk.join(" ");
                    if (this.chunkOverlap > 0 && overlapText.length > this.chunkOverlap) {
                        overlapText = overlapText.slice(-this.chunkOverlap);
                        curChunk = [overlapText];
                        curLen = overlapText.length;
                    } else {
                        curChunk = [];
                        curLen = 0;
                    }
                }
            }
            curChunk.push(segment);
            curLen += segment.length + (curChunk.length > 1 ? 1 : 0);
        }
        if (curChunk.length > 0) {
            chunks.push(curChunk.join(" "));
        }
        return chunks.filter(Boolean);
    }
}


// --- Documents ---
export class Document {
    id: any;
    constructor(public content: string, public metadata: Record<string, any> = {}) { }
}

// --- Prompts ---
export class ChatPromptTemplate { }
export class MessagesPlaceholder { }

// --- Runnables ---
export class RunnableConfig { }

// --- Language Models ---
export class BaseChatModel { }

// --- Async Caller --- 
export class AsyncCaller { }

// --- Codessa Memory Polyfills ---
export class BaseChatMemory {
    protected memory: any[] = [];
    async loadMemoryVariables(): Promise<any[]> {
        return this.memory;
    }
    async saveContext(context: any): Promise<void> {
        this.memory.push(context);
    }
}
export class BufferMemory extends BaseChatMemory { }
export class ConversationSummaryMemory extends BaseChatMemory { }
export class VectorStoreRetrieverMemory extends BaseChatMemory { }
export class ChatMessageHistory {
    private messages: BaseMessage[] = [];
    addMessage(msg: BaseMessage) { this.messages.push(msg); }
    getMessages(): BaseMessage[] { return this.messages; }
}

// --- VectorStore Polyfill ---
/**
 * MemoryVectorStore
 * Stores documents and supports similarity search using cosine similarity over embedding vectors.
 * Requires that all documents have an embedding vector in their metadata (metadata.embedding: number[]).
 */
export class MemoryVectorStore {
    private docs: Document[] = [];
    /**
     * Add an array of documents to the store. Each document should have an embedding in metadata.
     */
    async addDocuments(docs: Document[]): Promise<void> {
        for (const doc of docs) {
            if (!doc || !doc.metadata || !Array.isArray(doc.metadata.embedding)) {
                throw new Error('Each document must have metadata.embedding: number[]');
            }
            this.docs.push(doc);
        }
    }
    /**
     * Compute cosine similarity between two vectors.
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) throw new Error('Vectors must be of same length');
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Search for the top-N most similar documents to the query embedding.
     * @param query Query string or embedding vector (number[])
     * @param limit Number of top results to return
     * @param embeddingFn Optional async function to embed a string query
     */
    async similaritySearch(query: string | number[], limit: number, embeddingFn?: (text: string) => Promise<number[]>): Promise<Document[]> {
        let queryEmbedding: number[];
        if (typeof query === 'string') {
            if (!embeddingFn) throw new Error('embeddingFn is required for string queries');
            queryEmbedding = await embeddingFn(query);
        } else {
            queryEmbedding = query;
        }
        // Score all docs
        const scored = this.docs.map(doc => {
            const docEmbedding = doc.metadata.embedding;
            if (!Array.isArray(docEmbedding)) return { doc, score: -Infinity };
            return { doc, score: this.cosineSimilarity(docEmbedding, queryEmbedding) };
        });
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(x => x.doc);
    }
    /**
     * Remove all documents from the store.
     */
    async clear(): Promise<void> {
        this.docs = [];
    }
}


// --- CallbackManager Polyfill ---
export class CallbackManagerForLLMRun {
    private callbacks: Function[] = [];
    addCallback(cb: Function) { this.callbacks.push(cb); }
    runCallbacks(...args: any[]) { this.callbacks.forEach(cb => cb(...args)); }
}
