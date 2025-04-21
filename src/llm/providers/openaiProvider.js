"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.OpenAIProvider = void 0;
var config_1 = require("../../config");
var logger_1 = require("../../logger");
var vscode = require("vscode");
// Reference our custom type definitions
/// <reference path="../../types/openai.d.ts" />
var openai_1 = require("openai");
var OpenAIProvider = /** @class */ (function () {
    function OpenAIProvider() {
        var _this = this;
        this.providerId = 'openai';
        this.displayName = 'OpenAI';
        this.description = 'OpenAI API for GPT models';
        this.website = 'https://openai.com';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = true;
        this.defaultEndpoint = 'https://api.openai.com/v1';
        this.defaultModel = 'gpt-4o';
        this.client = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(function (e) {
            if (e.affectsConfiguration('codessa.providers.openai')) {
                logger_1.logger.info("OpenAI configuration changed, re-initializing client.");
                _this.initializeClient();
            }
        });
    }
    OpenAIProvider.prototype.initializeClient = function () {
        var apiKey = (0, config_1.getOpenAIApiKey)();
        var baseUrl = (0, config_1.getOpenAIBaseUrl)();
        if (!apiKey) {
            logger_1.logger.warn('OpenAI API key not set.');
            this.client = null;
            return;
        }
        var config = { apiKey: apiKey };
        if (baseUrl) {
            config.baseURL = baseUrl;
        }
        try {
            this.client = new openai_1.default(config);
            logger_1.logger.info('OpenAI client initialized.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize OpenAI client:', error);
            this.client = null;
        }
    };
    OpenAIProvider.prototype.isConfigured = function () {
        return !!this.client;
    };
    /**
     * Formats tools for OpenAI function calling API
     */
    OpenAIProvider.prototype.formatToolsForOpenAI = function (tools) {
        if (!tools || tools.size === 0) {
            return undefined;
        }
        var formattedTools = [];
        tools.forEach(function (tool) {
            // Handle file tool with subactions
            if (tool.id === 'file' && typeof tool.getSubActions === 'function') {
                var subActions = tool.getSubActions();
                for (var _i = 0, subActions_1 = subActions; _i < subActions_1.length; _i++) {
                    var subAction = subActions_1[_i];
                    formattedTools.push({
                        type: 'function',
                        function: {
                            name: "".concat(tool.id, ".").concat(subAction.id),
                            description: subAction.description || "".concat(tool.id, ".").concat(subAction.id, " operation"),
                            parameters: subAction.inputSchema || { type: 'object', properties: {} }
                        }
                    });
                }
            }
            else {
                // Regular tool
                formattedTools.push({
                    type: 'function',
                    function: {
                        name: tool.id,
                        description: tool.description || "".concat(tool.id, " operation"),
                        parameters: tool.inputSchema || { type: 'object', properties: {} }
                    }
                });
            }
        });
        return formattedTools.length > 0 ? formattedTools : undefined;
    };
    OpenAIProvider.prototype.generate = function (params, cancellationToken, tools) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, formattedTools, request, abortController_1, response, choice, toolCallRequest, toolCall, error_1, errorMessage;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, { content: '', error: 'OpenAI provider not configured (API key missing?)' }];
                        }
                        _l.label = 1;
                    case 1:
                        _l.trys.push([1, 3, , 4]);
                        messages = void 0;
                        if (params.history && params.history.length > 0) {
                            messages = params.history;
                        }
                        else {
                            messages = [
                                params.systemPrompt ? { role: 'system', content: params.systemPrompt } : undefined,
                                { role: 'user', content: params.prompt }
                            ].filter(Boolean);
                        }
                        formattedTools = this.formatToolsForOpenAI(tools);
                        // Check for cancellation before calling API
                        if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                            return [2 /*return*/, { content: '', error: 'Request cancelled before sending' }];
                        }
                        request = __assign({ model: params.modelId, messages: messages, temperature: (_a = params.temperature) !== null && _a !== void 0 ? _a : 0.7, max_tokens: params.maxTokens, stop: params.stopSequences, tools: formattedTools, tool_choice: formattedTools ? 'auto' : undefined }, params.options);
                        logger_1.logger.debug("Sending request to OpenAI model ".concat(params.modelId));
                        if (cancellationToken) {
                            // Use the global AbortController if available, or provide a simple fallback
                            if (typeof AbortController !== 'undefined') {
                                abortController_1 = new AbortController();
                                cancellationToken.onCancellationRequested(function () {
                                    logger_1.logger.info("OpenAI request cancelled by user");
                                    abortController_1 === null || abortController_1 === void 0 ? void 0 : abortController_1.abort();
                                });
                            }
                            else {
                                logger_1.logger.warn("AbortController not available in this environment, cancellation may not work properly");
                            }
                        }
                        return [4 /*yield*/, this.client.chat.completions.create(__assign(__assign({}, request), { signal: abortController_1 === null || abortController_1 === void 0 ? void 0 : abortController_1.signal }))];
                    case 2:
                        response = _l.sent();
                        // Check for cancellation again after API call (in case it was cancelled but too late to abort)
                        if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                            return [2 /*return*/, { content: '', error: 'Request cancelled during processing' }];
                        }
                        choice = response.choices[0];
                        logger_1.logger.debug("OpenAI response received. Finish reason: ".concat(choice.finish_reason));
                        toolCallRequest = void 0;
                        if (((_b = choice.message) === null || _b === void 0 ? void 0 : _b.tool_calls) && choice.message.tool_calls.length > 0) {
                            toolCall = choice.message.tool_calls[0];
                            try {
                                toolCallRequest = {
                                    id: toolCall.id,
                                    name: toolCall.function.name,
                                    arguments: JSON.parse(toolCall.function.arguments || '{}')
                                };
                            }
                            catch (e) {
                                logger_1.logger.error("Failed to parse tool call arguments: ".concat(e));
                            }
                        }
                        // Return the response
                        return [2 /*return*/, {
                                content: (_e = (_d = (_c = choice.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) !== null && _e !== void 0 ? _e : '',
                                finishReason: (_f = choice.finish_reason) !== null && _f !== void 0 ? _f : undefined,
                                usage: {
                                    promptTokens: (_g = response.usage) === null || _g === void 0 ? void 0 : _g.prompt_tokens,
                                    completionTokens: (_h = response.usage) === null || _h === void 0 ? void 0 : _h.completion_tokens,
                                    totalTokens: (_j = response.usage) === null || _j === void 0 ? void 0 : _j.total_tokens,
                                },
                                toolCalls: (_k = choice.message) === null || _k === void 0 ? void 0 : _k.tool_calls,
                                toolCallRequest: toolCallRequest
                            }];
                    case 3:
                        error_1 = _l.sent();
                        // Handle errors, differentiating between OpenAI API errors and other errors
                        logger_1.logger.error('OpenAI generate error:', error_1);
                        errorMessage = 'Failed to call OpenAI API.';
                        if (error_1.status && error_1.message) {
                            // OpenAI API error format
                            errorMessage = "OpenAI API Error (".concat(error_1.status, "): ").concat(error_1.message);
                        }
                        else if (error_1.name === 'AbortError') {
                            errorMessage = 'Request cancelled by user';
                        }
                        else if (error_1 instanceof Error) {
                            errorMessage = error_1.message;
                        }
                        return [2 /*return*/, {
                                content: '',
                                error: errorMessage,
                                finishReason: 'error'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    OpenAIProvider.prototype.getAvailableModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.client) {
                            logger_1.logger.warn('Cannot fetch OpenAI models, client not configured.');
                            return [2 /*return*/, []];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.models.list()];
                    case 2:
                        response = _a.sent();
                        // Filter for models that support the chat completions API
                        return [2 /*return*/, response.data
                                .filter(function (m) { return m.id.includes('gpt') || m.id.includes('text-davinci'); })
                                .map(function (m) { return m.id; })
                                .sort()];
                    case 3:
                        error_2 = _a.sent();
                        logger_1.logger.error('Failed to fetch OpenAI models:', error_2);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    OpenAIProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, models, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.client) {
                            logger_1.logger.warn('Cannot fetch OpenAI models, client not configured.');
                            return [2 /*return*/, []];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.models.list()];
                    case 2:
                        response = _a.sent();
                        models = response.data
                            .filter(function (m) { return m.id.includes('gpt') || m.id.includes('text-davinci'); });
                        logger_1.logger.info("Provider openai has ".concat(models.length, " models available"));
                        return [2 /*return*/, models.map(function (m) { return ({ id: m.id }); }).sort(function (a, b) { return a.id.localeCompare(b.id); })];
                    case 3:
                        error_3 = _a.sent();
                        logger_1.logger.error('Failed to fetch OpenAI models:', error_3);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Test connection to OpenAI
     */
    OpenAIProvider.prototype.testConnection = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var modelsResponse, modelExists, error_4, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'OpenAI client not initialized. Please check your API key.'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.models.list()];
                    case 2:
                        modelsResponse = _a.sent();
                        modelExists = modelsResponse.data.some(function (m) { return m.id === modelId; });
                        if (!modelExists) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "Model '".concat(modelId, "' not found in your available models.")
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                message: "Successfully connected to OpenAI API and verified model '".concat(modelId, "'.")
                            }];
                    case 3:
                        error_4 = _a.sent();
                        logger_1.logger.error('OpenAI connection test failed:', error_4);
                        errorMessage = 'Failed to connect to OpenAI API';
                        if (error_4.status && error_4.message) {
                            errorMessage = "OpenAI API Error (".concat(error_4.status, "): ").concat(error_4.message);
                        }
                        else if (error_4 instanceof Error) {
                            errorMessage = error_4.message;
                        }
                        return [2 /*return*/, {
                                success: false,
                                message: errorMessage
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the configuration for this provider
     */
    OpenAIProvider.prototype.getConfig = function () {
        return {
            apiKey: (0, config_1.getOpenAIApiKey)(),
            apiEndpoint: (0, config_1.getOpenAIBaseUrl)(),
            defaultModel: this.defaultModel
        };
    };
    /**
     * Update the provider configuration
     */
    OpenAIProvider.prototype.updateConfig = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This is a placeholder - in the real implementation, we would update the configuration
                // For now, we'll just log that this method was called
                logger_1.logger.info("OpenAI provider updateConfig called with: ".concat(JSON.stringify(config)));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get the configuration fields for this provider
     */
    OpenAIProvider.prototype.getConfigurationFields = function () {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your OpenAI API key',
                required: true,
                type: 'string'
            },
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The OpenAI API endpoint (default: https://api.openai.com/v1)',
                required: false,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., gpt-4o, gpt-3.5-turbo)',
                required: false,
                type: 'string'
            }
        ];
    };
    return OpenAIProvider;
}());
exports.OpenAIProvider = OpenAIProvider;
