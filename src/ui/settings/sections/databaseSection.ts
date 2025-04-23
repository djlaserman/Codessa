// Database section logic and rendering
// Utility to ensure parseInt always gets a string
function safeGetString(val: string | null | undefined): string {
    return typeof val === 'string' ? val : '';
}

import { showModal } from '../components/modal';

export type DatabaseConnection = {
    name: string;
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    enabled: boolean;
};

let databaseConnections: DatabaseConnection[] = [];
let editingDbIdx: number | null = null;

export function renderDatabaseSection(container: HTMLElement, settings: any) {
    // Sync from settings
    databaseConnections = Array.isArray(settings.databaseConnections) ? settings.databaseConnections : [];
    renderDatabaseTable(container);
    // Add button listeners
    const addBtn = document.getElementById('addDatabaseBtn');
    if (addBtn) addBtn.onclick = () => showDatabaseModal(container, {}, null);
    // Modal buttons
    const cancelBtn = document.getElementById('cancelDatabaseBtn');
    if (cancelBtn) cancelBtn.onclick = () => hideDatabaseModal(container);
    const saveBtn = document.getElementById('saveDatabaseBtn');
    if (saveBtn) saveBtn.onclick = () => saveDatabase(container, settings);
}

function renderDatabaseTable(container: HTMLElement) {
    const section = container.querySelector('#databaseSection') as HTMLElement;
    if (!databaseConnections || databaseConnections.length === 0) {
        section.innerHTML = '<div style="color:#aaa;">No database connections defined.</div>';
        return;
    }
    let html = '<table class="crud-table"><thead><tr>' +
        '<th>Name</th><th>Type</th><th>Host</th><th>Port</th><th>Username</th><th>Database</th><th>Enabled</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    databaseConnections.forEach((db, idx) => {
        html += `<tr>
            <td>${db.name || ''}</td>
            <td>${db.type || ''}</td>
            <td>${db.host || ''}</td>
            <td>${db.port || ''}</td>
            <td>${db.username || ''}</td>
            <td>${db.database || ''}</td>
            <td>${db.enabled ? 'Yes' : 'No'}</td>
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
showDatabaseModal(container, databaseConnections[idx], idx);
        });
    });
    section.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxAttr = (e.target as HTMLElement).getAttribute('data-delete');
const idx = parseInt(safeGetString(idxAttr));
deleteDatabase(container, idx);
        });
    });
}


function showDatabaseModal(container: HTMLElement, db: Partial<DatabaseConnection>, idx: number | null) {
    editingDbIdx = idx;
    showModal({
        title: idx == null ? 'Add Database Connection' : 'Edit Database Connection',
        content: `
            <form id="databaseModalForm" autocomplete="off" style="display:flex;flex-direction:column;gap:12px;min-width:320px;">
                <label>Name:<br><input type="text" id="databaseName" value="${db?.name || ''}" required style="width:100%"></label>
                <label>Type:<br><input type="text" id="databaseType" value="${db?.type || ''}" required style="width:100%"></label>
                <label>Host:<br><input type="text" id="databaseHost" value="${db?.host || ''}" required style="width:100%"></label>
                <label>Port:<br><input type="number" id="databasePort" value="${db?.port ?? ''}" required style="width:100%"></label>
                <label>Username:<br><input type="text" id="databaseUsername" value="${db?.username || ''}" style="width:100%"></label>
                <label>Password:<br><input type="password" id="databasePassword" value="${db?.password || ''}" style="width:100%"></label>
                <label>Database Name:<br><input type="text" id="databaseDbName" value="${db?.database || ''}" style="width:100%"></label>
                <label><input type="checkbox" id="databaseEnabled" ${db?.enabled ? 'checked' : ''}/> Enabled</label>
            </form>
        `,
        onConfirm: () => saveDatabase(container, (window as any).settings || {}),
        onCancel: () => { editingDbIdx = null; }
    });
}

function hideDatabaseModal(container: HTMLElement) {
    // No longer needed with global modal
}

function saveDatabase(container: HTMLElement, settings: any) {
    const nameInput = document.getElementById('databaseName') as HTMLInputElement | null;
    const typeInput = document.getElementById('databaseType') as HTMLInputElement | null;
    const hostInput = document.getElementById('databaseHost') as HTMLInputElement | null;
    const portInput = document.getElementById('databasePort') as HTMLInputElement | null;
    const usernameInput = document.getElementById('databaseUsername') as HTMLInputElement | null;
    const passwordInput = document.getElementById('databasePassword') as HTMLInputElement | null;
    const dbNameInput = document.getElementById('databaseDbName') as HTMLInputElement | null;
    const enabledInput = document.getElementById('databaseEnabled') as HTMLInputElement | null;
    const db: DatabaseConnection = {
        name: nameInput?.value.trim() || '',
        type: typeInput?.value.trim() || '',
        host: hostInput?.value.trim() || '',
        port: parseInt(portInput?.value || '0', 10),
        username: usernameInput?.value.trim() || '',
        password: passwordInput?.value || '',
        database: dbNameInput?.value.trim() || '',
        enabled: enabledInput?.checked || false,
    };
    if (!db.name || !db.type || !db.host || !db.port) {
        alert('Name, Type, Host, and Port are required.');
        return;
    }
    if (editingDbIdx == null) {
        databaseConnections.push(db);
    } else {
        databaseConnections[editingDbIdx] = db;
    }
    settings.databaseConnections = databaseConnections;
    renderDatabaseTable(container);
}


function deleteDatabase(container: HTMLElement, idx: number) {
    showModal({
        title: 'Delete Database Connection',
        content: `<div>Are you sure you want to delete this database connection?</div>`,
        onConfirm: () => {
            databaseConnections.splice(idx, 1);
            const settings = (window as any).settings || {};
            settings.databaseConnections = databaseConnections;
            renderDatabaseTable(container);
        },
        onCancel: () => {}
    });
}
