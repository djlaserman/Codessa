import { IDatabase } from '../../types';
import { SQLiteDatabase } from './sqliteDatabase';
import { PostgresDatabase } from './postgresDatabase';
import { MySQLDatabase } from './mysqlDatabase';
import { MongoDBDatabase } from './mongodbDatabase';
import { RedisDatabase } from './redisDatabase';
import { logger } from '../../../logger';

/**
 * Factory for creating databases
 */
export class DatabaseFactory {
    /**
     * Create a database
     * @param type Database type
     * @returns Database instance
     */
    public static async createDatabase(type: string): Promise<IDatabase> {
        logger.info(`Creating database of type: ${type}`);

        switch (type) {
            case 'sqlite':
                return new SQLiteDatabase();
            case 'mysql':
                return new MySQLDatabase();
            case 'postgres':
                return new PostgresDatabase();
            case 'mongodb':
                return new MongoDBDatabase();
            case 'redis':
                return new RedisDatabase();
            default:
                logger.warn(`Unknown database type: ${type}, falling back to SQLite database`);
                return new SQLiteDatabase();
        }
    }
}
