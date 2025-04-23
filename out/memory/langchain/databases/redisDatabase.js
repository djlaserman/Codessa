"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisDatabase = void 0;
const logger_1 = require("../../../logger");
const config_1 = require("../../../config");
const redis_1 = require("redis");
/**
 * Redis database implementation
 */
class RedisDatabase {
    constructor() {
        this.initialized = false;
        this.url = (0, config_1.getConfig)('memory.database.redis.url', '');
        this.keyPrefix = (0, config_1.getConfig)('memory.database.redis.keyPrefix', 'codessa:');
    }
    /**
     * Initialize the database
     */
    async initialize() {
        try {
            if (!this.url) {
                throw new Error('Redis URL not configured');
            }
            // Create Redis client
            this.client = (0, redis_1.createClient)({
                url: this.url
            });
            // Connect to Redis
            await this.client.connect();
            this.initialized = true;
            logger_1.logger.info('Redis database initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Redis database:', error);
            throw error;
        }
    }
    /**
     * Get full key with prefix
     */
    getFullKey(collection, id) {
        return `${this.keyPrefix}${collection}:${id}`;
    }
    /**
     * Add a record
     */
    async addRecord(collection, record) {
        if (!this.client || !this.initialized) {
            throw new Error('Database not initialized');
        }
        try {
            const { id } = record;
            const key = this.getFullKey(collection, id);
            // Store record
            await this.client.set(key, JSON.stringify(record));
            // Add to collection index
            await this.client.sAdd(`${this.keyPrefix}${collection}:ids`, id);
            // Add to timestamp index
            if (record.timestamp) {
                const member = {
                    score: record.timestamp,
                    value: id
                };
                await this.client.zAdd(`${this.keyPrefix}${collection}:timestamps`, member);
            }
            // Add to metadata indexes
            if (record.metadata) {
                // Add to source index
                if (record.metadata.source) {
                    await this.client.sAdd(`${this.keyPrefix}${collection}:source:${record.metadata.source}`, id);
                }
                // Add to type index
                if (record.metadata.type) {
                    await this.client.sAdd(`${this.keyPrefix}${collection}:type:${record.metadata.type}`, id);
                }
                // Add to tag indexes
                if (record.metadata.tags && Array.isArray(record.metadata.tags)) {
                    for (const tag of record.metadata.tags) {
                        await this.client.sAdd(`${this.keyPrefix}${collection}:tag:${tag}`, id);
                    }
                }
            }
            logger_1.logger.debug(`Added record with ID ${id} to collection ${collection}`);
            return id;
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
        if (!this.client || !this.initialized) {
            throw new Error('Database not initialized');
        }
        try {
            const key = this.getFullKey(collection, id);
            // Get record
            const data = await this.client.get(key);
            if (!data) {
                return undefined;
            }
            return JSON.parse(data);
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
        if (!this.client || !this.initialized) {
            throw new Error('Database not initialized');
        }
        try {
            const key = this.getFullKey(collection, id);
            // Check if record exists
            const exists = await this.client.exists(key);
            if (!exists) {
                return false;
            }
            // Get existing record
            const existingData = await this.client.get(key);
            const existingRecord = existingData ? JSON.parse(existingData) : {};
            // Delete existing metadata indexes
            if (existingRecord.metadata) {
                // Delete from source index
                if (existingRecord.metadata.source) {
                    await this.client.sRem(`${this.keyPrefix}${collection}:source:${existingRecord.metadata.source}`, id);
                }
                // Delete from type index
                if (existingRecord.metadata.type) {
                    await this.client.sRem(`${this.keyPrefix}${collection}:type:${existingRecord.metadata.type}`, id);
                }
                // Delete from tag indexes
                if (existingRecord.metadata.tags && Array.isArray(existingRecord.metadata.tags)) {
                    for (const tag of existingRecord.metadata.tags) {
                        await this.client.sRem(`${this.keyPrefix}${collection}:tag:${tag}`, id);
                    }
                }
            }
            // Update timestamp index
            if (existingRecord.timestamp && record.timestamp && existingRecord.timestamp !== record.timestamp) {
                await this.client.zRem(`${this.keyPrefix}${collection}:timestamps`, id);
                const member = {
                    score: record.timestamp,
                    value: id
                };
                await this.client.zAdd(`${this.keyPrefix}${collection}:timestamps`, member);
            }
            // Store updated record
            await this.client.set(key, JSON.stringify(record));
            // Add to metadata indexes
            if (record.metadata) {
                // Add to source index
                if (record.metadata.source) {
                    await this.client.sAdd(`${this.keyPrefix}${collection}:source:${record.metadata.source}`, id);
                }
                // Add to type index
                if (record.metadata.type) {
                    await this.client.sAdd(`${this.keyPrefix}${collection}:type:${record.metadata.type}`, id);
                }
                // Add to tag indexes
                if (record.metadata.tags && Array.isArray(record.metadata.tags)) {
                    for (const tag of record.metadata.tags) {
                        await this.client.sAdd(`${this.keyPrefix}${collection}:tag:${tag}`, id);
                    }
                }
            }
            logger_1.logger.debug(`Updated record with ID ${id} in collection ${collection}`);
            return true;
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
        if (!this.client || !this.initialized) {
            throw new Error('Database not initialized');
        }
        try {
            const key = this.getFullKey(collection, id);
            // Get existing record
            const existingData = await this.client.get(key);
            if (!existingData) {
                return false;
            }
            const existingRecord = JSON.parse(existingData);
            // Delete from collection index
            await this.client.sRem(`${this.keyPrefix}${collection}:ids`, id);
            // Delete from timestamp index
            await this.client.zRem(`${this.keyPrefix}${collection}:timestamps`, id);
            // Delete from metadata indexes
            if (existingRecord.metadata) {
                // Delete from source index
                if (existingRecord.metadata.source) {
                    await this.client.sRem(`${this.keyPrefix}${collection}:source:${existingRecord.metadata.source}`, id);
                }
                // Delete from type index
                if (existingRecord.metadata.type) {
                    await this.client.sRem(`${this.keyPrefix}${collection}:type:${existingRecord.metadata.type}`, id);
                }
                // Delete from tag indexes
                if (existingRecord.metadata.tags && Array.isArray(existingRecord.metadata.tags)) {
                    for (const tag of existingRecord.metadata.tags) {
                        await this.client.sRem(`${this.keyPrefix}${collection}:tag:${tag}`, id);
                    }
                }
            }
            // Delete record
            await this.client.del(key);
            logger_1.logger.debug(`Deleted record with ID ${id} from collection ${collection}`);
            return true;
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
        if (!this.client || !this.initialized) {
            throw new Error('Database not initialized');
        }
        try {
            // Get all IDs in the collection
            let ids = [];
            // Handle timestamp range queries
            if (query.timestamp) {
                const min = query.timestamp.$gte || '-inf';
                const max = query.timestamp.$lte || '+inf';
                // Get IDs in timestamp range
                const rangeIds = await this.client.zRange(`${this.keyPrefix}${collection}:timestamps`, min, max, { BY: 'SCORE' });
                if (rangeIds.length === 0) {
                    return [];
                }
                ids = rangeIds;
            }
            else {
                // Get all IDs
                ids = await this.client.sMembers(`${this.keyPrefix}${collection}:ids`);
                if (ids.length === 0) {
                    return [];
                }
            }
            // Handle metadata filters
            for (const key in query) {
                if (key === 'timestamp' || key === '$text') {
                    continue;
                }
                if (key.startsWith('metadata.')) {
                    const metadataKey = key.substring(9);
                    if (metadataKey === 'source') {
                        // Filter by source
                        const sourceIds = await this.client.sMembers(`${this.keyPrefix}${collection}:source:${query[key]}`);
                        ids = ids.filter(id => sourceIds.includes(id));
                    }
                    else if (metadataKey === 'type') {
                        // Filter by type
                        const typeIds = await this.client.sMembers(`${this.keyPrefix}${collection}:type:${query[key]}`);
                        ids = ids.filter(id => typeIds.includes(id));
                    }
                    else if (metadataKey === 'tags' && query[key].$all) {
                        // Filter by tags
                        for (const tag of query[key].$all) {
                            const tagIds = await this.client.sMembers(`${this.keyPrefix}${collection}:tag:${tag}`);
                            ids = ids.filter(id => tagIds.includes(id));
                        }
                    }
                }
            }
            if (ids.length === 0) {
                return [];
            }
            // Get records
            const records = [];
            // Apply limit
            if (limit && ids.length > limit) {
                ids = ids.slice(0, limit);
            }
            // Get records
            for (const id of ids) {
                const record = await this.getRecord(collection, id);
                if (record) {
                    // Handle text search
                    if (query.$text && query.$text.$search) {
                        if (!record.content.toLowerCase().includes(query.$text.$search.toLowerCase())) {
                            continue;
                        }
                    }
                    records.push(record);
                }
            }
            // Sort by timestamp
            records.sort((a, b) => b.timestamp - a.timestamp);
            return records;
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
        if (!this.client || !this.initialized) {
            throw new Error('Database not initialized');
        }
        try {
            // Get all IDs in the collection
            const ids = await this.client.sMembers(`${this.keyPrefix}${collection}:ids`);
            // Delete all records
            for (const id of ids) {
                await this.deleteRecord(collection, id);
            }
            // Delete collection indexes
            await this.client.del(`${this.keyPrefix}${collection}:ids`);
            await this.client.del(`${this.keyPrefix}${collection}:timestamps`);
            // Find and delete all metadata indexes
            const keys = await this.client.keys(`${this.keyPrefix}${collection}:*`);
            if (keys.length > 0) {
                // Delete each key one by one since del() only accepts a single key
                await Promise.all(keys.map(key => this.client.del(key)));
            }
            logger_1.logger.info(`Cleared collection ${collection}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to clear collection ${collection}:`, error);
            throw error;
        }
    }
}
exports.RedisDatabase = RedisDatabase;
//# sourceMappingURL=redisDatabase.js.map