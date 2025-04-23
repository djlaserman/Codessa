"use strict";
/**
 * Specialized LangGraph workflow templates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDocumentQAWorkflow = createDocumentQAWorkflow;
exports.createCodeRefactoringWorkflow = createCodeRefactoringWorkflow;
exports.createDebuggingWorkflow = createDebuggingWorkflow;
const graph_1 = require("./graph");
const registry_1 = require("./registry");
const vectorStores_1 = require("./vectorStores");
/**
 * Create a document Q&A workflow
 *
 * This workflow is specialized for answering questions about documents.
 * It retrieves relevant documents, extracts information, and generates
 * a comprehensive answer with citations.
 */
function createDocumentQAWorkflow(id, name, description, agent) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    // Create document retrieval tool
    const documentRetrievalTool = (0, vectorStores_1.createDocumentRetrievalTool)();
    const documentRetrievalNode = graph_1.LangGraph.createToolNode('document-retrieval', 'Document Retrieval', documentRetrievalTool);
    const informationExtractionNode = {
        id: 'information-extraction',
        type: 'agent',
        name: 'Information Extraction',
        agent,
        execute: async (state) => {
            // Get retrieved documents
            const retrievedDocuments = state.outputs['document-retrieval'] || '';
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for information extraction
            const prompt = `
            You are an information extraction expert. Your job is to extract relevant information from documents to answer a question.
            
            Question: "${contentAsString}"
            
            Retrieved documents:
            ${retrievedDocuments}
            
            Please extract the specific information needed to answer the question. Focus on:
            1. Key facts and data points
            2. Relevant context
            3. Any contradictions or uncertainties in the documents
            
            Format your response as a structured extraction of information, not as a final answer.
            Include citations to the source documents where possible.
            `;
            // Generate extraction
            const extraction = await agent.generate(prompt);
            // Store extraction
            state.outputs['information-extraction'] = extraction;
            state.extractedInformation = extraction;
            return state;
        }
    };
    const answerGenerationNode = {
        id: 'answer-generation',
        type: 'agent',
        name: 'Answer Generation',
        agent,
        execute: async (state) => {
            // Get extracted information
            const extractedInformation = state.extractedInformation || '';
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for answer generation
            const prompt = `
            You are a question answering expert. Your job is to provide a comprehensive answer to a question based on extracted information.
            
            Question: "${contentAsString}"
            
            Extracted information:
            ${extractedInformation}
            
            Please provide a comprehensive answer that:
            1. Directly addresses the question
            2. Incorporates all relevant information from the extracted data
            3. Acknowledges any uncertainties or contradictions
            4. Includes citations to the source documents
            5. Is well-structured and easy to understand
            
            Format your response as a complete answer with proper citations.
            `;
            // Generate answer
            const answer = await agent.generate(prompt);
            // Store answer
            state.outputs['answer-generation'] = answer;
            return state;
        }
    };
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'document-retrieval', type: 'default' },
        { source: 'document-retrieval', target: 'information-extraction', type: 'default' },
        { source: 'information-extraction', target: 'answer-generation', type: 'default' },
        { source: 'answer-generation', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, documentRetrievalNode, informationExtractionNode, answerGenerationNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a code refactoring workflow
 *
 * This workflow is specialized for refactoring code. It analyzes the code,
 * identifies issues, plans refactoring steps, and implements the refactoring.
 */
function createCodeRefactoringWorkflow(id, name, description, agent) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const codeAnalysisNode = {
        id: 'code-analysis',
        type: 'agent',
        name: 'Code Analysis',
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
            // Create a prompt for code analysis
            const prompt = `
            You are a code analysis expert. Your job is to analyze code and identify issues that need refactoring.
            
            Code to analyze:
            \`\`\`
            ${contentAsString}
            \`\`\`
            
            Please analyze this code for:
            1. Code smells (e.g., duplicate code, long methods, large classes)
            2. Design issues (e.g., poor encapsulation, tight coupling)
            3. Performance concerns
            4. Maintainability issues
            5. Potential bugs or edge cases
            
            For each issue, provide:
            - A description of the issue
            - The location in the code (line numbers or method names)
            - The severity (high, medium, low)
            - A brief explanation of why it's an issue
            
            Format your response as a structured analysis report.
            `;
            // Generate analysis
            const analysis = await agent.generate(prompt);
            // Store analysis
            state.outputs['code-analysis'] = analysis;
            state.codeAnalysis = analysis;
            return state;
        }
    };
    const refactoringPlanNode = {
        id: 'refactoring-plan',
        type: 'agent',
        name: 'Refactoring Plan',
        agent,
        execute: async (state) => {
            // Get code analysis
            const codeAnalysis = state.codeAnalysis || '';
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for refactoring plan
            const prompt = `
            You are a refactoring expert. Your job is to create a plan for refactoring code based on an analysis.
            
            Original code:
            \`\`\`
            ${contentAsString}
            \`\`\`
            
            Code analysis:
            ${codeAnalysis}
            
            Please create a step-by-step refactoring plan that:
            1. Prioritizes issues by severity and dependency
            2. Breaks down the refactoring into manageable steps
            3. Describes the specific refactoring techniques to apply (e.g., Extract Method, Move Method)
            4. Explains the expected improvements from each step
            5. Considers potential risks and how to mitigate them
            
            Format your response as a structured refactoring plan with clear steps.
            `;
            // Generate plan
            const plan = await agent.generate(prompt);
            // Store plan
            state.outputs['refactoring-plan'] = plan;
            state.refactoringPlan = plan;
            return state;
        }
    };
    const refactoringImplementationNode = {
        id: 'refactoring-implementation',
        type: 'agent',
        name: 'Refactoring Implementation',
        agent,
        execute: async (state) => {
            // Get refactoring plan
            const refactoringPlan = state.refactoringPlan || '';
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for refactoring implementation
            const prompt = `
            You are a code refactoring expert. Your job is to implement a refactoring plan.
            
            Original code:
            \`\`\`
            ${contentAsString}
            \`\`\`
            
            Refactoring plan:
            ${refactoringPlan}
            
            Please implement the refactoring plan and provide:
            1. The refactored code
            2. A summary of the changes made
            3. An explanation of how the refactoring addresses the identified issues
            4. Any additional notes or considerations for the developer
            
            Format your response with the refactored code clearly marked in code blocks.
            `;
            // Generate implementation
            const implementation = await agent.generate(prompt);
            // Store implementation
            state.outputs['refactoring-implementation'] = implementation;
            return state;
        }
    };
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'code-analysis', type: 'default' },
        { source: 'code-analysis', target: 'refactoring-plan', type: 'default' },
        { source: 'refactoring-plan', target: 'refactoring-implementation', type: 'default' },
        { source: 'refactoring-implementation', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, codeAnalysisNode, refactoringPlanNode, refactoringImplementationNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
/**
 * Create a debugging workflow
 *
 * This workflow is specialized for debugging code. It analyzes the code and error,
 * identifies the root cause, generates a fix, and explains the solution.
 */
function createDebuggingWorkflow(id, name, description, agent) {
    // Create nodes
    const inputNode = graph_1.LangGraph.createInputNode('input', 'Input');
    const errorAnalysisNode = {
        id: 'error-analysis',
        type: 'agent',
        name: 'Error Analysis',
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
            // Create a prompt for error analysis
            const prompt = `
            You are a debugging expert. Your job is to analyze code and error messages to identify the root cause of issues.
            
            The user has provided the following code and error:
            
            ${contentAsString}
            
            Please analyze this information and:
            1. Identify the specific error or issue
            2. Determine the root cause
            3. Explain why this error is occurring
            4. Identify any related issues or potential side effects
            
            Format your response as a detailed error analysis.
            `;
            // Generate analysis
            const analysis = await agent.generate(prompt);
            // Store analysis
            state.outputs['error-analysis'] = analysis;
            state.errorAnalysis = analysis;
            return state;
        }
    };
    const solutionGenerationNode = {
        id: 'solution-generation',
        type: 'agent',
        name: 'Solution Generation',
        agent,
        execute: async (state) => {
            // Get error analysis
            const errorAnalysis = state.errorAnalysis || '';
            // Get the input message
            const lastMessage = state.messages.length > 0
                ? state.messages[state.messages.length - 1]
                : null;
            // Get content as string
            const messageContent = lastMessage?.content || '';
            const contentAsString = typeof messageContent === 'string'
                ? messageContent
                : JSON.stringify(messageContent);
            // Create a prompt for solution generation
            const prompt = `
            You are a debugging expert. Your job is to generate solutions for code issues.
            
            Original code and error:
            ${contentAsString}
            
            Error analysis:
            ${errorAnalysis}
            
            Please generate a solution that:
            1. Fixes the identified issue
            2. Is minimal and focused on the specific problem
            3. Follows best practices
            4. Considers potential edge cases
            
            Provide multiple solution options if appropriate, with pros and cons for each.
            Format your response with the fixed code clearly marked in code blocks.
            `;
            // Generate solution
            const solution = await agent.generate(prompt);
            // Store solution
            state.outputs['solution-generation'] = solution;
            state.solution = solution;
            return state;
        }
    };
    const explanationNode = {
        id: 'explanation',
        type: 'agent',
        name: 'Explanation',
        agent,
        execute: async (state) => {
            // Get error analysis and solution
            const errorAnalysis = state.errorAnalysis || '';
            const solution = state.solution || '';
            // Create a prompt for explanation
            const prompt = `
            You are a debugging expert. Your job is to explain solutions to code issues in a way that helps developers learn.
            
            Error analysis:
            ${errorAnalysis}
            
            Solution:
            ${solution}
            
            Please provide a comprehensive explanation that:
            1. Summarizes the issue and its root cause
            2. Explains how the solution addresses the problem
            3. Provides context about why this type of error occurs
            4. Offers tips for avoiding similar issues in the future
            5. Suggests any additional improvements or best practices
            
            Format your response as an educational explanation that helps the developer understand not just the fix, but the underlying concepts.
            `;
            // Generate explanation
            const explanation = await agent.generate(prompt);
            // Store explanation
            state.outputs['explanation'] = explanation;
            return state;
        }
    };
    const outputNode = graph_1.LangGraph.createOutputNode('output', 'Output');
    // Create edges
    const edges = [
        { source: 'input', target: 'error-analysis', type: 'default' },
        { source: 'error-analysis', target: 'solution-generation', type: 'default' },
        { source: 'solution-generation', target: 'explanation', type: 'default' },
        { source: 'explanation', target: 'output', type: 'default' }
    ];
    // Create workflow definition
    const workflow = {
        id,
        name,
        description,
        version: '1.0.0',
        nodes: [inputNode, errorAnalysisNode, solutionGenerationNode, explanationNode, outputNode],
        edges,
        startNodeId: 'input'
    };
    // Register workflow
    registry_1.langGraphRegistry.registerWorkflow(workflow);
    return workflow;
}
//# sourceMappingURL=specializedTemplates.js.map