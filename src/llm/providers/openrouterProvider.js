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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterProvider = void 0;
var baseLLMProvider_1 = require("./baseLLMProvider");
var logger_1 = require("../../logger");
// Use require for axios to avoid TypeScript issues
var axios = require('axios');
/**
 * Provider for OpenRouter API
 */
var OpenRouterProvider = /** @class */ (function (_super) {
    __extends(OpenRouterProvider, _super);
    function OpenRouterProvider(context) {
        var _this = _super.call(this, context) || this;
        _this.providerId = 'openrouter';
        _this.displayName = 'OpenRouter';
        _this.description = 'Access multiple AI models through a unified API';
        _this.website = 'https://openrouter.ai';
        _this.requiresApiKey = true;
        _this.supportsEndpointConfiguration = false;
        _this.defaultEndpoint = 'https://openrouter.ai/api/v1';
        _this.defaultModel = 'openai/gpt-3.5-turbo';
        _this.client = null;
        _this.baseUrl = _this.defaultEndpoint;
        _this.initializeClient();
        return _this;
    }
    /**
     * Initialize the Axios client for API requests
     */
    OpenRouterProvider.prototype.initializeClient = function () {
        try {
            if (!this.config.apiKey) {
                logger_1.logger.warn('OpenRouter API key not configured');
                this.client = null;
                return;
            }
            this.client = axios.create({
                baseURL: this.baseUrl,
                headers: {
                    'Authorization': "Bearer ".concat(this.config.apiKey),
                    'HTTP-Referer': 'https://github.com/djlaserman/Codessa', // Required by OpenRouter
                    'X-Title': 'Codessa VS Code Extension' // Required by OpenRouter
                }
            });
            logger_1.logger.info('OpenRouter client initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize OpenRouter client:', error);
            this.client = null;
        }
    };
    /**
     * Check if the provider is configured
     */
    OpenRouterProvider.prototype.isConfigured = function () {
        return !!this.client && !!this.config.apiKey;
    };
    /**
     * Generate text using OpenRouter
     */
    OpenRouterProvider.prototype.generate = function (params, cancellationToken, tools) {
        return __awaiter(this, void 0, void 0, function () {
            var modelId, messages, functions, tool_choice, abortController_1, response, content, toolCallRequest, functionCall, error_1;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, { content: '', error: 'OpenRouter client not initialized' }];
                        }
                        // Check for cancellation before starting
                        if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                            return [2 /*return*/, { content: '', error: 'Request cancelled', finishReason: 'cancelled' }];
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
                        functions = tools && tools.size > 0 ? Array.from(tools.values()).map(function (tool) { return ({
                            name: tool.id,
                            description: tool.description,
                            parameters: tool.inputSchema || { type: 'object', properties: {} }
                        }); }) : undefined;
                        tool_choice = functions ? "auto" : undefined;
                        if (cancellationToken) {
                            // Use the global AbortController if available, or provide a simple fallback
                            if (typeof AbortController !== 'undefined') {
                                abortController_1 = new AbortController();
                                cancellationToken.onCancellationRequested(function () {
                                    logger_1.logger.info("OpenRouter request cancelled by user");
                                    abortController_1 === null || abortController_1 === void 0 ? void 0 : abortController_1.abort();
                                });
                            }
                            else {
                                logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                            }
                        }
                        return [4 /*yield*/, this.client.post('/v1/chat/completions', {
                                model: modelId,
                                messages: messages,
                                temperature: (_a = params.temperature) !== null && _a !== void 0 ? _a : 0.7,
                                max_tokens: params.maxTokens,
                                functions: functions,
                                tool_choice: tool_choice
                            }, {
                                signal: abortController_1 === null || abortController_1 === void 0 ? void 0 : abortController_1.signal
                            })];
                    case 2:
                        response = _g.sent();
                        // Check if the request was cancelled during the API call
                        if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                            return [2 /*return*/, { content: '', error: 'Request cancelled', finishReason: 'cancelled' }];
                        }
                        content = ((_c = (_b = response.data.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '';
                        toolCallRequest = void 0;
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
                        logger_1.logger.error('Error generating text with OpenRouter:', error_1);
                        return [2 /*return*/, {
                                content: '',
                                error: "OpenRouter generation error: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error')
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stream generate text using OpenRouter
     */
    OpenRouterProvider.prototype.streamGenerate = function (params, cancellationToken) {
        return __asyncGenerator(this, arguments, function streamGenerate_1() {
            var modelId, messages, response, stream, _a, stream_1, stream_1_1, chunk, lines, _i, lines_1, line, jsonData, data, error_2, e_1_1, error_3;
            var _b, e_1, _c, _d;
            var _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!this.client) {
                            throw new Error('OpenRouter client not initialized');
                        }
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 22, , 23]);
                        modelId = params.modelId || this.config.defaultModel || this.defaultModel;
                        messages = [];
                        // Add system message if provided
                        if (params.systemPrompt) {
                            messages.push({
                                role: 'system',
                                content: params.systemPrompt
                            });
                        }
                        // Add history messages if provided
                        if (params.history && params.history.length > 0) {
                            messages.push.apply(messages, params.history);
                        }
                        // Add the current prompt
                        messages.push({
                            role: 'user',
                            content: params.prompt
                        });
                        return [4 /*yield*/, __await(this.client.post('/chat/completions', {
                                model: modelId,
                                messages: messages,
                                temperature: params.temperature || 0.7,
                                max_tokens: params.maxTokens || 1024,
                                stop: params.stopSequences || [],
                                stream: true
                            }, {
                                responseType: 'stream'
                            }))];
                    case 2:
                        response = _g.sent();
                        stream = response.data;
                        _g.label = 3;
                    case 3:
                        _g.trys.push([3, 15, 16, 21]);
                        _a = true, stream_1 = __asyncValues(stream);
                        _g.label = 4;
                    case 4: return [4 /*yield*/, __await(stream_1.next())];
                    case 5:
                        if (!(stream_1_1 = _g.sent(), _b = stream_1_1.done, !_b)) return [3 /*break*/, 14];
                        _d = stream_1_1.value;
                        _a = false;
                        chunk = _d;
                        if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                            return [3 /*break*/, 14];
                        }
                        _g.label = 6;
                    case 6:
                        _g.trys.push([6, 12, , 13]);
                        lines = chunk.toString().split('\n').filter(Boolean);
                        _i = 0, lines_1 = lines;
                        _g.label = 7;
                    case 7:
                        if (!(_i < lines_1.length)) return [3 /*break*/, 11];
                        line = lines_1[_i];
                        // Skip "data: [DONE]" messages
                        if (line === 'data: [DONE]') {
                            return [3 /*break*/, 10];
                        }
                        jsonData = line.replace(/^data: /, '');
                        data = JSON.parse(jsonData);
                        if (!(data.choices && ((_f = (_e = data.choices[0]) === null || _e === void 0 ? void 0 : _e.delta) === null || _f === void 0 ? void 0 : _f.content))) return [3 /*break*/, 10];
                        return [4 /*yield*/, __await(data.choices[0].delta.content)];
                    case 8: return [4 /*yield*/, _g.sent()];
                    case 9:
                        _g.sent();
                        _g.label = 10;
                    case 10:
                        _i++;
                        return [3 /*break*/, 7];
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        error_2 = _g.sent();
                        logger_1.logger.error('Error parsing OpenRouter stream chunk:', error_2);
                        return [3 /*break*/, 13];
                    case 13:
                        _a = true;
                        return [3 /*break*/, 4];
                    case 14: return [3 /*break*/, 21];
                    case 15:
                        e_1_1 = _g.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 21];
                    case 16:
                        _g.trys.push([16, , 19, 20]);
                        if (!(!_a && !_b && (_c = stream_1.return))) return [3 /*break*/, 18];
                        return [4 /*yield*/, __await(_c.call(stream_1))];
                    case 17:
                        _g.sent();
                        _g.label = 18;
                    case 18: return [3 /*break*/, 20];
                    case 19:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 20: return [7 /*endfinally*/];
                    case 21: return [3 /*break*/, 23];
                    case 22:
                        error_3 = _g.sent();
                        logger_1.logger.error('Error streaming text with OpenRouter:', error_3);
                        throw new Error("OpenRouter streaming error: ".concat(error_3 instanceof Error ? error_3.message : 'Unknown error'));
                    case 23: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List available models from OpenRouter
     */
    OpenRouterProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, models, error_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.client) {
                            logger_1.logger.warn("Cannot fetch OpenRouter models, client not configured.");
                            return [2 /*return*/, []];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        logger_1.logger.debug('Fetching OpenRouter models list');
                        return [4 /*yield*/, this.client.get('/models')];
                    case 2:
                        response = _b.sent();
                        models = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        logger_1.logger.info("Provider openrouter has ".concat(models.length, " models available"));
                        return [2 /*return*/, models.map(function (m) { return ({
                                id: m.id,
                                name: m.name || m.id,
                                description: m.description || '',
                                contextWindow: m.context_length || 4096,
                                maxOutputTokens: m.max_output_tokens,
                                supportsFunctions: m.supports_functions || false,
                                supportsVision: m.supports_vision || false
                            }); }).sort(function (a, b) { return a.id.localeCompare(b.id); })];
                    case 3:
                        error_4 = _b.sent();
                        logger_1.logger.error("Failed to fetch OpenRouter models:", error_4);
                        // Return some default models
                        return [2 /*return*/, [
                                {
                                    id: 'openai/gpt-3.5-turbo',
                                    name: 'GPT-3.5 Turbo',
                                    description: 'OpenAI GPT-3.5 Turbo via OpenRouter',
                                    contextWindow: 4096
                                },
                                {
                                    id: 'openai/gpt-4',
                                    name: 'GPT-4',
                                    description: 'OpenAI GPT-4 via OpenRouter',
                                    contextWindow: 8192
                                },
                                {
                                    id: 'anthropic/claude-2',
                                    name: 'Claude 2',
                                    description: 'Anthropic Claude 2 via OpenRouter',
                                    contextWindow: 100000
                                }
                            ]];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Test connection to OpenRouter
     */
    OpenRouterProvider.prototype.testConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'OpenRouter client not initialized. Please check your API key.'
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
                                message: 'Successfully connected to OpenRouter API.'
                            }];
                    case 3:
                        error_5 = _a.sent();
                        logger_1.logger.error('OpenRouter connection test failed:', error_5);
                        return [2 /*return*/, {
                                success: false,
                                message: "Failed to connect to OpenRouter API: ".concat(error_5 instanceof Error ? error_5.message : 'Unknown error')
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update the provider configuration
     */
    OpenRouterProvider.prototype.updateConfig = function (config) {
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
    OpenRouterProvider.prototype.getConfigurationFields = function () {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your OpenRouter API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., openai/gpt-3.5-turbo)',
                required: false,
                type: 'string'
            }
        ];
    };
    return OpenRouterProvider;
}(baseLLMProvider_1.BaseLLMProvider));
exports.OpenRouterProvider = OpenRouterProvider;
