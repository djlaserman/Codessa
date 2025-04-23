// Handler for Database settings messages and logic
export function handleDatabaseMessage(message: any, panel: any) {
    const settings = (window as any).settings || {};
    settings.databaseConnections = Array.isArray(settings.databaseConnections) ? settings.databaseConnections : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: message.type, success: false, data: null, error: null };
    try {
        switch (message.type) {
            case 'getDatabases': {
                response.success = true;
                response.data = settings.databaseConnections;
                break;
            }
            case 'addDatabase': {
                const db = message.db;
                if (!db || !db.name || !db.type || !db.host || !db.port) {
                    response.error = 'Missing required database fields.';
                    break;
                }
                db.id = db.id || (db.name + '-' + db.host + '-' + db.port).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
                settings.databaseConnections.push(db);
                response.success = true;
                response.data = db;
                break;
            }
            case 'editDatabase': {
                const db = message.db;
                if (!db || !db.id) {
                    response.error = 'Database id required.';
                    break;
                }
                const idx = settings.databaseConnections.findIndex((d: any) => d.id === db.id);
                if (idx === -1) {
                    response.error = 'Database not found.';
                    break;
                }
                settings.databaseConnections[idx] = { ...settings.databaseConnections[idx], ...db };
                response.success = true;
                response.data = settings.databaseConnections[idx];
                break;
            }
            case 'deleteDatabase': {
                const id = message.id;
                if (!id) {
                    response.error = 'Database id required.';
                    break;
                }
                const idx = settings.databaseConnections.findIndex((d: any) => d.id === id);
                if (idx === -1) {
                    response.error = 'Database not found.';
                    break;
                }
                settings.databaseConnections.splice(idx, 1);
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

