// Provider settings UI logic
// Acquire VS Code API
const vscode = acquireVsCodeApi();

// State variables
let providerConfig = {};
let configFields = [];
let providerMetadata = {};
let isDefaultProvider = false;
let isTestingConnection = false;
let isRefreshingModels = false;
let availableModels = [];

// Debug logging function
function logDebug(message) {
    console.log(`[ProviderSettings] ${message}`);
    // Also send to extension for logging
    vscode.postMessage({
        command: 'log',
        level: 'debug',
        message: message
    });
}

document.addEventListener('DOMContentLoaded', () => {
    logDebug('DOM content loaded, initializing provider settings panel');

    try {
        // Set up event listeners
        setupEventListeners();

        // Request provider configuration from extension
        logDebug('Requesting provider configuration from extension');
        vscode.postMessage({ command: 'getProviderConfig' });
    } catch (error) {
        console.error('Error initializing provider settings panel:', error);
        logDebug(`Error initializing provider settings panel: ${error.message}`);
    }
});

function setupEventListeners() {
    try {
        logDebug('Setting up event listeners');

        // Get UI elements
        const btnTestConnection = document.getElementById('btn-test-connection');
        const btnSetDefault = document.getElementById('btn-set-default');
        const btnSave = document.getElementById('btn-save');
        const btnCancel = document.getElementById('btn-cancel');
        const btnRefreshModels = document.getElementById('btn-refresh-models');
        const defaultModelSelect = document.getElementById('default-model');
        const testModelSelect = document.getElementById('test-model');

        // Check if elements exist
        if (!btnTestConnection || !btnSetDefault || !btnSave || !btnCancel || !btnRefreshModels || !defaultModelSelect || !testModelSelect) {
            logDebug('Error: One or more UI elements not found');
            console.error('Missing UI elements:', {
                btnTestConnection: !!btnTestConnection,
                btnSetDefault: !!btnSetDefault,
                btnSave: !!btnSave,
                btnCancel: !!btnCancel,
                btnRefreshModels: !!btnRefreshModels,
                defaultModelSelect: !!defaultModelSelect,
                testModelSelect: !!testModelSelect
            });
            return;
        }

        // Test connection button
        btnTestConnection.addEventListener('click', () => {
            logDebug('Test connection button clicked');
            const modelId = testModelSelect.value;

            if (!modelId) {
                alert('Please select a model to test');
                return;
            }

            if (isTestingConnection) {
                return;
            }

            isTestingConnection = true;
            btnTestConnection.disabled = true;
            btnTestConnection.textContent = 'Testing...';

            vscode.postMessage({
                command: 'testConnection',
                data: {
                    modelId: modelId
                }
            });
        });

        // Default model selection
        defaultModelSelect.addEventListener('change', (e) => {
            logDebug(`Default model changed to: ${e.target.value}`);
            // Update the config
            providerConfig.defaultModel = e.target.value;

            // Also update the test model dropdown to match
            testModelSelect.value = e.target.value;
        });

        // Test model selection
        testModelSelect.addEventListener('change', (e) => {
            logDebug(`Test model changed to: ${e.target.value}`);
        });

        // Refresh models button
        btnRefreshModels.addEventListener('click', () => {
            logDebug('Refresh models button clicked');

            if (isRefreshingModels) {
                return;
            }

            isRefreshingModels = true;
            btnRefreshModels.disabled = true;
            btnRefreshModels.textContent = 'Refreshing...';

            const refreshStatus = document.getElementById('refresh-status');
            if (refreshStatus) {
                refreshStatus.textContent = 'Fetching models...';
                refreshStatus.className = '';
            }

            // Show loading state in models list
            const modelsList = document.getElementById('models-list');
            if (modelsList) {
                modelsList.innerHTML = '<div class="loading-models">Loading models...</div>';
            }

            vscode.postMessage({
                command: 'getModels'
            });
        });

        // Set as default provider button
        btnSetDefault.addEventListener('click', () => {
            logDebug('Set as default provider button clicked');

            if (isDefaultProvider) {
                alert('This provider is already set as the default');
                return;
            }

            vscode.postMessage({
                command: 'setDefaultProvider'
            });
        });

        // Save button
        btnSave.addEventListener('click', () => {
            logDebug('Save button clicked');

            // Collect values from form fields
            const config = {};

            for (const field of configFields) {
                const input = document.getElementById(`field-${field.id}`);
                if (input) {
                    let value;

                    switch (field.type) {
                        case 'boolean':
                            value = input.checked;
                            break;
                        case 'number':
                            value = parseFloat(input.value);
                            break;
                        default:
                            value = input.value.trim();
                    }

                    // Only add non-empty values
                    if (value !== '' && value !== null && value !== undefined) {
                        config[field.id] = value;
                    }
                }
            }

            // Add the default model
            const defaultModel = defaultModelSelect.value;
            if (defaultModel) {
                config.defaultModel = defaultModel;
            }

            logDebug(`Saving provider config: ${JSON.stringify(config)}`);

            vscode.postMessage({
                command: 'saveProviderConfig',
                data: config
            });
        });

        // Cancel button
        btnCancel.addEventListener('click', () => {
            logDebug('Cancel button clicked');
            vscode.postMessage({ command: 'cancel' });
        });

        logDebug('Event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        logDebug(`Error setting up event listeners: ${error.message}`);
    }
}

function renderConfigFields() {
    try {
        logDebug('Rendering configuration fields');
        const container = document.getElementById('config-fields-container');

        if (!container) {
            logDebug('Error: Configuration fields container not found');
            return;
        }

        container.innerHTML = '';

        // Filter out defaultModel field since we have a dedicated dropdown for it
        const filteredFields = configFields.filter(field => field.id !== 'defaultModel');

        // Render each configuration field
        for (const field of filteredFields) {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'form-group';

            const label = document.createElement('label');
            label.htmlFor = `field-${field.id}`;
            label.textContent = field.name + (field.required ? ' *' : '');

            let input;

            switch (field.type) {
                case 'boolean':
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.id = `field-${field.id}`;
                    input.checked = providerConfig[field.id] === true;
                    break;

                case 'number':
                    input = document.createElement('input');
                    input.type = 'number';
                    input.id = `field-${field.id}`;
                    input.className = 'form-control';
                    input.value = providerConfig[field.id] || '';
                    break;

                case 'select':
                    input = document.createElement('select');
                    input.id = `field-${field.id}`;
                    input.className = 'form-control';

                    // Add options
                    if (field.options) {
                        for (const option of field.options) {
                            const optionEl = document.createElement('option');
                            optionEl.value = option;
                            optionEl.textContent = option;
                            optionEl.selected = option === providerConfig[field.id];
                            input.appendChild(optionEl);
                        }
                    }
                    break;

                case 'string':
                default:
                    input = document.createElement('input');
                    input.type = field.id.toLowerCase().includes('key') || field.id.toLowerCase().includes('token') ? 'password' : 'text';
                    input.id = `field-${field.id}`;
                    input.className = 'form-control';
                    input.value = providerConfig[field.id] || '';
                    input.placeholder = field.description;
                    break;
            }

            // Add description
            const description = document.createElement('div');
            description.className = 'description';
            description.textContent = field.description;

            // Append elements to container
            fieldDiv.appendChild(label);
            fieldDiv.appendChild(input);
            fieldDiv.appendChild(description);
            container.appendChild(fieldDiv);
        }

        logDebug(`Rendered ${filteredFields.length} configuration fields (excluded defaultModel field)`);

        // Request models from the extension
        vscode.postMessage({ command: 'getModels' });
    } catch (error) {
        console.error('Error rendering configuration fields:', error);
        logDebug(`Error rendering configuration fields: ${error.message}`);
    }
}

/**
 * Render the models list and populate dropdowns
 */
function renderModels() {
    try {
        logDebug(`Rendering ${availableModels.length} models`);

        // Get UI elements
        const modelsList = document.getElementById('models-list');
        const defaultModelSelect = document.getElementById('default-model');
        const testModelSelect = document.getElementById('test-model');

        if (!modelsList || !defaultModelSelect || !testModelSelect) {
            logDebug('Error: Models list or select elements not found');
            return;
        }

        // Clear existing content
        modelsList.innerHTML = '';

        // Clear dropdowns but keep the first option
        defaultModelSelect.innerHTML = '<option value="">-- Select a model --</option>';
        testModelSelect.innerHTML = '<option value="">-- Select a model --</option>';

        if (availableModels.length === 0) {
            // Show no models message
            modelsList.innerHTML = '<div class="no-items">No models available. Check your configuration and try refreshing.</div>';
            return;
        }

        // Sort models by name
        availableModels.sort((a, b) => a.id.localeCompare(b.id));

        // Add models to the list and dropdowns
        for (const model of availableModels) {
            // Add to models list
            const modelItem = document.createElement('div');
            modelItem.className = 'model-item';
            modelItem.dataset.modelId = model.id;

            const modelInfo = document.createElement('div');
            modelInfo.className = 'model-info';

            const modelName = document.createElement('div');
            modelName.className = 'model-name';
            modelName.textContent = model.name || model.id;

            modelInfo.appendChild(modelName);

            if (model.description) {
                const modelDescription = document.createElement('div');
                modelDescription.className = 'model-description';
                modelDescription.textContent = model.description;
                modelInfo.appendChild(modelDescription);
            }

            if (model.contextWindow) {
                const contextWindow = document.createElement('div');
                contextWindow.className = 'model-context-window';
                contextWindow.textContent = `Context: ${model.contextWindow.toLocaleString()} tokens`;
                modelInfo.appendChild(contextWindow);
            }

            modelItem.appendChild(modelInfo);
            modelsList.appendChild(modelItem);

            // Add click handler to select this model
            modelItem.addEventListener('click', () => {
                // Update default model select
                defaultModelSelect.value = model.id;

                // Trigger change event
                const event = new Event('change');
                defaultModelSelect.dispatchEvent(event);

                // Update visual selection
                document.querySelectorAll('.model-item').forEach(item => {
                    item.classList.remove('selected');
                });
                modelItem.classList.add('selected');
            });

            // Add to dropdowns
            const defaultOption = document.createElement('option');
            defaultOption.value = model.id;
            defaultOption.textContent = model.name || model.id;
            defaultOption.selected = model.id === providerConfig.defaultModel;
            defaultModelSelect.appendChild(defaultOption);

            const testOption = document.createElement('option');
            testOption.value = model.id;
            testOption.textContent = model.name || model.id;
            testOption.selected = model.id === providerConfig.defaultModel;
            testModelSelect.appendChild(testOption);

            // If this is the default model, select it in the list
            if (model.id === providerConfig.defaultModel) {
                modelItem.classList.add('selected');
            }
        }

        logDebug(`Added ${availableModels.length} models to UI`);

        // Reset refresh button
        const btnRefreshModels = document.getElementById('btn-refresh-models');
        const refreshStatus = document.getElementById('refresh-status');

        if (btnRefreshModels) {
            btnRefreshModels.disabled = false;
            btnRefreshModels.textContent = 'Refresh Models';
        }

        if (refreshStatus) {
            refreshStatus.textContent = `${availableModels.length} models available`;
            refreshStatus.className = 'success';

            // Clear the status after a few seconds
            setTimeout(() => {
                if (refreshStatus) {
                    refreshStatus.textContent = '';
                    refreshStatus.className = '';
                }
            }, 5000);
        }

        isRefreshingModels = false;
    } catch (error) {
        console.error('Error rendering models:', error);
        logDebug(`Error rendering models: ${error.message}`);

        // Reset UI state
        isRefreshingModels = false;

        const btnRefreshModels = document.getElementById('btn-refresh-models');
        const refreshStatus = document.getElementById('refresh-status');

        if (btnRefreshModels) {
            btnRefreshModels.disabled = false;
            btnRefreshModels.textContent = 'Refresh Models';
        }

        if (refreshStatus) {
            refreshStatus.textContent = `Error: ${error.message}`;
            refreshStatus.className = 'error';
        }
    }
}

function updateProviderInfo() {
    try {
        logDebug('Updating provider information');

        // Update provider display name
        const displayNameEl = document.getElementById('provider-display-name');
        if (displayNameEl && providerMetadata.displayName) {
            displayNameEl.textContent = providerMetadata.displayName;
        }

        // Update provider description
        const descriptionEl = document.getElementById('provider-description');
        if (descriptionEl && providerMetadata.description) {
            descriptionEl.textContent = providerMetadata.description;
        }

        // Update provider website
        const websiteEl = document.getElementById('provider-website');
        if (websiteEl && providerMetadata.website) {
            websiteEl.innerHTML = `<a href="${providerMetadata.website}" target="_blank">${providerMetadata.website}</a>`;
        }

        // Update default provider status
        const btnSetDefault = document.getElementById('btn-set-default');
        const defaultStatus = document.getElementById('default-status');

        if (btnSetDefault && defaultStatus) {
            if (isDefaultProvider) {
                btnSetDefault.disabled = true;
                defaultStatus.textContent = '✓ This is the default provider';
                defaultStatus.className = 'success';
            } else {
                btnSetDefault.disabled = false;
                defaultStatus.textContent = '';
                defaultStatus.className = '';
            }
        }

        logDebug('Provider information updated');
    } catch (error) {
        console.error('Error updating provider information:', error);
        logDebug(`Error updating provider information: ${error.message}`);
    }
}

// Handle messages from the extension
window.addEventListener('message', event => {
    try {
        const message = event.data;
        logDebug(`Received message from extension: ${message.type}`);

        switch (message.type) {
            case 'providerConfig':
                providerConfig = message.config || {};
                configFields = message.fields || [];
                providerMetadata = message.metadata || {};
                isDefaultProvider = message.isDefault || false;

                renderConfigFields();
                updateProviderInfo();
                break;

            case 'models':
                isRefreshingModels = false;
                availableModels = message.models || [];
                logDebug(`Received ${availableModels.length} models from extension`);
                renderModels();
                break;

            case 'connectionTestResult':
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
                if (message.success) {
                    alert(message.message || 'Configuration saved successfully');
                } else {
                    alert('Error: ' + (message.message || 'Failed to save configuration'));
                }
                break;

            case 'setDefaultResult':
                if (message.success) {
                    isDefaultProvider = true;
                    updateProviderInfo();
                    alert(message.message || 'Provider set as default successfully');
                } else {
                    alert('Error: ' + (message.message || 'Failed to set provider as default'));
                }
                break;

            case 'error':
                // Reset any loading states
                isTestingConnection = false;
                isRefreshingModels = false;

                // Reset UI elements
                const btnRefresh = document.getElementById('btn-refresh-models');
                if (btnRefresh) {
                    btnRefresh.disabled = false;
                    btnRefresh.textContent = 'Refresh Models';
                }

                const refreshStatus = document.getElementById('refresh-status');
                if (refreshStatus) {
                    refreshStatus.textContent = `Error: ${message.message}`;
                    refreshStatus.className = 'error';
                }

                alert('Error: ' + message.message);
                break;

            default:
                logDebug(`Received unknown message type: ${message.type}`);
        }
    } catch (error) {
        console.error('Error handling message from extension:', error);
        logDebug(`Error handling message from extension: ${error.message}`);
    }
});
