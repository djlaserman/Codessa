// Handler for TTS settings messages and logic
export function handleTTSMessage(message: any, panel: any) {
    const settings = (window as any).settings || {};
    settings.ttsVoices = Array.isArray(settings.ttsVoices) ? settings.ttsVoices : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: message.type, success: false, data: null, error: null };
    try {
        switch (message.type) {
            case 'getTTS': {
                response.success = true;
                response.data = settings.ttsVoices;
                break;
            }
            case 'addTTS': {
                const tts = message.tts;
                if (!tts || !tts.name || !tts.id) {
                    response.error = 'Missing required TTS fields.';
                    break;
                }
                settings.ttsVoices.push(tts);
                response.success = true;
                response.data = tts;
                break;
            }
            case 'editTTS': {
                const tts = message.tts;
                if (!tts || !tts.id) {
                    response.error = 'TTS id required.';
                    break;
                }
                const idx = settings.ttsVoices.findIndex((t: any) => t.id === tts.id);
                if (idx === -1) {
                    response.error = 'TTS voice not found.';
                    break;
                }
                settings.ttsVoices[idx] = { ...settings.ttsVoices[idx], ...tts };
                response.success = true;
                response.data = settings.ttsVoices[idx];
                break;
            }
            case 'deleteTTS': {
                const id = message.id;
                if (!id) {
                    response.error = 'TTS id required.';
                    break;
                }
                const idx = settings.ttsVoices.findIndex((t: any) => t.id === id);
                if (idx === -1) {
                    response.error = 'TTS voice not found.';
                    break;
                }
                settings.ttsVoices.splice(idx, 1);
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

