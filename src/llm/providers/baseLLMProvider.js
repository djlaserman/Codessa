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
exports.BaseLLMProvider = void 0;
var vscode = require("vscode");
var logger_1 = require("../../logger");
var providerSettings_1 = require("../providerSettings");
/**
 * Base class for LLM providers that implements common functionality
 */
var BaseLLMProvider = /** @class */ (function () {
    function BaseLLMProvider(context) {
        this.config = {};
        this.context = context;
        if (context) {
            this.loadConfig();
        }
    }
    /**
     * Load the provider configuration
     */
    BaseLLMProvider.prototype.loadConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, config, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        if (!this.context) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, providerSettings_1.providerSettingsManager.getInstance(this.context).getProviderConfig(this.providerId)];
                    case 1:
                        _a.config = _b.sent();
                        logger_1.logger.debug("Loaded configuration for provider ".concat(this.providerId));
                        return [3 /*break*/, 3];
                    case 2:
                        config = vscode.workspace.getConfiguration('codessa.llm.providers');
                        this.config = config.get(this.providerId) || {};
                        _b.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_1 = _b.sent();
                        logger_1.logger.error("Failed to load configuration for provider ".concat(this.providerId, ":"), error_1);
                        this.config = {};
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if the provider is configured and ready to use
     */
    BaseLLMProvider.prototype.isConfigured = function () {
        if (this.requiresApiKey && !this.config.apiKey) {
            return false;
        }
        return true;
    };
    /**
     * Get the current configuration
     */
    BaseLLMProvider.prototype.getConfig = function () {
        return __assign({}, this.config);
    };
    /**
     * Update the provider configuration
     */
    BaseLLMProvider.prototype.updateConfig = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var vsConfig, error_2, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        if (!this.context) return [3 /*break*/, 2];
                        return [4 /*yield*/, providerSettings_1.providerSettingsManager.getInstance(this.context).updateProviderConfig(this.providerId, config)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        vsConfig = vscode.workspace.getConfiguration('codessa.llm.providers');
                        return [4 /*yield*/, vsConfig.update(this.providerId, config, vscode.ConfigurationTarget.Global)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        this.config = config;
                        logger_1.logger.info("Updated configuration for provider ".concat(this.providerId));
                        return [3 /*break*/, 6];
                    case 5:
                        error_2 = _a.sent();
                        logger_1.logger.error("Failed to update configuration for provider ".concat(this.providerId, ":"), error_2);
                        errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                        throw new Error("Failed to update provider configuration: ".concat(errorMessage));
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the required configuration fields for this provider
     */
    BaseLLMProvider.prototype.getConfigurationFields = function () {
        var fields = [];
        if (this.requiresApiKey) {
            fields.push({
                id: 'apiKey',
                name: 'API Key',
                description: "API key for ".concat(this.displayName),
                required: true,
                type: 'string'
            });
        }
        if (this.supportsEndpointConfiguration) {
            fields.push({
                id: 'apiEndpoint',
                name: 'API Endpoint',
                description: "API endpoint for ".concat(this.displayName),
                required: false,
                type: 'string'
            });
        }
        fields.push({
            id: 'defaultModel',
            name: 'Default Model',
            description: "Default model to use for ".concat(this.displayName),
            required: false,
            type: 'string'
        });
        return fields;
    };
    /**
     * Backward compatibility method for getAvailableModels
     * @deprecated Use listModels instead
     */
    BaseLLMProvider.prototype.getAvailableModels = function () {
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
    return BaseLLMProvider;
}());
exports.BaseLLMProvider = BaseLLMProvider;
