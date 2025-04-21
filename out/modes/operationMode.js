"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.operationModeRegistry = exports.OperationModeRegistry = exports.BaseOperationMode = exports.ContextType = void 0;
/**
 * Context type for operation modes
 */
var ContextType;
(function (ContextType) {
    ContextType["NONE"] = "none";
    ContextType["ENTIRE_CODEBASE"] = "entire_codebase";
    ContextType["SELECTED_FILES"] = "selected_files";
    ContextType["CURRENT_FILE"] = "current_file";
    ContextType["CUSTOM"] = "custom";
})(ContextType || (exports.ContextType = ContextType = {}));
/**
 * Base class for operation modes
 */
class BaseOperationMode {
    /**
     * Initialize the mode
     */
    async initialize(context) {
        this.context = context;
    }
    /**
     * Get LLM parameters specific to this mode
     */
    getLLMParams(baseParams) {
        // By default, return the base params
        return baseParams;
    }
    /**
     * Get UI components specific to this mode
     */
    getUIComponents() {
        // By default, return empty components
        return {};
    }
    /**
     * Handle mode-specific commands
     */
    async handleCommand(
    // @ts-ignore - Parameter required by interface but not used in this implementation
    command, 
    // @ts-ignore - Parameter required by interface but not used in this implementation
    args) {
        // By default, do nothing
    }
}
exports.BaseOperationMode = BaseOperationMode;
/**
 * Operation mode registry
 */
class OperationModeRegistry {
    constructor() {
        this.modes = new Map();
    }
    /**
     * Get the singleton instance
     */
    static getInstance() {
        if (!OperationModeRegistry.instance) {
            OperationModeRegistry.instance = new OperationModeRegistry();
        }
        return OperationModeRegistry.instance;
    }
    /**
     * Register a mode
     */
    registerMode(mode) {
        this.modes.set(mode.id, mode);
    }
    /**
     * Get a mode by ID
     */
    getMode(id) {
        return this.modes.get(id);
    }
    /**
     * Get all registered modes
     */
    getAllModes() {
        return Array.from(this.modes.values());
    }
    /**
     * Set the default mode
     */
    setDefaultMode(id) {
        if (this.modes.has(id)) {
            this.defaultModeId = id;
        }
    }
    /**
     * Get the default mode
     */
    getDefaultMode() {
        if (this.defaultModeId && this.modes.has(this.defaultModeId)) {
            return this.modes.get(this.defaultModeId);
        }
        // If no default mode is set, return the first mode
        if (this.modes.size > 0) {
            return this.modes.values().next().value;
        }
        return undefined;
    }
    /**
     * Initialize all modes
     */
    async initializeModes(context) {
        for (const mode of this.modes.values()) {
            await mode.initialize(context);
        }
    }
}
exports.OperationModeRegistry = OperationModeRegistry;
// Export singleton instance
exports.operationModeRegistry = OperationModeRegistry.getInstance();
//# sourceMappingURL=operationMode.js.map