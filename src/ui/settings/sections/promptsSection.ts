// Prompts section logic and rendering

// Utility to ensure parseInt always gets a string
function safeGetString(val: string | null | undefined): string {
    return typeof val === 'string' ? val : '';
}

export type Prompt = {
    name: string;
    type: string;
    text: string;
    variables: string[];
    template: string;
};

let prompts: Prompt[] = [];
let editingPromptIdx: number | null = null;

export function renderPromptsSection(container: HTMLElement, settings: any) {
    // Sync from settings
    prompts = Array.isArray(settings.prompts) ? settings.prompts : [];
    renderPromptsTable(container);
    // Add button listeners
    const addBtn = document.getElementById('addPromptBtn');
    if (addBtn) addBtn.onclick = () => showPromptModal(container, {}, null);
    // Modal buttons
    const cancelPromptBtn = document.getElementById('cancelPromptBtn');
    if (cancelPromptBtn) cancelPromptBtn.onclick = () => hidePromptModal(container);
    const savePromptBtn = document.getElementById('savePromptBtn');
    if (savePromptBtn) savePromptBtn.onclick = () => savePrompt(container, settings);
}

function renderPromptsTable(container: HTMLElement) {
    const section = container.querySelector('#promptsSection') as HTMLElement;
    if (!prompts || prompts.length === 0) {
        section.innerHTML = '<div style="color:#aaa;">No prompts defined.</div>';
        return;
    }
    let html = '<table class="crud-table"><thead><tr>' +
        '<th>Name</th><th>Type</th><th>Text</th><th>Variables</th><th>Template</th><th>Actions</th>' +
        '</tr></thead><tbody>';
    prompts.forEach((p, idx) => {
        html += `<tr>
            <td>${p.name || ''}</td>
            <td>${p.type || ''}</td>
            <td>${(p.text||'').slice(0,40)}${(p.text||'').length>40?'...':''}</td>
            <td>${(p.variables||[]).join(',')}</td>
            <td>${p.template||''}</td>
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
showPromptModal(container, prompts[idx], idx);
        });
    });
    section.querySelectorAll('button[data-delete]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idxAttr = (e.target as HTMLElement).getAttribute('data-delete');
const idx = parseInt(safeGetString(idxAttr));
deletePrompt(container, idx);
        });
    });
}

function showPromptModal(container: HTMLElement, prompt: Partial<Prompt>, idx: number | null) {
    const modal = document.getElementById('promptModal');
    const title = document.getElementById('promptModalTitle');
    const nameInput = document.getElementById('promptName') as HTMLInputElement | null;
    const typeInput = document.getElementById('promptType') as HTMLSelectElement | null;
    const textInput = document.getElementById('promptText') as HTMLTextAreaElement | null;
    const varsInput = document.getElementById('promptVars') as HTMLInputElement | null;
    const templateInput = document.getElementById('promptTemplate') as HTMLInputElement | null;
    if (modal) modal.style.display = 'flex';
    if (title) title.innerText = idx == null ? 'Add Prompt' : 'Edit Prompt';
    if (nameInput) nameInput.value = prompt?.name || '';
    if (typeInput) typeInput.value = prompt?.type || 'system';
    if (textInput) textInput.value = prompt?.text || '';
    if (varsInput) varsInput.value = (prompt?.variables||[]).join(',');
    if (templateInput) templateInput.value = prompt?.template || '';
    editingPromptIdx = idx;
}

function hidePromptModal(container: HTMLElement) {
    const modal = document.getElementById('promptModal');
    if (modal) modal.style.display = 'none';
}

function savePrompt(container: HTMLElement, settings: any) {
    const nameInput = document.getElementById('promptName') as HTMLInputElement | null;
    const typeInput = document.getElementById('promptType') as HTMLSelectElement | null;
    const textInput = document.getElementById('promptText') as HTMLTextAreaElement | null;
    const varsInput = document.getElementById('promptVars') as HTMLInputElement | null;
    const templateInput = document.getElementById('promptTemplate') as HTMLInputElement | null;
    const prompt: Prompt = {
        name: nameInput?.value || '',
        type: typeInput?.value || 'system',
        text: textInput?.value || '',
        variables: varsInput?.value ? varsInput.value.split(',').map(v => v.trim()).filter(Boolean) : [],
        template: templateInput?.value || ''
    };
    if (editingPromptIdx == null) {
        prompts.push(prompt);
    } else {
        prompts[editingPromptIdx] = prompt;
    }
    settings.prompts = prompts;
    hidePromptModal(container);
    renderPromptsTable(container);
}

function deletePrompt(container: HTMLElement, idx: number) {
    if (confirm('Delete this prompt?')) {
        prompts.splice(idx, 1);
        const settings = (window as any).settings || {};
        settings.prompts = prompts;
        renderPromptsTable(container);
    }
}

