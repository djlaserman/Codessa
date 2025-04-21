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
exports.AnthropicProvider = void 0;
var config_1 = require("../../config");
var logger_1 = require("../../logger");
var vscode = require("vscode");
var sdk_1 = require("@anthropic-ai/sdk");
var AnthropicProvider = /** @class */ (function () {
    function AnthropicProvider() {
        var _this = this;
        this.providerId = 'anthropic';
        this.displayName = 'Anthropic';
        this.description = 'Anthropic Claude AI models';
        this.website = 'https://anthropic.com';
        this.requiresApiKey = true;
        this.supportsEndpointConfiguration = false;
        this.defaultModel = 'claude-3-opus-20240229';
        this.client = null;
        this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(function (e) {
            if (e.affectsConfiguration('codessa.providers.anthropic')) {
                logger_1.logger.info("Anthropic configuration changed, re-initializing client.");
                _this.initializeClient();
            }
        });
    }
    AnthropicProvider.prototype.initializeClient = function () {
        var apiKey = (0, config_1.getAnthropicApiKey)();
        if (!apiKey) {
            logger_1.logger.warn('Anthropic API key not set.');
            this.client = null;
            return;
        }
        try {
            this.client = new sdk_1.default({ apiKey: apiKey });
            logger_1.logger.info('Anthropic client initialized.');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Anthropic client:', error);
            this.client = null;
        }
    };
    AnthropicProvider.prototype.isConfigured = function () {
        return !!this.client;
    };
    AnthropicProvider.prototype.generate = function (params, cancellationToken, tools) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, _i, _a, msg, anthropicTools, _b, _c, _d, toolId, tool, _e, _f, _g, actionId, action, completionRequest, response, toolCallRequest, content, _h, _j, block, error_1, errorMessage;
            var _k, _l, _m;
            return __generator(this, function (_o) {
                switch (_o.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, {
                                    content: '',
                                    error: 'Anthropic provider not configured (API key missing). Please set the API key in settings.'
                                }];
                        }
                        if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                            return [2 /*return*/, { content: '', error: 'Request cancelled', finishReason: 'cancelled' }];
                        }
                        _o.label = 1;
                    case 1:
                        _o.trys.push([1, 3, , 4]);
                        messages = [];
                        // Add history messages if available
                        if (params.history && params.history.length > 0) {
                            for (_i = 0, _a = params.history; _i < _a.length; _i++) {
                                msg = _a[_i];
                                if (msg.role === 'system') {
                                    continue; // Skip system messages in history as Anthropic handles them separately
                                }
                                if (msg.role === 'user' || msg.role === 'assistant') {
                                    messages.push({
                                        role: msg.role,
                                        content: msg.content
                                    });
                                }
                            }
                        }
                        else {
                            // If no history, add the current prompt
                            messages.push({
                                role: 'user',
                                content: params.prompt
                            });
                        }
                        anthropicTools = [];
                        if (tools && tools.size > 0) {
                            for (_b = 0, _c = tools.entries(); _b < _c.length; _b++) {
                                _d = _c[_b], toolId = _d[0], tool = _d[1];
                                if (tool.actions) {
                                    for (_e = 0, _f = Object.entries(tool.actions); _e < _f.length; _e++) {
                                        _g = _f[_e], actionId = _g[0], action = _g[1];
                                        if (action.parameters) {
                                            anthropicTools.push({
                                                function: {
                                                    name: "".concat(toolId, ".").concat(actionId),
                                                    description: action.description || "".concat(toolId, " ").concat(actionId, " action"),
                                                    parameters: action.parameters
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                        completionRequest = {
                            model: params.modelId || 'claude-3-opus-20240229',
                            messages: messages,
                            max_tokens: params.maxTokens || 1024,
                            temperature: params.temperature,
                            system: params.systemPrompt
                        };
                        // Add tools if available
                        if (anthropicTools.length > 0) {
                            completionRequest.tools = anthropicTools;
                        }
                        // Make the API call
                        logger_1.logger.debug("Sending request to Anthropic with model: ".concat(completionRequest.model));
                        return [4 /*yield*/, this.client.messages.create(completionRequest)];
                    case 2:
                        response = _o.sent();
                        toolCallRequest = void 0;
                        content = '';
                        if (response.content && response.content.length > 0) {
                            for (_h = 0, _j = response.content; _h < _j.length; _h++) {
                                block = _j[_h];
                                if (block.type === 'text') {
                                    content += block.text;
                                }
                                else if (block.type === 'tool_use' && tools) {
                                    // Process tool call
                                    try {
                                        toolCallRequest = {
                                            name: block.name || '',
                                            arguments: JSON.parse(block.input || '{}')
                                        };
                                        // Break early to let the agent execute the tool
                                        break;
                                    }
                                    catch (error) {
                                        logger_1.logger.error('Error parsing tool call from Anthropic:', error);
                                    }
                                }
                            }
                        }
                        return [2 /*return*/, {
                                content: content,
                                finishReason: response.stop_reason || 'stop',
                                toolCallRequest: toolCallRequest
                            }];
                    case 3:
                        error_1 = _o.sent();
                        logger_1.logger.error('Error calling Anthropic API:', error_1);
                        errorMessage = 'Error calling Anthropic API.';
                        if ((_m = (_l = (_k = error_1.response) === null || _k === void 0 ? void 0 : _k.data) === null || _l === void 0 ? void 0 : _l.error) === null || _m === void 0 ? void 0 : _m.message) {
                            errorMessage = "Anthropic API error: ".concat(error_1.response.data.error.message);
                        }
                        else if (error_1.message) {
                            errorMessage = "Error: ".concat(error_1.message);
                        }
                        return [2 /*return*/, { content: '', error: errorMessage }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AnthropicProvider.prototype.getAvailableModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.isConfigured()) {
                    return [2 /*return*/, []];
                }
                // Return default Claude models - Anthropic doesn't provide a model listing API
                return [2 /*return*/, [
                        'claude-3-opus-20240229',
                        'claude-3-sonnet-20240229',
                        'claude-3-haiku-20240307',
                        'claude-2.1',
                        'claude-2.0',
                        'claude-instant-1.2'
                    ]];
            });
        });
    };
    /**
     * Lists available models with their details
     */
    AnthropicProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var models;
            return __generator(this, function (_a) {
                if (!this.isConfigured()) {
                    return [2 /*return*/, []];
                }
                models = [
                    { id: 'claude-3-opus-20240229' },
                    { id: 'claude-3-sonnet-20240229' },
                    { id: 'claude-3-haiku-20240307' },
                    { id: 'claude-2.1' },
                    { id: 'claude-2.0' },
                    { id: 'claude-instant-1.2' }
                ];
                logger_1.logger.info("Provider anthropic has ".concat(models.length, " models available"));
                return [2 /*return*/, models];
            });
        });
    };
    /**
     * Test connection to Anthropic
     */
    AnthropicProvider.prototype.testConnection = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2, errorMessage;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!this.client) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Anthropic client not initialized. Please check your API key.'
                                }];
                        }
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        // Anthropic doesn't have a dedicated endpoint for testing connections,
                        // so we'll make a minimal API call
                        return [4 /*yield*/, this.client.messages.create({
                                model: modelId,
                                max_tokens: 10,
                                messages: [{ role: 'user', content: 'Hello' }]
                            })];
                    case 2:
                        // Anthropic doesn't have a dedicated endpoint for testing connections,
                        // so we'll make a minimal API call
                        _d.sent();
                        return [2 /*return*/, {
                                success: true,
                                message: "Successfully connected to Anthropic API with model '".concat(modelId, "'.")
                            }];
                    case 3:
                        error_2 = _d.sent();
                        logger_1.logger.error('Anthropic connection test failed:', error_2);
                        errorMessage = 'Failed to connect to Anthropic API';
                        if ((_c = (_b = (_a = error_2.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.message) {
                            errorMessage = "Anthropic API error: ".concat(error_2.response.data.error.message);
                        }
                        else if (error_2.message) {
                            errorMessage = error_2.message;
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
    AnthropicProvider.prototype.getConfig = function () {
        return {
            apiKey: (0, config_1.getAnthropicApiKey)(),
            defaultModel: this.defaultModel
        };
    };
    /**
     * Update the provider configuration
     */
    AnthropicProvider.prototype.updateConfig = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This is a placeholder - in the real implementation, we would update the configuration
                // For now, we'll just log that this method was called
                logger_1.logger.info("Anthropic provider updateConfig called with: ".concat(JSON.stringify(config)));
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get the configuration fields for this provider
     */
    AnthropicProvider.prototype.getConfigurationFields = function () {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Anthropic API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., claude-3-opus-20240229)',
                required: false,
                type: 'string'
            }
        ];
    };
    return AnthropicProvider;
}());
exports.AnthropicProvider = AnthropicProvider;
