# TypeScript

- Enable 'forceConsistentCasingInFileNames' in TypeScript configuration to reduce cross-OS issues.

# CSS

- Avoid using inline CSS styles in HTML files and move styles to external CSS files.
- The chat view CSS has been moved to the media folder, requiring path updates when working with chat view styles.
- Add the logo as a feint, water-animated background above the prompt area in the chat view, placing it in a specific marked location.
- The background logo in the chat view should be more visible and use the correct Codessa logo image.
- For underwater animations in the chat view, ensure images cannot be highlighted and implement proper mathematical models for realistic wave folding and ripple effects.
- Position the TTS button right-aligned in the same row as the add file and add context buttons in the chat view.
- Refactor chat dialogue bubbles to be more space-efficient by removing chatheads that waste space on the sides of the conversation.
- Add chat-head components with clickable circles and lines sandwiching usernames to the conversation UI, with different versions for user and AI responses.
- Equal padding on both left and right sides of chat bubbles, with minimal but non-zero padding to maximize space while preventing elements from touching the edges of the container.
- Minimize padding in chat interfaces to bring content closer to the edges and maximize usable space.
- Don't modify the UI design of the chatView when fixing functionality issues.

# VS Code

- VS Code automatically generates activation events from package.json contribution declarations, so they don't need to be explicitly specified.
- Integrate multiple LLM providers (including Ollama as default) with proper API key management using VS Code native encryption, and fetch models dynamically from providers rather than hardcoding them.
- Integrate multiple code-focused LLM providers including StarCoder, Code Llama, DeepSeek-Coder, Replit Code LLM, Mistral, WizardCoder, XwinCoder, Phi models, Yi-Code, SantaCoder, CodeUp/CodeFuse/StableCode, and CodeGemma, with proper documentation-based implementation.
- Integrate code-specific LLM providers dynamically without hardcoding models, and add support for GGUF models with options for users to link, import to a central location, or download models.
- Implement all requested providers completely, with no omissions.
- Implement all requested providers immediately rather than marking some for future implementation.
- Improve settings UI with auto-populated dropdown lists for models based on selected providers rather than requiring manual text entry.
- In settings UI, avoid duplication of 'Default Model' selectors and keep only the dropdown version.
- Ensure settings are well-organized with specific sections for each component (agents, providers, models, memory, UI) to maintain proper configuration and flow between components.
- The extension should not fail or crash when a provider is not set up, but instead handle the error gracefully.
- Avoid creating unnecessary files, dummy files, and test files as they can cause the extension to fail.
- Avoid hardcoding providers and models in the chat.js file.
- The extension has an issue where settings can't be saved for any provider, showing an error when attempted.
- When packaging VS Code extensions, use either .vscodeignore file or 'files' property in package.json, but not both simultaneously as VSCE doesn't support combining these strategies.
- Reduce complexity and number of files surrounding provider implementation in the codebase.
- Ensure sensitive information like API keys is handled properly and securely when implementing providers.
- Combine workflow files to eliminate sample/example workflows and delete unused files (including providers and model-related files) that are no longer needed due to refactoring.
- All customizable features must be available in settings and UI, and all settings including provider settings must be properly saved, persisted and reloaded when the extension runs.

# Icons

- Keep all icons in one folder and use the existing icon.png as the main icon for the extension.

# General

- Focus on fixing core algorithm issues in the code rather than superficial UI elements like icons.
- Focus on fixing core functionality issues rather than adding more debugging and error handling.
- Avoid using workarounds, patches, or diversions when implementing solutions.
- Avoid simplifying, cutting corners, or avoiding issues that need to be fixed.
- Implement different operation modes (Ask, Chat, Debug, Edit, Agent, Multi-Agent) with customizable prompts and workflows, allowing users to select modes from the chat interface.
- User prefers complete implementation of features rather than mentioning future plans without implementing them.
- Never delete code to fix errors; all components are considered essential unless explicitly stated by the user.
- Don't rename methods when fixing code issues.
- Use all variables and names for their intended purposes rather than ignoring or repurposing them.

# Memory

- Memory implementation should primarily use langgraph, langmem, and langchain, with comprehensive functionality including vector memory, file chunking, short/long-term memory, database connectivity, and be fully configurable in settings with UI integration.
- Include MySQL as one of the supported database options for the memory system.
- Include PostgreSQL database support in the memory system implementation.
- Include MySQL and PostgreSQL database support in the memory system implementation.

# Workflows

- Workflows are a backbone of AI agents and will be expanded to control the different extension modes of operation.
- Workflows are to be implemented using official langgraph, langchain, and langmem libraries with proper documentation and installation instructions from official sources.
- Add more workflow templates for specific use cases in the Codessa extension.
- Don't delete code or files to fix linting errors, use official libraries for langgraph/langchain/langmem, and ensure all imports in workflowpanel.ts are properly used in implementation.

# Imports

- When fixing import errors, scan the project first to find the correct location of the module before attempting to fix the import statement.
