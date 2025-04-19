# Codessa - The goddess of code

Codessa is a versatile VS Code extension that brings the power of various AI models and agentic coding superpowers directly into your development workflow. It supports multiple LLM providers including OpenAI, Ollama (local models), Google AI (Gemini), and Mistral AI. 

## Features

- **Multi-Provider Support**: Use OpenAI, Ollama (local models), or other providers
- **Powerful Tools**: File operations, documentation search, and more
- **Code Generation**: Generate code based on natural language prompts
- **Code Editing**: Modify existing code with AI assistance
- **Custom Agents**: Create specialized agents for different tasks

## Installation

Install from the VS Code Marketplace or download from GitHub and follow these steps:

1. Clone this repository
2. Install dependencies: `npm install`
3. Compile: `npm run compile`
4. Press F5 in VS Code to launch in debug mode

## Configuration

Codessa requires configuration to connect to LLM providers:

### OpenAI

Set your API key in the extension settings:
- **Settings** > **Codessa** > **Providers** > **OpenAI** > **API Key**

### Ollama (Local Models)

1. Install Ollama from [ollama.com](https://ollama.com/)
2. Run `ollama serve` to start the server
3. The default URL is `http://localhost:11434`

## Usage

Codessa provides several commands accessible from the Command Palette (Ctrl+Shift+P):

- `Codessa: Run General Task with Agent...` - Run a task with AI
- `Codessa: Edit Code with Agent...` - Edit selected code with AI
- `Codessa: Generate Code with Agent...` - Generate new code using AI
- `Codessa: Configure Settings...` - Access extension settings

## Tools

Codessa provides agents with access to tools:

## Development

### Building and Running

```bash
npm install
npm run compile
```

Press F5 in VS Code to launch with debugging.

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License | pending

1.  **Project Structure:** A standard VS Code extension layout.
2.  **Core Extension Logic (`extension.ts`):** Activation, command registration.
3.  **Configuration Management (`config.ts`):** Handling settings (API keys, models, prompts).
4.  **LLM Abstraction Layer:** Interface and implementations for a few key providers (OpenAI, Ollama).
5.  **Agent Framework:** `Agent` class, `AgentManager`, basic `SupervisorAgent` concept.
6.  **Tool System:** Basic file system tools (read, write, diff, patch).
7.  **Diffing Engine:** Using the `diff` library.
8.  **Prompt Management:** Handling system prompts and variables.
9.  **UI:** Basic Tree View for agents.
10. **`package.json`:** Extension manifest, commands, configuration points.

**Important Considerations & Limitations:**

*   **Completeness:** This code provides the *structure* and *core logic*. Implementing *every* single provider, advanced agentic features (like complex memory or reflection), sophisticated error recovery across all scenarios, and exhaustive testing requires significant further development.
*   **Production Grade:** This code aims for good practices, but true production readiness requires rigorous testing, security hardening (especially around API keys and code execution if added), performance optimization, and more comprehensive error handling.
*   **API Keys:** Secure handling of API keys is crucial. This example uses VS Code configuration, but consider using system keychain storage (`keytar` library) for better security in a real product.
*   **Error Handling:** Basic error handling is included, but production code needs more granular error types, user feedback mechanisms, and potentially retry logic.
*   **Large File Accuracy:** The diff/patch logic using `diff` library is standard, but applying patches to *very* large files accurately under all conditions (concurrent edits, unusual line endings) needs meticulous testing and potentially more sophisticated patching algorithms or chunking strategies. Simultaneous diff application is complex and prone to conflicts; sequential application is safer and implemented here.
*   **Documentation Research:** This is complex. A simple implementation might involve prompting the LLM to search its knowledge or using a basic web search API (not included here due to external dependencies/API keys).
*   **Methodologies (XP):** Support is structural. Defining agents and prompts that follow XP (e.g., a TDD agent writing tests, then a coding agent implementing) is up to user configuration.
*   **Dependencies:** You'll need to install necessary npm packages (`npm install vscode @types/vscode @types/node diff openai @google/generative-ai @mistralai/mistralai axios`). Note that installing *all* potential provider SDKs adds bloat; a real extension might dynamically import or offer optional installs.
