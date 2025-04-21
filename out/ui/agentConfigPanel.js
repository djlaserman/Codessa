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
exports.AgentConfigPanel = void 0;
const vscode = __importStar(require("vscode"));
const agentManager_1 = require("../agents/agentManager");
const logger_1 = require("../logger");
const utils_1 = require("./utils");
const llmService_1 = require("../llm/llmService");
const toolRegistry_1 = require("../tools/toolRegistry");
const promptManager_1 = require("../agents/promptManager");
/**
 * Panel for configuring agent settings with a rich UI
 */
class AgentConfigPanel {
    /**
     * Create or show an agent configuration panel
     */
    static createOrShow(extensionUri, agentId, context) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it (unless we're editing a different agent)
        if (AgentConfigPanel.currentPanel) {
            if (!agentId || AgentConfigPanel.currentPanel._agent?.id === agentId) {
                AgentConfigPanel.currentPanel._panel.reveal(column);
                return AgentConfigPanel.currentPanel;
            }
            else {
                // If editing a different agent, dispose the current panel
                AgentConfigPanel.currentPanel.dispose();
            }
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(AgentConfigPanel.viewType, agentId ? 'Edit Agent' : 'Create Agent', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(extensionUri, 'resources')
            ]
        });
        const agent = agentId ? agentManager_1.agentManager.getAgent(agentId) : undefined;
        const isCreatingNew = !agent;
        // Update panel title based on agent
        if (agent) {
            panel.title = `Edit Agent: ${agent.name}`;
        }
        else {
            panel.title = 'Create New Agent';
        }
        const configPanel = new AgentConfigPanel(panel, extensionUri, agent, isCreatingNew);
        // Register panel with extension context if provided
        if (context) {
            context.subscriptions.push(panel);
        }
        return configPanel;
    }
    constructor(panel, extensionUri, agent, isCreatingNew) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._agent = agent;
        this._isCreatingNew = isCreatingNew;
        // Set initial HTML content
        this._update();
        // Handle panel disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'saveAgent':
                    await this._handleSaveAgent(message.data);
                    break;
                case 'getAvailableModels':
                    await this._handleGetAvailableModels();
                    break;
                case 'getAvailableTools':
                    await this._handleGetAvailableTools();
                    break;
                case 'getAvailablePrompts':
                    await this._handleGetAvailablePrompts();
                    break;
                case 'getAvailableAgents':
                    await this._handleGetAvailableAgents();
                    break;
                case 'testConnection':
                    await this._handleTestConnection(message.data);
                    break;
            }
        }, null, this._disposables);
        // Cache the current panel
        AgentConfigPanel.currentPanel = this;
    }
    /**
     * Save agent configuration
     */
    async _handleSaveAgent(data) {
        try {
            // Create new agent or update existing one
            if (this._isCreatingNew) {
                const agent = await agentManager_1.agentManager.createAgent({
                    name: data.name,
                    description: data.description,
                    systemPromptName: data.systemPromptName,
                    llm: {
                        provider: data.llm.provider,
                        modelId: data.llm.modelId
                    },
                    tools: data.tools || [],
                    isSupervisor: data.isSupervisor || false,
                    chainedAgentIds: data.chainedAgentIds || []
                });
                this._agent = agent;
                this._isCreatingNew = false;
                this._panel.title = `Edit Agent: ${agent.name}`;
                // Send success message back to webview
                this._panel.webview.postMessage({
                    type: 'saveResult',
                    success: true,
                    message: 'Agent created successfully',
                    agentId: agent.id
                });
                vscode.window.showInformationMessage(`Agent "${agent.name}" created successfully!`);
            }
            else if (this._agent) {
                // Update existing agent
                const updatedAgent = await agentManager_1.agentManager.updateAgent(this._agent.id, {
                    name: data.name,
                    description: data.description,
                    systemPromptName: data.systemPromptName,
                    llm: {
                        provider: data.llm.provider,
                        modelId: data.llm.modelId
                    },
                    tools: data.tools || [],
                    isSupervisor: data.isSupervisor || false,
                    chainedAgentIds: data.chainedAgentIds || []
                });
                if (updatedAgent) {
                    this._agent = updatedAgent;
                    this._panel.title = `Edit Agent: ${updatedAgent.name}`;
                    // Send success message back to webview
                    this._panel.webview.postMessage({
                        type: 'saveResult',
                        success: true,
                        message: 'Agent updated successfully',
                        agentId: updatedAgent.id
                    });
                    vscode.window.showInformationMessage(`Agent "${updatedAgent.name}" updated successfully!`);
                }
                else {
                    throw new Error('Failed to update agent');
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error saving agent:', error);
            // Send error message back to webview
            this._panel.webview.postMessage({
                type: 'saveResult',
                success: false,
                message: `Error saving agent: ${error}`
            });
            vscode.window.showErrorMessage(`Failed to save agent: ${error}`);
        }
    }
    /**
     * Fetch and send available models to the webview
     */
    async _handleGetAvailableModels() {
        try {
            const providers = llmService_1.llmService.listProviderIds();
            const modelsByProvider = {};
            for (const providerId of providers) {
                const provider = llmService_1.llmService.getProvider(providerId);
                if (provider) {
                    try {
                        // Get models using the listModels method
                        const modelObjects = await provider.listModels();
                        // Store the full model objects, not just IDs
                        modelsByProvider[providerId] = modelObjects;
                        logger_1.logger.info(`Provider ${providerId} has ${modelObjects.length} models available`);
                    }
                    catch (error) {
                        logger_1.logger.warn(`Failed to get models for provider ${providerId}:`, error);
                        // Create a default model object
                        modelsByProvider[providerId] = [{
                                id: 'default',
                                name: 'Default Model',
                                description: 'Default model for this provider'
                            }];
                    }
                }
            }
            this._panel.webview.postMessage({
                type: 'availableModels',
                providers,
                modelsByProvider
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting available models:', error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error fetching models: ${error}`
            });
        }
    }
    /**
     * Fetch and send available tools to the webview
     */
    async _handleGetAvailableTools() {
        try {
            const tools = toolRegistry_1.toolRegistry.getAllTools().map(tool => ({
                id: tool.id,
                name: tool.name,
                description: tool.description || '',
                category: tool.category || 'Other'
            }));
            this._panel.webview.postMessage({
                type: 'availableTools',
                tools
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting available tools:', error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error fetching tools: ${error}`
            });
        }
    }
    /**
     * Fetch and send available system prompts to the webview
     */
    async _handleGetAvailablePrompts() {
        try {
            const prompts = promptManager_1.promptManager.listPromptNames().map(name => ({
                name,
                description: promptManager_1.promptManager.getPromptDescription(name) || ''
            }));
            this._panel.webview.postMessage({
                type: 'availablePrompts',
                prompts
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting available prompts:', error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error fetching prompts: ${error}`
            });
        }
    }
    /**
     * Fetch and send available agents to the webview
     * (for supervisor agent chaining)
     */
    async _handleGetAvailableAgents() {
        try {
            const currentAgentId = this._agent?.id;
            // Filter out current agent to avoid circular references
            const agents = agentManager_1.agentManager.getAllAgents()
                .filter(agent => agent.id !== currentAgentId)
                .map(agent => ({
                id: agent.id,
                name: agent.name,
                description: agent.description || ''
            }));
            this._panel.webview.postMessage({
                type: 'availableAgents',
                agents
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting available agents:', error);
            this._panel.webview.postMessage({
                type: 'error',
                message: `Error fetching agents: ${error}`
            });
        }
    }
    /**
     * Test connection to the selected LLM provider
     */
    async _handleTestConnection(data) {
        try {
            const provider = llmService_1.llmService.getProvider(data.provider);
            if (!provider) {
                throw new Error(`Provider ${data.provider} not found`);
            }
            if (!provider.isConfigured()) {
                throw new Error(`Provider ${data.provider} is not configured. Please check your settings.`);
            }
            // All providers now have a testConnection method
            const testResult = await provider.testConnection(data.modelId);
            this._panel.webview.postMessage({
                type: 'connectionTestResult',
                success: testResult.success,
                message: testResult.message
            });
        }
        catch (error) {
            logger_1.logger.error('Error testing connection:', error);
            this._panel.webview.postMessage({
                type: 'connectionTestResult',
                success: false,
                message: `Connection test failed: ${error}`
            });
        }
    }
    /**
     * Generate HTML for the webview panel
     */
    _update() {
        const webview = this._panel.webview;
        webview.html = this._getWebviewContent(webview);
    }
    /**
     * Generate the webview HTML content for agent configuration
     */
    _getWebviewContent(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'agentConfig.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'agentConfig.css'));
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'resources', 'codessa-logo.png'));
        const nonce = (0, utils_1.getNonce)();
        // Initialize agent data (for edit mode)
        const agentData = this._agent ? {
            id: this._agent.id,
            name: this._agent.name,
            description: this._agent.description || '',
            systemPromptName: this._agent.systemPromptName,
            llm: this._agent.llmConfig || { provider: '', modelId: '' },
            tools: Array.from(this._agent.tools.keys()),
            isSupervisor: this._agent.isSupervisor,
            chainedAgentIds: this._agent.chainedAgentIds
        } : {
            id: '',
            name: '',
            description: '',
            systemPromptName: 'default_coder',
            llm: { provider: 'openai', modelId: 'gpt-4o' },
            tools: ['file', 'docs'],
            isSupervisor: false,
            chainedAgentIds: []
        };
        // Generate the HTML content
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${this._isCreatingNew ? 'Create Agent' : 'Edit Agent'}</title>
                <link rel="stylesheet" href="${styleUri}">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}' 'unsafe-inline'; style-src ${webview.cspSource};">
            </head>
            <body>
                <div class="config-container">
                    <header class="config-header">
                        <img src="${logoUri}" alt="Codessa Logo" class="logo" />
                        <h1>${this._isCreatingNew ? 'Create New Agent' : 'Edit Agent'}</h1>
                    </header>

                    <div class="config-form">
                        <div class="form-section">
                            <h2>Basic Information</h2>
                            <div class="form-group">
                                <label for="agent-name">Name:</label>
                                <input type="text" id="agent-name" class="form-control" placeholder="Enter agent name" required />
                            </div>

                            <div class="form-group">
                                <label for="agent-description">Description:</label>
                                <textarea id="agent-description" class="form-control" placeholder="Enter agent description" rows="3"></textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2>Model Configuration</h2>
                            <div class="form-group">
                                <label for="llm-provider">LLM Provider:</label>
                                <select id="llm-provider" class="form-control">
                                    <option value="">-- Select Provider --</option>
                                </select>
                                <div class="description">Select the AI provider for this agent</div>
                            </div>

                            <div class="form-group">
                                <label for="llm-model">Model:</label>
                                <select id="llm-model" class="form-control">
                                    <option value="">-- Select Model --</option>
                                </select>
                                <div class="description">Select the model to use</div>
                            </div>

                            <div class="form-group">
                                <button id="btn-test-connection" class="btn secondary">Test Connection</button>
                                <span id="connection-status"></span>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2>Prompt & Tools</h2>
                            <div class="form-group">
                                <label for="system-prompt">System Prompt:</label>
                                <select id="system-prompt" class="form-control">
                                    <option value="">-- Select System Prompt --</option>
                                </select>
                                <div class="description">Select the system prompt that defines agent behavior</div>
                            </div>

                            <div class="form-group">
                                <label>Available Tools:</label>
                                <div id="tools-container" class="checkbox-container">
                                    <!-- Tool checkboxes will be inserted here -->
                                </div>
                                <div class="description">Select the tools this agent can use</div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h2>Advanced Settings</h2>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="is-supervisor" />
                                    This is a supervisor agent
                                </label>
                                <div class="description">Supervisor agents can orchestrate other agents</div>
                            </div>

                            <div id="chained-agents-section" class="form-group" style="display: none;">
                                <label>Chained Agents:</label>
                                <div id="chained-agents-container" class="checkbox-container">
                                    <!-- Agent checkboxes will be inserted here -->
                                </div>
                                <div class="description">Select the agents this supervisor can orchestrate</div>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button id="btn-save" class="btn primary">Save Agent</button>
                            <button id="btn-cancel" class="btn secondary">Cancel</button>
                        </div>
                    </div>
                </div>

                <script nonce="${nonce}">
                    // Initial agent data
                    const agentData = ${JSON.stringify(agentData)};
                    const isCreatingNew = ${this._isCreatingNew};
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
    /**
     * Clean up resources
     */
    dispose() {
        AgentConfigPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.AgentConfigPanel = AgentConfigPanel;
AgentConfigPanel.viewType = 'codessaAgentConfig';
//# sourceMappingURL=agentConfigPanel.js.map