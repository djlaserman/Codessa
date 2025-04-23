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
exports.providerSettingsManager = exports.ProviderSettingsManager = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const credentialsManager_1 = require("../credentials/credentialsManager");
/**
 * Manages provider settings, combining secure credentials with
 * non-sensitive configuration stored in VS Code settings
 */
class ProviderSettingsManager {
    constructor(context) {
        this.configSection = 'codessa.llm';
        this.context = context;
    }
    /**
     * Get the singleton instance of ProviderSettingsManager
     */
    static getInstance(context) {
        if (!ProviderSettingsManager.instance) {
            if (!context) {
                throw new Error('ProviderSettingsManager must be initialized with a context first');
            }
            ProviderSettingsManager.instance = new ProviderSettingsManager(context);
        }
        return ProviderSettingsManager.instance;
    }
    /**
     * Get the configuration for a provider
     * @param providerId The provider ID
     * @returns The provider configuration
     */
    async getProviderConfig(providerId) {
        try {
            // Get non-sensitive settings from VS Code configuration
            const config = vscode.workspace.getConfiguration('codessa.llm');
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
     * @param providerId The provider ID
     * @param config The new configuration
     */
    async updateProviderConfig(providerId, config) {
        try {
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
                const vsConfig = vscode.workspace.getConfiguration('codessa.llm');
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
                        await vsConfig.update('providers', updatedProviders, true);
                        logger_1.logger.info(`Updated user configuration for provider ${providerId}`);
                        return; // Exit if successful
                    }
                    catch (userError) {
                        logger_1.logger.warn(`Failed to update user configuration: ${userError}. Trying workspace/global...`);
                    }
                    // Then try Workspace or Global level
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Workspace);
                        logger_1.logger.info(`Updated workspace configuration for provider ${providerId}`);
                    }
                    else {
                        // If no workspace is open, update at the Global level
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Global);
                        logger_1.logger.info(`Updated global configuration for provider ${providerId}`);
                    }
                }
                catch (updateError) {
                    logger_1.logger.error(`Failed to update configuration: ${updateError}`);
                    throw new Error(`Failed to update configuration: ${updateError}`);
                }
            }
            catch (error) {
                logger_1.logger.error(`Failed to update configuration for provider ${providerId}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to update provider configuration: ${errorMessage}. Please check your VS Code settings permissions.`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to update provider config for ${providerId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to update provider configuration: ${errorMessage}`);
        }
    }
    /**
     * Check if a provider has been configured
     * @param providerId The provider ID
     * @returns True if the provider has been configured
     */
    async isProviderConfigured(providerId) {
        try {
            const config = await this.getProviderConfig(providerId);
            const hasApiKey = await credentialsManager_1.credentialsManager.getInstance(this.context).hasCredential(providerId, 'apiKey');
            // Check if the provider has the minimum required configuration
            return hasApiKey || (config.apiKey !== undefined && config.apiKey !== '');
        }
        catch (error) {
            logger_1.logger.error(`Failed to check if provider ${providerId} is configured:`, error);
            return false;
        }
    }
    /**
     * Get the default provider ID from settings
     * @returns The default provider ID, or 'ollama' if not set
     */
    getDefaultProviderId() {
        try {
            const config = vscode.workspace.getConfiguration('codessa.llm');
            return config.get('defaultProvider') || 'ollama';
        }
        catch (error) {
            logger_1.logger.error('Failed to get default provider ID:', error);
            return 'ollama';
        }
    }
    /**
     * Set the default provider ID
     * @param providerId The provider ID to set as default
     */
    async setDefaultProviderId(providerId) {
        try {
            const config = vscode.workspace.getConfiguration('codessa.llm');
            // Try different configuration targets in order
            try {
                // First try updating at the Workspace level if we have a workspace
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Workspace);
                    logger_1.logger.info(`Set default provider to ${providerId} at workspace level`);
                }
                else {
                    // If no workspace is open, update at the Global level
                    await config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Global);
                    logger_1.logger.info(`Set default provider to ${providerId} at global level`);
                }
            }
            catch (updateError) {
                logger_1.logger.warn(`Failed to set default provider at workspace/global level: ${updateError}`);
                // Try User settings as a fallback
                try {
                    await config.update('defaultProvider', providerId, true);
                    logger_1.logger.info(`Set default provider to ${providerId} at user level`);
                }
                catch (userError) {
                    logger_1.logger.error(`Failed to set default provider at user level: ${userError}`);
                    throw new Error(`Failed to set default provider: ${userError}`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to set default provider to ${providerId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to set default provider: ${errorMessage}`);
        }
    }
}
exports.ProviderSettingsManager = ProviderSettingsManager;
// Export singleton instance
exports.providerSettingsManager = {
    getInstance: ProviderSettingsManager.getInstance
};
//# sourceMappingURL=providerSettings.js.map