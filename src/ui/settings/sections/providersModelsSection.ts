// Providers & Models section logic and rendering

// Utility to ensure parseInt always gets a string
function safeGetString(val: string | null | undefined): string {
    return typeof val === 'string' ? val : '';
}

// Handles CRUD UI and interactions for providers and models

export type ProviderModel = {
    provider: string;
    modelId: string;
    apiKey: string;
    enabled: boolean;
};

let providerModels: ProviderModel[] = [];
let editingProviderModelIdx: number | null = null;

export function renderProvidersModelsSection(container: HTMLElement, settings: any) {
    // Sync from settings
    providerModels = Array.isArray(settings.providerModels) ? settings.providerModels : [];
    renderProvidersModelsTable(container);
    // Add button listeners
    const addBtn = document.getElementById('addProviderModelBtn');
    if (addBtn) addBtn.onclick = () => showProviderModelModal(container, {}, null);
    // Modal buttons
    const cancelBtn = document.getElementById('cancelProviderModelBtn');
    if (cancelBtn) cancelBtn.onclick = () => hideProviderModelModal(container);
    const saveBtn = document.getElementById('saveProviderModelBtn');
    if (saveBtn) saveBtn.onclick = () => saveProviderModel(container, settings);
}

function renderProvidersModelsTable(container: HTMLElement) {
    const section = container.querySelector('#providersModelsSection') as HTMLElement;
    if (!providerModels || providerModels.length === 0) {
        section.innerHTML = '<div style="color:#aaa;">No providers/models defined.</div>';
        return;
    }
    let html = '<table class="crud-table"><thead><tr>' +
        '<th>Provider</th><th>Model ID</th><th>API Key</th><th>Enabled</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    providerModels.forEach((pm, idx) => {
        html += `<tr>
            <td>${pm.provider || ''}</td>
            <td>${pm.modelId || ''}</td>
            <td>${pm.apiKey ? '••••••••' : ''}</td>
            <td>${pm.enabled ? 'Yes' : 'No'}</td>
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
showProviderModelModal(container, providerModels[idx], idx);
        });
    });
    section.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxAttr = (e.target as HTMLElement).getAttribute('data-delete');
const idx = parseInt(safeGetString(idxAttr));
deleteProviderModel(container, idx);
        });
    });
}

function showProviderModelModal(container: HTMLElement, pm: Partial<ProviderModel>, idx: number | null) {
    const modal = document.getElementById('providerModelModal');
    const title = document.getElementById('providerModelModalTitle');
    const providerInput = document.getElementById('providerModelProvider') as HTMLInputElement | null;
    const modelIdInput = document.getElementById('providerModelModelId') as HTMLInputElement | null;
    const apiKeyInput = document.getElementById('providerModelApiKey') as HTMLInputElement | null;
    const enabledInput = document.getElementById('providerModelEnabled') as HTMLInputElement | null;
    if (modal) modal.style.display = 'flex';
    if (title) title.innerText = idx == null ? 'Add Provider/Model' : 'Edit Provider/Model';
    if (providerInput) providerInput.value = pm?.provider || '';
    if (modelIdInput) modelIdInput.value = pm?.modelId || '';
    if (apiKeyInput) apiKeyInput.value = pm?.apiKey || '';
    if (enabledInput) enabledInput.checked = !!pm?.enabled;
    editingProviderModelIdx = idx;
}

function hideProviderModelModal(container: HTMLElement) {
    const modal = document.getElementById('providerModelModal');
    if (modal) modal.style.display = 'none';
}

function saveProviderModel(container: HTMLElement, settings: any) {
    const providerInput = document.getElementById('providerModelProvider') as HTMLInputElement | null;
    const modelIdInput = document.getElementById('providerModelModelId') as HTMLInputElement | null;
    const apiKeyInput = document.getElementById('providerModelApiKey') as HTMLInputElement | null;
    const enabledInput = document.getElementById('providerModelEnabled') as HTMLInputElement | null;
    const pm: ProviderModel = {
        provider: providerInput?.value || '',
        modelId: modelIdInput?.value || '',
        apiKey: apiKeyInput?.value || '',
        enabled: enabledInput?.checked || false,
    };
    if (editingProviderModelIdx == null) {
        providerModels.push(pm);
    } else {
        providerModels[editingProviderModelIdx] = pm;
    }
    settings.providerModels = providerModels;
    hideProviderModelModal(container);
    renderProvidersModelsTable(container);
}

function deleteProviderModel(container: HTMLElement, idx: number) {
    if (confirm('Delete this provider/model?')) {
        providerModels.splice(idx, 1);
        const settings = (window as any).settings || {};
        settings.providerModels = providerModels;
        renderProvidersModelsTable(container);
    }
}
