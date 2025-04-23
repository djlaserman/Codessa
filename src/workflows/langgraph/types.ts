/**
 * Types for LangGraph workflows
 */

import { BaseMessage } from './corePolyfill';
import { Tool, StructuredTool } from './corePolyfill';
import { Agent } from '../../agents/agent';

/**
 * Node type for LangGraph
 */
export type NodeType = 'agent' | 'tool' | 'conditional' | 'input' | 'output';

/**
 * Edge type for LangGraph
 */
export type EdgeType = 'success' | 'error' | 'default';

/**
 * Node definition for LangGraph
 */
export interface GraphNode {
    id: string;
    type: NodeType;
    name: string;
    description?: string;
    agent?: Agent;
    tool?: Tool | StructuredTool;
    condition?: (state: GraphState) => Promise<string>;
    execute: (state: GraphState) => Promise<GraphState>;
}

/**
 * Edge definition for LangGraph
 */
export interface GraphEdge {
    source: string;
    target: string;
    type: EdgeType;
    condition?: (state: GraphState) => Promise<boolean>;
}

/**
 * Graph state for LangGraph
 */
export interface GraphState {
    messages: BaseMessage[];
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    currentNode: string;
    history: {
        nodeId: string;
        startTime: Date;
        endTime?: Date;
        result?: any;
    }[];
    [key: string]: any;
}

/**
 * Graph definition for LangGraph
 */
export interface GraphDefinition {
    id: string;
    name: string;
    description: string;
    version: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    startNodeId: string;
}

/**
 * Graph execution options
 */
export interface GraphExecutionOptions {
    maxSteps?: number;
    timeout?: number;
    onProgress?: (state: GraphState) => void;
    onNodeStart?: (nodeId: string, state: GraphState) => void;
    onNodeEnd?: (nodeId: string, state: GraphState) => void;
}

/**
 * Graph execution result
 */
export interface GraphExecutionResult {
    success: boolean;
    state: GraphState;
    error?: Error;
}
