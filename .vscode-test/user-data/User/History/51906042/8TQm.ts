declare module 'mongodb' {
    // Basic Type Definitions
    export interface MongoClientOptions {
        useNewUrlParser?: boolean;
        useUnifiedTopology?: boolean;
        [key: string]: any;
    }

    export interface DbOptions {
        retryWrites?: boolean;
        [key: string]: any;
    }

    export interface IndexSpecification {
        [key: string]: 1 | -1 | 'text' | 'hashed' | '2dsphere' | '2d' | 'geoHaystack';
    }

    export interface IndexOptions {
        unique?: boolean;
        background?: boolean;
        sparse?: boolean;
        name?: string;
        [key: string]: any;
    }

    // Result Interfaces
    export interface InsertOneResult<T> {
        acknowledged: boolean;
        insertedId: T extends { _id: infer U } ? U : never;
    }

    export interface UpdateResult {
        acknowledged: boolean;
        modifiedCount: number;
        upsertedId: any;
        upsertedCount: number;
        matchedCount: number;
    }

    export interface DeleteResult {
        acknowledged: boolean;
        deletedCount: number;
    }

    // Core Classes
    export class MongoClient {
        constructor(uri: string, options?: MongoClientOptions);
        connect(): Promise<MongoClient>;
        db(name: string, options?: DbOptions): Db;
        close(force?: boolean): Promise<void>;
    }

    export class Db {
        collection<T = any>(name: string): Collection<T>;
        dropCollection(name: string): Promise<boolean>;
    }

    export class Collection<T> {
        /**
         * Creates an index on the collection
         * @param indexSpec The field and direction pairs to index
         * @param options Optional index creation options
         */
        createIndex(indexSpec: IndexSpecification, options?: IndexOptions): Promise<string>;

        insertOne(document: T): Promise<InsertOneResult<T>>;
        insertMany(documents: T[]): Promise<{ acknowledged: boolean; insertedIds: any[] }>;
        findOne(filter: Partial<T>): Promise<T | null>;
        find(filter: Partial<T>): Cursor<T>;
        updateOne(filter: Partial<T>, update: Partial<T> | { $set: Partial<T> }): Promise<UpdateResult>;
        updateMany(filter: Partial<T>, update: Partial<T> | { $set: Partial<T> }): Promise<UpdateResult>;
        deleteOne(filter: Partial<T>): Promise<DeleteResult>;
        deleteMany(filter: Partial<T>): Promise<DeleteResult>;
        drop(): Promise<boolean>;
        countDocuments(filter?: Partial<T>): Promise<number>;
    }

    export class Cursor<T> {
        toArray(): Promise<T[]>;
        limit(value: number): Cursor<T>;
        skip(value: number): Cursor<T>;
        sort(specification: { [key in keyof T]?: 1 | -1 }): Cursor<T>;
        forEach(iterator: (doc: T) => void): Promise<void>;
        close(): Promise<void>;
    }

    // Utility Types
    export type OptionalId<T> = T extends { _id: any } ? Omit<T, '_id'> & { _id?: T['_id'] } : T;
    export type WithId<T> = T & { _id: any };
}