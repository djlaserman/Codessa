"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialsManager = exports.CredentialsManager = void 0;
const logger_1 = require("../logger");
/**
 * Manages secure storage and retrieval of API credentials
 * using VS Code's built-in SecretStorage API
 */
class CredentialsManager {
    constructor(context) {
        this.keyPrefix = 'codessa.credentials.';
        this.secretStorage = context.secrets;
    }
    /**
     * Get the singleton instance of CredentialsManager
     */
    static getInstance(context) {
        if (!CredentialsManager.instance) {
            if (!context) {
                throw new Error('CredentialsManager must be initialized with a context first');
            }
            CredentialsManager.instance = new CredentialsManager(context);
        }
        return CredentialsManager.instance;
    }
    /**
     * Store a credential securely
     * @param providerId The ID of the provider (e.g., 'openai', 'anthropic')
     * @param key The key name (e.g., 'apiKey', 'organizationId')
     * @param value The value to store
     */
    async storeCredential(providerId, key, value) {
        try {
            const storageKey = this.getStorageKey(providerId, key);
            await this.secretStorage.store(storageKey, value);
            logger_1.logger.info(`Stored credential for ${providerId}.${key}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to store credential for ${providerId}.${key}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to store credential: ${errorMessage}`);
        }
    }
    /**
     * Retrieve a credential
     * @param providerId The ID of the provider
     * @param key The key name
     * @returns The stored value, or undefined if not found
     */
    async getCredential(providerId, key) {
        try {
            const storageKey = this.getStorageKey(providerId, key);
            return await this.secretStorage.get(storageKey);
        }
        catch (error) {
            logger_1.logger.error(`Failed to retrieve credential for ${providerId}.${key}:`, error);
            return undefined;
        }
    }
    /**
     * Delete a stored credential
     * @param providerId The ID of the provider
     * @param key The key name
     */
    async deleteCredential(providerId, key) {
        try {
            const storageKey = this.getStorageKey(providerId, key);
            await this.secretStorage.delete(storageKey);
            logger_1.logger.info(`Deleted credential for ${providerId}.${key}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete credential for ${providerId}.${key}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete credential: ${errorMessage}`);
        }
    }
    /**
     * Check if a credential exists
     * @param providerId The ID of the provider
     * @param key The key name
     */
    async hasCredential(providerId, key) {
        const value = await this.getCredential(providerId, key);
        return value !== undefined;
    }
    /**
     * Generate the storage key for a credential
     */
    getStorageKey(providerId, key) {
        return `${this.keyPrefix}${providerId}.${key}`;
    }
}
exports.CredentialsManager = CredentialsManager;
// Export singleton instance
exports.credentialsManager = {
    getInstance: CredentialsManager.getInstance
};
//# sourceMappingURL=credentialsManager.js.map