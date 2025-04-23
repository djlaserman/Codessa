// Handler for Workspace settings messages and logic
import type { Workspace, WorkspaceFile, WorkspaceTeamMember, WorkspaceKnowledgebaseConfig } from '../types';
import type { KnowledgebaseSource } from '../sections/knowledgebaseSection';

// Handler for Workspace settings messages and logic
export function handleWorkspaceMessage(message: any, panel: any) {
    // Message pattern: { command: string, payload: any }
    switch (message.command) {
        case 'addWorkspace':
            // payload: Partial<Workspace>
            return addWorkspace(message.payload, panel);
        case 'editWorkspace':
            // payload: { id: string, updates: Partial<Workspace> }
            return editWorkspace(message.payload, panel);
        case 'deleteWorkspace':
            // payload: { id: string }
            return deleteWorkspace(message.payload, panel);
        case 'addFile':
            // payload: { workspaceId: string, file: WorkspaceFile }
            return addFileToWorkspace(message.payload, panel);
        case 'removeFile':
            // payload: { workspaceId: string, filePath: string }
            return removeFileFromWorkspace(message.payload, panel);
        case 'tagFile':
            // payload: { workspaceId: string, filePath: string, tags: string[] }
            return tagFileInWorkspace(message.payload, panel);
        case 'updateMemory':
            // payload: { workspaceId: string, memory: string }
            return updateWorkspaceMemory(message.payload, panel);
        case 'addDocumentation':
            // payload: { workspaceId: string, doc: { type: string, value: string, label?: string } }
            return addWorkspaceDocumentation(message.payload, panel);
        case 'removeDocumentation':
            // payload: { workspaceId: string, docIndex: number }
            return removeWorkspaceDocumentation(message.payload, panel);
        case 'addTeamMember':
            // payload: { workspaceId: string, member: WorkspaceTeamMember }
            return addWorkspaceTeamMember(message.payload, panel);
        case 'removeTeamMember':
            // payload: { workspaceId: string, memberId: string }
            return removeWorkspaceTeamMember(message.payload, panel);
        case 'addKnowledgebaseSource':
            // payload: { workspaceId: string, source: KnowledgebaseSource }
            return addWorkspaceKnowledgebaseSource(message.payload, panel);
        case 'removeKnowledgebaseSource':
            // payload: { workspaceId: string, sourceIndex: number }
            return removeWorkspaceKnowledgebaseSource(message.payload, panel); // Ensure this function is defined below
        case 'toggleKnowledgebaseSharing':
            // payload: { workspaceId: string, shared: boolean }
            return toggleWorkspaceKnowledgebaseSharing(message.payload, panel); // Ensure this function is defined below
        default:
            // Unknown command
            return;
    }
}

// --- Workspace CRUD ---
function addWorkspace(payload: Partial<Workspace>, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'addWorkspace', success: false, data: null, error: null };
    if (!payload || !payload.id || !payload.name || !payload.path) {
        response.error = 'Missing required workspace fields.';
        panel.postMessage(response);
        return;
    }
    if (settings.workspaces.find((w: Workspace) => w.id === payload.id)) {
        response.error = 'Workspace with this id already exists.';
        panel.postMessage(response);
        return;
    }
    const ws: Workspace = {
        id: payload.id,
        name: payload.name,
        path: payload.path,
        description: payload.description || '',
        tags: payload.tags || [],
        files: payload.files || [],
        team: payload.team || [],
        memory: payload.memory || '',
        documentation: payload.documentation || [],
        knowledgebase: payload.knowledgebase || { sources: [], shared: false }
    };
    settings.workspaces.push(ws);
    response.success = true;
    response.data = ws;
    panel.postMessage(response);
}
function editWorkspace(payload: { id: string, updates: Partial<Workspace> }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'editWorkspace', success: false, data: null, error: null };
    if (!payload || !payload.id) {
        response.error = 'Workspace id required.';
        panel.postMessage(response);
        return;
    }
    const idx = settings.workspaces.findIndex((w: Workspace) => w.id === payload.id);
    if (idx === -1) {
        response.error = 'Workspace not found.';
        panel.postMessage(response);
        return;
    }
    settings.workspaces[idx] = { ...settings.workspaces[idx], ...payload.updates };
    response.success = true;
    response.data = settings.workspaces[idx];
    panel.postMessage(response);
}
function deleteWorkspace(payload: { id: string }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'deleteWorkspace', success: false, data: null, error: null };
    if (!payload || !payload.id) {
        response.error = 'Workspace id required.';
        panel.postMessage(response);
        return;
    }
    const idx = settings.workspaces.findIndex((w: Workspace) => w.id === payload.id);
    if (idx === -1) {
        response.error = 'Workspace not found.';
        panel.postMessage(response);
        return;
    }
    settings.workspaces.splice(idx, 1);
    response.success = true;
    panel.postMessage(response);
}
// --- File Management ---
function addFileToWorkspace(payload: { workspaceId: string, file: WorkspaceFile }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'addFile', success: false, data: null, error: null };
    if (!payload || !payload.workspaceId || !payload.file || !payload.file.path) {
        response.error = 'Missing required file or workspace fields.';
        panel.postMessage(response);
        return;
    }
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws) {
        response.error = 'Workspace not found.';
        panel.postMessage(response);
        return;
    }
    ws.files = ws.files || [];
    if (ws.files.find((f: WorkspaceFile) => f.path === payload.file.path)) {
        response.error = 'File already exists in workspace.';
        panel.postMessage(response);
        return;
    }
    ws.files.push(payload.file);
    response.success = true;
    response.data = ws.files;
    panel.postMessage(response);
}
function removeFileFromWorkspace(payload: { workspaceId: string, filePath: string }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'removeFile', success: false, data: null, error: null };
    if (!payload || !payload.workspaceId || !payload.filePath) {
        response.error = 'Missing required file or workspace fields.';
        panel.postMessage(response);
        return;
    }
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws || !ws.files) {
        response.error = 'Workspace or file not found.';
        panel.postMessage(response);
        return;
    }
    const idx = ws.files.findIndex((f: WorkspaceFile) => f.path === payload.filePath);
    if (idx === -1) {
        response.error = 'File not found in workspace.';
        panel.postMessage(response);
        return;
    }
    ws.files.splice(idx, 1);
    response.success = true;
    response.data = ws.files;
    panel.postMessage(response);
}
function tagFileInWorkspace(payload: { workspaceId: string, filePath: string, tags: string[] }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'tagFile', success: false, data: null, error: null };
    if (!payload || !payload.workspaceId || !payload.filePath || !Array.isArray(payload.tags)) {
        response.error = 'Missing required fields.';
        panel.postMessage(response);
        return;
    }
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws || !ws.files) {
        response.error = 'Workspace or file not found.';
        panel.postMessage(response);
        return;
    }
    const file = ws.files.find((f: WorkspaceFile) => f.path === payload.filePath);
    if (!file) {
        response.error = 'File not found in workspace.';
        panel.postMessage(response);
        return;
    }
    file.tags = payload.tags;
    response.success = true;
    response.data = file;
    panel.postMessage(response);
}
// --- Workspace Memory ---
function updateWorkspaceMemory(payload: { workspaceId: string, memory: string }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'updateMemory', success: false, data: null, error: null };
    if (!payload || !payload.workspaceId) {
        response.error = 'Missing required workspace id.';
        panel.postMessage(response);
        return;
    }
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws) {
        response.error = 'Workspace not found.';
        panel.postMessage(response);
        return;
    }
    ws.memory = payload.memory;
    response.success = true;
    response.data = ws.memory;
    panel.postMessage(response);
}
// --- Documentation ---
function addWorkspaceDocumentation(payload: { workspaceId: string, doc: { type: string, value: string, label?: string } }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'addDocumentation', success: false, data: null, error: null };
    if (!payload || !payload.workspaceId || !payload.doc || !payload.doc.type || !payload.doc.value) {
        response.error = 'Missing required documentation fields.';
        panel.postMessage(response);
        return;
    }
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws) {
        response.error = 'Workspace not found.';
        panel.postMessage(response);
        return;
    }
    ws.documentation = ws.documentation || [];
    ws.documentation.push(payload.doc);
    response.success = true;
    response.data = ws.documentation;
    panel.postMessage(response);
}
function removeWorkspaceDocumentation(payload: { workspaceId: string, docIndex: number }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'removeDocumentation', success: false, data: null, error: null };
    if (!payload || !payload.workspaceId || typeof payload.docIndex !== 'number') {
        response.error = 'Missing required documentation fields.';
        panel.postMessage(response);
        return;
    }
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws || !ws.documentation || payload.docIndex < 0 || payload.docIndex >= ws.documentation.length) {
        response.error = 'Workspace or documentation not found.';
        panel.postMessage(response);
        return;
    }
    ws.documentation.splice(payload.docIndex, 1);
    response.success = true;
    response.data = ws.documentation;
    panel.postMessage(response);
}
// --- Team Members ---
function addWorkspaceTeamMember(payload: { workspaceId: string, member: WorkspaceTeamMember }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'addTeamMember', success: false, data: null, error: null };
    if (!payload || !payload.workspaceId || !payload.member || !payload.member.id) {
        response.error = 'Missing required team member fields.';
        panel.postMessage(response);
        return;
    }
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws) {
        response.error = 'Workspace not found.';
        panel.postMessage(response);
        return;
    }
    ws.team = ws.team || [];
    if (ws.team.find((m: WorkspaceTeamMember) => m.id === payload.member.id)) {
        response.error = 'Team member already exists.';
        panel.postMessage(response);
        return;
    }
    ws.team.push(payload.member);
    response.success = true;
    response.data = ws.team;
    panel.postMessage(response);
}
function removeWorkspaceTeamMember(payload: { workspaceId: string, memberId: string }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'removeTeamMember', success: false, data: null, error: null };
    if (!payload || !payload.workspaceId || !payload.memberId) {
        response.error = 'Missing required team member fields.';
        panel.postMessage(response);
        return;
    }
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws || !ws.team) {
        response.error = 'Workspace or team not found.';
        panel.postMessage(response);
        return;
    }
    const idx = ws.team.findIndex((m: WorkspaceTeamMember) => m.id === payload.memberId);
    if (idx === -1) {
        response.error = 'Team member not found.';
        panel.postMessage(response);
        return;
    }
    ws.team.splice(idx, 1);
    response.success = true;
    response.data = ws.team;
    panel.postMessage(response);
}
// --- Knowledgebase ---
export function addWorkspaceKnowledgebaseSource(payload: { workspaceId: string, source: KnowledgebaseSource }, panel: any) {
    // Modular: delegate to knowledgebaseSection logic
    // Example: knowledgebaseSection.addKnowledgebaseSourceToWorkspace(payload.workspaceId, payload.source);
    // If not implemented, add in knowledgebaseSection.ts:
    // export function addKnowledgebaseSourceToWorkspace(workspaceId: string, source: KnowledgebaseSource, panel: any) { ... }
    // Directly update workspace knowledgebase sources
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'addKnowledgebaseSource', success: false, data: null, error: null };
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws) {
        response.error = 'Workspace not found.';
        panel.postMessage(response);
        return;
    }
    ws.knowledgebase = ws.knowledgebase || { sources: [], shared: false };
    ws.knowledgebase.sources = ws.knowledgebase.sources || [];
    ws.knowledgebase.sources.push(payload.source);
    response.success = true;
    response.data = ws.knowledgebase.sources;
    panel.postMessage(response);

export function removeWorkspaceKnowledgebaseSource(payload: { workspaceId: string, sourceIndex: number }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'removeKnowledgebaseSource', success: false, data: null, error: null };
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws || !ws.knowledgebase || !Array.isArray(ws.knowledgebase.sources)) {
        response.error = 'Workspace or knowledgebase not found.';
        panel.postMessage(response);
        return;
    }
    if (typeof payload.sourceIndex !== 'number' || payload.sourceIndex < 0 || payload.sourceIndex >= ws.knowledgebase.sources.length) {
        response.error = 'Invalid knowledgebase source index.';
        panel.postMessage(response);
        return;
    }
    ws.knowledgebase.sources.splice(payload.sourceIndex, 1);
    response.success = true;
    response.data = ws.knowledgebase.sources;
    panel.postMessage(response);
}
export function toggleWorkspaceKnowledgebaseSharing(payload: { workspaceId: string, shared: boolean }, panel: any) {
    const settings = (window as any).settings || {};
    settings.workspaces = Array.isArray(settings.workspaces) ? settings.workspaces : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: 'toggleKnowledgebaseSharing', success: false, data: null, error: null };
    const ws = settings.workspaces.find((w: Workspace) => w.id === payload.workspaceId);
    if (!ws || !ws.knowledgebase) {
        response.error = 'Workspace or knowledgebase not found.';
        panel.postMessage(response);
        return;
    }
    ws.knowledgebase.shared = !!payload.shared;
    response.success = true;
    response.data = ws.knowledgebase.shared;
    panel.postMessage(response);
}

// Additional helpers and logic can be added as needed.

}
