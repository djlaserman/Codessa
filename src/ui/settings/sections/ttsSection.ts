// TTS section logic and rendering

// Utility to ensure parseInt always gets a string
function safeGetString(val: string | null | undefined): string {
    return typeof val === 'string' ? val : '';
}

export type TTSVoice = {
    name: string;
    provider: string;
    language: string;
    voiceId: string;
    enabled: boolean;
};

let ttsVoices: TTSVoice[] = [];
let editingTtsIdx: number | null = null;

export function renderTTSSection(container: HTMLElement, settings: any) {
    // Sync from settings
    ttsVoices = Array.isArray(settings.ttsVoices) ? settings.ttsVoices : [];
    renderTTSTable(container);
    // Add button listeners
    const addBtn = document.getElementById('addTTSBtn');
    if (addBtn) addBtn.onclick = () => showTTSModal(container, {}, null);
    // Modal buttons
    const cancelBtn = document.getElementById('cancelTTSBtn');
    if (cancelBtn) cancelBtn.onclick = () => hideTTSModal(container);
    const saveBtn = document.getElementById('saveTTSBtn');
    if (saveBtn) saveBtn.onclick = () => saveTTS(container, settings);
}

function renderTTSTable(container: HTMLElement) {
    const section = container.querySelector('#ttsSection') as HTMLElement;
    if (!ttsVoices || ttsVoices.length === 0) {
        section.innerHTML = '<div style="color:#aaa;">No TTS voices defined.</div>';
        return;
    }
    let html = '<table class="crud-table"><thead><tr>' +
        '<th>Name</th><th>Provider</th><th>Language</th><th>Voice ID</th><th>Enabled</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    ttsVoices.forEach((tts, idx) => {
        html += `<tr>
            <td>${tts.name || ''}</td>
            <td>${tts.provider || ''}</td>
            <td>${tts.language || ''}</td>
            <td>${tts.voiceId || ''}</td>
            <td>${tts.enabled ? 'Yes' : 'No'}</td>
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
showTTSModal(container, ttsVoices[idx], idx);
        });
    });
    section.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxAttr = (e.target as HTMLElement).getAttribute('data-delete');
const idx = parseInt(safeGetString(idxAttr));
deleteTTS(container, idx);
        });
    });
}

function showTTSModal(container: HTMLElement, tts: Partial<TTSVoice>, idx: number | null) {
    const modal = document.getElementById('ttsModal');
    const title = document.getElementById('ttsModalTitle');
    const nameInput = document.getElementById('ttsName') as HTMLInputElement | null;
    const providerInput = document.getElementById('ttsProvider') as HTMLInputElement | null;
    const languageInput = document.getElementById('ttsLanguage') as HTMLInputElement | null;
    const voiceIdInput = document.getElementById('ttsVoiceId') as HTMLInputElement | null;
    const enabledInput = document.getElementById('ttsEnabled') as HTMLInputElement | null;
    if (modal) modal.style.display = 'flex';
    if (title) title.innerText = idx == null ? 'Add TTS Voice' : 'Edit TTS Voice';
    if (nameInput) nameInput.value = tts?.name || '';
    if (providerInput) providerInput.value = tts?.provider || '';
    if (languageInput) languageInput.value = tts?.language || '';
    if (voiceIdInput) voiceIdInput.value = tts?.voiceId || '';
    if (enabledInput) enabledInput.checked = !!tts?.enabled;
    editingTtsIdx = idx;
}

function hideTTSModal(container: HTMLElement) {
    const modal = document.getElementById('ttsModal');
    if (modal) modal.style.display = 'none';
}

function saveTTS(container: HTMLElement, settings: any) {
    const nameInput = document.getElementById('ttsName') as HTMLInputElement | null;
    const providerInput = document.getElementById('ttsProvider') as HTMLInputElement | null;
    const languageInput = document.getElementById('ttsLanguage') as HTMLInputElement | null;
    const voiceIdInput = document.getElementById('ttsVoiceId') as HTMLInputElement | null;
    const enabledInput = document.getElementById('ttsEnabled') as HTMLInputElement | null;
    const tts: TTSVoice = {
        name: nameInput?.value || '',
        provider: providerInput?.value || '',
        language: languageInput?.value || '',
        voiceId: voiceIdInput?.value || '',
        enabled: enabledInput?.checked || false,
    };
    if (editingTtsIdx == null) {
        ttsVoices.push(tts);
    } else {
        ttsVoices[editingTtsIdx] = tts;
    }
    settings.ttsVoices = ttsVoices;
    hideTTSModal(container);
    renderTTSTable(container);
}

function deleteTTS(container: HTMLElement, idx: number) {
    if (confirm('Delete this TTS voice?')) {
        ttsVoices.splice(idx, 1);
        const settings = (window as any).settings || {};
        settings.ttsVoices = ttsVoices;
        renderTTSTable(container);
    }
}
