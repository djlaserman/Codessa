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
exports.DeepSeekProvider = void 0;
var baseLLMProvider_1 = require("./baseLLMProvider");
var logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
var axios = require('axios');
/**
 * Provider for DeepSeek API
 */
var DeepSeekProvider = /** @class */ (function (_super) {
    __extends(DeepSeekProvider, _super);
    function DeepSeekProvider(context) {
        var _this = _super.call(this, context) || this;
        _this.providerId = 'deepseek';
        _this.displayName = 'DeepSeek';
        _this.description = 'Access DeepSeek AI models';
        _this.website = 'https://deepseek.ai';
        _this.requiresApiKey = true;
        _this.supportsEndpointConfiguration = false;
        _this.defaultEndpoint = 'https://api.deepseek.com/v1';
        _this.defaultModel = 'deepseek-chat';
        _this.client = null;
        _this.baseUrl = _this.defaultEndpoint;
        _this.initializeClient();
        return _this;
    }
    /**
     * Initialize the Axios client for API requests
     */
    DeepSeekProvider.prototype.initializeClient = function () {
        try {
            if (!this.config.apiKey) {
                logger_1.logger.warn('DeepSeek API key not configured');
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
            logger_1.logger.info('DeepSeek client initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize DeepSeek client:', error);
            this.client = null;
        }
    };
    /**
     * Check if the provider is configured
     */
    DeepSeekProvider.prototype.isConfigured = function () {
        return !!this.client && !!this.config.apiKey;
    };
    /**
     * Generate text using DeepSeek
     */
    DeepSeekProvider.prototype.generate = function (params, _cancellationToken, tools) {
        return __awaiter(this, void 0, void 0, function () {
            var modelId, messages, functions, toolChoice, response, content, toolCallRequest, functionCall, error_1;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, { content: '', error: 'DeepSeek client not initialized' }];
                        }
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 3, , 4]);
                        modelId = params.modelId || this.config.defaultModel || this.defaultModel;
                        messages = [];
                        if (params.history && params.history.length > 0) {
                            messages.push.apply(messages, params.history);
                        }
                        else {
                            if (params.systemPrompt) {
                                messages.push({
                                    role: 'system',
                                    content: params.systemPrompt
                                });
                            }
                            messages.push({
                                role: 'user',
                                content: params.prompt
                            });
                        }
                        functions = undefined;
                        if (tools && tools.size > 0) {
                            functions = Array.from(tools.values()).map(function (tool) { return ({
                                name: tool.id,
                                description: tool.description,
                                parameters: tool.inputSchema || { type: 'object', properties: {} }
                            }); });
                        }
                        toolChoice = undefined;
                        if (functions && functions.length > 0) {
                            toolChoice = "auto";
                        }
                        return [4 /*yield*/, this.client.post('/v1/chat/completions', {
                                model: modelId,
                                messages: messages,
                                temperature: (_a = params.temperature) !== null && _a !== void 0 ? _a : 0.7,
                                max_tokens: params.maxTokens,
                                functions: functions,
                                function_call: toolChoice
                            })];
                    case 2:
                        response = _g.sent();
                        content = ((_c = (_b = response.data.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '';
                        toolCallRequest = undefined;
                        if ((_e = (_d = response.data.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.function_call) {
                            functionCall = response.data.choices[0].message.function_call;
                            toolCallRequest = {
                                name: functionCall.name,
                                arguments: JSON.parse(functionCall.arguments)
                            };
                        }
                        return [2 /*return*/, {
                                content: content,
                                finishReason: ((_f = response.data.choices[0]) === null || _f === void 0 ? void 0 : _f.finish_reason) || 'stop',
                                usage: response.data.usage || {
                                    promptTokens: 0,
                                    completionTokens: 0,
                                    totalTokens: 0
                                },
                                toolCallRequest: toolCallRequest
                            }];
                    case 3:
                        error_1 = _g.sent();
                        logger_1.logger.error('Error generating text with DeepSeek:', error_1);
                        return [2 /*return*/, {
                                content: '',
                                error: "DeepSeek generation error: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error')
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List available models from DeepSeek
     */
    DeepSeekProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, models, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.client) {
                            logger_1.logger.warn("Cannot fetch DeepSeek models, client not configured.");
                            return [2 /*return*/, []];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        logger_1.logger.debug('Fetching DeepSeek models list');
                        return [4 /*yield*/, this.client.get('/models')];
                    case 2:
                        response = _b.sent();
                        models = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        logger_1.logger.info("Provider deepseek has ".concat(models.length, " models available"));
                        return [2 /*return*/, models.map(function (m) { return ({
                                id: m.id,
                                name: m.name || m.id,
                                description: m.description || '',
                                contextWindow: m.context_length || 8192,
                                maxOutputTokens: m.max_output_tokens,
                                supportsFunctions: m.supports_functions || false,
                                supportsVision: m.supports_vision || false
                            }); }).sort(function (a, b) { return a.id.localeCompare(b.id); })];
                    case 3:
                        error_2 = _b.sent();
                        logger_1.logger.error("Failed to fetch DeepSeek models:", error_2);
                        // Return some default models
                        return [2 /*return*/, [
                                {
                                    id: 'deepseek-chat',
                                    name: 'DeepSeek Chat',
                                    description: 'DeepSeek Chat model',
                                    contextWindow: 8192
                                },
                                {
                                    id: 'deepseek-coder',
                                    name: 'DeepSeek Coder',
                                    description: 'DeepSeek Coder model optimized for programming tasks',
                                    contextWindow: 16384
                                }
                            ]];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Test connection to DeepSeek
     */
    DeepSeekProvider.prototype.testConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'DeepSeek client not initialized. Please check your API key.'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        // Try a simple models request
                        return [4 /*yield*/, this.client.get('/models')];
                    case 2:
                        // Try a simple models request
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: 'Successfully connected to DeepSeek API.'
                            }];
                    case 3:
                        error_3 = _a.sent();
                        logger_1.logger.error('DeepSeek connection test failed:', error_3);
                        return [2 /*return*/, {
                                success: false,
                                message: "Failed to connect to DeepSeek API: ".concat(error_3 instanceof Error ? error_3.message : 'Unknown error')
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update the provider configuration
     */
    DeepSeekProvider.prototype.updateConfig = function (config) {
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
    DeepSeekProvider.prototype.getConfigurationFields = function () {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your DeepSeek API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., deepseek-chat, deepseek-coder)',
                required: false,
                type: 'string'
            }
        ];
    };
    return DeepSeekProvider;
}(baseLLMProvider_1.BaseLLMProvider));
exports.DeepSeekProvider = DeepSeekProvider;
