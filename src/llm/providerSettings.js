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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerSettingsManager = exports.ProviderSettingsManager = void 0;
var vscode = require("vscode");
var logger_1 = require("../logger");
var credentialsManager_1 = require("../credentials/credentialsManager");
/**
 * Manages provider settings, combining secure credentials with
 * non-sensitive configuration stored in VS Code settings
 */
var ProviderSettingsManager = /** @class */ (function () {
    function ProviderSettingsManager(context) {
        this.configSection = 'codessa.llm.providers';
        this.context = context;
    }
    /**
     * Get the singleton instance of ProviderSettingsManager
     */
    ProviderSettingsManager.getInstance = function (context) {
        if (!ProviderSettingsManager.instance) {
            if (!context) {
                throw new Error('ProviderSettingsManager must be initialized with a context first');
            }
            ProviderSettingsManager.instance = new ProviderSettingsManager(context);
        }
        return ProviderSettingsManager.instance;
    };
    /**
     * Get the configuration for a provider
     * @param providerId The provider ID
     * @returns The provider configuration
     */
    ProviderSettingsManager.prototype.getProviderConfig = function (providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var config, providerConfig, apiKey, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        config = vscode.workspace.getConfiguration(this.configSection);
                        providerConfig = config.get(providerId) || {};
                        return [4 /*yield*/, credentialsManager_1.credentialsManager.getInstance(this.context).getCredential(providerId, 'apiKey')];
                    case 1:
                        apiKey = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, providerConfig), { apiKey: apiKey || providerConfig.apiKey })];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error("Failed to get provider config for ".concat(providerId, ":"), error_1);
                        return [2 /*return*/, {}];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Update the configuration for a provider
     * @param providerId The provider ID
     * @param config The new configuration
     */
    ProviderSettingsManager.prototype.updateProviderConfig = function (providerId, config) {
        return __awaiter(this, void 0, void 0, function () {
            var apiKey, nonSensitiveConfig, vsConfig, globalError_1, workspaceError_1, error_2, errorMessage, error_3, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 13, , 14]);
                        if (!config.apiKey) return [3 /*break*/, 2];
                        return [4 /*yield*/, credentialsManager_1.credentialsManager.getInstance(this.context).storeCredential(providerId, 'apiKey', config.apiKey)];
                    case 1:
                        _a.sent();
                        apiKey = config.apiKey, nonSensitiveConfig = __rest(config, ["apiKey"]);
                        config = nonSensitiveConfig;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 11, , 12]);
                        vsConfig = vscode.workspace.getConfiguration(this.configSection);
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 10]);
                        return [4 /*yield*/, vsConfig.update(providerId, config, vscode.ConfigurationTarget.Global)];
                    case 4:
                        _a.sent();
                        logger_1.logger.info("Updated global configuration for provider ".concat(providerId));
                        return [3 /*break*/, 10];
                    case 5:
                        globalError_1 = _a.sent();
                        logger_1.logger.warn("Failed to update global configuration, trying Workspace target: ".concat(globalError_1));
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, vsConfig.update(providerId, config, vscode.ConfigurationTarget.Workspace)];
                    case 7:
                        _a.sent();
                        logger_1.logger.info("Updated workspace configuration for provider ".concat(providerId));
                        return [3 /*break*/, 9];
                    case 8:
                        workspaceError_1 = _a.sent();
                        logger_1.logger.error("Failed to update workspace configuration: ".concat(workspaceError_1));
                        throw new Error("Failed to update configuration at both Global and Workspace levels: ".concat(workspaceError_1));
                    case 9: return [3 /*break*/, 10];
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        error_2 = _a.sent();
                        logger_1.logger.error("Failed to update configuration for provider ".concat(providerId, ":"), error_2);
                        errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                        throw new Error("Failed to update provider configuration: ".concat(errorMessage, ". Please check your VS Code settings permissions."));
                    case 12: return [3 /*break*/, 14];
                    case 13:
                        error_3 = _a.sent();
                        logger_1.logger.error("Failed to update provider config for ".concat(providerId, ":"), error_3);
                        errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
                        throw new Error("Failed to update provider configuration: ".concat(errorMessage));
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if a provider has been configured
     * @param providerId The provider ID
     * @returns True if the provider has been configured
     */
    ProviderSettingsManager.prototype.isProviderConfigured = function (providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var config, hasApiKey, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getProviderConfig(providerId)];
                    case 1:
                        config = _a.sent();
                        return [4 /*yield*/, credentialsManager_1.credentialsManager.getInstance(this.context).hasCredential(providerId, 'apiKey')];
                    case 2:
                        hasApiKey = _a.sent();
                        // Check if the provider has the minimum required configuration
                        return [2 /*return*/, hasApiKey || (config.apiKey !== undefined && config.apiKey !== '')];
                    case 3:
                        error_4 = _a.sent();
                        logger_1.logger.error("Failed to check if provider ".concat(providerId, " is configured:"), error_4);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the default provider ID from settings
     * @returns The default provider ID, or 'ollama' if not set
     */
    ProviderSettingsManager.prototype.getDefaultProviderId = function () {
        try {
            var config = vscode.workspace.getConfiguration('codessa.llm');
            return config.get('defaultProvider') || 'ollama';
        }
        catch (error) {
            logger_1.logger.error('Failed to get default provider ID:', error);
            return 'ollama';
        }
    };
    /**
     * Set the default provider ID
     * @param providerId The provider ID to set as default
     */
    ProviderSettingsManager.prototype.setDefaultProviderId = function (providerId) {
        return __awaiter(this, void 0, void 0, function () {
            var config, error_5, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        config = vscode.workspace.getConfiguration('codessa.llm');
                        return [4 /*yield*/, config.update('defaultProvider', providerId, vscode.ConfigurationTarget.Global)];
                    case 1:
                        _a.sent();
                        logger_1.logger.info("Set default provider to ".concat(providerId));
                        return [3 /*break*/, 3];
                    case 2:
                        error_5 = _a.sent();
                        logger_1.logger.error("Failed to set default provider to ".concat(providerId, ":"), error_5);
                        errorMessage = error_5 instanceof Error ? error_5.message : String(error_5);
                        throw new Error("Failed to set default provider: ".concat(errorMessage));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ProviderSettingsManager;
}());
exports.ProviderSettingsManager = ProviderSettingsManager;
// Export singleton instance
exports.providerSettingsManager = {
    getInstance: ProviderSettingsManager.getInstance
};
