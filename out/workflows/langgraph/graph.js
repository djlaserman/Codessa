"use strict";
/**
 * LangGraph implementation for workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangGraph = void 0;
const messages_1 = require("@langchain/core/messages");
const logger_1 = require("../../logger");
/**
 * LangGraph implementation
 */
class LangGraph {
    /**
     * Constructor
     */
    constructor(definition) {
        this.definition = definition;
        this.nodes = new Map();
        this.edges = new Map();
        this.memory = new Map();
        // Initialize nodes and edges
        this.initializeGraph();
    }
    /**
     * Initialize the graph
     */
    initializeGraph() {
        // Initialize nodes
        for (const node of this.definition.nodes) {
            this.nodes.set(node.id, node);
        }
        // Initialize edges
        for (const edge of this.definition.edges) {
            if (!this.edges.has(edge.source)) {
                this.edges.set(edge.source, []);
            }
            this.edges.get(edge.source)?.push(edge);
        }
    }
    /**
     * Execute the graph
     */
    async execute(input, options = {}) {
        const maxSteps = options.maxSteps || 100;
        const timeout = options.timeout || 60000; // 1 minute default timeout
        const startTime = Date.now();
        // Initialize state
        const state = {
            messages: input.messages || [],
            inputs: input,
            outputs: {},
            currentNode: this.definition.startNodeId,
            history: []
        };
        try {
            let steps = 0;
            let currentNodeId = this.definition.startNodeId;
            // Execute until we reach a terminal node or exceed max steps
            while (currentNodeId && steps < maxSteps) {
                // Check timeout
                if (Date.now() - startTime > timeout) {
                    throw new Error(`Execution timeout after ${timeout}ms`);
                }
                // Get current node
                const currentNode = this.nodes.get(currentNodeId);
                if (!currentNode) {
                    throw new Error(`Node with ID '${currentNodeId}' not found`);
                }
                // Update state
                state.currentNode = currentNodeId;
                // Record start time
                const nodeStartTime = new Date();
                state.history.push({
                    nodeId: currentNodeId,
                    startTime: nodeStartTime
                });
                // Notify node start
                if (options.onNodeStart) {
                    options.onNodeStart(currentNodeId, state);
                }
                // Execute node
                logger_1.logger.info(`Executing node: ${currentNode.name} (${currentNodeId})`);
                try {
                    // Execute the node
                    const newState = await currentNode.execute(state);
                    // Update state
                    Object.assign(state, newState);
                    // Record end time and result
                    const historyEntry = state.history[state.history.length - 1];
                    historyEntry.endTime = new Date();
                    historyEntry.result = state.outputs[currentNodeId];
                    // Notify node end
                    if (options.onNodeEnd) {
                        options.onNodeEnd(currentNodeId, state);
                    }
                    // Notify progress
                    if (options.onProgress) {
                        options.onProgress(state);
                    }
                    // Get next node
                    const nextNodeId = await this.getNextNode(currentNodeId, state);
                    currentNodeId = nextNodeId;
                }
                catch (error) {
                    logger_1.logger.error(`Error executing node '${currentNode.name}':`, error);
                    // Record end time and error
                    const historyEntry = state.history[state.history.length - 1];
                    historyEntry.endTime = new Date();
                    historyEntry.result = { error: error instanceof Error ? error.message : String(error) };
                    // Find error edge
                    const errorEdges = this.edges.get(currentNodeId)?.filter(e => e.type === 'error') || [];
                    if (errorEdges.length > 0) {
                        // Use the first error edge
                        currentNodeId = errorEdges[0].target;
                    }
                    else {
                        // No error edge, propagate the error
                        throw error;
                    }
                }
                steps++;
            }
            if (steps >= maxSteps) {
                logger_1.logger.warn(`Execution reached max steps (${maxSteps})`);
            }
            return {
                success: true,
                state
            };
        }
        catch (error) {
            logger_1.logger.error('Error executing graph:', error);
            return {
                success: false,
                state,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }
    /**
     * Get the next node
     */
    async getNextNode(currentNodeId, state) {
        // Get outgoing edges
        const edges = this.edges.get(currentNodeId) || [];
        // If no edges, return empty string (terminal node)
        if (edges.length === 0) {
            return '';
        }
        // If only one edge and no condition, use it
        if (edges.length === 1 && !edges[0].condition) {
            return edges[0].target;
        }
        // Check conditional edges
        for (const edge of edges) {
            // If edge has a condition, evaluate it
            if (edge.condition) {
                const result = await edge.condition(state);
                if (result) {
                    return edge.target;
                }
            }
            else if (edge.type === 'default') {
                // Use default edge if no conditional edge matches
                return edge.target;
            }
        }
        // If we get here, no edge matched
        // Use the first edge as fallback
        return edges[0].target;
    }
    /**
     * Create a node for an agent
     */
    static createAgentNode(id, name, agent) {
        return {
            id,
            type: 'agent',
            name,
            agent,
            execute: async (state) => {
                // Get the last message if available
                const lastMessage = state.messages.length > 0
                    ? state.messages[state.messages.length - 1]
                    : null;
                // Prepare input for the agent
                const input = {
                    messages: state.messages
                };
                // Execute the agent
                const messageContent = lastMessage?.content || '';
                const contentAsString = typeof messageContent === 'string'
                    ? messageContent
                    : JSON.stringify(messageContent);
                const result = await agent.generate(contentAsString);
                // Add agent response to messages
                state.messages.push(new messages_1.AIMessage(result));
                // Store result in outputs
                state.outputs[id] = result;
                return state;
            }
        };
    }
    /**
     * Create a node for a tool
     */
    static createToolNode(id, name, tool) {
        return {
            id,
            type: 'tool',
            name,
            tool,
            execute: async (state) => {
                // Get input for the tool from state
                const input = state.inputs[id] || {};
                // Execute the tool
                const result = await tool.invoke(input);
                // Store result in outputs
                state.outputs[id] = result;
                // Add tool response to messages if it's a string
                if (typeof result === 'string') {
                    state.messages.push(new messages_1.AIMessage(result));
                }
                return state;
            }
        };
    }
    /**
     * Create a conditional node
     */
    static createConditionalNode(id, name, condition) {
        return {
            id,
            type: 'conditional',
            name,
            condition,
            execute: async (state) => {
                // Execute the condition
                const result = await condition(state);
                // Store result in outputs
                state.outputs[id] = result;
                return state;
            }
        };
    }
    /**
     * Create an input node
     */
    static createInputNode(id, name) {
        return {
            id,
            type: 'input',
            name,
            execute: async (state) => {
                // Input nodes just pass through the state
                return state;
            }
        };
    }
    /**
     * Create an output node
     */
    static createOutputNode(id, name) {
        return {
            id,
            type: 'output',
            name,
            execute: async (state) => {
                // Output nodes just pass through the state
                return state;
            }
        };
    }
}
exports.LangGraph = LangGraph;
//# sourceMappingURL=graph.js.map