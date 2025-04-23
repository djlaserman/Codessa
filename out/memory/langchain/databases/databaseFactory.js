"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseFactory = void 0;
const sqliteDatabase_1 = require("./sqliteDatabase");
const postgresDatabase_1 = require("./postgresDatabase");
const mysqlDatabase_1 = require("./mysqlDatabase");
const mongodbDatabase_1 = require("./mongodbDatabase");
const redisDatabase_1 = require("./redisDatabase");
const logger_1 = require("../../../logger");
/**
 * Factory for creating databases
 */
class DatabaseFactory {
    /**
     * Create a database
     * @param type Database type
     * @returns Database instance
     */
    static async createDatabase(type) {
        logger_1.logger.info(`Creating database of type: ${type}`);
        switch (type) {
            case 'sqlite':
                return new sqliteDatabase_1.SQLiteDatabase();
            case 'mysql':
                return new mysqlDatabase_1.MySQLDatabase();
            case 'postgres':
                return new postgresDatabase_1.PostgresDatabase();
            case 'mongodb':
                return new mongodbDatabase_1.MongoDBDatabase();
            case 'redis':
                return new redisDatabase_1.RedisDatabase();
            default:
                logger_1.logger.warn(`Unknown database type: ${type}, falling back to SQLite database`);
                return new sqliteDatabase_1.SQLiteDatabase();
        }
    }
}
exports.DatabaseFactory = DatabaseFactory;
//# sourceMappingURL=databaseFactory.js.map