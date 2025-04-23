"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralAIProvider = void 0;
var config_1 = require("../../config");
var logger_1 = require("../../logger");
var vscode = require("vscode");
// import { MistralClient } from '@mistralai/mistralai'; // Uncomment and install if using the SDK
var MistralAIProvider = /** @class */ (function () {
    function MistralAIProvider() {
        var _this = this;
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
        vscode.workspace.onDidChangeConfiguration(function (e) {
            if (e.affectsConfiguration('codessa.providers.mistralai')) {
                logger_1.logger.info("Mistral AI configuration changed, re-initializing client.");
                _this.initializeClient();
            }
        });
    }
    MistralAIProvider.prototype.initializeClient = function () {
        this.apiKey = (0, config_1.getMistralAIApiKey)();
        if (!this.apiKey) {
            logger_1.logger.warn('Mistral AI API key not set.');
        }
        else {
            logger_1.logger.info('Mistral AI credentials initialized.');
        }
    };
    MistralAIProvider.prototype.isConfigured = function () {
        return !!this.apiKey;
    };
    MistralAIProvider.prototype.generate = function (params, cancellationToken) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.isConfigured()) {
                    return [2 /*return*/, {
                            content: '',
                            error: 'Mistral AI provider not configured (API key missing). Please set the API key in settings.'
                        }];
                }
                // Placeholder for actual implementation
                logger_1.logger.warn("Mistral AI provider is a placeholder and not fully implemented yet.");
                return [2 /*return*/, {
                        content: 'Mistral AI provider is not fully implemented yet.',
                        finishReason: 'not_implemented',
                        error: 'Provider not fully implemented'
                    }];
            });
        });
    };
    MistralAIProvider.prototype.getAvailableModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.isConfigured()) {
                    return [2 /*return*/, []];
                }
                // Return default models
                return [2 /*return*/, [
                        'mistral-tiny',
                        'mistral-small',
                        'mistral-medium',
                        'mistral-large'
                    ]];
            });
        });
    };
    MistralAIProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var models;
            return __generator(this, function (_a) {
                if (!this.isConfigured()) {
                    return [2 /*return*/, []];
                }
                models = [
                    'mistral-tiny',
                    'mistral-small',
                    'mistral-medium',
                    'mistral-large'
                ];
                logger_1.logger.info("Provider mistralai has ".concat(models.length, " models available"));
                return [2 /*return*/, models.map(function (id) { return ({ id: id }); })];
            });
        });
    };
    /**
     * Test connection to Mistral AI
     */
    MistralAIProvider.prototype.testConnection = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var availableModels;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isConfigured()) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Mistral AI not configured. Please check your API key.'
                                }];
                        }
                        return [4 /*yield*/, this.getAvailableModels()];
                    case 1:
                        availableModels = _a.sent();
                        if (!availableModels.includes(modelId)) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "Model '".concat(modelId, "' not found in available models.")
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                message: "Mistral AI provider is configured with model '".concat(modelId, "'. Note: This is a placeholder implementation.")
                            }];
                }
            });
        });
    };
    /**
     * Get the configuration for this provider
     */
    MistralAIProvider.prototype.getConfig = function () {
        return {
            apiKey: this.apiKey,
            apiEndpoint: this.defaultEndpoint,
            defaultModel: this.defaultModel
        };
    };
    /**
     * Update the provider configuration
     */
    MistralAIProvider.prototype.updateConfig = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This is a placeholder - in the real implementation, we would update the configuration
                logger_1.logger.info("Mistral AI provider updateConfig called with: ".concat(JSON.stringify(config)));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get the configuration fields for this provider
     */
    MistralAIProvider.prototype.getConfigurationFields = function () {
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
    };
    return MistralAIProvider;
}());
exports.MistralAIProvider = MistralAIProvider;
