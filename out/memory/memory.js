"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryManager = exports.MemoryManager = void 0;
const vscode = __importStar(require("vscode"));
const logger_1 = require("../logger");
const config_1 = require("../config");
/**
 * Memory manager class
 */
class MemoryManager {
    constructor() {
        this.memories = [];
        this._onMemoriesChanged = new vscode.EventEmitter();
        this.onMemoriesChanged = this._onMemoriesChanged.event;
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!MemoryManager.instance) {
            MemoryManager.instance = new MemoryManager();
        }
        return MemoryManager.instance;
    }
    /**
     * Initialize the memory manager
     */
    initialize(context) {
        this.context = context;
        this.loadMemories();
    }
    /**
     * Load memories from storage
     */
    loadMemories() {
        if (!this.context) {
            logger_1.logger.error('Memory manager not initialized with context');
            return;
        }
        try {
            const savedMemories = this.context.globalState.get('memories', []);
            this.memories = savedMemories;
            logger_1.logger.info(`Loaded ${this.memories.length} memories from storage`);
        }
        catch (error) {
            logger_1.logger.error('Failed to load memories:', error);
            this.memories = [];
        }
    }
    /**
     * Save memories to storage
     */
    async saveMemories() {
        if (!this.context) {
            logger_1.logger.error('Memory manager not initialized with context');
            return;
        }
        try {
            await this.context.globalState.update('memories', this.memories);
            logger_1.logger.debug(`Saved ${this.memories.length} memories to storage`);
        }
        catch (error) {
            logger_1.logger.error('Failed to save memories:', error);
        }
    }
    /**
     * Add a memory
     */
    async addMemory(memory) {
        const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const timestamp = Date.now();
        const newMemory = {
            id,
            content: memory.content,
            timestamp,
            metadata: memory.metadata
        };
        this.memories.push(newMemory);
        await this.saveMemories();
        this._onMemoriesChanged.fire();
        return newMemory;
    }
    /**
     * Get all memories
     */
    getMemories() {
        return [...this.memories];
    }
    /**
     * Get a memory by ID
     */
    getMemory(id) {
        return this.memories.find(memory => memory.id === id);
    }
    /**
     * Delete a memory by ID
     */
    async deleteMemory(id) {
        const initialLength = this.memories.length;
        this.memories = this.memories.filter(memory => memory.id !== id);
        if (this.memories.length < initialLength) {
            await this.saveMemories();
            this._onMemoriesChanged.fire();
            return true;
        }
        return false;
    }
    /**
     * Clear all memories
     */
    async clearMemories() {
        this.memories = [];
        await this.saveMemories();
        this._onMemoriesChanged.fire();
    }
    /**
     * Search memories
     * This is a simple implementation that will be enhanced with vector search
     */
    searchMemories(options) {
        const { query, limit = 10, filter } = options;
        // Filter memories based on metadata
        let filteredMemories = this.memories;
        if (filter) {
            if (filter.source) {
                filteredMemories = filteredMemories.filter(memory => memory.metadata.source === filter.source);
            }
            if (filter.type) {
                filteredMemories = filteredMemories.filter(memory => memory.metadata.type === filter.type);
            }
            if (filter.tags && filter.tags.length > 0) {
                filteredMemories = filteredMemories.filter(memory => filter.tags.every(tag => memory.metadata.tags?.includes(tag)));
            }
            if (filter.fromTimestamp) {
                filteredMemories = filteredMemories.filter(memory => memory.timestamp >= filter.fromTimestamp);
            }
            if (filter.toTimestamp) {
                filteredMemories = filteredMemories.filter(memory => memory.timestamp <= filter.toTimestamp);
            }
        }
        // Search by content (simple text search for now)
        if (query) {
            const lowerQuery = query.toLowerCase();
            filteredMemories = filteredMemories.filter(memory => memory.content.toLowerCase().includes(lowerQuery));
        }
        // Sort by relevance (for now, just by timestamp)
        filteredMemories.sort((a, b) => b.timestamp - a.timestamp);
        // Limit results
        return filteredMemories.slice(0, limit);
    }
    /**
     * Get memory settings
     */
    getMemorySettings() {
        return {
            enabled: (0, config_1.getConfig)('memory.enabled', true),
            maxMemories: (0, config_1.getConfig)('memory.maxMemories', 1000),
            relevanceThreshold: (0, config_1.getConfig)('memory.relevanceThreshold', 0.7),
            contextWindowSize: (0, config_1.getConfig)('memory.contextWindowSize', 5)
        };
    }
    /**
     * Update memory settings
     */
    async updateMemorySettings(settings) {
        if (settings.enabled !== undefined) {
            await (0, config_1.setConfig)('memory.enabled', settings.enabled);
        }
        if (settings.maxMemories !== undefined) {
            await (0, config_1.setConfig)('memory.maxMemories', settings.maxMemories);
        }
        if (settings.relevanceThreshold !== undefined) {
            await (0, config_1.setConfig)('memory.relevanceThreshold', settings.relevanceThreshold);
        }
        if (settings.contextWindowSize !== undefined) {
            await (0, config_1.setConfig)('memory.contextWindowSize', settings.contextWindowSize);
        }
    }
}
exports.MemoryManager = MemoryManager;
// Export singleton instance
exports.memoryManager = MemoryManager.getInstance();
//# sourceMappingURL=memory.js.map