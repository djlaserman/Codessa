// Agents section logic and rendering
export type Agent = {
    name: string;
    description: string;
    systemPrompt: string;
    provider: string;
    modelId: string;
    supervisor: boolean;
    enabled: boolean;
    chainedAgentIds: string[];
};

let agents: Agent[] = [];
let editingAgentIdx: number | null = null;

export function renderAgentsSection(container: HTMLElement, settings: any) {
    // Sync from settings
    agents = Array.isArray(settings.agents) ? settings.agents : [];
    renderAgentsTable(container);
    // Add button listeners
    const addBtn = document.getElementById('addAgentBtn');
    if (addBtn) addBtn.onclick = () => showAgentModal(container, {}, null);
    // Modal buttons
    const cancelAgentBtn = document.getElementById('cancelAgentBtn');
    if (cancelAgentBtn) cancelAgentBtn.onclick = () => hideAgentModal(container);
    const saveAgentBtn = document.getElementById('saveAgentBtn');
    if (saveAgentBtn) saveAgentBtn.onclick = () => saveAgent(container, settings);
}

function renderAgentsTable(container: HTMLElement) {
    const section = container.querySelector('#agentsSection') as HTMLElement;
    if (!agents || agents.length === 0) {
        section.innerHTML = '<div style="color:#aaa;font-size:1.1em;padding:24px 0;text-align:center;">🧑‍💻 No agents defined.</div>';
        return;
    }
    let html = `<style>
        .crud-table th, .crud-table td { padding: 6px 10px; }
        .crud-table th { background: #f6f6f9; color: #333; font-weight: 600; }
        .crud-table tbody tr:nth-child(even) { background: #fafbfc; }
        .crud-table tbody tr:hover { background: #e8f0fe; }
        .agent-badge { display:inline-block; padding:2px 8px; border-radius:8px; font-size:0.9em; margin-right:2px; }
        .badge-enabled { background: #d1fae5; color: #059669; }
        .badge-disabled { background: #fee2e2; color: #b91c1c; }
        .badge-supervisor { background: #fef9c3; color: #b45309; }
        .btn-agent { background:#2563eb; color:#fff; border:none; border-radius:5px; padding:3px 10px; margin:0 2px; font-size:1em; cursor:pointer; transition:background 0.15s; }
        .btn-agent:hover { background:#1d4ed8; }
        .btn-agent[disabled] { background:#e5e7eb; color:#888; cursor:not-allowed; }
        .agent-action-icons { font-size:1.1em; cursor:pointer; margin:0 2px; }
        .agent-action-icons.edit { color:#2563eb; }
        .agent-action-icons.delete { color:#b91c1c; }
        .agent-action-icons.edit:hover { color:#1d4ed8; }
        .agent-action-icons.delete:hover { color:#dc2626; }
    </style>`;
    html += '<table class="crud-table"><thead><tr>' +
        '<th>👤 Name</th><th>📝 Description</th><th title="System Prompt">💬 Prompt</th><th>🔗 Provider</th><th>🤖 Model ID</th><th title="Supervisor Agent">🦸 Supervisor</th><th>⚡ Enabled</th><th>🔗 Chained Agents</th><th>⚙️ Actions</th>' +
        '</tr></thead><tbody>';
    agents.forEach((a, idx) => {
        html += `<tr>
            <td>${a.name || ''}</td>
            <td>${a.description || ''}</td>
            <td>${(a.systemPrompt||'').slice(0,40)}${(a.systemPrompt||'').length>40?'...':''}</td>
            <td>${a.provider||''}</td>
            <td>${a.modelId||''}</td>
            <td>${a.supervisor ? 'Yes' : 'No'}</td>
            <td>${a.enabled ? 'Yes' : 'No'}</td>
            <td>${(a.chainedAgentIds||[]).join(',')}</td>
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
showAgentModal(container, agents[idx], idx);
        });
    });
    section.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxAttr = (e.target as HTMLElement).getAttribute('data-delete');
const idx = parseInt(safeGetString(idxAttr));
deleteAgent(container, idx);
        });
    });
}

function showAgentModal(container: HTMLElement, agent: Partial<Agent>, idx: number | null) {
    const modal = document.getElementById('agentModal');
    const title = document.getElementById('agentModalTitle');
    const nameInput = document.getElementById('agentName') as HTMLInputElement | null;
    const descInput = document.getElementById('agentDesc') as HTMLInputElement | null;
    const promptInput = document.getElementById('agentPrompt') as HTMLInputElement | null;
    const providerInput = document.getElementById('agentProvider') as HTMLInputElement | null;
    const modelIdInput = document.getElementById('agentModelId') as HTMLInputElement | null;
    const supervisorInput = document.getElementById('agentSupervisor') as HTMLInputElement | null;
    const enabledInput = document.getElementById('agentEnabled') as HTMLInputElement | null;
    const chainedInput = document.getElementById('agentChained') as HTMLInputElement | null;
    if (modal) modal.style.display = 'flex';
    if (title) title.innerText = idx == null ? 'Add Agent' : 'Edit Agent';
    if (nameInput) nameInput.value = agent?.name || '';
    if (descInput) descInput.value = agent?.description || '';
    if (promptInput) promptInput.value = agent?.systemPrompt || '';
    if (providerInput) providerInput.value = agent?.provider || '';
    if (modelIdInput) modelIdInput.value = safeGetString(agent?.modelId) || '';
    if (supervisorInput) supervisorInput.checked = !!agent?.supervisor;
    if (enabledInput) enabledInput.checked = !!agent?.enabled;
    if (chainedInput) chainedInput.value = (agent?.chainedAgentIds||[]).join(',');
    editingAgentIdx = idx;
}

function hideAgentModal(container: HTMLElement) {
    const modal = document.getElementById('agentModal');
    if (modal) modal.style.display = 'none';
}

function saveAgent(container: HTMLElement, settings: any) {
    const nameInput = document.getElementById('agentName') as HTMLInputElement | null;
    const descInput = document.getElementById('agentDesc') as HTMLInputElement | null;
    const promptInput = document.getElementById('agentPrompt') as HTMLInputElement | null;
    const providerInput = document.getElementById('agentProvider') as HTMLInputElement | null;
    const modelIdInput = document.getElementById('agentModelId') as HTMLInputElement | null;
    const supervisorInput = document.getElementById('agentSupervisor') as HTMLInputElement | null;
    const enabledInput = document.getElementById('agentEnabled') as HTMLInputElement | null;
    const chainedInput = document.getElementById('agentChained') as HTMLInputElement | null;
    const agent: Agent = {
        name: nameInput?.value || '',
        description: descInput?.value || '',
        systemPrompt: promptInput?.value || '',
        provider: providerInput?.value || '',
        modelId: modelIdInput?.value || '',
        supervisor: supervisorInput?.checked || false,
        enabled: enabledInput?.checked || false,
        chainedAgentIds: (chainedInput?.value ? chainedInput.value.split(',').map(v => v.trim()).filter(Boolean) : []),
    };
    if (editingAgentIdx == null) {
        agents.push(agent);
    } else {
        agents[editingAgentIdx] = agent;
    }
    settings.agents = agents;
    hideAgentModal(container);
    renderAgentsTable(container);
}

function deleteAgent(container: HTMLElement, idx: number) {
    if (confirm('Delete this agent?')) {
        agents.splice(idx, 1);
        const settings = (window as any).settings || {};
        settings.agents = agents;
        renderAgentsTable(container);
    }
}

// Fix for TS2345: ensure string argument is never null
function safeGetString(val: string | null | undefined): string {
    return typeof val === 'string' ? val : '';
}
