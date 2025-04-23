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
exports.providerManager = exports.ProviderManager = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const credentialsManager_1 = require("../credentials/credentialsManager");
/**
 * Manages all aspects of LLM providers:
 * - Provider registration and initialization
 * - Provider configuration and settings
 * - Credentials management
 * - Model listing and selection
 *
 * This class consolidates functionality that was previously spread across multiple files.
 */
class ProviderManager {
    constructor(context) {
        this.providers = new Map();
        this.configSection = 'codessa.llm';
        this.context = context;
    }
    /**
     * Get the singleton instance of ProviderManager
     */
    static getInstance(context) {
        if (!ProviderManager.instance) {
            if (!context) {
                throw new Error('ProviderManager must be initialized with a context first');
            }
            ProviderManager.instance = new ProviderManager(context);
        }
        return ProviderManager.instance;
    }
    /**
     * Initialize the provider manager with the extension context
     */
    initialize(context) {
        this.context = context;
        logger_1.logger.info('Provider manager initialized');
    }
    /**
     * Register a provider with the manager
     */
    registerProvider(provider) {
        if (this.providers.has(provider.providerId)) {
            logger_1.logger.warn(`Provider with ID '${provider.providerId}' is already registered. Overwriting.`);
        }
        this.providers.set(provider.providerId, provider);
        logger_1.logger.info(`Registered provider: ${provider.providerId}`);
    }
    /**
     * Get a provider by ID
     */
    getProvider(providerId) {
        return this.providers.get(providerId);
    }
    /**
     * Get all registered providers
     */
    getAllProviders() {
        return Array.from(this.providers.values());
    }
    /**
     * Get all provider IDs
     */
    getAllProviderIds() {
        return Array.from(this.providers.keys());
    }
    /**
     * Get all configured providers
     */
    getConfiguredProviders() {
        return Array.from(this.providers.values())
            .filter(provider => provider.isConfigured());
    }
    /**
     * Get the default provider based on settings
     */
    getDefaultProvider() {
        if (!this.context) {
            logger_1.logger.error('ProviderManager not initialized with context');
            return undefined;
        }
        // Get default provider ID from settings
        const defaultProviderId = this.getDefaultProviderId();
        const provider = this.providers.get(defaultProviderId);
        // If the default provider is not available or not configured, try to find another configured provider
        if (!provider || !provider.isConfigured()) {
            logger_1.logger.warn(`Default provider '${defaultProviderId}' not found or not configured. Trying to find another provider.`);
            const configuredProviders = this.getConfiguredProviders();
            if (configuredProviders.length > 0) {
                return configuredProviders[0];
            }
            return undefined;
        }
        return provider;
    }
    /**
     * Get the default provider ID from settings
     */
    getDefaultProviderId() {
        try {
            const config = vscode.workspace.getConfiguration(this.configSection);
            return config.get('defaultProvider') || 'ollama';
        }
        catch (error) {
            logger_1.logger.error('Failed to get default provider ID:', error);
            return 'ollama';
        }
    }
    /**
     * Set the default provider ID
     */
    async setDefaultProviderId(providerId) {
        try {
            const config = vscode.workspace.getConfiguration(this.configSection);
            // Try different configuration targets in order
            try {
                // First try updating at the Global level
                try {
                    await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Global);
                    logger_1.logger.info(`Set default provider to ${providerId} at global level`);
                    return true;
                }
                catch (globalError) {
                    logger_1.logger.warn(`Failed to set default provider at global level: ${globalError}. Trying workspace level...`);
                }
                // Then try Workspace level if available
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Workspace);
                    logger_1.logger.info(`Set default provider to ${providerId} at workspace level`);
                    return true;
                }
                // If we get here, both attempts failed
                logger_1.logger.error(`Failed to set default provider to ${providerId}: No valid configuration target found`);
                return false;
            }
            catch (updateError) {
                logger_1.logger.error(`Failed to set default provider: ${updateError}`);
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to set default provider to ${providerId}:`, error);
            return false;
        }
    }
    /**
     * Get the configuration for a provider
     */
    async getProviderConfig(providerId) {
        try {
            if (!this.context) {
                throw new Error('ProviderManager not initialized with context');
            }
            // Get non-sensitive settings from VS Code configuration
            const config = vscode.workspace.getConfiguration(this.configSection);
            const providers = config.get('providers') || {};
            const providerConfig = providers[providerId] || {};
            // Get sensitive settings from secure storage
            const apiKey = await credentialsManager_1.credentialsManager.getInstance(this.context).getCredential(providerId, 'apiKey');
            return {
                ...providerConfig,
                apiKey: apiKey || providerConfig.apiKey
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to get provider config for ${providerId}:`, error);
            return {};
        }
    }
    /**
     * Update the configuration for a provider
     */
    async updateProviderConfig(providerId, config) {
        try {
            if (!this.context) {
                throw new Error('ProviderManager not initialized with context');
            }
            // Store API key in secure storage
            if (config.apiKey) {
                await credentialsManager_1.credentialsManager.getInstance(this.context).storeCredential(providerId, 'apiKey', config.apiKey);
                // Remove API key from the config object that will be stored in settings
                const { apiKey, ...nonSensitiveConfig } = config;
                config = nonSensitiveConfig;
            }
            // Update non-sensitive settings in VS Code configuration
            try {
                // Get the current configuration
                const vsConfig = vscode.workspace.getConfiguration(this.configSection);
                // Get the current providers object
                const providers = vsConfig.get('providers') || {};
                // Update the specific provider in the providers object
                const updatedProviders = {
                    ...providers,
                    [providerId]: config
                };
                // Log the current configuration and what we're trying to update
                logger_1.logger.debug(`Current providers configuration: ${JSON.stringify(providers)}`);
                logger_1.logger.debug(`Updating provider ${providerId} with config: ${JSON.stringify(config)}`);
                logger_1.logger.debug(`Updated providers will be: ${JSON.stringify(updatedProviders)}`);
                // Update the entire providers object
                try {
                    // First try updating at the User level (most reliable)
                    try {
                        // Use ConfigurationTarget.Global explicitly instead of boolean true
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Global);
                        logger_1.logger.info(`Updated global configuration for provider ${providerId}`);
                        // Update the provider instance if it exists
                        const provider = this.providers.get(providerId);
                        if (provider) {
                            await provider.loadConfig();
                        }
                        return true;
                    }
                    catch (userError) {
                        logger_1.logger.warn(`Failed to update global configuration: ${userError}. Trying workspace level...`);
                    }
                    // Then try Workspace level if available
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Workspace);
                        logger_1.logger.info(`Updated workspace configuration for provider ${providerId}`);
                        // Update the provider instance if it exists
                        const provider = this.providers.get(providerId);
                        if (provider) {
                            await provider.loadConfig();
                        }
                        return true;
                    }
                    // If we get here, both attempts failed
                    logger_1.logger.error(`Failed to update configuration for provider ${providerId}: No valid configuration target found`);
                    return false;
                }
                catch (updateError) {
                    logger_1.logger.error(`Failed to update configuration: ${updateError}`);
                    return false;
                }
            }
            catch (error) {
                logger_1.logger.error(`Failed to update configuration for provider ${providerId}:`, error);
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to update provider config for ${providerId}:`, error);
            return false;
        }
    }
    /**
     * Check if a provider is configured
     */
    async isProviderConfigured(providerId) {
        try {
            const provider = this.providers.get(providerId);
            if (!provider) {
                return false;
            }
            return provider.isConfigured();
        }
        catch (error) {
            logger_1.logger.error(`Failed to check if provider ${providerId} is configured:`, error);
            return false;
        }
    }
    /**
     * Generate text with a provider
     */
    async generate(providerId, params, cancellationToken, tools) {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider '${providerId}' not found`);
        }
        if (!provider.isConfigured()) {
            throw new Error(`Provider '${providerId}' is not configured`);
        }
        return provider.generate(params, cancellationToken, tools);
    }
    /**
     * List models for a provider
     */
    async listModels(providerId) {
        const provider = this.providers.get(providerId);
        if (!provider) {
            throw new Error(`Provider '${providerId}' not found`);
        }
        if (!provider.isConfigured()) {
            throw new Error(`Provider '${providerId}' is not configured`);
        }
        return provider.listModels();
    }
    /**
     * Test connection to a provider
     */
    async testConnection(providerId, modelId) {
        const provider = this.providers.get(providerId);
        if (!provider) {
            return {
                success: false,
                message: `Provider '${providerId}' not found`
            };
        }
        if (!provider.isConfigured()) {
            return {
                success: false,
                message: `Provider '${providerId}' is not configured`
            };
        }
        return provider.testConnection(modelId);
    }
}
exports.ProviderManager = ProviderManager;
// Export singleton instance
exports.providerManager = {
    getInstance: ProviderManager.getInstance
};
//# sourceMappingURL=providerManager.js.map