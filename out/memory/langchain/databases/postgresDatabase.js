"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresDatabase = void 0;
const logger_1 = require("../../../logger");
const config_1 = require("../../../config");
const pg_1 = require("pg");
/**
 * PostgreSQL database implementation
 */
class PostgresDatabase {
    constructor() {
        this.initialized = false;
        this.connectionString = (0, config_1.getConfig)('memory.database.postgres.connectionString', '');
        this.schema = (0, config_1.getConfig)('memory.database.postgres.schema', 'codessa');
    }
    /**
     * Initialize the database
     */
    async initialize() {
        try {
            if (!this.connectionString) {
                throw new Error('PostgreSQL connection string not configured');
            }
            // Create connection pool
            this.pool = new pg_1.Pool({
                connectionString: this.connectionString,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000
            });
            // Test connection
            const client = await this.pool.connect();
            try {
                // Create schema if it doesn't exist
                await client.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
                // Create tables
                await client.query(`
                    CREATE TABLE IF NOT EXISTS ${this.schema}.memories (
                        id TEXT PRIMARY KEY,
                        content TEXT NOT NULL,
                        timestamp BIGINT NOT NULL,
                        metadata JSONB NOT NULL
                    )
                `);
                // Create indexes
                await client.query(`CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON ${this.schema}.memories(timestamp DESC)`);
                await client.query(`CREATE INDEX IF NOT EXISTS idx_memories_metadata ON ${this.schema}.memories USING GIN (metadata)`);
                await client.query(`CREATE INDEX IF NOT EXISTS idx_memories_content ON ${this.schema}.memories USING GIN (to_tsvector('english', content))`);
                this.initialized = true;
                logger_1.logger.info(`PostgreSQL database initialized successfully with schema ${this.schema}`);
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize PostgreSQL database:', error);
            throw error;
        }
    }
    /**
     * Add a record
     */
    async addRecord(collection, record) {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }
        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }
        let client;
        try {
            client = await this.pool.connect();
            // Extract fields
            const { id, content, timestamp, metadata } = record;
            // Insert record
            await client.query(`INSERT INTO ${this.schema}.memories (id, content, timestamp, metadata)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE
                SET content = $2, timestamp = $3, metadata = $4`, [id, content, timestamp, JSON.stringify(metadata)]);
            logger_1.logger.debug(`Added record with ID ${id} to collection ${collection}`);
            return id;
        }
        catch (error) {
            logger_1.logger.error(`Failed to add record to collection ${collection}:`, error);
            throw error;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    /**
     * Get a record by ID
     */
    async getRecord(collection, id) {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }
        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }
        let client;
        try {
            client = await this.pool.connect();
            // Get record
            const result = await client.query(`SELECT * FROM ${this.schema}.memories WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                return undefined;
            }
            const record = result.rows[0];
            return {
                id: record.id,
                content: record.content,
                timestamp: record.timestamp,
                metadata: record.metadata
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to get record with ID ${id} from collection ${collection}:`, error);
            return undefined;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    /**
     * Update a record
     */
    async updateRecord(collection, id, record) {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }
        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }
        let client;
        try {
            client = await this.pool.connect();
            // Extract fields
            const { content, timestamp, metadata } = record;
            // Update record
            const result = await client.query(`UPDATE ${this.schema}.memories
                SET content = $1, timestamp = $2, metadata = $3
                WHERE id = $4`, [content, timestamp, JSON.stringify(metadata), id]);
            logger_1.logger.debug(`Updated record with ID ${id} in collection ${collection}`);
            return result.rowCount > 0;
        }
        catch (error) {
            logger_1.logger.error(`Failed to update record with ID ${id} in collection ${collection}:`, error);
            return false;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    /**
     * Delete a record
     */
    async deleteRecord(collection, id) {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }
        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }
        let client;
        try {
            client = await this.pool.connect();
            // Delete record
            const result = await client.query(`DELETE FROM ${this.schema}.memories WHERE id = $1`, [id]);
            logger_1.logger.debug(`Deleted record with ID ${id} from collection ${collection}`);
            return result.rowCount > 0;
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete record with ID ${id} from collection ${collection}:`, error);
            return false;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    /**
     * Query records
     */
    async queryRecords(collection, query, limit) {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }
        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }
        let client;
        try {
            client = await this.pool.connect();
            // Build query
            let sql = `SELECT * FROM ${this.schema}.memories`;
            const params = [];
            const conditions = [];
            let paramIndex = 1;
            // Handle filters
            for (const key in query) {
                if (key === '$text') {
                    conditions.push(`to_tsvector('english', content) @@ plainto_tsquery('english', $${paramIndex})`);
                    params.push(query[key].$search);
                    paramIndex++;
                }
                else if (key.startsWith('metadata.')) {
                    const metadataKey = key.substring(9);
                    conditions.push(`metadata->>'${metadataKey}' = $${paramIndex}`);
                    params.push(query[key]);
                    paramIndex++;
                }
                else if (key === 'timestamp') {
                    if (query[key].$gte) {
                        conditions.push(`timestamp >= $${paramIndex}`);
                        params.push(query[key].$gte);
                        paramIndex++;
                    }
                    if (query[key].$lte) {
                        conditions.push(`timestamp <= $${paramIndex}`);
                        params.push(query[key].$lte);
                        paramIndex++;
                    }
                }
                else {
                    conditions.push(`${key} = $${paramIndex}`);
                    params.push(query[key]);
                    paramIndex++;
                }
            }
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            // Add order by
            sql += ' ORDER BY timestamp DESC';
            // Add limit
            if (limit) {
                sql += ` LIMIT $${paramIndex}`;
                params.push(limit);
            }
            // Execute query
            const result = await client.query(sql, params);
            // Convert rows to records
            return result.rows.map(row => ({
                id: row.id,
                content: row.content,
                timestamp: row.timestamp,
                metadata: row.metadata
            }));
        }
        catch (error) {
            logger_1.logger.error(`Failed to query records from collection ${collection}:`, error);
            return [];
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    /**
     * Clear all records in a collection
     */
    async clearCollection(collection) {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }
        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }
        let client;
        try {
            client = await this.pool.connect();
            // Delete all records
            await client.query(`DELETE FROM ${this.schema}.memories`);
            logger_1.logger.info(`Cleared collection ${collection}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to clear collection ${collection}:`, error);
            throw error;
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
}
exports.PostgresDatabase = PostgresDatabase;
//# sourceMappingURL=postgresDatabase.js.map