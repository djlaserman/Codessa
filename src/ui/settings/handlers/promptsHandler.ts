// Handler for Prompts CRUD messages and logic
export function handlePromptsMessage(message: any, panel: any) {
    const settings = (window as any).settings || {};
    settings.prompts = Array.isArray(settings.prompts) ? settings.prompts : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: message.type, success: false, data: null, error: null };
    try {
        switch (message.type) {
            case 'getPrompts': {
                response.success = true;
                response.data = settings.prompts;
                break;
            }
            case 'addPrompt': {
                const prompt = message.prompt;
                if (!prompt || !prompt.name || !prompt.id) {
                    response.error = 'Missing required prompt fields.';
                    break;
                }
                settings.prompts.push(prompt);
                response.success = true;
                response.data = prompt;
                break;
            }
            case 'editPrompt': {
                const prompt = message.prompt;
                if (!prompt || !prompt.id) {
                    response.error = 'Prompt id required.';
                    break;
                }
                const idx = settings.prompts.findIndex((p: any) => p.id === prompt.id);
                if (idx === -1) {
                    response.error = 'Prompt not found.';
                    break;
                }
                settings.prompts[idx] = { ...settings.prompts[idx], ...prompt };
                response.success = true;
                response.data = settings.prompts[idx];
                break;
            }
            case 'deletePrompt': {
                const id = message.id;
                if (!id) {
                    response.error = 'Prompt id required.';
                    break;
                }
                const idx = settings.prompts.findIndex((p: any) => p.id === id);
                if (idx === -1) {
                    response.error = 'Prompt not found.';
                    break;
                }
                settings.prompts.splice(idx, 1);
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

