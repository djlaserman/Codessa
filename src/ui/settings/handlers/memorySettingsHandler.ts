// Handler for Memory Management messages and logic
export function handleMemorySettingsMessage(message: any, panel: any) {
    const settings = (window as any).settings || {};
    settings.memories = Array.isArray(settings.memories) ? settings.memories : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: message.type, success: false, data: null, error: null };
    try {
        switch (message.type) {
            case 'getMemories': {
                response.success = true;
                response.data = settings.memories;
                break;
            }
            case 'addMemory': {
                const memory = message.memory;
                if (!memory || !memory.id || !memory.content) {
                    response.error = 'Missing required memory fields.';
                    break;
                }
                settings.memories.push(memory);
                response.success = true;
                response.data = memory;
                break;
            }
            case 'editMemory': {
                const memory = message.memory;
                if (!memory || !memory.id) {
                    response.error = 'Memory id required.';
                    break;
                }
                const idx = settings.memories.findIndex((m: any) => m.id === memory.id);
                if (idx === -1) {
                    response.error = 'Memory not found.';
                    break;
                }
                settings.memories[idx] = { ...settings.memories[idx], ...memory };
                response.success = true;
                response.data = settings.memories[idx];
                break;
            }
            case 'deleteMemory': {
                const id = message.id;
                if (!id) {
                    response.error = 'Memory id required.';
                    break;
                }
                const idx = settings.memories.findIndex((m: any) => m.id === id);
                if (idx === -1) {
                    response.error = 'Memory not found.';
                    break;
                }
                settings.memories.splice(idx, 1);
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

