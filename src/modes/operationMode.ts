import * as vscode from 'vscode';
import { LLMGenerateParams } from '../llm/llmProvider';
import { Agent } from '../agents/agent';

/**
 * Context type for operation modes
 */
export enum ContextType {
    NONE = 'none',
    ENTIRE_CODEBASE = 'entire_codebase',
    SELECTED_FILES = 'selected_files',
    CURRENT_FILE = 'current_file',
    CUSTOM = 'custom'
}

/**
 * Context source for operation modes
 */
export interface ContextSource {
    type: ContextType;
    files?: string[];
    folders?: string[];
    externalResources?: string[];
    customContent?: string;
}

/**
 * Operation mode interface
 */
export interface IOperationMode {
    /**
     * Unique identifier for the mode
     */
    readonly id: string;

    /**
     * Display name for the mode
     */
    readonly displayName: string;

    /**
     * Description of the mode
     */
    readonly description: string;

    /**
     * Icon for the mode
     */
    readonly icon: string;

    /**
     * Default context type for this mode
     */
    readonly defaultContextType: ContextType;

    /**
     * Whether this mode requires human verification for actions
     */
    readonly requiresHumanVerification: boolean;

    /**
     * Whether this mode supports multiple agents
     */
    readonly supportsMultipleAgents: boolean;

    /**
     * Initialize the mode
     */
    initialize(context: vscode.ExtensionContext): Promise<void>;

    /**
     * Process a user message in this mode
     */
    processMessage(
        message: string,
        agent: Agent,
        contextSource: ContextSource,
        additionalParams?: Record<string, any>
    ): Promise<string>;

    /**
     * Get LLM parameters specific to this mode
     */
    getLLMParams(baseParams: LLMGenerateParams): LLMGenerateParams;

    /**
     * Get the system prompt for this mode
     */
    getSystemPrompt(agent: Agent, contextSource: ContextSource): Promise<string>;

    /**
     * Get UI components specific to this mode
     */
    getUIComponents(): {
        controlPanel?: string;
        contextPanel?: string;
        messageInput?: string;
    };

    /**
     * Handle mode-specific commands
     */
    handleCommand(command: string, args: any[]): Promise<void>;
}

/**
 * Base class for operation modes
 */
export abstract class BaseOperationMode implements IOperationMode {
    abstract readonly id: string;
    abstract readonly displayName: string;
    abstract readonly description: string;
    abstract readonly icon: string;
    abstract readonly defaultContextType: ContextType;
    abstract readonly requiresHumanVerification: boolean;
    abstract readonly supportsMultipleAgents: boolean;

    protected context: vscode.ExtensionContext | undefined;

    /**
     * Initialize the mode
     */
    async initialize(context: vscode.ExtensionContext): Promise<void> {
        this.context = context;
    }

    /**
     * Process a user message in this mode
     */
    abstract processMessage(
        message: string,
        agent: Agent,
        contextSource: ContextSource,
        additionalParams?: Record<string, any>
    ): Promise<string>;

    /**
     * Get LLM parameters specific to this mode
     */
    getLLMParams(baseParams: LLMGenerateParams): LLMGenerateParams {
        // By default, return the base params
        return baseParams;
    }

    /**
     * Get the system prompt for this mode
     */
    abstract getSystemPrompt(agent: Agent, contextSource: ContextSource): Promise<string>;

    /**
     * Get UI components specific to this mode
     */
    getUIComponents(): {
        controlPanel?: string;
        contextPanel?: string;
        messageInput?: string;
    } {
        // By default, return empty components
        return {};
    }

    /**
     * Handle mode-specific commands
     */
    async handleCommand(
        // @ts-ignore - Parameter required by interface but not used in this implementation
        command: string,
        // @ts-ignore - Parameter required by interface but not used in this implementation
        args: any[]
    ): Promise<void> {
        // By default, do nothing
    }
}

/**
 * Operation mode registry
 */
export class OperationModeRegistry {
    private static instance: OperationModeRegistry;
    private modes = new Map<string, IOperationMode>();
    private defaultModeId: string | undefined;

    private constructor() {}

    /**
     * Get the singleton instance
     */
    public static getInstance(): OperationModeRegistry {
        if (!OperationModeRegistry.instance) {
            OperationModeRegistry.instance = new OperationModeRegistry();
        }
        return OperationModeRegistry.instance;
    }

    /**
     * Register a mode
     */
    public registerMode(mode: IOperationMode): void {
        this.modes.set(mode.id, mode);
    }

    /**
     * Get a mode by ID
     */
    public getMode(id: string): IOperationMode | undefined {
        return this.modes.get(id);
    }

    /**
     * Get all registered modes
     */
    public getAllModes(): IOperationMode[] {
        return Array.from(this.modes.values());
    }

    /**
     * Set the default mode
     */
    public setDefaultMode(id: string): void {
        if (this.modes.has(id)) {
            this.defaultModeId = id;
        }
    }

    /**
     * Get the default mode
     */
    public getDefaultMode(): IOperationMode | undefined {
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
    public async initializeModes(context: vscode.ExtensionContext): Promise<void> {
        for (const mode of this.modes.values()) {
            await mode.initialize(context);
        }
    }
}

// Export singleton instance
export const operationModeRegistry = OperationModeRegistry.getInstance();
