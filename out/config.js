"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const vscode = __importStar(require("vscode"));
/**
 * Get a configuration value from VS Code settings
 */
function getConfig(key, defaultValue) {
    try {
        const config = vscode.workspace.getConfiguration('codessa');
        return config.get(key, defaultValue);
    }
    catch (error) {
        console.error(`Error reading configuration key 'codessa.${key}':`, error);
        return defaultValue;
    }
}
/**
 * Set a configuration value in VS Code settings
 */
async function setConfig(key, value, target = vscode.ConfigurationTarget.Global) {
    try {
        const config = vscode.workspace.getConfiguration('codessa');
        await config.update(key, value, target);
    }
    catch (error) {
        console.error(`Error writing configuration key 'codessa.${key}':`, error);
        throw new Error(`Failed to update setting 'codessa.${key}': ${error}`);
    }
}
// Core settings
function getLogLevel() {
    return getConfig('logLevel', 'info');
}
function getMaxToolIterations() {
    return getConfig('maxToolIterations', 5);
}
function getDefaultModelConfig() {
    const defaultConfig = {
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
    const defaultUrl = 'https://api.openai.com/v1';
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
async function saveAgents(agents) {
    await setConfig('agents', agents);
}
// Prompt configuration
function getSystemPrompts() {
    return getConfig('systemPrompts', {});
}
function getPromptVariables() {
    return getConfig('promptVariables', {});
}
//# sourceMappingURL=config.js.map