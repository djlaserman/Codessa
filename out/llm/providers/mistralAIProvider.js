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
exports.MistralAIProvider = void 0;
const config_1 = require("../../config");
const logger_1 = require("../../logger");
const vscode = __importStar(require("vscode"));
// import { MistralClient } from '@mistralai/mistralai'; // Uncomment and install if using the SDK
class MistralAIProvider {
    constructor() {
        this.providerId = 'mistralai';
        this.displayName = 'Mistral AI';
        this.description = 'Mistral AI language models';
        this.website = 'https://mistral.ai/';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api.mistral.ai/v1';
        this.defaultModel = 'mistral-large';
        this.apiKey = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.providers.mistralai')) {
                logger_1.logger.info("Mistral AI configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }
    initializeClient() {
        this.apiKey = (0, config_1.getMistralAIApiKey)();
        if (!this.apiKey) {
            logger_1.logger.warn('Mistral AI API key not set.');
        }
        else {
            logger_1.logger.info('Mistral AI credentials initialized.');
        }
    }
    isConfigured() {
        return !!this.apiKey;
    }
    async generate(_params, _cancellationToken) {
        if (!this.isConfigured()) {
            return {
                content: '',
                error: 'Mistral AI provider not configured (API key missing). Please set the API key in settings.'
            };
        }
        // Placeholder for actual implementation
        logger_1.logger.warn("Mistral AI provider is a placeholder and not fully implemented yet.");
        return {
            content: 'Mistral AI provider is not fully implemented yet.',
            finishReason: 'not_implemented',
            error: 'Provider not fully implemented'
        };
    }
    async getAvailableModels() {
        if (!this.isConfigured()) {
            return [];
        }
        // Return default models
        return [
            'mistral-tiny',
            'mistral-small',
            'mistral-medium',
            'mistral-large'
        ];
    }
    async listModels() {
        if (!this.isConfigured()) {
            return [];
        }
        // Return default models
        const models = [
            'mistral-tiny',
            'mistral-small',
            'mistral-medium',
            'mistral-large'
        ];
        logger_1.logger.info(`Provider mistralai has ${models.length} models available`);
        return models.map(id => ({ id }));
    }
    /**
     * Test connection to Mistral AI
     */
    async testConnection(modelId) {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Mistral AI not configured. Please check your API key.'
            };
        }
        // Since we don't have a real implementation yet, just check if the model is in our list
        const availableModels = await this.getAvailableModels();
        if (!availableModels.includes(modelId)) {
            return {
                success: false,
                message: `Model '${modelId}' not found in available models.`
            };
        }
        return {
            success: true,
            message: `Mistral AI provider is configured with model '${modelId}'. Note: This is a placeholder implementation.`
        };
    }
    /**
     * Get the configuration for this provider
     */
    getConfig() {
        return {
            apiKey: this.apiKey,
            apiEndpoint: this.defaultEndpoint,
            defaultModel: this.defaultModel
        };
    }
    /**
     * Update the provider configuration
     */
    async updateConfig(config) {
        // This is a placeholder - in the real implementation, we would update the configuration
        logger_1.logger.info(`Mistral AI provider updateConfig called with: ${JSON.stringify(config)}`);
    }
    /**
     * Get the configuration fields for this provider
     */
    getConfigurationFields() {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Mistral AI API key',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The Mistral AI API endpoint (default: https://api.mistral.ai/v1)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., mistral-large)',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.MistralAIProvider = MistralAIProvider;
//# sourceMappingURL=mistralAIProvider.js.map