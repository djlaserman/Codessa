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
exports.OllamaProvider = void 0;
var vscode = require("vscode");
// Use require for axios to avoid TypeScript issues
var axios = require('axios');
var baseLLMProvider_1 = require("./baseLLMProvider");
var logger_1 = require("../../logger");
var OllamaProvider = /** @class */ (function (_super) {
    __extends(OllamaProvider, _super);
    function OllamaProvider() {
        // Temporarily remove context parameter until all providers are updated
        var _this = _super.call(this, undefined) || this;
        _this.providerId = 'ollama';
        _this.displayName = 'Ollama';
        _this.description = 'Run large language models locally';
        _this.website = 'https://ollama.ai';
        _this.requiresApiKey = false;
        _this.supportsEndpointConfiguration = true;
        _this.defaultEndpoint = 'http://localhost:11434';
        _this.defaultModel = 'llama3';
        _this.client = null;
        _this.baseUrl = '';
        _this.baseUrl = _this.defaultEndpoint;
        _this.initializeClient();
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(function (e) {
            if (e.affectsConfiguration('codessa.llm.providers.ollama')) {
                logger_1.logger.info("Ollama configuration changed, re-initializing client.");
                _this.loadConfig().then(function () { return _this.initializeClient(); });
            }
        });
        return _this;
    }
    OllamaProvider.prototype.initializeClient = function () {
        this.baseUrl = this.config.apiEndpoint || this.defaultEndpoint;
        if (this.baseUrl) {
            try {
                // Just store the base URL and use it directly in API calls
                this.client = {}; // Dummy instance, we'll use axios directly
                logger_1.logger.info("Ollama client initialized for base URL: ".concat(this.baseUrl));
                // Optionally check if Ollama is reachable
                this.checkConnection();
            }
            catch (error) {
                logger_1.logger.error("Failed to initialize Ollama client:", error);
                this.client = null;
            }
        }
        else {
            logger_1.logger.warn("Ollama base URL not configured.");
            this.client = null;
        }
    };
    OllamaProvider.prototype.checkConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.baseUrl)
                            return [2 /*return*/, false];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, axios.get("".concat(this.baseUrl, "/api/version"))];
                    case 2:
                        _a.sent(); // Check if the Ollama API is responding
                        logger_1.logger.info("Ollama connection successful at ".concat(this.baseUrl));
                        return [2 /*return*/, true];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error("Failed to connect to Ollama at ".concat(this.baseUrl, ":"), error_1);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    OllamaProvider.prototype.isConfigured = function () {
        return !!this.baseUrl;
    };
    /**
     * Test connection to Ollama
     */
    OllamaProvider.prototype.testConnection = function (modelId) {
        return __awaiter(this, void 0, void 0, function () {
            var models, modelExists, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.baseUrl) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: 'Ollama client not initialized'
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        // First check if we can connect to the Ollama server
                        return [4 /*yield*/, axios.get("".concat(this.baseUrl, "/api/version"))];
                    case 2:
                        // First check if we can connect to the Ollama server
                        _a.sent();
                        return [4 /*yield*/, this.listModels()];
                    case 3:
                        models = _a.sent();
                        modelExists = models.some(function (m) { return m.id === modelId; });
                        if (!modelExists) {
                            return [2 /*return*/, {
                                    success: false,
                                    message: "Model '".concat(modelId, "' not found. You may need to pull it first with 'ollama pull ").concat(modelId, "'.")
                                }];
                        }
                        return [2 /*return*/, {
                                success: true,
                                message: "Successfully connected to Ollama server at ".concat(this.baseUrl, " and verified model '").concat(modelId, "'.")
                            }];
                    case 4:
                        error_2 = _a.sent();
                        logger_1.logger.error('Ollama connection test failed:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                message: "Failed to connect to Ollama server at ".concat(this.baseUrl, ": ").concat(error_2 instanceof Error ? error_2.message : 'Unknown error')
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Add tool instructions to the prompt for Ollama
     * Since Ollama doesn't have a native function calling mechanism,
     * we'll instruct it to output tool calls in a specific JSON format.
     */
    OllamaProvider.prototype.addToolInstructionsToPrompt = function (prompt, _systemPrompt, tools) {
        if (!tools || tools.size === 0) {
            return prompt;
        }
        // Format tool descriptions
        var toolDescriptions = 'Available tools:\n';
        tools.forEach(function (tool) {
            // Handle file tool with subactions
            if (tool.id === 'file' && typeof tool.getSubActions === 'function') {
                var subActions = tool.getSubActions();
                for (var _i = 0, subActions_1 = subActions; _i < subActions_1.length; _i++) {
                    var subAction = subActions_1[_i];
                    toolDescriptions += "- ".concat(tool.id, ".").concat(subAction.id, ": ").concat(subAction.description, "\n");
                    if (subAction.inputSchema) {
                        toolDescriptions += "  Arguments: ".concat(JSON.stringify(subAction.inputSchema), "\n");
                    }
                }
            }
            else {
                // Regular tool
                toolDescriptions += "- ".concat(tool.id, ": ").concat(tool.description, "\n");
                if (tool.inputSchema) {
                    toolDescriptions += "  Arguments: ".concat(JSON.stringify(tool.inputSchema), "\n");
                }
            }
        });
        // Tool usage instructions
        var toolInstructions = "\n".concat(toolDescriptions, "\n\nTo use a tool, output a JSON object EXACTLY in this format (no other text before or after):\n{\n  \"tool_call\": {\n    \"name\": \"tool_id.action_name\", // e.g., \"file.readFile\", \"docs.search\"\n    \"arguments\": { // Arguments specific to the tool action\n      \"arg1\": \"value1\",\n      \"arg2\": \"value2\"\n      // ...\n    }\n  }\n}\n\nAfter the tool executes, I will provide you with the result, and you can continue your task or call another tool.\n\nWhen you have the final answer and don't need to use any more tools, output a JSON object EXACTLY in this format:\n{\n  \"final_answer\": \"Your complete final response here.\"\n}\n\nThink step-by-step. Analyze the request, decide if a tool is needed, call the tool if necessary, analyze the result, and repeat until you can provide the final answer.");
        // For Ollama, typically append to the prompt rather than to the system prompt
        return "".concat(prompt, "\n\n").concat(toolInstructions);
    };
    OllamaProvider.prototype.generate = function (params, cancellationToken, tools) {
        return __awaiter(this, void 0, void 0, function () {
            var endpoint, messages, userPrompt, requestData, cancelSource, response, message, content, toolCallRequest, jsonContent, error_3, errorMessage;
            var _a, _b, _c, _d, _e, _f, _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        if (!this.baseUrl) {
                            return [2 /*return*/, { content: '', error: 'Ollama provider not configured (Base URL missing?).' }];
                        }
                        endpoint = '/api/chat';
                        messages = [];
                        if (params.history && params.history.length > 0) {
                            // Convert history to Ollama format
                            messages = params.history.map(function (msg) {
                                // Ollama doesn't support 'tool' role, so convert to assistant
                                var role = msg.role === 'tool' ? 'assistant' : msg.role;
                                return { role: role, content: msg.content };
                            });
                        }
                        else {
                            if (params.systemPrompt) {
                                messages.push({ role: 'system', content: params.systemPrompt });
                            }
                            userPrompt = params.prompt;
                            if (tools && tools.size > 0) {
                                userPrompt = this.addToolInstructionsToPrompt(params.prompt, params.systemPrompt, tools);
                            }
                            messages.push({ role: 'user', content: userPrompt });
                        }
                        // Check for cancellation before making the request
                        if (cancellationToken === null || cancellationToken === void 0 ? void 0 : cancellationToken.isCancellationRequested) {
                            return [2 /*return*/, { content: '', error: 'Request cancelled before sending' }];
                        }
                        requestData = {
                            model: params.modelId,
                            messages: messages,
                            stream: false,
                            options: __assign({ temperature: (_a = params.temperature) !== null && _a !== void 0 ? _a : 0.7, num_predict: params.maxTokens, stop: params.stopSequences }, ((_b = params.options) !== null && _b !== void 0 ? _b : {}))
                        };
                        if (cancellationToken) {
                            cancelSource = axios.CancelToken.source();
                            cancellationToken.onCancellationRequested(function () {
                                logger_1.logger.warn("Ollama request cancelled by user.");
                                cancelSource === null || cancelSource === void 0 ? void 0 : cancelSource.cancel("Request cancelled by user.");
                            });
                        }
                        _h.label = 1;
                    case 1:
                        _h.trys.push([1, 3, , 4]);
                        logger_1.logger.debug("Sending request to Ollama model ".concat(params.modelId, " at ").concat(this.baseUrl).concat(endpoint));
                        return [4 /*yield*/, axios.post("".concat(this.baseUrl).concat(endpoint), requestData, {
                                cancelToken: cancelSource === null || cancelSource === void 0 ? void 0 : cancelSource.token,
                            })];
                    case 2:
                        response = _h.sent();
                        logger_1.logger.debug("Ollama response received: ".concat(JSON.stringify(response.data).substring(0, 100), "..."));
                        message = (_c = response.data) === null || _c === void 0 ? void 0 : _c.message;
                        content = (_d = message === null || message === void 0 ? void 0 : message.content) !== null && _d !== void 0 ? _d : '';
                        toolCallRequest = void 0;
                        // Try to parse JSON from the content
                        try {
                            // Check if content is JSON formatted
                            if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                                jsonContent = JSON.parse(content);
                                // Check if it's a tool call
                                if (jsonContent.tool_call) {
                                    toolCallRequest = {
                                        name: jsonContent.tool_call.name,
                                        arguments: jsonContent.tool_call.arguments
                                    };
                                }
                            }
                        }
                        catch (error) {
                            // Not JSON or invalid, just use as regular content
                            logger_1.logger.debug("Ollama response is not a valid JSON, treating as plain text");
                        }
                        return [2 /*return*/, {
                                content: content,
                                finishReason: 'stop', // Ollama doesn't provide a finish reason
                                usage: {
                                    // Ollama might provide token counts
                                    promptTokens: (_e = response.data) === null || _e === void 0 ? void 0 : _e.prompt_eval_count,
                                    completionTokens: (_f = response.data) === null || _f === void 0 ? void 0 : _f.eval_count,
                                },
                                toolCallRequest: toolCallRequest
                            }];
                    case 3:
                        error_3 = _h.sent();
                        if (axios.isCancel && axios.isCancel(error_3)) {
                            return [2 /*return*/, { content: '', error: 'Request cancelled', finishReason: 'cancel' }];
                        }
                        logger_1.logger.error('Error calling Ollama API:', error_3);
                        errorMessage = 'Failed to call Ollama API.';
                        if (error_3.response) {
                            errorMessage = "Ollama API Error: ".concat(((_g = error_3.response.data) === null || _g === void 0 ? void 0 : _g.error) || error_3.message, " (Status: ").concat(error_3.response.status, ")");
                        }
                        else if (error_3.request) {
                            errorMessage = "Ollama connection error: Could not reach ".concat(this.baseUrl, ". Is Ollama running?");
                        }
                        else if (error_3 instanceof Error) {
                            errorMessage = error_3.message;
                        }
                        return [2 /*return*/, { content: '', error: errorMessage, finishReason: 'error' }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Backward compatibility method for getAvailableModels
     * @deprecated Use listModels instead
     */
    OllamaProvider.prototype.getAvailableModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var models;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.listModels()];
                    case 1:
                        models = _a.sent();
                        return [2 /*return*/, models.map(function (model) { return model.id; })];
                }
            });
        });
    };
    /**
     * List available models from Ollama
     */
    OllamaProvider.prototype.listModels = function () {
        return __awaiter(this, void 0, void 0, function () {
            var endpoint, response, models, error_4;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.baseUrl) {
                            logger_1.logger.warn("Cannot fetch Ollama models, client not configured.");
                            return [2 /*return*/, []];
                        }
                        endpoint = '/api/tags';
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        logger_1.logger.debug("Fetching Ollama models list from ".concat(this.baseUrl).concat(endpoint));
                        return [4 /*yield*/, axios.get("".concat(this.baseUrl).concat(endpoint))];
                    case 2:
                        response = _b.sent();
                        models = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.models) || [];
                        logger_1.logger.info("Provider ollama has ".concat(models.length, " models available"));
                        return [2 /*return*/, models.map(function (m) {
                                var _a;
                                return ({
                                    id: m.name,
                                    name: m.name,
                                    description: "Size: ".concat(_this.formatSize(m.size || 0)),
                                    contextWindow: ((_a = m.details) === null || _a === void 0 ? void 0 : _a.context_length) || 4096
                                });
                            }).sort(function (a, b) { return a.id.localeCompare(b.id); })];
                    case 3:
                        error_4 = _b.sent();
                        logger_1.logger.error("Failed to fetch Ollama models:", error_4);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Format file size in bytes to a human-readable string
     */
    OllamaProvider.prototype.formatSize = function (bytes) {
        if (bytes < 1024) {
            return "".concat(bytes, " B");
        }
        else if (bytes < 1024 * 1024) {
            return "".concat((bytes / 1024).toFixed(2), " KB");
        }
        else if (bytes < 1024 * 1024 * 1024) {
            return "".concat((bytes / (1024 * 1024)).toFixed(2), " MB");
        }
        else {
            return "".concat((bytes / (1024 * 1024 * 1024)).toFixed(2), " GB");
        }
    };
    /**
     * Update the provider configuration
     */
    OllamaProvider.prototype.updateConfig = function (config) {
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
    OllamaProvider.prototype.getConfigurationFields = function () {
        return [
            {
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: 'The URL of your Ollama server (default: http://localhost:11434)',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., llama3, mistral, etc.)',
                required: false,
                type: 'string'
            }
        ];
    };
    return OllamaProvider;
}(baseLLMProvider_1.BaseLLMProvider));
exports.OllamaProvider = OllamaProvider;
