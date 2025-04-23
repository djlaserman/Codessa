// Handler for Workflows CRUD messages and logic
export function handleWorkflowsMessage(message: any, panel: any) {
    const settings = (window as any).settings || {};
    settings.workflows = Array.isArray(settings.workflows) ? settings.workflows : [];
    let response: { type: string; success: boolean; data: any; error: string | null } = {
        type: message.type,
        success: false,
        data: null,
        error: null
    };
    try {
        switch (message.type) {
            case 'getWorkflows': {
                response.success = true;
                response.data = settings.workflows;
                break;
            }
            case 'addWorkflow': {
                const workflow = message.workflow;
                if (!workflow || !workflow.id || !workflow.name) {
                    response.error = 'Missing required workflow fields.';
                    break;
                }
                const exists = settings.workflows.find((w: any) => w.id === workflow.id);
                if (exists) {
                    response.error = 'Workflow with this id already exists.';
                    break;
                }
                settings.workflows.push(workflow);
                response.success = true;
                response.data = workflow;
                break;
            }
            case 'editWorkflow': {
                const workflow = message.workflow;
                if (!workflow || !workflow.id) {
                    response.error = 'Workflow id required.';
                    break;
                }
                const idx = settings.workflows.findIndex((w: any) => w.id === workflow.id);
                if (idx === -1) {
                    response.error = 'Workflow not found.';
                    break;
                }
                settings.workflows[idx] = { ...settings.workflows[idx], ...workflow };
                response.success = true;
                response.data = settings.workflows[idx];
                break;
            }
            case 'deleteWorkflow': {
                const id = message.id;
                if (!id) {
                    response.error = 'Workflow id required.';
                    break;
                }
                const idx = settings.workflows.findIndex((w: any) => w.id === id);
                if (idx === -1) {
                    response.error = 'Workflow not found.';
                    break;
                }
                settings.workflows.splice(idx, 1);
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
