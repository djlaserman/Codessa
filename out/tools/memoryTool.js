"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryTool = void 0;
// Lint fix: use getMemories() for list, fix addMemory signature
// Fixes: 9beea187-abeb-4884-936d-0ed37ac5f3c2, 67fabd37-9a53-42aa-8db9-fc12a476a70f
const advancedMemoryTool_1 = require("./advancedMemoryTool");
class MemoryTool {
    constructor(memoryManager) {
        this.id = 'memory';
        this.name = 'Memory Management (Advanced)';
        this.description = 'Save, retrieve, update, delete, search, tag, and visualize extension memory.';
        this.memoryManager = memoryManager;
        this.actions = {
            'save': {
                id: 'save', name: 'Save Memory', description: 'Save a memory entry.',
                inputSchema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] },
                async execute(input) {
                    const content = input.content;
                    if (!content)
                        return { success: false, error: "'content' required for save." };
                    const entry = await memoryManager.addMemory(content);
                    return { success: true, output: entry };
                }
            },
            'get': {
                id: 'get', name: 'Get Memory', description: 'Retrieve a memory entry by ID.',
                inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
                async execute(input) {
                    const id = input.id;
                    if (!id)
                        return { success: false, error: "'id' required for get." };
                    const entry = await memoryManager.getMemory(id);
                    return { success: !!entry, output: entry || null };
                }
            },
            'delete': {
                id: 'delete', name: 'Delete Memory', description: 'Delete a memory entry by ID.',
                inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
                async execute(input) {
                    const id = input.id;
                    if (!id)
                        return { success: false, error: "'id' required for delete." };
                    const ok = await memoryManager.deleteMemory(id);
                    return { success: ok, output: ok ? 'Deleted' : 'Not found' };
                }
            },
            'list': {
                id: 'list', name: 'List Memories', description: 'List all memory entries.',
                inputSchema: { type: 'object', properties: {}, required: [] },
                async execute(_input) {
                    const entries = await memoryManager.getMemories();
                    return { success: true, output: entries };
                }
            },
            'search': new advancedMemoryTool_1.MemorySearchTool(memoryManager),
            'update': new advancedMemoryTool_1.MemoryUpdateTool(memoryManager),
            'tag': new advancedMemoryTool_1.MemoryTagTool(memoryManager),
            'visualize': new advancedMemoryTool_1.MemoryVisualizationTool(memoryManager),
        };
    }
    async execute(input, _context) {
        const action = input.action;
        try {
            if (action === 'save') {
                const content = input.content;
                if (!content)
                    return { success: false, error: "'content' required for save." };
                const entry = await this.memoryManager.addMemory(content);
                return { success: true, output: entry };
            }
            else if (action === 'get') {
                const id = input.id;
                if (!id)
                    return { success: false, error: "'id' required for get." };
                const entry = await this.memoryManager.getMemory(id);
                return { success: !!entry, output: entry || null };
            }
            else if (action === 'delete') {
                const id = input.id;
                if (!id)
                    return { success: false, error: "'id' required for delete." };
                const ok = await this.memoryManager.deleteMemory(id);
                return { success: ok, output: ok ? 'Deleted' : 'Not found' };
            }
            else if (action === 'list') {
                const entries = await this.memoryManager.getMemories();
                return { success: true, output: entries };
            }
            else {
                return { success: false, error: `Unknown action: ${action}` };
            }
        }
        catch (error) {
            return { success: false, error: `Memory tool error: ${error.message || error}` };
        }
    }
}
exports.MemoryTool = MemoryTool;
//# sourceMappingURL=memoryTool.js.map