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
exports.openModeSelector = openModeSelector;
const vscode = __importStar(require("vscode"));
const modeSelectorView_1 = require("../ui/modeSelectorView");
const chatView_1 = require("../ui/chatView");
const agentManager_1 = require("../agents/agentManager");
const logger_1 = require("../logger");
/**
 * Get the default agent or prompt the user to select one
 */
async function getDefaultOrSelectedAgent() {
    const agents = agentManager_1.agentManager.getAllAgents();
    if (agents.length === 0) {
        const createNew = await vscode.window.showInformationMessage('No agents available. Would you like to create one?', 'Create Agent', 'Cancel');
        if (createNew === 'Create Agent') {
            vscode.commands.executeCommand('codessa.addAgent');
        }
        return null;
    }
    // If there's only one agent, use it as the default
    if (agents.length === 1) {
        return agents[0];
    }
    // Try to find an agent named 'default'
    const defaultAgent = agents.find(agent => agent.name.toLowerCase() === 'default');
    if (defaultAgent) {
        return defaultAgent;
    }
    // Otherwise, prompt the user to select an agent
    const selected = await vscode.window.showQuickPick(agents.map(agent => ({
        label: agent.name,
        description: agent.description || '',
        id: agent.id
    })), { placeHolder: 'Select an agent' });
    if (selected) {
        return agentManager_1.agentManager.getAgent(selected.id);
    }
    return null;
}
/**
 * Open the mode selector
 */
async function openModeSelector(context) {
    try {
        logger_1.logger.info('Opening mode selector...');
        // Create the mode selector view
        const modeSelectorView = modeSelectorView_1.ModeSelectorView.createOrShow(context.extensionUri, context);
        // Handle mode selection
        modeSelectorView.onModeSelected(async (mode) => {
            logger_1.logger.info(`Mode selected: ${mode.displayName} (${mode.id})`);
            // Get the agent to use
            const agent = await getDefaultOrSelectedAgent();
            if (agent) {
                // Open chat panel with the selected mode
                chatView_1.ChatPanel.createOrShow(context.extensionUri, agent, context, mode);
            }
        });
        logger_1.logger.info('Mode selector opened successfully');
    }
    catch (error) {
        logger_1.logger.error('Error opening mode selector:', error);
        vscode.window.showErrorMessage(`Failed to open mode selector: ${error instanceof Error ? error.message : String(error)}`);
    }
}
//# sourceMappingURL=openModeSelector.js.map