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
exports.HuggingFaceProvider = void 0;
var baseLLMProvider_1 = require("./baseLLMProvider");
var logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
var axios = require('axios');
/**
 * Provider for HuggingFace Inference API
 */
var HuggingFaceProvider = /** @class */ (function (_super) {
    __extends(HuggingFaceProvider, _super);
    function HuggingFaceProvider(context) {
        var _this = _super.call(this, context) || this;
        _this.providerId = 'huggingface';
        _this.displayName = 'HuggingFace';
        _this.description = 'Access HuggingFace models through the Inference API';
        _this.website = 'https://huggingface.co/inference-api';
        _this.requiresApiKey = true;
        _this.supportsEndpointConfiguration = false;
        _this.defaultEndpoint = 'https://api-inference.huggingface.co/models';
        _this.defaultModel = 'mistralai/Mistral-7B-Instruct-v0.2';
        _this.client = null;
        _this.baseUrl = _this.defaultEndpoint;
        _this.initializeClient();
        return _this;
    }
    /**
     * Initialize the Axios client for API requests
     */
    HuggingFaceProvider.prototype.initializeClient = function () {
        try {
            if (!this.config.apiKey) {
                logger_1.logger.warn('HuggingFace API key not configured');
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
            logger_1.logger.info('HuggingFace client initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize HuggingFace client:', error);
            this.client = null;
        }
    };
    /**
     * Check if the provider is configured
     */
    HuggingFaceProvider.prototype.isConfigured = function () {
        return !!this.client && !!this.config.apiKey;
    };
    /**
     * Generate text using HuggingFace
     */
    HuggingFaceProvider.prototype.generate = function (params, cancellationToken, tools) {
        return __awaiter(this, void 0, void 0, function () {
            var modelId, fullPrompt, _i, _a, message, response, content, error_1;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, { content: '', error: 'HuggingFace client not initialized' }];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        modelId = params.modelId || this.config.defaultModel || this.defaultModel;
                        fullPrompt = '';
                        // Add system prompt if provided
                        if (params.systemPrompt) {
                            fullPrompt += "<|system|>\n".concat(params.systemPrompt, "\n");
                        }
                        // Add history messages if provided
                        if (params.history && params.history.length > 0) {
                            for (_i = 0, _a = params.history; _i < _a.length; _i++) {
                                message = _a[_i];
                                if (message.role === 'user') {
                                    fullPrompt += "<|user|>\n".concat(message.content, "\n");
                                }
                                else if (message.role === 'assistant') {
                                    fullPrompt += "<|assistant|>\n".concat(message.content, "\n");
                                }
                                else if (message.role === 'system') {
                                    fullPrompt += "<|system|>\n".concat(message.content, "\n");
                                }
                            }
                        }
                        // Add the current prompt
                        fullPrompt += "<|user|>\n".concat(params.prompt, "\n<|assistant|>\n");
                        return [4 /*yield*/, this.client.post("/".concat(modelId), {
                                inputs: fullPrompt,
                                parameters: {
                                    temperature: params.temperature || 0.7,
                                    max_new_tokens: params.maxTokens || 1024,
                                    return_full_text: false
                                }
                            })];
                    case 2:
                        response = _c.sent();
                        content = ((_b = response.data[0]) === null || _b === void 0 ? void 0 : _b.generated_text) || '';
                        return [2 /*return*/, {
                                content: content,
                                finishReason: 'stop',
                                usage: {
                                    promptTokens: 0, // HuggingFace doesn't provide token usage
                                    completionTokens: 0,
                                    totalTokens: 0
                                }
                            }];
                    case 3:
                        error_1 = _c.sent();
                        logger_1.logger.error('Error generating text with HuggingFace:', error_1);
                        return [2 /*return*/, {
                                content: '',
                                error: "HuggingFace generation error: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error')
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List available models from HuggingFace
     */
    HuggingFaceProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var popularModels;
            return __generator(this, function (_a) {
                if (!this.client) {
                    logger_1.logger.warn("Cannot fetch HuggingFace models, client not configured.");
                    return [2 /*return*/, []];
                }
                popularModels = [
                    {
                        id: 'mistralai/Mistral-7B-Instruct-v0.2',
                        name: 'Mistral 7B Instruct',
                        description: 'Mistral 7B Instruct model',
                        contextWindow: 8192
                    },
                    {
                        id: 'meta-llama/Llama-2-7b-chat-hf',
                        name: 'Llama 2 7B Chat',
                        description: 'Meta Llama 2 7B Chat model',
                        contextWindow: 4096
                    },
                    {
                        id: 'meta-llama/Llama-2-13b-chat-hf',
                        name: 'Llama 2 13B Chat',
                        description: 'Meta Llama 2 13B Chat model',
                        contextWindow: 4096
                    },
                    {
                        id: 'tiiuae/falcon-7b-instruct',
                        name: 'Falcon 7B Instruct',
                        description: 'Falcon 7B Instruct model',
                        contextWindow: 2048
                    },
                    {
                        id: 'microsoft/phi-2',
                        name: 'Phi-2',
                        description: 'Microsoft Phi-2 model',
                        contextWindow: 2048
                    },
                    {
                        id: 'google/gemma-7b-it',
                        name: 'Gemma 7B Instruct',
                        description: 'Google Gemma 7B Instruct model',
                        contextWindow: 8192
                    }
                ];
                logger_1.logger.info("Provider huggingface has ".concat(popularModels.length, " models available"));
                return [2 /*return*/, popularModels];
            });
        });
    };
    /**
     * Test connection to HuggingFace
     */
    HuggingFaceProvider.prototype.testConnection = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var model, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'HuggingFace client not initialized. Please check your API key.'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        model = modelId || this.config.defaultModel || this.defaultModel;
                        return [4 /*yield*/, this.client.post("/".concat(model), {
                                inputs: 'Hello',
                                parameters: {
                                    max_new_tokens: 5,
                                    return_full_text: false
                                }
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: "Successfully connected to HuggingFace API and tested model ".concat(model, ".")
                            }];
                    case 3:
                        error_2 = _a.sent();
                        logger_1.logger.error('HuggingFace connection test failed:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                message: "Failed to connect to HuggingFace API: ".concat(error_2 instanceof Error ? error_2.message : 'Unknown error')
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update the provider configuration
     */
    HuggingFaceProvider.prototype.updateConfig = function (config) {
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
    HuggingFaceProvider.prototype.getConfigurationFields = function () {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your HuggingFace API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., mistralai/Mistral-7B-Instruct-v0.2)',
                required: false,
                type: 'string'
            }
        ];
    };
    return HuggingFaceProvider;
}(baseLLMProvider_1.BaseLLMProvider));
exports.HuggingFaceProvider = HuggingFaceProvider;
