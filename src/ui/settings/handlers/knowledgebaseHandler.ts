// Handler for Knowledgebase settings messages and logic
export function handleKnowledgebaseMessage(message: any, panel: any) {
    const settings = (window as any).settings || {};
    settings.knowledgebases = Array.isArray(settings.knowledgebases) ? settings.knowledgebases : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: message.type, success: false, data: null, error: null };
    try {
        switch (message.type) {
            case 'getKnowledgebases': {
                response.success = true;
                response.data = settings.knowledgebases;
                break;
            }
            case 'addKnowledgebase': {
                const kb = message.kb;
                if (!kb || !kb.name || !kb.id) {
                    response.error = 'Missing required knowledgebase fields.';
                    break;
                }
                settings.knowledgebases.push(kb);
                response.success = true;
                response.data = kb;
                break;
            }
            case 'editKnowledgebase': {
                const kb = message.kb;
                if (!kb || !kb.id) {
                    response.error = 'Knowledgebase id required.';
                    break;
                }
                const idx = settings.knowledgebases.findIndex((k: any) => k.id === kb.id);
                if (idx === -1) {
                    response.error = 'Knowledgebase not found.';
                    break;
                }
                settings.knowledgebases[idx] = { ...settings.knowledgebases[idx], ...kb };
                response.success = true;
                response.data = settings.knowledgebases[idx];
                break;
            }
            case 'deleteKnowledgebase': {
                const id = message.id;
                if (!id) {
                    response.error = 'Knowledgebase id required.';
                    break;
                }
                const idx = settings.knowledgebases.findIndex((k: any) => k.id === id);
                if (idx === -1) {
                    response.error = 'Knowledgebase not found.';
                    break;
                }
                settings.knowledgebases.splice(idx, 1);
                response.success = true;
                break;
            }
            default: {
                response.error = 'Unknown message type.';
            }
        }
    } catch (err: any) {
        response.error = err?.message || String(err);
    }
    panel.postMessage(response);
}

