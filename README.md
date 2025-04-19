# Codessa - AI Coding Assistant

Codessa is a versatile VS Code extension that brings the power of various AI models directly into your development workflow. It supports multiple LLM providers including OpenAI, Ollama (local models), Google AI (Gemini), and Mistral AI.

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

- **File Tools**: Read, write, and patch files
- **Documentation Tools**: Search for answers about programming concepts

## Customization

Create custom system prompts for your agents:
- **Settings** > **Codessa** > **System Prompts**

## Troubleshooting

See the [SETUP.md](SETUP.md) file for detailed troubleshooting instructions.

## Development

### Building and Running

```bash
npm install
npm run compile
```

Press F5 in VS Code to launch with debugging.

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

Okay, creating a *complete*, *production-grade* VS Code extension with all the requested features is an incredibly complex task, far exceeding the scope of a single response. It involves deep integration with VS Code APIs, numerous external APIs (LLMs), complex state management, robust error handling, UI design, and significant testing. A real-world project like this would take a team weeks or months.

However, I can provide a substantial, well-structured foundation covering the core architecture, key components, and implementations for several features. This will give you a strong starting point and demonstrate how the pieces fit together. It will include:

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

Let's structure the project:

```
agentic-coding-assistant/
├── src/
│   ├── extension.ts              # Extension entry point
│   ├── config.ts                 # Configuration management
│   ├── logger.ts                 # Simple logger
│   ├── utils.ts                  # Utility functions
│   ├── llm/
│   │   ├── llmProvider.ts        # LLM Provider Interface
│   │   ├── llmService.ts         # Service to get/manage providers
│   │   └── providers/
│   │       ├── openaiProvider.ts   # OpenAI implementation
│   │       ├── ollamaProvider.ts   # Ollama implementation
│   │       ├── googleAIProvider.ts # Google AI (Gemini) implementation (basic)
│   │       └── mistralAIProvider.ts # Mistral AI implementation (basic)
│   │       └── ... (other providers would go here)
│   ├── agents/
│   │   ├── agent.ts              # Base Agent class
│   │   ├── agentManager.ts       # Manages agent configurations
│   │   ├── supervisorAgent.ts    # Agent to coordinate others
│   │   └── tools/
│   │       ├── tool.ts             # Base Tool interface
│   │       ├── fileSystemTool.ts   # File I/O, diff, patch tool
│   │       └── documentationTool.ts # Placeholder for doc search
│   ├── prompts/
│   │   ├── promptManager.ts      # Manages system prompts and variables
│   │   └── defaultPrompts.ts     # Default prompt templates
│   ├── diff/
│   │   └── diffEngine.ts         # Diffing and patching logic
│   └── ui/
│       └── agentTreeView.ts      # Sidebar Tree View for agents
├── .vscodeignore
├── package.json
├── tsconfig.json
└── README.md
```

---

**`package.json`**

```json
{
  "name": "agentic-coding-assistant",
  "displayName": "Agentic Coding Assistant",
  "description": "An advanced coding assistant with agentic capabilities and multi-provider support.",
  "version": "0.1.0",
  "publisher": "your-publisher-name", // Replace with your publisher name
  "engines": {
    "vscode": "^1.85.0" // Use a recent VS Code version
  },
  "categories": [
    "Programming Languages",
    "Other"
  ],
  "activationEvents": [
    "onView:agenticAssistantView" // Activate when the view is opened
    // "onCommand:agentic.runTask" // Or activate on specific commands
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "agentic.runTask",
        "title": "Agentic: Run Task"
      },
      {
        "command": "agentic.inlineGenerate",
        "title": "Agentic: Generate Inline Code"
      },
      {
        "command": "agentic.configureProviders",
        "title": "Agentic: Configure AI Providers"
      },
      {
        "command": "agentic.manageAgents",
        "title": "Agentic: Manage Agents"
      },
      {
        "command": "agentic.refreshAgentView",
        "title": "Refresh",
        "icon": "$(refresh)"
      }
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "agentic-assistant-view-container",
          "title": "Agentic Assistant",
          "icon": "$(hubot)" // Choose an appropriate icon
        }
      ]
    },
    "views": {
      "agentic-assistant-view-container": [
        {
          "id": "agenticAssistantView",
          "name": "Agents",
          "type": "tree",
          "contextualTitle": "Agentic Assistant"
        }
      ]
    },
    "menus": {
      "view/title": [
        {
          "command": "agentic.refreshAgentView",
          "when": "view == agenticAssistantView",
          "group": "navigation"
        }
      ],
      "editor/context": [
         {
            "command": "agentic.inlineGenerate",
            "group": "9_agentic@1",
            "when": "editorHasSelection"
         }
      ]
    },
    "configuration": {
      "title": "Agentic Coding Assistant",
      "properties": {
        "agentic.logLevel": {
          "type": "string",
          "enum": ["debug", "info", "warn", "error"],
          "default": "info",
          "description": "Logging level for the Agentic Assistant extension."
        },
        "agentic.providers.openai.apiKey": {
          "type": "string",
          "description": "API Key for OpenAI.",
          "default": ""
        },
        "agentic.providers.openai.baseUrl": {
          "type": "string",
          "description": "Optional Base URL for OpenAI compatible APIs (e.g., Azure OpenAI, local proxies).",
          "default": ""
        },
        "agentic.providers.googleai.apiKey": {
          "type": "string",
          "description": "API Key for Google AI (Gemini).",
          "default": ""
        },
         "agentic.providers.mistralai.apiKey": {
          "type": "string",
          "description": "API Key for Mistral AI.",
          "default": ""
        },
        "agentic.providers.ollama.baseUrl": {
          "type": "string",
          "description": "Base URL for your Ollama instance.",
          "default": "http://localhost:11434"
        },
        // Add similar entries for Anthropic, HuggingFace, OpenRouter, LM Studio etc.
        "agentic.defaultModel": {
           "type": "object",
           "properties": {
              "provider": {"type": "string", "description": "Default provider ID (e.g., 'openai', 'ollama')"},
              "modelId": {"type": "string", "description": "Default model ID for the provider"}
           },
           "default": {"provider": "ollama", "modelId": "llama3"},
           "description": "Default AI provider and model to use if not specified by an agent."
        },
        "agentic.systemPrompts": {
          "type": "object",
          "additionalProperties": {
            "type": "string"
          },
          "default": {},
          "description": "Custom system prompts. Key is the prompt name, value is the prompt text. Use {variable} for placeholders."
        },
        "agentic.agents": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string"},
              "name": {"type": "string"},
              "description": {"type": "string"},
              "systemPromptName": {"type": "string"},
              "llm": {
                 "type": "object",
                 "properties": {
                    "provider": {"type": "string"},
                    "modelId": {"type": "string"}
                 }
              },
              "tools": {
                 "type": "array",
                 "items": {"type": "string"} // Tool IDs
              },
              "isSupervisor": {"type": "boolean", "default": false},
              "chainedAgentIds": { // For supervisor agents
                 "type": "array",
                 "items": {"type": "string"}
              }
            },
            "required": ["id", "name", "systemPromptName"]
          },
          "default": [],
          "description": "Configurations for individual agents."
        },
        "agentic.promptVariables": {
           "type": "object",
           "additionalProperties": { "type": "string" },
           "default": {},
           "description": "Global variables/placeholders available in all system prompts."
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "lint": "eslint src --ext ts"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "18.x",
    "@types/diff": "^5.0.9",
    "@typescript-eslint/eslint-plugin": "^6.19.1",
    "@typescript-eslint/parser": "^6.19.1",
    "eslint": "^8.56.0",
    "typescript": "^5.3.3"
  },
  "dependencies": {
    "diff": "^5.1.0",
    "openai": "^4.28.0", // Example: Use official SDKs where possible
    "@google/generative-ai": "^0.2.1",
    "@mistralai/mistralai": "^0.1.3",
    "axios": "^1.6.7" // For Ollama or other HTTP APIs
    // Add other SDKs as needed: @anthropic-ai/sdk, etc.
  }
}
```

---

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2020", // Target modern Node.js versions available in VS Code
    "outDir": "out",
    "lib": [
      "ES2020"
    ],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true, // Enable strict type-checking
    "esModuleInterop": true, // Allows commonjs modules to be imported as ES modules
    "skipLibCheck": true, // Skip type checking of declaration files
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true // Allow importing JSON files
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    ".vscode-test"
  ]
}
```

---

**`.vscodeignore`**
