// Handler for Agents CRUD messages and logic
export function handleAgentsMessage(message: any, panel: any) {
    const settings = (window as any).settings || {};
    settings.agents = Array.isArray(settings.agents) ? settings.agents : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = { type: message.type, success: false, data: null, error: null };
    try {
        switch (message.type) {
            case 'getAgents': {
                response.success = true;
                response.data = settings.agents;
                break;
            }
            case 'addAgent': {
                const agent = message.agent;
                if (!agent || !agent.name || !agent.provider || !agent.modelId) {
                    response.error = 'Missing required agent fields.';
                    break;
                }
                agent.id = agent.id || (agent.name + '-' + agent.provider + '-' + agent.modelId).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
                settings.agents.push(agent);
                response.success = true;
                response.data = agent;
                break;
            }
            case 'editAgent': {
                const agent = message.agent;
                if (!agent || !agent.id) {
                    response.error = 'Agent id required.';
                    break;
                }
                const idx = settings.agents.findIndex((a: any) => a.id === agent.id);
                if (idx === -1) {
                    response.error = 'Agent not found.';
                    break;
                }
                settings.agents[idx] = { ...settings.agents[idx], ...agent };
                response.success = true;
                response.data = settings.agents[idx];
                break;
            }
            case 'deleteAgent': {
                const id = message.id;
                if (!id) {
                    response.error = 'Agent id required.';
                    break;
                }
                const idx = settings.agents.findIndex((a: any) => a.id === id);
                if (idx === -1) {
                    response.error = 'Agent not found.';
                    break;
                }
                settings.agents.splice(idx, 1);
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

