// toolPicker.js
// UI for picking tools and their sub-actions for workflow steps

// Fetch tools and actions from the VS Code extension
function fetchAvailableTools() {
    return new Promise((resolve) => {
        window.addEventListener('message', event => {
            if (event.data.type === 'availableToolsWithActions') {
                resolve(event.data.tools);
            }
        }, { once: true });
        // Request tools from extension
        vscode.postMessage({ command: 'getAvailableToolsWithActions' });
    });
}

// Recursively find a tool/action object by dot notation id
function findToolById(tools, id) {
    const parts = id.split('.');
    let current = null;
    let actions = tools;
    for (const part of parts) {
        if (Array.isArray(actions)) {
            current = actions.find(t => t.id === part);
            actions = current && current.actions ? Object.values(current.actions) : null;
        } else if (actions && typeof actions === 'object') {
            current = actions[part];
            actions = current && current.actions ? Object.values(current.actions) : null;
        } else {
            return null;
        }
    }
    return current;
}

// Render a hierarchical tool/action picker
function renderToolPicker(containerId, onSelect) {
    fetchAvailableTools().then(tools => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'tool-picker-list';
        tools.forEach(tool => {
            const li = document.createElement('li');
            li.textContent = tool.name;
            li.title = tool.description;
            li.className = 'tool-picker-tool';
            if (tool.actions && Object.keys(tool.actions).length > 0) {
                const subUl = document.createElement('ul');
                subUl.className = 'tool-picker-sublist';
                Object.entries(tool.actions).forEach(([subId, subTool]) => {
                    const subLi = document.createElement('li');
                    subLi.textContent = subTool.name || subId;
                    subLi.title = subTool.description || '';
                    subLi.className = 'tool-picker-action';
                    subLi.onclick = () => onSelect(`${tool.id}.${subId}`, subTool);
                    subUl.appendChild(subLi);
                });
                li.appendChild(subUl);
            } else {
                li.onclick = () => onSelect(tool.id, tool);
            }
            ul.appendChild(li);
        });
        container.appendChild(ul);
    });
}

// Expose for usage in workflow.js
window.renderToolPicker = renderToolPicker;
window.findToolById = findToolById;
