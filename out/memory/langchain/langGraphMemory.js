"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.langGraphMemory = exports.LangGraphMemory = void 0;
const logger_1 = require("../../logger");
const langgraph_1 = require("langgraph");
const prompts_1 = require("@langchain/core/prompts");
const messages_1 = require("@langchain/core/messages");
const llmService_1 = require("../../llm/llmService");
const langchainMemory_1 = require("./langchainMemory");
const types_1 = require("../types");
/**
 * LangGraph Memory
 * Implements memory workflows using LangGraph
 */
class LangGraphMemory {
    constructor() {
        this.initialized = false;
    }
    /**
     * Initialize LangGraph memory
     */
    async initialize() {
        try {
            // Get model from LLM service
            const provider = llmService_1.llmService.getDefaultProvider();
            if (!provider) {
                throw new Error('No default provider available');
            }
            // Create model adapter
            this.model = {
                invoke: async (messages, options) => {
                    try {
                        const result = await provider.generate({
                            prompt: messages.map((m) => {
                                if (typeof m._getType === 'function') {
                                    if (m._getType() === 'human') {
                                        return `User: ${m.content}`;
                                    }
                                    else if (m._getType() === 'ai') {
                                        return `Assistant: ${m.content}`;
                                    }
                                    else if (m._getType() === 'system') {
                                        return `System: ${m.content}`;
                                    }
                                }
                                return `User: ${String(m.content)}`;
                            }).join('\n'),
                            modelId: 'default',
                            options: {
                                temperature: options?.temperature || 0.7,
                                maxTokens: options?.maxTokens,
                                stopSequences: options?.stop
                            }
                        });
                        return new messages_1.AIMessage(result.content || '');
                    }
                    catch (error) {
                        logger_1.logger.error('Error invoking model:', error);
                        throw error;
                    }
                },
                // Add required methods to satisfy BaseChatModel interface
                _llmType: () => 'custom',
                _modelType: () => 'chat'
            };
            // Create memory graph
            this.graph = this.createMemoryGraph();
            this.initialized = true;
            logger_1.logger.info('LangGraph memory initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize LangGraph memory:', error);
            throw error;
        }
    }
    /**
     * Create memory graph
     */
    createMemoryGraph() {
        // Create state graph
        const graph = new langgraph_1.StateGraph({
            channels: {
                messages: {
                    value: [],
                    default: () => []
                },
                context: {
                    value: [],
                    default: () => []
                },
                memories: {
                    value: [],
                    default: () => []
                },
                currentTask: {
                    value: '',
                    default: () => ''
                },
                nextAction: {
                    value: '',
                    default: () => ''
                }
            }
        });
        // Add nodes
        // 1. Retrieve relevant memories
        graph.addNode('retrieveMemories', async (state, config) => {
            try {
                // Get last message
                const lastMessage = state.messages[state.messages.length - 1];
                if (!lastMessage || lastMessage._getType() !== 'human') {
                    return { ...state };
                }
                // Search for relevant memories
                const query = lastMessage.content;
                const memories = await langchainMemory_1.langchainMemoryProvider.searchSimilarMemories(query);
                // Extract context from memories
                const context = memories.map(memory => memory.content);
                return {
                    ...state,
                    context,
                    memories
                };
            }
            catch (error) {
                logger_1.logger.error('Error retrieving memories:', error);
                return { ...state };
            }
        });
        // 2. Determine next action
        graph.addNode('determineNextAction', async (state, config) => {
            try {
                if (!this.model) {
                    return { ...state, nextAction: 'respond' };
                }
                // Create prompt
                const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                    new messages_1.SystemMessage('You are a memory management assistant. Based on the conversation history and the user\'s latest message, ' +
                        'determine what action to take next. Options are:\n' +
                        '- "respond": Generate a normal response\n' +
                        '- "store": Store important information from the conversation\n' +
                        '- "retrieve": Retrieve more specific information from memory\n' +
                        '- "summarize": Summarize the conversation so far\n' +
                        'Respond with just one of these action names.'),
                    new prompts_1.MessagesPlaceholder('messages'),
                    new messages_1.HumanMessage('What action should I take next?')
                ]);
                // Invoke model
                const chain = prompt.pipe(this.model);
                const result = await chain.invoke({
                    messages: state.messages
                });
                // Extract action
                const action = String(result.content).toLowerCase().trim();
                // Validate action
                const validActions = ['respond', 'store', 'retrieve', 'summarize'];
                const nextAction = validActions.includes(action) ? action : 'respond';
                return {
                    ...state,
                    nextAction
                };
            }
            catch (error) {
                logger_1.logger.error('Error determining next action:', error);
                return { ...state, nextAction: 'respond' };
            }
        });
        // 3. Store memory
        graph.addNode('storeMemory', async (state, config) => {
            try {
                // Get last message pair (human and AI)
                const messages = state.messages;
                if (messages.length < 2) {
                    return { ...state };
                }
                const lastHumanIndex = messages.map((m) => m._getType()).lastIndexOf('human');
                const lastAIIndex = messages.map((m) => m._getType()).lastIndexOf('ai');
                if (lastHumanIndex === -1 || lastAIIndex === -1) {
                    return { ...state };
                }
                const humanMessage = messages[lastHumanIndex];
                const aiMessage = messages[lastAIIndex];
                // Create memory entry
                const memoryEntry = {
                    content: `User: ${humanMessage.content}\nAssistant: ${aiMessage.content}`,
                    metadata: {
                        source: types_1.MemorySource.CONVERSATION,
                        type: types_1.MemoryType.CONVERSATION,
                        tags: ['conversation']
                    }
                };
                // Add to memory
                await langchainMemory_1.langchainMemoryProvider.addMemory(memoryEntry);
                return { ...state };
            }
            catch (error) {
                logger_1.logger.error('Error storing memory:', error);
                return { ...state };
            }
        });
        // 4. Retrieve specific memory
        graph.addNode('retrieveSpecificMemory', async (state, config) => {
            try {
                // Get last message
                const lastMessage = state.messages[state.messages.length - 1];
                if (!lastMessage || lastMessage._getType() !== 'human') {
                    return { ...state };
                }
                // Create prompt to extract search query
                const extractPrompt = prompts_1.ChatPromptTemplate.fromMessages([
                    new messages_1.SystemMessage('Extract the specific information or topic the user is asking about. ' +
                        'Respond with just the key search terms, no explanation.'),
                    new messages_1.HumanMessage(lastMessage.content)
                ]);
                // Invoke model
                const chain = extractPrompt.pipe(this.model);
                const result = await chain.invoke({});
                // Extract search query
                const searchQuery = String(result.content).trim();
                // Search for specific memories
                const memories = await langchainMemory_1.langchainMemoryProvider.searchSimilarMemories(searchQuery);
                // Extract context from memories
                const context = memories.map(memory => memory.content);
                return {
                    ...state,
                    context,
                    memories
                };
            }
            catch (error) {
                logger_1.logger.error('Error retrieving specific memory:', error);
                return { ...state };
            }
        });
        // 5. Summarize conversation
        graph.addNode('summarizeConversation', async (state, config) => {
            try {
                if (!this.model || state.messages.length < 3) {
                    return { ...state };
                }
                // Create prompt
                const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                    new messages_1.SystemMessage('Summarize the key points of this conversation in a concise way. ' +
                        'Focus on important information, decisions, and action items.'),
                    new prompts_1.MessagesPlaceholder('messages')
                ]);
                // Invoke model
                const chain = prompt.pipe(this.model);
                const result = await chain.invoke({
                    messages: state.messages
                });
                // Create memory entry
                const memoryEntry = {
                    content: `Conversation Summary: ${result.content}`,
                    metadata: {
                        source: types_1.MemorySource.CONVERSATION,
                        type: types_1.MemoryType.CONVERSATION,
                        tags: ['summary', 'conversation']
                    }
                };
                // Add to memory
                await langchainMemory_1.langchainMemoryProvider.addMemory(memoryEntry);
                return { ...state };
            }
            catch (error) {
                logger_1.logger.error('Error summarizing conversation:', error);
                return { ...state };
            }
        });
        // 6. Generate response
        graph.addNode('generateResponse', async (state, config) => {
            try {
                if (!this.model) {
                    return { ...state };
                }
                // Create prompt
                const prompt = prompts_1.ChatPromptTemplate.fromMessages([
                    new messages_1.SystemMessage('You are a helpful assistant with access to memory. ' +
                        'Use the provided context from memory if it\'s relevant to the user\'s question.'),
                    new messages_1.SystemMessage('Context from memory:\n${context}'),
                    new prompts_1.MessagesPlaceholder('messages')
                ]);
                // Invoke model
                const chain = prompt.pipe(this.model);
                const result = await chain.invoke({
                    messages: state.messages,
                    context: state.context.join('\n\n')
                });
                // Add response to messages
                return {
                    ...state,
                    messages: [...state.messages, result]
                };
            }
            catch (error) {
                logger_1.logger.error('Error generating response:', error);
                return { ...state };
            }
        });
        // Define edges
        graph.addEdge('retrieveMemories', 'determineNextAction');
        // Add conditional edges from determineNextAction
        // LangGraph StateGraph.addConditionalEdges only takes (from, condition)
        graph.addConditionalEdges('determineNextAction', (state) => {
            // Map nextAction to node name
            switch (state.nextAction) {
                case 'respond': return 'generateResponse';
                case 'store': return 'storeMemory';
                case 'retrieve': return 'retrieveSpecificMemory';
                case 'summarize': return 'summarizeConversation';
                default: return 'generateResponse';
            }
        });
        // Connect store, retrieve, and summarize back to generateResponse
        graph.addEdge('storeMemory', 'generateResponse');
        graph.addEdge('retrieveSpecificMemory', 'generateResponse');
        graph.addEdge('summarizeConversation', 'generateResponse');
        // No setEntryPoint in StateGraph API; entry is implicitly the first node added
        // Compile graph
        this.compiledGraph = graph.compile();
        return graph;
    }
    /**
     * Process a new message
     * @param message Human message
     * @returns AI response
     */
    async processMessage(message) {
        if (!this.initialized || !this.graph) {
            await this.initialize();
        }
        try {
            // Create human message
            const humanMessage = new messages_1.HumanMessage(message);
            // Prepare initial state (customize as needed)
            const initialState = {
                messages: [humanMessage],
                context: [],
                memories: [],
                currentTask: '',
                nextAction: ''
            };
            // Run compiled graph
            if (!this.compiledGraph) {
                throw new Error('Compiled graph is not available');
            }
            const result = await this.compiledGraph.invoke(initialState);
            // Extract AI response
            const aiMessages = result.messages.filter((m) => (typeof m._getType === 'function') && m._getType() === 'ai');
            if (aiMessages.length === 0) {
                throw new Error('No AI response generated');
            }
            const lastAIMessage = aiMessages[aiMessages.length - 1];
            // Defensive: lastAIMessage.content may not be string
            const response = typeof lastAIMessage.content === 'string' ? lastAIMessage.content : String(lastAIMessage.content);
            return response;
            return lastAIMessage.content;
        }
        catch (error) {
            logger_1.logger.error('Error processing message:', error);
            throw error;
        }
    }
}
exports.LangGraphMemory = LangGraphMemory;
// Export singleton instance
exports.langGraphMemory = new LangGraphMemory();
//# sourceMappingURL=langGraphMemory.js.map