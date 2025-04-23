// Workflow UI JavaScript

// In-memory workflow steps for new workflow creation
const workflowSteps = [];
// List of saved workflows for display
let workflows = [];

// Initialize when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Request workflows from extension
    vscode.postMessage({ command: 'getWorkflows' });

    // Add event listeners for buttons
    document.getElementById('create-workflow').addEventListener('click', () => {
        vscode.postMessage({
            command: 'createWorkflow'
        });
    });

    document.getElementById('create-langgraph-workflow').addEventListener('click', () => {
        vscode.postMessage({
            command: 'createLangGraphWorkflow'
        });
    });

    document.getElementById('refresh-workflows').addEventListener('click', () => {
        vscode.postMessage({
            command: 'refreshWorkflows'
        });
    });

    // Add tool picker open button
    const header = document.querySelector('.header .actions');
    if (header) {
        const toolPickerBtn = document.createElement('button');
        toolPickerBtn.id = 'open-tool-picker';
        toolPickerBtn.className = 'secondary-button';
        toolPickerBtn.textContent = 'Add Tool to Step';
        header.appendChild(toolPickerBtn);
        toolPickerBtn.addEventListener('click', () => {
            // Show tool picker in container
            const container = document.getElementById('tool-picker-container');
            if (container) {
                container.style.display = 'block';
                window.renderToolPicker('tool-picker-container', (toolActionId, toolActionObj) => {
                    // Prompt for parameters if inputSchema exists
                    const inputSchema = toolActionObj && toolActionObj.inputSchema;
                    if (inputSchema && inputSchema.properties) {
                        renderParameterForm(toolActionId, inputSchema, params => {
                            workflowSteps.push({ toolActionId, params });
                            renderWorkflowSteps();
                            container.style.display = 'none';
                        });
                    } else {
                        workflowSteps.push({ toolActionId });
                        renderWorkflowSteps();
                        container.style.display = 'none';
                    }
                });
            }
        });
    }
});

// Render a parameter input form for a tool/action
function renderParameterForm(toolActionId, inputSchema, onSubmit) {
    let form = document.getElementById('tool-parameter-form');
    if (form) form.remove();
    form = document.createElement('form');
    form.id = 'tool-parameter-form';
    form.className = 'tool-parameter-form';
    const title = document.createElement('h4');
    title.textContent = `Configure parameters for: ${toolActionId}`;
    form.appendChild(title);
    const fields = [];
    for (const [key, prop] of Object.entries(inputSchema.properties)) {
        const label = document.createElement('label');
        label.textContent = key;
        label.htmlFor = `param-${key}`;
        let input;
        if (prop.type === 'boolean') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `param-${key}`;
        } else if (prop.type === 'number' || prop.type === 'integer') {
            input = document.createElement('input');
            input.type = 'number';
            input.id = `param-${key}`;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.id = `param-${key}`;
        }
        input.name = key;
        if (inputSchema.required && inputSchema.required.includes(key)) {
            input.required = true;
        }
        label.appendChild(input);
        form.appendChild(label);
        fields.push({ key, input, type: prop.type });
        form.appendChild(document.createElement('br'));
    }
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Add Step';
    form.appendChild(submitBtn);
    form.onsubmit = e => {
        e.preventDefault();
        const params = {};
        fields.forEach(({ key, input, type }) => {
            if (type === 'boolean') {
                params[key] = input.checked;
            } else if (type === 'number' || type === 'integer') {
                params[key] = input.value ? Number(input.value) : undefined;
            } else {
                params[key] = input.value;
            }
        });
        onSubmit(params);
        form.remove();
    };
    // Insert form before steps list
    let stepsList = document.getElementById('workflow-steps-list');
    if (stepsList && stepsList.parentNode) {
        stepsList.parentNode.insertBefore(form, stepsList);
    } else {
        document.body.appendChild(form);
    }
}
// Render the current workflow steps (for new workflow creation)
function renderWorkflowSteps() {
    let stepsList = document.getElementById('workflow-steps-list');
    if (!stepsList) {
        stepsList = document.createElement('ul');
        stepsList.id = 'workflow-steps-list';
        stepsList.className = 'workflow-steps-list';
        const container = document.getElementById('tool-picker-container');
        if (container) {
            container.parentNode.insertBefore(stepsList, container.nextSibling);
        }
    }
    stepsList.innerHTML = '';
    if (workflowSteps.length === 0) {
        stepsList.innerHTML = '<li class="empty-step">No steps yet. Use "Add Tool to Step".</li>';
    } else {
        // Add Save Workflow button if not already present
        let saveBtn = document.getElementById('save-workflow-btn');
        if (!saveBtn) {
            saveBtn = document.createElement('button');
            saveBtn.id = 'save-workflow-btn';
            saveBtn.className = 'primary-button';
            saveBtn.textContent = 'Save Workflow';
            saveBtn.onclick = () => {
                const name = prompt('Enter a name for your workflow:');
                if (!name) return;
                vscode.postMessage({
                    command: 'saveWorkflow',
                    workflow: {
                        name,
                        steps: workflowSteps
                    }
                });
                alert('Workflow saved!');
                // Refresh workflows list
                vscode.postMessage({ command: 'getWorkflows' });
            };
            stepsList.parentNode.insertBefore(saveBtn, stepsList.nextSibling);
        }
    }
    workflowSteps.forEach((step, idx) => {
        const li = document.createElement('li');
        li.className = 'workflow-step-item';
        // Step label
        let label = `${idx + 1}. ${step.toolActionId}`;
        if (step.params && Object.keys(step.params).length > 0) {
            label += ' (' + Object.entries(step.params).map(([k, v]) => `${k}: ${v}`).join(', ') + ')';
        }
        li.textContent = label;
        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.className = 'remove-step-btn';
        removeBtn.title = 'Remove step';
        removeBtn.onclick = e => {
            e.stopPropagation();
            workflowSteps.splice(idx, 1);
            renderWorkflowSteps();
        };
        li.appendChild(removeBtn);
        // Up button
        if (idx > 0) {
            const upBtn = document.createElement('button');
            upBtn.textContent = '↑';
            upBtn.className = 'move-step-btn';
            upBtn.title = 'Move step up';
            upBtn.onclick = e => {
                e.stopPropagation();
                const tmp = workflowSteps[idx - 1];
                workflowSteps[idx - 1] = workflowSteps[idx];
                workflowSteps[idx] = tmp;
                renderWorkflowSteps();
            };
            li.appendChild(upBtn);
        }
        // Down button
        if (idx < workflowSteps.length - 1) {
            const downBtn = document.createElement('button');
            downBtn.textContent = '↓';
            downBtn.className = 'move-step-btn';
            downBtn.title = 'Move step down';
        }

        // Render workflows
        function renderWorkflows() {
            const workflowList = document.getElementById('workflow-list');
            if (!workflowList) return;

            if (workflows.length === 0) {
                workflowList.innerHTML = `
            <div class="empty-state">
                <p>No workflows available.</p>
                <p>Click "Create Workflow" to create a new workflow.</p>
            </div>
        `;
                return;
            }
            const workflowsHtml = [];
            for (const workflow of workflows) {
                const isLangGraph = workflow.engine === 'langgraph';
                workflowsHtml.push(`
            <div class="workflow-item ${isLangGraph ? 'langgraph' : ''}" data-id="${workflow.id}">
                <div class="workflow-header">
                    <div class="workflow-title">${workflow.name}</div>
                    <div class="workflow-actions">
                        <button class="run-workflow" data-id="${workflow.id}" data-engine="${isLangGraph ? 'langgraph' : 'original'}">Run</button>
                        <button class="edit-workflow" data-id="${workflow.id}" data-engine="${isLangGraph ? 'langgraph' : 'original'}">Edit</button>
                        <button class="delete-workflow" data-id="${workflow.id}" data-engine="${isLangGraph ? 'langgraph' : 'original'}">Delete</button>
                    </div>
                </div>
                <div class="workflow-description">${workflow.description}</div>
                <div class="workflow-details">
                    <div>Version: ${workflow.version}</div>
                    <div>Steps: ${Array.isArray(workflow.steps) ? workflow.steps.length : (Array.isArray(workflow.nodes) ? workflow.nodes.length : 0)}</div>
                    ${isLangGraph ? '<div class="engine-badge">LangGraph</div>' : ''}
                </div>
            </div>
        `);
            }
            workflowList.innerHTML = workflowsHtml.join('');

            // Add event listeners
            document.querySelectorAll('.run-workflow').forEach(button => {
                button.addEventListener('click', (e) => {
                    const workflowId = e.target.getAttribute('data-id');
                    const engine = e.target.getAttribute('data-engine');
                    vscode.postMessage({
                        command: 'runWorkflow',
                        workflowId,
                        engine
                    });
                });
            });

            document.querySelectorAll('.edit-workflow').forEach(button => {
                button.addEventListener('click', (e) => {
                    const workflowId = e.target.getAttribute('data-id');
                    const engine = e.target.getAttribute('data-engine');
                    vscode.postMessage({
                        command: 'editWorkflow',
                        workflowId,
                        engine
                    });
                });
            });

            document.querySelectorAll('.delete-workflow').forEach(button => {
                button.addEventListener('click', (e) => {
                    const workflowId = e.target.getAttribute('data-id');
                    const engine = e.target.getAttribute('data-engine');
                    vscode.postMessage({
                        command: 'deleteWorkflow',
                        workflowId,
                        engine
                    });
                });
            });
        }
    });

}


