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
exports.getConfig = getConfig;
exports.setConfig = setConfig;
exports.getLogLevel = getLogLevel;
exports.getMaxToolIterations = getMaxToolIterations;
exports.getDefaultModelConfig = getDefaultModelConfig;
exports.getOpenAIApiKey = getOpenAIApiKey;
exports.getOpenAIBaseUrl = getOpenAIBaseUrl;
exports.getOpenAIOrganization = getOpenAIOrganization;
exports.getGoogleAIApiKey = getGoogleAIApiKey;
exports.getMistralAIApiKey = getMistralAIApiKey;
exports.getAnthropicApiKey = getAnthropicApiKey;
exports.getOllamaBaseUrl = getOllamaBaseUrl;
exports.getLMStudioBaseUrl = getLMStudioBaseUrl;
exports.getAgents = getAgents;
exports.saveAgents = saveAgents;
exports.getSystemPrompts = getSystemPrompts;
exports.getPromptVariables = getPromptVariables;
var vscode = require("vscode");
/**
 * Get a configuration value from VS Code settings
 */
function getConfig(key, defaultValue) {
    try {
        var config = vscode.workspace.getConfiguration('codessa');
        return config.get(key, defaultValue);
    }
    catch (error) {
        console.error("Error reading configuration key 'codessa.".concat(key, "':"), error);
        return defaultValue;
    }
}
/**
 * Set a configuration value in VS Code settings
 */
function setConfig(key_1, value_1) {
    return __awaiter(this, arguments, void 0, function (key, value, target) {
        var config, error_1;
        if (target === void 0) { target = vscode.ConfigurationTarget.Global; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    config = vscode.workspace.getConfiguration('codessa');
                    return [4 /*yield*/, config.update(key, value, target)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error("Error writing configuration key 'codessa.".concat(key, "':"), error_1);
                    throw new Error("Failed to update setting 'codessa.".concat(key, "': ").concat(error_1));
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Core settings
function getLogLevel() {
    return getConfig('logLevel', 'info');
}
function getMaxToolIterations() {
    return getConfig('maxToolIterations', 5);
}
function getDefaultModelConfig() {
    var defaultConfig = {
        provider: 'ollama',
        modelId: 'llama2',
        options: {
            temperature: 0.7,
            maxTokens: 2000
        }
    };
    return getConfig('defaultModel', defaultConfig);
}
// Provider configurations
function getOpenAIApiKey() {
    return getConfig('providers.openai.apiKey', '');
}
function getOpenAIBaseUrl() {
    var defaultUrl = 'https://api.openai.com/v1';
    return getConfig('providers.openai.baseUrl', defaultUrl);
}
function getOpenAIOrganization() {
    return getConfig('providers.openai.organization', '');
}
function getGoogleAIApiKey() {
    return getConfig('providers.googleai.apiKey', '');
}
function getMistralAIApiKey() {
    return getConfig('providers.mistralai.apiKey', '');
}
function getAnthropicApiKey() {
    return getConfig('providers.anthropic.apiKey', '');
}
function getOllamaBaseUrl() {
    return getConfig('providers.ollama.baseUrl', 'http://localhost:11434');
}
function getLMStudioBaseUrl() {
    return getConfig('providers.lmstudio.baseUrl', 'http://localhost:1234/v1');
}
// Agent configuration
function getAgents() {
    return getConfig('agents', []);
}
function saveAgents(agents) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setConfig('agents', agents)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Prompt configuration
function getSystemPrompts() {
    return getConfig('systemPrompts', {});
}
function getPromptVariables() {
    return getConfig('promptVariables', {});
}
