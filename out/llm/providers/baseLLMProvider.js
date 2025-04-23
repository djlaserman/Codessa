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
exports.BaseLLMProvider = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../../logger");
const providerManager_1 = require("../providerManager");
/**
 * Base class for LLM providers that implements common functionality
 */
class BaseLLMProvider {
    constructor(context) {
        this.config = {};
        this.context = context;
        if (context) {
            this.loadConfig();
        }
    }
    /**
     * Load the provider configuration
     */
    async loadConfig() {
        try {
            if (this.context) {
                this.config = await providerManager_1.providerManager.getInstance(this.context).getProviderConfig(this.providerId);
                logger_1.logger.debug(`Loaded configuration for provider ${this.providerId}`);
            }
            else {
                // If no context, try to get config from workspace settings
                const config = vscode.workspace.getConfiguration('codessa.llm');
                const providers = config.get('providers') || {};
                this.config = providers[this.providerId] || {};
                logger_1.logger.debug(`Loaded configuration for provider ${this.providerId} without context: ${JSON.stringify(this.config)}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to load configuration for provider ${this.providerId}:`, error);
            this.config = {};
        }
    }
    /**
     * Check if the provider is configured and ready to use
     */
    isConfigured() {
        if (this.requiresApiKey && !this.config.apiKey) {
            return false;
        }
        return true;
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update the provider configuration
     */
    async updateConfig(config) {
        try {
            if (this.context) {
                const success = await providerManager_1.providerManager.getInstance(this.context).updateProviderConfig(this.providerId, config);
                if (!success) {
                    throw new Error(`Failed to update configuration for provider ${this.providerId}`);
                }
            }
            else {
                // If no context, update workspace settings directly
                const vsConfig = vscode.workspace.getConfiguration('codessa.llm');
                const providers = vsConfig.get('providers') || {};
                // Update the specific provider in the providers object
                const updatedProviders = {
                    ...providers,
                    [this.providerId]: config
                };
                // Update the entire providers object
                try {
                    // First try Global level
                    await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Global);
                    logger_1.logger.info(`Updated global configuration for provider ${this.providerId}`);
                }
                catch (globalError) {
                    logger_1.logger.warn(`Failed to update global configuration: ${globalError}. Trying workspace level...`);
                    // Then try Workspace level if available
                    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                        await vsConfig.update('providers', updatedProviders, vscode.ConfigurationTarget.Workspace);
                        logger_1.logger.info(`Updated workspace configuration for provider ${this.providerId}`);
                    }
                    else {
                        throw new Error(`Failed to update configuration: No valid configuration target found`);
                    }
                }
            }
            this.config = config;
            logger_1.logger.info(`Updated configuration for provider ${this.providerId}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to update configuration for provider ${this.providerId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to update provider configuration: ${errorMessage}`);
        }
    }
    /**
     * Get the required configuration fields for this provider
     */
    getConfigurationFields() {
        const fields = [];
        if (this.requiresApiKey) {
            fields.push({
                id: 'apiKey',
                name: 'API Key',
                description: `API key for ${this.displayName}`,
                required: true,
                type: 'string'
            });
        }
        if (this.supportsEndpointConfiguration) {
            fields.push({
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: `API endpoint for ${this.displayName}`,
                required: false,
                type: 'string'
            });
        }
        fields.push({
            id: 'defaultModel',
            name: 'Default Model',
            description: `Default model to use for ${this.displayName}`,
            required: false,
            type: 'string'
        });
        return fields;
    }
    /**
     * Backward compatibility method for getAvailableModels
     * @deprecated Use listModels instead
     */
    async getAvailableModels() {
        const models = await this.listModels();
        return models.map(model => model.id);
    }
}
exports.BaseLLMProvider = BaseLLMProvider;
//# sourceMappingURL=baseLLMProvider.js.map