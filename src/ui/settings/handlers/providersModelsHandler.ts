// Handler for Providers & Models CRUD messages and logic
export function handleProvidersModelsMessage(message: any, panel: any) {
    const settings = (window as any).settings || {};
    settings.providers = Array.isArray(settings.providers) ? settings.providers : [];
    settings.models = Array.isArray(settings.models) ? settings.models : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: message.type, success: false, data: null, error: null };
    try {
        switch (message.type) {
            case 'getProviders': {
                response.success = true;
                response.data = settings.providers;
                break;
            }
            case 'getModels': {
                response.success = true;
                response.data = settings.models;
                break;
            }
            case 'addProvider': {
                const provider = message.provider;
                if (!provider || !provider.name || !provider.id) {
                    response.error = 'Missing required provider fields.';
                    break;
                }
                settings.providers.push(provider);
                response.success = true;
                response.data = provider;
                break;
            }
            case 'editProvider': {
                const provider = message.provider;
                if (!provider || !provider.id) {
                    response.error = 'Provider id required.';
                    break;
                }
                const idx = settings.providers.findIndex((p: any) => p.id === provider.id);
                if (idx === -1) {
                    response.error = 'Provider not found.';
                    break;
                }
                settings.providers[idx] = { ...settings.providers[idx], ...provider };
                response.success = true;
                response.data = settings.providers[idx];
                break;
            }
            case 'deleteProvider': {
                const id = message.id;
                if (!id) {
                    response.error = 'Provider id required.';
                    break;
                }
                const idx = settings.providers.findIndex((p: any) => p.id === id);
                if (idx === -1) {
                    response.error = 'Provider not found.';
                    break;
                }
                settings.providers.splice(idx, 1);
                response.success = true;
                break;
            }
            case 'addModel': {
                const model = message.model;
                if (!model || !model.name || !model.id) {
                    response.error = 'Missing required model fields.';
                    break;
                }
                settings.models.push(model);
                response.success = true;
                response.data = model;
                break;
            }
            case 'editModel': {
                const model = message.model;
                if (!model || !model.id) {
                    response.error = 'Model id required.';
                    break;
                }
                const idx = settings.models.findIndex((m: any) => m.id === model.id);
                if (idx === -1) {
                    response.error = 'Model not found.';
                    break;
                }
                settings.models[idx] = { ...settings.models[idx], ...model };
                response.success = true;
                response.data = settings.models[idx];
                break;
            }
            case 'deleteModel': {
                const id = message.id;
                if (!id) {
                    response.error = 'Model id required.';
                    break;
                }
                const idx = settings.models.findIndex((m: any) => m.id === id);
                if (idx === -1) {
                    response.error = 'Model not found.';
                    break;
                }
                settings.models.splice(idx, 1);
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

