"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.CohereProvider = void 0;
var baseLLMProvider_1 = require("./baseLLMProvider");
var logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
var axios = require('axios');
/**
 * Provider for Cohere API
 */
var CohereProvider = /** @class */ (function (_super) {
    __extends(CohereProvider, _super);
    function CohereProvider(context) {
        var _this = _super.call(this, context) || this;
        _this.providerId = 'cohere';
        _this.displayName = 'Cohere';
        _this.description = 'Access Cohere AI models';
        _this.website = 'https://cohere.ai';
        _this.requiresApiKey = true;
        _this.supportsEndpointConfiguration = false;
        _this.defaultEndpoint = 'https://api.cohere.ai/v1';
        _this.defaultModel = 'command';
        _this.client = null;
        _this.baseUrl = _this.defaultEndpoint;
        _this.initializeClient();
        return _this;
    }
    /**
     * Initialize the Axios client for API requests
     */
    CohereProvider.prototype.initializeClient = function () {
        try {
            if (!this.config.apiKey) {
                logger_1.logger.warn('Cohere API key not configured');
                this.client = null;
                return;
            }
            this.client = axios.create({
                baseURL: this.baseUrl,
                headers: {
                    'Authorization': "Bearer ".concat(this.config.apiKey),
                    'Content-Type': 'application/json'
                }
            });
            logger_1.logger.info('Cohere client initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Cohere client:', error);
            this.client = null;
        }
    };
    /**
     * Check if the provider is configured
     */
    CohereProvider.prototype.isConfigured = function () {
        return !!this.client && !!this.config.apiKey;
    };
    /**
     * Generate text using Cohere
     */
    CohereProvider.prototype.generate = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var modelId, messages, _i, _a, message, response, content, error_1;
            var _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, { content: '', error: 'Cohere client not initialized' }];
                        }
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        modelId = params.modelId || this.config.defaultModel || this.defaultModel;
                        messages = [];
                        // Add history messages if provided
                        if (params.history && params.history.length > 0) {
                            for (_i = 0, _a = params.history; _i < _a.length; _i++) {
                                message = _a[_i];
                                if (message.role === 'user') {
                                    messages.push({
                                        role: 'USER',
                                        message: message.content
                                    });
                                }
                                else if (message.role === 'assistant') {
                                    messages.push({
                                        role: 'CHATBOT',
                                        message: message.content
                                    });
                                }
                            }
                        }
                        return [4 /*yield*/, this.client.post('/chat', {
                                model: modelId,
                                message: params.prompt,
                                chat_history: messages,
                                temperature: params.temperature || 0.7,
                                max_tokens: params.maxTokens || 1024,
                                preamble: params.systemPrompt || undefined
                            })];
                    case 2:
                        response = _f.sent();
                        content = response.data.text || '';
                        return [2 /*return*/, {
                                content: content,
                                finishReason: response.data.finish_reason || 'stop',
                                usage: {
                                    promptTokens: ((_b = response.data.meta) === null || _b === void 0 ? void 0 : _b.prompt_tokens) || 0,
                                    completionTokens: ((_c = response.data.meta) === null || _c === void 0 ? void 0 : _c.response_tokens) || 0,
                                    totalTokens: (((_d = response.data.meta) === null || _d === void 0 ? void 0 : _d.prompt_tokens) || 0) + (((_e = response.data.meta) === null || _e === void 0 ? void 0 : _e.response_tokens) || 0)
                                }
                            }];
                    case 3:
                        error_1 = _f.sent();
                        logger_1.logger.error('Error generating text with Cohere:', error_1);
                        return [2 /*return*/, {
                                content: '',
                                error: "Cohere generation error: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error')
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List available models from Cohere
     */
    CohereProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var models;
            return __generator(this, function (_a) {
                if (!this.client) {
                    logger_1.logger.warn("Cannot fetch Cohere models, client not configured.");
                    return [2 /*return*/, []];
                }
                models = [
                    {
                        id: 'command',
                        name: 'Command',
                        description: 'Cohere Command model - general purpose',
                        contextWindow: 4096
                    },
                    {
                        id: 'command-light',
                        name: 'Command Light',
                        description: 'Cohere Command Light model - faster, more efficient',
                        contextWindow: 4096
                    },
                    {
                        id: 'command-r',
                        name: 'Command-R',
                        description: 'Cohere Command-R model - latest generation',
                        contextWindow: 128000
                    },
                    {
                        id: 'command-r-plus',
                        name: 'Command-R Plus',
                        description: 'Cohere Command-R Plus model - enhanced capabilities',
                        contextWindow: 128000
                    }
                ];
                logger_1.logger.info("Provider cohere has ".concat(models.length, " models available"));
                return [2 /*return*/, models];
            });
        });
    };
    /**
     * Test connection to Cohere
     */
    CohereProvider.prototype.testConnection = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var model, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Cohere client not initialized. Please check your API key.'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        model = modelId || this.config.defaultModel || this.defaultModel;
                        return [4 /*yield*/, this.client.post('/chat', {
                                model: model,
                                message: 'Hello',
                                max_tokens: 5
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: "Successfully connected to Cohere API and tested model ".concat(model, ".")
                            }];
                    case 3:
                        error_2 = _a.sent();
                        logger_1.logger.error('Cohere connection test failed:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                message: "Failed to connect to Cohere API: ".concat(error_2 instanceof Error ? error_2.message : 'Unknown error')
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update the provider configuration
     */
    CohereProvider.prototype.updateConfig = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.updateConfig.call(this, config)];
                    case 1:
                        _a.sent();
                        this.initializeClient();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the configuration fields for this provider
     */
    CohereProvider.prototype.getConfigurationFields = function () {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Cohere API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., command, command-r)',
                required: false,
                type: 'string'
            }
        ];
    };
    return CohereProvider;
}(baseLLMProvider_1.BaseLLMProvider));
exports.CohereProvider = CohereProvider;
