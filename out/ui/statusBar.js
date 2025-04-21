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
exports.statusBarManager = exports.StatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const llmService_1 = require("../llm/llmService");
const agentManager_1 = require("../agents/agentManager");
/**
 * Manages status bar items for Codessa
 */
class StatusBarManager {
    constructor() {
        // Create main status bar item
        this.mainStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100 // High priority (lower number = higher priority)
        );
        this.mainStatusBarItem.text = "$(hubot) Codessa";
        this.mainStatusBarItem.tooltip = "Codessa AI Coding Assistant";
        this.mainStatusBarItem.command = "codessa.showQuickActions";
        // Create model status item
        this.modelStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        // Create agent status item
        this.agentStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 98);
    }
    /**
     * Initialize and show status bar items
     */
    initialize() {
        this.updateModelStatus();
        this.updateAgentStatus();
        // Listen for LLM provider changes
        llmService_1.llmService.onProvidersChanged(() => {
            this.updateModelStatus();
        });
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.defaultModel') ||
                e.affectsConfiguration('codessa.providers')) {
                this.updateModelStatus();
            }
        });
        this.mainStatusBarItem.show();
    }
    /**
     * Update model status bar item to show current default model
     */
    updateModelStatus() {
        if (!this.modelStatusBarItem) {
            return;
        }
        try {
            const configuredProviders = llmService_1.llmService.getConfiguredProviders();
            if (configuredProviders.length === 0) {
                this.modelStatusBarItem.text = "$(alert) No LLM Configured";
                this.modelStatusBarItem.tooltip = "Click to configure an LLM provider";
                this.modelStatusBarItem.command = "codessa.openSettings";
                this.modelStatusBarItem.show();
                return;
            }
            // Get the default provider
            const defaultProvider = llmService_1.llmService.getDefaultProvider();
            if (!defaultProvider) {
                this.modelStatusBarItem.text = "$(alert) LLM Error";
                this.modelStatusBarItem.tooltip = "Default LLM provider not found";
                this.modelStatusBarItem.command = "codessa.openSettings";
                this.modelStatusBarItem.show();
                return;
            }
            const modelConfig = llmService_1.llmService.getDefaultModelConfig();
            const temperature = modelConfig.options?.temperature ?? 0.7;
            this.modelStatusBarItem.text = `$(server) ${modelConfig.provider}/${modelConfig.modelId} (${temperature})`;
            this.modelStatusBarItem.tooltip = "Current default LLM provider and model\nClick to change settings";
            this.modelStatusBarItem.command = "codessa.openSettings";
            this.modelStatusBarItem.show();
        }
        catch (error) {
            logger_1.logger.error("Error updating model status:", error);
            this.modelStatusBarItem.text = "$(alert) LLM Error";
            this.modelStatusBarItem.tooltip = "Error getting LLM status";
            this.modelStatusBarItem.command = "codessa.openSettings";
            this.modelStatusBarItem.show();
        }
    }
    /**
     * Update agent status bar item to show available agents
     */
    updateAgentStatus() {
        if (!this.agentStatusBarItem) {
            return;
        }
        try {
            const agents = agentManager_1.agentManager.getAllAgents();
            if (agents.length === 0) {
                this.agentStatusBarItem.text = "$(person-add) Create Agent";
                this.agentStatusBarItem.tooltip = "No agents configured. Click to create one.";
                this.agentStatusBarItem.command = "codessa.addAgent";
                this.agentStatusBarItem.show();
                return;
            }
            this.agentStatusBarItem.text = `$(person) ${agents.length} Agent${agents.length > 1 ? 's' : ''}`;
            this.agentStatusBarItem.tooltip = `${agents.length} agent${agents.length > 1 ? 's' : ''} available`;
            this.agentStatusBarItem.command = "codessa.showAgentList";
            this.agentStatusBarItem.show();
        }
        catch (error) {
            logger_1.logger.error("Error updating agent status:", error);
            this.agentStatusBarItem.hide();
        }
    }
    /**
     * Show activity indicator when an agent is processing
     * @param isActive Whether an agent is actively processing
     */
    setActivityIndicator(isActive) {
        if (isActive) {
            this.mainStatusBarItem.text = "$(sync~spin) Codessa";
            this.mainStatusBarItem.tooltip = "Codessa is processing...";
        }
        else {
            this.mainStatusBarItem.text = "$(hubot) Codessa";
            this.mainStatusBarItem.tooltip = "Codessa AI Coding Assistant";
        }
    }
    /**
     * Dispose all status bar items
     */
    dispose() {
        this.mainStatusBarItem.dispose();
        this.modelStatusBarItem.dispose();
        this.agentStatusBarItem.dispose();
    }
}
exports.StatusBarManager = StatusBarManager;
/**
 * Status bar manager singleton
 */
exports.statusBarManager = new StatusBarManager();
//# sourceMappingURL=statusBar.js.map