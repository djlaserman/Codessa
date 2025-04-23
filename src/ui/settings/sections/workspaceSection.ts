// Workspace section logic and rendering
import { Workspace } from '../types';

let workspaces: Workspace[] = [];
let editingWorkspaceIdx: number | null = null;

export function renderWorkspaceSection(container: HTMLElement, settings: any) {
    // Sync from settings
    workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    renderWorkspaceTable(container, settings);
    // Add button listener
    const addBtn = document.getElementById('addWorkspaceBtn');
    if (addBtn) addBtn.onclick = () => showWorkspaceModal(container, {}, null, settings);
    // Modal buttons
    const cancelBtn = document.getElementById('cancelWorkspaceBtn');
    if (cancelBtn) cancelBtn.onclick = () => hideWorkspaceModal(container);
    const saveBtn = document.getElementById('saveWorkspaceBtn');
    if (saveBtn) saveBtn.onclick = () => saveWorkspace(container, settings);
}

function renderWorkspaceTable(container: HTMLElement, settings: any) {
    let html = `<style>
        .crud-table th, .crud-table td { padding: 7px 12px; }
        .crud-table th { background: #f6f6f9; color: #222; font-weight: 600; font-size:1.05em; }
        .crud-table tbody tr:nth-child(even) { background: #f8fafc; }
        .crud-table tbody tr:hover { background: #e0e7ef; }
        .ws-badge { display:inline-block; padding:2px 8px; border-radius:8px; font-size:0.88em; margin-right:2px; background:#f3f4f6; color:#2563eb; }
        .ws-badge.active { background:#d1fae5; color:#059669; font-weight:600; }
        .ws-badge.tag { background:#fef3c7; color:#b45309; }
        .ws-action-btn { background:#2563eb; color:#fff; border:none; border-radius:5px; padding:3px 10px; margin:0 2px; font-size:1em; cursor:pointer; transition:background 0.15s; }
        .ws-action-btn:hover { background:#1d4ed8; }
        .ws-action-btn.delete { background:#fee2e2; color:#b91c1c; }
        .ws-action-btn.delete:hover { background:#fecaca; color:#dc2626; }
        .ws-action-btn[disabled] { background:#e5e7eb; color:#888; cursor:not-allowed; }
        .ws-table-title { font-size:1.25em; font-weight:600; margin-bottom:8px; color:#222; letter-spacing:0.01em; }
        .ws-empty { color:#aaa; font-size:1.1em; padding:24px 0; text-align:center; }
    </style>`;
    html += `<div class="ws-table-title">🗂️ Workspaces</div>`;
    html += `<div style="margin-bottom:12px;"><button id="addWorkspaceBtn" class="ws-action-btn">➕ Add Workspace</button></div>`;
    html += '<div id="workspaceSection">';
    if (!workspaces || workspaces.length === 0) {
        html += '<div class="ws-empty">No workspaces defined.<br><span style="font-size:0.95em;">Click <b>Add Workspace</b> to get started!</span></div>';
    } else {
        html += '<table class="crud-table"><thead><tr>' +
            '<th>🏷️ Name</th><th>📁 Path</th><th>📝 Description</th><th>🏷️ Tags</th><th>✅ Active</th><th>⚙️ Actions</th>' +
            '</tr></thead><tbody>';
        workspaces.forEach((ws, idx) => {
            const isActive = settings.activeWorkspace === ws.id;
            html += `<tr>
                <td title="Workspace Name">${ws.name || ''}</td>
                <td title="Workspace Path">${ws.path || ''}</td>
                <td title="Description">${ws.description || ''}</td>
                <td>${(ws.tags || []).map(tag => `<span class='ws-badge tag'>${tag}</span>`).join('')}</td>
                <td>${isActive ? '<span class="ws-badge active">Active</span>' : ''}</td>
                <td>
                    <button type="button" class="ws-action-btn" data-switch="${idx}" title="Switch to this workspace">${isActive ? 'Current' : 'Switch'}</button>
                    <button type="button" class="ws-action-btn" data-edit="${idx}" title="Edit workspace">Edit</button>
                    <button type="button" class="ws-action-btn delete" data-delete="${idx}" title="Delete workspace">Delete</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
    }
    html += '</div>';
    // Modal placeholder
    html += `<div id="workspaceModal" style="display:none;"></div>`;
    container.innerHTML = html;
    // Attach listeners
    const section = container.querySelector('#workspaceSection') as HTMLElement;
    section?.querySelectorAll('button[data-edit]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxStr = (e.target as HTMLElement).getAttribute('data-edit');
            if (idxStr !== null) {
                const idx = parseInt(idxStr);
                if (!isNaN(idx)) showWorkspaceModal(container, workspaces[idx], idx, settings);
            }
        });
    });
    section?.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxStr = (e.target as HTMLElement).getAttribute('data-delete');
            if (idxStr !== null) {
                const idx = parseInt(idxStr);
                if (!isNaN(idx)) deleteWorkspace(container, idx, settings);
            }
        });
    });
    section?.querySelectorAll('button[data-switch]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxStr = (e.target as HTMLElement).getAttribute('data-switch');
            if (idxStr !== null) {
                const idx = parseInt(idxStr);
                if (!isNaN(idx)) switchWorkspace(container, idx, settings);
            }
        });
    });
    // Add button
    const addBtn = document.getElementById('addWorkspaceBtn');
    if (addBtn) addBtn.onclick = () => showWorkspaceModal(container, {}, null, settings);
}

import { renderKnowledgebaseTable, KnowledgebaseSource, showKnowledgebaseModal, deleteKnowledgebase } from './knowledgebaseSection';

function showWorkspaceModal(container: HTMLElement, ws: Partial<Workspace>, idx: number | null, settings: any) {
    editingWorkspaceIdx = idx;
    const modal = container.querySelector('#workspaceModal') as HTMLElement;
    // Tabs
    const tabs = [
        { id: 'general', label: 'General' },
        { id: 'knowledgebase', label: 'Knowledgebase' },
        { id: 'files', label: 'Files' },
        { id: 'team', label: 'Team Members' },
        { id: 'memory', label: 'Memory/Notes' },
        { id: 'docs', label: 'Documentation' }
    ];
    let activeTab = 'general';
    function renderTabs(selectedTab: string) {
        activeTab = selectedTab;
        let html = `<div class="modal-overlay">
            <div class="modal">
                <h3>${idx === null ? 'Add Workspace' : 'Edit Workspace'}</h3>
                <div class="workspace-tabs" style="display:flex;gap:8px;margin-bottom:8px;">
                    ${tabs.map(tab => `<button class="workspace-tab${selectedTab === tab.id ? ' active' : ''}" data-tab="${tab.id}">${tab.label}</button>`).join('')}
                </div>
                <div id="workspaceTabContent"></div>
                <div style="margin-top:10px;">
                    <button id="saveWorkspaceBtn">Save</button>
                    <button id="cancelWorkspaceBtn">Cancel</button>
                </div>
            </div>
        </div>`;
        modal.innerHTML = html;
        modal.style.display = 'block';
        // Tab switching
        modal.querySelectorAll('.workspace-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = (e.target as HTMLElement).getAttribute('data-tab');
                if (tabId) renderTabs(tabId);
            });
        });
        // Modal buttons
        const cancelBtn = document.getElementById('cancelWorkspaceBtn');
        if (cancelBtn) cancelBtn.onclick = () => hideWorkspaceModal(container);
        const saveBtn = document.getElementById('saveWorkspaceBtn');
        if (saveBtn) saveBtn.onclick = () => saveWorkspace(container, settings);
        // Render tab content
        renderTabContent(selectedTab);
    }
    function renderTabContent(tabId: string) {
        const content = modal.querySelector('#workspaceTabContent') as HTMLElement;
        if (!content) return;
        if (tabId === 'general') {
            content.innerHTML = `
                <div>
                    <label>Name:<br><input id="workspaceName" value="${ws.name || ''}" /></label>
                </div>
                <div>
                    <label>Path:<br><input id="workspacePath" value="${ws.path || ''}" /></label>
                </div>
                <div>
                    <label>Description:<br><input id="workspaceDescription" value="${ws.description || ''}" /></label>
                </div>
            `;
        } else if (tabId === 'knowledgebase') {
            const workspaceKnowledgebase = ws.knowledgebase || { sources: [], shared: false };
            const sharedChecked = workspaceKnowledgebase.shared ? 'checked' : '';
            content.innerHTML = `
                <div style="margin-bottom:10px;">
                    <label><input type="checkbox" id="workspaceKbShared" ${sharedChecked}/> Use shared knowledgebase</label>
                </div>
                <div id="workspaceKnowledgebaseSection"></div>
            `;
            const kbSection = content.querySelector('#workspaceKnowledgebaseSection') as HTMLElement;
            const kbSharedCheckbox = document.getElementById('workspaceKbShared') as HTMLInputElement;
            let kbSources: KnowledgebaseSource[] = [];
            if (workspaceKnowledgebase.shared) {
                kbSources = Array.isArray(settings.knowledgebaseSources) ? settings.knowledgebaseSources : [];
            } else {
                kbSources = Array.isArray(workspaceKnowledgebase.sources) ? workspaceKnowledgebase.sources : [];
            }
            renderKnowledgebaseTable(kbSection); // TODO: Add correct callback logic if needed
            kbSharedCheckbox?.addEventListener('change', (e) => {
                workspaceKnowledgebase.shared = kbSharedCheckbox.checked;
                renderTabContent('knowledgebase');
            });
        } else if (tabId === 'files') {
            // --- Files Management ---
            ws.files = ws.files || [];
            function renderFilesTable() {
                let html = `<div style="margin-bottom:8px;"><button id="addWorkspaceFileBtn" class="ws-action-btn">➕ Add File</button></div>`;
                if (!ws.files || ws.files.length === 0) {
                    html += `<div class="ws-empty">No files added to this workspace.</div>`;
                } else {
                    html += `<table class="crud-table"><thead><tr><th>📄 Name</th><th>📁 Path</th><th>🗂️ Type</th><th>🏷️ Tags</th><th>⚙️ Actions</th></tr></thead><tbody>`;
                    ws.files.forEach((file, idx) => {
                        let typeIcon = file.type === 'code' ? '💻' : file.type === 'doc' ? '📄' : file.type === 'data' ? '📊' : '📁';
                        html += `<tr>
                            <td title="File Name">${file.name || ''}</td>
                            <td title="File Path">${file.path || ''}</td>
                            <td title="File Type">${typeIcon} ${file.type || ''}</td>
                            <td>${(file.tags || []).map(tag => `<span class='ws-badge tag'>${tag}</span>`).join('')}</td>
                            <td>
                                <button type="button" class="ws-action-btn" data-edit="${idx}" title="Edit file">Edit</button>
                                <button type="button" class="ws-action-btn delete" data-delete="${idx}" title="Delete file">Delete</button>
                            </td>
                        </tr>`;
                    });
                    html += `</tbody></table>`;
                }
                content.innerHTML = html + `<div id="workspaceFileModal" style="display:none;"></div>`;
                content.querySelectorAll('button[data-edit]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-edit');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx)) showFileModal(idx);
                        }
                    });
                });
                content.querySelectorAll('button[data-delete]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-delete');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx) && confirm('Delete this file?')) {
                                ws.files!.splice(idx, 1);
                                settings.workspaces = [...workspaces];
                                renderFilesTable();
                            }
                        }
                    });
                });
                const addBtn = document.getElementById('addWorkspaceFileBtn');
                if (addBtn) addBtn.onclick = () => showFileModal(null);
            }
            function showFileModal(fileIdx: number | null) {
                const modal = content.querySelector('#workspaceFileModal') as HTMLElement;
                let file = fileIdx !== null ? ws.files![fileIdx] : { name: '', path: '', type: 'code', tags: [] };
                modal.innerHTML = `
                    <div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;">
                        <div class="modal" style="min-width:320px;">
                            <h4>${fileIdx === null ? 'Add File' : 'Edit File'}</h4>
                            <div><label>Name:<br><input id="workspaceFileName" value="${file.name || ''}" /></label></div>
                            <div><label>Path:<br><input id="workspaceFilePath" value="${file.path || ''}" /></label></div>
                            <div><label>Type:<br>
                                <select id="workspaceFileType">
                                    <option value="code"${file.type === 'code' ? ' selected' : ''}>💻 Code</option>
                                    <option value="doc"${file.type === 'doc' ? ' selected' : ''}>📄 Doc</option>
                                    <option value="data"${file.type === 'data' ? ' selected' : ''}>📊 Data</option>
                                    <option value="other"${file.type === 'other' ? ' selected' : ''}>📁 Other</option>
                                </select>
                            </label></div>
                            <div><label>Tags (comma separated):<br><input id="workspaceFileTags" value="${(file.tags || []).join(', ')}" /></label></div>
                            <div style="margin-top:10px;">
                                <button id="saveWorkspaceFileBtn">Save</button>
                                <button id="cancelWorkspaceFileBtn">Cancel</button>
                            </div>
                        </div>
                    </div>`;
                modal.style.display = 'flex';
                document.getElementById('cancelWorkspaceFileBtn')!.onclick = () => { modal.style.display = 'none'; };
                document.getElementById('saveWorkspaceFileBtn')!.onclick = () => {
                    const name = (document.getElementById('workspaceFileName') as HTMLInputElement).value.trim();
                    const path = (document.getElementById('workspaceFilePath') as HTMLInputElement).value.trim();
                    const type = (document.getElementById('workspaceFileType') as HTMLSelectElement).value;
                    const tags = (document.getElementById('workspaceFileTags') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(Boolean);
                    if (!name || !path) { alert('Name and path are required.'); return; }
                    const newFile = { name, path, type, tags };
                    if (fileIdx === null) ws.files!.push(newFile);
                    else ws.files![fileIdx] = newFile;
                    settings.workspaces = [...workspaces];
                    modal.style.display = 'none';
                    renderFilesTable();
                };
            }
            renderFilesTable();
        } else if (tabId === 'team') {
            // --- Team Management ---
            ws.team = ws.team || [];
            function renderTeamTable() {
                let html = `<div style="margin-bottom:8px;"><button id="addWorkspaceTeamBtn" class="ws-action-btn">➕ Add Member</button></div>`;
                if (!ws.team || ws.team.length === 0) {
                    html += `<div class="ws-empty">No team members added to this workspace.</div>`;
                } else {
                    html += `<table class="crud-table"><thead><tr><th>🧑 Member</th><th>📧 Email</th><th>🎓 Role</th><th>⚙️ Actions</th></tr></thead><tbody>`;
                    ws.team.forEach((member, idx) => {
                        const initials = member.name ? member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : '👤';
                        let roleBadge = member.role === 'admin' ? '<span class="ws-badge active">Admin</span>' : member.role === 'editor' ? '<span class="ws-badge tag">Editor</span>' : '<span class="ws-badge">Viewer</span>';
                        html += `<tr>
                            <td title="Name"><span style="font-weight:600;">${initials}</span> ${member.name || ''}</td>
                            <td title="Email">${member.email || ''}</td>
                            <td title="Role">${roleBadge}</td>
                            <td>
                                <button type="button" class="ws-action-btn" data-edit="${idx}" title="Edit member">Edit</button>
                                <button type="button" class="ws-action-btn delete" data-delete="${idx}" title="Delete member">Delete</button>
                            </td>
                        </tr>`;
                    });
                    html += `</tbody></table>`;
                }
                content.innerHTML = html + `<div id="workspaceTeamModal" style="display:none;"></div>`;
                content.querySelectorAll('button[data-edit]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-edit');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx)) showTeamModal(idx);
                        }
                    });
                });
                content.querySelectorAll('button[data-delete]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-delete');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx) && confirm('Delete this team member?')) {
                                ws.team!.splice(idx, 1);
                                settings.workspaces = [...workspaces];
                                renderTeamTable();
                            }
                        }
                    });
                });
                const addBtn = document.getElementById('addWorkspaceTeamBtn');
                if (addBtn) addBtn.onclick = () => showTeamModal(null);
            }
            function showTeamModal(teamIdx: number | null) {
                const modal = content.querySelector('#workspaceTeamModal') as HTMLElement;
                let member = teamIdx !== null ? ws.team![teamIdx] : { name: '', email: '', role: 'viewer' };
                modal.innerHTML = `
                    <div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;">
                        <div class="modal" style="min-width:320px;">
                            <h4>${teamIdx === null ? 'Add Member' : 'Edit Member'}</h4>
                            <div><label>Name:<br><input id="workspaceTeamName" value="${member.name || ''}" /></label></div>
                            <div><label>Email:<br><input id="workspaceTeamEmail" value="${member.email || ''}" /></label></div>
                            <div><label>Role:<br>
                                <select id="workspaceTeamRole">
                                    <option value="admin"${member.role === 'admin' ? ' selected' : ''}>Admin</option>
                                    <option value="editor"${member.role === 'editor' ? ' selected' : ''}>Editor</option>
                                    <option value="viewer"${member.role === 'viewer' ? ' selected' : ''}>Viewer</option>
                                </select>
                            </label></div>
                            <div style="margin-top:10px;">
                                <button id="saveWorkspaceTeamBtn">Save</button>
                                <button id="cancelWorkspaceTeamBtn">Cancel</button>
                            </div>
                        </div>
                    </div>`;
                modal.style.display = 'flex';
                document.getElementById('cancelWorkspaceTeamBtn')!.onclick = () => { modal.style.display = 'none'; };
                document.getElementById('saveWorkspaceTeamBtn')!.onclick = () => {
                    const name = (document.getElementById('workspaceTeamName') as HTMLInputElement).value.trim();
                    const email = (document.getElementById('workspaceTeamEmail') as HTMLInputElement).value.trim();
                    const role = (document.getElementById('workspaceTeamRole') as HTMLSelectElement).value;
                    if (!name || !email) { alert('Name and email are required.'); return; }
                    const newMember = { id: teamIdx === null ? Date.now().toString() : ws.team![teamIdx].id, name, email, role };
                    if (teamIdx === null) ws.team!.push(newMember);
                    else ws.team![teamIdx] = newMember;
                    settings.workspaces = [...workspaces];
                    modal.style.display = 'none';
                    renderTeamTable();
                };
            }
            renderTeamTable();
        }
        // Files tab
        if (tabId === 'files') {
            ws.files = ws.files || [];
            function renderFilesTable() {
                let html = `<div style="margin-bottom:8px;"><button id="addWorkspaceFileBtn">Add File</button></div>`;
                if (!ws.files || ws.files.length === 0) {
                    html += `<div style="color:#aaa;">No files added to this workspace.</div>`;
                } else {
                    html += `<table class="crud-table"><thead><tr><th>Name</th><th>Path</th><th>Type</th><th>Tags</th><th>Actions</th></tr></thead><tbody>`;
                    ws.files.forEach((file, idx) => {
                        html += `<tr>
                            <td>${file.name || ''}</td>
                            <td>${file.path || ''}</td>
                            <td>${file.type || ''}</td>
                            <td>${(file.tags || []).join(', ')}</td>
                            <td>
                                <button type="button" data-edit="${idx}">Edit</button>
                                <button type="button" data-delete="${idx}">Delete</button>
                            </td>
                        </tr>`;
                    });
                    html += `</tbody></table>`;
                }
                content.innerHTML = html + `<div id="workspaceFileModal" style="display:none;"></div>`;
                // Add/Edit/Delete event listeners
                content.querySelectorAll('button[data-edit]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-edit');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx)) showFileModal(idx);
                        }
                    });
                });
                content.querySelectorAll('button[data-delete]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-delete');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx) && confirm('Delete this file?')) {
                                ws.files!.splice(idx, 1);
                                settings.workspaces = [...workspaces];
                                renderFilesTable();
                            }
                        }
                    });
                });
                const addBtn = document.getElementById('addWorkspaceFileBtn');
                if (addBtn) addBtn.onclick = () => showFileModal(null);
            }
            function showFileModal(fileIdx: number | null) {
                const modal = content.querySelector('#workspaceFileModal') as HTMLElement;
                let file = fileIdx !== null ? ws.files![fileIdx] : { path: '', name: '', type: '', tags: [] };
                modal.innerHTML = `
                    <div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;">
                        <div class="modal" style="min-width:320px;">
                            <h4>${fileIdx === null ? 'Add File' : 'Edit File'}</h4>
                            <div><label>Path:<br><input id="workspaceFilePath" value="${file.path || ''}" /></label></div>
                            <div><label>Name:<br><input id="workspaceFileName" value="${file.name || ''}" /></label></div>
                            <div><label>Type:<br><input id="workspaceFileType" value="${file.type || ''}" /></label></div>
                            <div><label>Tags (comma separated):<br><input id="workspaceFileTags" value="${(file.tags || []).join(', ')}" /></label></div>
                            <div style="margin-top:10px;">
                                <button id="saveWorkspaceFileBtn">Save</button>
                                <button id="cancelWorkspaceFileBtn">Cancel</button>
                            </div>
                        </div>
                    </div>`;
                modal.style.display = 'flex';
                document.getElementById('cancelWorkspaceFileBtn')!.onclick = () => { modal.style.display = 'none'; };
                document.getElementById('saveWorkspaceFileBtn')!.onclick = () => {
                    const path = (document.getElementById('workspaceFilePath') as HTMLInputElement).value.trim();
                    const name = (document.getElementById('workspaceFileName') as HTMLInputElement).value.trim();
                    const type = (document.getElementById('workspaceFileType') as HTMLInputElement).value.trim();
                    const tags = (document.getElementById('workspaceFileTags') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(t => t);
                    if (!path) { alert('Path is required.'); return; }
                    const newFile = { path, name, type, tags };
                    if (fileIdx === null) ws.files!.push(newFile);
                    else ws.files![fileIdx] = newFile;
                    settings.workspaces = [...workspaces];
                    modal.style.display = 'none';
                    renderFilesTable();
                };
            }
            renderFilesTable();
        } if (tabId === 'team') {
            // Team Members Management UI
            ws.team = ws.team || [];
            function renderTeamTable() {
                let html = `<div style="margin-bottom:8px;"><button id="addWorkspaceTeamBtn">Add Member</button></div>`;
                if (!ws.team || ws.team.length === 0) {
                    html += `<div style="color:#aaa;">No team members added to this workspace.</div>`;
                } else {
                    html += `<table class="crud-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>`;
                    ws.team.forEach((member, idx) => {
                        html += `<tr>
                            <td>${member.name || ''}</td>
                            <td>${member.email || ''}</td>
                            <td>${member.role || ''}</td>
                            <td>
                                <button type="button" data-edit="${idx}">Edit</button>
                                <button type="button" data-delete="${idx}">Delete</button>
                            </td>
                        </tr>`;
                    });
                    html += `</tbody></table>`;
                }
                content.innerHTML = html + `<div id="workspaceTeamModal" style="display:none;"></div>`;
                // Add/Edit/Delete event listeners
                content.querySelectorAll('button[data-edit]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-edit');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx)) showTeamModal(idx);
                        }
                    });
                });
                content.querySelectorAll('button[data-delete]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-delete');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx) && confirm('Delete this team member?')) {
                                ws.team!.splice(idx, 1);
                                settings.workspaces = [...workspaces];
                                renderTeamTable();
                            }
                        }
                    });
                });
                const addBtn = document.getElementById('addWorkspaceTeamBtn');
                if (addBtn) addBtn.onclick = () => showTeamModal(null);
            }
            function showTeamModal(memberIdx: number | null) {
                const modal = content.querySelector('#workspaceTeamModal') as HTMLElement;
                let member = memberIdx !== null ? ws.team![memberIdx] : { id: '', name: '', email: '', role: '' };
                modal.innerHTML = `
                    <div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;">
                        <div class="modal" style="min-width:320px;">
                            <h4>${memberIdx === null ? 'Add Member' : 'Edit Member'}</h4>
                            <div><label>Name:<br><input id="workspaceTeamName" value="${member.name || ''}" /></label></div>
                            <div><label>Email:<br><input id="workspaceTeamEmail" value="${member.email || ''}" /></label></div>
                            <div><label>Role:<br><input id="workspaceTeamRole" value="${member.role || ''}" /></label></div>
                            <div style="margin-top:10px;">
                                <button id="saveWorkspaceTeamBtn">Save</button>
                                <button id="cancelWorkspaceTeamBtn">Cancel</button>
                            </div>
                        </div>
                    </div>`;
                modal.style.display = 'flex';
                document.getElementById('cancelWorkspaceTeamBtn')!.onclick = () => { modal.style.display = 'none'; };
                document.getElementById('saveWorkspaceTeamBtn')!.onclick = () => {
                    const name = (document.getElementById('workspaceTeamName') as HTMLInputElement).value.trim();
                    const email = (document.getElementById('workspaceTeamEmail') as HTMLInputElement).value.trim();
                    const role = (document.getElementById('workspaceTeamRole') as HTMLInputElement).value.trim();
                    if (!name) { alert('Name is required.'); return; }
                    const id = (name + '-' + email).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
                    const newMember = { id, name, email, role };
                    if (memberIdx === null) ws.team!.push(newMember);
                    else ws.team![memberIdx] = newMember;
                    settings.workspaces = [...workspaces];
                    modal.style.display = 'none';
                    renderTeamTable();
                };
            }
            renderTeamTable();
        } else if (tabId === 'memory') {
            content.innerHTML = `<div>
                <label>Workspace Memory/Notes:<br><textarea id="workspaceMemory" rows="6" style="width:100%;">${ws.memory || ''}</textarea></label>
            </div>`;
        } else if (tabId === 'docs') {
            // --- Documentation Management ---
            ws.documentation = ws.documentation || [];
            function renderDocsTable() {
                let html = `<div style="margin-bottom:8px;"><button id="addWorkspaceDocBtn" class="ws-action-btn">➕ Add Documentation</button></div>`;
                if (!ws.documentation || ws.documentation.length === 0) {
                    html += `<div class="ws-empty">No documentation added to this workspace.</div>`;
                } else {
                    html += `<table class="crud-table"><thead><tr><th>📄 Type</th><th>🏷️ Label</th><th>🔗 Value</th><th>⚙️ Actions</th></tr></thead><tbody>`;
                    ws.documentation.forEach((doc, idx) => {
                        let typeIcon = doc.type === 'note' ? '📝' : doc.type === 'link' ? '🔗' : doc.type === 'file' ? '📁' : '📄';
                        html += `<tr>
                            <td title="Type">${typeIcon} ${doc.type}</td>
                            <td title="Label">${doc.label || ''}</td>
                            <td title="Value">${doc.value.length > 40 ? doc.value.slice(0, 40) + '…' : doc.value}</td>
                            <td>
                                <button type="button" class="ws-action-btn" data-edit="${idx}" title="Edit documentation">Edit</button>
                                <button type="button" class="ws-action-btn delete" data-delete="${idx}" title="Delete documentation">Delete</button>
                            </td>
                        </tr>`;
                    });
                    html += `</tbody></table>`;
                }
                content.innerHTML = html + `<div id="workspaceDocModal" style="display:none;"></div>`;
                content.querySelectorAll('button[data-edit]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-edit');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx)) showDocModal(idx);
                        }
                    });
                });
                content.querySelectorAll('button[data-delete]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idxStr = (e.target as HTMLElement).getAttribute('data-delete');
                        if (idxStr !== null) {
                            const idx = parseInt(idxStr);
                            if (!isNaN(idx) && confirm('Delete this documentation item?')) {
                                ws.documentation!.splice(idx, 1);
                                settings.workspaces = [...workspaces];
                                renderDocsTable();
                            }
                        }
                    });
                });
                const addBtn = document.getElementById('addWorkspaceDocBtn');
                if (addBtn) addBtn.onclick = () => showDocModal(null);
            }
            function showDocModal(docIdx: number | null) {
                const modal = content.querySelector('#workspaceDocModal') as HTMLElement;
                let doc = docIdx !== null ? ws.documentation![docIdx] : { type: 'note', value: '', label: '' };
                modal.innerHTML = `
                    <div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;">
                        <div class="modal" style="min-width:320px;">
                            <h4>${docIdx === null ? 'Add Documentation' : 'Edit Documentation'}</h4>
                            <div><label>Type:<br>
                                <select id="workspaceDocType">
                                    <option value="note"${doc.type === 'note' ? ' selected' : ''}>📝 Note</option>
                                    <option value="link"${doc.type === 'link' ? ' selected' : ''}>🔗 Link</option>
                                    <option value="file"${doc.type === 'file' ? ' selected' : ''}>📁 File</option>
                                </select>
                            </label></div>
                            <div><label>Label:<br><input id="workspaceDocLabel" value="${doc.label || ''}" /></label></div>
                            <div><label>Value:<br><input id="workspaceDocValue" value="${doc.value || ''}" /></label></div>
                            <div style="margin-top:10px;">
                                <button id="saveWorkspaceDocBtn">Save</button>
                                <button id="cancelWorkspaceDocBtn">Cancel</button>
                            </div>
                        </div>
                    </div>`;
                modal.style.display = 'flex';
                document.getElementById('cancelWorkspaceDocBtn')!.onclick = () => { modal.style.display = 'none'; };
                document.getElementById('saveWorkspaceDocBtn')!.onclick = () => {
                    const type = (document.getElementById('workspaceDocType') as HTMLSelectElement).value as 'note' | 'link' | 'file';
                    const label = (document.getElementById('workspaceDocLabel') as HTMLInputElement).value.trim();
                    const value = (document.getElementById('workspaceDocValue') as HTMLInputElement).value.trim();
                    if (!value) { alert('Value is required.'); return; }
                    const newDoc = { type, label, value };
                    if (docIdx === null) ws.documentation!.push(newDoc);
                    else ws.documentation![docIdx] = newDoc;
                    settings.workspaces = [...workspaces];
                    modal.style.display = 'none';
                    renderDocsTable();
                };
            }
            renderDocsTable();
        }
        // Project/Workspace Documentation Management UI
        ws.documentation = ws.documentation || [];
        function renderDocsTable() {
            let html = `<div style="margin-bottom:8px;"><button id="addWorkspaceDocBtn">Add Documentation</button></div>`;
            if (!ws.documentation || ws.documentation.length === 0) {
                html += `<div style="color:#aaa;">No documentation added to this workspace.</div>`;
            } else {
                html += `<table class="crud-table"><thead><tr><th>Type</th><th>Label</th><th>Value</th><th>Actions</th></tr></thead><tbody>`;
                ws.documentation.forEach((doc, idx) => {
                    html += `<tr>
                            <td>${doc.type}</td>
                            <td>${doc.label || ''}</td>
                            <td>${doc.value.length > 40 ? doc.value.slice(0, 40) + '…' : doc.value}</td>
                            <td>
                                <button type="button" data-edit="${idx}">Edit</button>
                                <button type="button" data-delete="${idx}">Delete</button>
                            </td>
                        </tr>`;
                });
                html += `</tbody></table>`;
            }
            content.innerHTML = html + `<div id="workspaceDocModal" style="display:none;"></div>`;
            // Add/Edit/Delete event listeners
            content.querySelectorAll('button[data-edit]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idxStr = (e.target as HTMLElement).getAttribute('data-edit');
                    if (idxStr !== null) {
                        const idx = parseInt(idxStr);
                        if (!isNaN(idx)) showDocModal(idx);
                    }
                });
            });
            content.querySelectorAll('button[data-delete]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idxStr = (e.target as HTMLElement).getAttribute('data-delete');
                    if (idxStr !== null) {
                        const idx = parseInt(idxStr);
                        if (!isNaN(idx) && confirm('Delete this documentation item?')) {
                            ws.documentation!.splice(idx, 1);
                            settings.workspaces = [...workspaces];
                            renderDocsTable();
                        }
                    }
                });
            });
            const addBtn = document.getElementById('addWorkspaceDocBtn');
            if (addBtn) addBtn.onclick = () => showDocModal(null);
        }
        function showDocModal(docIdx: number | null) {
            const modal = content.querySelector('#workspaceDocModal') as HTMLElement;
            let doc = docIdx !== null ? ws.documentation![docIdx] : { type: 'note', value: '', label: '' };
            modal.innerHTML = `
                    <div class="modal-overlay" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.3);z-index:1000;">
                        <div class="modal" style="min-width:320px;">
                            <h4>${docIdx === null ? 'Add Documentation' : 'Edit Documentation'}</h4>
                            <div><label>Type:<br>
                                <select id="workspaceDocType">
                                    <option value="note"${doc.type === 'note' ? ' selected' : ''}>Note</option>
                                    <option value="link"${doc.type === 'link' ? ' selected' : ''}>Link</option>
                                    <option value="file"${doc.type === 'file' ? ' selected' : ''}>File</option>
                                </select>
                            </label></div>
                            <div><label>Label:<br><input id="workspaceDocLabel" value="${doc.label || ''}" /></label></div>
                            <div><label>Value:<br><input id="workspaceDocValue" value="${doc.value || ''}" /></label></div>
                            <div style="margin-top:10px;">
                                <button id="saveWorkspaceDocBtn">Save</button>
                                <button id="cancelWorkspaceDocBtn">Cancel</button>
                            </div>
                        </div>
                    </div>`;
            modal.style.display = 'flex';
            document.getElementById('cancelWorkspaceDocBtn')!.onclick = () => { modal.style.display = 'none'; };
            document.getElementById('saveWorkspaceDocBtn')!.onclick = () => {
                const type = (document.getElementById('workspaceDocType') as HTMLSelectElement).value as 'note' | 'link' | 'file';
                const label = (document.getElementById('workspaceDocLabel') as HTMLInputElement).value.trim();
                const value = (document.getElementById('workspaceDocValue') as HTMLInputElement).value.trim();
                if (!value) { alert('Value is required.'); return; }
                const newDoc = { type, label, value };
                if (docIdx === null) ws.documentation!.push(newDoc);
                else ws.documentation![docIdx] = newDoc;
                settings.workspaces = [...workspaces];
                modal.style.display = 'none';
                renderDocsTable();
            };
        }
        renderDocsTable();
    }
}
function hideWorkspaceModal(container: HTMLElement) {
    const modal = container.querySelector('#workspaceModal') as HTMLElement;
    modal.innerHTML = '';
    modal.style.display = 'none';
    editingWorkspaceIdx = null;
}

function saveWorkspace(container: HTMLElement, settings: any) {
    const nameInput = document.getElementById('workspaceName') as HTMLInputElement | null;
    const pathInput = document.getElementById('workspacePath') as HTMLInputElement | null;
    const descInput = document.getElementById('workspaceDescription') as HTMLInputElement | null;
    if (!nameInput || !pathInput) return;
    const name = nameInput.value.trim();
    const path = pathInput.value.trim();
    const description = descInput?.value.trim() || '';
    if (!name || !path) {
        alert('Name and Path are required.');
        return;
    }
    const id = (name + '-' + path).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const newWorkspace: Workspace = { id, name, path, description };
    if (editingWorkspaceIdx === null) {
        workspaces.push(newWorkspace);
    } else {
        workspaces[editingWorkspaceIdx] = newWorkspace;
    }
    settings.workspaces = [...workspaces];
    if (!settings.activeWorkspace) settings.activeWorkspace = newWorkspace.id;
    hideWorkspaceModal(container);
    renderWorkspaceTable(container, settings);
}

function deleteWorkspace(container: HTMLElement, idx: number, settings: any) {
    if (!confirm('Delete this workspace? This cannot be undone.')) return;
    workspaces.splice(idx, 1);
    settings.workspaces = [...workspaces];
    // If deleted the active workspace, clear or switch
    if (settings.activeWorkspace && !workspaces.find(ws => ws.id === settings.activeWorkspace)) {
        settings.activeWorkspace = workspaces.length > 0 ? workspaces[0].id : undefined;
    }
    renderWorkspaceTable(container, settings);
}

function switchWorkspace(container: HTMLElement, idx: number, settings: any) {
    const ws = workspaces[idx];
    if (!ws) return;
    settings.activeWorkspace = ws.id;
    renderWorkspaceTable(container, settings);
}

