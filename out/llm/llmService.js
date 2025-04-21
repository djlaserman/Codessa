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
exports.llmService = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const config_1 = require("../config");
const providerSettings_1 = require("./providerSettings");
// Import all providers
const openaiProvider_1 = require("./providers/openaiProvider");
const ollamaProvider_1 = require("./providers/ollamaProvider");
const googleAIProvider_1 = require("./providers/googleAIProvider");
const mistralAIProvider_1 = require("./providers/mistralAIProvider");
const anthropicProvider_1 = require("./providers/anthropicProvider");
const lmstudioProvider_1 = require("./providers/lmstudioProvider");
const openrouterProvider_1 = require("./providers/openrouterProvider");
const huggingfaceProvider_1 = require("./providers/huggingfaceProvider");
const cohereProvider_1 = require("./providers/cohereProvider");
const deepseekProvider_1 = require("./providers/deepseekProvider");
// import { AI21Provider } from './providers/ai21Provider';
// import { AlephAlphaProvider } from './providers/alephalphaprovider';
// import { TogetherAIProvider } from './providers/togetheraiProvider';
// import { PerplexityAIProvider } from './providers/perplexityProvider';
/**
 * Service that manages LLM providers and model selection
 */
class LLMService {
    constructor() {
        this.providers = new Map();
        this._onProvidersChanged = new vscode.EventEmitter();
        this.onProvidersChanged = this._onProvidersChanged.event;
        // Listen for configuration changes that might affect providers
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.llm')) {
                logger_1.logger.info("LLM configuration changed, re-initializing providers.");
                this.reinitializeProviders();
            }
        });
    }
    /**
     * Initialize the service with the extension context
     * This must be called before using any provider functionality
     */
    initialize(context) {
        this.context = context;
        this.initializeProviders();
    }
    async initializeProviders() {
        if (!this.context) {
            logger_1.logger.error('LLMService not initialized with context');
            return;
        }
        // Clear existing providers
        this.providers.clear();
        // Register all providers
        const providerFactories = [
            // Register built-in providers
            { id: 'ollama', factory: () => new ollamaProvider_1.OllamaProvider() },
            { id: 'openai', factory: () => new openaiProvider_1.OpenAIProvider() },
            { id: 'anthropic', factory: () => new anthropicProvider_1.AnthropicProvider() },
            { id: 'googleai', factory: () => new googleAIProvider_1.GoogleAIProvider() },
            { id: 'mistralai', factory: () => new mistralAIProvider_1.MistralAIProvider() },
            { id: 'lmstudio', factory: () => new lmstudioProvider_1.LMStudioProvider(this.context) },
            { id: 'openrouter', factory: () => new openrouterProvider_1.OpenRouterProvider(this.context) },
            { id: 'huggingface', factory: () => new huggingfaceProvider_1.HuggingFaceProvider(this.context) },
            { id: 'deepseek', factory: () => new deepseekProvider_1.DeepSeekProvider(this.context) },
            { id: 'cohere', factory: () => new cohereProvider_1.CohereProvider(this.context) },
            // These will be implemented later
            // { id: 'ai21', factory: () => new AI21Provider(this.context!) },
            // { id: 'alephalpha', factory: () => new AlephAlphaProvider(this.context!) },
            // { id: 'togetherai', factory: () => new TogetherAIProvider(this.context!) },
            // { id: 'perplexity', factory: () => new PerplexityAIProvider(this.context!) }
        ];
        // Register each provider
        for (const { id, factory } of providerFactories) {
            await this.tryRegisterProvider(id, factory);
        }
        logger_1.logger.info(`Initialized ${this.providers.size} LLM providers.`);
        const configured = this.getConfiguredProviders();
        logger_1.logger.info(`${configured.length} providers are configured: ${configured.map(p => p.providerId).join(', ')}`);
        // Notify listeners that providers have changed
        this._onProvidersChanged.fire();
    }
    async reinitializeProviders() {
        await this.initializeProviders();
    }
    /**
     * Attempt to register a provider with error handling
     */
    async tryRegisterProvider(id, providerFactory) {
        try {
            const provider = providerFactory();
            // Only register if the provider initializes successfully
            if (provider) {
                this.registerProvider(provider);
                logger_1.logger.info(`Successfully registered provider: ${id}`);
                // Try to initialize models if provider is configured
                if (provider.isConfigured()) {
                    try {
                        const models = await provider.listModels();
                        logger_1.logger.info(`Provider ${id} has ${models.length} models available`);
                    }
                    catch (error) {
                        logger_1.logger.warn(`Failed to list models for provider ${id}:`, error);
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.warn(`Failed to initialize ${id} provider:`, error);
        }
    }
    /**
     * Registers a new LLM provider
     */
    registerProvider(provider) {
        if (this.providers.has(provider.providerId)) {
            logger_1.logger.warn(`Provider with ID '${provider.providerId}' is already registered. Overwriting.`);
        }
        this.providers.set(provider.providerId, provider);
    }
    /**
     * Gets a provider by ID
     */
    getProvider(providerId) {
        return this.providers.get(providerId);
    }
    /**
     * Gets the appropriate LLM provider based on the config
     */
    getProviderForConfig(config) {
        const provider = this.providers.get(config.provider);
        if (!provider) {
            logger_1.logger.warn(`LLM provider '${config.provider}' not found.`);
            return undefined;
        }
        if (!provider.isConfigured()) {
            logger_1.logger.warn(`LLM provider '${config.provider}' is not configured.`);
            return undefined;
        }
        return provider;
    }
    /**
     * Gets the default provider based on settings
     */
    getDefaultProvider() {
        if (!this.context) {
            logger_1.logger.error('LLMService not initialized with context');
            return undefined;
        }
        // Get default provider ID from settings
        const defaultProviderId = providerSettings_1.providerSettingsManager.getInstance(this.context).getDefaultProviderId();
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
     * Sets the default provider
     */
    async setDefaultProvider(providerId) {
        if (!this.context) {
            logger_1.logger.error('LLMService not initialized with context');
            return false;
        }
        const provider = this.providers.get(providerId);
        if (!provider) {
            logger_1.logger.warn(`Cannot set default provider: Provider '${providerId}' not found.`);
            return false;
        }
        try {
            await providerSettings_1.providerSettingsManager.getInstance(this.context).setDefaultProviderId(providerId);
            logger_1.logger.info(`Set default provider to ${providerId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to set default provider to ${providerId}:`, error);
            return false;
        }
    }
    /**
     * Gets all available LLM providers
     */
    getAllProviders() {
        return Array.from(this.providers.values());
    }
    /**
     * Gets all available configured providers
     */
    getConfiguredProviders() {
        return Array.from(this.providers.values())
            .filter(provider => provider.isConfigured());
    }
    /**
     * Lists all provider IDs
     */
    listProviderIds() {
        return Array.from(this.providers.keys());
    }
    /**
     * Gets the default model configuration from settings
     */
    getDefaultModelConfig() {
        return (0, config_1.getDefaultModelConfig)();
    }
    /**
     * Updates the configuration for a provider
     */
    async updateProviderConfig(providerId, config) {
        if (!this.context) {
            logger_1.logger.error('LLMService not initialized with context');
            return false;
        }
        const provider = this.providers.get(providerId);
        if (!provider) {
            logger_1.logger.warn(`Cannot update provider config: Provider '${providerId}' not found.`);
            return false;
        }
        try {
            await provider.updateConfig(config);
            logger_1.logger.info(`Updated configuration for provider ${providerId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Failed to update configuration for provider ${providerId}:`, error);
            return false;
        }
    }
    /**
     * Gets the configuration for a provider
     */
    getProviderConfig(providerId) {
        const provider = this.providers.get(providerId);
        if (!provider) {
            return undefined;
        }
        return provider.getConfig();
    }
}
exports.llmService = new LLMService();
//# sourceMappingURL=llmService.js.map