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
exports.llmService = void 0;
var vscode = require("vscode");
var logger_1 = require("../logger");
var config_1 = require("../config");
var providerSettings_1 = require("./providerSettings");
// Import all providers
var openaiProvider_1 = require("./providers/openaiProvider");
var ollamaProvider_1 = require("./providers/ollamaProvider");
var googleAIProvider_1 = require("./providers/googleAIProvider");
var mistralAIProvider_1 = require("./providers/mistralAIProvider");
var anthropicProvider_1 = require("./providers/anthropicProvider");
var lmstudioProvider_1 = require("./providers/lmstudioProvider");
var openrouterProvider_1 = require("./providers/openrouterProvider");
var huggingfaceProvider_1 = require("./providers/huggingfaceProvider");
var cohereProvider_1 = require("./providers/cohereProvider");
var deepseekProvider_1 = require("./providers/deepseekProvider");
// import { AI21Provider } from './providers/ai21Provider';
// import { AlephAlphaProvider } from './providers/alephalphaprovider';
// import { TogetherAIProvider } from './providers/togetheraiProvider';
// import { PerplexityAIProvider } from './providers/perplexityProvider';
/**
 * Service that manages LLM providers and model selection
 */
var LLMService = /** @class */ (function () {
    function LLMService() {
        var _this = this;
        this.providers = new Map();
        this._onProvidersChanged = new vscode.EventEmitter();
        this.onProvidersChanged = this._onProvidersChanged.event;
        // Listen for configuration changes that might affect providers
        vscode.workspace.onDidChangeConfiguration(function (e) {
            if (e.affectsConfiguration('codessa.llm')) {
                logger_1.logger.info("LLM configuration changed, re-initializing providers.");
                _this.reinitializeProviders();
            }
        });
    }
    /**
     * Initialize the service with the extension context
     * This must be called before using any provider functionality
     */
    LLMService.prototype.initialize = function (context) {
        this.context = context;
        this.initializeProviders();
    };
    LLMService.prototype.initializeProviders = function () {
        return __awaiter(this, void 0, void 0, function () {
            var providerFactories, _i, providerFactories_1, _a, id, factory, configured;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.context) {
                            logger_1.logger.error('LLMService not initialized with context');
                            return [2 /*return*/];
                        }
                        // Clear existing providers
                        this.providers.clear();
                        providerFactories = [
                            // Register built-in providers
                            { id: 'ollama', factory: function () { return new ollamaProvider_1.OllamaProvider(); } },
                            { id: 'openai', factory: function () { return new openaiProvider_1.OpenAIProvider(); } },
                            { id: 'anthropic', factory: function () { return new anthropicProvider_1.AnthropicProvider(); } },
                            { id: 'googleai', factory: function () { return new googleAIProvider_1.GoogleAIProvider(); } },
                            { id: 'mistralai', factory: function () { return new mistralAIProvider_1.MistralAIProvider(); } },
                            { id: 'lmstudio', factory: function () { return new lmstudioProvider_1.LMStudioProvider(_this.context); } },
                            { id: 'openrouter', factory: function () { return new openrouterProvider_1.OpenRouterProvider(_this.context); } },
                            { id: 'huggingface', factory: function () { return new huggingfaceProvider_1.HuggingFaceProvider(_this.context); } },
                            { id: 'deepseek', factory: function () { return new deepseekProvider_1.DeepSeekProvider(_this.context); } },
                            { id: 'cohere', factory: function () { return new cohereProvider_1.CohereProvider(_this.context); } },
                            // These will be implemented later
                            // { id: 'ai21', factory: () => new AI21Provider(this.context!) },
                            // { id: 'alephalpha', factory: () => new AlephAlphaProvider(this.context!) },
                            // { id: 'togetherai', factory: () => new TogetherAIProvider(this.context!) },
                            // { id: 'perplexity', factory: () => new PerplexityAIProvider(this.context!) }
                        ];
                        _i = 0, providerFactories_1 = providerFactories;
                        _b.label = 1;
                    case 1:
                        if (!(_i < providerFactories_1.length)) return [3 /*break*/, 4];
                        _a = providerFactories_1[_i], id = _a.id, factory = _a.factory;
                        return [4 /*yield*/, this.tryRegisterProvider(id, factory)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        logger_1.logger.info("Initialized ".concat(this.providers.size, " LLM providers."));
                        configured = this.getConfiguredProviders();
                        logger_1.logger.info("".concat(configured.length, " providers are configured: ").concat(configured.map(function (p) { return p.providerId; }).join(', ')));
                        // Notify listeners that providers have changed
                        this._onProvidersChanged.fire();
                        return [2 /*return*/];
                }
            });
        });
    };
    LLMService.prototype.reinitializeProviders = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initializeProviders()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Attempt to register a provider with error handling
     */
    LLMService.prototype.tryRegisterProvider = function (id, providerFactory) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, models, error_1, errorMessage, error_2, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        provider = providerFactory();
                        if (!provider) return [3 /*break*/, 4];
                        this.registerProvider(provider);
                        logger_1.logger.info("Successfully registered provider: ".concat(id));
                        if (!provider.isConfigured()) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, provider.listModels()];
                    case 2:
                        models = _a.sent();
                        logger_1.logger.info("Provider ".concat(id, " has ").concat(models.length, " models available"));
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                        logger_1.logger.warn("Failed to list models for provider ".concat(id, ": ").concat(errorMessage));
                        // Don't show notifications for Ollama and LM Studio during startup
                        // as these are common local providers that might not be running
                        if (id !== 'ollama' && id !== 'lmstudio') {
                            vscode.window.showWarningMessage("Failed to connect to ".concat(id, " provider. The provider is registered but may not work until the connection issue is resolved."));
                        }
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        errorMessage = error_2 instanceof Error ? error_2.message : 'Unknown error';
                        logger_1.logger.warn("Failed to initialize ".concat(id, " provider: ").concat(errorMessage));
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Registers a new LLM provider
     */
    LLMService.prototype.registerProvider = function (provider) {
        if (this.providers.has(provider.providerId)) {
            logger_1.logger.warn("Provider with ID '".concat(provider.providerId, "' is already registered. Overwriting."));
        }
        this.providers.set(provider.providerId, provider);
    };
    /**
     * Gets a provider by ID
     */
    LLMService.prototype.getProvider = function (providerId) {
        return this.providers.get(providerId);
    };
    /**
     * Gets the appropriate LLM provider based on the config
     */
    LLMService.prototype.getProviderForConfig = function (config) {
        var provider = this.providers.get(config.provider);
        if (!provider) {
            logger_1.logger.warn("LLM provider '".concat(config.provider, "' not found."));
            return undefined;
        }
        if (!provider.isConfigured()) {
            logger_1.logger.warn("LLM provider '".concat(config.provider, "' is not configured."));
            return undefined;
        }
        return provider;
    };
    /**
     * Gets the default provider based on settings
     */
    LLMService.prototype.getDefaultProvider = function () {
        if (!this.context) {
            logger_1.logger.error('LLMService not initialized with context');
            return undefined;
        }
        // Get default provider ID from settings
        var defaultProviderId = providerSettings_1.providerSettingsManager.getInstance(this.context).getDefaultProviderId();
        var provider = this.providers.get(defaultProviderId);
        // If the default provider is not available or not configured, try to find another configured provider
        if (!provider || !provider.isConfigured()) {
            logger_1.logger.warn("Default provider '".concat(defaultProviderId, "' not found or not configured. Trying to find another provider."));
            var configuredProviders = this.getConfiguredProviders();
            if (configuredProviders.length > 0) {
                return configuredProviders[0];
            }
            return undefined;
        }
        return provider;
    };
    /**
     * Sets the default provider
     */
    LLMService.prototype.setDefaultProvider = function (providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.context) {
                            logger_1.logger.error('LLMService not initialized with context');
                            return [2 /*return*/, false];
                        }
                        provider = this.providers.get(providerId);
                        if (!provider) {
                            logger_1.logger.warn("Cannot set default provider: Provider '".concat(providerId, "' not found."));
                            return [2 /*return*/, false];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, providerSettings_1.providerSettingsManager.getInstance(this.context).setDefaultProviderId(providerId)];
                    case 2:
                        _a.sent();
                        logger_1.logger.info("Set default provider to ".concat(providerId));
                        return [2 /*return*/, true];
                    case 3:
                        error_3 = _a.sent();
                        logger_1.logger.error("Failed to set default provider to ".concat(providerId, ":"), error_3);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gets all available LLM providers
     */
    LLMService.prototype.getAllProviders = function () {
        return Array.from(this.providers.values());
    };
    /**
     * Gets all available configured providers
     */
    LLMService.prototype.getConfiguredProviders = function () {
        return Array.from(this.providers.values())
            .filter(function (provider) { return provider.isConfigured(); });
    };
    /**
     * Lists all provider IDs
     */
    LLMService.prototype.listProviderIds = function () {
        return Array.from(this.providers.keys());
    };
    /**
     * Gets the default model configuration from settings
     */
    LLMService.prototype.getDefaultModelConfig = function () {
        return (0, config_1.getDefaultModelConfig)();
    };
    /**
     * Updates the configuration for a provider
     */
    LLMService.prototype.updateProviderConfig = function (providerId, config) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.context) {
                            logger_1.logger.error('LLMService not initialized with context');
                            return [2 /*return*/, false];
                        }
                        provider = this.providers.get(providerId);
                        if (!provider) {
                            logger_1.logger.warn("Cannot update provider config: Provider '".concat(providerId, "' not found."));
                            return [2 /*return*/, false];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, provider.updateConfig(config)];
                    case 2:
                        _a.sent();
                        logger_1.logger.info("Updated configuration for provider ".concat(providerId));
                        return [2 /*return*/, true];
                    case 3:
                        error_4 = _a.sent();
                        logger_1.logger.error("Failed to update configuration for provider ".concat(providerId, ":"), error_4);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Gets the configuration for a provider
     */
    LLMService.prototype.getProviderConfig = function (providerId) {
        var provider = this.providers.get(providerId);
        if (!provider) {
            return undefined;
        }
        return provider.getConfig();
    };
    return LLMService;
}());
exports.llmService = new LLMService();
