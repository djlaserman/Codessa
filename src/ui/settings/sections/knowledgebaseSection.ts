// Knowledgebase section logic and rendering
export type KnowledgebaseSource = {
    label: string;
    type: string;
    value: string;
    shared: boolean;
    context?: boolean;
};

let knowledgebaseSources: KnowledgebaseSource[] = [];
let editingKbIdx: number | null = null;

export function renderKnowledgebaseSection(container: HTMLElement, settings: any) {
    let html = `<style>
        .crud-table th, .crud-table td { padding: 7px 12px; }
        .crud-table th { background: #f6f6f9; color: #222; font-weight: 600; font-size:1.05em; }
        .crud-table tbody tr:nth-child(even) { background: #f8fafc; }
        .crud-table tbody tr:hover { background: #e0e7ef; }
        .kb-badge { display:inline-block; padding:2px 8px; border-radius:8px; font-size:0.88em; margin-right:2px; background:#f3f4f6; color:#2563eb; }
        .kb-badge.shared { background:#fef3c7; color:#b45309; }
        .kb-badge.context { background:#d1fae5; color:#059669; }
        .kb-action-btn { background:#2563eb; color:#fff; border:none; border-radius:5px; padding:3px 10px; margin:0 2px; font-size:1em; cursor:pointer; transition:background 0.15s; }
        .kb-action-btn:hover { background:#1d4ed8; }
        .kb-action-btn.delete { background:#fee2e2; color:#b91c1c; }
        .kb-action-btn.delete:hover { background:#fecaca; color:#dc2626; }
        .kb-action-btn[disabled] { background:#e5e7eb; color:#888; cursor:not-allowed; }
        .kb-table-title { font-size:1.25em; font-weight:600; margin-bottom:8px; color:#222; letter-spacing:0.01em; }
        .kb-empty { color:#aaa; font-size:1.1em; padding:24px 0; text-align:center; }
    </style>`;
    html += `<div class="kb-table-title">📚 Knowledgebase Sources</div>`;
    html += `<div style="margin-bottom:12px;"><button id="addKnowledgebaseBtn" class="kb-action-btn">➕ Add Source</button></div>`;
    html += '<div id="knowledgebaseSection">';
    // ...rest of render logic follows, using these styles and patterns

    // Sync from settings
    knowledgebaseSources = Array.isArray(settings.knowledgebaseSources) ? settings.knowledgebaseSources : [];
    renderKnowledgebaseTable(container);
    // Add button listeners
    const addBtn = document.getElementById('addKnowledgebaseBtn');
    if (addBtn) addBtn.onclick = () => showKnowledgebaseModal(null);
    // Modal buttons
    const cancelBtn = document.getElementById('cancelKnowledgebaseBtn');
    if (cancelBtn) cancelBtn.onclick = () => hideKnowledgebaseModal(container);
    const saveBtn = document.getElementById('saveKnowledgebaseBtn');
    if (saveBtn) saveBtn.onclick = () => saveKnowledgebase(container, settings);
}



export function renderKnowledgebaseTable(container: HTMLElement) {
    const section = container.querySelector('#knowledgebaseSection') as HTMLElement;
    if (!knowledgebaseSources || knowledgebaseSources.length === 0) {
        section.innerHTML = '<div class="kb-empty">No sources defined.<br><span style="font-size:0.95em;">Click <b>Add Source</b> to get started!</span></div>';
        return;
    }
    let html = '<table class="crud-table"><thead><tr>' +
        '<th>🔖 Type</th><th>📝 Label</th><th>🔗 Value</th><th>🏷️ Badges</th><th>⚙️ Actions</th>' +
        '</tr></thead><tbody>';
    knowledgebaseSources.forEach((src, idx) => {
        let typeIcon = src.type === 'api' ? '🔌' : src.type === 'library' ? '📦' : src.type === 'doc' ? '📄' : '📚';
        html += `<tr>
            <td title="Source Type">${typeIcon} ${src.type || ''}</td>
            <td title="Label">${src.label || ''}</td>
            <td title="Value">${src.value && src.value.length > 40 ? src.value.slice(0, 40) + '…' : src.value || ''}</td>
            <td>${src.shared ? '<span class="kb-badge shared">Shared</span>' : ''}${src.context ? '<span class="kb-badge context">Context</span>' : ''}</td>
            <td>
                <button type="button" class="kb-action-btn" data-edit="${idx}" title="Edit source">Edit</button>
                <button type="button" class="kb-action-btn delete" data-delete="${idx}" title="Delete source">Delete</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    section.innerHTML = html;
    // Attach listeners for edit/delete
    section.querySelectorAll('button[data-edit]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxStr = (e.target as HTMLElement).getAttribute('data-edit');
            if (idxStr !== null) {
                const idx = parseInt(idxStr);
                if (!isNaN(idx)) showKnowledgebaseModal(idx);
            }
        });
    });
    section.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxStr = (e.target as HTMLElement).getAttribute('data-delete');
            if (idxStr !== null) {
                const idx = parseInt(idxStr);
                if (!isNaN(idx) && confirm('Delete this knowledgebase source?')) {
                    knowledgebaseSources.splice(idx, 1);
                    renderKnowledgebaseTable(container);
                }
            }
        });
    });
}

export function showKnowledgebaseModal(idx: number | null) {
    // Modal for add/edit knowledgebase source
    const modal = document.getElementById('knowledgebaseModal') as HTMLElement;
    let src = idx !== null ? knowledgebaseSources[idx] : { type: 'doc', value: '', label: '', shared: false, context: false };
    modal.innerHTML = `
        <div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;">
            <div class="modal" style="min-width:340px;">
                <h4>${idx === null ? 'Add Source' : 'Edit Source'}</h4>
                <div><label>Type:<br>
                    <select id="kbSourceType">
                        <option value="doc"${src.type === 'doc' ? ' selected' : ''}>📄 Doc</option>
                        <option value="api"${src.type === 'api' ? ' selected' : ''}>🔌 API</option>
                        <option value="library"${src.type === 'library' ? ' selected' : ''}>📦 Library</option>
                        <option value="other"${src.type === 'other' ? ' selected' : ''}>📚 Other</option>
                    </select>
                </label></div>
                <div><label>Label:<br><input id="kbSourceLabel" value="${src.label || ''}" /></label></div>
                <div><label>Value:<br><input id="kbSourceValue" value="${src.value || ''}" /></label></div>
                <div style="margin:8px 0;">
                    <label><input type="checkbox" id="kbSourceShared" ${src.shared ? 'checked' : ''}/> Shared</label>
                    <label style="margin-left:16px;"><input type="checkbox" id="kbSourceContext" ${src.context ? 'checked' : ''}/> Context</label>
                </div>
                <div style="margin-top:10px;">
                    <button id="saveKbSourceBtn">Save</button>
                    <button id="cancelKbSourceBtn">Cancel</button>
                </div>
            </div>
        </div>`;
    modal.style.display = 'flex';
    document.getElementById('cancelKbSourceBtn')!.onclick = () => { modal.style.display = 'none'; };
    document.getElementById('saveKbSourceBtn')!.onclick = () => {
        const type = (document.getElementById('kbSourceType') as HTMLSelectElement).value;
        const label = (document.getElementById('kbSourceLabel') as HTMLInputElement).value.trim();
        const value = (document.getElementById('kbSourceValue') as HTMLInputElement).value.trim();
        const shared = (document.getElementById('kbSourceShared') as HTMLInputElement).checked;
        const context = (document.getElementById('kbSourceContext') as HTMLInputElement).checked;
        if (!value) { alert('Value is required.'); return; }
        const newSrc: KnowledgebaseSource = { type, label, value, shared, context: !!context };
        if (idx === null) knowledgebaseSources.push(newSrc);
        else knowledgebaseSources[idx] = newSrc;
        modal.style.display = 'none';
        renderKnowledgebaseTable(document.getElementById('settingsPanel')!);
    };
}

function hideKnowledgebaseModal(container: HTMLElement) {
    const modal = document.getElementById('knowledgebaseModal');
    if (modal) modal.style.display = 'none';
}

function saveKnowledgebase(container: HTMLElement, settings: any) {
    const labelInput = document.getElementById('knowledgebaseName') as HTMLInputElement | null;
    const typeInput = document.getElementById('knowledgebaseType') as HTMLInputElement | null;
    const valueInput = document.getElementById('knowledgebaseUrl') as HTMLInputElement | null;
    const sharedInput = document.getElementById('knowledgebaseEnabled') as HTMLInputElement | null;
    const kb: KnowledgebaseSource = {
        label: labelInput?.value || '',
        type: typeInput?.value || '',
        value: valueInput?.value || '',
        shared: sharedInput?.checked || false,
    };
    if (editingKbIdx == null) {
        knowledgebaseSources.push(kb);
    } else {
        knowledgebaseSources[editingKbIdx] = kb;
    }
    settings.knowledgebaseSources = knowledgebaseSources;
    hideKnowledgebaseModal(container);
    renderKnowledgebaseTable(container);
}

export function deleteKnowledgebase(container: HTMLElement, idx: number) {
    if (confirm('Delete this knowledgebase source?')) {
        knowledgebaseSources.splice(idx, 1);
        const settings = (window as any).settings || {};
        settings.knowledgebaseSources = knowledgebaseSources;
        renderKnowledgebaseTable(container);
    }
}

// --- Workspace-specific knowledgebase management ---
export function addKnowledgebaseSourceToWorkspace(workspaceId: string, source: KnowledgebaseSource) {
    // Find workspace in settings
    const settings = (window as any).settings || {};
    const ws = Array.isArray(settings.workspaces) ? settings.workspaces.find((w: any) => w.id === workspaceId) : null;
    if (!ws) return;
    if (!ws.knowledgebase) ws.knowledgebase = { sources: [], shared: false };
    ws.knowledgebase.sources.push(source);
    // Optionally trigger UI update or save
    if (typeof (window as any).panel?.refreshWorkspaceKnowledgebase === 'function') (window as any).panel.refreshWorkspaceKnowledgebase(workspaceId);
}

export function removeKnowledgebaseSourceFromWorkspace(workspaceId: string, sourceIndex: number) {
    const settings = (window as any).settings || {};
    const ws = Array.isArray(settings.workspaces) ? settings.workspaces.find((w: any) => w.id === workspaceId) : null;
    if (!ws || !ws.knowledgebase || !Array.isArray(ws.knowledgebase.sources)) return;
    ws.knowledgebase.sources.splice(sourceIndex, 1);
    if (typeof (window as any).panel?.refreshWorkspaceKnowledgebase === 'function') (window as any).panel.refreshWorkspaceKnowledgebase(workspaceId);
}

export function toggleWorkspaceKnowledgebaseSharing(workspaceId: string, shared: boolean) {
    const settings = (window as any).settings || {};
    const ws = Array.isArray(settings.workspaces) ? settings.workspaces.find((w: any) => w.id === workspaceId) : null;
    if (!ws) return;
    if (!ws.knowledgebase) ws.knowledgebase = { sources: [], shared: false };
    ws.knowledgebase.shared = shared;
    if (typeof (window as any).panel?.refreshWorkspaceKnowledgebase === 'function') (window as any).panel.refreshWorkspaceKnowledgebase(workspaceId);
}

