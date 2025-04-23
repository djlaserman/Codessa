"use strict";
/**
 * LangGraph workflow templates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChatWorkflow = createChatWorkflow;
exports.createReActWorkflow = createReActWorkflow;
exports.createMultiAgentWorkflow = createMultiAgentWorkflow;
exports.createMemoryEnhancedWorkflow = createMemoryEnhancedWorkflow;
exports.createTDDWorkflow = createTDDWorkflow;
exports.createSprintPlanningWorkflow = createSprintPlanningWorkflow;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const graph_1 = require("./graph");
const registry_1 = require("./registry");
const logger_1 = require("../../logger");
// Custom tool implementations
class MemoryRetrievalTool extends tools_1.Tool {
    constructor(vectorStore) {
        super();
        this.vectorStore = vectorStore;
        this.name = 'memory-retrieval';
        this.description = 'Retrieves relevant memories based on the current conversation';
        this.schema = zod_1.z.object({
            input: zod_1.z.string().optional().describe('The query to search for in memories')
        }).strip().transform(obj => obj.input ?? '');
    }
    async _call({ input }) {
        const query = input || '';
        logger_1.logger.info('Retrieving memories for:', query);
        const results = await this.vectorStore.similaritySearch(query, 5);
        return results.map(r => r.pageContent).join('\n\n');
    }
}
class MemorySaveTool extends tools_1.Tool {
    constructor(vectorStore) {
        super();
        this.vectorStore = vectorStore;
        this.name = 'memory-save';
        this.description = 'Saves important information from the conversation to memory';
        this.schema = zod_1.z.object({
            input: zod_1.z.string().optional().describe('The content to save to memory')
        }).strip().transform(obj => obj.input ?? '');
    }
    async _call({ input }) {
        const content = input || '';
        logger_1.logger.info('Saving memory:', content);
        await this.vectorStore.addDocuments([{ pageContent: content, metadata: {} }]);
        return 'Memory saved successfully';
    }
}
/**
 * Create a simple chat workflow
 */
function createChatWorkflow(id, name, description, agent) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const agentNode = graph_1.LangGraph.createAgentNode('agent', 'Agent', agent);
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'agent', type: 'default' },
        { source: 'agent', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, agentNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a ReAct agent workflow with tool integration
 */
function createReActWorkflow(id, name, description, agent, tools) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const agentNode = graph_1.LangGraph.createAgentNode('agent', 'Agent', agent);
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create tool nodes
    const toolNodes = tools.map((tool, index) => {
        return graph_1.LangGraph.createToolNode(`tool-${index}`, tool.name, tool);
    });
    // Create edges
    const edges = [
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
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, agentNode, ...toolNodes, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a multi-agent workflow for collaborative problem solving
 */
function createMultiAgentWorkflow(id, name, description, agents, supervisorAgent) {
    if (agents.length === 0) {
        throw new Error('At least one agent is required');
    }
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const supervisorNode = graph_1.LangGraph.createAgentNode('supervisor', 'Supervisor', supervisorAgent);
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create agent nodes
    const agentNodes = agents.map((agent, index) => {
        return graph_1.LangGraph.createAgentNode(`agent-${index}`, agent.name, agent);
    });
    // Create edges
    const edges = [
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
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, supervisorNode, ...agentNodes, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a memory-enhanced workflow with vector store integration
 */
function createMemoryEnhancedWorkflow(id, name, description, agent, vectorStore) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const memoryRetrievalTool = new MemoryRetrievalTool(vectorStore);
    const memoryRetrievalNode = graph_1.LangGraph.createToolNode('memory-retrieval', 'Memory Retrieval', memoryRetrievalTool);
    const agentNode = graph_1.LangGraph.createAgentNode('agent', 'Agent', agent);
    const memorySaveTool = new MemorySaveTool(vectorStore);
    const memorySaveNode = graph_1.LangGraph.createToolNode('memory-save', 'Memory Save', memorySaveTool);
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'memory-retrieval', type: 'default' },
        { source: 'memory-retrieval', target: 'agent', type: 'default' },
        { source: 'agent', target: 'memory-save', type: 'default' },
        { source: 'memory-save', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, memoryRetrievalNode, agentNode, memorySaveNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a workflow for Test-Driven Development (TDD)
 */
function createTDDWorkflow(id, name, description, implementationAgent, testingAgent, refactoringAgent) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const testWriterNode = graph_1.LangGraph.createAgentNode('test-writer', 'Test Writer', testingAgent);
    const implementerNode = graph_1.LangGraph.createAgentNode('implementer', 'Implementation', implementationAgent);
    const testerNode = graph_1.LangGraph.createAgentNode('tester', 'Test Runner', testingAgent);
    const refactorNode = graph_1.LangGraph.createAgentNode('refactor', 'Refactoring', refactoringAgent);
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges for TDD cycle
    const edges = [
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
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, testWriterNode, implementerNode, testerNode, refactorNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a workflow for Agile Sprint Planning
 */
function createSprintPlanningWorkflow(id, name, description, productOwnerAgent, techLeadAgent, estimatorAgent) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const backlogGroomingNode = graph_1.LangGraph.createAgentNode('backlog-grooming', 'Backlog Grooming', productOwnerAgent);
    const technicalAnalysisNode = graph_1.LangGraph.createAgentNode('tech-analysis', 'Technical Analysis', techLeadAgent);
    const estimationNode = graph_1.LangGraph.createAgentNode('estimation', 'Story Estimation', estimatorAgent);
    const prioritizationNode = graph_1.LangGraph.createAgentNode('prioritization', 'Sprint Prioritization', productOwnerAgent);
    const capacityPlanningNode = graph_1.LangGraph.createAgentNode('capacity-planning', 'Capacity Planning', techLeadAgent);
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges for sprint planning flow
    const edges = [
        { source: 'input', target: 'backlog-grooming', type: 'default' },
        { source: 'backlog-grooming', target: 'tech-analysis', type: 'default' },
        { source: 'tech-analysis', target: 'estimation', type: 'default' },
        { source: 'estimation', target: 'prioritization', type: 'default' },
        { source: 'prioritization', target: 'capacity-planning', type: 'default' },
        { source: 'capacity-planning', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
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
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
//# sourceMappingURL=templates.js.map