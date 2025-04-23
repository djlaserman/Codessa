"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryVisualizationTool = exports.MemoryTagTool = exports.MemoryUpdateTool = exports.MemorySearchTool = void 0;
class MemorySearchTool {
    constructor(memoryManager) {
        this.id = 'memorySearch';
        this.name = 'Memory Search';
        this.description = 'Search memories by keyword or tag.';
        this.inputSchema = {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Keyword or tag to search.' }
            },
            required: ['query']
        };
        this.memoryManager = memoryManager;
    }
    async execute(input, _context) {
        const query = input.query;
        const entries = await this.memoryManager.getMemories();
        const results = entries.filter(e => (e.content && e.content.includes(query)) || (e.metadata?.tags && e.metadata?.tags.includes(query)));
        return { success: true, output: results };
    }
}
exports.MemorySearchTool = MemorySearchTool;
class MemoryUpdateTool {
    constructor(memoryManager) {
        this.id = 'memoryUpdate';
        this.name = 'Memory Update';
        this.description = 'Update a memory entry by ID.';
        this.inputSchema = {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Memory ID to update.' },
                content: { type: 'string', description: 'New content.' }
            },
            required: ['id', 'content']
        };
        this.memoryManager = memoryManager;
    }
    async execute(input, _context) {
        const id = input.id;
        const content = input.content;
        const entries = await this.memoryManager.getMemories();
        const entry = entries.find(e => e.id === id);
        if (!entry)
            return { success: false, output: 'Not found' };
        entry.content = content;
        if (this.memoryManager.memoryProvider && this.memoryManager.memoryProvider.updateMemory) {
            const ok = await this.memoryManager.memoryProvider.updateMemory(id, entry);
            return { success: ok, output: ok ? 'Updated' : 'Not found' };
        }
        return { success: true, output: 'Updated (in-memory only)' };
    }
}
exports.MemoryUpdateTool = MemoryUpdateTool;
class MemoryTagTool {
    constructor(memoryManager) {
        this.id = 'memoryTag';
        this.name = 'Memory Tag';
        this.description = 'Add or remove tags from a memory entry.';
        this.inputSchema = {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Memory ID.' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add/remove.' },
                mode: { type: 'string', enum: ['add', 'remove'], description: 'Add or remove tags.' }
            },
            required: ['id', 'tags', 'mode']
        };
        this.memoryManager = memoryManager;
    }
    async execute(input, _context) {
        const id = input.id;
        const tags = input.tags;
        const mode = input.mode;
        const entries = await this.memoryManager.getMemories();
        const entry = entries.find(e => e.id === id);
        if (!entry)
            return { success: false, output: 'Not found' };
        if (!entry.metadata.tags)
            entry.metadata.tags = [];
        if (mode === 'add') {
            for (const tag of tags) {
                if (!entry.metadata.tags.includes(tag))
                    entry.metadata.tags.push(tag);
            }
        }
        else if (mode === 'remove') {
            entry.metadata.tags = entry.metadata.tags.filter((t) => !tags.includes(t));
        }
        else {
            return { success: false, error: 'Invalid mode' };
        }
        if (this.memoryManager.memoryProvider && this.memoryManager.memoryProvider.updateMemory) {
            const ok = await this.memoryManager.memoryProvider.updateMemory(id, entry);
            return { success: ok, output: ok ? `Tags ${mode}ed` : 'Not found' };
        }
        return { success: true, output: `Tags ${mode}ed (in-memory only)` };
    }
}
exports.MemoryTagTool = MemoryTagTool;
class MemoryVisualizationTool {
    constructor(memoryManager) {
        this.id = 'memoryViz';
        this.name = 'Memory Visualization';
        this.description = 'Visualize memory graph or clusters.';
        this.inputSchema = {
            type: 'object',
            properties: {},
            required: []
        };
        this.memoryManager = memoryManager;
    }
    async execute(_input, _context) {
        // Placeholder: actual visualization would require UI integration
        const entries = await this.memoryManager.getMemories();
        // Example: cluster by tag
        const clusters = {};
        for (const entry of entries) {
            if (entry.metadata?.tags) {
                for (const tag of entry.metadata?.tags) {
                    if (!clusters[tag])
                        clusters[tag] = [];
                    clusters[tag].push(entry);
                }
            }
        }
        return { success: true, output: clusters };
    }
}
exports.MemoryVisualizationTool = MemoryVisualizationTool;
//# sourceMappingURL=advancedMemoryTool.js.map