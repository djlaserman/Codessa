/**
 * Codessa Mode Selector Interface
 * 
 * Handles the interactive functionality of the mode selector UI
 */

// Initialize VS Code API
const vscode = acquireVsCodeApi();

// DOM Elements
const modesGrid = document.getElementById('modes-grid');

// Initialize UI with available modes
function initializeModeSelector() {
    if (modes && modes.length > 0) {
        modes.forEach(mode => addModeToUI(mode));
    } else {
        // Show message if no modes are available
        modesGrid.innerHTML = '<div class="no-modes">No operation modes available</div>';
    }
}

// Add a mode to the UI
function addModeToUI(mode) {
    const modeElement = document.createElement('div');
    modeElement.className = 'mode-card';
    modeElement.dataset.modeId = mode.id;
    
    // Create icon element
    const iconElement = document.createElement('div');
    iconElement.className = 'mode-icon';
    iconElement.innerHTML = mode.icon.replace('$(', '<i class="codicon codicon-').replace(')', '"></i>');
    
    // Create content element
    const contentElement = document.createElement('div');
    contentElement.className = 'mode-content';
    
    // Create title element
    const titleElement = document.createElement('h3');
    titleElement.className = 'mode-title';
    titleElement.textContent = mode.displayName;
    
    // Create description element
    const descriptionElement = document.createElement('p');
    descriptionElement.className = 'mode-description';
    descriptionElement.textContent = mode.description;
    
    // Create features element
    const featuresElement = document.createElement('div');
    featuresElement.className = 'mode-features';
    
    // Add features
    if (mode.requiresHumanVerification) {
        const verificationFeature = document.createElement('span');
        verificationFeature.className = 'mode-feature verification';
        verificationFeature.innerHTML = '<i class="codicon codicon-verified"></i> Human verification';
        featuresElement.appendChild(verificationFeature);
    }
    
    if (mode.supportsMultipleAgents) {
        const multiAgentFeature = document.createElement('span');
        multiAgentFeature.className = 'mode-feature multi-agent';
        multiAgentFeature.innerHTML = '<i class="codicon codicon-organization"></i> Multi-agent';
        featuresElement.appendChild(multiAgentFeature);
    }
    
    // Assemble the mode card
    contentElement.appendChild(titleElement);
    contentElement.appendChild(descriptionElement);
    contentElement.appendChild(featuresElement);
    
    modeElement.appendChild(iconElement);
    modeElement.appendChild(contentElement);
    
    // Add click event listener
    modeElement.addEventListener('click', () => {
        selectMode(mode.id);
    });
    
    // Add to the grid
    modesGrid.appendChild(modeElement);
}

// Select a mode
function selectMode(modeId) {
    vscode.postMessage({
        command: 'selectMode',
        modeId: modeId
    });
}

// Initialize UI
initializeModeSelector();
