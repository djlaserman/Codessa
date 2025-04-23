/**
 * LangGraph workflow templates
 */

import { Tool } from './corePolyfill';
// @ts-ignore
import { z } from 'zod';
import { Agent } from '../../agents/agent';
import { LangGraph } from './graph';
import { GraphDefinition, GraphNode, GraphEdge } from './types';
import { langGraphRegistry } from './registry';
import { logger } from '../../logger';
import { MemoryVectorStore } from '../../memory/codessa/vectorStores/memoryVectorStore';

// Custom tool implementations
class MemoryRetrievalTool extends Tool {
    name = 'memory-retrieval';
    description = 'Retrieves relevant memories based on the current conversation';
    schema = z.object({
        input: z.string().optional().describe('The query to search for in memories (optional string)')
    }).strip().transform((obj: { input?: string }) => obj.input ?? '');

    constructor(private vectorStore: MemoryVectorStore) {
        super('memory-retrieval', 'Retrieves relevant memories based on the current conversation');
    }

    protected async _call({ input }: { input?: string }): Promise<string> {
        const query = input || '';
        logger.info('Retrieving memories for:', query);
        const results: any[] = await this.vectorStore.similaritySearch(query, 5);
        return results.map(r => (r.content ?? r.pageContent ?? '')).join('\n\n');
    }
}

class MemorySaveTool extends Tool {
    name = 'memory-save';
    description = 'Saves important information from the conversation to memory';
    schema = z.object({
        input: z.string().optional().describe('The content to save to memory (optional string)')
    }).strip().transform((obj: { input?: string }) => obj.input ?? '');

    constructor(private vectorStore: MemoryVectorStore) {
        super('memory-save', 'Saves important information from the conversation to memory');
    }

    protected async _call({ input }: { input?: string }): Promise<string> {
        const content = input || '';
        logger.info('Saving memory:', content);
        await this.vectorStore.addDocuments([{ content, metadata: {} }]);
        return 'Memory saved successfully';
    }
}

/**
 * Create a simple chat workflow
 */
export function createChatWorkflow(
    id: string,
    name: string,
    description: string,
    agent: Agent
): GraphDefinition {
    // Create nodes
    const inputNode = LangGraph.createInputNode('input', 'Input');
    const agentNode = LangGraph.createAgentNode('agent', 'Agent', agent);
    const outputNode = LangGraph.createOutputNode('output', 'Output');

    // Create edges
    const edges: GraphEdge[] = [
        { source: 'input', target: 'agent', type: 'default' },
        { source: 'agent', target: 'output', type: 'default' }
    ];

    // Create workflow definition
    const workflow: GraphDefinition = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, agentNode, outputNode],
        edges,
        startNodeId: 'input'
    };

    // Register workflow
    langGraphRegistry.registerWorkflow(workflow);

    return workflow;
}

/**
 * Create a ReAct agent workflow with tool integration
 */
export function createReActWorkflow(
    id: string,
    name: string,
    description: string,
    agent: Agent,
    tools: Tool[]
): GraphDefinition {
    // Create nodes
    const inputNode = LangGraph.createInputNode('input', 'Input');
    const agentNode = LangGraph.createAgentNode('agent', 'Agent', agent);
    const outputNode = LangGraph.createOutputNode('output', 'Output');

    // Create tool nodes
    const toolNodes: GraphNode[] = tools.map((tool, index) => {
        return LangGraph.createToolNode(`tool-${index}`, tool.name, tool);
    });

    // Create edges
    const edges: GraphEdge[] = [
        { source: 'input', target: 'agent', type: 'default' }
    ];

    // Add edges from agent to tools and back
    toolNodes.forEach((toolNode, index) => {
        edges.push({
            source: 'agent',
            target: toolNode.id,
            type: 'default',
            condition: async (state) => {
                const lastOutput = state.outputs['agent'];
                return lastOutput && lastOutput.includes(`Using tool: ${tools[index].name}`);
            }
        });

        edges.push({
            source: toolNode.id,
            target: 'agent',
            type: 'default'
        });
    });

    // Add edge from agent to output
    edges.push({
        source: 'agent',
        target: 'output',
        type: 'default',
        condition: async (state) => {
            const lastOutput = state.outputs['agent'];
            return lastOutput && lastOutput.includes('Final Answer:');
        }
    });

    // Create workflow definition
    const workflow: GraphDefinition = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, agentNode, ...toolNodes, outputNode],
        edges,
        startNodeId: 'input'
    };

    // Register workflow
    langGraphRegistry.registerWorkflow(workflow);

    return workflow;
}

/**
 * Create a multi-agent workflow for collaborative problem solving
 */
export function createMultiAgentWorkflow(
    id: string,
    name: string,
    description: string,
    agents: Agent[],
    supervisorAgent: Agent
): GraphDefinition {
    if (agents.length === 0) {
        throw new Error('At least one agent is required');
    }

    // Create nodes
    const inputNode = LangGraph.createInputNode('input', 'Input');
    const supervisorNode = LangGraph.createAgentNode('supervisor', 'Supervisor', supervisorAgent);
    const outputNode = LangGraph.createOutputNode('output', 'Output');

    // Create agent nodes
    const agentNodes: GraphNode[] = agents.map((agent, index) => {
        return LangGraph.createAgentNode(`agent-${index}`, agent.name, agent);
    });

    // Create edges
    const edges: GraphEdge[] = [
        { source: 'input', target: 'supervisor', type: 'default' }
    ];

    // Add edges from supervisor to agents
    agentNodes.forEach((agentNode, index) => {
        edges.push({
            source: 'supervisor',
            target: agentNode.id,
            type: 'default',
            condition: async (state) => {
                const lastOutput = state.outputs['supervisor'];
                return lastOutput && lastOutput.includes(`Delegating to: ${agents[index].name}`);
            }
        });

        edges.push({
            source: agentNode.id,
            target: 'supervisor',
            type: 'default'
        });
    });

    // Add edge from supervisor to output
    edges.push({
        source: 'supervisor',
        target: 'output',
        type: 'default',
        condition: async (state) => {
            const lastOutput = state.outputs['supervisor'];
            return lastOutput && lastOutput.includes('Final Consensus:');
        }
    });

    // Create workflow definition
    const workflow: GraphDefinition = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, supervisorNode, ...agentNodes, outputNode],
        edges,
        startNodeId: 'input'
    };

    // Register workflow
    langGraphRegistry.registerWorkflow(workflow);

    return workflow;
}

/**
 * Create a memory-enhanced workflow with vector store integration
 */
export function createMemoryEnhancedWorkflow(
    id: string,
    name: string,
    description: string,
    agent: Agent,
    vectorStore: MemoryVectorStore
): GraphDefinition {
    // Create nodes
    const inputNode = LangGraph.createInputNode('input', 'Input');
    const memoryRetrievalTool = new MemoryRetrievalTool(vectorStore);
    const memoryRetrievalNode = LangGraph.createToolNode(
        'memory-retrieval',
        'Memory Retrieval',
        memoryRetrievalTool
    );
    const agentNode = LangGraph.createAgentNode('agent', 'Agent', agent);
    const memorySaveTool = new MemorySaveTool(vectorStore);
    const memorySaveNode = LangGraph.createToolNode(
        'memory-save',
        'Memory Save',
        memorySaveTool
    );
    const outputNode = LangGraph.createOutputNode('output', 'Output');

    // Create edges
    const edges: GraphEdge[] = [
        { source: 'input', target: 'memory-retrieval', type: 'default' },
        { source: 'memory-retrieval', target: 'agent', type: 'default' },
        { source: 'agent', target: 'memory-save', type: 'default' },
        { source: 'memory-save', target: 'output', type: 'default' }
    ];

    // Create workflow definition
    const workflow: GraphDefinition = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, memoryRetrievalNode, agentNode, memorySaveNode, outputNode],
        edges,
        startNodeId: 'input'
    };

    // Register workflow
    langGraphRegistry.registerWorkflow(workflow);

    return workflow;
}

/**
 * Create a workflow for Test-Driven Development (TDD)
 */
export function createTDDWorkflow(
    id: string,
    name: string,
    description: string,
    implementationAgent: Agent,
    testingAgent: Agent,
    refactoringAgent: Agent
): GraphDefinition {
    // Create nodes
    const inputNode = LangGraph.createInputNode('input', 'Input');
    const testWriterNode = LangGraph.createAgentNode('test-writer', 'Test Writer', testingAgent);
    const implementerNode = LangGraph.createAgentNode('implementer', 'Implementation', implementationAgent);
    const testerNode = LangGraph.createAgentNode('tester', 'Test Runner', testingAgent);
    const refactorNode = LangGraph.createAgentNode('refactor', 'Refactoring', refactoringAgent);
    const outputNode = LangGraph.createOutputNode('output', 'Output');

    // Create edges for TDD cycle
    const edges: GraphEdge[] = [
        { source: 'input', target: 'test-writer', type: 'default' },
        { source: 'test-writer', target: 'implementer', type: 'default' },
        { source: 'implementer', target: 'tester', type: 'default' },
        { 
            source: 'tester', 
            target: 'refactor',
            type: 'default',
            condition: async (state) => {
                const testOutput = state.outputs['tester'];
                return testOutput && testOutput.includes('Tests passed');
            }
        },
        { 
            source: 'tester', 
            target: 'implementer',
            type: 'default',
            condition: async (state) => {
                const testOutput = state.outputs['tester'];
                return testOutput && testOutput.includes('Tests failed');
            }
        },
        { source: 'refactor', target: 'tester', type: 'default' },
        {
            source: 'tester',
            target: 'output',
            type: 'default',
            condition: async (state) => {
                const testOutput = state.outputs['tester'];
                return testOutput && 
                       testOutput.includes('Tests passed') && 
                       testOutput.includes('Code quality metrics satisfied');
            }
        }
    ];

    // Create workflow definition
    const workflow: GraphDefinition = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, testWriterNode, implementerNode, testerNode, refactorNode, outputNode],
        edges,
        startNodeId: 'input'
    };

    // Register workflow
    langGraphRegistry.registerWorkflow(workflow);

    return workflow;
}

/**
 * Create a workflow for Agile Sprint Planning
 */
export function createSprintPlanningWorkflow(
    id: string,
    name: string,
    description: string,
    productOwnerAgent: Agent,
    techLeadAgent: Agent,
    estimatorAgent: Agent
): GraphDefinition {
    // Create nodes
    const inputNode = LangGraph.createInputNode('input', 'Input');
    const backlogGroomingNode = LangGraph.createAgentNode('backlog-grooming', 'Backlog Grooming', productOwnerAgent);
    const technicalAnalysisNode = LangGraph.createAgentNode('tech-analysis', 'Technical Analysis', techLeadAgent);
    const estimationNode = LangGraph.createAgentNode('estimation', 'Story Estimation', estimatorAgent);
    const prioritizationNode = LangGraph.createAgentNode('prioritization', 'Sprint Prioritization', productOwnerAgent);
    const capacityPlanningNode = LangGraph.createAgentNode('capacity-planning', 'Capacity Planning', techLeadAgent);
    const outputNode = LangGraph.createOutputNode('output', 'Output');

    // Create edges for sprint planning flow
    const edges: GraphEdge[] = [
        { source: 'input', target: 'backlog-grooming', type: 'default' },
        { source: 'backlog-grooming', target: 'tech-analysis', type: 'default' },
        { source: 'tech-analysis', target: 'estimation', type: 'default' },
        { source: 'estimation', target: 'prioritization', type: 'default' },
        { source: 'prioritization', target: 'capacity-planning', type: 'default' },
        { source: 'capacity-planning', target: 'output', type: 'default' }
    ];

    // Create workflow definition
    const workflow: GraphDefinition = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [
            inputNode,
            backlogGroomingNode,
            technicalAnalysisNode,
            estimationNode,
            prioritizationNode,
            capacityPlanningNode,
            outputNode
        ],
        edges,
        startNodeId: 'input'
    };

    // Register workflow
    langGraphRegistry.registerWorkflow(workflow);

    return workflow;
}
