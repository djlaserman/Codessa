"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDBDatabase = void 0;
const logger_1 = require("../../../logger");
const config_1 = require("../../../config");
const mongodb_1 = require("mongodb");
/**
 * MongoDB database implementation
 */
class MongoDBDatabase {
    constructor() {
        this.collections = {};
        this.connectionString = (0, config_1.getConfig)('memory.database.mongodb.connectionString', '');
        this.databaseName = (0, config_1.getConfig)('memory.database.mongodb.database', 'codessa');
    }
    /**
     * Initialize the database
     */
    async initialize() {
        try {
            if (!this.connectionString) {
                throw new Error('MongoDB connection string not configured');
            }
            // Connect to MongoDB
            this.client = new mongodb_1.MongoClient(this.connectionString);
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
            logger_1.logger.info(`MongoDB database initialized successfully with database ${this.databaseName}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize MongoDB database:', error);
            throw error;
        }
    }
    /**
     * Add a record
     */
    async addRecord(collection, record) {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }
        try {
            // Insert record
            const result = await this.collections[collection].insertOne(record);
            logger_1.logger.debug(`Added record with ID ${result.insertedId} to collection ${collection}`);
            return record.id;
        }
        catch (error) {
            logger_1.logger.error(`Failed to add record to collection ${collection}:`, error);
            throw error;
        }
    }
    /**
     * Get a record by ID
     */
    async getRecord(collection, id) {
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
        }
        catch (error) {
            logger_1.logger.error(`Failed to get record with ID ${id} from collection ${collection}:`, error);
            return undefined;
        }
    }
    /**
     * Update a record
     */
    async updateRecord(collection, id, record) {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }
        try {
            // Update record
            const result = await this.collections[collection].updateOne({ id }, { $set: record });
            logger_1.logger.debug(`Updated record with ID ${id} in collection ${collection}`);
            return result.modifiedCount > 0;
        }
        catch (error) {
            logger_1.logger.error(`Failed to update record with ID ${id} in collection ${collection}:`, error);
            return false;
        }
    }
    /**
     * Delete a record
     */
    async deleteRecord(collection, id) {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }
        try {
            // Delete record
            const result = await this.collections[collection].deleteOne({ id });
            logger_1.logger.debug(`Deleted record with ID ${id} from collection ${collection}`);
            return result.deletedCount > 0;
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete record with ID ${id} from collection ${collection}:`, error);
            return false;
        }
    }
    /**
     * Query records
     */
    async queryRecords(collection, query, limit) {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }
        try {
            // Build MongoDB query
            const mongoQuery = {};
            for (const key in query) {
                if (key === '$text') {
                    mongoQuery.$text = { $search: query[key].$search };
                }
                else {
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
        }
        catch (error) {
            logger_1.logger.error(`Failed to query records from collection ${collection}:`, error);
            return [];
        }
    }
    /**
     * Clear all records in a collection
     */
    async clearCollection(collection) {
        if (!this.db || !this.collections[collection]) {
            throw new Error(`Database or collection ${collection} not initialized`);
        }
        try {
            // Delete all records
            await this.collections[collection].deleteMany({});
            logger_1.logger.info(`Cleared collection ${collection}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to clear collection ${collection}:`, error);
            throw error;
        }
    }
}
exports.MongoDBDatabase = MongoDBDatabase;
//# sourceMappingURL=mongodbDatabase.js.map