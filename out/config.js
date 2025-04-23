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
exports.getMemoryEnabled = getMemoryEnabled;
exports.getMaxMemories = getMaxMemories;
exports.getMemoryRelevanceThreshold = getMemoryRelevanceThreshold;
exports.getMemoryContextWindowSize = getMemoryContextWindowSize;
exports.getConversationHistorySize = getConversationHistorySize;
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
        // Try with the specified target first
        try {
            await config.update(key, value, target);
            console.log(`Updated configuration key 'codessa.${key}' at target level ${target}`);
            return true;
        }
        catch (targetError) {
            console.warn(`Failed to update at target level ${target}: ${targetError}. Trying alternative targets...`);
        }
        // If the specified target fails, try Global
        if (target !== vscode.ConfigurationTarget.Global) {
            try {
                await config.update(key, value, vscode.ConfigurationTarget.Global);
                console.log(`Updated configuration key 'codessa.${key}' at Global level`);
                return true;
            }
            catch (globalError) {
                console.warn(`Failed to update at Global level: ${globalError}. Trying Workspace level...`);
            }
        }
        // If Global fails, try Workspace if available
        if (target !== vscode.ConfigurationTarget.Workspace &&
            vscode.workspace.workspaceFolders &&
            vscode.workspace.workspaceFolders.length > 0) {
            try {
                await config.update(key, value, vscode.ConfigurationTarget.Workspace);
                console.log(`Updated configuration key 'codessa.${key}' at Workspace level`);
                return true;
            }
            catch (workspaceError) {
                console.warn(`Failed to update at Workspace level: ${workspaceError}`);
            }
        }
        // If we get here, all attempts failed
        throw new Error(`Failed to update setting 'codessa.${key}' at any target level`);
    }
    catch (error) {
        console.error(`Error writing configuration key 'codessa.${key}':`, error);
        return false;
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
// Memory settings
function getMemoryEnabled() {
    return getConfig('memory.enabled', true);
}
function getMaxMemories() {
    return getConfig('memory.maxMemories', 1000);
}
function getMemoryRelevanceThreshold() {
    return getConfig('memory.relevanceThreshold', 0.7);
}
function getMemoryContextWindowSize() {
    return getConfig('memory.contextWindowSize', 5);
}
function getConversationHistorySize() {
    return getConfig('memory.conversationHistorySize', 100);
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
    return await setConfig('agents', agents);
}
// Prompt configuration
function getSystemPrompts() {
    return getConfig('systemPrompts', {});
}
function getPromptVariables() {
    return getConfig('promptVariables', {});
}
//# sourceMappingURL=config.js.map