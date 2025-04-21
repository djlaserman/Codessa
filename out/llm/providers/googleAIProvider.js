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
exports.GoogleAIProvider = void 0;
const config_1 = require("../../config");
const logger_1 = require("../../logger");
const vscode = __importStar(require("vscode"));
// import { GoogleGenerativeAI } from '@google/generative-ai'; // Uncomment and install if using the SDK
class GoogleAIProvider {
    constructor() {
        this.providerId = 'googleai';
        this.displayName = 'Google AI';
        this.description = 'Google Gemini AI models';
        this.website = 'https://ai.google.dev/';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = false;
        this.defaultModel = 'gemini-pro';
        this.apiKey = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.providers.googleai')) {
                logger_1.logger.info("Google AI configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }
    initializeClient() {
        this.apiKey = (0, config_1.getGoogleAIApiKey)();
        if (!this.apiKey) {
            logger_1.logger.warn('Google AI API key not set.');
        }
        else {
            logger_1.logger.info('Google AI credentials initialized.');
        }
    }
    isConfigured() {
        return !!this.apiKey;
    }
    async generate(_params, _cancellationToken) {
        if (!this.isConfigured()) {
            return {
                content: '',
                error: 'Google AI provider not configured (API key missing). Please set the API key in settings.'
            };
        }
        // Placeholder for actual implementation
        logger_1.logger.warn("Google AI provider is a placeholder and not fully implemented yet.");
        return {
            content: 'Google AI provider is not fully implemented yet.',
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
            'gemini-pro',
            'gemini-pro-vision'
        ];
    }
    async listModels() {
        if (!this.isConfigured()) {
            return [];
        }
        // Return default models
        const models = [
            'gemini-pro',
            'gemini-pro-vision'
        ];
        logger_1.logger.info(`Provider googleai has ${models.length} models available`);
        return models.map(id => ({ id }));
    }
    /**
     * Test connection to Google AI
     */
    async testConnection(modelId) {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Google AI not configured. Please check your API key.'
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
            message: `Google AI provider is configured with model '${modelId}'. Note: This is a placeholder implementation.`
        };
    }
    /**
     * Get the configuration for this provider
     */
    getConfig() {
        return {
            apiKey: this.apiKey,
            defaultModel: this.defaultModel
        };
    }
    /**
     * Update the provider configuration
     */
    async updateConfig(config) {
        // This is a placeholder - in the real implementation, we would update the configuration
        logger_1.logger.info(`Google AI provider updateConfig called with: ${JSON.stringify(config)}`);
    }
    /**
     * Get the configuration fields for this provider
     */
    getConfigurationFields() {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Google AI API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., gemini-pro)',
                required: false,
                type: 'string'
            }
        ];
    }
}
exports.GoogleAIProvider = GoogleAIProvider;
//# sourceMappingURL=googleAIProvider.js.map