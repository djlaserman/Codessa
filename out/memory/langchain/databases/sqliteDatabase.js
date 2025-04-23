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
exports.SQLiteDatabase = void 0;
const logger_1 = require("../../../logger");
const config_1 = require("../../../config");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sqlite3 = __importStar(require("sqlite3"));
const sqlite_1 = require("sqlite");
/**
 * SQLite database implementation
 */
class SQLiteDatabase {
    constructor() {
        this.filename = (0, config_1.getConfig)('memory.database.sqlite.filename', './.codessa/memory.db');
    }
    /**
     * Initialize the database
     */
    async initialize() {
        try {
            // Ensure directory exists
            const directory = path.dirname(this.filename);
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            // Open database
            this.db = await (0, sqlite_1.open)({
                filename: this.filename,
                driver: sqlite3.Database
            });
            // Enable WAL mode for better performance
            await this.db.exec('PRAGMA journal_mode = WAL;');
            // Create tables
            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    metadata TEXT NOT NULL
                );
                
                CREATE TABLE IF NOT EXISTS memory_tags (
                    memory_id TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    PRIMARY KEY (memory_id, tag),
                    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
                CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON memory_tags(tag);
            `);
            logger_1.logger.info(`SQLite database initialized successfully at ${this.filename}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize SQLite database:', error);
            throw error;
        }
    }
    /**
     * Add a record
     */
    async addRecord(collection, record) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            // Extract fields
            const { id, content, timestamp, metadata } = record;
            // Insert memory
            await this.db.run('INSERT OR REPLACE INTO memories (id, content, timestamp, metadata) VALUES (?, ?, ?, ?)', [id, content, timestamp, JSON.stringify(metadata)]);
            // Insert tags if present
            if (metadata.tags && Array.isArray(metadata.tags)) {
                for (const tag of metadata.tags) {
                    await this.db.run('INSERT OR REPLACE INTO memory_tags (memory_id, tag) VALUES (?, ?)', [id, tag]);
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
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            // Get memory
            const memory = await this.db.get('SELECT * FROM memories WHERE id = ?', [id]);
            if (!memory) {
                return undefined;
            }
            // Get tags
            const tags = await this.db.all('SELECT tag FROM memory_tags WHERE memory_id = ?', [id]);
            // Parse metadata
            const metadata = JSON.parse(memory.metadata);
            // Add tags to metadata
            metadata.tags = tags.map(t => t.tag);
            return {
                id: memory.id,
                content: memory.content,
                timestamp: memory.timestamp,
                metadata
            };
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
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            // Extract fields
            const { content, timestamp, metadata } = record;
            // Update memory
            const result = await this.db.run('UPDATE memories SET content = ?, timestamp = ?, metadata = ? WHERE id = ?', [content, timestamp, JSON.stringify(metadata), id]);
            if (result.changes === 0) {
                return false;
            }
            // Delete existing tags
            await this.db.run('DELETE FROM memory_tags WHERE memory_id = ?', [id]);
            // Insert new tags if present
            if (metadata.tags && Array.isArray(metadata.tags)) {
                for (const tag of metadata.tags) {
                    await this.db.run('INSERT INTO memory_tags (memory_id, tag) VALUES (?, ?)', [id, tag]);
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
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            // Delete memory (tags will be deleted via ON DELETE CASCADE)
            const result = await this.db.run('DELETE FROM memories WHERE id = ?', [id]);
            logger_1.logger.debug(`Deleted record with ID ${id} from collection ${collection}`);
            return result.changes > 0;
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
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            // Build query
            let sql = 'SELECT DISTINCT m.* FROM memories m';
            const params = [];
            // Handle tag filters - using proper parameter binding
            if (query['metadata.tags'] && Array.isArray(query['metadata.tags'].$all)) {
                const tags = query['metadata.tags'].$all;
                if (tags.length > 0) {
                    sql += ` JOIN memory_tags t ON m.id = t.memory_id 
                            WHERE t.tag IN (${Array(tags.length).fill('?').join(',')})
                            GROUP BY m.id
                            HAVING COUNT(DISTINCT t.tag) = ?`;
                    params.push(...tags.map((tag) => String(tag)), tags.length);
                    delete query['metadata.tags'];
                }
            }
            else {
                sql += ' WHERE 1=1';
            }
            // Handle other filters with proper type checking and escaping
            for (const [key, value] of Object.entries(query)) {
                if (!value)
                    continue;
                if (key === '$text') {
                    if (typeof value.$search === 'string') {
                        sql += ' AND m.content LIKE ?';
                        params.push(`%${value.$search}%`);
                    }
                }
                else if (key.startsWith('metadata.')) {
                    const metadataKey = key.substring(9).replace(/[^a-zA-Z0-9_]/g, '');
                    if (metadataKey) {
                        sql += ` AND json_extract(m.metadata, '$.${metadataKey}') = ?`;
                        params.push(value);
                    }
                }
                else if (key === 'timestamp') {
                    if (typeof value.$gte === 'number') {
                        sql += ' AND m.timestamp >= ?';
                        params.push(value.$gte);
                    }
                    if (typeof value.$lte === 'number') {
                        sql += ' AND m.timestamp <= ?';
                        params.push(value.$lte);
                    }
                }
                else if (['id', 'content', 'timestamp'].includes(key)) {
                    sql += ` AND m.${key} = ?`;
                    params.push(value);
                }
            }
            // Add order by
            sql += ' ORDER BY m.timestamp DESC';
            // Add limit with type validation
            if (typeof limit === 'number' && limit > 0) {
                sql += ' LIMIT ?';
                params.push(limit);
            }
            // Execute query with proper parameter binding
            const memories = await this.db.all(sql, ...params);
            // Get tags for memories more efficiently
            const memoryIds = memories.map(m => m.id);
            const tags = memoryIds.length > 0 ? await this.db.all(`SELECT memory_id, tag FROM memory_tags WHERE memory_id IN (${Array(memoryIds.length).fill('?').join(',')})`, ...memoryIds) : [];
            // Group tags by memory ID using Map for better performance
            const tagsByMemoryId = new Map();
            for (const tag of tags) {
                if (!tagsByMemoryId.has(tag.memory_id)) {
                    tagsByMemoryId.set(tag.memory_id, []);
                }
                tagsByMemoryId.get(tag.memory_id).push(tag.tag);
            }
            // Build result with proper error handling for JSON parsing
            return memories.map(memory => {
                let metadata;
                try {
                    metadata = JSON.parse(memory.metadata);
                }
                catch (e) {
                    logger_1.logger.warn(`Invalid JSON in metadata for memory ${memory.id}:`, e);
                    metadata = {};
                }
                metadata.tags = tagsByMemoryId.get(memory.id) || [];
                return {
                    id: memory.id,
                    content: memory.content,
                    timestamp: memory.timestamp,
                    metadata
                };
            });
        }
        catch (error) {
            logger_1.logger.error(`Failed to query records from collection ${collection}:`, error);
            throw error; // Re-throw to allow proper error handling upstream
        }
    }
    /**
     * Clear all records in a collection
     */
    async clearCollection(collection) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            // Delete all memories (tags will be deleted via ON DELETE CASCADE)
            await this.db.run('DELETE FROM memories');
            logger_1.logger.info(`Cleared collection ${collection}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to clear collection ${collection}:`, error);
            throw error;
        }
    }
}
exports.SQLiteDatabase = SQLiteDatabase;
//# sourceMappingURL=sqliteDatabase.js.map