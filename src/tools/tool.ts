import { AgentContext } from '../agents/agent';

export interface ToolInput {
    [key: string]: any;
}

export interface ToolResult {
    success: boolean;
    output?: any;
    error?: string;
    usage?: { [key: string]: number };
}

export interface ITool {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly inputSchema?: object;

    /**
     * Executes the tool's action.
     * @param input - The parameters for the tool, validated against inputSchema if provided.
     * @param context - The current agent execution context (optional, provides access to workspace, etc.).
     * @returns A promise resolving to the tool's result.
     */
    execute(input: ToolInput, context?: AgentContext): Promise<ToolResult>;
}

// Keep backward compatibility with existing code
export type Tool = ITool;
export type ToolRunParams = ToolInput;
export type ToolRunResult = ToolResult;
