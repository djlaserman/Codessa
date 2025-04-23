import { IDatabase } from '../../types';
import { logger } from '../../../logger';
import { getConfig } from '../../../config';
import * as path from 'path';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

/**
 * SQLite database implementation
 */
export class SQLiteDatabase implements IDatabase {
    private db: Database | undefined;
    private filename: string;

    constructor() {
        this.filename = getConfig<string>('memory.database.sqlite.filename', './.codessa/memory.db');
    }

    /**
     * Initialize the database
     */
    public async initialize(): Promise<void> {
        try {
            // Ensure directory exists
            const directory = path.dirname(this.filename);
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            
            // Open database
            this.db = await open({
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
            
            logger.info(`SQLite database initialized successfully at ${this.filename}`);
        } catch (error) {
            logger.error('Failed to initialize SQLite database:', error);
            throw error;
        }
    }

    /**
     * Add a record
     */
    public async addRecord(collection: string, record: Record<string, any>): Promise<string> {
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
            await this.db.run(
                'INSERT OR REPLACE INTO memories (id, content, timestamp, metadata) VALUES (?, ?, ?, ?)',
                [id, content, timestamp, JSON.stringify(metadata)]
            );
            
            // Insert tags if present
            if (metadata.tags && Array.isArray(metadata.tags)) {
                for (const tag of metadata.tags as string[]) {
                    await this.db.run(
                        'INSERT OR REPLACE INTO memory_tags (memory_id, tag) VALUES (?, ?)',
                        [id, tag]
                    );
                }
            }
            
            logger.debug(`Added record with ID ${id} to collection ${collection}`);
            return id;
        } catch (error) {
            logger.error(`Failed to add record to collection ${collection}:`, error);
            throw error;
        }
    }

    /**
     * Get a record by ID
     */
    public async getRecord(collection: string, id: string): Promise<Record<string, any> | undefined> {
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
        } catch (error) {
            logger.error(`Failed to get record with ID ${id} from collection ${collection}:`, error);
            return undefined;
        }
    }

    /**
     * Update a record
     */
    public async updateRecord(collection: string, id: string, record: Record<string, any>): Promise<boolean> {
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
            const result = await this.db.run(
                'UPDATE memories SET content = ?, timestamp = ?, metadata = ? WHERE id = ?',
                [content, timestamp, JSON.stringify(metadata), id]
            );
            
            if (result.changes === 0) {
                return false;
            }
            
            // Delete existing tags
            await this.db.run('DELETE FROM memory_tags WHERE memory_id = ?', [id]);
            
            // Insert new tags if present
            if (metadata.tags && Array.isArray(metadata.tags)) {
                for (const tag of metadata.tags as string[]) {
                    await this.db.run(
                        'INSERT INTO memory_tags (memory_id, tag) VALUES (?, ?)',
                        [id, tag]
                    );
                }
            }
            
            logger.debug(`Updated record with ID ${id} in collection ${collection}`);
            return true;
        } catch (error) {
            logger.error(`Failed to update record with ID ${id} in collection ${collection}:`, error);
            return false;
        }
    }

    /**
     * Delete a record
     */
    public async deleteRecord(collection: string, id: string): Promise<boolean> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            
            // Delete memory (tags will be deleted via ON DELETE CASCADE)
            const result = await this.db.run('DELETE FROM memories WHERE id = ?', [id]);
            
            logger.debug(`Deleted record with ID ${id} from collection ${collection}`);
            return result.changes > 0;
        } catch (error) {
            logger.error(`Failed to delete record with ID ${id} from collection ${collection}:`, error);
            return false;
        }
    }

    /**
     * Query records
     */
    public async queryRecords(collection: string, query: Record<string, any>, limit?: number): Promise<Record<string, any>[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            
            // Build query
            let sql = 'SELECT DISTINCT m.* FROM memories m';
            const params: any[] = [];
            
            // Handle tag filters - using proper parameter binding
            if (query['metadata.tags'] && Array.isArray(query['metadata.tags'].$all)) {
                const tags = query['metadata.tags'].$all;
                if (tags.length > 0) {
                    sql += ` JOIN memory_tags t ON m.id = t.memory_id 
                            WHERE t.tag IN (${Array(tags.length).fill('?').join(',')})
                            GROUP BY m.id
                            HAVING COUNT(DISTINCT t.tag) = ?`;
                    params.push(...tags.map((tag: string) => String(tag)), tags.length);
                    delete query['metadata.tags'];
                }
            } else {
                sql += ' WHERE 1=1';
            }
            
            // Handle other filters with proper type checking and escaping
            for (const [key, value] of Object.entries(query)) {
                if (!value) continue;

                if (key === '$text') {
                    if (typeof value.$search === 'string') {
                        sql += ' AND m.content LIKE ?';
                        params.push(`%${value.$search}%`);
                    }
                } else if (key.startsWith('metadata.')) {
                    const metadataKey = key.substring(9).replace(/[^a-zA-Z0-9_]/g, '');
                    if (metadataKey) {
                        sql += ` AND json_extract(m.metadata, '$.${metadataKey}') = ?`;
                        params.push(value);
                    }
                } else if (key === 'timestamp') {
                    if (typeof value.$gte === 'number') {
                        sql += ' AND m.timestamp >= ?';
                        params.push(value.$gte);
                    }
                    if (typeof value.$lte === 'number') {
                        sql += ' AND m.timestamp <= ?';
                        params.push(value.$lte);
                    }
                } else if (['id', 'content', 'timestamp'].includes(key)) {
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
            const tags = memoryIds.length > 0 ? await this.db.all(
                `SELECT memory_id, tag FROM memory_tags WHERE memory_id IN (${
                    Array(memoryIds.length).fill('?').join(',')
                })`,
                ...memoryIds
            ) : [];
            
            // Group tags by memory ID using Map for better performance
            const tagsByMemoryId = new Map<string, string[]>();
            for (const tag of tags as any[]) {
                if (!tagsByMemoryId.has(tag.memory_id)) {
                    tagsByMemoryId.set(tag.memory_id, []);
                }
                tagsByMemoryId.get(tag.memory_id)!.push(tag.tag);
            }
            
            // Build result with proper error handling for JSON parsing
            return memories.map(memory => {
                let metadata: Record<string, any>;
                try {
                    metadata = JSON.parse(memory.metadata);
                } catch (e) {
                    logger.warn(`Invalid JSON in metadata for memory ${memory.id}:`, e);
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
        } catch (error) {
            logger.error(`Failed to query records from collection ${collection}:`, error);
            throw error; // Re-throw to allow proper error handling upstream
        }
    }

    /**
     * Clear all records in a collection
     */
    public async clearCollection(collection: string): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            if (collection !== 'memories') {
                throw new Error(`Collection ${collection} not supported`);
            }
            
            // Delete all memories (tags will be deleted via ON DELETE CASCADE)
            await this.db.run('DELETE FROM memories');
            
            logger.info(`Cleared collection ${collection}`);
        } catch (error) {
            logger.error(`Failed to clear collection ${collection}:`, error);
            throw error;
        }
    }
}
