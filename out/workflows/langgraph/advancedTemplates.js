"use strict";
/**
 * Advanced LangGraph workflow templates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRAGWorkflow = createRAGWorkflow;
exports.createCollaborativeWorkflow = createCollaborativeWorkflow;
exports.createMemoryEnhancedAgentWorkflow = createMemoryEnhancedAgentWorkflow;
exports.createCodeGenerationWorkflow = createCodeGenerationWorkflow;
exports.createResearchWorkflow = createResearchWorkflow;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const graph_1 = require("./graph");
const registry_1 = require("./registry");
const logger_1 = require("../../logger");
const vectorStores_1 = require("./vectorStores");
// Custom tool implementations
class DocumentRetrievalStructuredTool extends tools_1.StructuredTool {
    constructor(retrievalTool) {
        super();
        this.schema = zod_1.z.object({
            input: zod_1.z.string().optional().describe('The query to search for')
        }).transform((obj) => obj.input || '');
        this.retrievalTool = retrievalTool;
        this.name = typeof retrievalTool === 'object' && 'name' in retrievalTool ? retrievalTool.name : 'retrieval';
        this.description = typeof retrievalTool === 'object' && 'description' in retrievalTool ? retrievalTool.description : 'Retrieves documents';
    }
    async _call(input) {
        try {
            // Handle both ITool and Tool interfaces
            if ('invoke' in this.retrievalTool) {
                return await this.retrievalTool.invoke(input);
            }
            else if ('call' in this.retrievalTool && typeof this.retrievalTool.call === 'function') {
                return await this.retrievalTool.call(input);
            }
            else if ('execute' in this.retrievalTool && typeof this.retrievalTool.execute === 'function') {
                return await this.retrievalTool.execute(input);
            }
            else {
                throw new Error('Retrieval tool does not have a valid invoke, call, or execute method');
            }
        }
        catch (error) {
            logger_1.logger.error('Error invoking retrieval tool:', error);
            return `Error retrieving documents: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
class SearchStructuredTool extends tools_1.StructuredTool {
    constructor(searchTool) {
        super();
        this.schema = zod_1.z.object({
            input: zod_1.z.string().optional().describe('The query to search for')
        }).transform((obj) => obj.input || '');
        this.searchTool = searchTool;
        this.name = typeof searchTool === 'object' && 'name' in searchTool ? searchTool.name : 'search';
        this.description = typeof searchTool === 'object' && 'description' in searchTool ? searchTool.description : 'Searches for information';
    }
    async _call(input) {
        try {
            // Handle both ITool and Tool interfaces
            if ('invoke' in this.searchTool) {
                return await this.searchTool.invoke(input);
            }
            else if ('call' in this.searchTool && typeof this.searchTool.call === 'function') {
                return await this.searchTool.call(input);
            }
            else if ('execute' in this.searchTool && typeof this.searchTool.execute === 'function') {
                return await this.searchTool.execute(input);
            }
            else {
                throw new Error('Search tool does not have a valid invoke, call, or execute method');
            }
        }
        catch (error) {
            logger_1.logger.error('Error invoking search tool:', error);
            return `Error searching: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
/**
 * Create a RAG (Retrieval Augmented Generation) workflow
 *
 * This workflow enhances the agent with document retrieval capabilities.
 * It retrieves relevant documents based on the user query, then provides
 * those documents as context to the agent for generating a response.
 */
function createRAGWorkflow(id, name, description, agent, retrievalTool) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    // Use the provided retrieval tool or create a document retrieval tool
    let documentRetrievalTool;
    if (retrievalTool) {
        documentRetrievalTool = new DocumentRetrievalStructuredTool(retrievalTool);
    }
    else {
        documentRetrievalTool = (0, vectorStores_1.createDocumentRetrievalTool)();
    }
    const retrievalNode = graph_1.LangGraph.createToolNode('retrieval', 'Document Retrieval', documentRetrievalTool);
    const contextFormattingNode = {
        id: 'context-formatting',
        type: 'tool',
        name: 'Context Formatting',
        execute: async (state) => {
            // Get retrieval results
            const retrievalResults = state.outputs['retrieval'];
            // Format context for the agent
            let formattedContext = '';
            if (Array.isArray(retrievalResults)) {
                formattedContext = retrievalResults.map((doc, index) => `Document ${index + 1}:\n${typeof doc === 'string' ? doc : JSON.stringify(doc)}`).join('\n\n');
            }
            else if (typeof retrievalResults === 'string') {
                formattedContext = retrievalResults;
            }
            else {
                formattedContext = JSON.stringify(retrievalResults);
            }
            // Store formatted context
            state.outputs['context-formatting'] = formattedContext;
            state.context = formattedContext;
            return state;
        }
    };
    const agentNode = graph_1.LangGraph.createAgentNode('agent', 'Agent', agent);
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'retrieval', type: 'default' },
        { source: 'retrieval', target: 'context-formatting', type: 'default' },
        { source: 'context-formatting', target: 'agent', type: 'default' },
        { source: 'agent', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, retrievalNode, contextFormattingNode, agentNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a multi-agent collaborative workflow
 *
 * This workflow coordinates multiple specialized agents to solve complex tasks.
 * Each agent has a specific role and expertise, and they work together under
 * the coordination of a supervisor agent.
 */
function createCollaborativeWorkflow(id, name, description, specialistAgents, supervisorAgent) {
    if (specialistAgents.length === 0) {
        throw new Error('At least one specialist agent is required');
    }
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const taskAnalysisNode = {
        id: 'task-analysis',
        type: 'agent',
        name: 'Task Analysis',
        agent: supervisorAgent,
        execute: async (state) => {
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for the supervisor to analyze the task
            const prompt = `
            You are a supervisor coordinating a team of specialist agents to solve a complex task.

            The user has requested: "${contentAsString}"

            Your team consists of the following specialists:
            ${specialistAgents.map(agent => `- ${agent.name}: ${agent.expertise}`).join('\n')}

            Analyze this task and determine which specialist(s) should handle it.
            Respond with the ID of the specialist who should handle this task, or "collaborate" if multiple specialists need to work together.
            `;
            // Generate analysis
            const analysis = await supervisorAgent.generate(prompt);
            // Store analysis
            state.outputs['task-analysis'] = analysis;
            state.taskAnalysis = analysis;
            return state;
        }
    };
    // Create specialist agent nodes
    const specialistNodes = specialistAgents.map(specialistAgent => {
        return {
            id: `specialist-${specialistAgent.id}`,
            type: 'agent',
            name: specialistAgent.name,
            agent: specialistAgent.agent,
            execute: async (state) => {
                // Get the input message
                const lastMessage = state.messages.length > 0
                    ? state.messages[state.messages.length - 1]
                    : null;
                // Get content as string
                const messageContent = lastMessage?.content || '';
                const contentAsString = typeof messageContent === 'string'
                    ? messageContent
                    : JSON.stringify(messageContent);
                // Create a prompt for the specialist
                const prompt = `
                You are ${specialistAgent.name}, a specialist in ${specialistAgent.expertise}.

                The user has requested: "${contentAsString}"

                Please provide your expert analysis and solution for this task.
                `;
                // Generate response
                const response = await specialistAgent.agent.generate(prompt);
                // Store response
                state.outputs[`specialist-${specialistAgent.id}`] = response;
                state[`specialist-${specialistAgent.id}-response`] = response;
                return state;
            }
        };
    });
    const integrationNode = {
        id: 'integration',
        type: 'agent',
        name: 'Integration',
        agent: supervisorAgent,
        execute: async (state) => {
            // Get specialist responses
            const specialistResponses = specialistAgents.map(agent => {
                const responseKey = `specialist-${agent.id}-response`;
                return {
                    name: agent.name,
                    expertise: agent.expertise,
                    response: state[responseKey] || 'No response provided'
                };
            });
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for the supervisor to integrate responses
            const prompt = `
            You are a supervisor coordinating a team of specialist agents to solve a complex task.

            The user has requested: "${contentAsString}"

            Your specialists have provided the following responses:
            ${specialistResponses.map(sr => `## ${sr.name} (${sr.expertise}):\n${sr.response}`).join('\n\n')}

            Please integrate these responses into a comprehensive solution for the user.
            `;
            // Generate integrated response
            const integratedResponse = await supervisorAgent.generate(prompt);
            // Store integrated response
            state.outputs['integration'] = integratedResponse;
            return state;
        }
    };
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'task-analysis', type: 'default' }
    ];
    // Add edges from task analysis to specialists
    specialistAgents.forEach(agent => {
        edges.push({
            source: 'task-analysis',
            target: `specialist-${agent.id}`,
            type: 'default',
            condition: async (state) => {
                const analysis = state.taskAnalysis || '';
                // Route to this specialist if they're mentioned or if collaboration is needed
                return analysis.includes(agent.id) || analysis.toLowerCase().includes('collaborate');
            }
        });
    });
    // Add edges from specialists to integration
    specialistAgents.forEach(agent => {
        edges.push({
            source: `specialist-${agent.id}`,
            target: 'integration',
            type: 'default'
        });
    });
    // Add edge from integration to output
    edges.push({ source: 'integration', target: 'output', type: 'default' });
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, taskAnalysisNode, ...specialistNodes, integrationNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a memory-enhanced agent workflow with long-term recall
 *
 * This workflow enhances the agent with sophisticated memory capabilities,
 * allowing it to recall past interactions, learn from them, and maintain
 * context over long conversations.
 */
function createMemoryEnhancedAgentWorkflow(id, name, description, agent) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    // Create a memory retrieval tool that uses the vector memory manager
    const memoryRetrievalTool = (0, vectorStores_1.createMemoryRetrievalTool)();
    const memoryRetrievalNode = {
        id: 'memory-retrieval',
        type: 'tool',
        name: 'Memory Retrieval',
        tool: memoryRetrievalTool,
        execute: async (state) => {
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Use the memory retrieval tool to get relevant memories
            logger_1.logger.info('Retrieving memories for:', contentAsString);
            const result = await memoryRetrievalTool.invoke({
                query: contentAsString,
                limit: 5
            });
            // Store retrieved memories
            state.outputs['memory-retrieval'] = result;
            state.retrievedMemories = result;
            return state;
        }
    };
    const contextEnhancementNode = {
        id: 'context-enhancement',
        type: 'tool',
        name: 'Context Enhancement',
        execute: async (state) => {
            // Get retrieved memories
            const retrievedMemories = state.retrievedMemories || '';
            // Create enhanced context
            let enhancedContext = '';
            if (retrievedMemories) {
                enhancedContext = `
                Relevant memories from past interactions:
                ${retrievedMemories}

                Use these memories to provide a more personalized response.
                `;
            }
            else {
                enhancedContext = 'No relevant memories found from past interactions.';
            }
            // Store enhanced context
            state.outputs['context-enhancement'] = enhancedContext;
            state.enhancedContext = enhancedContext;
            return state;
        }
    };
    const agentNode = {
        id: 'agent',
        type: 'agent',
        name: 'Memory-Enhanced Agent',
        agent,
        execute: async (state) => {
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Get enhanced context
            const enhancedContext = state.enhancedContext || '';
            // Create a prompt with enhanced context
            const prompt = `
            ${enhancedContext}

            User query: "${contentAsString}"

            Provide a response that takes into account the user's past interactions and preferences.
            `;
            // Generate response
            const response = await agent.generate(prompt);
            // Store response
            state.outputs['agent'] = response;
            return state;
        }
    };
    // Create a memory save tool that uses the vector memory manager
    const memorySaveTool = (0, vectorStores_1.createMemorySaveTool)();
    const memorySaveNode = {
        id: 'memory-save',
        type: 'tool',
        name: 'Memory Save',
        tool: memorySaveTool,
        execute: async (state) => {
            // Get the agent's response
            const agentResponse = state.outputs['agent'] || '';
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Extract important information to save to memory
            logger_1.logger.info('Saving memory from conversation:');
            logger_1.logger.info('- User query:', contentAsString);
            logger_1.logger.info('- Agent response:', agentResponse);
            // Create memory content
            const memoryContent = `User asked: "${contentAsString.substring(0, 100)}${contentAsString.length > 100 ? '...' : ''}" \n\nAssistant responded: "${agentResponse.substring(0, 100)}${agentResponse.length > 100 ? '...' : ''}"`;
            // Use the memory save tool to save the memory
            const result = await memorySaveTool.invoke({
                content: memoryContent,
                metadata: {
                    source: 'conversation',
                    type: 'dialogue',
                    userQuery: contentAsString.substring(0, 100),
                    timestamp: Date.now()
                }
            });
            // Store memory save result
            state.outputs['memory-save'] = result;
            return state;
        }
    };
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'memory-retrieval', type: 'default' },
        { source: 'memory-retrieval', target: 'context-enhancement', type: 'default' },
        { source: 'context-enhancement', target: 'agent', type: 'default' },
        { source: 'agent', target: 'memory-save', type: 'default' },
        { source: 'memory-save', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, memoryRetrievalNode, contextEnhancementNode, agentNode, memorySaveNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a code generation and review workflow
 *
 * This workflow uses specialized agents for code generation and code review,
 * working together to produce high-quality code based on user requirements.
 */
function createCodeGenerationWorkflow(id, name, description, codeGenerationAgent, codeReviewAgent) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const requirementsAnalysisNode = {
        id: 'requirements-analysis',
        type: 'agent',
        name: 'Requirements Analysis',
        agent: codeGenerationAgent,
        execute: async (state) => {
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for requirements analysis
            const prompt = `
            You are a requirements analyst. Your job is to analyze the user's request and extract clear requirements for code generation.

            User request: "${contentAsString}"

            Please provide a structured list of requirements, including:
            1. The programming language to use
            2. The main functionality required
            3. Any specific constraints or considerations
            4. Edge cases to handle

            Format your response as a clear, structured list of requirements.
            `;
            // Generate requirements analysis
            const analysis = await codeGenerationAgent.generate(prompt);
            // Store analysis
            state.outputs['requirements-analysis'] = analysis;
            state.requirements = analysis;
            return state;
        }
    };
    const codeGenerationNode = {
        id: 'code-generation',
        type: 'agent',
        name: 'Code Generation',
        agent: codeGenerationAgent,
        execute: async (state) => {
            // Get requirements
            const requirements = state.requirements || '';
            // Create a prompt for code generation
            const prompt = `
            You are a code generation expert. Your job is to write high-quality code based on the following requirements:

            ${requirements}

            Please generate clean, well-documented code that meets these requirements.
            Include comments to explain your implementation choices.
            `;
            // Generate code
            const generatedCode = await codeGenerationAgent.generate(prompt);
            // Store generated code
            state.outputs['code-generation'] = generatedCode;
            state.generatedCode = generatedCode;
            return state;
        }
    };
    const codeReviewNode = {
        id: 'code-review',
        type: 'agent',
        name: 'Code Review',
        agent: codeReviewAgent,
        execute: async (state) => {
            // Get generated code
            const generatedCode = state.generatedCode || '';
            // Get requirements
            const requirements = state.requirements || '';
            // Create a prompt for code review
            const prompt = `
            You are a code review expert. Your job is to review the following code and provide feedback.

            Requirements:
            ${requirements}

            Generated code:
            ${generatedCode}

            Please review this code for:
            1. Correctness - Does it meet the requirements?
            2. Efficiency - Are there any performance issues?
            3. Readability - Is the code clear and well-documented?
            4. Best practices - Does it follow industry best practices?
            5. Security - Are there any security concerns?

            Provide specific feedback and suggestions for improvement.
            `;
            // Generate review
            const review = await codeReviewAgent.generate(prompt);
            // Store review
            state.outputs['code-review'] = review;
            state.codeReview = review;
            return state;
        }
    };
    const codeRefinementNode = {
        id: 'code-refinement',
        type: 'agent',
        name: 'Code Refinement',
        agent: codeGenerationAgent,
        execute: async (state) => {
            // Get generated code
            const generatedCode = state.generatedCode || '';
            // Get code review
            const codeReview = state.codeReview || '';
            // Create a prompt for code refinement
            const prompt = `
            You are a code refinement expert. Your job is to improve the code based on the review feedback.

            Original code:
            ${generatedCode}

            Review feedback:
            ${codeReview}

            Please refine the code to address the feedback. Provide the improved code along with a summary of the changes made.
            `;
            // Generate refined code
            const refinedCode = await codeGenerationAgent.generate(prompt);
            // Store refined code
            state.outputs['code-refinement'] = refinedCode;
            return state;
        }
    };
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'requirements-analysis', type: 'default' },
        { source: 'requirements-analysis', target: 'code-generation', type: 'default' },
        { source: 'code-generation', target: 'code-review', type: 'default' },
        { source: 'code-review', target: 'code-refinement', type: 'default' },
        { source: 'code-refinement', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, requirementsAnalysisNode, codeGenerationNode, codeReviewNode, codeRefinementNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create an autonomous research agent workflow
 *
 * This workflow implements an agent that can autonomously research a topic,
 * gather information from multiple sources, analyze it, and synthesize findings.
 */
function createResearchWorkflow(id, name, description, agent, searchTool) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const topicAnalysisNode = {
        id: 'topic-analysis',
        type: 'agent',
        name: 'Topic Analysis',
        agent,
        execute: async (state) => {
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for topic analysis
            const prompt = `
            You are a research planning expert. Your job is to analyze the research topic and break it down into subtopics for investigation.

            Research topic: "${contentAsString}"

            Please:
            1. Break this topic into 3-5 key subtopics to investigate
            2. For each subtopic, formulate 1-2 specific search queries that would yield relevant information
            3. Identify any potential challenges or limitations in researching this topic

            Format your response as a structured research plan.
            `;
            // Generate topic analysis
            const analysis = await agent.generate(prompt);
            // Store analysis
            state.outputs['topic-analysis'] = analysis;
            state.researchPlan = analysis;
            // Extract search queries from the analysis
            // In a real implementation, this would use an LLM to extract queries
            const searchQueries = [
                contentAsString,
                `latest developments in ${contentAsString}`,
                `${contentAsString} best practices`,
                `${contentAsString} challenges`
            ];
            state.searchQueries = searchQueries;
            return state;
        }
    };
    // Create a wrapper for the search tool that conforms to the Tool interface
    const wrappedSearchTool = new SearchStructuredTool(searchTool);
    const informationGatheringNode = {
        id: 'information-gathering',
        type: 'tool',
        name: 'Information Gathering',
        tool: wrappedSearchTool,
        execute: async (state) => {
            // Get search queries
            const searchQueries = state.searchQueries || [];
            // Perform searches
            const searchResults = [];
            for (const query of searchQueries) {
                try {
                    // Use the wrapped search tool to get results
                    const result = await wrappedSearchTool.invoke(query);
                    searchResults.push({
                        query,
                        result: typeof result === 'string' ? result : JSON.stringify(result)
                    });
                }
                catch (error) {
                    logger_1.logger.error(`Error searching for "${query}":`, error);
                    searchResults.push({
                        query,
                        result: `Error: ${error instanceof Error ? error.message : String(error)}`
                    });
                }
            }
            // Store search results
            state.outputs['information-gathering'] = searchResults;
            state.searchResults = searchResults;
            return state;
        }
    };
    const informationAnalysisNode = {
        id: 'information-analysis',
        type: 'agent',
        name: 'Information Analysis',
        agent,
        execute: async (state) => {
            // Get search results
            const searchResults = state.searchResults || [];
            // Format search results for analysis
            const formattedResults = searchResults.map((result) => `Query: "${result.query}"\nResults: ${result.result}`).join('\n\n');
            // Create a prompt for information analysis
            const prompt = `
            You are a research analyst. Your job is to analyze the following search results and extract key insights.

            Search results:
            ${formattedResults}

            Please:
            1. Identify the most important facts and insights from these results
            2. Note any contradictions or inconsistencies in the information
            3. Identify gaps where more information might be needed
            4. Evaluate the credibility and relevance of the information

            Format your response as a structured analysis.
            `;
            // Generate analysis
            const analysis = await agent.generate(prompt);
            // Store analysis
            state.outputs['information-analysis'] = analysis;
            state.informationAnalysis = analysis;
            return state;
        }
    };
    const findingsSynthesisNode = {
        id: 'findings-synthesis',
        type: 'agent',
        name: 'Findings Synthesis',
        agent,
        execute: async (state) => {
            // Get information analysis
            const informationAnalysis = state.informationAnalysis || '';
            // Get the original research topic
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for findings synthesis
            const prompt = `
            You are a research synthesizer. Your job is to synthesize the analysis into a comprehensive report.

            Original research topic: "${contentAsString}"

            Analysis:
            ${informationAnalysis}

            Please create a comprehensive research report that:
            1. Provides an executive summary of key findings
            2. Presents the main insights organized by theme or subtopic
            3. Discusses implications and applications of the findings
            4. Suggests areas for further research

            Format your response as a well-structured research report with clear sections and headings.
            `;
            // Generate synthesis
            const synthesis = await agent.generate(prompt);
            // Store synthesis
            state.outputs['findings-synthesis'] = synthesis;
            return state;
        }
    };
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'topic-analysis', type: 'default' },
        { source: 'topic-analysis', target: 'information-gathering', type: 'default' },
        { source: 'information-gathering', target: 'information-analysis', type: 'default' },
        { source: 'information-analysis', target: 'findings-synthesis', type: 'default' },
        { source: 'findings-synthesis', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, topicAnalysisNode, informationGatheringNode, informationAnalysisNode, findingsSynthesisNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
//# sourceMappingURL=advancedTemplates.js.map