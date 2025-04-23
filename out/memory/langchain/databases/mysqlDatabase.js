"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLDatabase = void 0;
const logger_1 = require("../../../logger");
const config_1 = require("../../../config");
const mysql = __importStar(require("mysql2/promise"));
/**
 * MySQL database implementation
 */
class MySQLDatabase {
    constructor() {
        this.initialized = false;
        this.host = (0, config_1.getConfig)('memory.database.mysql.host', 'localhost');
        this.port = (0, config_1.getConfig)('memory.database.mysql.port', 3306);
        this.user = (0, config_1.getConfig)('memory.database.mysql.user', 'root');
        this.password = (0, config_1.getConfig)('memory.database.mysql.password', '');
        this.database = (0, config_1.getConfig)('memory.database.mysql.database', 'codessa');
        this.table = (0, config_1.getConfig)('memory.database.mysql.table', 'memories');
    }
    /**
     * Initialize the database
     */
    async initialize() {
        try {
            if (!this.database) {
                throw new Error('MySQL database name not configured');
            }
            // Create connection pool
            this.pool = mysql.createPool({
                host: this.host,
                port: this.port,
                user: this.user,
                password: this.password,
                database: this.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            // Test connection
            const connection = await this.pool.getConnection();
            try {
                // Create tables
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS ${this.table} (
                        id VARCHAR(255) PRIMARY KEY,
                        content TEXT NOT NULL,
                        timestamp BIGINT NOT NULL,
                        metadata JSON NOT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS ${this.table}_tags (
                        memory_id VARCHAR(255) NOT NULL,
                        tag VARCHAR(255) NOT NULL,
                        PRIMARY KEY (memory_id, tag),
                        FOREIGN KEY (memory_id) REFERENCES ${this.table}(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                // Create indexes
                await connection.query(`
                    CREATE INDEX IF NOT EXISTS idx_${this.table}_timestamp ON ${this.table}(timestamp)
                `);
                await connection.query(`
                    CREATE INDEX IF NOT EXISTS idx_${this.table}_tags_tag ON ${this.table}_tags(tag)
                `);
                this.initialized = true;
                logger_1.logger.info(`MySQL database initialized successfully with database ${this.database}`);
            }
            finally {
                connection.release();
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize MySQL database:', error);
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
        const connection = await this.pool.getConnection();
        try {
            // Extract fields
            const { id, content, timestamp, metadata } = record;
            // Insert record
            await connection.query(`INSERT INTO ${this.table} (id, content, timestamp, metadata)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                content = VALUES(content),
                timestamp = VALUES(timestamp),
                metadata = VALUES(metadata)`, [id, content, timestamp, JSON.stringify(metadata)]);
            // Insert tags if present
            if (metadata.tags && Array.isArray(metadata.tags)) {
                // Delete existing tags first
                await connection.query(`DELETE FROM ${this.table}_tags WHERE memory_id = ?`, [id]);
                // Insert new tags
                for (const tag of metadata.tags) {
                    await connection.query(`INSERT INTO ${this.table}_tags (memory_id, tag) VALUES (?, ?)`, [id, tag]);
                }
            }
            logger_1.logger.debug(`Added record with ID ${id} to collection ${collection}`);
            return id;
        }
        catch (error) {
            logger_1.logger.error(`Failed to add record to collection ${collection}:`, error);
            throw error;
        }
        finally {
            connection.release();
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
        const connection = await this.pool.getConnection();
        try {
            // Get record
            const [rows] = await connection.query(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
            if (Array.isArray(rows) && rows.length > 0) {
                const record = rows[0];
                // Parse metadata
                record.metadata = JSON.parse(record.metadata);
                // Get tags
                const [tagRows] = await connection.query(`SELECT tag FROM ${this.table}_tags WHERE memory_id = ?`, [id]);
                if (Array.isArray(tagRows) && tagRows.length > 0) {
                    record.metadata.tags = tagRows.map((row) => row.tag);
                }
                return record;
            }
            return undefined;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get record ${id} from collection ${collection}:`, error);
            throw error;
        }
        finally {
            connection.release();
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
        const connection = await this.pool.getConnection();
        try {
            // Extract fields
            const { content, timestamp, metadata } = record;
            // Update record
            const [result] = await connection.query(`UPDATE ${this.table} SET content = ?, timestamp = ?, metadata = ? WHERE id = ?`, [content, timestamp, JSON.stringify(metadata), id]);
            const updateResult = result;
            // Update tags if present
            if (metadata.tags && Array.isArray(metadata.tags)) {
                // Delete existing tags
                await connection.query(`DELETE FROM ${this.table}_tags WHERE memory_id = ?`, [id]);
                // Insert new tags
                for (const tag of metadata.tags) {
                    await connection.query(`INSERT INTO ${this.table}_tags (memory_id, tag) VALUES (?, ?)`, [id, tag]);
                }
            }
            logger_1.logger.debug(`Updated record with ID ${id} in collection ${collection}`);
            return updateResult.affectedRows > 0;
        }
        catch (error) {
            logger_1.logger.error(`Failed to update record ${id} in collection ${collection}:`, error);
            throw error;
        }
        finally {
            connection.release();
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
        const connection = await this.pool.getConnection();
        try {
            // Delete record
            const [result] = await connection.query(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
            const deleteResult = result;
            logger_1.logger.debug(`Deleted record with ID ${id} from collection ${collection}`);
            return deleteResult.affectedRows > 0;
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete record ${id} from collection ${collection}:`, error);
            throw error;
        }
        finally {
            connection.release();
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
        const connection = await this.pool.getConnection();
        try {
            // Build query
            let sql = `SELECT * FROM ${this.table}`;
            const params = [];
            const conditions = [];
            // Add conditions
            if (query.id) {
                conditions.push('id = ?');
                params.push(query.id);
            }
            if (query.fromTimestamp) {
                conditions.push('timestamp >= ?');
                params.push(query.fromTimestamp);
            }
            if (query.toTimestamp) {
                conditions.push('timestamp <= ?');
                params.push(query.toTimestamp);
            }
            // Add WHERE clause if conditions exist
            if (conditions.length > 0) {
                sql += ' WHERE ' + conditions.join(' AND ');
            }
            // Add ORDER BY
            sql += ' ORDER BY timestamp DESC';
            // Add LIMIT
            if (limit) {
                sql += ' LIMIT ?';
                params.push(limit);
            }
            // Execute query
            const [rows] = await connection.query(sql, params);
            if (!Array.isArray(rows)) {
                return [];
            }
            // Process results
            const records = await Promise.all(rows.map(async (row) => {
                // Parse metadata
                row.metadata = JSON.parse(row.metadata);
                // Get tags
                const [tagRows] = await connection.query(`SELECT tag FROM ${this.table}_tags WHERE memory_id = ?`, [row.id]);
                if (Array.isArray(tagRows) && tagRows.length > 0) {
                    row.metadata.tags = tagRows.map((tagRow) => tagRow.tag);
                }
                return row;
            }));
            // Filter by tags if specified
            if (query.tags && Array.isArray(query.tags) && query.tags.length > 0) {
                return records.filter(record => {
                    const recordTags = record.metadata.tags || [];
                    return query.tags.some((tag) => recordTags.includes(tag));
                });
            }
            return records;
        }
        catch (error) {
            logger_1.logger.error(`Failed to query records from collection ${collection}:`, error);
            throw error;
        }
        finally {
            connection.release();
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
        const connection = await this.pool.getConnection();
        try {
            // Delete all tags first
            await connection.query(`DELETE FROM ${this.table}_tags`);
            // Delete all records
            await connection.query(`DELETE FROM ${this.table}`);
            logger_1.logger.debug(`Cleared all records from collection ${collection}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to clear collection ${collection}:`, error);
            throw error;
        }
        finally {
            connection.release();
        }
    }
}
exports.MySQLDatabase = MySQLDatabase;
//# sourceMappingURL=mysqlDatabase.js.map