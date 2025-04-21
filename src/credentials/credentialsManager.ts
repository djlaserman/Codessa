import * as vscode from 'vscode';
import { logger } from '../logger';

/**
 * Manages secure storage and retrieval of API credentials
 * using VS Code's built-in SecretStorage API
 */
export class CredentialsManager {
    private static instance: CredentialsManager;
    private secretStorage: vscode.SecretStorage;
    private readonly keyPrefix = 'codessa.credentials.';

    private constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
    }

    /**
     * Get the singleton instance of CredentialsManager
     */
    public static getInstance(context?: vscode.ExtensionContext): CredentialsManager {
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
    public async storeCredential(providerId: string, key: string, value: string): Promise<void> {
        try {
            const storageKey = this.getStorageKey(providerId, key);
            await this.secretStorage.store(storageKey, value);
            logger.info(`Stored credential for ${providerId}.${key}`);
        } catch (error) {
            logger.error(`Failed to store credential for ${providerId}.${key}:`, error);
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
    public async getCredential(providerId: string, key: string): Promise<string | undefined> {
        try {
            const storageKey = this.getStorageKey(providerId, key);
            return await this.secretStorage.get(storageKey);
        } catch (error) {
            logger.error(`Failed to retrieve credential for ${providerId}.${key}:`, error);
            return undefined;
        }
    }

    /**
     * Delete a stored credential
     * @param providerId The ID of the provider
     * @param key The key name
     */
    public async deleteCredential(providerId: string, key: string): Promise<void> {
        try {
            const storageKey = this.getStorageKey(providerId, key);
            await this.secretStorage.delete(storageKey);
            logger.info(`Deleted credential for ${providerId}.${key}`);
        } catch (error) {
            logger.error(`Failed to delete credential for ${providerId}.${key}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete credential: ${errorMessage}`);
        }
    }

    /**
     * Check if a credential exists
     * @param providerId The ID of the provider
     * @param key The key name
     */
    public async hasCredential(providerId: string, key: string): Promise<boolean> {
        const value = await this.getCredential(providerId, key);
        return value !== undefined;
    }

    /**
     * Generate the storage key for a credential
     */
    private getStorageKey(providerId: string, key: string): string {
        return `${this.keyPrefix}${providerId}.${key}`;
    }
}

// Export singleton instance
export const credentialsManager = {
    getInstance: CredentialsManager.getInstance
};
