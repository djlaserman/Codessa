# Codessa Operation Modes Implementation Plan

## Overview

This plan outlines the implementation of different operation modes for the Codessa VS Code extension. The goal is to provide users with specialized interfaces and workflows for different types of interactions with AI assistants.

## Operation Modes

The following operation modes have been implemented:

1. **Ask Mode** - For asking questions about the codebase
   - Focused on providing factual information
   - Context-aware responses
   - Lower temperature for more precise answers

2. **Chat Mode** - For general conversation with the AI
   - More conversational and flexible
   - Can handle a wide range of topics
   - Balanced temperature for creativity and accuracy

3. **Debug Mode** - For debugging code issues
   - Focused on identifying and fixing bugs
   - Error analysis and solution suggestions
   - Step-by-step debugging guidance

4. **Edit Mode** - For AI-assisted code editing
   - Code generation and modification
   - Requires human verification for changes
   - Focused on code quality and best practices

5. **Agent Mode** - For autonomous AI agent operation
   - Can perform complex tasks with minimal guidance
   - Uses tools to interact with the environment
   - Higher autonomy level

6. **Multi-Agent Mode** - For team of AI agents
   - Multiple specialized agents working together
   - Supervisor agent coordinates the team
   - Complex problem-solving capabilities

## Implementation Components

### 1. UI Components

- **Mode Selector** - Allows users to choose an operation mode
  - Grid of mode cards with descriptions
  - Visual indicators for mode features
  - Smooth transitions between modes

- **Chat View Updates** - Enhanced to support mode-specific features
  - Mode indicator in the header
  - Mode-specific input controls
  - Context panels for relevant information

- **Context Panels** - Show relevant context for the current mode
  - File selection for context
  - Context type selector
  - Visual representation of context

### 2. Backend Components

- **Operation Mode Registry** - Manages available modes
  - Registration of modes
  - Default mode selection
  - Mode initialization

- **Context Manager** - Handles context for different modes
  - Context type management
  - Context source handling
  - Context content retrieval

- **Mode-specific Processing** - Custom processing for each mode
  - Specialized prompts
  - Mode-specific LLM parameters
  - Custom tool usage

### 3. Integration Points

- **Command Registration** - VS Code commands for each mode
  - Quick access to modes
  - Context menu integration
  - Keyboard shortcuts

- **Extension Activation** - Mode initialization on startup
  - Mode registration
  - Default mode setting
  - UI preparation

- **Agent Integration** - Connection with the agent system
  - Agent selection for modes
  - Agent configuration for specific modes
  - Multi-agent coordination

## Implementation Status

- [x] Mode selector UI
- [x] Mode registry system
- [x] Context management
- [x] Chat view updates
- [x] Command registration
- [x] Extension integration
- [x] Mode-specific processing
- [x] Multi-agent support

## Future Enhancements

- [ ] User-defined custom modes
- [ ] Mode-specific keyboard shortcuts
- [ ] Enhanced context visualization
- [ ] Mode transition animations
- [ ] Mode-specific themes
- [ ] Mode usage analytics
- [ ] Mode preference persistence

## Improved Model Selection UI Implementation

### Model Selection Overview

This implementation enhances the model selection UI in both the Provider Settings panel and the Agent Configuration panel. It provides a more user-friendly way to select models by displaying them in dropdowns with detailed information and allowing users to refresh the model list.

### Changes Made

#### Provider Settings Panel

1. **Updated HTML Structure**:
   - Added a dedicated "Models" section with a dropdown for selecting the default model
   - Added a "Refresh Models" button to fetch the latest models from the provider
   - Added a visual list of available models with detailed information
   - Changed the test connection UI to use a dropdown instead of a text input

2. **Added CSS Styles**:
   - Added styles for the models list container
   - Added styles for individual model items
   - Added styles for model information display (name, description, context window)
   - Added hover and selection states for model items

3. **Updated JavaScript Logic**:
   - Added state variables to track models and refresh state
   - Added event listeners for the new UI elements
   - Added functions to render models in the list and dropdowns
   - Updated message handling to process model data from the extension

4. **Updated Backend Logic**:
   - Added a new handler for the "getModels" command
   - Enhanced the model fetching to include detailed model information

#### Agent Configuration Panel

1. **Updated Backend Logic**:
   - Modified the _handleGetAvailableModels method to return full model objects instead of just IDs
   - Enhanced error handling to provide better feedback

2. **Updated JavaScript Logic**:
   - Modified the updateModelSelect function to display detailed model information
   - Added tooltips with model descriptions and context window sizes

### How Model Selection Works

1. When the Provider Settings panel loads, it automatically requests models from the provider
2. Models are displayed in both a dropdown and a visual list
3. Users can click on a model in the list to select it as the default
4. Users can refresh the model list to get the latest models from the provider
5. The selected default model is saved with the provider configuration
6. In the Agent Configuration panel, models are displayed with detailed information in the dropdown

### Model Selection Benefits

1. **Better User Experience**: Users can see all available models at a glance
2. **More Information**: Users can see model descriptions and context window sizes
3. **Dynamic Updates**: Users can refresh the model list without reloading the panel
4. **Consistency**: Both panels use the same model information format

### Model Selection Future Improvements

1. Add model categorization or filtering options
2. Add model search functionality for providers with many models
3. Add model comparison features
4. Add model usage statistics or pricing information
5. Add model capability indicators (e.g., vision support, function calling support)

## LLM Provider Implementation

### Provider Overview

This implementation adds several new LLM providers to the Codessa VS Code extension, expanding the range of AI models that users can access. The goal is to provide a comprehensive set of options for different use cases and preferences.

### Implemented Providers

1. **LM Studio Provider**
   - For running local models through LM Studio
   - Supports various open-source models
   - Configurable endpoint for custom setups

2. **OpenRouter Provider**
   - Access to multiple AI models through a unified API
   - Supports models from OpenAI, Anthropic, and others
   - Consistent interface across different model providers

3. **HuggingFace Provider**
   - Access to HuggingFace Inference API models
   - Support for popular open-source models
   - Standardized interface for various model architectures

4. **Cohere Provider**
   - Access to Cohere's AI models
   - Support for Command and Command-R models
   - Specialized for natural language understanding

5. **DeepSeek Provider**
   - Access to DeepSeek AI models
   - Support for general and code-specific models
   - High-performance AI capabilities

### Implementation Details

1. **Provider Classes**:
   - Each provider extends the BaseLLMProvider class
   - Implements standard methods for model listing, generation, and testing
   - Handles provider-specific API requirements

2. **Configuration Management**:
   - Each provider has configurable settings (API keys, endpoints, etc.)
   - Settings are securely stored using VS Code's secret storage
   - Default configurations are provided for quick setup

3. **Model Integration**:
   - All providers expose available models through a consistent interface
   - Models include metadata like context window size and capabilities
   - Consistent error handling across providers

### Benefits

1. **More Options**: Users can choose from a wider range of AI models
2. **Flexibility**: Support for both cloud and local models
3. **Consistency**: Uniform interface across different providers
4. **Specialization**: Access to models optimized for different tasks
5. **Cost Management**: Options for both free and paid models

## LM Studio Connection Issue Fix

### Problem Analysis

The error message shows that the extension is failing to fetch LM Studio models with an error:

```log
[2025-04-21T02:04:30.362Z] ERROR Failed to fetch LM Studio models:
  Stack: AggregateError:
```

This is likely due to one of the following issues:

1. LM Studio is not running locally
2. LM Studio is running but on a different port or URL than expected
3. There's a network connectivity issue between VS Code and LM Studio
4. There's an issue with the error handling in the LM Studio provider code

### Proposed Solution Steps

1. **Improve Error Handling in LM Studio Provider**
   - Update the `listModels` method in `lmstudioProvider.ts` to better handle connection errors
   - Add more detailed error logging to help diagnose the issue
   - Ensure the fallback to default model works properly

2. **Add Connection Retry Logic**
   - Implement a retry mechanism for the initial connection to LM Studio
   - Add a timeout parameter to avoid hanging indefinitely

3. **Enhance User Feedback**
   - Provide clearer error messages to the user when LM Studio is not available
   - Add instructions on how to start LM Studio if it's not running

### LM Studio Implementation Details

1. **Update LM Studio Provider**
   - Modify the error handling in the `listModels` method
   - Add more detailed error information in logs
   - Ensure the fallback model is properly returned

2. **Test the Changes**
   - Test with LM Studio running and not running
   - Verify error messages are helpful and not overwhelming
   - Ensure the extension continues to function even if LM Studio is unavailable

## Provider and Model Dropdown Fix

### Dropdown Issue Analysis

The provider and model dropdowns in the chat view are not being populated correctly. The issue is that the message type in the webview doesn't match what the extension is expecting. The extension is sending messages with `type` property, but the webview is expecting `command` property.

### Dropdown Fix Implementation

1. **Updated Message Handling in ChatView**
   - Updated `_sendInitialData` method in `chatView.ts` to use `command` instead of `type` in the message
   - Updated `_handleGetProviders` and `_handleGetModels` methods to use `command` instead of `type`

2. **Updated Message Handling in WebView**
   - Updated the message handler in `chat.js` to support both `command` and `type` properties for backward compatibility
   - Added better logging to track message flow between extension and webview

### Expected Outcome

After these changes, the provider and model dropdowns should be populated correctly, and users should be able to select providers and models without errors. The fix ensures compatibility with both old and new message formats, making the system more robust.

## Memory System Implementation

### Memory System Overview

This implementation adds a comprehensive memory system to Codessa using Codessa, LangGraph, and related technologies. The memory system provides vector memory, file chunking, short-term and long-term memory, database connectivity, and full integration with the UI and agent workflows.

### Memory Components Implemented

1. **Core Memory Architecture**
   - Created memory types and interfaces in `src/memory/types.ts`
   - Implemented Codessa memory provider in `src/memory/codessa/codessaMemory.ts`
   - Added LangGraph memory workflows in `src/memory/codessa/langGraphMemory.ts`
   - Implemented file chunking service in `src/memory/codessa/fileChunking.ts`

2. **Vector Store Implementations**
   - Created factory pattern for vector stores in `src/memory/codessa/vectorStores/vectorStoreFactory.ts`
   - Implemented in-memory vector store in `src/memory/codessa/vectorStores/memoryVectorStore.ts`
   - Implemented Chroma vector store in `src/memory/codessa/vectorStores/chromaVectorStore.ts`
   - Implemented Pinecone vector store in `src/memory/codessa/vectorStores/pineconeVectorStore.ts`

3. **Database Implementations**
   - Created factory pattern for databases in `src/memory/codessa/databases/databaseFactory.ts`
   - Implemented SQLite database in `src/memory/codessa/databases/sqliteDatabase.ts`
   - Implemented MongoDB database in `src/memory/codessa/databases/mongodbDatabase.ts`
   - Implemented PostgreSQL database in `src/memory/codessa/databases/postgresDatabase.ts`
   - Implemented Redis database in `src/memory/codessa/databases/redisDatabase.ts`

4. **Memory Manager**
   - Created unified memory manager in `src/memory/memoryManager.ts`
   - Added support for both basic and Codessa memory systems
   - Implemented methods for adding, retrieving, and searching memories
   - Added file chunking and workspace chunking capabilities

5. **UI Components**
   - Implemented memory view in `src/ui/memoryView.ts`
   - Created memory view JavaScript in `media/memoryView.js`
   - Added memory view CSS in `media/memoryView.css`
   - Added memory commands to `src/extension.ts`

### Memory System Features

1. **Vector Memory**
   - Semantic search capabilities
   - Multiple vector store options (in-memory, Chroma, Pinecone)
   - Configurable relevance thresholds

2. **File Chunking**
   - Support for chunking individual files and entire workspaces
   - Language-specific chunking strategies
   - Configurable chunk size and overlap

3. **Database Storage**
   - Multiple database options (SQLite, PostgreSQL, MongoDB, Redis)
   - Structured memory storage
   - Efficient querying capabilities

4. **Memory Workflows**
   - LangGraph-based memory workflows
   - Conversation summarization
   - Context management
   - Memory retrieval augmentation

5. **UI Integration**
   - Memory view for browsing and managing memories
   - Memory search capabilities
   - Memory settings configuration
   - Memory commands in VS Code command palette

### Memory System Benefits

1. **Enhanced Context**: Provides AI assistants with better context from past interactions
2. **Project Understanding**: Stores and retrieves project-specific knowledge
3. **Personalization**: Remembers user preferences and coding style
4. **Efficiency**: Reduces repetition by remembering previous explanations
5. **Flexibility**: Multiple storage options for different use cases

### Future Memory Enhancements

1. Add support for more vector stores (Weaviate, HNSWLIB)
2. Implement memory visualization tools
3. Add memory analytics and insights
4. Implement memory pruning and optimization strategies
5. Add support for hierarchical memory structures

## TypeScript Strict Mode Fixes

### Plan to Fix TypeScript Errors

#### 1. Fix Tool Interface Issues

- Update the Tool interface in workflow templates
- Add missing properties to Tool objects
- Fix the type definitions for Tool objects

#### 2. Fix Message Object Type Errors in LLM Providers

- Fix type errors in codeLlamaProvider.ts
- Fix type errors in nousHermesProvider.ts
- Fix type errors in perplexityProvider.ts
- Fix type errors in phiProvider.ts
- Fix type errors in togetheraiProvider.ts

#### 3. Fix Extension.ts Error

- Fix the specialist agent type error in extension.ts

#### 4. Fix Memory and Vector Store Issues

- Fix the type error in vectorMemory.ts

#### 5. Fix Database Implementation Issues (if time permits)

- Fix MongoDB database implementation
- Fix Redis database implementation
- Fix SQLite database implementation

#### 6. Fix Codessa Integration Issues (if time permits)

- Fix embeddings interface in codessaMemory.ts
- Fix StateGraph issues in langGraphMemory.ts
