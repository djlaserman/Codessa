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
exports.Agent = void 0;
var logger_1 = require("../logger");
var llmService_1 = require("../llm/llmService");
var promptManager_1 = require("../agents/promptManager");
var config_1 = require("../config");
var toolRegistry_1 = require("../tools/toolRegistry");
var Agent = /** @class */ (function () {
    function Agent(config) {
        // Default LLM parameters for this agent
        this.defaultLLMParams = {
            temperature: 0.7,
            maxTokens: 1000,
            stopSequences: [],
            mode: 'chat'
        };
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.systemPromptName = config.systemPromptName;
        this.llmConfig = config.llm;
        this.tools = toolRegistry_1.toolRegistry.getToolsByIds(config.tools || []);
        this.isSupervisor = config.isSupervisor || false;
        this.chainedAgentIds = config.chainedAgentIds || [];
    }
    /**
     * Get the default LLM parameters for this agent
     */
    Agent.prototype.getDefaultLLMParams = function () {
        var _a;
        return __assign(__assign({}, this.defaultLLMParams), { modelId: ((_a = this.llmConfig) === null || _a === void 0 ? void 0 : _a.modelId) || (0, config_1.getDefaultModelConfig)().modelId });
    };
    /**
     * Generate a response using the agent's LLM
     * @param prompt The prompt to send to the LLM
     * @param params Additional LLM parameters
     * @param cancellationToken Optional cancellation token
     * @returns The generated text
     */
    Agent.prototype.generate = function (prompt_1) {
        return __awaiter(this, arguments, void 0, function (prompt, params, cancellationToken) {
            var provider, systemPrompt, mergedParams, response;
            var _a;
            if (params === void 0) { params = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        provider = llmService_1.llmService.getProviderForConfig(this.llmConfig || (0, config_1.getDefaultModelConfig)());
                        if (!provider) {
                            throw new Error("No provider found for agent '".concat(this.name, "'."));
                        }
                        if (!provider.isConfigured()) {
                            throw new Error("Provider for agent '".concat(this.name, "' is not configured."));
                        }
                        systemPrompt = promptManager_1.promptManager.getSystemPrompt(this.systemPromptName, {});
                        if (!systemPrompt) {
                            throw new Error("System prompt '".concat(this.systemPromptName, "' not found for agent '").concat(this.name, "'."));
                        }
                        mergedParams = __assign({ prompt: prompt, systemPrompt: systemPrompt, modelId: ((_a = this.llmConfig) === null || _a === void 0 ? void 0 : _a.modelId) || (0, config_1.getDefaultModelConfig)().modelId }, params);
                        return [4 /*yield*/, provider.generate(mergedParams, cancellationToken)];
                    case 1:
                        response = _b.sent();
                        return [2 /*return*/, response.content];
                }
            });
        });
    };
    Agent.prototype.run = function (input_1) {
        return __awaiter(this, arguments, void 0, function (input, context) {
            var startTime, provider, iterations, maxIterations, finalAnswer, toolResultsLog, assistantResponseContent, toolCallRequest, systemPrompt, response, _a, toolId, actionId, tool, toolInput, toolResult;
            var _b, _c;
            if (context === void 0) { context = {}; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        logger_1.logger.info("Agent '".concat(this.name, "' starting run. Mode: ").concat(input.mode, ", Prompt: \"").concat(input.prompt.substring(0, 50), "...\""));
                        startTime = Date.now();
                        provider = llmService_1.llmService.getProviderForConfig(this.llmConfig || (0, config_1.getDefaultModelConfig)());
                        if (!provider) {
                            logger_1.logger.error("No provider found for agent '".concat(this.name, "'."));
                            return [2 /*return*/, { success: false, error: 'No LLM provider configured.' }];
                        }
                        if (!provider.isConfigured()) {
                            logger_1.logger.error("Provider for agent '".concat(this.name, "' is not configured."));
                            return [2 /*return*/, { success: false, error: 'LLM provider is not configured.' }];
                        }
                        iterations = 0;
                        maxIterations = (0, config_1.getMaxToolIterations)();
                        finalAnswer = '';
                        toolResultsLog = [];
                        assistantResponseContent = '';
                        toolCallRequest = null;
                        _d.label = 1;
                    case 1:
                        if (!(iterations < maxIterations)) return [3 /*break*/, 6];
                        iterations++;
                        logger_1.logger.debug("Agent '".concat(this.name, "' - Iteration ").concat(iterations));
                        // Check for cancellation
                        if ((_b = context.cancellationToken) === null || _b === void 0 ? void 0 : _b.isCancellationRequested) {
                            logger_1.logger.warn("Agent '".concat(this.name, "' run cancelled."));
                            return [2 /*return*/, { success: false, error: 'Cancelled by user.' }];
                        }
                        systemPrompt = promptManager_1.promptManager.getSystemPrompt(this.systemPromptName, context.variables || {});
                        if (!systemPrompt) {
                            logger_1.logger.error("System prompt '".concat(this.systemPromptName, "' not found for agent '").concat(this.name, "'."));
                            return [2 /*return*/, { success: false, error: "System prompt '".concat(this.systemPromptName, "' not found.") }];
                        }
                        return [4 /*yield*/, provider.generate({
                                prompt: input.prompt,
                                systemPrompt: systemPrompt,
                                modelId: ((_c = this.llmConfig) === null || _c === void 0 ? void 0 : _c.modelId) || (0, config_1.getDefaultModelConfig)().modelId,
                                mode: input.mode
                            }, context.cancellationToken, this.tools)];
                    case 2:
                        response = _d.sent();
                        assistantResponseContent = response.content;
                        // Handle tool calls
                        if (response.toolCallRequest) {
                            toolCallRequest = {
                                name: response.toolCallRequest.name,
                                arguments: response.toolCallRequest.arguments || {}
                            };
                        }
                        else {
                            toolCallRequest = null;
                        }
                        if (!toolCallRequest) return [3 /*break*/, 4];
                        _a = toolCallRequest.name.split('.'), toolId = _a[0], actionId = _a[1];
                        tool = this.tools.get(toolId);
                        if (!tool) {
                            logger_1.logger.error("Tool '".concat(toolId, "' not found for agent '").concat(this.name, "'."));
                            return [2 /*return*/, { success: false, error: "Tool '".concat(toolId, "' not found.") }];
                        }
                        toolInput = __assign({}, toolCallRequest.arguments);
                        // Add action ID for the filesystem tool which expects it
                        if (toolId === 'file' && actionId) {
                            toolInput.action = actionId;
                        }
                        return [4 /*yield*/, tool.execute(toolInput, context)];
                    case 3:
                        toolResult = _d.sent();
                        toolResultsLog.push(toolResult);
                        if (toolResult.error) {
                            logger_1.logger.warn("Tool '".concat(toolId, "' failed: ").concat(toolResult.error));
                            return [2 /*return*/, { success: false, error: toolResult.error, toolResults: toolResultsLog }];
                        }
                        // Optionally, feed tool output back to LLM
                        input.prompt += "\n[Tool '".concat(toolId, "' output]: ").concat(toolResult.output);
                        return [3 /*break*/, 1]; // Next iteration
                    case 4:
                        if (assistantResponseContent) {
                            finalAnswer = assistantResponseContent;
                            return [3 /*break*/, 6];
                        }
                        // C. If no content and no tool call, something went wrong or LLM finished silently
                        else if (!assistantResponseContent && !toolCallRequest) {
                            logger_1.logger.warn("Agent '".concat(this.name, "' LLM returned empty response and no tool call."));
                            finalAnswer = ""; // Assume finished with empty response
                            return [3 /*break*/, 6];
                        }
                        _d.label = 5;
                    case 5: return [3 /*break*/, 1];
                    case 6:
                        if (iterations >= maxIterations) {
                            logger_1.logger.warn("Agent '".concat(this.name, "' reached max iterations (").concat(maxIterations, ")."));
                            return [2 /*return*/, { success: false, error: "Agent exceeded maximum tool iterations (".concat(maxIterations, ")."), toolResults: toolResultsLog }];
                        }
                        logger_1.logger.info("Agent '".concat(this.name, "' finished run in ").concat(Date.now() - startTime, "ms."));
                        return [2 /*return*/, { success: true, output: finalAnswer, toolResults: toolResultsLog }];
                }
            });
        });
    };
    return Agent;
}());
exports.Agent = Agent;
