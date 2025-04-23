import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agents/agent';
import { MemoryManager } from '../memory/memoryManager';

export class MemorySearchTool implements ITool {
    readonly id = 'memorySearch';
    readonly name = 'Memory Search';
    readonly description = 'Search memories by keyword or tag.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Keyword or tag to search.' }
        },
        required: ['query']
    };
    private memoryManager: MemoryManager;
    constructor(memoryManager: MemoryManager) { this.memoryManager = memoryManager; }
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const query = input.query as string;
        const entries = await this.memoryManager.getMemories();
        const results = entries.filter(e => (e.content && e.content.includes(query)) || (e.metadata?.tags && e.metadata?.tags.includes(query)));
        return { success: true, output: results };
    }
}

export class MemoryUpdateTool implements ITool {
    readonly id = 'memoryUpdate';
    readonly name = 'Memory Update';
    readonly description = 'Update a memory entry by ID.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Memory ID to update.' },
            content: { type: 'string', description: 'New content.' }
        },
        required: ['id', 'content']
    };
    private memoryManager: MemoryManager;
    constructor(memoryManager: MemoryManager) { this.memoryManager = memoryManager; }
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const id = input.id as string;
        const content = input.content as string;
        const entries = await this.memoryManager.getMemories();
        const entry = entries.find(e => e.id === id);
        if (!entry) return { success: false, output: 'Not found' };
        entry.content = content;
        if ((this.memoryManager as any).memoryProvider && (this.memoryManager as any).memoryProvider.updateMemory) {
            const ok = await (this.memoryManager as any).memoryProvider.updateMemory(id, entry);
            return { success: ok, output: ok ? 'Updated' : 'Not found' };
        }
        return { success: true, output: 'Updated (in-memory only)' };
    }
}

export class MemoryTagTool implements ITool {
    readonly id = 'memoryTag';
    readonly name = 'Memory Tag';
    readonly description = 'Add or remove tags from a memory entry.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Memory ID.' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add/remove.' },
            mode: { type: 'string', enum: ['add', 'remove'], description: 'Add or remove tags.' }
        },
        required: ['id', 'tags', 'mode']
    };
    private memoryManager: MemoryManager;
    constructor(memoryManager: MemoryManager) { this.memoryManager = memoryManager; }
    async execute(input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        const id = input.id as string;
        const tags = input.tags as string[];
        const mode = input.mode as string;
        const entries = await this.memoryManager.getMemories();
        const entry = entries.find(e => e.id === id);
        if (!entry) return { success: false, output: 'Not found' };
        if (!entry.metadata.tags) entry.metadata.tags = [];
        if (mode === 'add') {
            for (const tag of tags) {
                if (!entry.metadata.tags.includes(tag)) entry.metadata.tags.push(tag);
            }
        } else if (mode === 'remove') {
            entry.metadata.tags = entry.metadata.tags.filter((t: string) => !tags.includes(t));
        } else {
            return { success: false, error: 'Invalid mode' };
        }
        if ((this.memoryManager as any).memoryProvider && (this.memoryManager as any).memoryProvider.updateMemory) {
            const ok = await (this.memoryManager as any).memoryProvider.updateMemory(id, entry);
            return { success: ok, output: ok ? `Tags ${mode}ed` : 'Not found' };
        }
        return { success: true, output: `Tags ${mode}ed (in-memory only)` };
    }
}

export class MemoryVisualizationTool implements ITool {
    readonly id = 'memoryViz';
    readonly name = 'Memory Visualization';
    readonly description = 'Visualize memory graph or clusters.';
    readonly inputSchema = {
        type: 'object',
        properties: {},
        required: []
    };
    private memoryManager: MemoryManager;
    constructor(memoryManager: MemoryManager) { this.memoryManager = memoryManager; }
    async execute(_input: ToolInput, _context?: AgentContext): Promise<ToolResult> {
        // Placeholder: actual visualization would require UI integration
        const entries = await this.memoryManager.getMemories();
        // Example: cluster by tag
        const clusters: Record<string, any[]> = {};
        for (const entry of entries) {
            if (entry.metadata?.tags) {
                for (const tag of entry.metadata?.tags) {
                    if (!clusters[tag]) clusters[tag] = [];
                    clusters[tag].push(entry);
                }
            }
        }
        return { success: true, output: clusters };
    }
}
