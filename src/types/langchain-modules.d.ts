declare module '@codessa/chroma' {
    export class Chroma {
        constructor(config: any);
        addDocuments(documents: any[], ids?: string[]): Promise<void>;
        similaritySearch(query: string, k?: number): Promise<any[]>;
        delete(ids: string[]): Promise<void>;
    }
}

declare module '@codessa/pinecone' {
    export class codessaconeStore {
        static fromExistingIndex(embeddings: any, options: any): PineconeStore;
        addDocuments(documents: any[]): Promise<void>;
        similaritySearch(query: string, k?: number): Promise<any[]>;
        delete(ids: string[]): Promise<void>;
    }
}

declare module '@pinecone-database/pinecone' {
    export class codessacone {
        constructor(config: any);
        index(name: string): any;
    }
}
