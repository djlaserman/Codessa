import { IDatabase } from '../../types';
import { logger } from '../../../logger';
import { getConfig } from '../../../config';
import { MongoClient, Collection, Db } from 'mongodb';

/**
 * Interface for MongoDB documents
 */
interface MongoDocument {
    id: string;
    [key: string]: any;
}

/**
 * MongoDB database implementation
 */
export class MongoDBDatabase implements IDatabase {
    private client: MongoClient | undefined;
    private db: Db | undefined;
    private collections: Record<string, Collection<MongoDocument>> = {};
    private connectionString: string;
    private databaseName: string;

    constructor() {
        this.connectionString = getConfig<string>('memory.database.mongodb.connectionString', '');
        this.databaseName = getConfig<string>('memory.database.mongodb.database', 'codessa');
    }

    /**
     * Initialize the database
     */
    public async initialize(): Promise<void> {
        try {
            if (!this.connectionString) {
                throw new Error('MongoDB connection string not configured');
            }
            
            // Connect to MongoDB
            this.client = new MongoClient(this.connectionString);
            await this.client.connect();
            
            // Get database
            this.db = this.client.db(this.databaseName);
            
            // Create collections and indexes
            this.collections.memories = this.db.collection('memories');
            
            // Create indexes
            await this.collections.memories.createIndex({ timestamp: -1 });
            await this.collections.memories.createIndex({ 'metadata.source': 1 });
            await this.collections.memories.createIndex({ 'metadata.type': 1 });
            await this.collections.memories.createIndex({ 'metadata.tags': 1 });
            await this.collections.memories.createIndex({ content: 'text' });
            
            logger.info(`MongoDB database initialized successfully with database ${this.databaseName}`);
        } catch (error) {
            logger.error('Failed to initialize MongoDB database:', error);
            throw error;
        }
    }

    /**
     * Add a record
     */
    public async addRecord(collection: string, record: MongoDocument): Promise<string> {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }

        try {
            // Insert record
            const result = await this.collections[collection].insertOne(record);
            
            logger.debug(`Added record with ID ${result.insertedId} to collection ${collection}`);
            return record.id;
        } catch (error) {
            logger.error(`Failed to add record to collection ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Get a record by ID
     */
    public async getRecord(collection: string, id: string): Promise<MongoDocument | undefined> {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }

        try {
            // Get record
            const record = await this.collections[collection].findOne({ id });
            
            if (!record) {
                return undefined;
            }
            
            // Remove MongoDB _id field
            const { _id, ...rest } = record;
            
            return rest;
        } catch (error) {
            logger.error(`Failed to get record with ID ${id} from collection ${collection}:`, error);
            return undefined;
        }
    }

    /**
     * Update a record
     */
    public async updateRecord(collection: string, id: string, record: Partial<MongoDocument>): Promise<boolean> {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }

        try {
            // Update record
            const result = await this.collections[collection].updateOne(
                { id },
                { $set: record }
            );
            
            logger.debug(`Updated record with ID ${id} in collection ${collection}`);
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error(`Failed to update record with ID ${id} in collection ${collection}:`, error);
            return false;
        }
    }

    /**
     * Delete a record
     */
    public async deleteRecord(collection: string, id: string): Promise<boolean> {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }

        try {
            // Delete record
            const result = await this.collections[collection].deleteOne({ id });
            
            logger.debug(`Deleted record with ID ${id} from collection ${collection}`);
            return result.deletedCount > 0;
        } catch (error) {
            logger.error(`Failed to delete record with ID ${id} from collection ${collection}:`, error);
            return false;
        }
    }

    /**
     * Query records
     */
    public async queryRecords(collection: string, query: Record<string, any>, limit?: number): Promise<MongoDocument[]> {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }

        try {
            // Build MongoDB query
            const mongoQuery: Record<string, any> = {};
            
            for (const key in query) {
                if (key === '$text') {
                    mongoQuery.$text = { $search: query[key].$search };
                } else {
                    mongoQuery[key] = query[key];
                }
            }
            
            // Execute query
            let cursor = this.collections[collection].find(mongoQuery);
            
            // Add sort
            cursor = cursor.sort({ timestamp: -1 });
            
            // Add limit
            if (limit) {
                cursor = cursor.limit(limit);
            }
            
            // Get results
            const records = await cursor.toArray();
            
            // Remove MongoDB _id field
            return records.map(record => {
                const { _id, ...rest } = record;
                return rest;
            });
        } catch (error) {
            logger.error(`Failed to query records from collection ${collection}:`, error);
            return [];
        }
    }

    /**
     * Clear all records in a collection
     */
    public async clearCollection(collection: string): Promise<void> {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }

        try {
            // Delete all records
            await this.collections[collection].deleteMany({});
            
            logger.info(`Cleared collection ${collection}`);
        } catch (error) {
            logger.error(`Failed to clear collection ${collection}:`, error);
            throw error;
        }
    }
}
