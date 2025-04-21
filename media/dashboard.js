// Dashboard JavaScript
(function() {
    // Get VS Code API
    let vscode;
    try {
        vscode = acquireVsCodeApi();
        console.log('VS Code API acquired successfully');
    } catch (error) {
        console.error('Failed to acquire VS Code API:', error);
        // Provide a mock vscode API for testing
        vscode = {
            postMessage: function(message) {
                console.log('Mock postMessage:', message);
            }
        };
    }

    // Initialize dashboard when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initDashboard();
    });

    function initDashboard() {
        // Update timestamp
        updateTimestamp();

        // Render lists
        renderAgentsList();
        renderProvidersList();
        renderToolsList();

        // Set up event listeners
        setupEventListeners();
    }

    function updateTimestamp() {
        const timestampElement = document.getElementById('timestamp');
        if (timestampElement && dashboardData.timestamp) {
            const date = new Date(dashboardData.timestamp);
            timestampElement.textContent = formatDate(date);
        }
    }

    function formatDate(date) {
        return date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function renderAgentsList() {
        const agentsList = document.getElementById('agents-list');
        if (!agentsList || !dashboardData.agents || dashboardData.agents.total === 0) {
            return;
        }

        // Clear existing content
        agentsList.innerHTML = '';

        // Add agents
        dashboardData.agents.list.forEach(agent => {
            const agentElement = document.createElement('div');
            agentElement.className = 'agent-item';
            agentElement.dataset.agentId = agent.id;

            agentElement.innerHTML = `
                <div class="agent-header">
                    <h3 class="agent-name">${agent.name}</h3>
                    ${agent.isSupervisor ? '<span class="agent-badge supervisor">Supervisor</span>' : ''}
                </div>
                <div class="agent-details">
                    <p class="agent-description">${agent.description || 'No description'}</p>
                    <div class="agent-meta">
                        <span class="agent-model">${agent.provider}/${agent.model}</span>
                        <span class="agent-tools">${agent.toolCount} tools</span>
                    </div>
                </div>
            `;

            agentsList.appendChild(agentElement);
        });
    }

    function renderProvidersList() {
        const providerList = document.getElementById('provider-list');
        if (!providerList || !dashboardData.providers) {
            return;
        }

        // Clear existing content
        providerList.innerHTML = '';

        // Add configure button
        const configureButton = document.createElement('button');
        configureButton.id = 'btn-configure-providers';
        configureButton.className = 'btn secondary';
        configureButton.innerHTML = '<span style="font-family: \'codicon\'; font-size: 14px;">&#xeb52;</span> Configure Providers';
        configureButton.addEventListener('click', () => {
            vscode.postMessage({ command: 'openProviderSettings' });
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'card-actions';
        buttonContainer.appendChild(configureButton);
        providerList.appendChild(buttonContainer);

        // Add providers
        dashboardData.providers.list.forEach(provider => {
            const providerElement = document.createElement('div');
            providerElement.className = `provider-item ${provider.configured ? 'configured' : 'not-configured'}`;

            providerElement.innerHTML = `
                <div class="provider-status">
                    <span class="status-dot"></span>
                </div>
                <div class="provider-info">
                    <span class="provider-name">${provider.id}</span>
                    <span class="provider-status-text">${provider.configured ? 'Configured' : 'Not Configured'}</span>
                </div>
                ${provider.isDefault ? '<span class="provider-badge default">Default</span>' : ''}
            `;

            // Make provider items clickable to configure them
            providerElement.addEventListener('click', () => {
                vscode.postMessage({
                    command: 'openProviderSettings',
                    providerId: provider.id
                });
            });

            providerList.appendChild(providerElement);
        });
    }

    function renderToolsList() {
        const toolsList = document.getElementById('tools-list');
        if (!toolsList || !dashboardData.tools) {
            return;
        }

        // Clear existing content
        toolsList.innerHTML = '';

        // Add tools
        dashboardData.tools.list.forEach(tool => {
            const toolElement = document.createElement('div');
            toolElement.className = 'tool-item';

            toolElement.innerHTML = `
                <div class="tool-info">
                    <span class="tool-name">${tool.name}</span>
                    <span class="tool-description">${tool.description || 'No description'}</span>
                </div>
            `;

            toolsList.appendChild(toolElement);
        });
    }

    function setupEventListeners() {
        // Refresh button
        const refreshButton = document.getElementById('btn-refresh');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'refresh' });
            });
        }

        // Settings button
        const settingsButton = document.getElementById('btn-settings');
        if (settingsButton) {
            settingsButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'openSettings' });
            });
        }

        // Logs button
        const logsButton = document.getElementById('btn-logs');
        if (logsButton) {
            logsButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'showLogs' });
            });
        }

        // Create agent button
        const createAgentButton = document.getElementById('btn-create-agent');
        if (createAgentButton) {
            createAgentButton.addEventListener('click', () => {
                vscode.postMessage({ command: 'createAgent' });
            });
        }

        // Agent items
        const agentItems = document.querySelectorAll('.agent-item');
        agentItems.forEach(item => {
            item.addEventListener('click', () => {
                const agentId = item.dataset.agentId;
                if (agentId) {
                    vscode.postMessage({
                        command: 'openAgent',
                        agentId: agentId
                    });
                }
            });
        });
    }
})();
