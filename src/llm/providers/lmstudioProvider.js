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
exports.LMStudioProvider = void 0;
var vscode = require("vscode");
// Use require for axios to avoid TypeScript issues
var axios = require('axios');
var baseLLMProvider_1 = require("./baseLLMProvider");
var logger_1 = require("../../logger");
var notifications_1 = require("../../ui/notifications");
/**
 * Provider for LM Studio local LLM server
 */
var LMStudioProvider = /** @class */ (function (_super) {
    __extends(LMStudioProvider, _super);
    function LMStudioProvider(context) {
        var _this = _super.call(this, context) || this;
        _this.providerId = 'lmstudio';
        _this.displayName = 'LM Studio';
        _this.description = 'Run large language models locally with LM Studio';
        _this.website = 'https://lmstudio.ai';
        _this.requiresApiKey = false;
        _this.supportsEndpointConfiguration = true;
        _this.defaultEndpoint = 'http://localhost:1234/v1';
        _this.defaultModel = 'local-model';
        _this.client = null;
        _this.baseUrl = _this.config.apiEndpoint || _this.defaultEndpoint;
        _this.initializeClient();
        return _this;
    }
    /**
     * Initialize the Axios client for API requests
     */
    LMStudioProvider.prototype.initializeClient = function () {
        try {
            this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
            // Just store the base URL and use it directly in API calls
            this.client = {}; // Dummy instance, we'll use axios directly
            logger_1.logger.info("LM Studio client initialized for base URL: ".concat(this.baseUrl));
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize LM Studio client:', error);
            this.client = null;
        }
    };
    /**
     * Check if the provider is configured
     */
    LMStudioProvider.prototype.isConfigured = function () {
        return !!this.baseUrl;
    };
    /**
     * Generate text using LM Studio
     */
    LMStudioProvider.prototype.generate = function (params, _cancellationToken, _tools) {
        return __awaiter(this, void 0, void 0, function () {
            var modelId_1, messages_1, response, content, error_1, errorMessage;
            var _this = this;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.baseUrl) {
                            return [2 /*return*/, { content: '', error: 'LM Studio client not initialized' }];
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        modelId_1 = params.modelId || this.config.defaultModel || this.defaultModel;
                        messages_1 = [];
                        if (params.systemPrompt) {
                            messages_1.push({
                                role: 'system',
                                content: params.systemPrompt
                            });
                        }
                        // Add history messages if provided
                        if (params.history && params.history.length > 0) {
                            messages_1.push.apply(messages_1, params.history);
                        }
                        else {
                            messages_1.push({
                                role: 'user',
                                content: params.prompt
                            });
                        }
                        return [4 /*yield*/, this.withRetry(function () { return __awaiter(_this, void 0, void 0, function () {
                                var error_2, axiosError;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, axios.post("".concat(this.baseUrl, "/chat/completions"), {
                                                    model: modelId_1,
                                                    messages: messages_1,
                                                    temperature: params.temperature || 0.7,
                                                    max_tokens: params.maxTokens || 1024,
                                                    stop: params.stopSequences || []
                                                }, { timeout: 30000 })];
                                        case 1: return [2 /*return*/, _a.sent()]; // 30 second timeout for generation
                                        case 2:
                                            error_2 = _a.sent();
                                            axiosError = error_2;
                                            if (axiosError.code === 'ECONNREFUSED') {
                                                logger_1.logger.error("Connection refused to LM Studio at ".concat(this.baseUrl, ". Is LM Studio running?"));
                                                throw new Error("Connection refused to LM Studio. Please make sure LM Studio is running.");
                                            }
                                            else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ESOCKETTIMEDOUT') {
                                                logger_1.logger.error("Connection to LM Studio at ".concat(this.baseUrl, " timed out."));
                                                throw new Error("Connection to LM Studio timed out. Please check if LM Studio is running.");
                                            }
                                            throw error_2; // Re-throw for retry mechanism
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }, 1, // Only retry once for generation to avoid long waits
                            1000 // Start with 1000ms delay
                            )];
                    case 2:
                        response = _d.sent();
                        content = ((_b = (_a = response.data.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '';
                        return [2 /*return*/, {
                                content: content,
                                finishReason: ((_c = response.data.choices[0]) === null || _c === void 0 ? void 0 : _c.finish_reason) || 'stop',
                                usage: response.data.usage || {
                                    promptTokens: 0,
                                    completionTokens: 0,
                                    totalTokens: 0
                                }
                            }];
                    case 3:
                        error_1 = _d.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                        logger_1.logger.error("Error generating text with LM Studio: ".concat(errorMessage));
                        // Show a notification to the user with instructions
                        (0, notifications_1.showErrorMessage)("Failed to generate text with LM Studio: ".concat(errorMessage), 'Check LM Studio', 'Open Settings').then(function (selection) {
                            if (selection === 'Check LM Studio') {
                                vscode.env.openExternal(vscode.Uri.parse('https://lmstudio.ai/'));
                            }
                            else if (selection === 'Open Settings') {
                                vscode.commands.executeCommand('codessa.openProviderSettings');
                            }
                        });
                        return [2 /*return*/, {
                                content: '',
                                error: "LM Studio generation error: ".concat(errorMessage, ". Please ensure LM Studio is running with the API server enabled.")
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stream generate text using LM Studio
     */
    LMStudioProvider.prototype.streamGenerate = function (params, cancellationToken) {
        return __asyncGenerator(this, arguments, function streamGenerate_1() {
            var modelId_2, messages_2, response, stream, _a, stream_1, stream_1_1, chunk, lines, _i, lines_1, line, jsonData, data, error_3, e_1_1, error_4, errorMessage;
            var _this = this;
            var _b, e_1, _c, _d;
            var _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!this.baseUrl) {
                            throw new Error('LM Studio client not initialized');
                        }
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 22, , 23]);
                        modelId_2 = params.modelId || this.config.defaultModel || this.defaultModel;
                        messages_2 = [];
                        // Add system message if provided
                        if (params.systemPrompt) {
                            messages_2.push({
                                role: 'system',
                                content: params.systemPrompt
                            });
                        }
                        // Add history messages if provided
                        if (params.history && params.history.length > 0) {
                            messages_2.push.apply(messages_2, params.history);
                        }
                        // Add the current prompt
                        messages_2.push({
                            role: 'user',
                            content: params.prompt
                        });
                        return [4 /*yield*/, __await(this.withRetry(function () { return __awaiter(_this, void 0, void 0, function () {
                                var error_5, axiosError;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, axios.post("".concat(this.baseUrl, "/chat/completions"), {
                                                    model: modelId_2,
                                                    messages: messages_2,
                                                    temperature: params.temperature || 0.7,
                                                    max_tokens: params.maxTokens || 1024,
                                                    stop: params.stopSequences || [],
                                                    stream: true
                                                }, {
                                                    responseType: 'stream',
                                                    timeout: 30000 // 30 second timeout for generation
                                                })];
                                        case 1: return [2 /*return*/, _a.sent()];
                                        case 2:
                                            error_5 = _a.sent();
                                            axiosError = error_5;
                                            if (axiosError.code === 'ECONNREFUSED') {
                                                logger_1.logger.error("Connection refused to LM Studio at ".concat(this.baseUrl, ". Is LM Studio running?"));
                                                throw new Error("Connection refused to LM Studio. Please make sure LM Studio is running.");
                                            }
                                            else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ESOCKETTIMEDOUT') {
                                                logger_1.logger.error("Connection to LM Studio at ".concat(this.baseUrl, " timed out."));
                                                throw new Error("Connection to LM Studio timed out. Please check if LM Studio is running.");
                                            }
                                            throw error_5; // Re-throw for retry mechanism
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }, 1, // Only retry once for streaming to avoid long waits
                            1000 // Start with 1000ms delay
                            ))];
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
                        error_3 = _g.sent();
                        logger_1.logger.error('Error parsing LM Studio stream chunk:', error_3);
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
                        error_4 = _g.sent();
                        errorMessage = error_4 instanceof Error ? error_4.message : 'Unknown error';
                        logger_1.logger.error("Error streaming text with LM Studio: ".concat(errorMessage));
                        // Show a notification to the user with instructions
                        (0, notifications_1.showErrorMessage)("Failed to stream text from LM Studio: ".concat(errorMessage), 'Check LM Studio', 'Open Settings').then(function (selection) {
                            if (selection === 'Check LM Studio') {
                                vscode.env.openExternal(vscode.Uri.parse('https://lmstudio.ai/'));
                            }
                            else if (selection === 'Open Settings') {
                                vscode.commands.executeCommand('codessa.openProviderSettings');
                            }
                        });
                        throw new Error("LM Studio streaming error: ".concat(errorMessage, ". Please ensure LM Studio is running with the API server enabled."));
                    case 23: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Helper function to retry an operation with exponential backoff
     * @param operation The operation to retry
     * @param maxRetries Maximum number of retries
     * @param initialDelay Initial delay in milliseconds
     * @returns The result of the operation
     */
    LMStudioProvider.prototype.withRetry = function (operation_1) {
        return __awaiter(this, arguments, void 0, function (operation, maxRetries, initialDelay) {
            var lastError, delay, attempt, error_6;
            if (maxRetries === void 0) { maxRetries = 2; }
            if (initialDelay === void 0) { initialDelay = 500; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        delay = initialDelay;
                        attempt = 0;
                        _a.label = 1;
                    case 1:
                        if (!(attempt <= maxRetries)) return [3 /*break*/, 8];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 7]);
                        return [4 /*yield*/, operation()];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        error_6 = _a.sent();
                        lastError = error_6;
                        if (!(attempt < maxRetries)) return [3 /*break*/, 6];
                        logger_1.logger.debug("Retry attempt ".concat(attempt + 1, "/").concat(maxRetries, " after ").concat(delay, "ms"));
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay); })];
                    case 5:
                        _a.sent();
                        delay *= 2; // Exponential backoff
                        _a.label = 6;
                    case 6: return [3 /*break*/, 7];
                    case 7:
                        attempt++;
                        return [3 /*break*/, 1];
                    case 8: throw lastError;
                }
            });
        });
    };
    /**
     * List available models from LM Studio
     */
    LMStudioProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, models, error_7, errorMessage;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.baseUrl) {
                            logger_1.logger.warn("Cannot fetch LM Studio models, client not configured.");
                            return [2 /*return*/, []];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        logger_1.logger.debug("Fetching LM Studio models list from ".concat(this.baseUrl, "/models"));
                        return [4 /*yield*/, this.withRetry(function () { return __awaiter(_this, void 0, void 0, function () {
                                var error_8, axiosError;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, axios.get("".concat(this.baseUrl, "/models"), { timeout: 5000 })];
                                        case 1: return [2 /*return*/, _a.sent()];
                                        case 2:
                                            error_8 = _a.sent();
                                            axiosError = error_8;
                                            if (axiosError.code === 'ECONNREFUSED') {
                                                logger_1.logger.error("Connection refused to LM Studio at ".concat(this.baseUrl, ". Is LM Studio running?"));
                                                throw new Error("Connection refused to LM Studio. Please make sure LM Studio is running at ".concat(this.baseUrl, "."));
                                            }
                                            else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ESOCKETTIMEDOUT') {
                                                logger_1.logger.error("Connection to LM Studio at ".concat(this.baseUrl, " timed out."));
                                                throw new Error("Connection to LM Studio timed out. Please check if LM Studio is running at ".concat(this.baseUrl, "."));
                                            }
                                            throw error_8; // Re-throw for retry mechanism
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); })];
                    case 2:
                        response = _b.sent();
                        models = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.data) || [];
                        logger_1.logger.info("Provider lmstudio has ".concat(models.length, " models available"));
                        return [2 /*return*/, models.map(function (m) { return ({
                                id: m.id,
                                name: m.id,
                                description: m.description || 'Local LM Studio model',
                                contextWindow: m.context_length || 4096
                            }); }).sort(function (a, b) { return a.id.localeCompare(b.id); })];
                    case 3:
                        error_7 = _b.sent();
                        errorMessage = error_7 instanceof Error ? error_7.message : 'Unknown error';
                        logger_1.logger.error("Failed to fetch LM Studio models: ".concat(errorMessage));
                        // Show a notification to the user with instructions
                        (0, notifications_1.showErrorMessage)("Failed to connect to LM Studio: ".concat(errorMessage), 'Open Settings').then(function (selection) {
                            if (selection === 'Open Settings') {
                                vscode.commands.executeCommand('codessa.openProviderSettings');
                            }
                        });
                        // LM Studio might not support the /models endpoint, so return a default model
                        return [2 /*return*/, [{
                                    id: 'local-model',
                                    name: 'Local Model',
                                    description: 'The model currently loaded in LM Studio',
                                    contextWindow: 4096
                                }]];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Test connection to LM Studio
     */
    LMStudioProvider.prototype.testConnection = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_9, secondError_1, firstErrorMsg, secondErrorMsg, errorDetails;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.baseUrl) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'LM Studio client not initialized'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 8]);
                        // Check if we can connect to the LM Studio server with retry logic
                        return [4 /*yield*/, this.withRetry(function () { return __awaiter(_this, void 0, void 0, function () {
                                var error_10, axiosError;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, axios.get("".concat(this.baseUrl, "/models"), { timeout: 5000 })];
                                        case 1: return [2 /*return*/, _a.sent()];
                                        case 2:
                                            error_10 = _a.sent();
                                            axiosError = error_10;
                                            if (axiosError.code === 'ECONNREFUSED') {
                                                throw new Error("Connection refused. Please make sure LM Studio is running at ".concat(this.baseUrl, "."));
                                            }
                                            else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ESOCKETTIMEDOUT') {
                                                throw new Error("Connection timed out. Please check if LM Studio is running at ".concat(this.baseUrl, "."));
                                            }
                                            throw error_10; // Re-throw for retry mechanism
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); }, 1, // Only retry once for test connection
                            500 // Start with 500ms delay
                            )];
                    case 2:
                        // Check if we can connect to the LM Studio server with retry logic
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: "Successfully connected to LM Studio server at ".concat(this.baseUrl, ".")
                            }];
                    case 3:
                        error_9 = _a.sent();
                        logger_1.logger.debug('LM Studio /models endpoint test failed, trying chat completion as fallback');
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this.withRetry(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, axios.post("".concat(this.baseUrl, "/chat/completions"), {
                                                model: modelId,
                                                messages: [{ role: 'user', content: 'Hello' }],
                                                max_tokens: 5
                                            }, { timeout: 5000 })];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); }, 1, // Only retry once for test connection
                            500 // Start with 500ms delay
                            )];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: "Successfully connected to LM Studio server at ".concat(this.baseUrl, " using chat completions.")
                            }];
                    case 6:
                        secondError_1 = _a.sent();
                        firstErrorMsg = error_9 instanceof Error ? error_9.message : 'Unknown error';
                        secondErrorMsg = secondError_1 instanceof Error ? secondError_1.message : 'Unknown error';
                        errorDetails = "Failed to connect to LM Studio server at ".concat(this.baseUrl, ":\n") +
                            "- Models endpoint error: ".concat(firstErrorMsg, "\n") +
                            "- Chat completions endpoint error: ".concat(secondErrorMsg);
                        logger_1.logger.error('LM Studio connection test failed:', errorDetails);
                        // Show a notification with instructions
                        (0, notifications_1.showErrorMessage)("Failed to connect to LM Studio. Is it running?", 'Check LM Studio', 'Open Settings').then(function (selection) {
                            if (selection === 'Check LM Studio') {
                                vscode.env.openExternal(vscode.Uri.parse('https://lmstudio.ai/'));
                            }
                            else if (selection === 'Open Settings') {
                                vscode.commands.executeCommand('codessa.openProviderSettings');
                            }
                        });
                        return [2 /*return*/, {
                                success: false,
                                message: "Failed to connect to LM Studio server. Please ensure LM Studio is running at ".concat(this.baseUrl, " with the API server enabled.")
                            }];
                    case 7: return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update the provider configuration
     */
    LMStudioProvider.prototype.updateConfig = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.updateConfig.call(this, config)];
                    case 1:
                        _a.sent();
                        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
                        this.initializeClient();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the configuration fields for this provider
     */
    LMStudioProvider.prototype.getConfigurationFields = function () {
        return [
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The URL of your LM Studio server (default: http://localhost:1234/v1)',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (usually "local-model")',
                required: false,
                type: 'string'
            }
        ];
    };
    return LMStudioProvider;
}(baseLLMProvider_1.BaseLLMProvider));
exports.LMStudioProvider = LMStudioProvider;
