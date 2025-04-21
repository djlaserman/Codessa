// Agent configuration UI logic
// Acquire VS Code API
const vscode = acquireVsCodeApi();

// State variables
let loadedProviders = [];
let modelsByProvider = {};
let selectedProvider = '';
let selectedModel = '';
let isTestingConnection = false;

// Debug logging function
function logDebug(message) {
    console.log(`[AgentConfig] ${message}`);
    // Also send to extension for logging
    vscode.postMessage({
        command: 'log',
        level: 'debug',
        message: message
    });
}

document.addEventListener('DOMContentLoaded', () => {
    logDebug('DOM content loaded, initializing agent config panel');

    try {
        // Initialize form with agent data if available
        if (typeof agentData !== 'undefined' && agentData) {
            logDebug(`Initializing form with agent data: ${JSON.stringify(agentData)}`);
            document.getElementById('agent-name').value = agentData.name || '';
            document.getElementById('agent-description').value = agentData.description || '';
            document.getElementById('is-supervisor').checked = agentData.isSupervisor || false;
            selectedProvider = agentData.llm?.provider || '';
            selectedModel = agentData.llm?.modelId || '';

            // Show/hide chained agents section based on supervisor status
            const chainedAgentsSection = document.getElementById('chained-agents-section');
            if (chainedAgentsSection) {
                chainedAgentsSection.style.display = agentData.isSupervisor ? 'block' : 'none';
            }
        } else {
            logDebug('No agent data available, initializing empty form');
        }

        // Set up event listeners
        setupEventListeners();

        // Load data from extension
        logDebug('Requesting available models from extension');
        vscode.postMessage({ command: 'getAvailableModels' });

        logDebug('Requesting available prompts from extension');
        vscode.postMessage({ command: 'getAvailablePrompts' });

        logDebug('Requesting available tools from extension');
        vscode.postMessage({ command: 'getAvailableTools' });

        // If supervisor, load available agents for chaining
        if (document.getElementById('is-supervisor').checked) {
            logDebug('Requesting available agents from extension');
            vscode.postMessage({ command: 'getAvailableAgents' });
        }
    } catch (error) {
        console.error('Error initializing agent config panel:', error);
        logDebug(`Error initializing agent config panel: ${error.message}`);
    }
});

function setupEventListeners() {
    try {
        logDebug('Setting up event listeners');

        // Get UI elements
        const providerSelect = document.getElementById('llm-provider');
        const modelSelect = document.getElementById('llm-model');
        const btnTestConnection = document.getElementById('btn-test-connection');
        const btnSave = document.getElementById('btn-save');
        const btnCancel = document.getElementById('btn-cancel');
        const isSupervisor = document.getElementById('is-supervisor');
        const chainedAgentsSection = document.getElementById('chained-agents-section');

        // Check if elements exist
        if (!providerSelect || !modelSelect || !btnTestConnection || !btnSave || !isSupervisor || !chainedAgentsSection) {
            logDebug('Error: One or more UI elements not found');
            console.error('Missing UI elements:', {
                providerSelect: !!providerSelect,
                modelSelect: !!modelSelect,
                btnTestConnection: !!btnTestConnection,
                btnSave: !!btnSave,
                isSupervisor: !!isSupervisor,
                chainedAgentsSection: !!chainedAgentsSection
            });
            return;
        }

        // Provider selection
        providerSelect.addEventListener('change', (e) => {
            logDebug(`Provider changed to: ${e.target.value}`);
            selectedProvider = e.target.value;
            updateModelSelect();
        });

        // Model selection
        modelSelect.addEventListener('change', (e) => {
            logDebug(`Model changed to: ${e.target.value}`);
            selectedModel = e.target.value;
            updateTestButton();
        });

        // Test connection
        btnTestConnection.addEventListener('click', async () => {
            if (!selectedProvider || !selectedModel || isTestingConnection) {
                logDebug('Test connection button clicked but validation failed');
                return;
            }

            logDebug(`Testing connection for provider: ${selectedProvider}, model: ${selectedModel}`);
            isTestingConnection = true;
            btnTestConnection.disabled = true;
            btnTestConnection.textContent = 'Testing...';

            vscode.postMessage({
                command: 'testConnection',
                data: {
                    provider: selectedProvider,
                    modelId: selectedModel
                }
            });
        });

        // Supervisor toggle
        isSupervisor.addEventListener('change', (e) => {
            logDebug(`Supervisor toggle changed to: ${e.target.checked}`);
            chainedAgentsSection.style.display = e.target.checked ? 'block' : 'none';
            if (e.target.checked) {
                logDebug('Requesting available agents for supervisor');
                vscode.postMessage({ command: 'getAvailableAgents' });
            }
        });

        // Save button
        btnSave.addEventListener('click', () => {
            logDebug('Save button clicked');
            const name = document.getElementById('agent-name').value.trim();
            const description = document.getElementById('agent-description').value.trim();
            const systemPrompt = document.getElementById('system-prompt').value;
            const isSupervisor = document.getElementById('is-supervisor').checked;

            logDebug(`Validating form data: name=${name}, systemPrompt=${systemPrompt}, provider=${selectedProvider}, model=${selectedModel}`);

            // Basic validation
            if (!name) {
                logDebug('Validation failed: Agent name is required');
                alert('Agent name is required');
                return;
            }

            if (!selectedProvider || !selectedModel) {
                logDebug('Validation failed: Provider and model are required');
                alert('Please select a provider and model');
                return;
            }

            if (!systemPrompt) {
                logDebug('Validation failed: System prompt is required');
                alert('Please select a system prompt');
                return;
            }

            // Get selected tools
            const toolCheckboxes = document.querySelectorAll('#tools-container input[type="checkbox"]:checked');
            const selectedTools = Array.from(toolCheckboxes).map(cb => cb.value);
            logDebug(`Selected tools: ${selectedTools.join(', ')}`);

            // Get chained agents if supervisor
            let chainedAgentIds = [];
            if (isSupervisor) {
                const agentCheckboxes = document.querySelectorAll('#chained-agents-container input[type="checkbox"]:checked');
                chainedAgentIds = Array.from(agentCheckboxes).map(cb => cb.value);
                logDebug(`Selected chained agents: ${chainedAgentIds.join(', ')}`);
            }

            // Prepare data for saving
            const agentData = {
                name,
                description,
                systemPromptName: systemPrompt,
                llm: {
                    provider: selectedProvider,
                    modelId: selectedModel
                },
                tools: selectedTools,
                isSupervisor,
                chainedAgentIds
            };

            logDebug(`Sending saveAgent command with data: ${JSON.stringify(agentData)}`);
            vscode.postMessage({
                command: 'saveAgent',
                data: agentData
            });
        });

        // Cancel button
        if (btnCancel) {
            btnCancel.addEventListener('click', () => {
                logDebug('Cancel button clicked');
                vscode.postMessage({ command: 'cancel' });
            });
        }

        logDebug('Event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        logDebug(`Error setting up event listeners: ${error.message}`);
    }
}

function updateModelSelect() {
    const modelSelect = document.getElementById('llm-model');
    modelSelect.innerHTML = '<option value="">-- Select Model --</option>';

    if (selectedProvider && modelsByProvider[selectedProvider]) {
        modelsByProvider[selectedProvider].forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;

            // Use the model name if available, otherwise use the ID
            const displayName = model.name || model.id;
            option.textContent = displayName;

            // Add description as title attribute for tooltip
            if (model.description) {
                option.title = model.description;
            }

            // Add context window info if available
            if (model.contextWindow) {
                option.title = `${option.title || displayName} - Context: ${model.contextWindow.toLocaleString()} tokens`;
            }

            option.selected = model.id === selectedModel;
            modelSelect.appendChild(option);
        });
        modelSelect.disabled = false;
    } else {
        modelSelect.disabled = true;
    }

    updateTestButton();
}

function updateTestButton() {
    const btnTestConnection = document.getElementById('btn-test-connection');
    btnTestConnection.disabled = !selectedProvider || !selectedModel || isTestingConnection;
}

// Handle messages from the extension
window.addEventListener('message', event => {
    try {
        const message = event.data;
        logDebug(`Received message from extension: ${message.type}`);

        switch (message.type) {
            case 'availableModels':
                logDebug(`Received ${message.providers?.length || 0} providers and models data`);
                loadedProviders = message.providers || [];
                modelsByProvider = message.modelsByProvider || {};

                // Update provider select
                const providerSelect = document.getElementById('llm-provider');
                if (!providerSelect) {
                    logDebug('Error: Provider select element not found');
                    return;
                }

                providerSelect.innerHTML = '<option value="">-- Select Provider --</option>';

                loadedProviders.forEach(providerId => {
                    const option = document.createElement('option');
                    option.value = providerId;
                    option.textContent = providerId;
                    option.selected = providerId === selectedProvider;
                    providerSelect.appendChild(option);
                });

                logDebug(`Added ${loadedProviders.length} providers to dropdown`);

                // Update model select if provider is selected
                if (selectedProvider) {
                    updateModelSelect();
                }
                break;

            case 'availablePrompts':
                logDebug(`Received ${message.prompts?.length || 0} system prompts`);
                const promptSelect = document.getElementById('system-prompt');
                if (!promptSelect) {
                    logDebug('Error: System prompt select element not found');
                    return;
                }

                promptSelect.innerHTML = '<option value="">-- Select System Prompt --</option>';

                if (message.prompts && message.prompts.length > 0) {
                    message.prompts.forEach(prompt => {
                        const option = document.createElement('option');
                        option.value = prompt.name;
                        option.textContent = prompt.name;
                        option.title = prompt.description;
                        option.selected = prompt.name === agentData?.systemPromptName;
                        promptSelect.appendChild(option);
                    });
                    logDebug(`Added ${message.prompts.length} prompts to dropdown`);
                } else {
                    logDebug('No prompts received from extension');
                }
                break;

            case 'availableTools':
                logDebug(`Received ${message.tools?.length || 0} tools`);
                const toolsContainer = document.getElementById('tools-container');
                if (!toolsContainer) {
                    logDebug('Error: Tools container element not found');
                    return;
                }

                toolsContainer.innerHTML = '';

                const selectedTools = new Set(agentData?.tools || []);

                if (message.tools && message.tools.length > 0) {
                    message.tools.forEach(tool => {
                        const div = document.createElement('div');
                        div.className = 'tool-item';

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `tool-${tool.id}`;
                        checkbox.value = tool.id;
                        checkbox.checked = selectedTools.has(tool.id);

                        const label = document.createElement('label');
                        label.htmlFor = `tool-${tool.id}`;
                        label.textContent = tool.name;
                        label.title = tool.description;

                        div.appendChild(checkbox);
                        div.appendChild(label);
                        toolsContainer.appendChild(div);
                    });
                    logDebug(`Added ${message.tools.length} tools to container`);
                } else {
                    logDebug('No tools received from extension');
                    toolsContainer.innerHTML = '<div class="no-items">No tools available</div>';
                }
                break;

            case 'availableAgents':
                logDebug(`Received ${message.agents?.length || 0} agents`);
                const chainedAgentsContainer = document.getElementById('chained-agents-container');
                if (!chainedAgentsContainer) {
                    logDebug('Error: Chained agents container element not found');
                    return;
                }

                chainedAgentsContainer.innerHTML = '';

                const selectedAgents = new Set(agentData?.chainedAgentIds || []);

                if (message.agents && message.agents.length > 0) {
                    message.agents.forEach(agent => {
                        const div = document.createElement('div');
                        div.className = 'agent-item';

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `agent-${agent.id}`;
                        checkbox.value = agent.id;
                        checkbox.checked = selectedAgents.has(agent.id);

                        const label = document.createElement('label');
                        label.htmlFor = `agent-${agent.id}`;
                        label.textContent = agent.name;
                        label.title = agent.description;

                        div.appendChild(checkbox);
                        div.appendChild(label);
                        chainedAgentsContainer.appendChild(div);
                    });
                    logDebug(`Added ${message.agents.length} agents to container`);
                } else {
                    logDebug('No agents received from extension');
                    chainedAgentsContainer.innerHTML = '<div class="no-items">No other agents available</div>';
                }
                break;

            case 'connectionTestResult':
                logDebug(`Received connection test result: ${message.success ? 'success' : 'failure'}`);
                isTestingConnection = false;
                const btnTest = document.getElementById('btn-test-connection');
                const statusSpan = document.getElementById('connection-status');

                if (!btnTest || !statusSpan) {
                    logDebug('Error: Test connection button or status span not found');
                    return;
                }

                btnTest.disabled = false;
                btnTest.textContent = 'Test Connection';

                if (message.success) {
                    statusSpan.textContent = '✓ ' + message.message;
                    statusSpan.className = 'success';
                } else {
                    statusSpan.textContent = '✗ ' + message.message;
                    statusSpan.className = 'error';
                }
                setTimeout(() => {
                    statusSpan.textContent = '';
                    statusSpan.className = '';
                }, 5000);
                break;

            case 'saveResult':
                logDebug(`Received save result: ${message.success ? 'success' : 'failure'}`);
                if (message.success) {
                    // Show success message
                    const successMessage = message.message || 'Agent saved successfully';
                    alert(successMessage);

                    // Close panel or update UI as needed
                    const btnCancel = document.getElementById('btn-cancel');
                    if (btnCancel) {
                        btnCancel.click();
                    }
                } else {
                    // Show error message
                    const errorMessage = message.message || 'Failed to save agent';
                    alert(`Error: ${errorMessage}`);
                }
                break;

            case 'error':
                logDebug(`Received error message: ${message.message}`);
                alert(`Error: ${message.message}`);
                break;

            default:
                logDebug(`Received unknown message type: ${message.type}`);
        }
    } catch (error) {
        console.error('Error handling message from extension:', error);
        logDebug(`Error handling message from extension: ${error.message}`);
    }
});