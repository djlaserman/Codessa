// Workflows section logic and rendering

// Utility to ensure parseInt always gets a string
function safeGetString(val: string | null | undefined): string {
    return typeof val === 'string' ? val : '';
}

export type Workflow = {
    name: string;
    description: string;
    steps: string[];
    enabled: boolean;
};

let workflows: Workflow[] = [];
let editingWorkflowIdx: number | null = null;

export function renderWorkflowsSection(container: HTMLElement, settings: any) {
    // Sync from settings
    workflows = Array.isArray(settings.workflows) ? settings.workflows : [];
    renderWorkflowsTable(container);
    // Add button listeners
    const addBtn = document.getElementById('addWorkflowBtn');
    if (addBtn) addBtn.onclick = () => showWorkflowModal(container, {}, null);
    // Modal buttons
    const cancelWorkflowBtn = document.getElementById('cancelWorkflowBtn');
    if (cancelWorkflowBtn) cancelWorkflowBtn.onclick = () => hideWorkflowModal(container);
    const saveWorkflowBtn = document.getElementById('saveWorkflowBtn');
    if (saveWorkflowBtn) saveWorkflowBtn.onclick = () => saveWorkflow(container, settings);
}

function renderWorkflowsTable(container: HTMLElement) {
    const section = container.querySelector('#workflowsSection') as HTMLElement;
    if (!workflows || workflows.length === 0) {
        section.innerHTML = '<div style="color:#aaa;">No workflows defined.</div>';
        return;
    }
    let html = '<table class="crud-table"><thead><tr>' +
        '<th>Name</th><th>Description</th><th>Steps</th><th>Enabled</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    workflows.forEach((w, idx) => {
        html += `<tr>
            <td>${w.name || ''}</td>
            <td>${w.description || ''}</td>
            <td>${(w.steps||[]).join(',')}</td>
            <td>${w.enabled ? 'Yes' : 'No'}</td>
            <td>
                <button type="button" data-edit="${idx}">Edit</button>
                <button type="button" data-delete="${idx}">Delete</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    section.innerHTML = html;
    // Attach edit/delete event listeners
    section.querySelectorAll('button[data-edit]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxAttr = (e.target as HTMLElement).getAttribute('data-edit');
const idx = parseInt(safeGetString(idxAttr));
showWorkflowModal(container, workflows[idx], idx);
        });
    });
    section.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxAttr = (e.target as HTMLElement).getAttribute('data-delete');
const idx = parseInt(safeGetString(idxAttr));
deleteWorkflow(container, idx);
        });
    });
}

function showWorkflowModal(container: HTMLElement, workflow: Partial<Workflow>, idx: number | null) {
    const modal = document.getElementById('workflowModal');
    const title = document.getElementById('workflowModalTitle');
    const nameInput = document.getElementById('workflowName') as HTMLInputElement | null;
    const descInput = document.getElementById('workflowDesc') as HTMLInputElement | null;
    const stepsInput = document.getElementById('workflowSteps') as HTMLInputElement | null;
    const enabledInput = document.getElementById('workflowEnabled') as HTMLInputElement | null;
    if (modal) modal.style.display = 'flex';
    if (title) title.innerText = idx == null ? 'Add Workflow' : 'Edit Workflow';
    if (nameInput) nameInput.value = workflow?.name || '';
    if (descInput) descInput.value = workflow?.description || '';
    if (stepsInput) stepsInput.value = (workflow?.steps||[]).join(',');
    if (enabledInput) enabledInput.checked = !!workflow?.enabled;
    editingWorkflowIdx = idx;
}

function hideWorkflowModal(container: HTMLElement) {
    const modal = document.getElementById('workflowModal');
    if (modal) modal.style.display = 'none';
}

function saveWorkflow(container: HTMLElement, settings: any) {
    const nameInput = document.getElementById('workflowName') as HTMLInputElement | null;
    const descInput = document.getElementById('workflowDesc') as HTMLInputElement | null;
    const stepsInput = document.getElementById('workflowSteps') as HTMLInputElement | null;
    const enabledInput = document.getElementById('workflowEnabled') as HTMLInputElement | null;
    const workflow: Workflow = {
        name: nameInput?.value || '',
        description: descInput?.value || '',
        steps: stepsInput?.value ? stepsInput.value.split(',').map(v => v.trim()).filter(Boolean) : [],
        enabled: enabledInput?.checked || false,
    };
    if (editingWorkflowIdx == null) {
        workflows.push(workflow);
    } else {
        workflows[editingWorkflowIdx] = workflow;
    }
    settings.workflows = workflows;
    hideWorkflowModal(container);
    renderWorkflowsTable(container);
}

function deleteWorkflow(container: HTMLElement, idx: number) {
    if (confirm('Delete this workflow?')) {
        workflows.splice(idx, 1);
        const settings = (window as any).settings || {};
        settings.workflows = workflows;
        renderWorkflowsTable(container);
    }
}
