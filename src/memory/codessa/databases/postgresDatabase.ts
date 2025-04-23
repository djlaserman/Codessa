import { IDatabase } from '../../types';
import { logger } from '../../../logger';
import { getConfig } from '../../../config';
import { Pool, PoolClient } from 'pg';

/**
 * PostgreSQL database implementation
 */
export class PostgresDatabase implements IDatabase {
    private pool: Pool | undefined;
    private connectionString: string;
    private schema: string;
    private initialized = false;

    constructor() {
        this.connectionString = getConfig<string>('memory.database.postgres.connectionString', '');
        this.schema = getConfig<string>('memory.database.postgres.schema', 'codessa');
    }

    /**
     * Initialize the database
     */
    public async initialize(): Promise<void> {
        try {
            if (!this.connectionString) {
                throw new Error('PostgreSQL connection string not configured');
            }
            
            // Create connection pool
            this.pool = new Pool({
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
                logger.info(`PostgreSQL database initialized successfully with schema ${this.schema}`);
            } finally {
                client.release();
            }
        } catch (error) {
            logger.error('Failed to initialize PostgreSQL database:', error);
            throw error;
        }
    }

    /**
     * Add a record
     */
    public async addRecord(collection: string, record: Record<string, any>): Promise<string> {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }

        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }

        let client: PoolClient | undefined;
        
        try {
            client = await this.pool.connect();
            
            // Extract fields
            const { id, content, timestamp, metadata } = record;
            
            // Insert record
            await client.query(
                `INSERT INTO ${this.schema}.memories (id, content, timestamp, metadata)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE
                SET content = $2, timestamp = $3, metadata = $4`,
                [id, content, timestamp, JSON.stringify(metadata)]
            );
            
            logger.debug(`Added record with ID ${id} to collection ${collection}`);
            return id;
        } catch (error) {
            logger.error(`Failed to add record to collection ${collection}:`, error);
            throw error;
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    /**
     * Get a record by ID
     */
    public async getRecord(collection: string, id: string): Promise<Record<string, any> | undefined> {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }

        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }

        let client: PoolClient | undefined;
        
        try {
            client = await this.pool.connect();
            
            // Get record
            const result = await client.query(
                `SELECT * FROM ${this.schema}.memories WHERE id = $1`,
                [id]
            );
            
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
        } catch (error) {
            logger.error(`Failed to get record with ID ${id} from collection ${collection}:`, error);
            return undefined;
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    /**
     * Update a record
     */
    public async updateRecord(collection: string, id: string, record: Record<string, any>): Promise<boolean> {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }

        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }

        let client: PoolClient | undefined;
        
        try {
            client = await this.pool.connect();
            
            // Extract fields
            const { content, timestamp, metadata } = record;
            
            // Update record
            const result = await client.query(
                `UPDATE ${this.schema}.memories
                SET content = $1, timestamp = $2, metadata = $3
                WHERE id = $4`,
                [content, timestamp, JSON.stringify(metadata), id]
            );
            
            logger.debug(`Updated record with ID ${id} in collection ${collection}`);
            return result.rowCount > 0;
        } catch (error) {
            logger.error(`Failed to update record with ID ${id} in collection ${collection}:`, error);
            return false;
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    /**
     * Delete a record
     */
    public async deleteRecord(collection: string, id: string): Promise<boolean> {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }

        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }

        let client: PoolClient | undefined;
        
        try {
            client = await this.pool.connect();
            
            // Delete record
            const result = await client.query(
                `DELETE FROM ${this.schema}.memories WHERE id = $1`,
                [id]
            );
            
            logger.debug(`Deleted record with ID ${id} from collection ${collection}`);
            return result.rowCount > 0;
        } catch (error) {
            logger.error(`Failed to delete record with ID ${id} from collection ${collection}:`, error);
            return false;
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    /**
     * Query records
     */
    public async queryRecords(collection: string, query: Record<string, any>, limit?: number): Promise<Record<string, any>[]> {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }

        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }

        let client: PoolClient | undefined;
        
        try {
            client = await this.pool.connect();
            
            // Build query
            let sql = `SELECT * FROM ${this.schema}.memories`;
            const params: any[] = [];
            const conditions: string[] = [];
            let paramIndex = 1;
            
            // Handle filters
            for (const key in query) {
                if (key === '$text') {
                    conditions.push(`to_tsvector('english', content) @@ plainto_tsquery('english', $${paramIndex})`);
                    params.push(query[key].$search);
                    paramIndex++;
                } else if (key.startsWith('metadata.')) {
                    const metadataKey = key.substring(9);
                    conditions.push(`metadata->>'${metadataKey}' = $${paramIndex}`);
                    params.push(query[key]);
                    paramIndex++;
                } else if (key === 'timestamp') {
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
                } else {
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
        } catch (error) {
            logger.error(`Failed to query records from collection ${collection}:`, error);
            return [];
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    /**
     * Clear all records in a collection
     */
    public async clearCollection(collection: string): Promise<void> {
        if (!this.pool || !this.initialized) {
            throw new Error('Database not initialized');
        }

        if (collection !== 'memories') {
            throw new Error(`Collection ${collection} not supported`);
        }

        let client: PoolClient | undefined;
        
        try {
            client = await this.pool.connect();
            
            // Delete all records
            await client.query(`DELETE FROM ${this.schema}.memories`);
            
            logger.info(`Cleared collection ${collection}`);
        } catch (error) {
            logger.error(`Failed to clear collection ${collection}:`, error);
            throw error;
        } finally {
            if (client) {
                client.release();
            }
        }
    }
}
