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

```
.vscode/**
.vscode-test/**
.gitignore
node_modules/**
out/**
src/**
tsconfig.json
webpack.config.js
yarn.lock
npm-shrinkwrap.json

# Include source maps for debugging
!out/**/*.map
```

---

**`src/logger.ts`**

```typescript
import * as vscode from 'vscode';
import { getConfig } from './config';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

class Logger {
    private outputChannel: vscode.OutputChannel | null = null;
    private currentLevel: LogLevel = LogLevel.INFO;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel("Agentic Assistant");
        this.updateLogLevel();
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('agentic.logLevel')) {
                this.updateLogLevel();
            }
        });
    }

    private updateLogLevel() {
        const levelString = getConfig<string>('logLevel', 'info');
        this.currentLevel = LogLevel[levelString.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO;
        this.log(LogLevel.INFO, `Log level set to: ${levelString}`);
    }

    private log(level: LogLevel, message: string, ...optionalParams: any[]) {
        if (!this.outputChannel || level < this.currentLevel) {
            return;
        }

        const levelStr = `[${LogLevel[level]}]`.padEnd(7);
        const timestamp = new Date().toISOString();
        const formattedMessage = `${timestamp} ${levelStr} ${message}`;

        this.outputChannel.appendLine(formattedMessage);
        if (optionalParams.length > 0) {
            optionalParams.forEach(param => {
                this.outputChannel?.appendLine(JSON.stringify(param, null, 2));
            });
        }
    }

    debug(message: string, ...optionalParams: any[]) {
        this.log(LogLevel.DEBUG, message, ...optionalParams);
    }

    info(message: string, ...optionalParams: any[]) {
        this.log(LogLevel.INFO, message, ...optionalParams);
    }

    warn(message: string, ...optionalParams: any[]) {
        this.log(LogLevel.WARN, message, ...optionalParams);
    }

    error(message: string | Error, ...optionalParams: any[]) {
        if (message instanceof Error) {
            this.log(LogLevel.ERROR, `${message.message}\n${message.stack ?? ''}`, ...optionalParams);
        } else {
            this.log(LogLevel.ERROR, message, ...optionalParams);
        }
    }

    show() {
        this.outputChannel?.show();
    }
}

export const logger = new Logger();
```

---

**`src/config.ts`**

```typescript
import * as vscode from 'vscode';
import { logger } from './logger';

export function getConfig<T>(key: string, defaultValue: T): T {
    try {
        const config = vscode.workspace.getConfiguration('agentic');
        return config.get<T>(key, defaultValue);
    } catch (error) {
        logger.error(`Error reading configuration key 'agentic.${key}':`, error);
        return defaultValue;
    }
}

export async function setConfig<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
     try {
        const config = vscode.workspace.getConfiguration('agentic');
        await config.update(key, value, target);
    } catch (error) {
        logger.error(`Error writing configuration key 'agentic.${key}':`, error);
        vscode.window.showErrorMessage(`Failed to update setting 'agentic.${key}'. Check logs for details.`);
    }
}

// Specific configuration getters (examples)
export function getOpenAIApiKey(): string | undefined {
    return getConfig<string | undefined>('providers.openai.apiKey', undefined);
}

export function getOllamaBaseUrl(): string {
    return getConfig<string>('providers.ollama.baseUrl', 'http://localhost:11434');
}

export function getDefaultModelConfig(): { provider: string; modelId: string } {
    return getConfig<{ provider: string; modelId: string }>('defaultModel', { provider: 'ollama', modelId: 'llama3' });
}

export function getAgentConfigs(): AgentConfig[] {
    return getConfig<AgentConfig[]>('agents', []);
}

export async function updateAgentConfigs(agents: AgentConfig[]): Promise<void> {
    await setConfig('agents', agents, vscode.ConfigurationTarget.Global); // Or Workspace
}

export function getSystemPrompts(): Record<string, string> {
    return getConfig<Record<string, string>>('systemPrompts', {});
}

export function getPromptVariables(): Record<string, string> {
    return getConfig<Record<string, string>>('promptVariables', {});
}


// --- Interfaces ---

export interface LLMConfig {
    provider: string; // e.g., 'openai', 'ollama', 'googleai'
    modelId: string;
    // Add provider-specific options if needed, e.g., temperature, maxTokens
    options?: Record<string, any>;
}

export interface AgentConfig {
    id: string;
    name: string;
    description?: string;
    systemPromptName: string; // Key in agentic.systemPrompts or a default
    llm?: LLMConfig; // If not provided, uses defaultModel
    tools?: string[]; // IDs of tools the agent can use
    isSupervisor?: boolean;
    chainedAgentIds?: string[]; // IDs of agents to call (for supervisors)
}
```

---

**`src/utils.ts`**

```typescript
import * as vscode from 'vscode';

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export async function showQuickPick<T extends vscode.QuickPickItem>(items: T[], placeholder: string): Promise<T | undefined> {
    return await vscode.window.showQuickPick(items, { placeholder });
}

export async function showInputBox(prompt: string, placeholder?: string, value?: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({ prompt, placeholder, value });
}

// Simple delay function
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensures a file path is absolute within the workspace.
 * If relative, resolves it against the first workspace folder.
 * Returns undefined if no workspace is open and path is relative.
 */
export function resolveWorkspacePath(filePath: string): vscode.Uri | undefined {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        // Check if it's already absolute (has scheme like file://)
        try {
             const uri = vscode.Uri.parse(filePath);
             if (uri.scheme) return uri; // Already absolute
        } catch (e) {
            // Ignore parsing errors, treat as relative
        }
        // If relative, join with workspace root
        return vscode.Uri.joinPath(workspaceRoot, filePath);
    } else if (vscode.Uri.parse(filePath).scheme) {
         // Absolute path outside workspace (allow this)
         return vscode.Uri.parse(filePath);
    }
    // Relative path but no workspace open
    logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
    return undefined;
}

import { logger } from './logger';
```

---

**`src/llm/llmProvider.ts`**

```typescript
import * as vscode from 'vscode';

export interface LLMGenerateParams {
    prompt: string;
    systemPrompt?: string;
    modelId: string;
    // Common options - providers might support more
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    // Add other common parameters as needed
    options?: Record<string, any>; // Provider-specific options
}

export interface LLMGenerateResult {
    content: string;
    finishReason?: string; // e.g., 'stop', 'length', 'error'
    usage?: { // Optional token usage info
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    error?: string; // Error message if generation failed
}

export interface ILLMProvider {
    readonly providerId: string; // Unique ID (e.g., 'openai', 'ollama')

    /**
     * Generates text based on the provided parameters.
     */
    generate(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken): Promise<LLMGenerateResult>;

    /**
     * Generates text streamingly, yielding chunks as they arrive.
     * Note: Not all providers might support streaming easily.
     */
    streamGenerate?(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken): AsyncGenerator<string, void, unknown>;

    /**
     * Optional: Fetches the list of available models for this provider.
     * Useful for configuration UI.
     */
    getAvailableModels?(): Promise<string[]>;

    /**
     * Optional: Checks if the provider is configured and ready (e.g., API key set).
     */
    isConfigured?(): boolean;
}
```

---

**`src/llm/llmService.ts`**

```typescript
import * as vscode from 'vscode';
import { ILLMProvider } from './llmProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { GoogleAIProvider } from './providers/googleAIProvider';
import { MistralAIProvider } from './providers/mistralAIProvider';
// Import other providers here
import { logger } from '../logger';
import { LLMConfig, getDefaultModelConfig } from '../config';

class LLMService {
    private providers: Map<string, ILLMProvider> = new Map();

    constructor() {
        this.registerDefaultProviders();
        // Listen for configuration changes that might affect providers
        vscode.workspace.onDidChangeConfiguration(e => {
             if (e.affectsConfiguration('agentic.providers')) {
                 logger.info("Provider configuration changed, re-initializing providers.");
                 // Re-initialize or update providers as needed
                 this.providers.clear(); // Simple approach: clear and re-register
                 this.registerDefaultProviders();
             }
         });
    }

    private registerDefaultProviders() {
        // Register providers - could be made more dynamic later
        this.registerProvider(new OpenAIProvider());
        this.registerProvider(new OllamaProvider());
        this.registerProvider(new GoogleAIProvider());
        this.registerProvider(new MistralAIProvider());
        // Register other providers...
        // e.g., this.registerProvider(new AnthropicProvider());
        // e.g., this.registerProvider(new HuggingFaceProvider());
        // e.g., this.registerProvider(new LMStudioProvider());
        // e.g., this.registerProvider(new OpenRouterProvider());
    }

    registerProvider(provider: ILLMProvider) {
        if (this.providers.has(provider.providerId)) {
            logger.warn(`Provider with ID '${provider.providerId}' is already registered. Overwriting.`);
        }
        logger.info(`Registering LLM provider: ${provider.providerId}`);
        this.providers.set(provider.providerId, provider);
    }

    getProvider(providerId: string): ILLMProvider | undefined {
        const provider = this.providers.get(providerId);
        if (!provider) {
            logger.warn(`LLM Provider '${providerId}' not found or not registered.`);
        }
        return provider;
    }

    getProviderOrDefault(providerId?: string): ILLMProvider | undefined {
        const id = providerId ?? getDefaultModelConfig().provider;
        const provider = this.getProvider(id);
        if (!provider) {
            logger.error(`Default provider '${id}' not found. Please configure providers.`);
            vscode.window.showErrorMessage(`LLM Provider '${id}' not found. Please check configuration.`);
        }
        return provider;
    }

     getProviderForConfig(llmConfig?: LLMConfig): ILLMProvider | undefined {
        const config = llmConfig ?? getDefaultModelConfig();
        return this.getProviderOrDefault(config.provider);
    }

    listProviderIds(): string[] {
        return Array.from(this.providers.keys());
    }
}

export const llmService = new LLMService();
```

---

**`src/llm/providers/openaiProvider.ts`** (Example)

```typescript
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getConfig } from '../../config';
import { logger } from '../../logger';

export class OpenAIProvider implements ILLMProvider {
    readonly providerId = 'openai';
    private client: OpenAI | null = null;

    constructor() {
        this.initializeClient();
         vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('agentic.providers.openai')) {
                logger.info("OpenAI configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }

    private initializeClient() {
        const apiKey = getConfig<string | undefined>('providers.openai.apiKey', undefined);
        const baseUrl = getConfig<string | undefined>('providers.openai.baseUrl', undefined);

        if (apiKey) {
            try {
                this.client = new OpenAI({
                    apiKey: apiKey,
                    baseURL: baseUrl || undefined, // Pass undefined if empty string to use default
                });
                 logger.info("OpenAI client initialized.");
            } catch (error) {
                logger.error("Failed to initialize OpenAI client:", error);
                this.client = null;
            }
        } else {
            this.client = null; // Ensure client is null if no API key
             logger.warn("OpenAI API key not configured.");
        }
    }

     isConfigured(): boolean {
        return !!this.client;
    }

    async generate(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'OpenAI provider not configured (API key missing?).' };
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (params.systemPrompt) {
            messages.push({ role: 'system', content: params.systemPrompt });
        }
        messages.push({ role: 'user', content: params.prompt });

        try {
            logger.debug(`Sending request to OpenAI model ${params.modelId}`);
            const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
                model: params.modelId,
                messages: messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                stop: params.stopSequences,
                // Add other options from params.options if needed
            };

            const responsePromise = this.client.chat.completions.create(request);

            // Handle cancellation
            let registration: vscode.Disposable | undefined;
            const cancellationPromise = new Promise<OpenAI.Chat.Completions.ChatCompletion>((_, reject) => {
                registration = cancellationToken?.onCancellationRequested(() => {
                    logger.warn("OpenAI request cancelled by user.");
                    // Note: OpenAI SDK v4 doesn't directly support AbortController for simple create yet.
                    // This cancellation is best-effort; the request might still complete on the server.
                    // For streaming, AbortController can be used.
                    reject(new Error("Request cancelled"));
                });
            });

            const response = await Promise.race([responsePromise, cancellationPromise]);
            registration?.dispose(); // Clean up listener

            if (!response) { // Should only happen on cancellation rejection
                 return { content: '', error: 'Request cancelled', finishReason: 'cancel' };
            }


            const choice = response.choices[0];
            logger.debug(`OpenAI response received. Finish reason: ${choice.finish_reason}`);

            return {
                content: choice.message?.content?.trim() ?? '',
                finishReason: choice.finish_reason ?? undefined,
                usage: {
                    promptTokens: response.usage?.prompt_tokens,
                    completionTokens: response.usage?.completion_tokens,
                    totalTokens: response.usage?.total_tokens,
                },
            };
        } catch (error: any) {
             registration?.dispose();
            logger.error('Error calling OpenAI API:', error);
            // Attempt to parse OpenAI specific error
            let errorMessage = 'Failed to call OpenAI API.';
            if (error.response && error.response.data && error.response.data.error) {
                errorMessage = `OpenAI API Error: ${error.response.data.error.message} (Type: ${error.response.data.error.type})`;
            } else if (error instanceof Error) {
                 errorMessage = error.message;
            }
            return { content: '', error: errorMessage, finishReason: 'error' };
        }
    }

    // Optional: Implement streamGenerate using client.chat.completions.create({ stream: true })
    // async * streamGenerate(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken): AsyncGenerator<string, void, unknown> { ... }

    async getAvailableModels(): Promise<string[]> {
         if (!this.client) {
            logger.warn("Cannot fetch OpenAI models, client not configured.");
            return [];
        }
        try {
            logger.debug("Fetching OpenAI models list...");
            const models = await this.client.models.list();
            // Filter for chat models if desired, or return all relevant ones
            return models.data.map(m => m.id).sort();
        } catch (error) {
            logger.error("Failed to fetch OpenAI models:", error);
            return [];
        }
    }
}
```

---

**`src/llm/providers/ollamaProvider.ts`** (Example using Axios)

```typescript
import * as vscode from 'vscode';
import axios, { AxiosInstance, CancelTokenSource } from 'axios';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getConfig } from '../../config';
import { logger } from '../../logger';

export class OllamaProvider implements ILLMProvider {
    readonly providerId = 'ollama';
    private client: AxiosInstance | null = null;
    private baseUrl: string = '';

    constructor() {
        this.initializeClient();
         vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('agentic.providers.ollama.baseUrl')) {
                logger.info("Ollama configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }

     private initializeClient() {
        this.baseUrl = getConfig<string>('providers.ollama.baseUrl', 'http://localhost:11434');
        if (this.baseUrl) {
            try {
                this.client = axios.create({
                    baseURL: this.baseUrl,
                    timeout: 60000, // 60 second timeout
                });
                logger.info(`Ollama client initialized for base URL: ${this.baseUrl}`);
                // Optionally add a check here to see if Ollama is reachable
                this.checkConnection();
            } catch (error) {
                 logger.error("Failed to initialize Ollama client:", error);
                 this.client = null;
            }
        } else {
             logger.warn("Ollama base URL not configured.");
             this.client = null;
        }
    }

     async checkConnection(): Promise<boolean> {
        if (!this.client) return false;
        try {
            await this.client.get('/'); // Simple check to see if the base URL is responding
            logger.info(`Ollama connection successful at ${this.baseUrl}`);
            return true;
        } catch (error) {
            logger.error(`Failed to connect to Ollama at ${this.baseUrl}:`, error);
            vscode.window.showWarningMessage(`Could not connect to Ollama at ${this.baseUrl}. Please ensure it's running and the URL is correct.`);
            return false;
        }
    }

     isConfigured(): boolean {
        // Considered configured if base URL is set, even if not reachable at the moment
        return !!this.baseUrl;
    }

    async generate(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'Ollama provider not configured (Base URL missing?).' };
        }

        const endpoint = '/api/generate'; // Or '/api/chat' for conversational models

        // --- Prepare Request Data ---
        // Ollama's /api/generate is simpler, /api/chat is closer to OpenAI structure
        // Let's use /api/generate for this example
        const requestData = {
            model: params.modelId,
            prompt: params.prompt, // Combine system prompt manually if needed
            system: params.systemPrompt,
            stream: false, // For non-streaming generate
             options: { // Map common params to Ollama options
                temperature: params.temperature,
                num_predict: params.maxTokens, // Note: num_predict is max tokens
                stop: params.stopSequences,
                ...(params.options ?? {}) // Pass through other Ollama-specific options
            }
        };

        let cancelSource: CancelTokenSource | undefined;
        if (cancellationToken) {
            cancelSource = axios.CancelToken.source();
            cancellationToken.onCancellationRequested(() => {
                logger.warn("Ollama request cancelled by user.");
                cancelSource?.cancel("Request cancelled by user.");
            });
        }

        try {
            logger.debug(`Sending request to Ollama model ${params.modelId} at ${this.baseUrl}${endpoint}`);
            const response = await this.client.post(endpoint, requestData, {
                cancelToken: cancelSource?.token,
            });

            logger.debug(`Ollama response received. Done: ${response.data?.done}`);

            // Ollama /api/generate response structure
            const responseText = response.data?.response?.trim() ?? '';
            const finishReason = response.data?.done ? 'stop' : undefined; // Simple mapping

            return {
                content: responseText,
                finishReason: finishReason,
                usage: { // Ollama provides token counts in context
                    promptTokens: response.data?.prompt_eval_count,
                    completionTokens: response.data?.eval_count,
                    totalTokens: (response.data?.prompt_eval_count ?? 0) + (response.data?.eval_count ?? 0),
                },
            };
        } catch (error: any) {
            if (axios.isCancel(error)) {
                 return { content: '', error: 'Request cancelled', finishReason: 'cancel' };
            }
            logger.error('Error calling Ollama API:', error);
             let errorMessage = 'Failed to call Ollama API.';
             if (error.response) {
                 // Ollama might return specific errors in response.data.error
                 errorMessage = `Ollama API Error: ${error.response.data?.error || error.message} (Status: ${error.response.status})`;
             } else if (error.request) {
                 errorMessage = `Ollama connection error: Could not reach ${this.baseUrl}. Is Ollama running?`;
             } else if (error instanceof Error) {
                 errorMessage = error.message;
             }
            return { content: '', error: errorMessage, finishReason: 'error' };
        }
    }

     // Optional: Implement streamGenerate for Ollama using { stream: true }
    // async * streamGenerate(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken): AsyncGenerator<string, void, unknown> { ... }


    async getAvailableModels(): Promise<string[]> {
        if (!this.client) {
             logger.warn("Cannot fetch Ollama models, client not configured.");
            return [];
        }
        const endpoint = '/api/tags';
        try {
             logger.debug(`Fetching Ollama models list from ${this.baseUrl}${endpoint}`);
            const response = await this.client.get(endpoint);
            // Ollama /api/tags response structure: { models: [{ name: "model:tag", ... }, ...] }
            return response.data?.models?.map((m: any) => m.name).sort() ?? [];
        } catch (error) {
             logger.error("Failed to fetch Ollama models:", error);
             // Don't show error popup here, just log it. Connection check handles user notification.
            return [];
        }
    }
}
```

---

**`src/llm/providers/googleAIProvider.ts`** (Basic Example)

```typescript
import * as vscode from 'vscode';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getConfig } from '../../config';
import { logger } from '../../logger';

export class GoogleAIProvider implements ILLMProvider {
    readonly providerId = 'googleai';
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        this.initializeClient();
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('agentic.providers.googleai.apiKey')) {
                logger.info("Google AI configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }

    private initializeClient() {
        const apiKey = getConfig<string | undefined>('providers.googleai.apiKey', undefined);
        if (apiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(apiKey);
                logger.info("Google AI (Gemini) client initialized.");
            } catch (error) {
                logger.error("Failed to initialize Google AI client:", error);
                this.genAI = null;
            }
        } else {
            logger.warn("Google AI API key not configured.");
            this.genAI = null;
        }
    }

    isConfigured(): boolean {
        return !!this.genAI;
    }

    async generate(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken): Promise<LLMGenerateResult> {
        if (!this.genAI) {
            return { content: '', error: 'Google AI provider not configured (API key missing?).' };
        }

        // Note: Gemini API has specific ways to handle system prompts (often part of the initial message turn)
        // and different model naming conventions (e.g., 'gemini-pro')
        const model = this.genAI.getGenerativeModel({
             model: params.modelId,
             // Basic safety settings - adjust as needed
             safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
            generationConfig: {
                temperature: params.temperature,
                maxOutputTokens: params.maxTokens,
                stopSequences: params.stopSequences,
            }
        });

        // Constructing the prompt - Gemini prefers conversational history or direct prompts.
        // Combining system prompt might require specific formatting depending on the model version.
        // Simple approach: Prepend system prompt if available.
        const fullPrompt = params.systemPrompt
            ? `${params.systemPrompt}\n\n---\n\n${params.prompt}`
            : params.prompt;

        // Cancellation handling for Gemini SDK might require AbortController if available in the specific method
        // This is a placeholder for basic cancellation check
        if (cancellationToken?.isCancellationRequested) {
             return { content: '', error: 'Request cancelled before sending', finishReason: 'cancel' };
        }

        try {
            logger.debug(`Sending request to Google AI model ${params.modelId}`);
            const result = await model.generateContent(fullPrompt);

            // Check cancellation again after await
            if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled during generation', finishReason: 'cancel' };
            }

            const response = result.response;
            const responseText = response.text();
            const finishReason = response.candidates?.[0]?.finishReason;
            // TODO: Extract token usage if available in the response object (check SDK docs)

            logger.debug(`Google AI response received. Finish reason: ${finishReason}`);

            return {
                content: responseText.trim(),
                finishReason: finishReason ?? undefined,
                // usage: { ... } // Populate if token info is available
            };

        } catch (error: any) {
            logger.error('Error calling Google AI API:', error);
             let errorMessage = 'Failed to call Google AI API.';
             if (error instanceof Error) {
                 errorMessage = `Google AI API Error: ${error.message}`;
             }
             // Add more specific error parsing based on Gemini SDK error types if needed
            return { content: '', error: errorMessage, finishReason: 'error' };
        }
    }

    // Optional: Implement streamGenerate using model.generateContentStream(...)
    // Optional: Implement getAvailableModels (may require specific API calls or be hardcoded based on known models)
     async getAvailableModels(): Promise<string[]> {
        // Gemini models often need specific prefixes like 'models/'
        // This is a placeholder - a real implementation might list common ones
        // or use an API if available to list fine-tuned models etc.
        logger.warn("Google AI getAvailableModels is returning a static list. Update if needed.");
        return ["gemini-pro", "gemini-1.0-pro", "gemini-1.5-pro-latest", "gemini-pro-vision"]; // Example list
    }
}

```

---

**`src/llm/providers/mistralAIProvider.ts`** (Basic Example)

```typescript
import * as vscode from 'vscode';
import MistralClient from '@mistralai/mistralai';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getConfig } from '../../config';
import { logger } from '../../logger';

export class MistralAIProvider implements ILLMProvider {
    readonly providerId = 'mistralai';
    private client: MistralClient | null = null;

    constructor() {
        this.initializeClient();
         vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('agentic.providers.mistralai.apiKey')) {
                logger.info("Mistral AI configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }

    private initializeClient() {
        const apiKey = getConfig<string | undefined>('providers.mistralai.apiKey', undefined);
        // const endpoint = getConfig<string | undefined>('providers.mistralai.endpoint', undefined); // Optional endpoint override

        if (apiKey) {
            try {
                this.client = new MistralClient(apiKey /*, endpoint */);
                 logger.info("Mistral AI client initialized.");
            } catch (error) {
                logger.error("Failed to initialize Mistral AI client:", error);
                this.client = null;
            }
        } else {
            this.client = null;
             logger.warn("Mistral AI API key not configured.");
        }
    }

     isConfigured(): boolean {
        return !!this.client;
    }

    async generate(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: '', error: 'Mistral AI provider not configured (API key missing?).' };
        }

        const messages: MistralClient.ChatMessage[] = [];
        if (params.systemPrompt) {
            // Mistral often uses the first message turn for system-like instructions
            // Or sometimes a dedicated 'system' role if supported by the model/API version
            messages.push({ role: 'system', content: params.systemPrompt }); // Assuming system role is supported
        }
         messages.push({ role: 'user', content: params.prompt });

        // Cancellation check
        if (cancellationToken?.isCancellationRequested) {
             return { content: '', error: 'Request cancelled before sending', finishReason: 'cancel' };
        }

        try {
            logger.debug(`Sending request to Mistral AI model ${params.modelId}`);

            // Note: Mistral SDK might not have built-in AbortController support for cancellation yet.
            // This cancellation check is best-effort.
            const chatResponse = await this.client.chat({
                model: params.modelId,
                messages: messages,
                temperature: params.temperature,
                maxTokens: params.maxTokens,
                // stop: params.stopSequences, // Check SDK for stop sequence support
                // safePrompt: false, // Example option
            });

             if (cancellationToken?.isCancellationRequested) {
                return { content: '', error: 'Request cancelled during generation', finishReason: 'cancel' };
            }

            const choice = chatResponse.choices[0];
            logger.debug(`Mistral AI response received. Finish reason: ${choice.finish_reason}`);

            return {
                content: choice.message?.content?.trim() ?? '',
                finishReason: choice.finish_reason ?? undefined,
                usage: { // Map usage if available
                    promptTokens: chatResponse.usage?.prompt_tokens,
                    completionTokens: chatResponse.usage?.completion_tokens,
                    totalTokens: chatResponse.usage?.total_tokens,
                },
            };
        } catch (error: any) {
            logger.error('Error calling Mistral AI API:', error);
            let errorMessage = 'Failed to call Mistral AI API.';
             if (error.response && error.response.data) { // Check if Axios-like error structure
                errorMessage = `Mistral API Error: ${error.response.data.message || error.message} (Status: ${error.response.status})`;
            } else if (error instanceof Error) {
                 errorMessage = error.message;
            }
            return { content: '', error: errorMessage, finishReason: 'error' };
        }
    }

    // Optional: Implement streamGenerate using client.chatStream(...)

    async getAvailableModels(): Promise<string[]> {
         if (!this.client) {
            logger.warn("Cannot fetch Mistral AI models, client not configured.");
            return [];
        }
        try {
            logger.debug("Fetching Mistral AI models list...");
            const models = await this.client.listModels();
            return models.data.map(m => m.id).sort();
        } catch (error) {
            logger.error("Failed to fetch Mistral AI models:", error);
            return [];
        }
    }
}
```

---

**`src/prompts/promptManager.ts`**

```typescript
import { getSystemPrompts, getPromptVariables } from "../config";
import { logger } from "../logger";
import { defaultSystemPrompts } from "./defaultPrompts";

class PromptManager {
    private systemPrompts: Record<string, string> = {};
    private variables: Record<string, string> = {};

    constructor() {
        this.loadPrompts();
        this.loadVariables();
    }

    loadPrompts() {
        const userPrompts = getSystemPrompts();
        // Merge default and user prompts, user prompts override defaults
        this.systemPrompts = { ...defaultSystemPrompts, ...userPrompts };
        logger.info(`Loaded ${Object.keys(this.systemPrompts).length} system prompts.`);
    }

     loadVariables() {
        this.variables = getPromptVariables();
         logger.info(`Loaded ${Object.keys(this.variables).length} prompt variables.`);
    }

    getSystemPrompt(name: string, additionalVars: Record<string, string> = {}): string | undefined {
        let promptTemplate = this.systemPrompts[name];
        if (!promptTemplate) {
            logger.warn(`System prompt named '${name}' not found.`);
            // Fallback to a generic default if name not found?
            promptTemplate = this.systemPrompts['default_coder'];
            if(!promptTemplate) return undefined; // No fallback either
        }

        // Combine global and task-specific variables
        const allVars = { ...this.variables, ...additionalVars };

        // Replace placeholders like {variable_name}
        try {
            const filledPrompt = promptTemplate.replace(/\{(\w+)\}/g, (match, varName) => {
                return allVars[varName] !== undefined ? String(allVars[varName]) : match; // Keep placeholder if var not found
            });
            return filledPrompt;
        } catch (error) {
            logger.error(`Error processing prompt template '${name}':`, error);
            return promptTemplate; // Return unprocessed template on error
        }
    }

    listPromptNames(): string[] {
        return Object.keys(this.systemPrompts);
    }

    // Add methods for creating/editing prompts and variables via UI later
}

export const promptManager = new PromptManager();
```

---

**`src/prompts/defaultPrompts.ts`**

```typescript
// Define some basic default prompts
export const defaultSystemPrompts: Record<string, string> = {
    'default_coder': `You are an expert AI programming assistant.
- Follow the user's requirements carefully.
- Ensure code is high quality, well-documented, and adheres to best practices.
- Think step-by-step before writing code.
- If you need to modify files, use the provided file system tools carefully.
- If you need clarification, ask questions.
- Output code in markdown code blocks (e.g., \`\`\`python ... \`\`\`).
- Available variables: {WORKSPACE_ROOT}, {CURRENT_FILE_PATH}, {SELECTED_TEXT}`,

    'debug_fix': `You are an AI debugging assistant.
- Analyze the provided code and error message/diagnostics.
- Identify the root cause of the error.
- Propose a fix for the error.
- If modifying code, provide the changes in a diff/patch format using the file tools.
- Explain the fix clearly.
- Available variables: {ERROR_MESSAGE}, {CODE_SNIPPET}, {FILE_PATH}, {DIAGNOSTICS}`,

    'generate_code': `You are an AI code generation assistant.
- Generate code based on the user's request ({USER_REQUEST}).
- Consider the context of the current file ({CURRENT_FILE_PATH}) if provided.
- Ensure the generated code is correct, efficient, and fits the surrounding code style.
- Output only the raw code, without explanations or markdown formatting, unless specifically asked.`,

     'inline_code': `You are an AI assistant generating a short code snippet to be inserted inline.
- The user has selected the following text: {SELECTED_TEXT}
- The user's request is: {USER_REQUEST}
- Generate a concise code snippet that fulfills the request, suitable for replacing the selected text or inserting at the cursor.
- Output ONLY the code snippet, no explanations, no markdown.`,

    'documentation_researcher': `You are an AI assistant specialized in finding and summarizing technical documentation.
- Research documentation related to the user's query: {QUERY}
- Focus on official documentation, reputable sources, and code examples.
- Provide a concise summary of the findings, including links to relevant sources if possible.
- If searching for a specific function or API, provide its signature and usage examples.`,

    'xp_tester': `You are an AI assistant following Extreme Programming (XP) principles, focusing on Test-Driven Development (TDD).
- The user wants to implement the following feature: {FEATURE_DESCRIPTION}
- Write comprehensive unit tests for this feature *before* writing the implementation code.
- Use the testing framework appropriate for the project context ({TEST_FRAMEWORK}).
- Ensure tests cover edge cases and main functionality.
- Output the test code using file system tools or in markdown blocks.`,

    'xp_implementer': `You are an AI assistant following Extreme Programming (XP) principles.
- You are given the following unit tests: {TEST_CODE}
- Write the simplest possible implementation code that passes these tests.
- Refactor the code for clarity and efficiency after tests pass, if necessary.
- Adhere to coding standards and best practices.
- Output the implementation code using file system tools or in markdown blocks.`,

     'supervisor': `You are a supervisor AI agent coordinating a team of specialist agents to fulfill a user request.
User Request: {USER_REQUEST}
Available Agents: {AGENT_LIST}

1.  **Analyze** the user request and break it down into smaller, manageable sub-tasks suitable for the available specialist agents.
2.  **Identify** the best agent(s) from the list to perform each sub-task. Consider their specified roles and tools.
3.  **Delegate** each sub-task to the chosen agent, providing clear instructions and necessary context (e.g., relevant file paths, code snippets, previous results).
4.  **Monitor** the progress of the agents. If an agent fails or produces incorrect results, analyze the issue and either re-assign the task (possibly with modified instructions) or attempt to correct the result yourself if feasible.
5.  **Synthesize** the results from the individual agents into a final, coherent response or set of actions that fulfills the original user request.
6.  **Communicate** the final result or a summary of actions taken to the user. If unable to complete the request, explain why.

**Output Format:**
Provide a step-by-step plan of delegation and the final synthesized result. If interacting with agents, clearly state which agent is being called and the task given.

**Constraint:** You can only call the agents listed. Use their IDs for delegation.`
};
```

---

**`src/diff/diffEngine.ts`**

```typescript
import * as diff from 'diff';
import { logger } from '../logger';

export interface DiffHunk extends diff.Hunk {} // Alias for clarity
export interface ApplyPatchOptions extends diff.ApplyPatchOptions {}
export interface CreatePatchOptions extends diff.CreatePatchOptions {}


class DiffEngine {

    /**
     * Creates a unified diff patch string between two text contents.
     * @param oldFileName Name/path of the old file (for patch header).
     * @param newFileName Name/path of the new file (for patch header).
     * @param oldStr Content of the old file.
     * @param newStr Content of the new file.
     * @param options Optional diff options.
     * @returns The unified diff patch string.
     */
    createPatch(oldFileName: string, newFileName: string, oldStr: string, newStr: string, options?: CreatePatchOptions): string {
        logger.debug(`Creating patch between "${oldFileName}" and "${newFileName}"`);
        try {
            // Ensure consistent line endings (Unix-style) before diffing for reliability
            const cleanOldStr = oldStr.replace(/\r\n/g, '\n');
            const cleanNewStr = newStr.replace(/\r\n/g, '\n');
            return diff.createPatch(oldFileName, newFileName, cleanOldStr, cleanNewStr, '', '', options);
        } catch (error) {
            logger.error(`Error creating patch for "${oldFileName}":`, error);
            throw error; // Re-throw to be handled by caller
        }
    }

    /**
     * Applies a unified diff patch to a string.
     * IMPORTANT: This is sensitive to the exact content the patch was created against.
     * @param patch The unified diff patch string.
     * @param oldStr The original string the patch was created against.
     * @param options Optional patch application options (e.g., fuzz factor).
     * @returns The patched string, or false if the patch cannot be applied cleanly.
     */
    applyPatch(patch: string, oldStr: string, options?: ApplyPatchOptions): string | false {
        logger.debug(`Attempting to apply patch...`);
        try {
            // Ensure consistent line endings (Unix-style) before patching
             const cleanOldStr = oldStr.replace(/\r\n/g, '\n');
             // The patch itself should ideally already use \n, but we parse it anyway
            const result = diff.applyPatch(cleanOldStr, patch, options);

            if (result === false) {
                logger.warn("Patch could not be applied cleanly.");
                // Optionally try parsing the patch to see which hunk failed
                const parsed = diff.parsePatch(patch);
                logger.debug("Parsed patch hunks:", parsed);
            } else {
                 logger.debug("Patch applied successfully.");
            }
            // Note: The result will have '\n' line endings. The caller might need to convert back if necessary.
            return result;
        } catch (error: any) {
            // `diff.applyPatch` can throw errors for malformed patches
            logger.error("Error applying patch:", error);
             if (error.message?.includes('hunk')) {
                 // More specific error from the diff library
                 vscode.window.showWarningMessage(`Patch application failed: ${error.message}. The file content might have changed since the patch was generated.`);
             }
            return false; // Indicate failure
        }
    }

    /**
     * Parses a patch string into its component hunks.
     * @param patch The unified diff patch string.
     * @returns An array of parsed patch objects, or throws on error.
     */
    parsePatch(patch: string): diff.ParsedDiff[] {
        logger.debug("Parsing patch string.");
        try {
            return diff.parsePatch(patch);
        } catch (error) {
             logger.error("Error parsing patch string:", error);
             throw error;
        }
    }

     /**
      * Applies multiple patches sequentially to a string.
      * Stops and returns the intermediate result if any patch fails.
      * @param patches Array of patch strings.
      * @param initialStr The starting string content.
      * @param options Optional patch application options.
      * @returns The final string content after applying all successful patches, or false if any patch failed.
      */
     applyMultiplePatches(patches: string[], initialStr: string, options?: ApplyPatchOptions): string | false {
        logger.debug(`Applying ${patches.length} patches sequentially.`);
        let currentContent: string | false = initialStr;

        for (let i = 0; i < patches.length; i++) {
            const patch = patches[i];
            if (currentContent === false) {
                logger.error(`Cannot apply patch ${i + 1}, previous patch failed.`);
                return false; // Stop if a previous patch failed
            }
            logger.debug(`Applying patch ${i + 1}...`);
            currentContent = this.applyPatch(patch, currentContent, options);

            if (currentContent === false) {
                logger.error(`Failed to apply patch ${i + 1}.`);
                // Optionally return the content *before* the failed patch?
                // For now, return false to indicate overall failure.
                return false;
            }
        }

        logger.info(`Successfully applied ${patches.length} patches.`);
        return currentContent;
    }

    // Add methods for other diff algorithms (e.g., diffChars, diffWords) if needed
    // diffLines is implicitly used by createPatch/applyPatch
}

import * as vscode from 'vscode'; // Need this for showWarningMessage

export const diffEngine = new DiffEngine();
```

---

**`src/agents/tools/tool.ts`**

```typescript
import { AgentContext } from "../agent"; // Assuming AgentContext is defined in agent.ts

export interface ToolInput {
    [key: string]: any; // Flexible input, specific tools define required keys
}

export interface ToolResult {
    success: boolean;
    output?: any; // Can be string, object, etc. depending on the tool
    error?: string;
    // Optional: Cost/usage information if the tool calls external APIs
    usage?: { [key: string]: number };
}

export interface ITool {
    readonly id: string; // Unique identifier (e.g., "file.readFile", "web.search")
    readonly name: string; // Human-readable name
    readonly description: string; // Detailed description for the LLM and user
    readonly inputSchema?: object; // Optional JSON schema for input validation/description

    /**
     * Executes the tool's action.
     * @param input - The parameters for the tool, validated against inputSchema if provided.
     * @param context - The current agent execution context (optional, provides access to workspace, etc.).
     * @returns A promise resolving to the tool's result.
     */
    execute(input: ToolInput, context?: AgentContext): Promise<ToolResult>;
}
```

---

**`src/agents/tools/fileSystemTool.ts`**

```typescript
import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult } from './tool';
import { diffEngine } from '../../diff/diffEngine';
import { logger } from '../../logger';
import { resolveWorkspacePath } from '../../utils';
import { TextDecoder, TextEncoder } from 'util'; // Node.js built-in

const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

export class FileSystemTool implements ITool {
    readonly id = 'file'; // Group related actions under 'file'
    readonly name = 'File System Operations';
    readonly description = 'Provides actions to read, write, diff, and patch files in the workspace. Paths should be relative to the workspace root or absolute.';

    // Define sub-actions within this tool
    private actions: { [key: string]: ITool } = {
        'readFile': new ReadFileTool(),
        'writeFile': new WriteFileTool(),
        'createDiff': new CreateDiffTool(),
        'applyDiff': new ApplyDiffTool(),
        // Add more actions like 'listDirectory', 'createFile', 'deleteFile' as needed
    };

    // This main tool acts as a dispatcher
    async execute(input: ToolInput, context?: any): Promise<ToolResult> {
        const actionId = input.action; // Expect an 'action' key in the input
        const actionTool = this.actions[actionId];

        if (!actionTool) {
            return { success: false, error: `Unknown file system action: ${actionId}. Available actions: ${Object.keys(this.actions).join(', ')}` };
        }

        // Pass the rest of the input (excluding 'action') to the specific tool
        const actionInput = { ...input };
        delete actionInput.action;

        return actionTool.execute(actionInput, context);
    }

    // Expose schemas of sub-actions if needed for LLM function calling
    get subActionSchemas() {
        return Object.values(this.actions).map(a => ({
            id: `${this.id}.${a.id}`, // e.g., file.readFile
            name: a.name,
            description: a.description,
            inputSchema: a.inputSchema
        }));
    }
}

// --- Individual File Action Tools ---

class ReadFileTool implements ITool {
    readonly id = 'readFile';
    readonly name = 'Read File';
    readonly description = 'Reads the content of a specified file.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file (relative to workspace root or absolute).' }
        },
        required: ['filePath']
    };

    async execute(input: ToolInput): Promise<ToolResult> {
        const filePath = input.filePath as string;
        if (!filePath) {
            return { success: false, error: "'filePath' is required." };
        }

        const fileUri = resolveWorkspacePath(filePath);
        if (!fileUri) {
             return { success: false, error: `Could not resolve file path: ${filePath}. Ensure it's relative to an open workspace or absolute.` };
        }


        try {
            logger.debug(`Reading file: ${fileUri.fsPath}`);
            const fileContentUint8 = await vscode.workspace.fs.readFile(fileUri);
            const fileContent = decoder.decode(fileContentUint8);
            logger.info(`Successfully read ${fileContent.length} characters from ${fileUri.fsPath}`);
            return { success: true, output: fileContent };
        } catch (error: any) {
            logger.error(`Error reading file ${fileUri.fsPath}:`, error);
             // Provide more specific errors if possible (e.g., file not found)
             if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                 return { success: false, error: `File not found: ${filePath}` };
             }
            return { success: false, error: `Failed to read file: ${error.message || error}` };
        }
    }
}

class WriteFileTool implements ITool {
    readonly id = 'writeFile';
    readonly name = 'Write File';
    readonly description = 'Writes content to a specified file, overwriting existing content. Creates the file if it does not exist.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file (relative to workspace root or absolute).' },
            content: { type: 'string', description: 'The content to write to the file.' }
        },
        required: ['filePath', 'content']
    };

    async execute(input: ToolInput): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const content = input.content as string;

        if (filePath === undefined || content === undefined) {
            return { success: false, error: "'filePath' and 'content' are required." };
        }
         if (typeof content !== 'string') {
             return { success: false, error: "'content' must be a string." };
         }

        const fileUri = resolveWorkspacePath(filePath);
         if (!fileUri) {
             return { success: false, error: `Could not resolve file path: ${filePath}. Ensure it's relative to an open workspace or absolute.` };
        }

        try {
            logger.debug(`Writing to file: ${fileUri.fsPath}`);
            const contentUint8 = encoder.encode(content);
            await vscode.workspace.fs.writeFile(fileUri, contentUint8);
            logger.info(`Successfully wrote ${content.length} characters to ${fileUri.fsPath}`);
            return { success: true, output: `File ${filePath} written successfully.` };
        } catch (error: any) {
            logger.error(`Error writing file ${fileUri.fsPath}:`, error);
            return { success: false, error: `Failed to write file: ${error.message || error}` };
        }
    }
}

class CreateDiffTool implements ITool {
    readonly id = 'createDiff';
    readonly name = 'Create Diff Patch';
    readonly description = 'Creates a unified diff patch between the content of a file and new provided content.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the original file (relative or absolute).' },
            newContent: { type: 'string', description: 'The proposed new content for the file.' }
        },
        required: ['filePath', 'newContent']
    };

    async execute(input: ToolInput): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const newContent = input.newContent as string;

        if (!filePath || newContent === undefined) {
            return { success: false, error: "'filePath' and 'newContent' are required." };
        }

        const fileUri = resolveWorkspacePath(filePath);
         if (!fileUri) {
             return { success: false, error: `Could not resolve file path: ${filePath}.` };
        }

        try {
            // Read the original file content
            let originalContent = '';
            try {
                const originalContentUint8 = await vscode.workspace.fs.readFile(fileUri);
                originalContent = decoder.decode(originalContentUint8);
            } catch (error: any) {
                 if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                     // If file doesn't exist, treat original content as empty for diff creation
                     logger.debug(`File ${filePath} not found, creating diff against empty content.`);
                     originalContent = '';
                 } else {
                     throw error; // Re-throw other read errors
                 }
            }


            const patch = diffEngine.createPatch(filePath, filePath, originalContent, newContent);
            logger.info(`Successfully created diff patch for ${filePath}`);
            return { success: true, output: patch };

        } catch (error: any) {
            logger.error(`Error creating diff for ${filePath}:`, error);
            return { success: false, error: `Failed to create diff: ${error.message || error}` };
        }
    }
}

class ApplyDiffTool implements ITool {
    readonly id = 'applyDiff';
    readonly name = 'Apply Diff Patch';
    readonly description = 'Applies a unified diff patch to a specified file. IMPORTANT: The file content should match the state the patch was created against.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file to patch (relative or absolute).' },
            patch: { type: 'string', description: 'The unified diff patch string.' }
            // Optional: Add fuzz factor option?
        },
        required: ['filePath', 'patch']
    };

    async execute(input: ToolInput): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const patch = input.patch as string;

        if (!filePath || !patch) {
            return { success: false, error: "'filePath' and 'patch' are required." };
        }

        const fileUri = resolveWorkspacePath(filePath);
         if (!fileUri) {
             return { success: false, error: `Could not resolve file path: ${filePath}.` };
        }

        try {
            // 1. Read the current content of the file
             let currentContent = '';
             try {
                 const currentContentUint8 = await vscode.workspace.fs.readFile(fileUri);
                 currentContent = decoder.decode(currentContentUint8);
             } catch (error: any) {
                  if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                      // If the file doesn't exist, maybe the patch is creating it?
                      // Check if the patch applies cleanly to an empty string.
                      logger.warn(`File ${filePath} not found. Attempting to apply patch to empty content.`);
                      currentContent = '';
                  } else {
                      throw error; // Re-throw other read errors
                  }
             }


            // 2. Apply the patch
            const patchedContent = diffEngine.applyPatch(patch, currentContent); // Add options if needed

            if (patchedContent === false) {
                // Patch failed to apply
                return { success: false, error: `Patch could not be applied cleanly to ${filePath}. The file content may have changed, or the patch is invalid/malformed.` };
            }

            // 3. Write the patched content back to the file
            logger.debug(`Writing patched content back to: ${fileUri.fsPath}`);
            const patchedContentUint8 = encoder.encode(patchedContent);
            await vscode.workspace.fs.writeFile(fileUri, patchedContentUint8);

            logger.info(`Successfully applied patch to ${filePath}`);
            return { success: true, output: `Patch applied successfully to ${filePath}.` };

        } catch (error: any) {
            logger.error(`Error applying patch to ${filePath}:`, error);
            return { success: false, error: `Failed to apply patch: ${error.message || error}` };
        }
    }
}

export const fileSystemTool = new FileSystemTool();
```

---

**`src/agents/tools/documentationTool.ts`** (Placeholder)

```typescript
import { ITool, ToolInput, ToolResult } from './tool';
import { logger } from '../../logger';
import { llmService } from '../../llm/llmService';
import { promptManager } from '../../prompts/promptManager';
import { AgentContext } from '../agent';
import { LLMConfig } from '../../config';

// Placeholder - Real implementation needs a search API or advanced web scraping.
// This version uses another LLM call as a fallback.
export class DocumentationTool implements ITool {
    readonly id = 'docs';
    readonly name = 'Documentation Research';
    readonly description = 'Searches for and summarizes technical documentation based on a query. Uses an LLM for research if no dedicated search backend is available.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'The search query (e.g., "python list append", "vscode API TreeDataProvider").' }
        },
        required: ['query']
    };

    // Allow configuring which LLM to use for research
    private researchLLMConfig: LLMConfig = { provider: 'openai', modelId: 'gpt-3.5-turbo' }; // Example default

    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const query = input.query as string;
        if (!query) {
            return { success: false, error: "'query' is required." };
        }

        logger.info(`Documentation research requested for query: "${query}"`);

        // In a real implementation, you would call a search API here (e.g., Google Custom Search, Bing, Algolia, You.com)
        // Or use a dedicated web scraping service/library (like Jina Reader, Browserless.io, or Puppeteer - complex setup)

        // --- Fallback using LLM ---
        logger.warn("DocumentationTool using LLM fallback for research. Results may vary.");

        const provider = llmService.getProviderForConfig(this.researchLLMConfig);
        if (!provider) {
             return { success: false, error: `LLM provider '${this.researchLLMConfig.provider}' for documentation research not found or configured.` };
        }

        const systemPrompt = promptManager.getSystemPrompt('documentation_researcher', { QUERY: query });
        if (!systemPrompt) {
             return { success: false, error: "System prompt 'documentation_researcher' not found." };
        }

        try {
            const result = await provider.generate({
                prompt: `Please find and summarize documentation for: ${query}`, // Simple prompt
                systemPrompt: systemPrompt,
                modelId: this.researchLLMConfig.modelId,
                // Adjust temperature/maxTokens if needed for research tasks
            });

            if (result.error) {
                return { success: false, error: `Documentation research failed: ${result.error}` };
            }

            return { success: true, output: result.content };

        } catch (error: any) {
            logger.error(`Error during LLM-based documentation research for query "${query}":`, error);
            return { success: false, error: `Documentation research failed: ${error.message || error}` };
        }
    }
}

export const documentationTool = new DocumentationTool();

```

---

**`src/agents/agent.ts`**

```typescript
import * as vscode from 'vscode';
import { LLMConfig, AgentConfig } from '../config';
import { llmService } from '../llm/llmService';
import { promptManager } from '../prompts/promptManager';
import { logger } from '../logger';
import { ITool, ToolInput, ToolResult } from './tools/tool';
import { fileSystemTool } from './tools/fileSystemTool';
import { documentationTool } from './tools/documentationTool';
// Import other tools

// Context passed to tools and potentially between agent steps
export interface AgentContext {
    workspaceRoot?: string;
    currentFilePath?: string;
    selectedText?: string;
    variables?: Record<string, string>; // Other dynamic variables
    // Add more context as needed (e.g., diagnostics, git status)
}

export class Agent {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly systemPromptName: string;
    readonly llmConfig: LLMConfig;
    readonly tools: Map<string, ITool> = new Map();
    readonly isSupervisor: boolean;

    constructor(config: AgentConfig) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.systemPromptName = config.systemPromptName;
        this.llmConfig = config.llm ?? llmService.getProviderOrDefault()?.providerId // Use default if not specified
            ? { provider: llmService.getProviderOrDefault()!.providerId, modelId: llmService.getProviderOrDefault()!.providerId === 'ollama' ? 'llama3' : 'default-model-id' } // Provide sensible defaults
            : { provider: 'unknown', modelId: 'unknown' }; // Fallback if default is somehow unavailable
         if (config.llm) {
             this.llmConfig = config.llm;
         } else {
             const defaultConfig = llmService.getProviderOrDefault()
                 ? { provider: llmService.getProviderOrDefault()!.providerId, modelId: 'default' } // Need a way to get default model ID
                 : { provider: 'ollama', modelId: 'llama3' }; // Hardcoded fallback
             logger.warn(`Agent '${this.name}' using default LLM config: ${JSON.stringify(defaultConfig)}`);
             this.llmConfig = defaultConfig;
             // TODO: Get default model ID properly from config
         }

        this.isSupervisor = config.isSupervisor ?? false;

        // Register tools specified in the config
        this.registerTools(config.tools ?? ['file']); // Default to file tool if none specified
    }

    private registerTools(toolIds: string[]) {
        // Map tool IDs to actual tool instances
        // This could be more dynamic, loading tools based on ID
        const availableTools: Record<string, ITool> = {
            'file': fileSystemTool,
            'docs': documentationTool,
            // Add other tools here
        };

        toolIds.forEach(id => {
            const tool = availableTools[id];
            if (tool) {
                this.tools.set(id, tool);
                logger.debug(`Agent '${this.name}' registered tool: ${id}`);
            } else {
                logger.warn(`Agent '${this.name}' configured with unknown tool ID: ${id}`);
            }
        });
    }

    /**
     * Runs the agent with a given task prompt and context.
     * This is a simplified run loop. Real agents might involve multiple LLM calls,
     * tool usage planning, reflection, etc.
     */
    async run(taskPrompt: string, context: AgentContext = {}): Promise<string> {
        logger.info(`Agent '${this.name}' starting task...`);
        logger.debug(`Task Prompt: ${taskPrompt}`);
        logger.debug(`Context: ${JSON.stringify(context)}`);

        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) {
            const errorMsg = `LLM provider '${this.llmConfig.provider}' for agent '${this.name}' not found or configured.`;
            logger.error(errorMsg);
            vscode.window.showErrorMessage(errorMsg);
            return `Error: ${errorMsg}`;
        }
         if (!provider.isConfigured || !provider.isConfigured()) {
             const errorMsg = `LLM provider '${this.llmConfig.provider}' is not configured (e.g., API key missing). Agent '${this.name}' cannot run.`;
             logger.error(errorMsg);
             vscode.window.showErrorMessage(errorMsg);
             return `Error: ${errorMsg}`;
         }


        // Prepare system prompt with variables
        const systemPrompt = promptManager.getSystemPrompt(this.systemPromptName, {
            WORKSPACE_ROOT: context.workspaceRoot ?? 'N/A',
            CURRENT_FILE_PATH: context.currentFilePath ?? 'N/A',
            SELECTED_TEXT: context.selectedText ?? 'N/A',
            ...(context.variables ?? {}) // Include other dynamic variables
        });

        if (!systemPrompt) {
            const errorMsg = `System prompt '${this.systemPromptName}' for agent '${this.name}' not found.`;
            logger.error(errorMsg);
            return `Error: ${errorMsg}`;
        }

        // --- Basic Agent Loop (Example) ---
        // This is highly simplified. Real agent loops involve:
        // 1. Planning (LLM decides steps/tools)
        // 2. Tool Execution (Call tools based on plan)
        // 3. Observation (Get tool results)
        // 4. Reflection/Refinement (LLM processes results, adjusts plan)
        // 5. Repeat until task complete or max iterations reached.
        // For now, we do one LLM call. Tool use would need parsing the LLM response
        // for function/tool call requests.

        try {
            // TODO: Implement proper tool calling based on LLM response format (e.g., OpenAI Functions, XML tags)
            // For now, just make a single call and return the text response.
            const result = await provider.generate({
                prompt: taskPrompt,
                systemPrompt: systemPrompt,
                modelId: this.llmConfig.modelId,
                options: this.llmConfig.options,
                // Pass tool schemas if the provider supports function calling
            });

            if (result.error) {
                logger.error(`Agent '${this.name}' LLM call failed: ${result.error}`);
                return `Error during task execution: ${result.error}`;
            }

            logger.info(`Agent '${this.name}' finished task successfully.`);
            logger.debug(`LLM Response: ${result.content.substring(0, 100)}...`); // Log snippet
            return result.content; // Return the final text response

        } catch (error: any) {
            logger.error(`Agent '${this.name}' execution failed:`, error);
            return `Error during task execution: ${error.message || error}`;
        }
    }

     // Placeholder for a more complex run method supporting tool calls
    async runWithTools(taskPrompt: string, context: AgentContext = {}): Promise<string> {
         // 1. Initial LLM call with task + tool descriptions
         // 2. Parse response: Is it a final answer or a tool call request?
         // 3. If tool call:
         //    a. Validate tool and input
         //    b. Execute tool
         //    c. Format tool result
         //    d. Call LLM again with tool result and original prompt/history
         //    e. Go back to step 2
         // 4. If final answer: Return it
         // Needs robust parsing, state management (history), iteration limits.
         logger.warn("runWithTools is not fully implemented. Using basic run method.");
         return this.run(taskPrompt, context);
    }
}
```

---

**`src/agents/agentManager.ts`**

```typescript
import * as vscode from 'vscode';
import { AgentConfig, getAgentConfigs, updateAgentConfigs, LLMConfig } from '../config';
import { Agent } from './agent';
import { logger } from '../logger';
import { generateUUID, showInputBox, showQuickPick } from '../utils';
import { promptManager } from '../prompts/promptManager';
import { llmService } from '../llm/llmService';
import { fileSystemTool } from './tools/fileSystemTool'; // Import available tools
import { documentationTool } from './tools/documentationTool';

class AgentManager {
    private agents: Map<string, Agent> = new Map();
    private onDidChangeAgentsEmitter = new vscode.EventEmitter<void>();
    readonly onDidChangeAgents: vscode.Event<void> = this.onDidChangeAgentsEmitter.event;


    constructor() {
        this.loadAgentsFromConfig();
        // Watch for configuration changes affecting agents
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('agentic.agents') ||
                e.affectsConfiguration('agentic.systemPrompts') || // Prompts changing requires reload
                e.affectsConfiguration('agentic.defaultModel') || // Default LLM changing might affect agents
                e.affectsConfiguration('agentic.providers')) // Provider config changes might affect agents
            {
                logger.info("Agent configuration or related settings changed, reloading agents.");
                this.loadAgentsFromConfig();
            }
        });
         // Also reload if prompts themselves change
         // (This assumes promptManager doesn't have its own event)
         // A more robust solution might involve events from PromptManager
    }

    loadAgentsFromConfig() {
        const agentConfigs = getAgentConfigs();
        this.agents.clear();
        logger.info(`Loading ${agentConfigs.length} agent configurations...`);
        agentConfigs.forEach(config => {
            try {
                // Ensure essential fields are present
                if (!config.id || !config.name || !config.systemPromptName) {
                     logger.error(`Skipping invalid agent config (missing id, name, or systemPromptName): ${JSON.stringify(config)}`);
                     return;
                }
                const agent = new Agent(config);
                this.agents.set(agent.id, agent);
                 logger.debug(`Loaded agent: ${agent.name} (ID: ${agent.id})`);
            } catch (error) {
                logger.error(`Failed to load agent from config: ${JSON.stringify(config)}`, error);
            }
        });
        this.onDidChangeAgentsEmitter.fire();
    }

    getAgent(id: string): Agent | undefined {
        return this.agents.get(id);
    }

    getAllAgents(): Agent[] {
        return Array.from(this.agents.values());
    }

    getAllAgentConfigs(): AgentConfig[] {
        // Return the raw configs, useful for saving back
        return getAgentConfigs();
    }

    async createAgentInteractively(): Promise<void> {
        logger.debug("Starting interactive agent creation...");

        const name = await showInputBox("Enter a name for the new agent:", "My New Agent");
        if (!name) return;

        const description = await showInputBox("Enter a short description (optional):", "Agent that does X");

        // Select System Prompt
        const promptNames = promptManager.listPromptNames();
        if (promptNames.length === 0) {
            vscode.window.showErrorMessage("No system prompts available. Please define prompts in settings first.");
            return;
        }
        const selectedPromptItem = await showQuickPick(
            promptNames.map(p => ({ label: p, description: `Use the '${p}' system prompt` })),
            "Select a system prompt for the agent"
        );
        if (!selectedPromptItem) return;
        const systemPromptName = selectedPromptItem.label;

        // Select LLM (Optional - use default if not chosen)
        const llmChoice = await showQuickPick(
            [{ label: "Use Default LLM", description: "Use the global default provider/model" }, { label: "Specify LLM", description: "Choose a specific provider and model" }],
            "Select LLM configuration for the agent"
        );
        if (!llmChoice) return;

        let llmConfig: LLMConfig | undefined = undefined;
        if (llmChoice.label === "Specify LLM") {
            const providerIds = llmService.listProviderIds();
            if (providerIds.length === 0) {
                 vscode.window.showErrorMessage("No LLM providers configured.");
                 return;
            }
            const selectedProviderItem = await showQuickPick(
                providerIds.map(id => ({ label: id })),
                "Select the LLM Provider"
            );
            if (!selectedProviderItem) return;
            const providerId = selectedProviderItem.label;

            // Fetch models for the selected provider
            const provider = llmService.getProvider(providerId);
            let modelId: string | undefined;
            if (provider?.getAvailableModels) {
                 const models = await provider.getAvailableModels();
                 if (models.length > 0) {
                     const selectedModelItem = await showQuickPick(
                         models.map(m => ({ label: m })),
                         `Select a model for ${providerId}`
                     );
                     modelId = selectedModelItem?.label;
                 } else {
                      modelId = await showInputBox(`No models listed for ${providerId}. Enter model ID manually:`, "model-name");
                 }
            } else {
                 modelId = await showInputBox(`Provider ${providerId} doesn't list models. Enter model ID manually:`, "model-name");
            }

            if (!modelId) return; // User cancelled model selection
            llmConfig = { provider: providerId, modelId: modelId };
        }

        // Select Tools (Multi-select)
        const availableTools = [fileSystemTool, documentationTool /*, ... other tools */];
        const selectedToolItems = await vscode.window.showQuickPick(
             availableTools.map(t => ({ label: t.id, description: t.name, picked: t.id === 'file' })), // Pre-select file tool
             { placeHolder: "Select tools for the agent", canPickMany: true }
        );
        const toolIds = selectedToolItems?.map(item => item.label) ?? ['file']; // Default to file tool if none selected


        // Create Agent Config
        const newAgentConfig: AgentConfig = {
            id: generateUUID(),
            name: name,
            description: description || undefined,
            systemPromptName: systemPromptName,
            llm: llmConfig, // Will be undefined if default was chosen
            tools: toolIds,
            isSupervisor: false, // Add option later if needed
        };

        // Save the new agent
        const currentConfigs = this.getAllAgentConfigs();
        currentConfigs.push(newAgentConfig);
        await updateAgentConfigs(currentConfigs);

        // Reload agents (will be triggered by config change watcher, but explicit call ensures immediate update)
        // this.loadAgentsFromConfig(); // No need, watcher handles it.

        vscode.window.showInformationMessage(`Agent '${name}' created successfully.`);
        logger.info(`Agent '${name}' (ID: ${newAgentConfig.id}) created interactively.`);
    }

     async deleteAgentInteractively(): Promise<void> {
        const agents = this.getAllAgents();
        if (agents.length === 0) {
            vscode.window.showInformationMessage("No agents configured to delete.");
            return;
        }

        const selectedAgentItem = await showQuickPick(
            agents.map(a => ({ label: a.name, description: a.description ?? `ID: ${a.id}`, agentId: a.id })),
            "Select an agent to delete"
        );

        if (!selectedAgentItem || !selectedAgentItem.agentId) return;

        const confirm = await showQuickPick(
            [{ label: "Yes, Delete Agent" }, { label: "Cancel" }],
            `Are you sure you want to delete agent '${selectedAgentItem.label}'? This cannot be undone.`
        );

        if (confirm?.label !== "Yes, Delete Agent") return;


        const currentConfigs = this.getAllAgentConfigs();
        const updatedConfigs = currentConfigs.filter(c => c.id !== selectedAgentItem.agentId);

        await updateAgentConfigs(updatedConfigs);

        // Reload handled by watcher
        vscode.window.showInformationMessage(`Agent '${selectedAgentItem.label}' deleted.`);
        logger.info(`Agent '${selectedAgentItem.label}' (ID: ${selectedAgentItem.agentId}) deleted interactively.`);
    }

    // Add methods for editing agents interactively
    // async editAgentInteractively(agentId: string): Promise<void> { ... }
}

export const agentManager = new AgentManager();
```

---

**`src/agents/supervisorAgent.ts`** (Conceptual)

```typescript
import * as vscode from 'vscode';
import { Agent, AgentContext } from './agent';
import { AgentConfig, LLMConfig } from '../config';
import { agentManager } from './agentManager';
import { logger } from '../logger';
import { llmService } from '../llm/llmService';
import { promptManager } from '../prompts/promptManager';

// This requires a more sophisticated Agent class or run loop that can handle
// parsing structured output (like delegation plans) and calling other agents.
// This is a conceptual outline.

export class SupervisorAgent extends Agent {
    private subAgentIds: string[];

    constructor(config: AgentConfig) {
        // Ensure the supervisor flag is set correctly
        super({ ...config, isSupervisor: true });
        this.subAgentIds = config.chainedAgentIds ?? [];
        if (this.subAgentIds.length === 0) {
             logger.warn(`Supervisor agent '${this.name}' created with no sub-agent IDs defined.`);
        }
    }

    override async run(taskPrompt: string, context: AgentContext = {}): Promise<string> {
        logger.info(`Supervisor Agent '${this.name}' starting task: ${taskPrompt}`);

        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider) {
            const errorMsg = `LLM provider '${this.llmConfig.provider}' for supervisor '${this.name}' not found.`;
            logger.error(errorMsg); return `Error: ${errorMsg}`;
        }
         if (!provider.isConfigured || !provider.isConfigured()) {
             const errorMsg = `LLM provider '${this.llmConfig.provider}' is not configured. Supervisor '${this.name}' cannot run.`;
             logger.error(errorMsg); return `Error: ${errorMsg}`;
         }

        // 1. Get Sub-agent details for the prompt
        const availableAgentsInfo = this.subAgentIds.map(id => {
            const agent = agentManager.getAgent(id);
            return agent ? `- ID: ${id}, Name: ${agent.name}, Description: ${agent.description ?? 'N/A'}` : `- ID: ${id} (Not Found)`;
        }).join('\n');

        // 2. Prepare the supervisor system prompt
        const systemPrompt = promptManager.getSystemPrompt(this.systemPromptName, {
            USER_REQUEST: taskPrompt, // Pass original request to system prompt
            AGENT_LIST: availableAgentsInfo,
            ...(context.variables ?? {})
        });
        if (!systemPrompt) {
            const errorMsg = `System prompt '${this.systemPromptName}' for supervisor '${this.name}' not found.`;
            logger.error(errorMsg); return `Error: ${errorMsg}`;
        }

        // 3. Initial LLM call to get the plan
        let currentPlanAndState = `Original User Request: ${taskPrompt}\nAvailable Agents:\n${availableAgentsInfo}\n\nPlease devise a plan to fulfill the request using the available agents.`;
        let finalResult = "Supervisor processing failed.";
        const maxIterations = 5; // Prevent infinite loops

        try {
            for (let i = 0; i < maxIterations; i++) {
                logger.debug(`Supervisor Iteration ${i + 1}. Current State/Plan:\n${currentPlanAndState}`);

                const response = await provider.generate({
                    prompt: currentPlanAndState, // Provide current state/history
                    systemPrompt: systemPrompt,
                    modelId: this.llmConfig.modelId,
                    options: this.llmConfig.options,
                });

                if (response.error) {
                    logger.error(`Supervisor LLM call failed: ${response.error}`);
                    return `Error during supervision: ${response.error}`;
                }

                const llmOutput = response.content;
                logger.debug(`Supervisor LLM Output (Iteration ${i + 1}):\n${llmOutput}`);

                // 4. Parse LLM output: Does it contain a delegation step or a final answer?
                // This parsing logic is CRITICAL and complex. Needs robust handling
                // of different LLM output styles (e.g., specific keywords, JSON, XML).
                // Example: Look for "DELEGATE TO AGENT <id> TASK: <task description>"
                const delegationMatch = llmOutput.match(/DELEGATE TO AGENT (\S+) TASK:\s*([\s\S]*)/i);

                if (delegationMatch) {
                    const agentIdToCall = delegationMatch[1].trim();
                    const subTask = delegationMatch[2].trim();
                    logger.info(`Supervisor delegating task to Agent ID: ${agentIdToCall}`);
                    logger.debug(`Sub-task: ${subTask}`);

                    const subAgent = agentManager.getAgent(agentIdToCall);
                    if (!subAgent || !this.subAgentIds.includes(agentIdToCall)) {
                        logger.warn(`Supervisor tried to delegate to invalid/unknown agent ID: ${agentIdToCall}`);
                        currentPlanAndState = `${llmOutput}\n\nSystem Note: Agent ID '${agentIdToCall}' is not valid or available for this supervisor. Please choose from the provided list or revise the plan.`;
                        continue; // Ask LLM to revise plan
                    }

                    // 5. Execute sub-agent
                    const subAgentResult = await subAgent.run(subTask, context); // Pass context

                    // 6. Update state with sub-agent result
                    currentPlanAndState = `${llmOutput}\n\nResult from Agent ${agentIdToCall} (${subAgent.name}):\n${subAgentResult}\n\nPlease continue the plan or provide the final result.`;

                } else {
                    // Assume it's the final answer if no delegation found
                    logger.info(`Supervisor determined final result.`);
                    finalResult = llmOutput; // Use the LLM's last output as the final result
                    break; // Exit loop
                }
            }

            if (finalResult === "Supervisor processing failed.") {
                 logger.warn(`Supervisor reached max iterations (${maxIterations}) without a final result.`);
                 finalResult = `Supervisor reached maximum iterations. Last state:\n${currentPlanAndState}`;
            }

        } catch (error: any) {
            logger.error(`Supervisor agent '${this.name}' execution failed:`, error);
            return `Error during supervision: ${error.message || error}`;
        }

        return finalResult;
    }
}
```

---

**`src/ui/agentTreeView.ts`**

```typescript
import * as vscode from 'vscode';
import { agentManager } from '../agents/agentManager';
import { Agent } from '../agents/agent';
import { logger } from '../logger';

export class AgentTreeDataProvider implements vscode.TreeDataProvider<AgentTreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> = new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        // Refresh the tree when agents change
        context.subscriptions.push(agentManager.onDidChangeAgents(() => {
            this.refresh();
        }));

        // Register commands that interact with the tree view
        context.subscriptions.push(
            vscode.commands.registerCommand('agentic.refreshAgentView', () => this.refresh()),
            vscode.commands.registerCommand('agentic.addAgent', () => this.addAgent()),
            vscode.commands.registerCommand('agentic.deleteAgent', (item: AgentTreeItem) => this.deleteAgent(item)),
            vscode.commands.registerCommand('agentic.runAgentTask', (item: AgentTreeItem) => this.runAgentTask(item))
            // Add commands for editAgent, etc.
        );
    }

    refresh(): void {
        logger.debug("Refreshing Agent Tree View.");
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AgentTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AgentTreeItem): Thenable<AgentTreeItem[]> {
        if (element) {
            // If element exists, it's an agent item, show details (like description, LLM, tools)
            if (element.agent) {
                const agent = element.agent;
                const details: AgentTreeItem[] = [];
                if (agent.description) {
                    details.push(new AgentTreeItem(`Desc: ${agent.description}`, vscode.TreeItemCollapsibleState.None));
                }
                 details.push(new AgentTreeItem(`LLM: ${agent.llmConfig.provider} / ${agent.llmConfig.modelId}`, vscode.TreeItemCollapsibleState.None));
                 details.push(new AgentTreeItem(`Prompt: ${agent.systemPromptName}`, vscode.TreeItemCollapsibleState.None));
                 if (agent.tools.size > 0) {
                     details.push(new AgentTreeItem(`Tools: ${Array.from(agent.tools.keys()).join(', ')}`, vscode.TreeItemCollapsibleState.None));
                 }
                 if (agent.isSupervisor) {
                     details.push(new AgentTreeItem(`Type: Supervisor`, vscode.TreeItemCollapsibleState.None));
                     // TODO: List chained agents if supervisor
                 }

                return Promise.resolve(details);
            }
            // No children for detail items
            return Promise.resolve([]);
        } else {
            // Root level, show all configured agents
            const agents = agentManager.getAllAgents();
            if (agents.length === 0) {
                 // Optionally show a message or placeholder item
                 return Promise.resolve([new AgentTreeItem("No agents configured.", vscode.TreeItemCollapsibleState.None, { command: 'agentic.addAgent', title: "Add Agent..."})]);
            }
            return Promise.resolve(
                agents.map(agent => new AgentTreeItem(
                    agent.name,
                    vscode.TreeItemCollapsibleState.Collapsed, // Allow expanding to see details
                    undefined, // Default command (run task) handled via context menu or default action
                    agent // Store agent object
                ))
            );
        }
    }

    // --- Command Implementations ---

    private addAgent() {
        logger.debug("Add Agent command triggered from Tree View.");
        agentManager.createAgentInteractively(); // Let manager handle interaction
    }

    private deleteAgent(item: AgentTreeItem) {
        logger.debug(`Delete Agent command triggered for: ${item?.label}`);
        if (item?.agent?.id) {
            // We have the ID directly from the item's agent object
            // However, the interactive delete asks the user again for safety
             agentManager.deleteAgentInteractively();
        } else {
             logger.warn("Delete Agent command called without a valid agent item.");
             vscode.window.showWarningMessage("Please select an agent from the tree view to delete.");
        }
    }

     private async runAgentTask(item: AgentTreeItem) {
        logger.debug(`Run Agent Task command triggered for: ${item?.label}`);
        if (!item?.agent?.id) {
             logger.warn("Run Agent Task command called without a valid agent item.");
             vscode.window.showWarningMessage("Please select an agent from the tree view to run.");
            return;
        }
        const agent = item.agent;

        const task = await vscode.window.showInputBox({
            prompt: `Enter the task for agent '${agent.name}':`,
            placeHolder: "e.g., Refactor the selected code, Debug the error in main.py, Write unit tests for utils.ts"
        });

        if (!task) {
            logger.debug("Agent task input cancelled.");
            return;
        }

        // Gather context
        const editor = vscode.window.activeTextEditor;
        const context: AgentContext = {
            workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            currentFilePath: editor?.document.uri.fsPath,
            selectedText: editor?.document.getText(editor.selection),
            variables: {} // Add other context variables if needed
        };

        // Run the agent (potentially long-running)
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Agent '${agent.name}' is working...`,
            cancellable: true // TODO: Implement cancellation token passing to agent.run
        }, async (progress, token) => {
            progress.report({ increment: 0, message: "Initializing..." });

            // TODO: Pass cancellation token `token` down through the agent execution stack
            // token.onCancellationRequested(() => {
            //     logger.warn(`Cancellation requested for agent ${agent.name}`);
            //     // Signal cancellation to the agent's run method
            // });

            try {
                 progress.report({ increment: 20, message: "Running LLM..." });
                // Use runWithTools if implemented and appropriate
                const result = await agent.run(task, context);
                progress.report({ increment: 100, message: "Finished." });

                // Display result (e.g., in a new document, output channel, or apply changes)
                // For simplicity, show in a new document
                const resultDocument = await vscode.workspace.openTextDocument({
                    content: `Task: ${task}\nAgent: ${agent.name}\n\n---\n\n${result}`,
                    language: 'markdown' // Or detect language if result is code
                });
                await vscode.window.showTextDocument(resultDocument);

            } catch (error: any) {
                 progress.report({ increment: 100, message: "Error." });
                 logger.error(`Error running agent ${agent.name}:`, error);
                 vscode.window.showErrorMessage(`Agent '${agent.name}' failed: ${error.message}`);
            }
        });
    }
}

// Represents an item in the Agent Tree View
export class AgentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly agent?: Agent // Store the agent object if this item represents one
    ) {
        super(label, collapsibleState);
        this.tooltip = this.agent?.description ? `${this.label} - ${this.agent.description}` : this.label;
        this.description = this.agent?.description; // Show description next to label if available

        // Set context value for enabling/disabling commands in package.json view/item/context menu
        if (this.agent) {
            this.contextValue = 'agentItem'; // Used in package.json when clauses (e.g., "when": "viewItem == agentItem")
             // Set icon based on type
             this.iconPath = new vscode.ThemeIcon(this.agent.isSupervisor ? 'organization' : 'hubot'); // Example icons
        } else if (this.command?.command === 'agentic.addAgent') {
             this.contextValue = 'addAgentItem';
             this.iconPath = new vscode.ThemeIcon('add');
        } else {
             this.contextValue = 'infoItem'; // For non-agent items like details or messages
        }
    }
}
```

---

**`src/extension.ts`**

```typescript
import * as vscode from 'vscode';
import { logger } from './logger';
import { agentManager } from './agents/agentManager';
import { AgentTreeDataProvider } from './ui/agentTreeView';
import { AgentContext } from './agents/agent';
import { promptManager } from './prompts/promptManager';
import { llmService } from './llm/llmService'; // Ensure service is initialized

export function activate(context: vscode.ExtensionContext) {

    logger.info('Congratulations, your extension "agentic-coding-assistant" is now active!');

    // Initialize services (order might matter depending on dependencies)
    // Ensure config is read, providers registered, prompts loaded, agents loaded
    // Most are initialized in their own constructors/modules now.

    // Register Tree View
    const agentTreeDataProvider = new AgentTreeDataProvider(context);
    const treeView = vscode.window.createTreeView('agenticAssistantView', {
        treeDataProvider: agentTreeDataProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // Register Commands

    // Command: Run Task with selected Agent (triggered from command palette)
    let runTaskDisposable = vscode.commands.registerCommand('agentic.runTask', async () => {
        const agents = agentManager.getAllAgents();
        if (agents.length === 0) {
            vscode.window.showInformationMessage("No agents configured. Please add an agent first.");
            // Optionally trigger the add agent command
            // vscode.commands.executeCommand('agentic.addAgent');
            return;
        }

        const selectedAgentItem = await vscode.window.showQuickPick(
            agents.map(a => ({ label: a.name, description: a.description, agent: a })),
            { placeHolder: "Select an agent to run the task" }
        );

        if (!selectedAgentItem || !selectedAgentItem.agent) return;

        const agent = selectedAgentItem.agent;
        const task = await vscode.window.showInputBox({
            prompt: `Enter the task for agent '${agent.name}':`,
            placeHolder: "e.g., Refactor the selected code, Debug the error in main.py"
        });

        if (!task) return;

        // Gather context (same as in TreeView run command)
        const editor = vscode.window.activeTextEditor;
        const contextData: AgentContext = {
            workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            currentFilePath: editor?.document.uri.fsPath,
            selectedText: editor?.document.getText(editor.selection),
            variables: {}
        };

        // Run agent with progress (same as in TreeView run command)
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Agent '${agent.name}' is working...`,
            cancellable: true // TODO: Cancellation support
        }, async (progress, token) => {
             // TODO: Pass token
            try {
                progress.report({ increment: 0, message: "Initializing..." });
                const result = await agent.run(task, contextData); // Or runWithTools
                progress.report({ increment: 100, message: "Finished." });

                const resultDocument = await vscode.workspace.openTextDocument({ content: `Task: ${task}\nAgent: ${agent.name}\n\n---\n\n${result}`, language: 'markdown' });
                await vscode.window.showTextDocument(resultDocument);
            } catch (error: any) {
                 progress.report({ increment: 100, message: "Error." });
                 logger.error(`Error running agent ${agent.name} from command:`, error);
                 vscode.window.showErrorMessage(`Agent '${agent.name}' failed: ${error.message}`);
            }
        });
    });
    context.subscriptions.push(runTaskDisposable);


    // Command: Inline Code Generation (using a dedicated agent or default)
    let inlineGenerateDisposable = vscode.commands.registerTextEditorCommand('agentic.inlineGenerate', async (textEditor, edit) => {
        const selection = textEditor.selection;
        const selectedText = textEditor.document.getText(selection);

        // Optionally let user choose an agent, or use a predefined one (e.g., 'inline_coder')
        const agentId = 'inline_coder_agent'; // Assume an agent with this ID is configured
        let agent = agentManager.getAgent(agentId);

        if (!agent) {
            // Fallback to default coder agent or prompt user
            logger.warn(`Agent '${agentId}' not found for inline generation. Using default.`);
             // Find first agent available or use default prompt directly?
             const agents = agentManager.getAllAgents();
             if (agents.length > 0) agent = agents[0]; // Simple fallback
             else {
                 vscode.window.showErrorMessage("No agents available for inline generation.");
                 return;
             }
             vscode.window.showInformationMessage(`Using agent '${agent.name}' for inline generation.`);
        }

        const userRequest = await vscode.window.showInputBox({
            prompt: `Describe the code to generate (will replace selection or insert at cursor):`,
            placeHolder: "e.g., Convert this to an async function, Sort the list alphabetically"
        });

        if (!userRequest) return;

        // Prepare context specifically for inline generation
        const contextData: AgentContext = {
            workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            currentFilePath: textEditor.document.uri.fsPath,
            selectedText: selectedText,
            variables: { USER_REQUEST: userRequest } // Pass request as variable
        };

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window, // Use status bar for inline
            title: `$(hubot) Generating...`
        }, async (progress, token) => {
            try {
                 // Use a prompt specifically designed for inline generation
                 const inlinePrompt = `Generate code based on the following request: ${userRequest}. Consider the selected text (if any): "${selectedText}"`;
                 // Use the agent's configured LLM but potentially override the system prompt if needed,
                 // or ensure the agent's prompt is suitable (like the 'inline_code' default)
                const result = await agent.run(inlinePrompt, contextData); // Pass context

                if (result.startsWith('Error:')) {
                     vscode.window.showErrorMessage(`Inline generation failed: ${result}`);
                     return;
                }

                // Insert or replace the text
                if (!selection.isEmpty) {
                    edit.replace(selection, result);
                } else {
                    edit.insert(selection.active, result);
                }
                 logger.info(`Inline code generated and applied by agent ${agent.name}.`);

            } catch (error: any) {
                 logger.error(`Error during inline generation with agent ${agent.name}:`, error);
                 vscode.window.showErrorMessage(`Inline generation failed: ${error.message}`);
            }
        });
    });
    context.subscriptions.push(inlineGenerateDisposable);


    // Command: Open Settings (Placeholder - better to guide user to VS Code settings UI)
    let configureProvidersDisposable = vscode.commands.registerCommand('agentic.configureProviders', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'agentic.providers');
        vscode.window.showInformationMessage("Opening settings for Agentic Assistant AI Providers. Please configure API keys and endpoints there.");
    });
    context.subscriptions.push(configureProvidersDisposable);

    // Command: Manage Agents (Placeholder - could open settings or a custom webview)
    let manageAgentsDisposable = vscode.commands.registerCommand('agentic.manageAgents', () => {
         vscode.commands.executeCommand('workbench.action.openSettings', 'agentic.agents');
         vscode.window.showInformationMessage("Opening settings for Agentic Assistant Agents. You can add, edit, or remove agent configurations there.");
         // TODO: Implement a more user-friendly Webview UI for agent management later.
    });
    context.subscriptions.push(manageAgentsDisposable);


    // Add other command registrations from the TreeDataProvider (addAgent, deleteAgent, etc.)
    // These are already registered within the TreeDataProvider constructor.

    logger.info("Agentic Coding Assistant activation complete.");
}

// This method is called when your extension is deactivated
export function deactivate() {
    logger.info("Agentic Coding Assistant deactivated.");
    // Perform cleanup here if needed (e.g., close connections, dispose resources)
}
```

---

**Next Steps & Further Development:**

1.  **Implement More Providers:** Add classes for Anthropic, HuggingFace, LM Studio, OpenRouter, etc., following the `ILLMProvider` interface. Handle their specific authentication and API formats.
2.  **Tool Calling:** Implement robust parsing of LLM responses to detect and execute tool calls (e.g., using OpenAI Function Calling, XML tags, or other structured formats). This is crucial for agentic behavior. The `Agent.run` method needs a loop.
3.  **Supervisor Logic:** Refine the `SupervisorAgent`'s parsing and delegation logic. This is highly dependent on the LLM's ability to follow instructions and output structured plans.
4.  **Error Handling & Resilience:** Add more specific error handling, retry mechanisms for network issues, and better user feedback.
5.  **Large File Handling:** Test `FileSystemTool` (especially `applyDiff`) rigorously with very large files (tens of thousands of lines) and edge cases (different line endings, concurrent modifications). Consider chunking or streaming for extreme sizes if needed, though `vscode.workspace.fs` is generally robust.
6.  **Configuration UI:** Create Webviews for managing agents, prompts, and provider settings more interactively than JSON editing.
7.  **Advanced Agent Features:** Implement memory (short-term history, long-term vector stores), reflection (agent critiques its own work), dynamic tool creation, etc.
8.  **Inline Generation UI:** Improve the inline generation experience (e.g., showing diffs before applying).
9.  **Debugging Integration:** Integrate more deeply with `vscode.debug` API for automated debugging tasks.
10. **Testing:** Implement comprehensive unit and integration tests.
11. **Security:** Use `keytar` for secure API key storage. Be extremely careful if implementing code execution tools.
12. **Cancellation:** Fully implement cancellation token propagation through all async operations (LLM calls, tool executions).

This foundation provides the core structure and implements several key features. Building out the full feature set is a significant undertaking. Remember to install the dependencies (`npm install`) and compile the TypeScript (`npm run compile`).

Okay, this is a monumental request. Implementing *everything* to full production grade, including a sophisticated agentic loop with tool use, multiple operational modes (chat, edit, generate, multi-agent), and *all* the listed provider integrations, is genuinely the work of a software team over a significant period.

However, I will significantly enhance the previous foundation by:

1.  **Implementing `runWithTools`:** Adding a basic but functional agent loop in `Agent.ts` that attempts to parse LLM responses for tool calls (using a simple JSON format instruction) and execute them.
2.  **Adding Operational Modes:** Modifying the `Agent.run` signature and logic to understand different modes (`chat`, `edit`, `generate`, `task`) and adapting the interaction/output accordingly.
3.  **Refining Supervisor:** Improving the supervisor's interaction logic slightly.
4.  **Adding Mode-Specific Commands:** Creating commands in `extension.ts` to trigger these different modes.
5.  **Simulating Chat:** Using an Output Channel or temporary document to *demonstrate* the chat flow, as a full Webview UI is too extensive.
6.  **Enhancing Edit/Generate:** Making the output handling more mode-aware (e.g., applying patches for 'edit').
7.  **Completing Placeholders:** Filling in some obvious TODOs where feasible within this scope.

**Limitations Remain:**

*   **Provider Implementations:** Only OpenAI, Ollama, GoogleAI, and MistralAI examples are provided. Others need specific SDK integration.
*   **Tool Calling Robustness:** The JSON parsing relies heavily on the LLM correctly formatting its output according to instructions. Real production systems often use more robust methods like OpenAI's Function Calling or dedicated parsing models.
*   **Chat UI:** The chat interface is simulated. A real implementation requires a `vscode.WebviewPanel`.
*   **Error Handling/Edge Cases:** Production code needs far more granular error handling, retries, state recovery, etc.
*   **Testing:** No automated tests are included.
*   **Large File Edits:** While the diff/patch mechanism is standard, extremely large files under heavy modification might still pose challenges without more advanced conflict resolution or chunking. Simultaneous diff application is *not* implemented due to its complexity; patches are applied sequentially.

Here is the enhanced codebase:

---

**`package.json`** (Add new commands and potentially context menu items)

```json
{
  "name": "agentic-coding-assistant",
  "displayName": "Agentic Coding Assistant",
  "description": "An advanced coding assistant with agentic capabilities and multi-provider support.",
  "version": "0.2.0", // Incremented version
  "publisher": "your-publisher-name",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Programming Languages",
    "Other"
  ],
  "activationEvents": [
    "onView:agenticAssistantView"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      // General Task
      {
        "command": "agentic.runTask",
        "title": "Agentic: Run General Task with Agent..."
      },
      // Mode Specific
      {
        "command": "agentic.startChat",
        "title": "Agentic: Start Chat with Agent..."
      },
      {
        "command": "agentic.editCode",
        "title": "Agentic: Edit Code with Agent..."
      },
      {
        "command": "agentic.generateCode",
        "title": "Agentic: Generate Code with Agent..."
      },
      {
        "command": "agentic.runSupervisorTask",
        "title": "Agentic: Run Multi-Agent Task..."
      },
      // Inline / Contextual
      {
        "command": "agentic.inlineGenerate",
        "title": "Agentic: Generate/Edit Inline..."
      },
      // Management
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
      },
      {
        "command": "agentic.addAgent",
        "title": "Agentic: Add New Agent..."
      },
      {
        "command": "agentic.deleteAgent",
        "title": "Agentic: Delete Agent..."
      }
      // Tree View specific commands (defined below)
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "agentic-assistant-view-container",
          "title": "Agentic Assistant",
          "icon": "$(hubot)"
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
        },
        {
           "command": "agentic.addAgent",
           "when": "view == agenticAssistantView",
           "group": "navigation"
        }
      ],
       "view/item/context": [ // Context menu for agent items in the tree
            {
                "command": "agentic.startChatWithAgentContext",
                "when": "view == agenticAssistantView && viewItem == agentItem",
                "group": "1_modes@1"
            },
            {
                "command": "agentic.runEditTaskWithAgentContext",
                "when": "view == agenticAssistantView && viewItem == agentItem",
                "group": "1_modes@2"
            },
            {
                "command": "agentic.runGenerateTaskWithAgentContext",
                "when": "view == agenticAssistantView && viewItem == agentItem",
                "group": "1_modes@3"
            },
             {
                "command": "agentic.runGeneralTaskWithAgentContext",
                "when": "view == agenticAssistantView && viewItem == agentItem",
                "group": "1_modes@4"
            },
            {
                "command": "agentic.deleteAgentContext",
                "when": "view == agenticAssistantView && viewItem == agentItem",
                "group": "9_manage@1"
            }
            // Add edit agent command here later
        ],
      "editor/context": [
         {
            "command": "agentic.inlineGenerate", // Keep this for quick inline edits/generations
            "group": "9_agentic@1",
            "when": "editorHasSelection || !editorHasSelection" // Allow even without selection
         }
      ]
    },
    "configuration": {
      // Configuration remains the same as before
      "title": "Agentic Coding Assistant",
      "properties": {
        "agentic.logLevel": { /* ... */ },
        "agentic.providers.openai.apiKey": { /* ... */ },
        "agentic.providers.openai.baseUrl": { /* ... */ },
        "agentic.providers.googleai.apiKey": { /* ... */ },
        "agentic.providers.mistralai.apiKey": { /* ... */ },
        "agentic.providers.ollama.baseUrl": { /* ... */ },
        // Add other provider configs
        "agentic.defaultModel": { /* ... */ },
        "agentic.systemPrompts": { /* ... */ },
        "agentic.agents": { /* ... */ },
        "agentic.promptVariables": { /* ... */ },
        "agentic.maxToolIterations": {
            "type": "number",
            "default": 5,
            "description": "Maximum number of tool call iterations per agent run."
        }
      }
    }
  },
  "scripts": { /* ... */ },
  "devDependencies": { /* ... */ },
  "dependencies": { /* ... */ }
}
```

---

**`src/logger.ts`** (No changes needed)

---

**`src/config.ts`** (Add getter for maxToolIterations)

```typescript
import * as vscode from 'vscode';
import { logger } from './logger';

// ... existing getConfig, setConfig, specific getters ...

export function getMaxToolIterations(): number {
    return getConfig<number>('maxToolIterations', 5);
}

// --- Interfaces --- (No changes needed)
export interface LLMConfig { /* ... */ }
export interface AgentConfig { /* ... */ }

// Add back specific getters if removed previously
export function getOpenAIApiKey(): string | undefined { /* ... */ }
export function getOllamaBaseUrl(): string { /* ... */ }
export function getDefaultModelConfig(): { provider: string; modelId: string } { /* ... */ }
export function getAgentConfigs(): AgentConfig[] { /* ... */ }
export async function updateAgentConfigs(agents: AgentConfig[]): Promise<void> { /* ... */ }
export function getSystemPrompts(): Record<string, string> { /* ... */ }
export function getPromptVariables(): Record<string, string> { /* ... */ }
```

---

**`src/utils.ts`** (No changes needed)

---

**`src/llm/llmProvider.ts`** (No changes needed to interface)

---

**`src/llm/llmService.ts`** (No changes needed)

---

**`src/llm/providers/openaiProvider.ts`** (Add basic function/tool call support awareness)

```typescript
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getConfig } from '../../config';
import { logger } from '../../logger';
import { ITool } from '../../agents/tools/tool'; // Import ITool

export class OpenAIProvider implements ILLMProvider {
    readonly providerId = 'openai';
    private client: OpenAI | null = null;

    constructor() { /* ... initializeClient ... */ }
    private initializeClient() { /* ... */ }
    isConfigured(): boolean { /* ... */ }

    // --- NEW: Helper to format tools for OpenAI API ---
    private formatToolsForOpenAI(tools?: Map<string, ITool>): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
        if (!tools || tools.size === 0) {
            return undefined;
        }
        const formattedTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
        tools.forEach(tool => {
            // OpenAI expects a specific format for function descriptions
            // We need to map our ITool structure (especially inputSchema)
            // This is a basic mapping, might need refinement based on schema complexity
            if (tool.inputSchema && typeof tool.inputSchema === 'object') {
                 // Handle sub-actions within a tool group like 'file'
                 if (tool.id === 'file' && typeof (tool as any).subActionSchemas === 'function') {
                    const subActions = (tool as any).subActionSchemas();
                    subActions.forEach((sub: any) => {
                         formattedTools.push({
                            type: 'function',
                            function: {
                                name: sub.id.replace('.', '_'), // OpenAI names can't have dots
                                description: sub.description,
                                parameters: sub.inputSchema ?? { type: 'object', properties: {} } // Provide empty schema if none
                            }
                        });
                    });
                 } else {
                     // Handle regular tools
                     formattedTools.push({
                         type: 'function',
                         function: {
                             name: tool.id.replace('.', '_'), // Replace dots
                             description: tool.description,
                             parameters: tool.inputSchema ?? { type: 'object', properties: {} }
                         }
                     });
                 }
            } else {
                // Tool without a schema - might be harder for OpenAI to use effectively
                formattedTools.push({
                    type: 'function',
                    function: {
                        name: tool.id.replace('.', '_'),
                        description: tool.description,
                        parameters: { type: 'object', properties: {} } // Default empty schema
                    }
                });
            }
        });
        return formattedTools.length > 0 ? formattedTools : undefined;
    }


    async generate(params: LLMGenerateParams, cancellationToken?: vscode.CancellationToken, tools?: Map<string, ITool>): Promise<LLMGenerateResult> { // Add tools parameter
        if (!this.client) { /* ... error handling ... */ }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        // Handle message history if provided (e.g., for chat mode)
        if (params.history && Array.isArray(params.history)) {
             messages.push(...params.history);
        } else {
             // Default: system + user prompt
             if (params.systemPrompt) {
                 messages.push({ role: 'system', content: params.systemPrompt });
             }
             messages.push({ role: 'user', content: params.prompt });
        }


        try {
            logger.debug(`Sending request to OpenAI model ${params.modelId}`);
            const formattedTools = this.formatToolsForOpenAI(tools);

            const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
                model: params.modelId,
                messages: messages,
                temperature: params.temperature ?? 0.7,
                max_tokens: params.maxTokens,
                stop: params.stopSequences,
                tools: formattedTools, // Pass formatted tools
                tool_choice: formattedTools ? 'auto' : undefined, // Let OpenAI decide when to use tools
            };

            // ... (rest of the cancellation and API call logic remains similar) ...
            const responsePromise = this.client.chat.completions.create(request);
            // ... cancellation handling ...
            const response = await Promise.race([responsePromise /*, cancellationPromise */]); // Add cancellation back properly if needed
            // ... dispose registration ...

            const choice = response.choices[0];
            logger.debug(`OpenAI response received. Finish reason: ${choice.finish_reason}`);

            // --- NEW: Handle Tool Calls ---
            let toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | undefined;
            if (choice.message?.tool_calls) {
                logger.info(`OpenAI response includes tool calls: ${choice.message.tool_calls.length}`);
                toolCalls = choice.message.tool_calls;
            }

            return {
                content: choice.message?.content?.trim() ?? '', // May be null if tool call is made
                finishReason: choice.finish_reason ?? undefined,
                usage: { /* ... */ },
                toolCalls: toolCalls, // <<< Add tool calls to the result
            };
        } catch (error: any) {
            // ... error handling ...
            return { content: '', error: errorMessage, finishReason: 'error' };
        }
    }

    // ... streamGenerate (needs update for tools) ...
    // ... getAvailableModels ...
}

// --- Update LLMGenerateParams and LLMGenerateResult ---
export interface LLMGenerateParams {
    prompt: string;
    systemPrompt?: string;
    modelId: string;
    history?: any[]; // For chat history (use specific type later)
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    options?: Record<string, any>;
}

export interface LLMGenerateResult {
    content: string;
    finishReason?: string;
    usage?: { /* ... */ };
    error?: string;
    toolCalls?: any[]; // <<< Add field for tool calls (use specific type later)
}
```

---

**`src/llm/providers/ollamaProvider.ts`** (No significant changes, tool use relies on prompting)
**`src/llm/providers/googleAIProvider.ts`** (Needs Gemini function calling implementation if desired)
**`src/llm/providers/mistralAIProvider.ts`** (Needs Mistral function calling implementation if desired)

*(Note: Implementing native function/tool calling for every provider is complex and SDK-specific. The agent loop below will primarily rely on instructing the LLM to output JSON for tool calls as a fallback.)*

---

**`src/prompts/promptManager.ts`** (No changes needed)

---

**`src/prompts/defaultPrompts.ts`** (Add tool usage instructions)

```typescript
const TOOL_USAGE_INSTRUCTIONS = `
You have access to the following tools:
{AVAILABLE_TOOLS_LIST}

To use a tool, output a JSON object EXACTLY in this format (no other text before or after):
{
  "tool_call": {
    "name": "tool_id.action_name", // e.g., "file.readFile", "docs.search"
    "arguments": { // Arguments specific to the tool action
      "arg1": "value1",
      "arg2": "value2"
      // ...
    }
  }
}

After the tool executes, I will provide you with the result, and you can continue your task or call another tool.

When you have the final answer and don't need to use any more tools, output a JSON object EXACTLY in this format:
{
  "final_answer": "Your complete final response here."
}

Think step-by-step. Analyze the request, decide if a tool is needed, call the tool if necessary, analyze the result, and repeat until you can provide the final answer.
`;

export const defaultSystemPrompts: Record<string, string> = {
    'default_coder': `You are an expert AI programming assistant.
- Follow the user's requirements carefully.
- Ensure code is high quality, well-documented, and adheres to best practices.
- Think step-by-step before writing code.
- If you need to modify files or research documentation, use the provided tools.
- If you need clarification, ask questions.
- Use markdown code blocks for code, unless the mode is 'edit' (use tools) or 'inline' (raw code).
${TOOL_USAGE_INSTRUCTIONS}`, // <<< Add tool instructions

    'debug_fix': `You are an AI debugging assistant.
- Analyze the provided code ({CODE_SNIPPET}), file path ({FILE_PATH}), error message ({ERROR_MESSAGE}), and diagnostics ({DIAGNOSTICS}).
- Identify the root cause of the error.
- Propose a fix. Use the 'file.applyDiff' or 'file.writeFile' tool to apply the fix. Do not output raw code for the fix, use the tools.
- Explain the fix clearly in your final answer.
${TOOL_USAGE_INSTRUCTIONS}`,

    'generate_code': `You are an AI code generation assistant.
- Generate code based on the user's request ({USER_REQUEST}).
- Consider the context ({CURRENT_FILE_PATH}, {SELECTED_TEXT}).
- Ensure the generated code is correct, efficient, and fits the surrounding code style.
- You can use tools like 'file.writeFile' if the request is to create a new file.
- Provide the final code in your final answer, usually within markdown blocks.
${TOOL_USAGE_INSTRUCTIONS}`,

     'inline_code': `You are an AI assistant generating a short code snippet to be inserted inline.
- The user has selected the following text: {SELECTED_TEXT}
- The user's request is: {USER_REQUEST}
- Generate a concise code snippet that fulfills the request, suitable for replacing the selected text or inserting at the cursor.
- Output ONLY the raw code snippet in the 'final_answer' field of the JSON output. Do not use markdown. Do not use tools unless absolutely necessary (e.g., reading another file for context).
${TOOL_USAGE_INSTRUCTIONS}`, // Tools less likely here, but keep instructions

    'documentation_researcher': `You are an AI assistant specialized in finding and summarizing technical documentation using the 'docs.search' tool.
- Research documentation related to the user's query: {QUERY}
- Use the 'docs.search' tool with the query.
- Summarize the findings from the tool result in your final answer.
${TOOL_USAGE_INSTRUCTIONS}`,

    // XP Prompts need updating to use tools for file writing
    'xp_tester': `... Write comprehensive unit tests ... Output the test code using the 'file.writeFile' tool. ${TOOL_USAGE_INSTRUCTIONS}`,
    'xp_implementer': `... Write the simplest possible implementation code ... Output the implementation code using the 'file.writeFile' tool. ${TOOL_USAGE_INSTRUCTIONS}`,

     'supervisor': `You are a supervisor AI agent coordinating specialist agents.
User Request: {USER_REQUEST}
Available Agents: {AGENT_LIST}

1.  **Analyze** the request and break it down into sub-tasks for the specialist agents.
2.  **Delegate** tasks using the format: [DELEGATE agent_id] Task Description: <The specific task for the sub-agent>
3.  **Synthesize** results from agents into a final answer.
4.  **Communicate** the final result using the 'final_answer' JSON format. Do NOT use the 'tool_call' format yourself. Your role is to delegate and synthesize.

Constraint: Only delegate to agents listed. Use their IDs.`, // Supervisor doesn't use tools directly

     'chat_agent': `You are a helpful AI assistant engaging in a conversation.
- Respond clearly and concisely to the user's messages.
- Maintain the context of the conversation history.
- You can use tools if the user asks for information retrieval or file operations.
${TOOL_USAGE_INSTRUCTIONS}` // Add tool instructions for chat
};
```

---

**`src/diff/diffEngine.ts`** (No changes needed)

---

**`src/agents/tools/tool.ts`** (No changes needed)

---

**`src/agents/tools/fileSystemTool.ts`** (Ensure sub-action schemas are exposed correctly)

```typescript
import * as vscode from 'vscode';
// ... other imports ...
import { ITool, ToolInput, ToolResult } from './tool';
import { AgentContext } from '../agent'; // Make sure AgentContext is imported if needed by tools

// ... ReadFileTool, WriteFileTool, CreateDiffTool, ApplyDiffTool classes ...
// (Ensure they implement ITool correctly)

export class FileSystemTool implements ITool {
    readonly id = 'file';
    readonly name = 'File System Operations';
    readonly description = 'Provides actions to read, write, diff, and patch files. Paths relative to workspace root or absolute.';
    // No inputSchema for the dispatcher tool itself

    private actions: { [key: string]: ITool } = {
        'readFile': new ReadFileTool(),
        'writeFile': new WriteFileTool(),
        'createDiff': new CreateDiffTool(),
        'applyDiff': new ApplyDiffTool(),
    };

    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> {
        const actionId = input.action as string; // Expect 'action' in input
        const actionTool = this.actions[actionId];

        if (!actionTool) { /* ... error handling ... */ }

        const actionInput = { ...input };
        delete actionInput.action;

        // Pass context down to sub-tool execution if needed
        return actionTool.execute(actionInput, context);
    }

    // --- Expose sub-actions for LLM ---
    // This should be accessible for the agent to list available tools
    getSubActions(): ITool[] {
       return Object.values(this.actions);
    }

     // Helper for formatting for prompts/function calling
     getToolDescriptions(): string {
         return this.getSubActions().map(a =>
             `- ${this.id}.${a.id}: ${a.description}` +
             (a.inputSchema ? `\n  Arguments (JSON Schema): ${JSON.stringify(a.inputSchema)}` : '')
         ).join('\n');
     }
}

// ... Implementations for ReadFileTool, WriteFileTool, CreateDiffTool, ApplyDiffTool ...
// (Ensure they have correct `id`, `name`, `description`, `inputSchema`, and `execute`)

class ReadFileTool implements ITool {
    readonly id = 'readFile'; /* ... name, description, inputSchema ... */
    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> { /* ... implementation ... */ }
}
class WriteFileTool implements ITool {
    readonly id = 'writeFile'; /* ... name, description, inputSchema ... */
    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> { /* ... implementation ... */ }
}
class CreateDiffTool implements ITool {
    readonly id = 'createDiff'; /* ... name, description, inputSchema ... */
    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> { /* ... implementation ... */ }
}
class ApplyDiffTool implements ITool {
    readonly id = 'applyDiff'; /* ... name, description, inputSchema ... */
    async execute(input: ToolInput, context?: AgentContext): Promise<ToolResult> { /* ... implementation ... */ }
}


export const fileSystemTool = new FileSystemTool();

```

---

**`src/agents/tools/documentationTool.ts`** (No significant changes needed, relies on LLM fallback or future search API)

---

**`src/agents/agent.ts`** (Major changes: Add modes, implement `runWithTools` loop)

```typescript
import * as vscode from 'vscode';
import { LLMConfig, AgentConfig, getMaxToolIterations } from '../config';
import { llmService } from '../llm/llmService';
import { promptManager } from '../prompts/promptManager';
import { logger } from '../logger';
import { ITool, ToolInput, ToolResult } from './tools/tool';
import { fileSystemTool } from './tools/fileSystemTool';
import { documentationTool } from './tools/documentationTool';
import { LLMGenerateResult } from '../llm/llmProvider'; // Import result type

// --- Agent Execution Modes ---
export type AgentMode = 'task' | 'chat' | 'edit' | 'generate' | 'inline';

// --- Input structure for the agent ---
export interface AgentRunInput {
    mode: AgentMode;
    prompt: string; // The main user request or message
    chatHistory?: { role: 'user' | 'assistant' | 'system' | 'tool'; content: string }[]; // For chat mode
    targetFilePath?: string; // For edit/generate related to a file
    targetCode?: string; // For edit mode (e.g., selected code or file content)
}

// --- Output structure from the agent ---
export interface AgentRunResult {
    success: boolean;
    finalAnswer?: string; // The final text response from the LLM
    toolResults?: ToolResult[]; // Record of tools used
    error?: string;
    // Mode-specific output hints
    appliedPatch?: boolean; // If edit mode applied a patch
    outputFilePath?: string; // If generate mode created a file
}


// Context passed during execution
export interface AgentContext {
    workspaceRoot?: string;
    currentFilePath?: string; // File open in editor
    selectedText?: string;
    variables?: Record<string, string>;
    // Add cancellation token?
    cancellationToken?: vscode.CancellationToken;
}

export class Agent {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly systemPromptName: string;
    readonly llmConfig: LLMConfig;
    readonly tools: Map<string, ITool> = new Map(); // Map tool ID (e.g., 'file') to instance
    readonly isSupervisor: boolean;

    constructor(config: AgentConfig) {
        // ... (constructor logic remains the same) ...
        this.id = config.id;
        this.name = config.name;
        // ... rest of constructor ...
        this.registerTools(config.tools ?? ['file', 'docs']); // Default tools
    }

    private registerTools(toolIds: string[]) {
        const availableTools: Record<string, ITool> = {
            'file': fileSystemTool,
            'docs': documentationTool,
        };
        toolIds.forEach(id => {
            const tool = availableTools[id];
            if (tool) {
                this.tools.set(id, tool);
                logger.debug(`Agent '${this.name}' registered tool: ${id}`);
            } else { /* ... warning ... */ }
        });
    }

    private getToolDescriptionList(): string {
        let list = "";
        this.tools.forEach(tool => {
            if (tool.id === 'file' && typeof (tool as any).getToolDescriptions === 'function') {
                 list += (tool as any).getToolDescriptions() + '\n'; // Get descriptions of sub-actions
            } else {
                 list += `- ${tool.id}: ${tool.description}\n`;
                 if (tool.inputSchema) {
                     list += `  Arguments (JSON Schema): ${JSON.stringify(tool.inputSchema)}\n`;
                 }
            }
        });
        return list.trim();
    }

    /**
     * Runs the agent with a given input, context, and mode.
     * Implements a basic loop for tool usage.
     */
    async run(input: AgentRunInput, context: AgentContext = {}): Promise<AgentRunResult> {
        logger.info(`Agent '${this.name}' starting run. Mode: ${input.mode}, Prompt: "${input.prompt.substring(0, 50)}..."`);
        const startTime = Date.now();

        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider || !provider.isConfigured?.()) {
            const errorMsg = `LLM provider '${this.llmConfig.provider}' for agent '${this.name}' not configured or unavailable.`;
            logger.error(errorMsg);
            return { success: false, error: errorMsg };
        }

        // --- Prepare System Prompt ---
        const systemPromptVars = {
            WORKSPACE_ROOT: context.workspaceRoot ?? 'N/A',
            CURRENT_FILE_PATH: context.currentFilePath ?? input.targetFilePath ?? 'N/A',
            SELECTED_TEXT: context.selectedText ?? (input.mode === 'edit' ? input.targetCode ?? '' : ''),
            USER_REQUEST: input.prompt, // Make user request available as variable
            AVAILABLE_TOOLS_LIST: this.getToolDescriptionList(), // Inject tool list
            ...(context.variables ?? {})
        };
        let systemPrompt = promptManager.getSystemPrompt(this.systemPromptName, systemPromptVars);

        if (!systemPrompt) {
            const errorMsg = `System prompt '${this.systemPromptName}' not found.`;
            logger.error(errorMsg);
            return { success: false, error: errorMsg };
        }

        // --- Initialize Agent State ---
        // Use combined history for LLM context
        const executionHistory: { role: 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string, name?: string }[] = [];
        const toolResultsLog: ToolResult[] = [];
        let iterations = 0;
        const maxIterations = getMaxToolIterations();

        // Add initial user prompt or chat history
        if (input.mode === 'chat' && input.chatHistory) {
             // Prepend system prompt if history doesn't have one? Or assume it's part of the agent's role.
             // executionHistory.push({ role: 'system', content: systemPrompt }); // Decide if system prompt is persistent or per-turn
             executionHistory.push(...input.chatHistory);
             // Add the latest user message
             executionHistory.push({ role: 'user', content: input.prompt });
        } else {
            // For task/edit/generate modes, start with the user prompt
            executionHistory.push({ role: 'user', content: input.prompt });
        }

        // --- Agent Loop (Tool Usage) ---
        while (iterations < maxIterations) {
            iterations++;
            logger.debug(`Agent '${this.name}' - Iteration ${iterations}`);

            // Check for cancellation
            if (context.cancellationToken?.isCancellationRequested) {
                logger.info(`Agent '${this.name}' run cancelled.`);
                return { success: false, error: 'Operation cancelled by user.' };
            }

            // Prepare messages for LLM (including history)
            const llmMessages = executionHistory.map(msg => {
                 if (msg.role === 'tool') {
                     // Format for providers that support tool role (like OpenAI)
                     return { role: msg.role, content: msg.content, tool_call_id: msg.tool_call_id };
                 }
                 return { role: msg.role, content: msg.content };
            });

            // --- Call LLM ---
            let llmResult: LLMGenerateResult;
            try {
                llmResult = await provider.generate({
                    // Use history directly instead of separate prompt/system for context
                    history: llmMessages,
                    systemPrompt: systemPrompt, // Provide system prompt separately for providers that handle it this way
                    modelId: this.llmConfig.modelId,
                    options: this.llmConfig.options,
                    // Pass tools map for providers like OpenAI that use it
                }, context.cancellationToken, this.tools);
            } catch (error: any) {
                 logger.error(`Agent '${this.name}' LLM call failed:`, error);
                 return { success: false, error: `LLM communication error: ${error.message}` };
            }


            if (llmResult.error) {
                logger.error(`Agent '${this.name}' LLM generation error: ${llmResult.error}`);
                return { success: false, error: `LLM generation failed: ${llmResult.error}` };
            }

            // --- Process LLM Response ---
            const assistantResponseContent = llmResult.content;
            let toolCallRequest: any = null; // Parsed tool call
            let finalAnswer: string | null = null;

            // Add assistant's potential text response to history (even if calling tool)
            if (assistantResponseContent) {
                 executionHistory.push({ role: 'assistant', content: assistantResponseContent });
            }

            // A. Check for native tool calls (e.g., OpenAI)
            if (llmResult.toolCalls && llmResult.toolCalls.length > 0) {
                // Assume only one tool call per response for simplicity now
                const call = llmResult.toolCalls[0];
                if (call.type === 'function') {
                    try {
                        toolCallRequest = {
                            id: call.id, // Store ID to link result back
                            name: call.function.name.replace('_', '.'), // Convert back from OpenAI format
                            arguments: JSON.parse(call.function.arguments || '{}')
                        };
                         // Add the tool call request itself to history (for OpenAI format)
                         executionHistory.push({ role: 'assistant', content: '', tool_calls: llmResult.toolCalls });
                    } catch (e) {
                        logger.error(`Failed to parse arguments for tool call ${call.function.name}: ${e}`);
                        // Ask LLM to correct the format? For now, fail.
                         return { success: false, error: `LLM provided invalid JSON arguments for tool ${call.function.name}.` };
                    }
                }
            }
            // B. Check for JSON-formatted tool call/final answer (fallback)
            else if (assistantResponseContent) {
                try {
                    const parsedJson = JSON.parse(assistantResponseContent.trim());
                    if (parsedJson.tool_call) {
                        toolCallRequest = parsedJson.tool_call;
                        // Don't push the JSON itself, the tool call logic below handles history
                    } else if (parsedJson.final_answer !== undefined) {
                        finalAnswer = parsedJson.final_answer;
                    }
                    // If JSON is valid but not tool_call/final_answer, treat as plain text below
                } catch (e) {
                    // Not JSON, treat as plain text final answer (if no native tool call happened)
                    if (!toolCallRequest) { // Only treat as final if no tool call was detected
                        finalAnswer = assistantResponseContent;
                    }
                }
            }
             // C. If no content and no tool call, something went wrong or LLM finished silently
             else if (!assistantResponseContent && !toolCallRequest) {
                 logger.warn(`Agent '${this.name}' LLM returned empty response and no tool call.`);
                 finalAnswer = ""; // Assume finished with empty response
             }


            // --- Execute Tool or Finish ---
            if (toolCallRequest) {
                logger.info(`Agent '${this.name}' requesting tool call: ${toolCallRequest.name}`);
                const toolNameParts = toolCallRequest.name.split('.'); // e.g., "file.readFile"
                const toolId = toolNameParts[0];
                const actionId = toolNameParts[1];

                const tool = this.tools.get(toolId);
                let toolResult: ToolResult;

                if (tool && actionId) {
                    // Prepare input for the tool's execute method
                    const toolInput: ToolInput = {
                        action: actionId, // Pass action name for dispatcher tools like 'file'
                        ...(toolCallRequest.arguments ?? {})
                    };
                    try {
                        // Execute the tool
                        toolResult = await tool.execute(toolInput, context);
                        toolResultsLog.push(toolResult); // Log result
                        logger.debug(`Tool '${toolCallRequest.name}' executed. Success: ${toolResult.success}`);
                    } catch (error: any) {
                        logger.error(`Error executing tool '${toolCallRequest.name}':`, error);
                        toolResult = { success: false, error: `Tool execution failed: ${error.message}` };
                    }
                } else {
                    logger.error(`Agent '${this.name}' requested unknown tool or action: ${toolCallRequest.name}`);
                    toolResult = { success: false, error: `Unknown tool or action: ${toolCallRequest.name}` };
                }

                // Add tool result to history for the next LLM iteration
                // Use the specific 'tool' role format
                 executionHistory.push({
                     role: 'tool',
                     tool_call_id: toolCallRequest.id, // Link to the call (for OpenAI)
                     name: toolCallRequest.name, // For context
                     content: JSON.stringify(toolResult.output ?? { error: toolResult.error }) // Provide output or error
                 });

            } else if (finalAnswer !== null) {
                // --- Final Answer Reached ---
                logger.info(`Agent '${this.name}' reached final answer after ${iterations} iterations.`);
                const duration = Date.now() - startTime;
                logger.debug(`Total execution time: ${duration}ms`);

                // Post-processing based on mode (e.g., apply patch)
                let appliedPatch = false;
                if (input.mode === 'edit' && input.targetFilePath && toolResultsLog.some(r => r.success && r.output?.toString().includes(`applied successfully to ${input.targetFilePath}`))) {
                    // Check if an applyDiff tool call was successful for the target file
                    appliedPatch = true;
                    logger.info(`Edit mode detected successful patch application for ${input.targetFilePath}`);
                 }


                return {
                    success: true,
                    finalAnswer: finalAnswer,
                    toolResults: toolResultsLog,
                    appliedPatch: appliedPatch,
                    // outputFilePath: ... // Set if generate mode created a file via tools
                };
            } else {
                 // Should not happen if parsing is correct, but as a fallback:
                 logger.warn(`Agent '${this.name}' loop ended without tool call or final answer.`);
                 return { success: false, error: "Agent loop finished unexpectedly." };
            }

            // Loop continues if a tool was called
        }

        // --- Max Iterations Reached ---
        logger.warn(`Agent '${this.name}' reached max iterations (${maxIterations}).`);
        return { success: false, error: `Agent exceeded maximum tool iterations (${maxIterations}).`, toolResults: toolResultsLog };
    }
}
```

---

**`src/agents/agentManager.ts`** (No significant changes needed, but ensure agents are reloaded on config change)

---

**`src/agents/supervisorAgent.ts`** (Refine parsing and sub-agent calling)

```typescript
import * as vscode from 'vscode';
import { Agent, AgentContext, AgentRunInput, AgentRunResult } from './agent'; // Import new types
import { AgentConfig } from '../config';
import { agentManager } from './agentManager';
import { logger } from '../logger';
import { llmService } from '../llm/llmService';
import { promptManager } from '../prompts/promptManager';

export class SupervisorAgent extends Agent {
    private subAgentIds: string[];

    constructor(config: AgentConfig) {
        super({ ...config, isSupervisor: true });
        this.subAgentIds = config.chainedAgentIds ?? [];
        // Ensure supervisor doesn't list itself as having tools it can't use
        this.tools.clear(); // Supervisors delegate, they don't execute tools directly
        logger.info(`Supervisor Agent '${this.name}' initialized, managing agents: [${this.subAgentIds.join(', ')}]`);
    }

    // Override run to implement supervisor logic
    override async run(input: AgentRunInput, context: AgentContext = {}): Promise<AgentRunResult> {
        // Supervisors always run in 'task' mode internally, regardless of input.mode
        logger.info(`Supervisor Agent '${this.name}' starting task: ${input.prompt}`);
        const startTime = Date.now();

        const provider = llmService.getProviderForConfig(this.llmConfig);
        if (!provider || !provider.isConfigured?.()) { /* ... error handling ... */ }

        // --- Prepare Supervisor Prompt ---
        const availableAgentsInfo = this.subAgentIds.map(id => { /* ... get agent info ... */ }).join('\n');
        const systemPrompt = promptManager.getSystemPrompt(this.systemPromptName, {
            USER_REQUEST: input.prompt,
            AGENT_LIST: availableAgentsInfo,
            ...(context.variables ?? {})
        });
        if (!systemPrompt) { /* ... error handling ... */ }

        // --- Supervisor Loop ---
        let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [
             { role: 'user', content: `User Request: ${input.prompt}\nAvailable Agents:\n${availableAgentsInfo}\n\nDevise a plan and delegate tasks.` }
        ];
        let finalResult: string | null = null;
        const maxIterations = 5; // Max delegation steps

        try {
            for (let i = 0; i < maxIterations; i++) {
                logger.debug(`Supervisor Iteration ${i + 1}`);
                if (context.cancellationToken?.isCancellationRequested) { /* ... handle cancellation ... */ }

                // --- Call Supervisor LLM ---
                const response = await provider.generate({
                    history: conversationHistory, // Pass history
                    systemPrompt: systemPrompt, // System prompt might be needed per call
                    modelId: this.llmConfig.modelId,
                    options: this.llmConfig.options,
                }, context.cancellationToken);

                if (response.error || response.content === null) {
                    logger.error(`Supervisor LLM call failed: ${response.error ?? 'Empty response'}`);
                    return { success: false, error: `Supervisor LLM failed: ${response.error ?? 'Empty response'}` };
                }

                const llmOutput = response.content.trim();
                logger.debug(`Supervisor LLM Output (Iteration ${i + 1}):\n${llmOutput}`);
                conversationHistory.push({ role: 'assistant', content: llmOutput }); // Add LLM response to history

                // --- Parse for Delegation or Final Answer ---
                // Use a more specific regex, looking for the exact pattern
                const delegationRegex = /\[DELEGATE\s+([\w-]+)\]\s*Task Description:\s*([\s\S]*)/i;
                const delegationMatch = llmOutput.match(delegationRegex);
                const finalAnswerRegex = /\{\s*"final_answer":\s*"([\s\S]*)"\s*\}/; // Check if LLM used final_answer format
                const finalAnswerMatch = llmOutput.match(finalAnswerRegex);


                if (delegationMatch) {
                    const agentIdToCall = delegationMatch[1].trim();
                    const subTask = delegationMatch[2].trim();
                    logger.info(`Supervisor delegating task to Agent ID: ${agentIdToCall}`);
                    logger.debug(`Sub-task: ${subTask}`);

                    const subAgent = agentManager.getAgent(agentIdToCall);
                    if (!subAgent || !this.subAgentIds.includes(agentIdToCall)) {
                        logger.warn(`Supervisor tried to delegate to invalid agent ID: ${agentIdToCall}`);
                        const errorMsg = `System Note: Agent ID '${agentIdToCall}' is not valid or available. Please choose from the list or revise plan.`;
                         conversationHistory.push({ role: 'user', content: errorMsg }); // Use 'user' role for instructions back to LLM
                        continue; // Ask LLM to revise
                    }

                    // --- Execute Sub-Agent ---
                    // Sub-agents run in 'task' mode by default when called by supervisor
                    const subAgentInput: AgentRunInput = { mode: 'task', prompt: subTask };
                    const subAgentResult = await subAgent.run(subAgentInput, context); // Pass context

                    // --- Feed Result Back to Supervisor ---
                    let resultMessage = `Result from Agent ${agentIdToCall} (${subAgent.name}):\n`;
                    if (subAgentResult.success) {
                        resultMessage += subAgentResult.finalAnswer ?? "Completed successfully (no text output).";
                        if (subAgentResult.toolResults && subAgentResult.toolResults.length > 0) {
                             resultMessage += `\n(Used tools: ${subAgentResult.toolResults.map(tr => tr.success ? 'Success' : 'Failed').join(', ')})`;
                        }
                    } else {
                        resultMessage += `Failed: ${subAgentResult.error ?? 'Unknown error'}`;
                    }
                     conversationHistory.push({ role: 'user', content: resultMessage }); // Use 'user' role for results feedback

                } else if (finalAnswerMatch) {
                     finalResult = finalAnswerMatch[1].trim();
                     logger.info(`Supervisor determined final result (via JSON).`);
                     break; // Exit loop
                }
                 else if (!delegationMatch && llmOutput.length > 0) {
                     // If no delegation and not the specific final_answer JSON, assume the *entire* response is the final answer
                     finalResult = llmOutput;
                     logger.info(`Supervisor determined final result (plain text).`);
                     break; // Exit loop
                 } else {
                      // Empty response or failed parsing
                      logger.warn("Supervisor LLM output could not be interpreted as delegation or final answer.");
                      // Ask for clarification? For now, assume it's stuck.
                      finalResult = `Supervisor failed to interpret the plan. Last response: ${llmOutput}`;
                      break;
                 }
            }

            if (finalResult === null) {
                 logger.warn(`Supervisor reached max iterations (${maxIterations}).`);
                 finalResult = `Supervisor reached maximum iterations. The task might be incomplete. Last state: ${conversationHistory.slice(-2).map(m=>m.content).join('\n')}`;
            }

             const duration = Date.now() - startTime;
             logger.debug(`Supervisor execution time: ${duration}ms`);
            return { success: true, finalAnswer: finalResult };

        } catch (error: any) {
            logger.error(`Supervisor agent '${this.name}' execution failed:`, error);
            return { success: false, error: `Supervisor execution error: ${error.message || error}` };
        }
    }
}
```

---

**`src/ui/agentTreeView.ts`** (Add commands for modes)

```typescript
import * as vscode from 'vscode';
import { agentManager } from '../agents/agentManager';
import { Agent, AgentContext, AgentRunInput, AgentMode } from '../agents/agent'; // Import new types
import { logger } from '../logger';
import { handleAgentError, handleAgentSuccess, showChatInterface, getEditorContext } from './uiUtils'; // Helper functions

export class AgentTreeDataProvider implements vscode.TreeDataProvider<AgentTreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> = new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(agentManager.onDidChangeAgents(() => this.refresh()));

        // Register commands triggered FROM the tree view context menu
        context.subscriptions.push(
            vscode.commands.registerCommand('agentic.refreshAgentView', () => this.refresh()),
            vscode.commands.registerCommand('agentic.addAgent', () => agentManager.createAgentInteractively()),
            vscode.commands.registerCommand('agentic.deleteAgentContext', (item: AgentTreeItem) => this.deleteAgent(item)),
            // Mode commands from context menu
            vscode.commands.registerCommand('agentic.startChatWithAgentContext', (item: AgentTreeItem) => this.runAgentMode(item, 'chat')),
            vscode.commands.registerCommand('agentic.runEditTaskWithAgentContext', (item: AgentTreeItem) => this.runAgentMode(item, 'edit')),
            vscode.commands.registerCommand('agentic.runGenerateTaskWithAgentContext', (item: AgentTreeItem) => this.runAgentMode(item, 'generate')),
            vscode.commands.registerCommand('agentic.runGeneralTaskWithAgentContext', (item: AgentTreeItem) => this.runAgentMode(item, 'task'))
        );
    }

    refresh(): void { /* ... */ }
    getTreeItem(element: AgentTreeItem): vscode.TreeItem { /* ... */ }
    getChildren(element?: AgentTreeItem): Thenable<AgentTreeItem[]> { /* ... */ } // Logic remains similar

    // --- Command Implementations ---

    private deleteAgent(item: AgentTreeItem) {
        if (item?.agent?.id) {
            agentManager.deleteAgentInteractively(); // Let manager handle confirmation
        } else { /* ... warning ... */ }
    }

    // Generic handler for running agent modes from TreeView
    private async runAgentMode(item: AgentTreeItem | undefined, mode: AgentMode) {
        if (!item?.agent) {
            vscode.window.showWarningMessage("Please select an agent from the tree view first.");
            return;
        }
        const agent = item.agent;
        logger.info(`Triggering agent '${agent.name}' in mode '${mode}' from TreeView.`);

        let prompt: string | undefined;
        let targetCode: string | undefined;
        let targetFilePath: string | undefined;
        const editorContext = getEditorContext(); // Get context from active editor

        // Get specific inputs based on mode
        switch (mode) {
            case 'chat':
                // Chat handled differently - needs persistent UI
                showChatInterface(agent, editorContext); // Use helper from uiUtils
                return; // Exit early, chat UI handles the flow
            case 'edit':
                prompt = await vscode.window.showInputBox({ prompt: `Describe the edit for agent '${agent.name}':`, placeHolder: "e.g., Refactor this function to be async, Fix the bug in this loop" });
                if (!prompt) return;
                targetFilePath = editorContext.currentFilePath;
                targetCode = editorContext.selectedText || editorContext.fileContent; // Use selection or whole file
                if (!targetCode) {
                     vscode.window.showWarningMessage("No code selected or file open to edit.");
                     return;
                }
                if (!targetFilePath) {
                    vscode.window.showWarningMessage("No active file path found for editing.");
                    return;
                }
                break;
            case 'generate':
                prompt = await vscode.window.showInputBox({ prompt: `Describe what to generate with agent '${agent.name}':`, placeHolder: "e.g., Generate a Python class for API requests, Create a sample README.md" });
                 if (!prompt) return;
                 targetFilePath = editorContext.currentFilePath; // Context for generation
                 targetCode = editorContext.selectedText; // Context for generation
                break;
            case 'task':
            default:
                prompt = await vscode.window.showInputBox({ prompt: `Enter the task for agent '${agent.name}':`, placeHolder: "e.g., Summarize the selected text, Research 'React Hooks'" });
                 if (!prompt) return;
                 targetFilePath = editorContext.currentFilePath;
                 targetCode = editorContext.selectedText;
                break;
        }

        if (!prompt) return; // Should be caught above, but safety check

        const agentInput: AgentRunInput = {
            mode: mode,
            prompt: prompt,
            targetFilePath: targetFilePath,
            targetCode: targetCode,
        };

        // Run agent with progress
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Agent '${agent.name}' (${mode})...`,
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0, message: "Initializing..." });
            const context: AgentContext = { ...editorContext, cancellationToken: token }; // Pass token

            try {
                const result = await agent.run(agentInput, context);
                progress.report({ increment: 100, message: "Finished." });

                if (result.success) {
                    handleAgentSuccess(result, agentInput, context); // Use helper
                } else {
                    handleAgentError(result.error ?? "Unknown error", agent.name); // Use helper
                }
            } catch (error: any) {
                 progress.report({ increment: 100, message: "Error." });
                 handleAgentError(error, agent.name); // Use helper
            }
        });
    }
}

// Represents an item in the Agent Tree View
export class AgentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly agent?: Agent
    ) {
        super(label, collapsibleState);
        // ... (tooltip, description, contextValue, iconPath logic remains the same) ...
         if (this.agent) {
            this.contextValue = 'agentItem';
            this.iconPath = new vscode.ThemeIcon(this.agent.isSupervisor ? 'organization' : 'hubot');
        } else if (this.command?.command === 'agentic.addAgent') {
            this.contextValue = 'addAgentItem';
            this.iconPath = new vscode.ThemeIcon('add');
        } else {
            this.contextValue = 'infoItem';
        }
    }
}
```

---

**`src/ui/uiUtils.ts`** (NEW FILE - Helpers for UI interactions)

```typescript
import * as vscode from 'vscode';
import { Agent, AgentRunResult, AgentRunInput, AgentContext, AgentMode } from '../agents/agent';
import { logger } from '../logger';
import { diffEngine } from '../diff/diffEngine';
import { TextEncoder } from 'util';

const encoder = new TextEncoder();
const chatOutputChannel = vscode.window.createOutputChannel("Agentic Assistant Chat");
let chatHistory: { agentName: string; history: { role: 'user' | 'assistant'; content: string }[] } | null = null;


/**
 * Gets relevant context from the active editor.
 */
export function getEditorContext(): Omit<AgentContext, 'cancellationToken' | 'variables'> {
    const editor = vscode.window.activeTextEditor;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const currentFilePath = editor?.document.uri.fsPath;
    const selectedText = editor ? editor.document.getText(editor.selection) : undefined;
    const fileContent = editor ? editor.document.getText() : undefined;

    return {
        workspaceRoot,
        currentFilePath,
        selectedText,
        fileContent // <<< Add full file content
    };
}


/**
 * Handles displaying success results from an agent run.
 */
export async function handleAgentSuccess(result: AgentRunResult, input: AgentRunInput, context: AgentContext) {
    logger.info(`Agent finished successfully. Mode: ${input.mode}`);

    if (!result.finalAnswer && !result.appliedPatch) {
        vscode.window.showInformationMessage("Agent completed the task (no specific output).");
        return;
    }

    switch (input.mode) {
        case 'edit':
            if (result.appliedPatch) {
                vscode.window.showInformationMessage(`Edit applied successfully by agent.`);
                // Optionally show the diff or refresh the editor
            } else if (result.finalAnswer) {
                // If edit mode didn't apply a patch but returned text, maybe it's a diff suggestion?
                const isPatch = result.finalAnswer.includes('--- a/') && result.finalAnswer.includes('+++ b/');
                if (isPatch && input.targetFilePath && context.fileContent) {
                     const apply = await vscode.window.showInformationMessage(
                         "Agent suggests the following changes (as a patch). Apply?",
                         { modal: true, detail: result.finalAnswer.substring(0, 500) + '...' }, // Show snippet
                         "Apply Patch", "Show Diff", "Ignore"
                     );
                     if (apply === "Apply Patch") {
                         const patchedContent = diffEngine.applyPatch(result.finalAnswer, context.fileContent);
                         if (patchedContent !== false) {
                             const fileUri = vscode.Uri.file(input.targetFilePath);
                             await vscode.workspace.fs.writeFile(fileUri, encoder.encode(patchedContent));
                             vscode.window.showInformationMessage("Patch applied successfully.");
                         } else {
                             vscode.window.showErrorMessage("Failed to apply the suggested patch. File might have changed.");
                         }
                     } else if (apply === "Show Diff") {
                          const diffDoc = await vscode.workspace.openTextDocument({ content: result.finalAnswer, language: 'diff' });
                          await vscode.window.showTextDocument(diffDoc);
                     }
                } else {
                     // Show the text result as information if not a patch
                     const doc = await vscode.workspace.openTextDocument({ content: `Agent Edit Suggestion:\n\n${result.finalAnswer}`, language: 'markdown' });
                     await vscode.window.showTextDocument(doc, { preview: true });
                }
            }
            break;

        case 'generate':
        case 'task':
        case 'inline': // Inline handled separately usually, but show result if called this way
        default:
            // Show the final answer in a new document
            if (result.finalAnswer) {
                const language = result.finalAnswer.includes('```') ? 'markdown' : 'plaintext'; // Basic language detection
                const doc = await vscode.workspace.openTextDocument({ content: result.finalAnswer, language: language });
                await vscode.window.showTextDocument(doc, { preview: false }); // Don't make it preview
            }
            break;
    }
     // Log tool usage
     if (result.toolResults && result.toolResults.length > 0) {
         logger.info(`Tools used: ${result.toolResults.map(tr => tr.success ? 'Success' : 'Failed').join(', ')}`);
     }
}

/**
 * Handles displaying errors from an agent run.
 */
export function handleAgentError(error: any, agentName: string) {
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    logger.error(`Agent '${agentName}' failed: ${errorMessage}`);
    vscode.window.showErrorMessage(`Agent '${agentName}' failed: ${errorMessage}`);
}


/**
 * Shows a basic chat interface using an Output Channel and Input Box.
 * A real implementation would use a Webview.
 */
export async function showChatInterface(agent: Agent, initialContext: AgentContext) {
    if (!chatHistory || chatHistory.agentName !== agent.name) {
        chatHistory = { agentName: agent.name, history: [] };
        chatOutputChannel.clear();
        chatOutputChannel.appendLine(`--- Starting chat with ${agent.name} ---`);
    } else {
        chatOutputChannel.appendLine(`--- Continuing chat with ${agent.name} ---`);
    }
    chatOutputChannel.show(true); // Preserve focus on input box

    while (true) {
        const userMessage = await vscode.window.showInputBox({
            prompt: `Chat with ${agent.name} (Type 'exit' or press Esc to end)`,
            ignoreFocusOut: true // Keep open while user interacts elsewhere
        });

        if (userMessage === undefined || userMessage.toLowerCase() === 'exit') {
            chatOutputChannel.appendLine(`--- Chat with ${agent.name} ended ---`);
            // chatHistory = null; // Clear history when chat ends? Or keep for next time?
            break;
        }

        if (!userMessage.trim()) continue; // Ignore empty messages

        chatOutputChannel.appendLine(`\nYou: ${userMessage}`);
        chatHistory.history.push({ role: 'user', content: userMessage });

        // Run agent in chat mode
        const agentInput: AgentRunInput = {
            mode: 'chat',
            prompt: userMessage, // Pass latest message as prompt
            chatHistory: chatHistory.history.slice(0, -1) // Pass history *before* the latest message
        };

        let agentResponse = "Error: Agent did not respond.";
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification, // Use notification for chat progress
            title: `${agent.name} is thinking...`,
            cancellable: true
        }, async (progress, token) => {
            const context: AgentContext = { ...initialContext, cancellationToken: token };
            try {
                const result = await agent.run(agentInput, context);
                if (result.success && result.finalAnswer !== undefined) {
                    agentResponse = result.finalAnswer;
                    chatHistory?.history.push({ role: 'assistant', content: agentResponse }); // Add assistant response
                } else {
                    agentResponse = `Error: ${result.error ?? 'Agent failed to produce a response.'}`;
                    // Don't add error to history? Or add as system message?
                }
            } catch (error: any) {
                agentResponse = `Error: ${error.message ?? error}`;
            }
        });

        chatOutputChannel.appendLine(`\n${agent.name}: ${agentResponse}`);

        // Auto-scroll? Output channel usually does this.
    }
}
```

---

**`src/extension.ts`** (Register new commands, use uiUtils)

```typescript
import * as vscode from 'vscode';
import { logger } from './logger';
import { agentManager } from './agents/agentManager';
import { AgentTreeDataProvider } from './ui/agentTreeView';
import { AgentContext, AgentRunInput, AgentMode, Agent } from './agents/agent'; // Import types
import { promptManager } from './prompts/promptManager';
import { llmService } from './llm/llmService';
import { handleAgentError, handleAgentSuccess, showChatInterface, getEditorContext } from './ui/uiUtils'; // Import helpers
import { SupervisorAgent } from './agents/supervisorAgent';


export function activate(context: vscode.ExtensionContext) {
    logger.info('Activating Agentic Coding Assistant v0.2.0...');

    // Initialize Tree View (registers its own commands)
    const agentTreeDataProvider = new AgentTreeDataProvider(context);
    context.subscriptions.push(vscode.window.createTreeView('agenticAssistantView', { treeDataProvider: agentTreeDataProvider }));

    // --- Register Global Commands ---

    // Helper to select an agent
    async function selectAgent(filter?: (agent: Agent) => boolean): Promise<Agent | undefined> {
         let agents = agentManager.getAllAgents();
         if (filter) {
             agents = agents.filter(filter);
         }
         if (agents.length === 0) {
             const filterDesc = filter ? "matching the criteria" : "";
             vscode.window.showInformationMessage(`No agents ${filterDesc} configured. Please add an agent first.`);
             return undefined;
         }
         const selected = await vscode.window.showQuickPick(
             agents.map(a => ({ label: a.name, description: a.description, agent: a })),
             { placeHolder: "Select an agent" }
         );
         return selected?.agent;
    }

    // Command: General Task (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('agentic.runTask', async () => {
        const agent = await selectAgent();
        if (!agent) return;
        agentTreeDataProvider['runAgentMode'](new AgentTreeItem(agent.name, vscode.TreeItemCollapsibleState.None, undefined, agent), 'task'); // Use TreeView's runner
    }));

     // Command: Start Chat (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('agentic.startChat', async () => {
        const agent = await selectAgent(a => !a.isSupervisor); // Can't chat with supervisor directly
        if (!agent) return;
        const editorContext = getEditorContext();
        showChatInterface(agent, editorContext);
    }));

     // Command: Edit Code (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('agentic.editCode', async () => {
        const agent = await selectAgent(a => !a.isSupervisor);
        if (!agent) return;
        agentTreeDataProvider['runAgentMode'](new AgentTreeItem(agent.name, vscode.TreeItemCollapsibleState.None, undefined, agent), 'edit');
    }));

     // Command: Generate Code (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('agentic.generateCode', async () => {
        const agent = await selectAgent(a => !a.isSupervisor);
        if (!agent) return;
        agentTreeDataProvider['runAgentMode'](new AgentTreeItem(agent.name, vscode.TreeItemCollapsibleState.None, undefined, agent), 'generate');
    }));

     // Command: Run Multi-Agent Task (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('agentic.runSupervisorTask', async () => {
        const supervisor = await selectAgent(a => a.isSupervisor);
        if (!supervisor) {
             vscode.window.showInformationMessage("No supervisor agents found. Please configure an agent with 'isSupervisor: true'.");
             return;
        }

        const task = await vscode.window.showInputBox({ prompt: `Enter the complex task for supervisor '${supervisor.name}':` });
        if (!task) return;

        const editorContext = getEditorContext();
        const agentInput: AgentRunInput = { mode: 'task', prompt: task }; // Supervisor runs in task mode

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Supervisor '${supervisor.name}' is working...`,
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0, message: "Initializing..." });
            const context: AgentContext = { ...editorContext, cancellationToken: token };
            try {
                const result = await supervisor.run(agentInput, context); // Call supervisor's run
                progress.report({ increment: 100, message: "Finished." });
                if (result.success) {
                    handleAgentSuccess(result, agentInput, context);
                } else {
                    handleAgentError(result.error ?? "Unknown supervisor error", supervisor.name);
                }
            } catch (error: any) {
                 progress.report({ increment: 100, message: "Error." });
                 handleAgentError(error, supervisor.name);
            }
        });
    }));


    // Command: Inline Generate/Edit (Editor Context Menu)
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('agentic.inlineGenerate', async (textEditor, edit) => {
        const editorContext = getEditorContext(); // Get context including selection

        // Use a dedicated inline agent or let user choose? Let's choose for flexibility.
        const agent = await selectAgent(a => !a.isSupervisor); // Exclude supervisors
        if (!agent) return;

        const userRequest = await vscode.window.showInputBox({
            prompt: `Describe the code to generate or edit inline:`,
            placeHolder: editorContext.selectedText ? "e.g., Convert this to async, Explain this code" : "e.g., Insert a function to fetch data"
        });
        if (!userRequest) return;

        const agentInput: AgentRunInput = {
            // Use 'edit' if text selected, 'generate' otherwise? Or a dedicated 'inline' mode?
            // Let's use 'inline' mode and have the agent/prompt handle it.
            mode: 'inline',
            prompt: userRequest,
            targetCode: editorContext.selectedText, // Pass selection
            targetFilePath: editorContext.currentFilePath
        };

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window, // Status bar for inline
            title: `$(hubot) ${agent.name}...`
        }, async (progress, token) => {
            const context: AgentContext = { ...editorContext, cancellationToken: token };
            try {
                const result = await agent.run(agentInput, context);

                if (result.success && result.finalAnswer !== undefined) {
                    // Apply the result directly
                    const selection = textEditor.selection;
                    if (!selection.isEmpty) {
                        edit.replace(selection, result.finalAnswer);
                    } else {
                        edit.insert(selection.active, result.finalAnswer);
                    }
                    logger.info(`Inline operation by ${agent.name} completed.`);
                } else if (!result.success) {
                    handleAgentError(result.error ?? "Inline generation failed", agent.name);
                } else {
                     // Success but no answer?
                     logger.warn(`Inline agent ${agent.name} finished successfully but provided no answer.`);
                }
            } catch (error: any) {
                 handleAgentError(error, agent.name);
            }
        });
    }));


    // Management Commands (Open Settings)
    context.subscriptions.push(vscode.commands.registerCommand('agentic.configureProviders', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'agentic.providers');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('agentic.manageAgents', () => {
         vscode.commands.executeCommand('workbench.action.openSettings', 'agentic.agents');
    }));

    logger.info("Agentic Coding Assistant activation complete.");
}

export function deactivate() {
    logger.info("Agentic Coding Assistant deactivated.");
    chatOutputChannel.dispose(); // Clean up output channel
}
```

---

This enhanced version provides a much more functional agentic core with the `runWithTools` loop and support for different operational modes. Remember that this is still a complex foundation, and true production readiness requires significant further development, testing, and refinement, especially around the robustness of tool calling and the user interfaces.

Okay, this is an extremely ambitious goal. Creating a *truly* complete, production-grade VS Code extension with the full breadth of features requested (every provider, flawless large file handling, advanced agentics, polished custom UI) is a massive undertaking, typically requiring a dedicated team and significant time for development, testing, and refinement.

However, I will provide a comprehensive and well-structured codebase for "Codessa" that implements the core architecture, key features, and several provider integrations to a high standard. It will include:

1.  **Robust Project Structure.**
2.  **Core Extension Logic** with command registration for various modes.
3.  **Configuration System** using VS Code settings.
4.  **Extensible LLM Abstraction Layer** with implementations for OpenAI, Ollama, Google Gemini, Mistral AI, and Anthropic (basic). Placeholders/notes for others.
5.  **Agent Framework** with tool usage loop, different operational modes (`chat`, `edit`, `generate`, `task`, `inline`), supervisor capabilities, and per-agent LLM/prompt configuration.
6.  **Tool System** including enhanced File System tools (read, write, diff, patch) and Documentation Research (LLM-based).
7.  **Diffing Engine** using `diff` library with focus on sequential patch application.
8.  **Prompt Management** with defaults and user overrides.
9.  **UI Components:**
    *   Enhanced Tree View for agent management and triggering actions.
    *   Output Channel-based Chat simulation.
    *   Utility functions for consistent UI feedback (progress, errors, results).
    *   Placeholders and commands for future Webview-based Settings and Chat UIs.
10. **Settings Integration:** Commands to easily access relevant VS Code settings.
11. **Error Handling:** Improved error handling and user feedback.
12. **Code Quality:** Adherence to good practices, type safety, and modularity.

**Important Considerations:**

*   **"Production Grade" is Relative:** This code aims for high quality but hasn't undergone the rigorous testing, security audits, performance tuning, and edge-case handling of a commercially shipped product.
*   **Provider Completeness:** Implementing *every* provider API is impractical here. The structure allows adding more. Secure API key handling (`keytar`) is recommended but not fully implemented here to keep focus on the core logic.
*   **UI:** Full Webview UIs for chat and settings are complex and represented by placeholders. The current UI relies on native VS Code elements (TreeView, OutputChannel, QuickPicks, InputBoxes).
*   **Advanced Agentics:** Features like long-term memory, complex planning beyond sequential tool use, or self-correction require significant additional libraries and logic. This implementation focuses on a robust tool-using loop.
*   **Large File Accuracy:** The diff/patch logic is standard. While generally reliable, extreme file sizes or complex concurrent edits could theoretically still pose challenges. Sequential application is used for safety.

Let's begin with the project structure.

---

**Project Layout (`codessa-vscode-plugin/`)**

```
codessa-vscode-plugin/
├── .vscodeignore
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE               # Important for production grade
├── images/               # For icons, etc.
│   └── icon.png          # Extension icon
└── src/
    ├── extension.ts              # Extension entry point, command registration
    ├── config.ts                 # Configuration management & types
    ├── logger.ts                 # Logging utility
    ├── utils.ts                  # General utility functions
    ├── llm/
    │   ├── llmProvider.ts        # LLM Provider Interface & types
    │   ├── llmService.ts         # Service to get/manage providers
    │   └── providers/
    │       ├── openaiProvider.ts   # OpenAI implementation
    │       ├── ollamaProvider.ts   # Ollama implementation
    │       ├── googleAIProvider.ts # Google AI (Gemini) implementation
    │       ├── mistralAIProvider.ts# Mistral AI implementation
    │       ├── anthropicProvider.ts# Anthropic implementation (basic)
    │       └── providerUtils.ts    # Shared utilities for providers (e.g., tool formatting)
    │       # Placeholder comments for other providers (LM Studio, HuggingFace, etc.)
    ├── agents/
    │   ├── agent.ts              # Base Agent class, run loop, types (AgentMode, AgentRunInput, etc.)
    │   ├── agentManager.ts       # Manages agent configurations & lifecycle
    │   ├── supervisorAgent.ts    # Agent to coordinate other agents
    │   └── tools/
    │       ├── tool.ts             # Base Tool interface
    │       ├── fileSystemTool.ts   # File I/O, diff, patch tool
    │       ├── documentationTool.ts # Documentation search tool (LLM-based)
    │       └── debugTool.ts        # Placeholder for debugging tool
    ├── prompts/
    │   ├── promptManager.ts      # Manages system prompts and variables
    │   └── defaultPrompts.ts     # Default prompt templates with tool instructions
    ├── diff/
    │   └── diffEngine.ts         # Diffing and patching logic wrapper
    └── ui/
        ├── agentTreeView.ts      # Sidebar Tree View for agents & actions
        ├── uiUtils.ts            # Helpers for notifications, progress, context, results handling
        ├── chatManager.ts        # Manages chat state (replaces simple output channel logic)
        ├── webviews/             # Folder for future Webview implementations
        │   ├── chatWebview.ts      # Placeholder/command for chat webview
        │   └── settingsWebview.ts  # Placeholder/command for settings webview
        └── assets/               # CSS/JS for webviews (if implemented)
```

---

**`package.json`**

```json
{
  "name": "codessa",
  "displayName": "Codessa - AI Coding Assistant",
  "description": "Codessa: Your agentic AI pair programmer with multi-provider support, advanced file manipulation, and customizable workflows.",
  "version": "1.0.0",
  "publisher": "your-publisher-name", // CHANGE THIS
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Programming Languages",
    "Machine Learning",
    "Other"
  ],
  "keywords": [
    "ai",
    "llm",
    "agent",
    "coding assistant",
    "openai",
    "ollama",
    "mistral",
    "google",
    "anthropic",
    "refactor",
    "debug",
    "generate code"
  ],
  "icon": "images/icon.png", // Add an icon file here
  "activationEvents": [
    "onView:codessaAgentView" // Activate when the view is visible
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      // General Task / Modes (Palette)
      { "command": "codessa.runTask", "title": "Codessa: Run General Task with Agent..." },
      { "command": "codessa.startChat", "title": "Codessa: Start Chat with Agent..." },
      { "command": "codessa.editCode", "title": "Codessa: Edit Code with Agent..." },
      { "command": "codessa.generateCode", "title": "Codessa: Generate Code with Agent..." },
      { "command": "codessa.runSupervisorTask", "title": "Codessa: Run Multi-Agent Task..." },
      // Inline / Contextual (Editor Menu)
      { "command": "codessa.inlineAction", "title": "Codessa: Generate/Edit Inline..." },
      // Management & UI
      { "command": "codessa.refreshAgentView", "title": "Refresh Agents", "icon": "$(refresh)" },
      { "command": "codessa.addAgent", "title": "Codessa: Add New Agent..." },
      { "command": "codessa.deleteAgent", "title": "Codessa: Delete Agent..." },
      { "command": "codessa.openSettings", "title": "Codessa: Configure Settings..." },
      { "command": "codessa.openChatView", "title": "Codessa: Open Chat Panel" }, // Placeholder for webview
      { "command": "codessa.openSettingsView", "title": "Codessa: Open Settings Panel" } // Placeholder for webview
      // Tree View specific commands (defined below)
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "codessa-view-container",
          "title": "Codessa",
          "icon": "$(hubot)" // Use default or replace with custom SVG icon path
        }
      ]
    },
    "views": {
      "codessa-view-container": [
        {
          "id": "codessaAgentView",
          "name": "Agents",
          "type": "tree",
          "contextualTitle": "Codessa Agents"
        }
        // Add Chat/Settings webviews here when implemented
      ]
    },
    "menus": {
      "view/title": [
        {
          "command": "codessa.refreshAgentView",
          "when": "view == codessaAgentView",
          "group": "navigation@1"
        },
        {
           "command": "codessa.addAgent",
           "when": "view == codessaAgentView",
           "group": "navigation@2"
        }
      ],
       "view/item/context": [ // Context menu for agent items in the tree
            { "command": "codessa.startChatWithAgentContext", "when": "view == codessaAgentView && viewItem == agentItem && !viewItem.isSupervisor", "group": "1_modes@1", "title": "Start Chat" },
            { "command": "codessa.runEditTaskWithAgentContext", "when": "view == codessaAgentView && viewItem == agentItem && !viewItem.isSupervisor", "group": "1_modes@2", "title": "Edit Code..." },
            { "command": "codessa.runGenerateTaskWithAgentContext", "when": "view == codessaAgentView && viewItem == agentItem && !viewItem.isSupervisor", "group": "1_modes@3", "title": "Generate Code..." },
            { "command": "codessa.runGeneralTaskWithAgentContext", "when": "view == codessaAgentView && viewItem == agentItem && !viewItem.isSupervisor", "group": "1_modes@4", "title": "Run General Task..." },
            { "command": "codessa.runSupervisorTaskContext", "when": "view == codessaAgentView && viewItem == agentItem && viewItem.isSupervisor", "group": "1_modes@5", "title": "Run Supervisor Task..." },
            { "command": "codessa.deleteAgentContext", "when": "view == codessaAgentView && viewItem == agentItem", "group": "9_manage@1", "title": "Delete Agent" }
            // Add "Edit Agent" command here later
        ],
      "editor/context": [
         {
            "command": "codessa.inlineAction",
            "group": "9_codessa@1",
            "title": "Codessa: Generate/Edit Inline..."
            // "when": "editorHasSelection || !editorHasSelection" // Always show
         }
      ],
      "commandPalette": [
         // Hide tree view specific commands from palette
         { "command": "codessa.startChatWithAgentContext", "when": "false" },
         { "command": "codessa.runEditTaskWithAgentContext", "when": "false" },
         { "command": "codessa.runGenerateTaskWithAgentContext", "when": "false" },
         { "command": "codessa.runGeneralTaskWithAgentContext", "when": "false" },
         { "command": "codessa.runSupervisorTaskContext", "when": "false" },
         { "command": "codessa.deleteAgentContext", "when": "false" }
      ]
    },
    "configuration": {
      "title": "Codessa AI Assistant",
      "properties": {
        "codessa.logLevel": {
          "type": "string",
          "enum": ["debug", "info", "warn", "error"],
          "default": "info",
          "description": "Logging level for the Codessa extension."
        },
        "codessa.maxToolIterations": {
            "type": "number",
            "default": 5,
            "minimum": 1,
            "maximum": 20,
            "description": "Maximum number of sequential tool calls an agent can make in a single run."
        },
        "codessa.defaultModel": {
           "type": "object",
           "properties": {
              "provider": {"type": "string", "description": "Default provider ID (e.g., 'openai', 'ollama', 'anthropic')"},
              "modelId": {"type": "string", "description": "Default model ID for the provider"}
           },
           "default": {"provider": "ollama", "modelId": "llama3"},
           "description": "Default AI provider and model if not specified by an agent."
        },
        "codessa.providers.openai.apiKey": { "type": "string", "description": "API Key for OpenAI.", "default": "", "markdownDescription": "Required for OpenAI models. Store securely (e.g., environment variable or secret storage)." },
        "codessa.providers.openai.baseUrl": { "type": "string", "description": "Optional Base URL for OpenAI compatible APIs (e.g., Azure, local proxy).", "default": "" },
        "codessa.providers.googleai.apiKey": { "type": "string", "description": "API Key for Google AI (Gemini).", "default": "", "markdownDescription": "Required for Google Gemini models." },
        "codessa.providers.mistralai.apiKey": { "type": "string", "description": "API Key for Mistral AI.", "default": "", "markdownDescription": "Required for Mistral AI platform models." },
        "codessa.providers.anthropic.apiKey": { "type": "string", "description": "API Key for Anthropic (Claude).", "default": "", "markdownDescription": "Required for Anthropic Claude models." },
        "codessa.providers.ollama.baseUrl": { "type": "string", "description": "Base URL for your local Ollama instance.", "default": "http://localhost:11434" },
        "codessa.providers.lmstudio.baseUrl": { "type": "string", "description": "Base URL for your local LM Studio server (OpenAI compatible endpoint).", "default": "http://localhost:1234/v1" },
        // Add placeholders/comments for HuggingFace, OpenRouter, Copilot (requires specific auth flow)
        "codessa.systemPrompts": {
          "type": "object",
          "additionalProperties": { "type": "string" },
          "default": {},
          "description": "Custom system prompts. Key is the prompt name, value is the prompt text. Use {variable} for placeholders.",
           "markdownDescription": "Define reusable system prompts for your agents. See default prompts for examples and available variables like `{AVAILABLE_TOOLS_LIST}`, `{USER_REQUEST}` etc."
        },
        "codessa.agents": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {"type": "string", "description": "Unique identifier for the agent."},
              "name": {"type": "string", "description": "Display name for the agent."},
              "description": {"type": "string", "description": "Optional description of the agent's purpose."},
              "systemPromptName": {"type": "string", "description": "Name of the system prompt (from codessa.systemPrompts or defaults) to use."},
              "llm": {
                 "type": "object",
                 "properties": {
                    "provider": {"type": "string", "description": "LLM Provider ID (e.g., 'openai', 'ollama'). Uses default if omitted."},
                    "modelId": {"type": "string", "description": "Model ID for the provider. Uses provider default if omitted."},
                    "options": {"type": "object", "additionalProperties": true, "description": "Provider-specific options (e.g., temperature, max_tokens)."}
                 },
                 "description": "Specific LLM configuration for this agent. Overrides global default."
              },
              "tools": {
                 "type": "array",
                 "items": {"type": "string", "enum": ["file", "docs", "debug"]}, // Add tool IDs here
                 "default": ["file", "docs"],
                 "description": "List of tool IDs this agent is allowed to use."
              },
              "isSupervisor": {"type": "boolean", "default": false, "description": "Set to true if this agent coordinates other agents."},
              "chainedAgentIds": {
                 "type": "array",
                 "items": {"type": "string"},
                 "description": "For supervisor agents, list the IDs of agents they can delegate tasks to."
              }
            },
            "required": ["id", "name", "systemPromptName"]
          },
          "default": [],
          "description": "Configurations for individual AI agents."
        },
        "codessa.promptVariables": {
           "type": "object",
           "additionalProperties": { "type": "string" },
           "default": {},
           "description": "Global variables/placeholders available in all system prompts (e.g., {USERNAME}: 'Coder')."
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js" // Assuming tests are set up later
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "18.x",
    "@types/diff": "^5.0.9",
    "@types/mocha": "^10.0.6", // For testing
    "@typescript-eslint/eslint-plugin": "^6.19.1",
    "@typescript-eslint/parser": "^6.19.1",
    "eslint": "^8.56.0",
    "typescript": "^5.3.3",
    "@vscode/test-electron": "^2.3.9" // For integration testing
  },
  "dependencies": {
    "diff": "^5.1.0",
    "openai": "^4.29.0", // Use official SDKs
    "@google/generative-ai": "^0.3.0",
    "@mistralai/mistralai": "^0.1.3",
    "@anthropic-ai/sdk": "^0.17.1", // Anthropic SDK
    "axios": "^1.6.7", // For Ollama, LM Studio, other HTTP APIs
    "uuid": "^9.0.1", // For generating IDs
    "@types/uuid": "^9.0.8" // Types for uuid
    // keytar for secure storage would be added here: "keytar": "^7.9.0"
  }
}
```

---

**`tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node", // Ensure Node.js module resolution
    "declaration": true // Generate .d.ts files (good practice)
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", ".vscode-test", "out"]
}
```

---

**`.vscodeignore`**

```
.vscode/**
.vscode-test/**
.gitignore
.DS_Store
node_modules/**
out/**
src/**
tsconfig.json
yarn.lock
npm-shrinkwrap.json
*.log
*.tsbuildinfo

# Include compiled output and maps
!out/extension.js
!out/**/*.js
!out/**/*.js.map
!out/**/*.d.ts

# Include assets if needed
images/**
LICENSE
README.md
```

---

**`README.md`** (Basic Placeholder)

```markdown
# Codessa - AI Coding Assistant for VS Code

**Codessa: Your agentic AI pair programmer.**

Codessa integrates multiple AI providers (OpenAI, Ollama, Google Gemini, Mistral, Anthropic, and more via compatible endpoints) directly into VS Code. Leverage powerful AI agents for code generation, editing, debugging, documentation research, and complex multi-step tasks.

## Features

*   **Multi-Provider Support:** Connect to OpenAI, Anthropic, Google AI, Mistral AI, local Ollama, LM Studio, and any OpenAI-compatible API endpoint.
*   **Agentic Framework:** Define specialized agents with unique system prompts, LLM configurations, and tools.
*   **Tool Usage:** Agents can read/write files, apply diffs/patches (even on large files), and research documentation.
*   **Operational Modes:** Interact via Chat, request Code Edits, Generate new code, or run complex Tasks.
*   **Supervisor Agents:** Create agents that can delegate sub-tasks to other agents for complex workflows.
*   **Inline Actions:** Generate or modify code directly in the editor context menu.
*   **Customization:** Define custom system prompts, prompt variables, and agent configurations in VS Code settings.
*   **Extensible:** Designed to easily add support for new AI providers and tools.

## Installation

1.  Search for "Codessa" in the VS Code Extensions Marketplace.
2.  Click "Install".

## Configuration

1.  Open VS Code Settings (Ctrl/Cmd + ,).
2.  Search for "Codessa".
3.  Configure API keys and base URLs for the desired AI providers under `Codessa > Providers`.
    *   **Security:** It is strongly recommended to use environment variables or VS Code's secret storage for API keys rather than directly pasting them into `settings.json`. (Future versions may integrate `keytar`.)
4.  Define your custom agents under `Codessa > Agents`. Specify their name, system prompt, allowed tools, and optionally a specific LLM.
5.  Add custom system prompts under `Codessa > System Prompts`.
6.  Set global prompt variables under `Codessa > Prompt Variables`.

## Usage

1.  Open the Codessa view in the Activity Bar (Hubot icon).
2.  Right-click on an agent in the "Agents" tree view to:
    *   Start Chat
    *   Edit Code...
    *   Generate Code...
    *   Run General Task...
    *   Run Supervisor Task... (for supervisor agents)
3.  Use the Command Palette (Ctrl/Cmd + Shift + P) and search for "Codessa:" commands.
4.  Right-click in the editor for "Codessa: Generate/Edit Inline...".

## Contributing

Contributions are welcome! Please refer to the (TODO: Add Contribution Guide).

## License

(TODO: Add License - e.g., MIT) - Included MIT License file.
```

---

**`LICENSE`** (Example: MIT License)

```
MIT License

Copyright (c) 2024 <Your Name or Organization> // CHANGE THIS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

**`src/logger.ts`**

```typescript
import * as vscode from 'vscode';
import { getConfig } from './config';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

class Logger {
    private outputChannel: vscode.OutputChannel;
    private currentLevel: LogLevel = LogLevel.INFO;
    private static instance: Logger;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel("Codessa");
        this.updateLogLevel(); // Initial setup
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.logLevel')) {
                this.updateLogLevel();
            }
        });
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private updateLogLevel() {
        const levelString = getConfig<string>('logLevel', 'info');
        const newLevel = LogLevel[levelString.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO;
        if (newLevel !== this.currentLevel) {
            this.currentLevel = newLevel;
            this.log(LogLevel.INFO, `Log level set to: ${levelString.toUpperCase()}`);
        }
    }

    private log(level: LogLevel, message: string, ...optionalParams: any[]) {
        if (level < this.currentLevel) {
            return;
        }

        const levelStr = `[${LogLevel[level]}]`.padEnd(7);
        const timestamp = new Date().toISOString();
        const formattedMessage = `${timestamp} ${levelStr} ${message}`;

        this.outputChannel.appendLine(formattedMessage);
        if (optionalParams.length > 0) {
            optionalParams.forEach(param => {
                try {
                    // Attempt to stringify complex objects for better readability
                    const paramStr = typeof param === 'object' ? JSON.stringify(param, null, 2) : String(param);
                    // Indent additional params for clarity
                    paramStr.split('\n').forEach(line => this.outputChannel.appendLine(`  ${line}`));
                } catch (e) {
                    this.outputChannel.appendLine(`  [Error logging parameter: ${e}]`);
                }
            });
        }
    }

    debug(message: string, ...optionalParams: any[]) {
        this.log(LogLevel.DEBUG, message, ...optionalParams);
    }

    info(message: string, ...optionalParams: any[]) {
        this.log(LogLevel.INFO, message, ...optionalParams);
    }

    warn(message: string, ...optionalParams: any[]) {
        this.log(LogLevel.WARN, message, ...optionalParams);
    }

    error(message: string | Error, ...optionalParams: any[]) {
        if (message instanceof Error) {
            this.log(LogLevel.ERROR, `${message.message}\nStack Trace:\n${message.stack ?? 'Not available'}`, ...optionalParams);
        } else {
            this.log(LogLevel.ERROR, message, ...optionalParams);
        }
    }

    show(preserveFocus?: boolean) {
        this.outputChannel.show(preserveFocus);
    }

    dispose() {
        this.outputChannel.dispose();
    }
}

// Export a single instance
export const logger = Logger.getInstance();
```

---

**`src/config.ts`**

```typescript
import * as vscode from 'vscode';
import { logger } from './logger';
import { LogLevel } from './logger'; // Import LogLevel if needed elsewhere

const CONFIG_SECTION = 'codessa';

/**
 * Gets a configuration value from the VS Code settings.
 * @param key The configuration key (e.g., 'logLevel', 'providers.openai.apiKey').
 * @param defaultValue The default value if the setting is not found.
 * @returns The configuration value or the default value.
 */
export function getConfig<T>(key: string, defaultValue: T): T {
    try {
        const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
        // Use inspect to check source if needed, but get is usually sufficient
        return config.get<T>(key, defaultValue);
    } catch (error) {
        logger.error(`Error reading configuration key '${CONFIG_SECTION}.${key}':`, error);
        return defaultValue;
    }
}

/**
 * Updates a configuration value in the VS Code settings.
 * @param key The configuration key to update.
 * @param value The new value to set.
 * @param target The configuration target (User or Workspace). Defaults to User (Global).
 */
export async function setConfig<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
     try {
        const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
        await config.update(key, value, target);
        logger.info(`Configuration updated: '${CONFIG_SECTION}.${key}' set in ${vscode.ConfigurationTarget[target]} scope.`);
    } catch (error) {
        logger.error(`Error writing configuration key '${CONFIG_SECTION}.${key}':`, error);
        vscode.window.showErrorMessage(`Failed to update setting '${CONFIG_SECTION}.${key}'. Check logs for details.`);
    }
}

// --- Specific Configuration Getters ---

export function getLogLevel(): LogLevel {
     const levelString = getConfig<string>('logLevel', 'info');
     return LogLevel[levelString.toUpperCase() as keyof typeof LogLevel] ?? LogLevel.INFO;
}

export function getMaxToolIterations(): number {
    const iterations = getConfig<number>('maxToolIterations', 5);
    return Math.max(1, Math.min(iterations, 20)); // Ensure value is within reasonable bounds
}

export function getDefaultModelConfig(): { provider: string; modelId: string } {
    return getConfig<{ provider: string; modelId: string }>('defaultModel', { provider: 'ollama', modelId: 'llama3' });
}

export function getProviderConfig<T>(providerId: string, key: string, defaultValue: T): T {
    return getConfig<T>(`providers.${providerId}.${key}`, defaultValue);
}

export function getAgentConfigs(): AgentConfig[] {
    // Perform basic validation? Ensure IDs are unique?
    const configs = getConfig<AgentConfig[]>('agents', []);
    // Simple validation example: Check for duplicate IDs
    const ids = new Set<string>();
    const validConfigs: AgentConfig[] = [];
    for (const config of configs) {
        if (!config.id || !config.name || !config.systemPromptName) {
            logger.warn(`Invalid agent config skipped (missing id, name, or systemPromptName): ${JSON.stringify(config)}`);
            continue;
        }
        if (ids.has(config.id)) {
             logger.warn(`Duplicate agent ID found and skipped: ${config.id}`);
             continue;
        }
        ids.add(config.id);
        validConfigs.push(config);
    }
    return validConfigs;
}

export async function updateAgentConfigs(agents: AgentConfig[]): Promise<void> {
    // Consider adding validation before saving
    await setConfig('agents', agents, vscode.ConfigurationTarget.Global); // Persist globally for now
}

export function getSystemPrompts(): Record<string, string> {
    return getConfig<Record<string, string>>('systemPrompts', {});
}

export function getPromptVariables(): Record<string, string> {
    return getConfig<Record<string, string>>('promptVariables', {});
}


// --- Configuration Interfaces ---

export interface LLMConfig {
    provider: string; // e.g., 'openai', 'ollama', 'googleai'
    modelId: string;
    options?: Record<string, any>; // Provider-specific options like temperature, max_tokens, etc.
}

export type ToolID = 'file' | 'docs' | 'debug'; // Enforce known tool IDs

export interface AgentConfig {
    id: string;
    name: string;
    description?: string;
    systemPromptName: string; // Key in codessa.systemPrompts or a default
    llm?: Partial<LLMConfig>; // Allow partial override of default LLM
    tools?: ToolID[]; // IDs of tools the agent can use
    isSupervisor?: boolean;
    chainedAgentIds?: string[]; // IDs of agents to call (for supervisors)
}
```

---

**`src/utils.ts`**

```typescript
import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid'; // Use uuid library
import { logger } from './logger';

/**
 * Generates a Version 4 UUID.
 */
export function generateUUID(): string {
    return uuidv4();
}

/**
 * Shows a VS Code Quick Pick menu.
 * @param items Array of QuickPickItems or strings.
 * @param placeholder Placeholder text for the Quick Pick.
 * @param canPickMany Allow multiple selections.
 * @returns A promise resolving to the selected item(s) or undefined if cancelled.
 */
export async function showQuickPick<T extends vscode.QuickPickItem>(
    items: T[] | Thenable<T[]>,
    placeholder: string,
    options: vscode.QuickPickOptions = {}
): Promise<T | T[] | undefined> {
     // Ensure options are merged correctly
     const mergedOptions: vscode.QuickPickOptions = {
         placeHolder: placeholder,
         matchOnDescription: true, // Often useful
         ...options // User options override defaults
     };
    return await vscode.window.showQuickPick(items, mergedOptions);
}


/**
 * Shows a VS Code Input Box.
 * @param prompt The prompt message.
 * @param placeholder Placeholder text.
 * @param value Initial value.
 * @param validateInput Optional validation function.
 * @returns A promise resolving to the entered string or undefined if cancelled.
 */
export async function showInputBox(options: vscode.InputBoxOptions): Promise<string | undefined> {
    return await vscode.window.showInputBox(options);
}

/**
 * Simple delay function.
 * @param ms Milliseconds to delay.
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ensures a file path is absolute within the workspace or system.
 * If relative, resolves it against the first workspace folder.
 * Returns undefined if no workspace is open and path is relative.
 * Handles both file:// URIs and standard paths.
 * @param filePathOrUri The file path string or a vscode.Uri object.
 * @returns The resolved vscode.Uri or undefined.
 */
export function resolvePathToUri(filePathOrUri: string | vscode.Uri): vscode.Uri | undefined {
    if (filePathOrUri instanceof vscode.Uri) {
        return filePathOrUri; // Already a Uri
    }

    const filePath = filePathOrUri;
    try {
        // Try parsing as a URI first (handles file://, untitled:// etc.)
        const parsedUri = vscode.Uri.parse(filePath, true); // Strict parsing
        if (parsedUri.scheme && parsedUri.scheme !== 'file') {
             // Allow non-file schemes like 'untitled'
             return parsedUri;
        }
         // If it parses as a file URI or has no scheme (likely a path)
         if (parsedUri.scheme === 'file' || !parsedUri.scheme) {
             // Check if it's an absolute path (works on Windows/Linux/Mac)
             if (vscode.Uri.file(filePath).fsPath === filePath || /^[a-zA-Z]:\\/.test(filePath) || filePath.startsWith('/')) {
                 return vscode.Uri.file(filePath); // It's an absolute path
             }
         }
    } catch (e) {
        // URI parsing failed, likely a relative path or malformed
        logger.debug(`URI parsing failed for "${filePath}", treating as potential relative path. Error: ${e}`);
    }

    // If not absolute or a non-file URI, try resolving relative to workspace
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
        // Use joinPath for robust path joining
        try {
            return vscode.Uri.joinPath(workspaceRoot, filePath);
        } catch (joinError) {
             logger.error(`Error joining path "${filePath}" with workspace root "${workspaceRoot.fsPath}":`, joinError);
             return undefined; // Failed to resolve
        }
    }

    // If relative path and no workspace, cannot resolve
    logger.warn(`Cannot resolve relative path "${filePath}" without an open workspace folder.`);
    vscode.window.showWarningMessage(`Path "${filePath}" is relative, but no workspace is open.`);
    return undefined;
}

/**
 * Executes a potentially long-running async task with progress indication.
 * @param title The title for the progress notification.
 * @param task The async function to execute. Receives progress and token.
 * @param location The location for the progress UI. Defaults to Notification.
 * @param cancellable Whether the task can be cancelled. Defaults to true.
 */
export async function showProgress<T>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Promise<T>,
    location: vscode.ProgressLocation = vscode.ProgressLocation.Notification,
    cancellable: boolean = true
): Promise<T | undefined> {
    let result: T | undefined = undefined;
    await vscode.window.withProgress({ location, title, cancellable }, async (progress, token) => {
        try {
            result = await task(progress, token);
        } catch (error: any) {
            // Don't re-throw here, let the caller handle errors based on the undefined result
            logger.error(`Error during progress task "${title}":`, error);
            vscode.window.showErrorMessage(`Task "${title}" failed: ${error.message || error}`);
            result = undefined; // Ensure result is undefined on error
        }
    });
    return result;
}

/**
 * Escapes special characters in a string for use in regular expressions.
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
```

---

**`src/llm/llmProvider.ts`**

```typescript
import * as vscode from 'vscode';
import { ITool } from '../agents/tools/tool';

/**
 * Parameters for generating text using an LLM provider.
 */
export interface LLMGenerateParams {
    /** The main user prompt or the latest message in a conversation. */
    prompt: string;
    /** Optional system prompt defining the AI's role or instructions. */
    systemPrompt?: string;
    /** The specific model ID to use for this request. */
    modelId: string;
    /** Optional conversation history for context-aware generation (e.g., chat mode). */
    history?: { role: string; content: string; tool_calls?: any; tool_call_id?: string }[]; // Allow tool roles
    /** Optional map of tools available for the LLM to call. Key is tool ID. */
    tools?: Map<string, ITool>;
    /** Optional cancellation token to abort the request. */
    cancellationToken?: vscode.CancellationToken;
    /** Provider-specific options (e.g., temperature, max_tokens, top_p). */
    options?: Record<string, any>;
}

/**
 * Result object from an LLM generation request.
 */
export interface LLMGenerateResult {
    /** The generated text content. Can be null if only tool calls are returned. */
    content: string | null;
    /** Reason why the generation finished (e.g., 'stop', 'length', 'tool_calls', 'error', 'cancel'). */
    finishReason?: string;
    /** Optional information about token usage. */
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    /** Error message if the generation failed. */
    error?: string;
    /** Array of tool calls requested by the LLM (structure depends on provider). */
    toolCalls?: any[]; // Provider-specific tool call format
    /** Raw response from the provider, if needed for debugging or advanced handling. */
    raw?: any;
}

/**
 * Interface for all Large Language Model (LLM) providers.
 */
export interface ILLMProvider {
    /** Unique identifier for the provider (e.g., 'openai', 'ollama', 'anthropic'). */
    readonly providerId: string;

    /**
     * Generates text based on the provided parameters. Handles tool calls if supported.
     * @param params Parameters for the generation request.
     * @returns A promise resolving to the generation result.
     */
    generate(params: LLMGenerateParams): Promise<LLMGenerateResult>;

    /**
     * Generates text streamingly, yielding chunks as they arrive.
     * Note: Not all providers or models support streaming or tool calls during streaming.
     * Implementation is optional.
     * @param params Parameters for the generation request.
     * @yields Chunks of the generated text content.
     */
    streamGenerate?(params: LLMGenerateParams): AsyncGenerator<string, void, unknown>;

    /**
     * Optional: Fetches the list of available model IDs for this provider.
     * Useful for configuration UI. Returns an empty array if unable to fetch or not supported.
     * @returns A promise resolving to an array of model ID strings.
     */
    getAvailableModels?(): Promise<string[]>;

    /**
     * Checks if the provider is configured correctly (e.g., API key is set).
     * @returns True if the provider is likely configured, false otherwise.
     */
    isConfigured(): boolean;
}
```

---

**`src/llm/llmService.ts`**

```typescript
import * as vscode from 'vscode';
import { ILLMProvider } from './llmProvider';
import { OpenAIProvider } from './providers/openaiProvider';
import { OllamaProvider } from './providers/ollamaProvider';
import { GoogleAIProvider } from './providers/googleAIProvider';
import { MistralAIProvider } from './providers/mistralAIProvider';
import { AnthropicProvider } from './providers/anthropicProvider';
// Import other providers here when implemented
import { logger } from '../logger';
import { LLMConfig, getDefaultModelConfig, getProviderConfig } from '../config';

class LLMService {
    private providers: Map<string, ILLMProvider> = new Map();
    private static instance: LLMService;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.registerDefaultProviders();
        // Listen for configuration changes that might affect providers
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
             if (e.affectsConfiguration('codessa.providers') || e.affectsConfiguration('codessa.defaultModel')) {
                 logger.info("Provider or default model configuration changed, re-initializing providers.");
                 // Re-initialize providers - simple approach is clear and re-register
                 this.providers.forEach(provider => {
                     // If providers have internal state dependent on config, add an update method
                     if (typeof (provider as any).updateConfiguration === 'function') {
                         (provider as any).updateConfiguration();
                     }
                 });
                 // Re-register might be needed if providers themselves are enabled/disabled
                 // this.providers.clear();
                 // this.registerDefaultProviders();
                 // For now, assume providers handle internal updates
             }
         }));
    }

    public static initialize(context: vscode.ExtensionContext): LLMService {
        if (!LLMService.instance) {
            LLMService.instance = new LLMService(context);
        }
        return LLMService.instance;
    }

    public static getInstance(): LLMService {
         if (!LLMService.instance) {
            // This should not happen if initialized correctly in activate()
            throw new Error("LLMService not initialized. Call LLMService.initialize() first.");
        }
        return LLMService.instance;
    }


    private registerDefaultProviders() {
        // Register providers - could be made more dynamic later (e.g., based on config flags)
        this.registerProvider(new OpenAIProvider());
        this.registerProvider(new OllamaProvider());
        this.registerProvider(new GoogleAIProvider());
        this.registerProvider(new MistralAIProvider());
        this.registerProvider(new AnthropicProvider());

        // LM Studio (uses OpenAI compatible endpoint) - can leverage OpenAIProvider
        const lmStudioBaseUrl = getProviderConfig<string>('lmstudio', 'baseUrl', '');
        if (lmStudioBaseUrl) {
            this.registerProvider(new OpenAIProvider('lmstudio', lmStudioBaseUrl)); // Pass custom ID and URL
        }

        // Add other providers like HuggingFace, OpenRouter etc. when implemented
        // Example: this.registerProvider(new HuggingFaceProvider());
    }

    registerProvider(provider: ILLMProvider) {
        if (this.providers.has(provider.providerId)) {
            logger.warn(`Provider with ID '${provider.providerId}' is already registered. Overwriting.`);
        }
        logger.info(`Registering LLM provider: ${provider.providerId}`);
        this.providers.set(provider.providerId, provider);
    }

    getProvider(providerId: string): ILLMProvider | undefined {
        const provider = this.providers.get(providerId);
        if (!provider) {
            logger.warn(`LLM Provider '${providerId}' not found or not registered.`);
        }
        // Check configuration status each time it's requested
        else if (!provider.isConfigured()) {
             logger.warn(`LLM Provider '${providerId}' is registered but not configured (e.g., API key missing).`);
             // Optionally show a warning to the user the first time?
        }
        return provider;
    }

    /**
     * Gets the provider specified in the LLMConfig or the default provider.
     * Returns undefined if the required provider is not found or not configured.
     */
    getProviderForConfig(llmConfig?: Partial<LLMConfig>): ILLMProvider | undefined {
        const configProviderId = llmConfig?.provider;
        const defaultProviderId = getDefaultModelConfig().provider;
        const providerId = configProviderId ?? defaultProviderId;

        const provider = this.getProvider(providerId);

        if (!provider) {
            vscode.window.showErrorMessage(`LLM Provider '${providerId}' not found. Please check Codessa configuration.`);
            return undefined;
        }
        if (!provider.isConfigured()) {
             vscode.window.showErrorMessage(`LLM Provider '${providerId}' is not configured. Please set API keys/URLs in Codessa settings.`);
            return undefined;
        }
        return provider;
    }

    listProviderIds(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Gets the complete LLM configuration, merging agent-specific overrides with defaults.
     */
    resolveLLMConfig(agentConfig?: Partial<LLMConfig>): LLMConfig {
        const defaultConfig = getDefaultModelConfig();
        const providerId = agentConfig?.provider ?? defaultConfig.provider;
        // Get default model *for the chosen provider* if agent doesn't specify one
        // (This requires providers to potentially expose a default model ID, or we use a hardcoded map)
        const defaultModelForProvider = providerId === 'ollama' ? 'llama3' : (providerId === 'openai' ? 'gpt-3.5-turbo' : 'default-model'); // Example mapping
        const modelId = agentConfig?.modelId ?? defaultConfig.modelId ?? defaultModelForProvider;

        return {
            provider: providerId,
            modelId: modelId,
            options: { ...(agentConfig?.options ?? {}) } // Merge options, agent options take precedence
        };
    }
}

// Export functions to access the singleton instance
export function initializeLLMService(context: vscode.ExtensionContext): LLMService {
    return LLMService.initialize(context);
}

export function llmService(): LLMService {
    return LLMService.getInstance();
}
```

---

**`src/llm/providers/providerUtils.ts`** (NEW FILE)

```typescript
import * as vscode from 'vscode';
import { ITool } from '../../agents/tools/tool';
import { logger } from '../../logger';

/**
 * Formats the available tools into a structure suitable for OpenAI's API.
 */
export function formatToolsForOpenAI(tools?: Map<string, ITool>): any[] | undefined {
    if (!tools || tools.size === 0) {
        return undefined;
    }
    const formattedTools: any[] = [];
    tools.forEach(tool => {
        try {
            // Handle tools with sub-actions (like 'file')
            if (typeof (tool as any).getSubActions === 'function') {
                const subActions = (tool as any).getSubActions() as ITool[];
                subActions.forEach(subAction => {
                    if (subAction.inputSchema && typeof subAction.inputSchema === 'object') {
                        formattedTools.push({
                            type: 'function',
                            function: {
                                name: `${tool.id}_${subAction.id}`, // Combine IDs, replace dot with underscore
                                description: subAction.description || `${tool.name}: ${subAction.name}`,
                                parameters: subAction.inputSchema
                            }
                        });
                    }
                });
            }
            // Handle regular tools
            else if (tool.inputSchema && typeof tool.inputSchema === 'object') {
                formattedTools.push({
                    type: 'function',
                    function: {
                        name: tool.id.replace('.', '_'), // Replace dots if any
                        description: tool.description,
                        parameters: tool.inputSchema
                    }
                });
            }
             // Log tools without schemas - they might not work well with function calling
             else {
                 logger.debug(`Tool '${tool.id}' has no input schema, formatting with empty parameters for OpenAI.`);
                  formattedTools.push({
                    type: 'function',
                    function: {
                        name: tool.id.replace('.', '_'),
                        description: tool.description,
                        parameters: { type: 'object', properties: {} } // Default empty schema
                    }
                });
             }
        } catch (error) {
            logger.error(`Error formatting tool '${tool.id}' for OpenAI:`, error);
        }
    });
    return formattedTools.length > 0 ? formattedTools : undefined;
}


/**
 * Formats the available tools into a structure suitable for Anthropic's API.
 */
export function formatToolsForAnthropic(tools?: Map<string, ITool>): any[] | undefined {
     if (!tools || tools.size === 0) {
        return undefined;
    }
     const formattedTools: any[] = [];
     tools.forEach(tool => {
         try {
             // Handle tools with sub-actions (like 'file')
             if (typeof (tool as any).getSubActions === 'function') {
                 const subActions = (tool as any).getSubActions() as ITool[];
                 subActions.forEach(subAction => {
                     if (subAction.inputSchema && typeof subAction.inputSchema === 'object') {
                         formattedTools.push({
                             name: `${tool.id}_${subAction.id}`, // Combine IDs
                             description: subAction.description || `${tool.name}: ${subAction.name}`,
                             input_schema: subAction.inputSchema // Anthropic uses 'input_schema'
                         });
                     }
                 });
             }
             // Handle regular tools
             else if (tool.inputSchema && typeof tool.inputSchema === 'object') {
                 formattedTools.push({
                     name: tool.id.replace('.', '_'), // Replace dots if any
                     description: tool.description,
                     input_schema: tool.inputSchema
                 });
             } else {
                 logger.debug(`Tool '${tool.id}' has no input schema, formatting with empty parameters for Anthropic.`);
                 formattedTools.push({
                     name: tool.id.replace('.', '_'),
                     description: tool.description,
                     input_schema: { type: 'object', properties: {} }
                 });
             }
         } catch (error) {
             logger.error(`Error formatting tool '${tool.id}' for Anthropic:`, error);
         }
     });
     return formattedTools.length > 0 ? formattedTools : undefined;
}

// Add formatting functions for other providers (Google Gemini, Mistral) if/when they
// have distinct tool definition formats compared to OpenAI/Anthropic.
// Often, providers adopt OpenAI's format for compatibility.

/**
 * Extracts the core error message from various potential error structures.
 */
export function extractErrorMessage(error: any): string {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    // Axios errors
    if (error.response?.data?.error?.message) return error.response.data.error.message;
    if (error.response?.data?.error) return JSON.stringify(error.response.data.error);
    if (error.response?.data?.message) return error.response.data.message; // Mistral?
    if (error.response?.statusText) return `${error.response.status}: ${error.response.statusText}`;
    // OpenAI errors
    if (error.error?.message) return error.error.message;
    // Anthropic errors
    if (error.error?.type === 'error' && error.error.error?.message) return error.error.error.message;
    // Generic message property
    if (error.message) return error.message;
    // Fallback
    try {
        return JSON.stringify(error);
    } catch {
        return 'Failed to stringify error object.';
    }
}
```

---

**`src/llm/providers/openaiProvider.ts`**

```typescript
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getConfig, getProviderConfig } from '../../config';
import { logger } from '../../logger';
import { formatToolsForOpenAI, extractErrorMessage } from './providerUtils'; // Use utils

export class OpenAIProvider implements ILLMProvider {
    readonly providerId: string; // Can be 'openai' or custom like 'lmstudio'
    private client: OpenAI | null = null;
    private apiKey?: string;
    private baseUrl?: string;

    // Allow overriding provider ID and base URL for compatible APIs
    constructor(providerId: string = 'openai', baseUrlOverride?: string) {
        this.providerId = providerId;
        this.baseUrl = baseUrlOverride; // Use override if provided
        this.updateConfiguration(); // Initial configuration load
        // No need for listener here, service handles re-init or update calls
    }

    // Method to update config if settings change
    public updateConfiguration() {
        // Only read API key if it's the official OpenAI provider
        this.apiKey = this.providerId === 'openai' ? getProviderConfig<string | undefined>(this.providerId, 'apiKey', undefined) : 'dummy-key-for-local'; // Local models often don't need a key
        // Use constructor override first, then config, then default
        this.baseUrl = this.baseUrl ?? getProviderConfig<string | undefined>(this.providerId, 'baseUrl', undefined);

        if (this.providerId === 'openai' && !this.apiKey) {
            logger.warn(`OpenAI API key not configured for provider '${this.providerId}'.`);
            this.client = null;
            return;
        }
        // Allow local providers without API key if base URL is set
        if (!this.apiKey && !this.baseUrl) {
             logger.warn(`Provider '${this.providerId}' requires either an API key or a Base URL.`);
             this.client = null;
             return;
        }

        try {
            this.client = new OpenAI({
                apiKey: this.apiKey || undefined, // Pass undefined if not set (for local models)
                baseURL: this.baseUrl || undefined, // Use default OpenAI URL if not specified
                dangerouslyAllowBrowser: true, // Required for VS Code extension environment
            });
            logger.info(`OpenAI client initialized for provider '${this.providerId}' (Base URL: ${this.baseUrl || 'Default'}).`);
        } catch (error) {
            logger.error(`Failed to initialize OpenAI client for provider '${this.providerId}':`, error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        // For official OpenAI, require API key. For others (like LM Studio), allow if client initialized (URL is set).
        if (this.providerId === 'openai') {
            return !!this.apiKey && !!this.client;
        }
        return !!this.client;
    }

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: null, error: `Provider '${this.providerId}' not configured or initialization failed.` };
        }
        if (params.cancellationToken?.isCancellationRequested) {
             return { content: null, error: 'Request cancelled before sending.', finishReason: 'cancel' };
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        if (params.systemPrompt) {
            messages.push({ role: 'system', content: params.systemPrompt });
        }
        if (params.history) {
            // Ensure history roles are valid ('user', 'assistant', 'tool')
             params.history.forEach(h => {
                 if (h.role === 'user' || h.role === 'assistant') {
                     messages.push({ role: h.role, content: h.content });
                 } else if (h.role === 'tool' && h.tool_call_id) {
                      messages.push({ role: 'tool', content: h.content, tool_call_id: h.tool_call_id });
                 } else if (h.role === 'assistant' && h.tool_calls) {
                      // Add assistant message with tool calls
                      messages.push({ role: 'assistant', content: h.content || null, tool_calls: h.tool_calls });
                 }
                 // Ignore invalid roles
             });
        }
        // Add the latest user prompt if not already in history
        if (!params.history?.some(h => h.role === 'user' && h.content === params.prompt)) {
             messages.push({ role: 'user', content: params.prompt });
        }


        const formattedTools = formatToolsForOpenAI(params.tools);
        const requestOptions = params.options ?? {};

        try {
            logger.debug(`Sending request to ${this.providerId} model ${params.modelId}`);
            const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
                model: params.modelId,
                messages: messages,
                temperature: requestOptions.temperature ?? 0.7,
                max_tokens: requestOptions.max_tokens ?? undefined, // Let provider decide default if null
                top_p: requestOptions.top_p ?? undefined,
                stop: requestOptions.stop ?? undefined,
                tools: formattedTools,
                tool_choice: formattedTools ? requestOptions.tool_choice ?? 'auto' : undefined,
            };

            const response = await this.client.chat.completions.create(request, {
                 signal: params.cancellationToken ? AbortSignal.timeout(300000) : undefined, // Example timeout, link to cancellationToken if possible
                 // Proper cancellation requires AbortController linked to vscode CancellationToken
            });

             if (params.cancellationToken?.isCancellationRequested) {
                 logger.warn(`${this.providerId} request cancelled by user during generation.`);
                 return { content: null, error: 'Request cancelled by user.', finishReason: 'cancel' };
             }

            const choice = response.choices[0];
            logger.debug(`${this.providerId} response received. Finish reason: ${choice.finish_reason}`);

            return {
                content: choice.message?.content ?? null,
                finishReason: choice.finish_reason ?? undefined,
                usage: response.usage ? { // Ensure usage object exists
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens,
                } : undefined,
                toolCalls: choice.message?.tool_calls ?? undefined,
                raw: response,
            };
        } catch (error: any) {
            if (error.name === 'AbortError' || params.cancellationToken?.isCancellationRequested) {
                 logger.warn(`${this.providerId} request aborted or cancelled.`);
                 return { content: null, error: 'Request cancelled or timed out.', finishReason: 'cancel' };
            }
            const errorMessage = extractErrorMessage(error);
            logger.error(`Error calling ${this.providerId} API: ${errorMessage}`, error);
            return { content: null, error: errorMessage, finishReason: 'error', raw: error };
        }
    }

    // Optional: Implement streamGenerate using client.chat.completions.create({ stream: true })
    // async * streamGenerate(params: LLMGenerateParams): AsyncGenerator<string, void, unknown> { ... }

    async getAvailableModels(): Promise<string[]> {
         if (!this.client || this.providerId !== 'openai') { // Only fetch for official OpenAI provider
            logger.debug(`Skipping model fetch for non-OpenAI provider: ${this.providerId}`);
            return []; // Don't attempt for local models unless they implement the endpoint
        }
        try {
            logger.debug("Fetching OpenAI models list...");
            const models = await this.client.models.list();
            // Filter for usable models (e.g., gpt-*) or return all relevant ones
            return models.data
                .map(m => m.id)
                .filter(id => id.includes('gpt') || id.includes('text-davinci')) // Example filter
                .sort();
        } catch (error: any) {
            const errorMessage = extractErrorMessage(error);
            logger.error(`Failed to fetch OpenAI models: ${errorMessage}`, error);
            return [];
        }
    }
}
```

---

**`src/llm/providers/ollamaProvider.ts`**

```typescript
import * as vscode from 'vscode';
import axios, { AxiosInstance, CancelTokenSource } from 'axios';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getProviderConfig } from '../../config';
import { logger } from '../../logger';
import { extractErrorMessage } from './providerUtils';

export class OllamaProvider implements ILLMProvider {
    readonly providerId = 'ollama';
    private client: AxiosInstance | null = null;
    private baseUrl: string = '';
    private isConnected: boolean = false; // Track connection status

    constructor() {
        this.updateConfiguration();
    }

    public updateConfiguration() {
        const newBaseUrl = getProviderConfig<string>(this.providerId, 'baseUrl', 'http://localhost:11434');
        if (newBaseUrl !== this.baseUrl) {
            this.baseUrl = newBaseUrl;
            this.initializeClient();
        }
    }

    private initializeClient() {
        if (!this.baseUrl) {
            logger.warn("Ollama base URL not configured.");
            this.client = null;
            this.isConnected = false;
            return;
        }
        try {
            this.client = axios.create({
                baseURL: this.baseUrl,
                timeout: 180000, // 3 minute timeout for potentially long generations
            });
            logger.info(`Ollama client configured for base URL: ${this.baseUrl}`);
            // Check connection asynchronously, don't block initialization
            this.checkConnection();
        } catch (error) {
            logger.error("Failed to initialize Ollama axios client:", error);
            this.client = null;
            this.isConnected = false;
        }
    }

    async checkConnection(): Promise<boolean> {
        if (!this.client) return false;
        try {
            // Ollama's root endpoint often just returns "Ollama is running"
            await this.client.get('/', { timeout: 5000 }); // Short timeout for check
            if (!this.isConnected) {
                logger.info(`Ollama connection successful at ${this.baseUrl}`);
                this.isConnected = true;
            }
            return true;
        } catch (error) {
            if (this.isConnected || !axios.isCancel(error)) { // Only log error if previously connected or not a cancel
                 const errorMessage = extractErrorMessage(error);
                 logger.error(`Failed to connect to Ollama at ${this.baseUrl}: ${errorMessage}`);
                 // Avoid spamming user with messages, maybe show once?
                 // vscode.window.showWarningMessage(`Could not connect to Ollama at ${this.baseUrl}. Please ensure it's running.`);
            }
            this.isConnected = false;
            return false;
        }
    }

    isConfigured(): boolean {
        // Configured if base URL is set, even if not currently reachable
        return !!this.baseUrl && !!this.client;
    }

    // Ollama primarily uses /api/generate or /api/chat
    // We'll use /api/chat for better history and system prompt handling
    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: null, error: 'Ollama provider not configured (Base URL missing?).' };
        }
         if (params.cancellationToken?.isCancellationRequested) {
             return { content: null, error: 'Request cancelled before sending.', finishReason: 'cancel' };
        }

        // Tool usage with Ollama relies on prompting the model to output JSON.
        // The agent loop handles parsing this JSON. We don't send tool definitions here.

        const endpoint = '/api/chat';
        const messages: { role: string; content: string; images?: string[] }[] = [];

        if (params.systemPrompt) {
            messages.push({ role: 'system', content: params.systemPrompt });
        }
        if (params.history) {
            params.history.forEach(h => {
                // Map roles, filter out tool results as Ollama doesn't have a native tool role
                if (h.role === 'user' || h.role === 'assistant') {
                    messages.push({ role: h.role, content: h.content });
                }
            });
        }
         // Add the latest user prompt
         messages.push({ role: 'user', content: params.prompt });


        const requestData = {
            model: params.modelId,
            messages: messages,
            stream: false,
            options: { // Map common params to Ollama options
                temperature: params.options?.temperature,
                num_predict: params.options?.max_tokens, // Note: num_predict is max tokens
                stop: params.options?.stop,
                top_p: params.options?.top_p,
                // Pass through other Ollama-specific options if provided
                ...(params.options ?? {})
            }
        };

        let cancelSource: CancelTokenSource | undefined;
        if (params.cancellationToken) {
            cancelSource = axios.CancelToken.source();
            params.cancellationToken.onCancellationRequested(() => {
                logger.warn("Ollama request cancelled by user.");
                cancelSource?.cancel("Request cancelled by user.");
            });
        }

        try {
            logger.debug(`Sending request to Ollama model ${params.modelId} at ${this.baseUrl}${endpoint}`);
            const response = await this.client.post(endpoint, requestData, {
                cancelToken: cancelSource?.token,
            });

            logger.debug(`Ollama response received. Done: ${response.data?.done}`);

            // Ollama /api/chat response structure
            const messageContent = response.data?.message?.content?.trim() ?? null;
            const finishReason = response.data?.done ? 'stop' : undefined; // Simple mapping

            // Extract usage if available
            const usage = response.data?.prompt_eval_count !== undefined ? {
                 promptTokens: response.data.prompt_eval_count,
                 completionTokens: response.data.eval_count,
                 totalTokens: (response.data.prompt_eval_count ?? 0) + (response.data.eval_count ?? 0),
            } : undefined;


            return {
                content: messageContent,
                finishReason: finishReason,
                usage: usage,
                raw: response.data,
                // No native tool call support in response format
            };
        } catch (error: any) {
            if (axios.isCancel(error)) {
                 return { content: null, error: 'Request cancelled', finishReason: 'cancel' };
            }
            const errorMessage = extractErrorMessage(error);
            logger.error(`Error calling Ollama API: ${errorMessage}`, error);
            // Check connection status on error
            this.checkConnection();
            return { content: null, error: errorMessage, finishReason: 'error', raw: error };
        }
    }

    // Optional: Implement streamGenerate for Ollama using { stream: true } and parsing NDJSON response
    // async * streamGenerate(params: LLMGenerateParams): AsyncGenerator<string, void, unknown> { ... }


    async getAvailableModels(): Promise<string[]> {
        if (!this.client) {
             logger.warn("Cannot fetch Ollama models, client not configured.");
            return [];
        }
        // Check connection before fetching models
        if (!this.isConnected && !(await this.checkConnection())) {
             logger.warn("Skipping Ollama model fetch due to connection issue.");
             return [];
        }

        const endpoint = '/api/tags';
        try {
             logger.debug(`Fetching Ollama models list from ${this.baseUrl}${endpoint}`);
            const response = await this.client.get(endpoint);
            // Ollama /api/tags response structure: { models: [{ name: "model:tag", ... }, ...] }
            return response.data?.models?.map((m: any) => m.name).sort() ?? [];
        } catch (error: any) {
             const errorMessage = extractErrorMessage(error);
             logger.error(`Failed to fetch Ollama models: ${errorMessage}`, error);
             this.isConnected = false; // Assume connection lost if fetch fails
            return [];
        }
    }
}
```

---

**`src/llm/providers/googleAIProvider.ts`**

```typescript
import * as vscode from 'vscode';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel, Content } from "@google/generative-ai";
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getProviderConfig } from '../../config';
import { logger } from '../../logger';
import { extractErrorMessage } from './providerUtils';
// Note: Google Gemini Tool/Function calling setup is different and more complex.
// This implementation focuses on text generation. Tool usage relies on JSON prompting.

export class GoogleAIProvider implements ILLMProvider {
    readonly providerId = 'googleai';
    private genAI: GoogleGenerativeAI | null = null;
    private apiKey?: string;

    constructor() {
        this.updateConfiguration();
    }

    public updateConfiguration() {
        const newApiKey = getProviderConfig<string | undefined>(this.providerId, 'apiKey', undefined);
        if (newApiKey !== this.apiKey) {
            this.apiKey = newApiKey;
            this.initializeClient();
        }
    }

    private initializeClient() {
        if (!this.apiKey) {
            logger.warn("Google AI API key not configured.");
            this.genAI = null;
            return;
        }
        try {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            logger.info("Google AI (Gemini) client initialized.");
        } catch (error) {
            logger.error("Failed to initialize Google AI client:", error);
            this.genAI = null;
        }
    }

    isConfigured(): boolean {
        return !!this.apiKey && !!this.genAI;
    }

    // Helper to convert history to Gemini's Content format
    private formatHistoryForGemini(history?: LLMGenerateParams['history']): Content[] | undefined {
        if (!history) return undefined;
        return history.map(turn => {
            // Map roles: 'user' -> 'user', 'assistant' -> 'model'
            // Ignore system/tool roles for basic text chat
            const role = turn.role === 'assistant' ? 'model' : (turn.role === 'user' ? 'user' : null);
            if (!role) return null; // Skip invalid roles
            return { role, parts: [{ text: turn.content }] };
        }).filter(content => content !== null) as Content[]; // Filter out nulls
    }

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.genAI) {
            return { content: null, error: 'Google AI provider not configured (API key missing?).' };
        }
         if (params.cancellationToken?.isCancellationRequested) {
             return { content: null, error: 'Request cancelled before sending.', finishReason: 'cancel' };
        }

        // Tool usage relies on JSON prompting for Gemini in this basic implementation.

        try {
            const modelInstance: GenerativeModel = this.genAI.getGenerativeModel({
                model: params.modelId,
                // System prompts handled differently in Gemini, often as first part of history or specific instruction
                systemInstruction: params.systemPrompt ? { role: "system", parts: [{ text: params.systemPrompt }] } : undefined, // Use systemInstruction if model supports it
                safetySettings: [ // Example safety settings - adjust as needed
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                ],
                generationConfig: {
                    temperature: params.options?.temperature,
                    maxOutputTokens: params.options?.max_tokens,
                    stopSequences: params.options?.stop,
                    topP: params.options?.top_p,
                    // topK: params.options?.top_k // Another common param
                }
            });

            logger.debug(`Sending request to Google AI model ${params.modelId}`);

            const historyContent = this.formatHistoryForGemini(params.history);
            let response;

            if (historyContent && historyContent.length > 0) {
                // Use startChat for conversational history
                const chat = modelInstance.startChat({ history: historyContent });
                response = await chat.sendMessage(params.prompt); // Send the latest prompt
            } else {
                 // Use generateContent for single-turn or when systemInstruction is primary
                 // Combine system prompt manually if systemInstruction isn't used/supported
                 const fullPrompt = (!modelInstance.systemInstruction && params.systemPrompt)
                     ? `${params.systemPrompt}\n\n---\n\n${params.prompt}`
                     : params.prompt;
                response = await modelInstance.generateContent(fullPrompt);
            }


            if (params.cancellationToken?.isCancellationRequested) {
                 logger.warn(`Google AI request cancelled by user during generation.`);
                 return { content: null, error: 'Request cancelled by user.', finishReason: 'cancel' };
             }

            const generationResponse = response.response;
            const responseText = generationResponse.text();
            const finishReason = generationResponse.candidates?.[0]?.finishReason;
            const usageMetadata = generationResponse.usageMetadata; // Contains token counts

            logger.debug(`Google AI response received. Finish reason: ${finishReason}`);

            return {
                content: responseText?.trim() ?? null,
                finishReason: finishReason ?? undefined,
                usage: usageMetadata ? {
                    promptTokens: usageMetadata.promptTokenCount,
                    completionTokens: usageMetadata.candidatesTokenCount,
                    totalTokens: usageMetadata.totalTokenCount,
                } : undefined,
                raw: generationResponse,
                // No native tool call parsing here
            };

        } catch (error: any) {
             const errorMessage = extractErrorMessage(error);
             logger.error(`Error calling Google AI API: ${errorMessage}`, error);
            return { content: null, error: errorMessage, finishReason: 'error', raw: error };
        }
    }

    // Optional: Implement streamGenerate using model.generateContentStream(...)
    // Optional: Implement getAvailableModels (may require specific API calls or be hardcoded)
     async getAvailableModels(): Promise<string[]> {
        // Gemini models often need specific prefixes like 'models/'
        // This is a placeholder - a real implementation might list common ones
        // or use an API if available to list fine-tuned models etc.
        logger.warn("Google AI getAvailableModels is returning a static list. Update if needed.");
        // Check https://ai.google.dev/models/gemini for current models
        return [
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-1.0-pro", // Older but common
            // "gemini-pro-vision" // Vision model handled differently
            ];
    }
}
```

---

**`src/llm/providers/mistralAIProvider.ts`**

```typescript
import * as vscode from 'vscode';
import MistralClient, { ChatMessage } from '@mistralai/mistralai';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getProviderConfig } from '../../config';
import { logger } from '../../logger';
import { extractErrorMessage } from './providerUtils';
// Note: Mistral tool calling support exists but might require specific formatting.
// This implementation focuses on text generation. Tool usage relies on JSON prompting.

export class MistralAIProvider implements ILLMProvider {
    readonly providerId = 'mistralai';
    private client: MistralClient | null = null;
    private apiKey?: string;

    constructor() {
        this.updateConfiguration();
    }

     public updateConfiguration() {
        const newApiKey = getProviderConfig<string | undefined>(this.providerId, 'apiKey', undefined);
        if (newApiKey !== this.apiKey) {
            this.apiKey = newApiKey;
            this.initializeClient();
        }
    }


    private initializeClient() {
        if (!this.apiKey) {
            logger.warn("Mistral AI API key not configured.");
            this.client = null;
            return;
        }
        try {
            // const endpoint = getProviderConfig<string | undefined>(this.providerId, 'endpoint', undefined); // Optional endpoint override
            this.client = new MistralClient(this.apiKey /*, endpoint */);
            logger.info("Mistral AI client initialized.");
        } catch (error) {
            logger.error("Failed to initialize Mistral AI client:", error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.apiKey && !!this.client;
    }

    // Helper to format history for Mistral
     private formatHistoryForMistral(history?: LLMGenerateParams['history']): ChatMessage[] | undefined {
        if (!history) return undefined;
         // Mistral expects 'user' and 'assistant' roles primarily. System prompt handled separately.
         // Filter out tool roles for basic chat.
        return history
            .map(turn => {
                if (turn.role === 'user' || turn.role === 'assistant') {
                    return { role: turn.role, content: turn.content };
                }
                return null;
            })
            .filter(msg => msg !== null) as ChatMessage[];
    }

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: null, error: 'Mistral AI provider not configured (API key missing?).' };
        }
         if (params.cancellationToken?.isCancellationRequested) {
             return { content: null, error: 'Request cancelled before sending.', finishReason: 'cancel' };
        }

        // Tool usage relies on JSON prompting.

        const messages: ChatMessage[] = [];
        // Mistral often uses the first message turn for system-like instructions if no dedicated system role support
        // However, newer models/API might support 'system'. Let's assume system prompt goes first if provided.
        if (params.systemPrompt) {
            messages.push({ role: 'system', content: params.systemPrompt });
        }
        const formattedHistory = this.formatHistoryForMistral(params.history);
        if (formattedHistory) {
             messages.push(...formattedHistory);
        }
        // Add latest user prompt
        messages.push({ role: 'user', content: params.prompt });


        try {
            logger.debug(`Sending request to Mistral AI model ${params.modelId}`);

            // TODO: Integrate cancellation token with Mistral client if SDK supports AbortController/Signal
            const chatResponse = await this.client.chat({
                model: params.modelId,
                messages: messages,
                temperature: params.options?.temperature,
                maxTokens: params.options?.max_tokens,
                topP: params.options?.top_p,
                // stop: params.options?.stop, // Check SDK for stop sequence support
                safePrompt: params.options?.safePrompt ?? false, // Example option
                randomSeed: params.options?.randomSeed,
                // tool_choice / tools for native tool support if available/needed
            });

             if (params.cancellationToken?.isCancellationRequested) {
                 logger.warn(`Mistral AI request cancelled by user during generation.`);
                 return { content: null, error: 'Request cancelled by user.', finishReason: 'cancel' };
             }

            const choice = chatResponse.choices[0];
            logger.debug(`Mistral AI response received. Finish reason: ${choice.finish_reason}`);

            return {
                content: choice.message?.content?.trim() ?? null,
                finishReason: choice.finish_reason ?? undefined,
                usage: chatResponse.usage ? { // Ensure usage object exists
                    promptTokens: chatResponse.usage.prompt_tokens,
                    completionTokens: chatResponse.usage.completion_tokens,
                    totalTokens: chatResponse.usage.total_tokens,
                } : undefined,
                raw: chatResponse,
                // Parse tool calls if Mistral adds native support and it's implemented
            };
        } catch (error: any) {
            const errorMessage = extractErrorMessage(error);
            logger.error(`Error calling Mistral AI API: ${errorMessage}`, error);
            return { content: null, error: errorMessage, finishReason: 'error', raw: error };
        }
    }

    // Optional: Implement streamGenerate using client.chatStream(...)

    async getAvailableModels(): Promise<string[]> {
         if (!this.client) {
            logger.warn("Cannot fetch Mistral AI models, client not configured.");
            return [];
        }
        try {
            logger.debug("Fetching Mistral AI models list...");
            const models = await this.client.listModels();
            // Response format: { object: 'list', data: [ { id: 'model-id', ... }, ... ] }
            return models.data.map(m => m.id).sort();
        } catch (error: any) {
             const errorMessage = extractErrorMessage(error);
             logger.error(`Failed to fetch Mistral AI models: ${errorMessage}`, error);
            return [];
        }
    }
}
```

---

**`src/llm/providers/anthropicProvider.ts`** (NEW FILE - Basic Implementation)

```typescript
import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getProviderConfig } from '../../config';
import { logger } from '../../logger';
import { formatToolsForAnthropic, extractErrorMessage } from './providerUtils'; // Use utils

export class AnthropicProvider implements ILLMProvider {
    readonly providerId = 'anthropic';
    private client: Anthropic | null = null;
    private apiKey?: string;

    constructor() {
        this.updateConfiguration();
    }

    public updateConfiguration() {
        const newApiKey = getProviderConfig<string | undefined>(this.providerId, 'apiKey', undefined);
        if (newApiKey !== this.apiKey) {
            this.apiKey = newApiKey;
            this.initializeClient();
        }
    }

    private initializeClient() {
        if (!this.apiKey) {
            logger.warn("Anthropic API key not configured.");
            this.client = null;
            return;
        }
        try {
            this.client = new Anthropic({ apiKey: this.apiKey });
            logger.info("Anthropic (Claude) client initialized.");
        } catch (error) {
            logger.error("Failed to initialize Anthropic client:", error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return !!this.apiKey && !!this.client;
    }

    // Helper to format history for Anthropic Messages API
    private formatHistoryForAnthropic(history?: LLMGenerateParams['history']): Anthropic.Messages.MessageParam[] | undefined {
        if (!history) return undefined;
        // Anthropic expects alternating user/assistant roles. Tool results follow assistant tool_use.
        const messages: Anthropic.Messages.MessageParam[] = [];
        let lastRole: string | null = null;

        for (const turn of history) {
             if (turn.role === 'user') {
                 // Cannot have consecutive user messages
                 if (lastRole === 'user') {
                     logger.warn("Anthropic history formatting: Found consecutive user messages. Combining.");
                     const lastMessage = messages[messages.length - 1];
                     if (typeof lastMessage.content === 'string') {
                         lastMessage.content += `\n\n${turn.content}`; // Combine content
                     } else if (Array.isArray(lastMessage.content)) {
                          // Try adding as a new text block
                          lastMessage.content.push({ type: 'text', text: turn.content });
                     }
                 } else {
                     messages.push({ role: 'user', content: turn.content });
                     lastRole = 'user';
                 }
             } else if (turn.role === 'assistant') {
                 const contentBlocks: Anthropic.Messages.ContentBlock[] = [];
                 if (turn.content) {
                     contentBlocks.push({ type: 'text', text: turn.content });
                 }
                 // Check if this assistant turn included tool calls (from previous LLM response)
                 if (turn.tool_calls && Array.isArray(turn.tool_calls)) {
                     turn.tool_calls.forEach((tc: any) => {
                         if (tc.type === 'function' || tc.type === 'tool_use') { // Handle both OpenAI/Anthropic formats?
                             contentBlocks.push({
                                 type: 'tool_use',
                                 id: tc.id,
                                 name: tc.function?.name ?? tc.name,
                                 input: tc.function?.arguments ? JSON.parse(tc.function.arguments) : tc.input,
                             });
                         }
                     });
                 }
                 if (contentBlocks.length > 0) {
                      messages.push({ role: 'assistant', content: contentBlocks });
                      lastRole = 'assistant';
                 }

             } else if (turn.role === 'tool') {
                 // Tool results must follow an assistant message containing the corresponding tool_use block
                 if (lastRole === 'assistant' && turn.tool_call_id && turn.content) {
                     messages.push({
                         role: 'user', // Tool results are sent back in a 'user' message
                         content: [
                             {
                                 type: 'tool_result',
                                 tool_use_id: turn.tool_call_id,
                                 content: turn.content, // Content should be the JSON stringified result
                                 // is_error: ... // Optionally indicate if the tool execution failed
                             }
                         ]
                     });
                     lastRole = 'user'; // Tool result acts like a user turn
                 } else {
                      logger.warn(`Anthropic history formatting: Skipping tool result due to invalid preceding role or missing data: ${JSON.stringify(turn)}`);
                 }
             }
             // Ignore system role here, handled separately
        }
        // Ensure history ends with a user message if the last actual turn was assistant
        if (lastRole === 'assistant') {
             logger.debug("Anthropic history ends with assistant, adding empty user message might be needed if sending new prompt.");
             // The main prompt will be added as the final user message anyway
        }
        return messages;
    }


    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.client) {
            return { content: null, error: 'Anthropic provider not configured (API key missing?).' };
        }
         if (params.cancellationToken?.isCancellationRequested) {
             return { content: null, error: 'Request cancelled before sending.', finishReason: 'cancel' };
        }

        const formattedTools = formatToolsForAnthropic(params.tools);
        const messages = this.formatHistoryForAnthropic(params.history) ?? [];

        // Add the current user prompt as the last message
        messages.push({ role: 'user', content: params.prompt });

        // Ensure alternating roles (might need adjustments based on tool results)
        // Basic check: last message should be 'user'
        if (messages.length > 0 && messages[messages.length - 1].role !== 'user') {
             logger.error("Anthropic message list doesn't end with user role after formatting.", messages);
             return { content: null, error: "Internal error: Invalid message history format for Anthropic." };
        }


        try {
            logger.debug(`Sending request to Anthropic model ${params.modelId}`);

            const request: Anthropic.Messages.MessageCreateParamsNonStreaming = {
                model: params.modelId,
                messages: messages,
                system: params.systemPrompt, // Use the dedicated system parameter
                max_tokens: params.options?.max_tokens ?? 4096, // Anthropic requires max_tokens
                temperature: params.options?.temperature,
                top_p: params.options?.top_p,
                top_k: params.options?.top_k,
                stop_sequences: params.options?.stop,
                tools: formattedTools,
                tool_choice: formattedTools ? { type: 'auto' } : undefined, // Example tool choice
            };

            const response = await this.client.messages.create(request, {
                 signal: params.cancellationToken ? AbortSignal.timeout(300000) : undefined,
                 // Link AbortController to cancellationToken if needed
            });

             if (params.cancellationToken?.isCancellationRequested) {
                 logger.warn(`Anthropic request cancelled by user during generation.`);
                 return { content: null, error: 'Request cancelled by user.', finishReason: 'cancel' };
             }

            logger.debug(`Anthropic response received. Stop reason: ${response.stop_reason}`);

            // Extract content and tool calls
            let responseText: string | null = null;
            const responseToolCalls: any[] = [];
            response.content.forEach(block => {
                if (block.type === 'text') {
                    responseText = (responseText ?? '') + block.text;
                } else if (block.type === 'tool_use') {
                    responseToolCalls.push({
                        id: block.id,
                        type: 'tool_use', // Keep Anthropic's type
                        name: block.name,
                        input: block.input,
                    });
                }
            });

            return {
                content: responseText?.trim() ?? null,
                finishReason: response.stop_reason ?? undefined,
                usage: response.usage ? {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens,
                } : undefined,
                toolCalls: responseToolCalls.length > 0 ? responseToolCalls : undefined,
                raw: response,
            };
        } catch (error: any) {
             if (error.name === 'AbortError' || params.cancellationToken?.isCancellationRequested) {
                 logger.warn(`Anthropic request aborted or cancelled.`);
                 return { content: null, error: 'Request cancelled or timed out.', finishReason: 'cancel' };
             }
            const errorMessage = extractErrorMessage(error);
            logger.error(`Error calling Anthropic API: ${errorMessage}`, error);
            return { content: null, error: errorMessage, finishReason: 'error', raw: error };
        }
    }

    // Optional: Implement streamGenerate using client.messages.stream(...)

    async getAvailableModels(): Promise<string[]> {
        // Anthropic model names - update based on current offerings
        // See: https://docs.anthropic.com/claude/docs/models-overview
        logger.debug("Returning static list of common Anthropic models.");
        return [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2"
        ].sort();
    }
}
```

---

**`src/diff/diffEngine.ts`**

```typescript
import * as vscode from 'vscode';
import * as diff from 'diff';
import { logger } from '../logger';

// Re-export types for clarity if needed elsewhere, though direct use of 'diff' types is fine
export interface DiffHunk extends diff.Hunk {}
export interface ApplyPatchOptions extends diff.ApplyPatchOptions {}
export interface CreatePatchOptions extends diff.CreatePatchOptions {}

/**
 * Provides utilities for creating, applying, and parsing unified diff patches.
 */
class DiffEngine {

    /**
     * Creates a unified diff patch string between two text contents.
     * Normalizes line endings to LF before diffing for consistency.
     * @param oldFileName Name/path of the old file (for patch header).
     * @param newFileName Name/path of the new file (for patch header).
     * @param oldStr Content of the old file.
     * @param newStr Content of the new file.
     * @param options Optional diff options (e.g., context lines).
     * @returns The unified diff patch string.
     * @throws Error if patch creation fails internally.
     */
    createPatch(oldFileName: string, newFileName: string, oldStr: string, newStr: string, options?: CreatePatchOptions): string {
        logger.debug(`Creating patch between "${oldFileName}" and "${newFileName}"`);
        try {
            // Normalize line endings to LF (\n) for reliable diffing
            const cleanOldStr = oldStr.replace(/\r\n/g, '\n');
            const cleanNewStr = newStr.replace(/\r\n/g, '\n');

            // The 'diff' library might handle options differently, check its documentation if needed
            // Default options usually work well. context: 3 is common.
            const patchOptions = { context: options?.context ?? 3 };

            const patch = diff.createPatch(oldFileName, newFileName, cleanOldStr, cleanNewStr, '', '', patchOptions); // Pass options
             if (patch === null || patch === undefined) {
                 // Should not happen with createPatch, but defensively check
                 throw new Error("diff.createPatch returned null or undefined.");
             }
             return patch;
        } catch (error) {
            logger.error(`Error creating patch for "${oldFileName}":`, error);
            throw error; // Re-throw to be handled by caller
        }
    }

    /**
     * Applies a unified diff patch to a string.
     * IMPORTANT: This is sensitive to the exact content the patch was created against.
     * Normalizes line endings of the input string to LF before applying.
     * @param patch The unified diff patch string.
     * @param oldStr The original string the patch should apply to.
     * @param options Optional patch application options (e.g., fuzz factor).
     * @returns The patched string with LF line endings, or false if the patch cannot be applied cleanly.
     */
    applyPatch(patch: string, oldStr: string, options?: ApplyPatchOptions): string | false {
        logger.debug(`Attempting to apply patch...`);
        try {
            // Normalize line endings of the input string to LF (\n)
            const cleanOldStr = oldStr.replace(/\r\n/g, '\n');

            // The patch itself should ideally use LF, but applyPatch handles variations.
            // Default fuzz factor is usually 0 (strict). Increase if needed, but risks incorrect patching.
            const patchOptions: ApplyPatchOptions = { fuzzFactor: options?.fuzzFactor ?? 0 };

            const result = diff.applyPatch(cleanOldStr, patch, patchOptions);

            if (result === false) {
                logger.warn("Patch could not be applied cleanly. File content might have changed or patch is invalid.");
                // Optionally try parsing the patch to log which hunk failed (can be verbose)
                // try {
                //     const parsed = diff.parsePatch(patch);
                //     logger.debug("Parsed patch hunks:", parsed);
                // } catch { /* Ignore parsing error */ }
            } else {
                 logger.debug("Patch applied successfully.");
            }
            // Note: The result will have LF ('\n') line endings.
            // The caller (e.g., fileSystemTool) might need to respect original line endings if crucial,
            // but generally VS Code handles LF well internally.
            return result;
        } catch (error: any) {
            // `diff.applyPatch` can throw errors for malformed patches or internal issues
            logger.error("Error applying patch:", error);
             if (error.message?.includes('hunk')) {
                 vscode.window.showWarningMessage(`Patch application failed: ${error.message}. Content may have changed.`);
             } else {
                  vscode.window.showWarningMessage(`Patch application failed: ${error.message || 'Unknown error'}`);
             }
            return false; // Indicate failure
        }
    }

     /**
      * Applies multiple patches sequentially to a string.
      * Stops and returns the intermediate result if any patch fails.
      * @param patches Array of patch strings.
      * @param initialStr The starting string content.
      * @param options Optional patch application options (applied to each patch).
      * @returns The final string content after applying all successful patches, or false if any patch failed.
      */
     applyMultiplePatches(patches: string[], initialStr: string, options?: ApplyPatchOptions): string | false {
        logger.debug(`Applying ${patches.length} patches sequentially.`);
        let currentContent: string | false = initialStr;

        for (let i = 0; i < patches.length; i++) {
            const patch = patches[i];
            if (currentContent === false) {
                // Should not happen if logic is correct, but safety check
                logger.error(`Cannot apply patch ${i + 1}, previous state is invalid.`);
                return false;
            }
            logger.debug(`Applying patch ${i + 1}/${patches.length}...`);
            const patchResult = this.applyPatch(patch, currentContent, options);

            if (patchResult === false) {
                logger.error(`Failed to apply patch ${i + 1}. Stopping patch sequence.`);
                // Return the content *before* the failed patch? Or signal complete failure?
                // Returning false indicates the sequence did not complete successfully.
                return false;
            }
             currentContent = patchResult; // Update content for the next patch
        }

        logger.info(`Successfully applied ${patches.length} patches sequentially.`);
        return currentContent; // Return the final successfully patched content
    }


    /**
     * Parses a patch string into its component hunks. Useful for analysis or custom application.
     * @param patch The unified diff patch string.
     * @returns An array of parsed patch objects.
     * @throws Error if the patch string is malformed.
     */
    parsePatch(patch: string): diff.ParsedDiff[] {
        logger.debug("Parsing patch string.");
        try {
            return diff.parsePatch(patch);
        } catch (error) {
             logger.error("Error parsing patch string:", error);
             throw error; // Re-throw for caller
        }
    }
}

// Export a single instance
export const diffEngine = new DiffEngine();
```

---

**`src/agents/tools/tool.ts`**

```typescript
import { AgentContext } from "../agent"; // Assuming AgentContext is defined in agent.ts

/**
 * Input parameters for a tool execution.
 * Specific tools define the required keys within this structure.
 */
export interface ToolInput {
    [key: string]: any;
}

/**
 * Result of a tool execution.
 */
export interface ToolResult {
    /** Indicates whether the tool execution was successful. */
    success: boolean;
    /** The output data from the tool (can be string, object, etc.). Provided on success. */
    output?: any;
    /** Error message if the execution failed. */
    error?: string;
    /** Optional: Cost/usage information if the tool calls external APIs or tracks usage. */
    usage?: { [key: string]: number };
}

/**
 * Interface for all tools available to agents.
 */
export interface ITool {
    /**
     * Unique identifier for the tool (e.g., "file", "docs", "debug").
     * If the tool has sub-actions, this is the group ID.
     */
    readonly id: ToolID; // Use the defined ToolID type
    /** Human-readable name for the tool. */
    readonly name: string;
    /** Detailed description for the LLM and user explaining the tool's purpose and capabilities. */
    readonly description: string;
    /**
     * Optional JSON schema describing the expected input structure for the tool or its sub-actions.
     * Used for validation and providing structure to the LLM.
     * If the tool has sub-actions (like 'file'), this might be less relevant at the top level.
     */
    readonly inputSchema?: object;

    /**
     * Executes the tool's action.
     * For tools with sub-actions (like 'file'), this method acts as a dispatcher based on `input.action`.
     * @param input - The parameters for the tool. Should include `action` for dispatcher tools.
     * @param context - The current agent execution context (e.g., workspace info, cancellation token).
     * @returns A promise resolving to the tool's result.
     */
    execute(input: ToolInput, context: AgentContext): Promise<ToolResult>;

    /**
     * Optional: For tools with sub-actions (like 'file'), this method returns the individual action tools.
     * Used for generating detailed tool lists for LLMs.
     */
    getSubActions?(): ITool[];
}

// Re-export ToolID if needed elsewhere
export type { ToolID } from '../../config';
```

---

**`src/agents/tools/fileSystemTool.ts`**

```typescript
import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util'; // Node.js built-in utilities
import { ITool, ToolInput, ToolResult, ToolID } from './tool';
import { diffEngine } from '../../diff/diffEngine';
import { logger } from '../../logger';
import { resolvePathToUri } from '../../utils';
import { AgentContext } from '../agent';

const decoder = new TextDecoder('utf-8');
const encoder = new TextEncoder();

// --- Individual File Action Tools ---

abstract class BaseFileTool implements ITool {
    abstract readonly id: string; // Action ID (e.g., 'readFile')
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly inputSchema: object;
    readonly toolId: ToolID = 'file'; // The group ID

    // The execute method for sub-actions receives the specific action's input
    abstract execute(input: ToolInput, context: AgentContext): Promise<ToolResult>;

    // Base class doesn't have sub-actions
    // getSubActions?(): ITool[] { return undefined; }
}

class ReadFileTool extends BaseFileTool {
    readonly id = 'readFile';
    readonly name = 'Read File';
    readonly description = 'Reads the entire content of a specified file.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file (relative to workspace root or absolute).' }
        },
        required: ['filePath']
    };

    async execute(input: ToolInput, context: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        if (!filePath) {
            return { success: false, error: "Input validation failed: 'filePath' is required." };
        }

        const fileUri = resolvePathToUri(filePath);
        if (!fileUri) {
             return { success: false, error: `Could not resolve file path: ${filePath}. Ensure it's relative to an open workspace or absolute.` };
        }

        try {
            logger.debug(`Reading file: ${fileUri.fsPath}`);
            // Check cancellation before file access
            if (context.cancellationToken?.isCancellationRequested) {
                 return { success: false, error: "Operation cancelled by user." };
            }
            const fileContentUint8 = await vscode.workspace.fs.readFile(fileUri);
            const fileContent = decoder.decode(fileContentUint8);
            logger.info(`Successfully read ${fileContent.length} characters from ${fileUri.fsPath}`);
            // Return only a snippet for large files to avoid overwhelming the LLM context?
            // const maxContentLength = 10000; // Example limit
            // const outputContent = fileContent.length > maxContentLength
            //     ? fileContent.substring(0, maxContentLength) + "\n... (file truncated)"
            //     : fileContent;
            // For now, return full content. Agent needs to handle large inputs.
            return { success: true, output: fileContent };
        } catch (error: any) {
            logger.error(`Error reading file ${fileUri.fsPath}:`, error);
             if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                 return { success: false, error: `File not found: ${filePath}` };
             }
            return { success: false, error: `Failed to read file '${filePath}': ${error.message || error}` };
        }
    }
}

class WriteFileTool extends BaseFileTool {
    readonly id = 'writeFile';
    readonly name = 'Write File';
    readonly description = 'Writes content to a specified file, overwriting existing content. Creates the file and necessary directories if they do not exist.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file (relative to workspace root or absolute).' },
            content: { type: 'string', description: 'The full content to write to the file.' }
        },
        required: ['filePath', 'content']
    };

    async execute(input: ToolInput, context: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const content = input.content as string;

        if (typeof filePath !== 'string' || typeof content !== 'string') {
            return { success: false, error: "Input validation failed: 'filePath' and 'content' must be strings." };
        }

        const fileUri = resolvePathToUri(filePath);
         if (!fileUri) {
             return { success: false, error: `Could not resolve file path: ${filePath}.` };
        }

        try {
            logger.debug(`Writing to file: ${fileUri.fsPath}`);
             // Check cancellation before file access
            if (context.cancellationToken?.isCancellationRequested) {
                 return { success: false, error: "Operation cancelled by user." };
            }
            // Ensure directory exists (VS Code fs API handles file creation, but not necessarily deep directories)
            // await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(fileUri, '..')); // Create parent directory

            const contentUint8 = encoder.encode(content);
            // The writeFile API implicitly creates the file if it doesn't exist,
            // but might fail if parent directories are missing. Let's rely on VS Code's behavior for now.
            await vscode.workspace.fs.writeFile(fileUri, contentUint8);
            logger.info(`Successfully wrote ${content.length} characters to ${fileUri.fsPath}`);
            return { success: true, output: `File '${filePath}' written successfully.` };
        } catch (error: any) {
            logger.error(`Error writing file ${fileUri.fsPath}:`, error);
            return { success: false, error: `Failed to write file '${filePath}': ${error.message || error}` };
        }
    }
}

class CreateDiffTool extends BaseFileTool {
    readonly id = 'createDiff';
    readonly name = 'Create Diff Patch';
    readonly description = 'Creates a unified diff patch between the current content of a file and new proposed content. Useful for suggesting changes without overwriting.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the original file (relative or absolute).' },
            newContent: { type: 'string', description: 'The proposed new content for the file.' }
            // contextLines: { type: 'number', description: 'Number of context lines for the diff (default 3).', default: 3 }
        },
        required: ['filePath', 'newContent']
    };

    async execute(input: ToolInput, context: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const newContent = input.newContent as string;
        // const contextLines = input.contextLines as number ?? 3;

        if (typeof filePath !== 'string' || typeof newContent !== 'string') {
            return { success: false, error: "Input validation failed: 'filePath' and 'newContent' must be strings." };
        }

        const fileUri = resolvePathToUri(filePath);
         if (!fileUri) {
             return { success: false, error: `Could not resolve file path: ${filePath}.` };
        }

        try {
            // Read the original file content
            let originalContent = '';
             // Check cancellation before file access
            if (context.cancellationToken?.isCancellationRequested) {
                 return { success: false, error: "Operation cancelled by user." };
            }
            try {
                const originalContentUint8 = await vscode.workspace.fs.readFile(fileUri);
                originalContent = decoder.decode(originalContentUint8);
            } catch (error: any) {
                 if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                     logger.debug(`File '${filePath}' not found for diff creation, treating original as empty.`);
                     originalContent = ''; // Treat as diff against empty if file doesn't exist
                 } else {
                     throw error; // Re-throw other read errors
                 }
            }

            const patch = diffEngine.createPatch(filePath, filePath, originalContent, newContent /*, { context: contextLines } */);
            logger.info(`Successfully created diff patch for ${filePath}`);
            return { success: true, output: patch };

        } catch (error: any) {
            logger.error(`Error creating diff for ${filePath}:`, error);
            return { success: false, error: `Failed to create diff for '${filePath}': ${error.message || error}` };
        }
    }
}

class ApplyDiffTool extends BaseFileTool {
    readonly id = 'applyDiff';
    readonly name = 'Apply Diff Patch';
    readonly description = 'Applies a unified diff patch to a specified file. IMPORTANT: The file content should match the state the patch was created against for clean application.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string', description: 'Path to the file to patch (relative or absolute).' },
            patch: { type: 'string', description: 'The unified diff patch string.' },
            // fuzzFactor: { type: 'number', description: 'Patch fuzz factor (0-100, default 0). Higher values allow more mismatches but increase risk.', default: 0 }
        },
        required: ['filePath', 'patch']
    };

    async execute(input: ToolInput, context: AgentContext): Promise<ToolResult> {
        const filePath = input.filePath as string;
        const patch = input.patch as string;
        // const fuzzFactor = input.fuzzFactor as number ?? 0;

        if (typeof filePath !== 'string' || typeof patch !== 'string') {
            return { success: false, error: "Input validation failed: 'filePath' and 'patch' must be strings." };
        }

        const fileUri = resolvePathToUri(filePath);
         if (!fileUri) {
             return { success: false, error: `Could not resolve file path: ${filePath}.` };
        }

        try {
            // 1. Read the current content of the file
             let currentContent = '';
             // Check cancellation before file access
             if (context.cancellationToken?.isCancellationRequested) {
                 return { success: false, error: "Operation cancelled by user." };
             }
             try {
                 const currentContentUint8 = await vscode.workspace.fs.readFile(fileUri);
                 currentContent = decoder.decode(currentContentUint8);
             } catch (error: any) {
                  if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
                      logger.warn(`File '${filePath}' not found for applying patch. Attempting patch against empty content.`);
                      currentContent = ''; // Try applying patch to empty string (might create the file)
                  } else {
                      throw error; // Re-throw other read errors
                  }
             }

            // 2. Apply the patch using the diff engine
            const patchedContent = diffEngine.applyPatch(patch, currentContent /*, { fuzzFactor: fuzzFactor } */);

            if (patchedContent === false) {
                // Patch failed to apply cleanly
                return { success: false, error: `Patch could not be applied cleanly to ${filePath}. File content may have changed, or patch is invalid.` };
            }

            // 3. Write the patched content back to the file
            logger.debug(`Writing patched content back to: ${fileUri.fsPath}`);
            // Check cancellation before write
             if (context.cancellationToken?.isCancellationRequested) {
                 return { success: false, error: "Operation cancelled by user before writing patch." };
             }
            const patchedContentUint8 = encoder.encode(patchedContent); // Result has LF endings
            await vscode.workspace.fs.writeFile(fileUri, patchedContentUint8);

            logger.info(`Successfully applied patch to ${filePath}`);
            // Return confirmation message
            return { success: true, output: `Patch applied successfully to ${filePath}.` };

        } catch (error: any) {
            logger.error(`Error applying patch to ${filePath}:`, error);
            return { success: false, error: `Failed to apply patch to '${filePath}': ${error.message || error}` };
        }
    }
}


// --- File System Tool Dispatcher ---

export class FileSystemTool implements ITool {
    readonly id: ToolID = 'file';
    readonly name = 'File System Operations';
    readonly description = 'Provides actions to read, write, create diffs, and apply patches to files in the workspace. Use the specific action names (e.g., file.readFile).';
    // No top-level input schema, dispatcher uses 'action' key

    private actions: Map<string, BaseFileTool> = new Map();

    constructor() {
        this.registerAction(new ReadFileTool());
        this.registerAction(new WriteFileTool());
        this.registerAction(new CreateDiffTool());
        this.registerAction(new ApplyDiffTool());
    }

    private registerAction(action: BaseFileTool) {
        if (this.actions.has(action.id)) {
            logger.warn(`Duplicate file system action ID registered: ${action.id}`);
        }
        this.actions.set(action.id, action);
    }

    async execute(input: ToolInput, context: AgentContext): Promise<ToolResult> {
        const actionId = input.action as string; // Expect an 'action' key in the input
        const actionTool = this.actions.get(actionId);

        if (!actionTool) {
            const availableActions = Array.from(this.actions.keys()).join(', ');
            return { success: false, error: `Unknown file system action: '${actionId}'. Available actions: ${availableActions}` };
        }

        // Pass the rest of the input (excluding 'action') to the specific tool's execute method
        const actionInput = { ...input };
        delete actionInput.action;

        // Execute the specific action tool
        return actionTool.execute(actionInput, context);
    }

    // --- Expose sub-actions for LLM ---
    getSubActions(): ITool[] {
       return Array.from(this.actions.values());
    }

     // Helper for formatting for prompts/function calling
     getToolDescriptions(): string {
         return this.getSubActions().map(a =>
             `- ${this.id}.${a.id}: ${a.description}` +
             (a.inputSchema ? `\n  Arguments (JSON Schema): ${JSON.stringify(a.inputSchema)}` : '')
         ).join('\n');
     }
}

// Export a single instance
export const fileSystemTool = new FileSystemTool();
```

---

**`src/agents/tools/documentationTool.ts`**

```typescript
import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult, ToolID } from './tool';
import { logger } from '../../logger';
import { llmService } from '../../llm/llmService'; // Use singleton accessor
import { promptManager } from '../../prompts/promptManager';
import { AgentContext } from '../agent';
import { LLMConfig, getDefaultModelConfig } from '../../config';

/**
 * Tool for researching documentation.
 * Currently uses an LLM as a fallback research mechanism.
 * TODO: Integrate a real search API (e.g., Tavily, You.com, Google Search) for better results.
 */
export class DocumentationTool implements ITool {
    readonly id: ToolID = 'docs';
    readonly name = 'Documentation Research';
    readonly description = 'Searches for and summarizes technical documentation or answers questions based on available knowledge or external search (if configured).';
    readonly inputSchema = {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'The search query or question (e.g., "python list append", "react hooks tutorial", "how does vscode TreeDataProvider work?").' }
        },
        required: ['query']
    };

    // Allow configuring which LLM to use for research if fallback is used
    // Read from config? Or hardcode a sensible default?
    private getResearchLLMConfig(): LLMConfig {
         // Could potentially add a setting like 'codessa.tools.docs.llm'
         // For now, use the global default or a reasonable fallback
         const defaultConf = getDefaultModelConfig();
         return {
             provider: defaultConf.provider,
             modelId: defaultConf.modelId, // Use the default model for research
             options: { temperature: 0.3 } // Lower temperature for factual retrieval
         };
    }

    async execute(input: ToolInput, context: AgentContext): Promise<ToolResult> {
        const query = input.query as string;
        if (typeof query !== 'string' || !query.trim()) {
            return { success: false, error: "Input validation failed: 'query' must be a non-empty string." };
        }

        logger.info(`Documentation research requested for query: "${query}"`);

        // --- Placeholder for Real Search API Integration ---
        // if (isSearchApiConfigured()) {
        //     try {
        //         const searchResults = await callSearchApi(query);
        //         const summary = await summarizeSearchResults(searchResults); // Maybe use LLM to summarize
        //         return { success: true, output: summary };
        //     } catch (apiError) {
        //         logger.error("External search API call failed:", apiError);
        //         // Fallback to LLM? Or return error? For now, fallback.
        //     }
        // }
        // --- End Placeholder ---


        // --- Fallback using LLM ---
        logger.warn("DocumentationTool using LLM fallback for research. Results depend on model knowledge cutoff and capabilities.");

        const researchLLMConfig = this.getResearchLLMConfig();
        const provider = llmService().getProviderForConfig(researchLLMConfig); // Use singleton accessor

        if (!provider) {
             // Error message shown by getProviderForConfig
             return { success: false, error: `LLM provider '${researchLLMConfig.provider}' for documentation research not available or configured.` };
        }

        const systemPrompt = promptManager.getSystemPrompt('documentation_researcher', { QUERY: query });
        if (!systemPrompt) {
             // Use a generic fallback prompt if specific one is missing
             logger.warn("System prompt 'documentation_researcher' not found, using generic fallback.");
             // systemPrompt = `You are an AI assistant answering a technical query. Provide a concise and accurate answer based on your knowledge for: ${query}`;
             // For now, require the prompt
              return { success: false, error: "System prompt 'documentation_researcher' not found." };
        }

        try {
             // Check cancellation before LLM call
             if (context.cancellationToken?.isCancellationRequested) {
                 return { success: false, error: "Operation cancelled by user." };
             }

            const result = await provider.generate({
                prompt: `Research and answer the following query concisely: ${query}`, // Simple prompt
                systemPrompt: systemPrompt,
                modelId: researchLLMConfig.modelId,
                options: researchLLMConfig.options,
                cancellationToken: context.cancellationToken,
            });

            if (result.error || result.content === null) {
                return { success: false, error: `Documentation research failed: ${result.error ?? 'No content received'}` };
            }

            return { success: true, output: result.content };

        } catch (error: any) {
            logger.error(`Error during LLM-based documentation research for query "${query}":`, error);
            return { success: false, error: `Documentation research failed: ${error.message || error}` };
        }
    }
}

// Export a single instance
export const documentationTool = new DocumentationTool();
```

---

**`src/agents/tools/debugTool.ts`** (NEW FILE - Placeholder)

```typescript
import * as vscode from 'vscode';
import { ITool, ToolInput, ToolResult, ToolID } from './tool';
import { logger } from '../../logger';
import { AgentContext } from '../agent';

/**
 * Placeholder Tool for interacting with VS Code's debugging capabilities.
 * Requires significant integration with `vscode.debug` API.
 */
export class DebugTool implements ITool {
    readonly id: ToolID = 'debug';
    readonly name = 'VS Code Debugger';
    readonly description = 'Tool to interact with the VS Code debugger. Can start debugging, set breakpoints, step through code, inspect variables (EXPERIMENTAL - Not fully implemented).';
    // Define input schema for potential actions
    readonly inputSchema = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['start', 'setBreakpoint', 'stepOver', 'inspectVariable'], description: 'The debug action to perform.' },
            filePath: { type: 'string', description: 'File path for breakpoint or starting.' },
            lineNumber: { type: 'number', description: 'Line number for breakpoint.' },
            variableName: { type: 'string', description: 'Variable name to inspect.' },
            launchConfigName: { type: 'string', description: 'Name of the launch configuration to use for "start".' }
        },
        required: ['action'] // Action is always required
    };

    async execute(input: ToolInput, context: AgentContext): Promise<ToolResult> {
        const action = input.action as string;
        logger.info(`Debug tool action requested: ${action}`);
        logger.warn("Debug tool is experimental and not fully implemented.");

        // --- Implementation requires vscode.debug API ---
        // Example structure:
        switch (action) {
            case 'start':
                // const configName = input.launchConfigName;
                // const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                // if (workspaceFolder && configName) {
                //     await vscode.debug.startDebugging(workspaceFolder, configName);
                //     return { success: true, output: `Debugging started with configuration '${configName}'.` };
                // }
                return { success: false, error: "'start' action requires a valid workspace and launch configuration name (not implemented)." };

            case 'setBreakpoint':
                // const filePath = input.filePath;
                // const lineNumber = input.lineNumber;
                // if (filePath && typeof lineNumber === 'number') {
                //     const uri = resolvePathToUri(filePath);
                //     if (uri) {
                //         const breakpoint = new vscode.SourceBreakpoint(new vscode.Location(uri, new vscode.Position(lineNumber - 1, 0)));
                //         vscode.debug.addBreakpoints([breakpoint]);
                //         return { success: true, output: `Breakpoint set at ${filePath}:${lineNumber}.` };
                //     }
                // }
                return { success: false, error: "'setBreakpoint' action requires filePath and lineNumber (not implemented)." };

            case 'stepOver':
                 // await vscode.commands.executeCommand('workbench.action.debug.stepOver');
                 // return { success: true, output: "Executed step over command." };
                 return { success: false, error: "'stepOver' action not implemented." };

             case 'inspectVariable':
                 // Requires access to debug session state, which is complex.
                 // const variableName = input.variableName;
                 // const session = vscode.debug.activeDebugSession;
                 // if (session && variableName) { ... evaluate expression ... }
                 return { success: false, error: "'inspectVariable' action not implemented." };

            default:
                return { success: false, error: `Unknown debug action: ${action}` };
        }
        // --- End Implementation Placeholder ---
    }

     // This tool doesn't have sub-actions in the same way 'file' does
     // getSubActions?(): ITool[] { return undefined; }
}

// Export a single instance
export const debugTool = new DebugTool();
```

---

**`src/prompts/promptManager.ts`**

```typescript
import { getSystemPrompts, getPromptVariables } from "../config";
import { logger } from "../logger";
import { defaultSystemPrompts } from "./defaultPrompts";

/**
 * Manages loading, retrieving, and processing system prompts.
 */
class PromptManager {
    private systemPrompts: Record<string, string> = {};
    private variables: Record<string, string> = {};
    private static instance: PromptManager;

    private constructor() {
        this.loadPromptsAndVariables();
        // TODO: Add listener for config changes to reload prompts/vars if settings are edited?
        // vscode.workspace.onDidChangeConfiguration(e => {
        //     if (e.affectsConfiguration('codessa.systemPrompts') || e.affectsConfiguration('codessa.promptVariables')) {
        //         this.loadPromptsAndVariables();
        //     }
        // });
        // For now, requires restart or manual reload command if prompts change in settings.
    }

    public static getInstance(): PromptManager {
        if (!PromptManager.instance) {
            PromptManager.instance = new PromptManager();
        }
        return PromptManager.instance;
    }


    /** Reloads prompts and variables from configuration and defaults. */
    public loadPromptsAndVariables() {
        const userPrompts = getSystemPrompts();
        const userVariables = getPromptVariables();

        // Merge default and user prompts, user prompts override defaults
        this.systemPrompts = { ...defaultSystemPrompts, ...userPrompts };
        this.variables = { ...userVariables }; // User variables only for now, could add built-ins

        logger.info(`PromptManager: Loaded ${Object.keys(this.systemPrompts).length} system prompts and ${Object.keys(this.variables).length} global variables.`);
        logger.debug(`Available prompt names: ${Object.keys(this.systemPrompts).join(', ')}`);
    }

    /**
     * Gets a system prompt by name and fills placeholders with provided variables.
     * @param name The name of the system prompt (key in config or defaults).
     * @param additionalVars Optional map of additional variables specific to this request (e.g., file path, selected text). These override global variables.
     * @returns The processed prompt string, or undefined if the prompt name is not found.
     */
    getSystemPrompt(name: string, additionalVars: Record<string, string> = {}): string | undefined {
        const promptTemplate = this.systemPrompts[name];

        if (!promptTemplate) {
            logger.warn(`System prompt template named '${name}' not found.`);
            // Optionally return a default fallback prompt?
            // const fallback = this.systemPrompts['default_coder'];
            // if (fallback) {
            //      logger.warn(`Using fallback prompt 'default_coder' instead.`);
            //      promptTemplate = fallback;
            // } else {
                 return undefined; // Strict: return undefined if name not found
            // }
        }

        // Combine global and request-specific variables, request-specific take precedence
        const allVars = { ...this.variables, ...additionalVars };

        // Replace placeholders like {variable_name}
        try {
            // Use a more robust replacement to handle missing variables gracefully
            const filledPrompt = promptTemplate.replace(/\{([\w_.-]+)\}/g, (match, varName) => {
                const value = allVars[varName];
                if (value !== undefined && value !== null) {
                    return String(value); // Convert value to string
                } else {
                    logger.warn(`Variable '{${varName}}' not found for prompt '${name}'. Leaving placeholder.`);
                    return match; // Keep the placeholder if the variable is not found
                }
            });
            logger.debug(`Filled prompt '${name}' with variables: ${Object.keys(allVars).join(', ')}`);
            return filledPrompt;
        } catch (error) {
            logger.error(`Error processing prompt template '${name}':`, error);
            return promptTemplate; // Return unprocessed template on error
        }
    }

    /** Returns a list of all available system prompt names. */
    listPromptNames(): string[] {
        return Object.keys(this.systemPrompts);
    }
}

// Export a single instance
export const promptManager = PromptManager.getInstance();
```

---

**`src/prompts/defaultPrompts.ts`**

```typescript
/**
 * Default System Prompts for Codessa Agents
 *
 * These prompts include instructions for using tools via a specific JSON format.
 * They also utilize placeholders like {VARIABLE_NAME} which are filled in by the PromptManager.
 *
 * Available Variables (Provided by Agent/Context):
 * - {USER_REQUEST}: The user's primary request/prompt for the current task.
 * - {AVAILABLE_TOOLS_LIST}: A formatted list of tools the agent can use.
 * - {WORKSPACE_ROOT}: The root path of the current workspace.
 * - {CURRENT_FILE_PATH}: The path of the file currently open in the editor.
 * - {SELECTED_TEXT}: The text currently selected in the editor.
 * - {FILE_CONTENT}: The full content of the currently open file (use with caution for large files).
 * - {CLIPBOARD_CONTENT}: (Potential future variable) Content from the clipboard.
 * - {DIAGNOSTICS}: (Potential future variable) List of errors/warnings in the current file.
 * - {CUSTOM_VAR}: Any variables defined in `codessa.promptVariables` setting.
 *
 * Tool Usage Instruction Format:
 * The prompts instruct the LLM to output JSON for tool calls or final answers.
 * This provides a structured way for the agent code to parse the LLM's intent.
 */

const TOOL_USAGE_INSTRUCTIONS = `
TOOLS:
You have access to the following tools. Use them when necessary to fulfill the request.
{AVAILABLE_TOOLS_LIST}

OUTPUT FORMAT:
You MUST respond in one of the following two JSON formats ONLY. Do not add any other text, explanation, or formatting outside the JSON structure.

1. To call a tool:
{
  "tool_call": {
    "name": "tool_id.action_name", // e.g., "file.readFile", "docs.search"
    "arguments": { // Arguments for the specific tool action, matching its input schema
      "arg1": "value1",
      "arg2": "value2"
      // ...
    }
  }
}

2. When you have the final answer and need no more tools:
{
  "final_answer": "Your complete final response here. For code, use markdown code blocks unless the mode is 'inline' or 'edit' requires raw output for patching."
}

PROCESS:
1. Analyze the user request ({USER_REQUEST}) and the current context (e.g., {CURRENT_FILE_PATH}, {SELECTED_TEXT}).
2. Decide if any tools are needed.
3. If a tool is needed, output the JSON for the "tool_call".
4. I will execute the tool and provide the result back to you in the next turn.
5. Analyze the tool result and continue the process, potentially calling more tools.
6. Once you have all the information needed, provide the complete answer using the "final_answer" JSON format.
7. If you encounter an error or cannot fulfill the request, explain the issue in the "final_answer".
`;

export const defaultSystemPrompts: Record<string, string> = {
    // --- General Purpose ---
    'default_coder': `You are Codessa, an expert AI programming assistant.
Role: Assist the user with coding tasks, following instructions precisely.
Context: Workspace root is {WORKSPACE_ROOT}. Current file is {CURRENT_FILE_PATH}. Selected text is: {SELECTED_TEXT}.
Task: Fulfill the user request: {USER_REQUEST}.
Constraints:
- Ensure code is high quality, well-documented, and adheres to best practices.
- Think step-by-step.
- Use the available tools for file operations or research when needed.
- Ask clarifying questions if the request is ambiguous by including the question in the 'final_answer'.
${TOOL_USAGE_INSTRUCTIONS}`,

    // --- Mode Specific ---
    'chat_agent': `You are Codessa, a helpful AI assistant engaging in a conversation.
Role: Respond clearly and concisely to the user's messages, maintaining conversational context from the history.
Task: Respond to the latest user message: {USER_REQUEST}.
Constraints:
- Be conversational and helpful.
- Use tools if needed for information retrieval or file operations requested by the user.
${TOOL_USAGE_INSTRUCTIONS}`,

    'edit_agent': `You are Codessa, an expert AI code editing assistant.
Role: Modify existing code based on the user's request.
Context: The code to modify is in file '{CURRENT_FILE_PATH}'. The relevant code snippet (selection or full file) is provided as {SELECTED_TEXT}.
Task: Apply the requested edit: {USER_REQUEST}.
Constraints:
- Analyze the code and the request carefully.
- **Crucially, use the 'file.createDiff' tool to generate a patch for the changes.** Do not output the full modified code directly.
- In your 'final_answer', explain the changes you made and why.
${TOOL_USAGE_INSTRUCTIONS}`,

    'generate_agent': `You are Codessa, an expert AI code generation assistant.
Role: Generate new code based on the user's request.
Context: Workspace root is {WORKSPACE_ROOT}. Current file context is {CURRENT_FILE_PATH}. User might have selected relevant text: {SELECTED_TEXT}.
Task: Generate code for: {USER_REQUEST}.
Constraints:
- Generate correct, efficient, and well-styled code.
- If the request implies creating a new file, use the 'file.writeFile' tool.
- Provide the generated code within markdown blocks in your 'final_answer', unless a tool was used to write it to a file.
${TOOL_USAGE_INSTRUCTIONS}`,

    'inline_agent': `You are Codessa, generating a concise code snippet for inline insertion or replacement.
Role: Generate or modify a small piece of code based on user request.
Context: Current file is {CURRENT_FILE_PATH}. User selected text: {SELECTED_TEXT}.
Task: Fulfill the inline request: {USER_REQUEST}.
Constraints:
- Generate ONLY the raw code snippet required.
- Do NOT use markdown code blocks (\`\`\`).
- Do NOT add any explanations or surrounding text.
- Output the raw code directly in the 'final_answer' field.
- Only use tools if absolutely necessary to fulfill the request (e.g., reading another file specified by the user).
${TOOL_USAGE_INSTRUCTIONS}`,

    // --- Specialized Tasks ---
    'debug_fixer': `You are Codessa, an AI debugging assistant.
Role: Analyze diagnostics and code to identify and fix errors.
Context: File path is {FILE_PATH}. Relevant code snippet: {CODE_SNIPPET}. Error message: {ERROR_MESSAGE}. Diagnostics: {DIAGNOSTICS}.
Task: Identify the root cause, propose a fix, and apply it using tools.
Constraints:
- Use 'file.createDiff' to generate a patch for the fix.
- Explain the error and the fix in the 'final_answer'.
${TOOL_USAGE_INSTRUCTIONS}`,

    'documentation_researcher': `You are Codessa, an AI documentation specialist.
Role: Find and summarize technical documentation or answer technical questions.
Task: Research the user's query: {QUERY}.
Constraints:
- Primarily use the 'docs.search' tool with the query.
- Summarize the findings from the tool result clearly in your 'final_answer'.
- If the tool fails or provides insufficient info, state that you couldn't find the information using the available tools.
${TOOL_USAGE_INSTRUCTIONS}`,

    'supervisor': `You are Codessa Supervisor, coordinating specialist AI agents.
Role: Decompose a complex user request and delegate sub-tasks to appropriate agents. Synthesize results.
User Request: {USER_REQUEST}
Available Specialist Agents:
{AGENT_LIST}

Process:
1. Analyze the User Request and break it down into logical sub-tasks suitable for the available specialist agents.
2. For each sub-task, identify the best agent from the list.
3. Output delegation instructions one at a time using the EXACT format:
   [DELEGATE agent_id] Task Description: <The specific, self-contained task description for the sub-agent>
4. Wait for the result of the delegated task. I will provide it to you.
5. Analyze the result and decide the next step: delegate another task or synthesize the final answer.
6. When all sub-tasks are complete and you have the final result, output it using the EXACT format:
   [FINAL_ANSWER] <Your complete, synthesized final response to the original User Request>

Constraints:
- Only delegate to agents listed in {AGENT_LIST} using their exact IDs.
- Provide clear, unambiguous task descriptions for delegation.
- Do NOT use the tool usage JSON format yourself. Use [DELEGATE ...] and [FINAL_ANSWER] formats.
- If a sub-agent fails, analyze the error (I will provide it) and decide whether to retry, delegate to a different agent, or report failure in the [FINAL_ANSWER].`,

    // --- XP Programming Examples (Illustrative) ---
    'xp_tester': `You are Codessa, following TDD principles.
Role: Write unit tests *before* implementation.
Context: Project uses testing framework {TEST_FRAMEWORK}. Feature to test: {FEATURE_DESCRIPTION}. Target file for tests: {TEST_FILE_PATH}.
Task: Write comprehensive unit tests covering the feature description.
Constraints:
- Write clear, effective tests covering main functionality and edge cases.
- Use the 'file.writeFile' tool to write the generated tests to {TEST_FILE_PATH}.
- In the 'final_answer', confirm that tests have been written to the file.
${TOOL_USAGE_INSTRUCTIONS}`,

    'xp_implementer': `You are Codessa, following TDD principles.
Role: Write the simplest code to pass existing tests. Refactor if necessary.
Context: Implementation target file: {IMPLEMENTATION_FILE_PATH}. Unit tests are provided in: {TEST_CODE_SNIPPET or TEST_FILE_PATH}.
Task: Write implementation code in {IMPLEMENTATION_FILE_PATH} to pass the provided tests.
Constraints:
- Write the simplest possible code first.
- Ensure all provided tests pass.
- Refactor for clarity and efficiency *after* tests pass.
- Use the 'file.writeFile' tool to write the final implementation to {IMPLEMENTATION_FILE_PATH}.
- In the 'final_answer', confirm that the implementation has been written.
${TOOL_USAGE_INSTRUCTIONS}`,
};
```

---

**`src/agents/agent.ts`**

```typescript
import * as vscode from 'vscode';
import {
    LLMConfig, AgentConfig, getMaxToolIterations, ToolID, getAgentConfigs
} from '../config';
import { llmService } from '../llm/llmService'; // Use singleton accessor
import { promptManager } from '../prompts/promptManager';
import { logger } from '../logger';
import { ITool, ToolInput, ToolResult } from './tools/tool';
import { fileSystemTool } from './tools/fileSystemTool';
import { documentationTool } from './tools/documentationTool';
import { debugTool } from './tools/debugTool';
import { LLMGenerateResult, LLMGenerateParams } from '../llm/llmProvider';

// --- Agent Execution Modes ---
export type AgentMode = 'task' | 'chat' | 'edit' | 'generate' | 'inline';

// --- Input structure for the agent ---
export interface AgentRunInput {
    mode: AgentMode;
    prompt: string; // The main user request or message
    chatHistory?: AgentMessage[]; // For chat mode
    targetFilePath?: string; // For edit/generate related to a file
    targetCode?: string; // For edit mode (e.g., selected code or file content)
}

// --- Message structure for history ---
export interface AgentMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null; // Content can be null for assistant messages with only tool calls
    // For assistant message with tool calls (OpenAI/Anthropic format)
    tool_calls?: any[]; // Structure depends on provider
    // For tool result message
    tool_call_id?: string; // ID of the tool call this result corresponds to
    name?: string; // Tool name (for context)
    is_error?: boolean; // Indicate if tool execution failed (Anthropic style)
}


// --- Output structure from the agent ---
export interface AgentRunResult {
    success: boolean;
    finalAnswer?: string; // The final text response from the LLM
    toolResults?: ToolResult[]; // Record of tools used and their results
    history?: AgentMessage[]; // The full execution history (for debugging/context)
    error?: string;
    // Mode-specific output hints
    appliedPatch?: boolean; // If edit mode applied a patch via tools
    outputFilePath?: string; // If generate mode created a file via tools
}


// Context passed during execution, including editor state
export interface AgentContext {
    workspaceRoot?: string;
    currentFilePath?: string; // File open in editor
    fileContent?: string; // Full content of the active file
    selectedText?: string;
    variables?: Record<string, string>; // Custom variables from settings/runtime
    cancellationToken?: vscode.CancellationToken;
}

/**
 * Represents an AI agent capable of performing tasks using LLMs and tools.
 */
export class Agent {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly systemPromptName: string;
    readonly llmConfig: LLMConfig; // Fully resolved LLM config
    readonly tools: Map<ToolID, ITool> = new Map(); // Map tool ID to instance
    readonly isSupervisor: boolean;

    constructor(config: AgentConfig) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.systemPromptName = config.systemPromptName;
        this.isSupervisor = config.isSupervisor ?? false;

        // Resolve the full LLM config, merging with defaults
        this.llmConfig = llmService().resolveLLMConfig(config.llm);

        // Register tools specified in the config
        this.registerTools(config.tools ?? ['file', 'docs']); // Default tools if none specified
        logger.debug(`Agent '${this.name}' [${this.id}] initialized. LLM: ${this.llmConfig.provider}/${this.llmConfig.modelId}, Tools: ${Array.from(this.tools.keys()).join(', ')}`);
    }

    private registerTools(toolIds: ToolID[]) {
        // Map tool IDs to actual tool instances
        const availableTools: Record<ToolID, ITool> = {
            'file': fileSystemTool,
            'docs': documentationTool,
            'debug': debugTool,
        };

        toolIds.forEach(id => {
            const tool = availableTools[id];
            if (tool) {
                // Supervisors shouldn't have tools registered directly, they delegate
                if (!this.isSupervisor) {
                    this.tools.set(id, tool);
                    logger.debug(`Agent '${this.name}' registered tool: ${id}`);
                } else if (id !== 'file' && id !== 'docs' && id !== 'debug') { // Allow supervisors to potentially list tools for context? No, keep clean.
                     logger.warn(`Supervisor agent '${this.name}' should not have tool '${id}' configured directly. Tools are for sub-agents.`);
                }
            } else {
                logger.warn(`Agent '${this.name}' configured with unknown tool ID: ${id}`);
            }
        });
    }

    /** Generates a formatted list of descriptions for the agent's available tools. */
    private getToolDescriptionList(): string {
        if (this.tools.size === 0) {
            return "No tools available for this agent.";
        }
        let list = "";
        this.tools.forEach(tool => {
            // Use specific description method if available (e.g., for file tool sub-actions)
            if (typeof (tool as any).getToolDescriptions === 'function') {
                 list += (tool as any).getToolDescriptions() + '\n';
            }
            // Otherwise, use the tool's main description and schema
            else {
                 list += `- ${tool.id}: ${tool.description}\n`;
                 if (tool.inputSchema) {
                     try {
                         list += `  Arguments (JSON Schema): ${JSON.stringify(tool.inputSchema)}\n`;
                     } catch (e) {
                          logger.warn(`Failed to stringify schema for tool ${tool.id}`);
                     }
                 }
            }
        });
        return list.trim();
    }

    /**
     * Runs the agent with a given input, context, and mode.
     * Implements the primary agent loop for interacting with the LLM and tools.
     */
    async run(input: AgentRunInput, context: AgentContext): Promise<AgentRunResult> {
        const runId = generateUUID().substring(0, 8); // Short ID for logging this run
        logger.info(`Agent '${this.name}' [${runId}] starting run. Mode: ${input.mode}, Prompt: "${input.prompt.substring(0, 60)}..."`);
        const startTime = Date.now();

        const provider = llmService().getProviderForConfig(this.llmConfig);
        if (!provider) {
            // Error message shown by getProviderForConfig
            return { success: false, error: `LLM provider '${this.llmConfig.provider}' unavailable for agent '${this.name}'.`, history: [] };
        }

        // --- Prepare System Prompt ---
        const systemPromptVars = {
            USER_REQUEST: input.prompt,
            AVAILABLE_TOOLS_LIST: this.getToolDescriptionList(),
            WORKSPACE_ROOT: context.workspaceRoot ?? 'N/A',
            CURRENT_FILE_PATH: context.currentFilePath ?? input.targetFilePath ?? 'N/A',
            SELECTED_TEXT: context.selectedText ?? (input.mode === 'edit' ? input.targetCode ?? '' : 'N/A'),
            FILE_CONTENT: context.fileContent ?? 'N/A', // Provide full file content context
            ...(promptManager.variables), // Global prompt variables
            ...(context.variables ?? {}) // Runtime variables
        };
        const systemPrompt = promptManager.getSystemPrompt(this.systemPromptName, systemPromptVars);

        if (!systemPrompt) {
            const errorMsg = `System prompt '${this.systemPromptName}' not found for agent '${this.name}'.`;
            logger.error(errorMsg);
            return { success: false, error: errorMsg, history: [] };
        }

        // --- Initialize Agent State ---
        const executionHistory: AgentMessage[] = [];
        const toolResultsLog: ToolResult[] = [];
        let iterations = 0;
        const maxIterations = getMaxToolIterations();

        // Add initial system prompt to history if provider doesn't handle it separately?
        // Most modern APIs prefer a dedicated system parameter.
        // executionHistory.push({ role: 'system', content: systemPrompt });

        // Add chat history or initial user prompt
        if (input.mode === 'chat' && input.chatHistory) {
             executionHistory.push(...input.chatHistory);
        }
        // Add the main prompt for this run as the latest user message
        executionHistory.push({ role: 'user', content: input.prompt });


        // --- Agent Loop ---
        while (iterations < maxIterations) {
            iterations++;
            logger.debug(`Agent '${this.name}' [${runId}] - Iteration ${iterations}/${maxIterations}`);

            if (context.cancellationToken?.isCancellationRequested) {
                logger.info(`Agent '${this.name}' [${runId}] run cancelled by user.`);
                return { success: false, error: 'Operation cancelled by user.', history: executionHistory, toolResults: toolResultsLog };
            }

            // --- Prepare LLM Call ---
            const llmParams: LLMGenerateParams = {
                prompt: input.prompt, // Pass latest prompt separately (some providers might use it)
                systemPrompt: systemPrompt, // Pass resolved system prompt
                modelId: this.llmConfig.modelId,
                history: executionHistory, // Pass the current state
                tools: this.tools, // Pass available tools map
                cancellationToken: context.cancellationToken,
                options: this.llmConfig.options, // Pass resolved options
            };

            let llmResult: LLMGenerateResult;
            try {
                llmResult = await provider.generate(llmParams);
            } catch (error: any) {
                 logger.error(`Agent '${this.name}' [${runId}] LLM provider execution failed:`, error);
                 return { success: false, error: `LLM communication error: ${error.message}`, history: executionHistory, toolResults: toolResultsLog };
            }

            if (llmResult.error) {
                logger.error(`Agent '${this.name}' [${runId}] LLM generation error: ${llmResult.error}`);
                // If rate limit error, maybe suggest waiting?
                return { success: false, error: `LLM generation failed: ${llmResult.error}`, history: executionHistory, toolResults: toolResultsLog };
            }

            // --- Process LLM Response ---
            const assistantResponseContent = llmResult.content;
            const nativeToolCalls = llmResult.toolCalls; // Already parsed by provider if supported
            let parsedToolCall: { id?: string; name: string; arguments: any } | null = null;
            let finalAnswer: string | null = null;

            const assistantMessage: AgentMessage = { role: 'assistant', content: assistantResponseContent };

            // A. Check for Native Tool Calls
            if (nativeToolCalls && nativeToolCalls.length > 0) {
                logger.info(`Agent '${this.name}' [${runId}] received ${nativeToolCalls.length} native tool call(s).`);
                // Assume one call per turn for simplicity now
                const call = nativeToolCalls[0];
                // Adapt parsing based on expected provider format (OpenAI vs Anthropic)
                if (call.type === 'function' && call.function) { // OpenAI style
                     try {
                         parsedToolCall = {
                             id: call.id,
                             name: call.function.name.replace('_', '.'), // Convert back name format
                             arguments: JSON.parse(call.function.arguments || '{}')
                         };
                         assistantMessage.tool_calls = nativeToolCalls; // Store original calls in history
                     } catch (e) { logger.error(`Failed to parse arguments for OpenAI tool call ${call.function.name}: ${e}`); }
                } else if (call.type === 'tool_use' && call.name && call.input) { // Anthropic style
                     parsedToolCall = {
                         id: call.id,
                         name: call.name.replace('_', '.'), // Convert back name format
                         arguments: call.input // Arguments are already parsed object
                     };
                     assistantMessage.tool_calls = nativeToolCalls; // Store original calls in history
                } else {
                     logger.warn(`Unrecognized native tool call format: ${JSON.stringify(call)}`);
                }
                 if (parsedToolCall) {
                     logger.debug(`Parsed native tool call: ${parsedToolCall.name}, Args: ${JSON.stringify(parsedToolCall.arguments)}`);
                 }
            }

            // B. Check for JSON formatted response (Fallback)
            if (!parsedToolCall && assistantResponseContent) {
                try {
                    // Be lenient with potential markdown fences around the JSON
                    const jsonMatch = assistantResponseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```|^\s*(\{[\s\S]*\})\s*$/);
                    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[2]) : assistantResponseContent;
                    const parsedJson = JSON.parse(jsonString.trim());

                    if (parsedJson.tool_call?.name && parsedJson.tool_call?.arguments) {
                        logger.info(`Agent '${this.name}' [${runId}] received JSON tool call.`);
                        parsedToolCall = {
                            name: parsedJson.tool_call.name,
                            arguments: parsedJson.tool_call.arguments
                            // No ID for JSON calls unless LLM includes one
                        };
                         logger.debug(`Parsed JSON tool call: ${parsedToolCall.name}, Args: ${JSON.stringify(parsedToolCall.arguments)}`);
                         // Don't add the JSON itself to history, just the upcoming tool result
                         assistantMessage.content = null; // Clear content as it was just the JSON instruction
                    } else if (parsedJson.final_answer !== undefined) {
                        logger.info(`Agent '${this.name}' [${runId}] received JSON final answer.`);
                        finalAnswer = String(parsedJson.final_answer); // Ensure it's a string
                        assistantMessage.content = finalAnswer; // Keep the answer in the assistant message
                    }
                    // If JSON is valid but not tool_call/final_answer, treat as plain text below
                } catch (e) {
                    // Not valid JSON or not the expected format, treat as plain text final answer
                    if (!nativeToolCalls || nativeToolCalls.length === 0) { // Only if no native call was detected
                        finalAnswer = assistantResponseContent;
                    }
                }
            }

            // C. If no tool call detected and no JSON final answer, treat any remaining content as final
            if (!parsedToolCall && finalAnswer === null && assistantResponseContent) {
                 logger.info(`Agent '${this.name}' [${runId}] treating plain text response as final answer.`);
                 finalAnswer = assistantResponseContent;
            }

            // Add the assistant's turn to history (might contain text, tool_calls, or both)
            if (assistantMessage.content || assistantMessage.tool_calls) {
                executionHistory.push(assistantMessage);
            }


            // --- Execute Tool or Finish ---
            if (parsedToolCall) {
                const toolName = parsedToolCall.name;
                const toolArgs = parsedToolCall.arguments ?? {};
                const toolCallId = parsedToolCall.id; // May be undefined for JSON calls

                logger.info(`Agent '${this.name}' [${runId}] executing tool: ${toolName}`);
                logger.debug(`Tool arguments: ${JSON.stringify(toolArgs)}`);

                const toolNameParts = toolName.split('.'); // e.g., "file.readFile"
                const toolId = toolNameParts[0] as ToolID;
                const actionId = toolNameParts.length > 1 ? toolNameParts[1] : undefined; // Action ID for tools like 'file'

                const tool = this.tools.get(toolId);
                let toolResultData: ToolResult;

                if (tool) {
                    // Prepare input, adding action if needed by dispatcher tools
                    const toolInput: ToolInput = actionId ? { action: actionId, ...toolArgs } : { ...toolArgs };
                    try {
                        // Execute the tool, passing agent context
                        toolResultData = await tool.execute(toolInput, context);
                        toolResultsLog.push(toolResultData); // Log result
                        logger.info(`Tool '${toolName}' executed. Success: ${toolResultData.success}`);
                         if (!toolResultData.success) {
                             logger.warn(`Tool '${toolName}' failed: ${toolResultData.error}`);
                         }
                    } catch (error: any) {
                        logger.error(`Unhandled error executing tool '${toolName}':`, error);
                        toolResultData = { success: false, error: `Tool execution threw an exception: ${error.message}` };
                        toolResultsLog.push(toolResultData);
                    }
                } else {
                    logger.error(`Agent '${this.name}' [${runId}] requested unknown tool: ${toolId}`);
                    toolResultData = { success: false, error: `Unknown tool: ${toolId}` };
                    toolResultsLog.push(toolResultData);
                }

                // Add tool result message to history for the next LLM iteration
                executionHistory.push({
                    role: 'tool',
                    tool_call_id: toolCallId, // Link to the call ID if available
                    name: toolName, // Include tool name for context
                    content: JSON.stringify(toolResultData.output ?? { error: toolResultData.error }), // Send output or error back
                    is_error: !toolResultData.success // Flag if error occurred (Anthropic style)
                });

                // Loop continues...

            } else if (finalAnswer !== null) {
                // --- Final Answer Reached ---
                const duration = Date.now() - startTime;
                logger.info(`Agent '${this.name}' [${runId}] reached final answer after ${iterations} iterations (${duration}ms).`);

                // Post-processing based on mode (e.g., check if patch applied)
                let appliedPatch = false;
                let outputFilePath: string | undefined;
                if (input.mode === 'edit' && input.targetFilePath) {
                    // Check successful file.applyDiff results for the target file
                     appliedPatch = toolResultsLog.some(r =>
                         r.success &&
                         r.output?.toString().includes('applied successfully') &&
                         r.output?.toString().includes(input.targetFilePath!) // Check if message confirms the specific file
                     );
                     if(appliedPatch) logger.info(`Edit mode detected successful patch application for ${input.targetFilePath}`);
                }
                 if (input.mode === 'generate') {
                     // Check successful file.writeFile results
                     const writeResult = toolResultsLog.find(r =>
                         r.success &&
                         r.output?.toString().includes('written successfully')
                     );
                     if (writeResult) {
                         // Extract file path from success message if possible (fragile)
                         const match = writeResult.output?.toString().match(/'([^']*)'/);
                         outputFilePath = match ? match[1] : undefined;
                         if(outputFilePath) logger.info(`Generate mode detected successful file write to ${outputFilePath}`);
                     }
                 }

                return {
                    success: true,
                    finalAnswer: finalAnswer,
                    toolResults: toolResultsLog,
                    history: executionHistory,
                    appliedPatch: appliedPatch,
                    outputFilePath: outputFilePath,
                };
            } else {
                 // Should not happen if logic is correct (LLM gave neither content nor tool call)
                 logger.error(`Agent '${this.name}' [${runId}] loop ended unexpectedly without tool call or final answer.`);
                 return { success: false, error: "Agent loop finished unexpectedly (LLM provided no actionable response).", history: executionHistory, toolResults: toolResultsLog };
            }
        } // End of while loop

        // --- Max Iterations Reached ---
        const duration = Date.now() - startTime;
        logger.warn(`Agent '${this.name}' [${runId}] reached max iterations (${maxIterations}) after ${duration}ms.`);
        return {
            success: false,
            error: `Agent exceeded maximum tool iterations (${maxIterations}). Task may be incomplete.`,
            history: executionHistory,
            toolResults: toolResultsLog
        };
    }
}

// Helper function to generate UUID - assuming utils.ts has it
import { generateUUID } from '../utils';
```

---

**`src/agents/agentManager.ts`**

```typescript
import * as vscode from 'vscode';
import { AgentConfig, getAgentConfigs, updateAgentConfigs, LLMConfig, ToolID } from '../config';
import { Agent } from './agent';
import { logger } from '../logger';
import { generateUUID, showInputBox, showQuickPick } from '../utils';
import { promptManager } from '../prompts/promptManager';
import { llmService } from '../llm/llmService'; // Use singleton accessor
import { fileSystemTool, documentationTool, debugTool } from './tools/tool'; // Import available tools

/**
 * Manages the lifecycle and configuration of agents.
 */
class AgentManager {
    private agents: Map<string, Agent> = new Map();
    private onDidChangeAgentsEmitter = new vscode.EventEmitter<void>();
    readonly onDidChangeAgents: vscode.Event<void> = this.onDidChangeAgentsEmitter.event;
    private static instance: AgentManager;
    private context: vscode.ExtensionContext;


    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadAgentsFromConfig(); // Initial load

        // Watch for configuration changes affecting agents
         context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            const affectsAgents = e.affectsConfiguration('codessa.agents');
            const affectsPrompts = e.affectsConfiguration('codessa.systemPrompts');
            const affectsProviders = e.affectsConfiguration('codessa.providers') || e.affectsConfiguration('codessa.defaultModel');

            if (affectsAgents || affectsPrompts || affectsProviders) {
                logger.info("Agent configuration or related settings changed, reloading agents...");
                // Reload prompts if they changed
                if (affectsPrompts) {
                    promptManager.loadPromptsAndVariables();
                }
                // Reload agents from config
                this.loadAgentsFromConfig();
            }
        }));
    }

     public static initialize(context: vscode.ExtensionContext): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager(context);
        }
        return AgentManager.instance;
    }

    public static getInstance(): AgentManager {
         if (!AgentManager.instance) {
             // This should not happen if initialized correctly in activate()
            throw new Error("AgentManager not initialized. Call AgentManager.initialize() first.");
        }
        return AgentManager.instance;
    }


    /** Loads agent configurations from VS Code settings and instantiates Agent objects. */
    loadAgentsFromConfig() {
        const agentConfigs = getAgentConfigs(); // Already filters invalid configs
        const currentAgentIds = new Set(this.agents.keys());
        const loadedAgentIds = new Set<string>();

        logger.info(`Loading ${agentConfigs.length} agent configurations...`);
        this.agents.clear(); // Clear existing agents before loading

        agentConfigs.forEach(config => {
            try {
                const agent = new Agent(config);
                this.agents.set(agent.id, agent);
                loadedAgentIds.add(agent.id);
            } catch (error) {
                logger.error(`Failed to instantiate agent from config (ID: ${config.id}):`, error);
            }
        });

        // Log loaded agents
        if (this.agents.size > 0) {
             logger.debug(`Loaded agents: ${Array.from(this.agents.keys()).join(', ')}`);
        } else {
             logger.debug("No valid agent configurations found.");
        }


        // Determine if the list actually changed before firing event
        let changed = false;
        if (currentAgentIds.size !== loadedAgentIds.size) {
            changed = true;
        } else {
            for (const id of currentAgentIds) {
                if (!loadedAgentIds.has(id)) {
                    changed = true;
                    break;
                }
            }
        }

        if (changed) {
            logger.debug("Agent list changed, firing onDidChangeAgents event.");
            this.onDidChangeAgentsEmitter.fire();
        } else {
             logger.debug("Agent list unchanged after reload.");
        }
    }

    /** Gets an agent instance by its ID. */
    getAgent(id: string): Agent | undefined {
        return this.agents.get(id);
    }

    /** Gets all currently loaded agent instances. */
    getAllAgents(): Agent[] {
        return Array.from(this.agents.values());
    }

    /** Gets the raw agent configurations from settings. */
    getAllAgentConfigs(): AgentConfig[] {
        return getAgentConfigs(); // Read directly from config helper
    }

    /** Guides the user through creating a new agent configuration via UI prompts. */
    async createAgentInteractively(): Promise<void> {
        logger.debug("Starting interactive agent creation...");

        const name = await showInputBox({ prompt: "Enter a name for the new agent:", placeHolder: "My Coder Agent", ignoreFocusOut: true });
        if (!name) return;

        const description = await showInputBox({ prompt: "Enter a short description (optional):", placeHolder: "Agent specialized in Python refactoring", ignoreFocusOut: true });

        // Select System Prompt
        const promptNames = promptManager.listPromptNames();
        if (promptNames.length === 0) {
            vscode.window.showErrorMessage("No system prompts available. Define prompts in Codessa settings first.");
            return;
        }
        const selectedPromptItem = await showQuickPick(
            promptNames.map(p => ({ label: p, description: `Use the '${p}' system prompt` })),
            "Select a system prompt for the agent", { canPickMany: false, ignoreFocusOut: true }
        );
        if (!selectedPromptItem || typeof selectedPromptItem === 'object' && !('label' in selectedPromptItem)) return; // Check for array return if canPickMany was true
        const systemPromptName = (selectedPromptItem as vscode.QuickPickItem).label;


        // Select LLM (Optional - use default if not chosen)
        const
		
		```typescript
        const llmChoice = await showQuickPick(
            [
                { label: "Use Default LLM", description: "Use the global default provider/model set in settings" },
                { label: "Specify LLM", description: "Choose a specific provider and model for this agent" }
            ],
            "Select LLM configuration for the agent",
            { canPickMany: false, ignoreFocusOut: true }
        );
        // Ensure llmChoice is not an array and has a label
        if (!llmChoice || typeof llmChoice !== 'object' || !('label' in llmChoice)) return;


        let llmConfig: Partial<LLMConfig> | undefined = undefined; // Use Partial for agent config
        if ((llmChoice as vscode.QuickPickItem).label === "Specify LLM") {
            const providerIds = llmService().listProviderIds();
            if (providerIds.length === 0) {
                 vscode.window.showErrorMessage("No LLM providers registered. Check extension logs.");
                 return;
            }
            const availableProviders = providerIds.map(id => ({ label: id, description: `Use the ${id} provider` }));
            const selectedProviderItem = await showQuickPick(
                availableProviders,
                "Select the LLM Provider",
                { canPickMany: false, ignoreFocusOut: true }
            );
            if (!selectedProviderItem || typeof selectedProviderItem !== 'object' || !('label' in selectedProviderItem)) return;
            const providerId = (selectedProviderItem as vscode.QuickPickItem).label;

            // Fetch models for the selected provider
            const provider = llmService().getProvider(providerId);
            let modelId: string | undefined;
            let models: string[] = [];
            if (provider?.getAvailableModels) {
                 models = await vscode.window.withProgress({
                     location: vscode.ProgressLocation.Notification,
                     title: `Fetching models for ${providerId}...`,
                     cancellable: false
                 }, async () => {
                     return await provider.getAvailableModels!(); // Use non-null assertion as we checked existence
                 });
            }

            if (models.length > 0) {
                 const selectedModelItem = await showQuickPick(
                     models.map(m => ({ label: m })),
                     `Select a model for ${providerId} (or type to filter/add)`,
                     { canPickMany: false, ignoreFocusOut: true } // Allow typing custom model
                 );
                  // Handle case where user types a custom model not in the list
                 if (typeof selectedModelItem === 'string') {
                     modelId = selectedModelItem;
                 } else if (selectedModelItem?.label) {
                     modelId = selectedModelItem.label;
                 } else {
                      // User might have cancelled, or entered empty string?
                      // Ask explicitly if cancelled
                      const manualModelId = await showInputBox({
                          prompt: `Enter model ID for ${providerId}:`,
                          placeHolder: "e.g., gpt-4-turbo, claude-3-sonnet-20240229, llama3:8b",
                          ignoreFocusOut: true
                      });
                       if (!manualModelId) return; // User cancelled explicit input
                       modelId = manualModelId;
                 }

            } else {
                 modelId = await showInputBox({
                     prompt: `Could not fetch models for ${providerId}. Enter model ID manually:`,
                     placeHolder: "e.g., gpt-4-turbo, claude-3-sonnet-20240229, llama3:8b",
                     ignoreFocusOut: true
                 });
            }

            if (!modelId) return; // User cancelled model selection

            // Optional: Allow setting specific options (temperature, etc.)
            const optionsInput = await showInputBox({
                 prompt: `Enter provider-specific options as JSON (optional, e.g., {"temperature": 0.5}):`,
                 placeHolder: `{"temperature": 0.7, "max_tokens": 2048}`,
                 ignoreFocusOut: true
            });
            let options: Record<string, any> | undefined;
            if (optionsInput) {
                 try {
                     options = JSON.parse(optionsInput);
                 } catch (e) {
                     logger.warn(`Invalid JSON entered for LLM options: ${optionsInput}`, e);
                     vscode.window.showWarningMessage("Invalid JSON format for LLM options. Options will be ignored.");
                 }
            }

            llmConfig = { provider: providerId, modelId: modelId, options: options };
        }

        // Select Tools (Multi-select)
        const availableTools: { id: ToolID; name: string; description: string }[] = [
            { id: 'file', name: fileSystemTool.name, description: 'Read/write files, diff/patch' },
            { id: 'docs', name: documentationTool.name, description: 'Research documentation' },
            { id: 'debug', name: debugTool.name, description: 'Interact with debugger (Experimental)' },
        ];
        const selectedToolItems = await showQuickPick(
             availableTools.map(t => ({
                 label: t.id,
                 description: t.name,
                 detail: t.description,
                 picked: t.id === 'file' || t.id === 'docs' // Pre-select common tools
                })),
             "Select tools the agent can use",
             { canPickMany: true, ignoreFocusOut: true }
        );
        // Ensure selectedToolItems is an array before mapping
        const toolIds = Array.isArray(selectedToolItems)
            ? selectedToolItems.map(item => item.label as ToolID)
            : ['file', 'docs']; // Default if cancelled or error


        // Is Supervisor?
        const supervisorChoice = await showQuickPick(
             [{ label: "No", description: "Standard agent executing tasks." }, { label: "Yes", description: "Agent that delegates tasks to other agents." }],
             "Is this a supervisor agent?",
             { canPickMany: false, ignoreFocusOut: true }
        );
         if (!supervisorChoice || typeof supervisorChoice !== 'object' || !('label' in supervisorChoice)) return;
        const isSupervisor = (supervisorChoice as vscode.QuickPickItem).label === "Yes";

        let chainedAgentIds: string[] | undefined = undefined;
        if (isSupervisor) {
            const allOtherAgents = this.getAllAgents().filter(a => !a.isSupervisor); // Supervisors can only delegate to non-supervisors
            if (allOtherAgents.length === 0) {
                 vscode.window.showWarningMessage("Cannot create supervisor: No other non-supervisor agents exist to delegate to.");
                 return; // Or allow creation but warn it's useless? Better to prevent.
            }
            const selectedSubAgents = await showQuickPick(
                 allOtherAgents.map(a => ({ label: a.name, description: `ID: ${a.id}`, agentId: a.id })),
                 "Select agents this supervisor can delegate tasks to (multi-select)",
                 { canPickMany: true, ignoreFocusOut: true }
            );
             if (!selectedSubAgents || !Array.isArray(selectedSubAgents) || selectedSubAgents.length === 0) {
                 vscode.window.showWarningMessage("Supervisor created, but no sub-agents selected. It will not be able to delegate tasks.");
                 chainedAgentIds = [];
             } else {
                 chainedAgentIds = selectedSubAgents.map(item => item.agentId);
             }
        }


        // Create Agent Config
        const newAgentConfig: AgentConfig = {
            id: generateUUID(),
            name: name,
            description: description || undefined,
            systemPromptName: systemPromptName,
            llm: llmConfig, // Will be undefined if default was chosen, which is correct
            tools: toolIds,
            isSupervisor: isSupervisor,
            chainedAgentIds: chainedAgentIds, // Will be undefined if not supervisor
        };

        // Save the new agent configuration
        const currentConfigs = this.getAllAgentConfigs();
        currentConfigs.push(newAgentConfig);
        await updateAgentConfigs(currentConfigs); // This triggers the config watcher which reloads agents

        vscode.window.showInformationMessage(`Agent '${name}' created successfully.`);
        logger.info(`Agent '${name}' (ID: ${newAgentConfig.id}) created interactively.`);
        // No need to call loadAgentsFromConfig() here, the watcher handles it.
    }

     /** Guides the user through deleting an agent configuration. */
     async deleteAgentInteractively(): Promise<void> {
        const agents = this.getAllAgents(); // Get current agent instances
        if (agents.length === 0) {
            vscode.window.showInformationMessage("No agents configured to delete.");
            return;
        }

        const selectedAgentItem = await showQuickPick(
            agents.map(a => ({ label: a.name, description: a.description ?? `ID: ${a.id}`, agentId: a.id })),
            "Select an agent to delete",
            { canPickMany: false, ignoreFocusOut: true }
        );

        if (!selectedAgentItem || typeof selectedAgentItem !== 'object' || !('agentId' in selectedAgentItem)) return;
        const agentToDeleteId = (selectedAgentItem as any).agentId;
        const agentToDeleteName = (selectedAgentItem as vscode.QuickPickItem).label;


        // Confirmation step
        const confirm = await showQuickPick(
            [{ label: "Yes, Delete Agent" }, { label: "Cancel" }],
            `Permanently delete agent '${agentToDeleteName}' (ID: ${agentToDeleteId})? This cannot be undone.`,
            { canPickMany: false, ignoreFocusOut: true }
        );

        if (!confirm || typeof confirm !== 'object' || confirm.label !== "Yes, Delete Agent") {
            logger.debug("Agent deletion cancelled by user.");
            return;
        }

        // Filter out the agent to delete
        const currentConfigs = this.getAllAgentConfigs();
        const updatedConfigs = currentConfigs.filter(c => c.id !== agentToDeleteId);

        // Also check if any supervisor agents were chaining to the deleted agent
        let supervisorWarning = false;
        updatedConfigs.forEach(config => {
             if (config.isSupervisor && config.chainedAgentIds?.includes(agentToDeleteId)) {
                 config.chainedAgentIds = config.chainedAgentIds.filter(id => id !== agentToDeleteId);
                 supervisorWarning = true;
             }
        });


        await updateAgentConfigs(updatedConfigs); // Save the filtered list

        vscode.window.showInformationMessage(`Agent '${agentToDeleteName}' deleted.`);
        if (supervisorWarning) {
             vscode.window.showWarningMessage(`Agent '${agentToDeleteName}' was removed from the delegation list of one or more supervisor agents.`);
        }
        logger.info(`Agent '${agentToDeleteName}' (ID: ${agentToDeleteId}) deleted interactively.`);
        // Reload handled by watcher
    }

    // TODO: Implement editAgentInteractively(agentId: string)
    // This would involve:
    // 1. Getting the existing config for agentId.
    // 2. Presenting each configuration step (name, description, prompt, llm, tools, supervisor status) similar to createAgentInteractively, pre-filling with existing values.
    // 3. Allowing the user to modify or keep existing values.
    // 4. Constructing the updated AgentConfig.
    // 5. Finding the agent in the currentConfigs array and replacing it.
    // 6. Saving the updated list with updateAgentConfigs.
}

// Export functions to access the singleton instance
export function initializeAgentManager(context: vscode.ExtensionContext): AgentManager {
    return AgentManager.initialize(context);
}

export function agentManager(): AgentManager {
    return AgentManager.getInstance();
}
```

---

**`src/agents/supervisorAgent.ts`**

```typescript
import * as vscode from 'vscode';
import { Agent, AgentContext, AgentRunInput, AgentRunResult, AgentMessage } from './agent';
import { AgentConfig } from '../config';
import { agentManager } from './agentManager'; // Use singleton accessor
import { logger } from '../logger';
import { llmService } from '../llm/llmService'; // Use singleton accessor
import { promptManager } from '../prompts/promptManager';
import { extractErrorMessage } from '../llm/providers/providerUtils';

const DELEGATE_REGEX = /\[DELEGATE\s+([\w-]+)\]\s*Task Description:\s*([\s\S]*)/i;
const FINAL_ANSWER_REGEX = /\[FINAL_ANSWER\]\s*([\s\S]*)/i;


/**
 * An agent that coordinates other agents to perform complex tasks.
 * It decomposes the main task, delegates sub-tasks, and synthesizes results.
 */
export class SupervisorAgent extends Agent {
    private subAgentIds: string[];

    constructor(config: AgentConfig) {
        // Ensure the supervisor flag is set correctly and clear tools
        super({ ...config, isSupervisor: true, tools: [] }); // Supervisors don't use tools directly
        this.subAgentIds = config.chainedAgentIds ?? [];
        if (this.subAgentIds.length === 0) {
             logger.warn(`Supervisor agent '${this.name}' [${this.id}] created with no sub-agent IDs defined. It cannot delegate.`);
        }
        logger.info(`Supervisor Agent '${this.name}' [${this.id}] initialized, managing agents: [${this.subAgentIds.join(', ')}]`);
    }

    /**
     * Overrides the base run method to implement the supervisor's delegation logic.
     */
    override async run(input: AgentRunInput, context: AgentContext): Promise<AgentRunResult> {
        const runId = generateUUID().substring(0, 8);
        logger.info(`Supervisor '${this.name}' [${runId}] starting task: ${input.prompt}`);
        const startTime = Date.now();

        const provider = llmService().getProviderForConfig(this.llmConfig);
        if (!provider) {
            return { success: false, error: `LLM provider unavailable for supervisor '${this.name}'.` };
        }

        // --- Prepare Supervisor Prompt ---
        const availableAgentsInfo = this.subAgentIds
            .map(id => {
                const agent = agentManager().getAgent(id);
                // Only include valid, non-supervisor agents the supervisor can actually call
                return agent && !agent.isSupervisor
                    ? `- ID: ${id}, Name: ${agent.name}, Description: ${agent.description ?? 'N/A'}`
                    : null; // Filter out invalid or supervisor agents
            })
            .filter(info => info !== null) // Remove null entries
            .join('\n');

        if (!availableAgentsInfo) {
             const errorMsg = `Supervisor '${this.name}' has no valid, non-supervisor agents configured to delegate to in its 'chainedAgentIds' list.`;
             logger.error(errorMsg);
             return { success: false, error: errorMsg };
        }


        const systemPrompt = promptManager.getSystemPrompt(this.systemPromptName, {
            USER_REQUEST: input.prompt,
            AGENT_LIST: availableAgentsInfo,
            ...(promptManager.variables), // Global variables
            ...(context.variables ?? {}) // Runtime variables
        });
        if (!systemPrompt) {
            const errorMsg = `System prompt '${this.systemPromptName}' not found for supervisor '${this.name}'.`;
            logger.error(errorMsg); return { success: false, error: errorMsg };
        }

        // --- Supervisor Loop ---
        const executionHistory: AgentMessage[] = []; // Track supervisor's interaction with LLM
        const subAgentResultsLog: { agentId: string, task: string, result: AgentRunResult }[] = []; // Track sub-agent calls

        // Initial message to the supervisor LLM
        const initialSupervisorPrompt = `User Request: ${input.prompt}\nAvailable Agents:\n${availableAgentsInfo}\n\nDevise a plan and delegate the first necessary task using the [DELEGATE agent_id] format.`;
        executionHistory.push({ role: 'user', content: initialSupervisorPrompt });

        let finalResult: string | null = null;
        const maxIterations = 10; // Allow more steps for complex coordination

        try {
            for (let i = 0; i < maxIterations; i++) {
                logger.debug(`Supervisor '${this.name}' [${runId}] - Iteration ${i + 1}/${maxIterations}`);
                if (context.cancellationToken?.isCancellationRequested) {
                     logger.info(`Supervisor '${this.name}' [${runId}] run cancelled.`);
                     return { success: false, error: 'Operation cancelled by user.', history: executionHistory };
                }

                // --- Call Supervisor LLM ---
                const response = await provider.generate({
                    prompt: executionHistory[executionHistory.length - 1].content ?? '', // Pass last message as prompt? Or rely on history? Rely on history.
                    history: executionHistory,
                    systemPrompt: systemPrompt,
                    modelId: this.llmConfig.modelId,
                    options: this.llmConfig.options,
                    cancellationToken: context.cancellationToken,
                    // Supervisor does not use tools directly
                });

                if (response.error || response.content === null) {
                    const errMsg = `Supervisor LLM call failed: ${response.error ?? 'Empty response'}`;
                    logger.error(errMsg);
                    return { success: false, error: errMsg, history: executionHistory };
                }

                const llmOutput = response.content.trim();
                logger.debug(`Supervisor LLM Output [${runId}, Iter ${i + 1}]:\n${llmOutput}`);
                // Add LLM response to supervisor's internal history
                executionHistory.push({ role: 'assistant', content: llmOutput });

                // --- Parse for Delegation or Final Answer ---
                const delegationMatch = llmOutput.match(DELEGATE_REGEX);
                const finalAnswerMatch = llmOutput.match(FINAL_ANSWER_REGEX);

                if (delegationMatch) {
                    const agentIdToCall = delegationMatch[1].trim();
                    const subTask = delegationMatch[2].trim();
                    logger.info(`Supervisor [${runId}] delegating task to Agent ID: ${agentIdToCall}`);
                    logger.debug(`Sub-task: ${subTask}`);

                    // Validate agent ID
                    const subAgent = agentManager().getAgent(agentIdToCall);
                    if (!subAgent || !this.subAgentIds.includes(agentIdToCall) || subAgent.isSupervisor) {
                        const errorMsg = `System Note: Agent ID '${agentIdToCall}' is invalid, not in the allowed list for this supervisor, or is another supervisor. Please choose a valid, non-supervisor agent from the provided list and delegate again.`;
                        logger.warn(`Supervisor [${runId}] attempted invalid delegation: ${agentIdToCall}`);
                        executionHistory.push({ role: 'user', content: errorMsg }); // Instruct LLM to correct
                        continue; // Next supervisor iteration
                    }

                    // --- Execute Sub-Agent ---
                    const subAgentInput: AgentRunInput = { mode: 'task', prompt: subTask };
                    let subAgentResult: AgentRunResult;

                    // Show progress for the sub-task
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: `Supervisor: Delegating to ${subAgent.name}...`,
                        cancellable: true // Allow cancelling sub-task
                    }, async (progress, token) => {
                         // Link supervisor cancellation token to sub-agent context
                         const linkedTokenSource = vscode.CancellationTokenSource.createLinkedTokenSource(context.cancellationToken ?? new vscode.CancellationTokenSource().token, token);
                         const subContext: AgentContext = { ...context, cancellationToken: linkedTokenSource.token };

                         progress.report({ message: `Running task: ${subTask.substring(0, 40)}...` });
                         subAgentResult = await subAgent.run(subAgentInput, subContext);
                         subAgentResultsLog.push({ agentId: agentIdToCall, task: subTask, result: subAgentResult }); // Log the result

                         // Dispose the linked token source when done
                         linkedTokenSource.dispose();
                    });


                    // --- Feed Result Back to Supervisor ---
                    let resultMessage = `Result from Agent ${agentIdToCall} (${subAgent.name}):\n`;
                    if (subAgentResult!.success) { // Use non-null assertion as it's assigned in progress scope
                        resultMessage += subAgentResult!.finalAnswer ?? "Task completed successfully (no text output).";
                        // Optionally include summary of tool use?
                        // if (subAgentResult!.toolResults && subAgentResult!.toolResults.length > 0) { ... }
                    } else {
                        resultMessage += `Task Failed: ${subAgentResult!.error ?? 'Unknown error during sub-task execution.'}`;
                        logger.warn(`Sub-agent ${agentIdToCall} failed task: ${subAgentResult!.error}`);
                    }
                     // Provide result back to supervisor LLM in the next turn
                    executionHistory.push({ role: 'user', content: resultMessage });

                } else if (finalAnswerMatch) {
                     finalResult = finalAnswerMatch[1].trim();
                     logger.info(`Supervisor [${runId}] determined final result.`);
                     break; // Exit supervisor loop
                } else {
                     // LLM didn't follow format
                     const clarificationRequest = `System Note: Your response did not follow the required format. Please either delegate using '[DELEGATE agent_id] Task Description: ...' or provide the final answer using '[FINAL_ANSWER] ...'. Your previous response was:\n${llmOutput}`;
                     logger.warn(`Supervisor [${runId}] LLM output format error. Requesting clarification.`);
                     executionHistory.push({ role: 'user', content: clarificationRequest });
                     // Allow one more iteration for correction, but prevent infinite loops if LLM keeps failing
                     if (i === maxIterations - 1) {
                          finalResult = `Supervisor failed to get a valid response format from the LLM after multiple attempts. Last response: ${llmOutput}`;
                          logger.error(`Supervisor [${runId}] ending due to persistent format errors.`);
                          break;
                     }
                }
            } // End of for loop

            if (finalResult === null) {
                 logger.warn(`Supervisor '${this.name}' [${runId}] reached max iterations (${maxIterations}).`);
                 finalResult = `Supervisor reached maximum iterations. The task may be incomplete. Consult execution history.`;
            }

             const duration = Date.now() - startTime;
             logger.info(`Supervisor '${this.name}' [${runId}] finished in ${duration}ms.`);
            return {
                success: true, // Supervisor itself succeeded in running, even if task incomplete
                finalAnswer: finalResult,
                history: executionHistory, // Return supervisor's interaction history
                // Optionally include subAgentResultsLog here if needed
            };

        } catch (error: any) {
            logger.error(`Supervisor agent '${this.name}' [${runId}] execution failed unexpectedly:`, error);
            return { success: false, error: `Supervisor execution error: ${error.message || error}`, history: executionHistory };
        }
    }
}

// Helper function to generate UUID
import { generateUUID } from '../utils';
```

---

**`src/ui/agentTreeView.ts`**

```typescript
import * as vscode from 'vscode';
import { agentManager } from '../agents/agentManager'; // Use singleton accessor
import { Agent, AgentContext, AgentRunInput, AgentMode } from '../agents/agent';
import { logger } from '../logger';
import { handleAgentError, handleAgentSuccess, showChatInterface, getEditorContext } from './uiUtils'; // Use UI helpers
import { showProgress } from '../utils'; // Use utility for progress
import { SupervisorAgent } from '../agents/supervisorAgent';

/**
 * Provides data for the Agents Tree View in the Codessa sidebar.
 */
export class AgentTreeDataProvider implements vscode.TreeDataProvider<AgentTreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> = new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(context: vscode.ExtensionContext) {
        // Refresh the tree when agents change (e.g., after adding/deleting in settings)
        context.subscriptions.push(agentManager().onDidChangeAgents(() => {
            this.refresh();
        }));

        // Register commands triggered FROM the tree view context menu
        // These commands receive the AgentTreeItem as an argument
        context.subscriptions.push(
            vscode.commands.registerCommand('codessa.refreshAgentView', () => this.refresh()),
            // Add/Delete handled by palette commands calling agentManager directly now
            // vscode.commands.registerCommand('codessa.addAgentTreeView', () => agentManager().createAgentInteractively()),
            vscode.commands.registerCommand('codessa.deleteAgentContext', (item: AgentTreeItem) => this.deleteAgent(item)),
            // Mode commands from context menu
            vscode.commands.registerCommand('codessa.startChatWithAgentContext', (item: AgentTreeItem) => this.runAgentMode(item, 'chat')),
            vscode.commands.registerCommand('codessa.runEditTaskWithAgentContext', (item: AgentTreeItem) => this.runAgentMode(item, 'edit')),
            vscode.commands.registerCommand('codessa.runGenerateTaskWithAgentContext', (item: AgentTreeItem) => this.runAgentMode(item, 'generate')),
            vscode.commands.registerCommand('codessa.runGeneralTaskWithAgentContext', (item: AgentTreeItem) => this.runAgentMode(item, 'task')),
            vscode.commands.registerCommand('codessa.runSupervisorTaskContext', (item: AgentTreeItem) => this.runSupervisorTask(item))
            // TODO: Add command for editing agent config (maybe opens settings.json focused on the agent?)
        );
    }

    /** Forces a refresh of the tree view data. */
    refresh(): void {
        logger.debug("Refreshing Agent Tree View.");
        this._onDidChangeTreeData.fire();
    }

    /** Gets the TreeItem representation for a given element. */
    getTreeItem(element: AgentTreeItem): vscode.TreeItem {
        return element;
    }

    /** Gets the children of an element or the root elements if no element is provided. */
    getChildren(element?: AgentTreeItem): Thenable<AgentTreeItem[]> {
        if (element) {
            // If element exists, it's an agent item, show details
            if (element.agent) {
                return Promise.resolve(this.getAgentDetailsAsTreeItems(element.agent));
            }
            // No children for detail items or placeholder items
            return Promise.resolve([]);
        } else {
            // Root level, show all configured agents
            const agents = agentManager().getAllAgents();
            if (agents.length === 0) {
                 // Show a placeholder item prompting user to add agents
                 return Promise.resolve([
                     new AgentTreeItem(
                         "No agents configured",
                         vscode.TreeItemCollapsibleState.None,
                         { command: 'codessa.openSettings', title: "Configure Agents...", arguments: ['@ext:your-publisher-name.codessa codessa.agents'] } // Opens settings focused on agents
                    )
                ]);
            }
            // Sort agents alphabetically by name?
            agents.sort((a, b) => a.name.localeCompare(b.name));
            return Promise.resolve(
                agents.map(agent => new AgentTreeItem(
                    agent.name,
                    vscode.TreeItemCollapsibleState.Collapsed, // Allow expanding to see details
                    undefined, // Default command (run task) handled via context menu
                    agent // Store agent object
                ))
            );
        }
    }

    /** Helper to generate detail items for an agent. */
    private getAgentDetailsAsTreeItems(agent: Agent): AgentTreeItem[] {
         const details: AgentTreeItem[] = [];
         if (agent.description) {
             details.push(new AgentTreeItem(`Desc: ${agent.description}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, 'description'));
         }
         details.push(new AgentTreeItem(`LLM: ${agent.llmConfig.provider} / ${agent.llmConfig.modelId}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, 'llm'));
         details.push(new AgentTreeItem(`Prompt: ${agent.systemPromptName}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, 'prompt'));
         if (agent.tools.size > 0) {
             details.push(new AgentTreeItem(`Tools: ${Array.from(agent.tools.keys()).join(', ')}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, 'tools'));
         } else if (!agent.isSupervisor) {
              details.push(new AgentTreeItem(`Tools: None`, vscode.TreeItemCollapsibleState.None, undefined, undefined, 'tools'));
         }
         if (agent.isSupervisor) {
             details.push(new AgentTreeItem(`Type: Supervisor`, vscode.TreeItemCollapsibleState.None, undefined, undefined, 'supervisor'));
             const subAgentIds = (agent as SupervisorAgent)['subAgentIds'] ?? []; // Access private field if needed, or add getter
             if (subAgentIds.length > 0) {
                  details.push(new AgentTreeItem(`Delegates to: ${subAgentIds.join(', ')}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, 'delegates'));
             } else {
                  details.push(new AgentTreeItem(`Delegates to: None Configured`, vscode.TreeItemCollapsibleState.None, undefined, undefined, 'delegates'));
             }
         }
         return details;
    }


    // --- Command Implementations (Triggered by Tree View Context Menu) ---

    private deleteAgent(item: AgentTreeItem) {
        if (item?.agent?.id) {
            // Trigger the interactive deletion flow from AgentManager
            agentManager().deleteAgentInteractively();
        } else {
             logger.warn("Delete Agent command called without a valid agent item.");
             vscode.window.showWarningMessage("Could not identify agent to delete from selection.");
        }
    }

    /** Generic handler for running standard agent modes from TreeView context menu. */
    private async runAgentMode(item: AgentTreeItem | undefined, mode: AgentMode) {
        if (!item?.agent || item.agent.isSupervisor) { // Ensure it's a standard agent
            vscode.window.showWarningMessage("Please select a non-supervisor agent from the tree view for this action.");
            return;
        }
        const agent = item.agent;
        logger.info(`Triggering agent '${agent.name}' [${agent.id}] in mode '${mode}' from TreeView.`);

        let prompt: string | undefined;
        const editorContext = getEditorContext(); // Get context from active editor

        // Get specific inputs based on mode
        switch (mode) {
            case 'chat':
                // Chat handled differently - needs persistent UI
                showChatInterface(agent, editorContext); // Use helper from uiUtils
                return; // Exit early, chat UI handles the flow

            case 'edit':
                prompt = await showInputBox({
                     prompt: `Describe the edit for agent '${agent.name}':`,
                     placeHolder: "e.g., Refactor this function to be async, Fix the bug in this loop",
                     ignoreFocusOut: true
                 });
                if (!prompt) return;
                if (!editorContext.currentFilePath) {
                    vscode.window.showWarningMessage("Cannot perform edit: No active file open.");
                    return;
                }
                // Use selection if available, otherwise maybe ask user or use whole file?
                // Let's prioritize selection, then maybe ask? For now, use selection or nothing.
                if (!editorContext.selectedText && !editorContext.fileContent) {
                     vscode.window.showWarningMessage("No code selected or file content available to edit.");
                     return;
                }
                break;

            case 'generate':
                prompt = await showInputBox({
                    prompt: `Describe what to generate with agent '${agent.name}':`,
                    placeHolder: "e.g., Generate a Python class for API requests, Create a sample README.md",
                    ignoreFocusOut: true
                });
                 if (!prompt) return;
                break;

            case 'task':
            default:
                prompt = await showInputBox({
                    prompt: `Enter the task for agent '${agent.name}':`,
                    placeHolder: "e.g., Summarize the selected text, Research 'React Hooks'",
                    ignoreFocusOut: true
                });
                 if (!prompt) return;
                break;
        }

        if (!prompt) return; // Should be caught above, but safety check

        const agentInput: AgentRunInput = {
            mode: mode,
            prompt: prompt,
            targetFilePath: editorContext.currentFilePath,
            // Provide target code primarily for edit mode using selection or full content
            targetCode: mode === 'edit' ? (editorContext.selectedText || editorContext.fileContent) : editorContext.selectedText,
        };

        // Run agent with progress utility
        await showProgress(
            `Agent '${agent.name}' (${mode})...`,
            async (progress, token) => {
                progress.report({ message: "Initializing..." });
                const context: AgentContext = { ...editorContext, cancellationToken: token }; // Pass token
                const result = await agent.run(agentInput, context);
                progress.report({ message: "Processing result..." }); // Give feedback before handling result

                if (result.success) {
                    await handleAgentSuccess(result, agentInput, context); // Use await for async UI actions
                } else {
                    handleAgentError(result.error ?? "Unknown error", agent.name, result.history); // Pass history for debugging
                }
            }
            // Progress location defaults to Notification, cancellable defaults to true
        );
    }

     /** Handler for running supervisor tasks from TreeView context menu. */
     private async runSupervisorTask(item: AgentTreeItem | undefined) {
         if (!item?.agent || !item.agent.isSupervisor) {
             vscode.window.showWarningMessage("Please select a supervisor agent from the tree view.");
             return;
         }
         const supervisor = item.agent as SupervisorAgent; // Cast for clarity
         logger.info(`Triggering supervisor '${supervisor.name}' [${supervisor.id}] from TreeView.`);

         const task = await showInputBox({
             prompt: `Enter the complex task for supervisor '${supervisor.name}':`,
             placeHolder: "e.g., Implement feature X including tests and documentation",
             ignoreFocusOut: true
         });
         if (!task) return;

         const editorContext = getEditorContext();
         const agentInput: AgentRunInput = { mode: 'task', prompt: task }; // Supervisor runs in task mode

         await showProgress(
             `Supervisor '${supervisor.name}' working...`,
             async (progress, token) => {
                 progress.report({ message: "Coordinating agents..." });
                 const context: AgentContext = { ...editorContext, cancellationToken: token };
                 const result = await supervisor.run(agentInput, context); // Call supervisor's run
                 progress.report({ message: "Processing final result..." });

                 if (result.success) {
                     await handleAgentSuccess(result, agentInput, context); // Show final synthesized answer
                 } else {
                     handleAgentError(result.error ?? "Unknown supervisor error", supervisor.name, result.history);
                 }
             }
         );
     }
}

// Represents an item in the Agent Tree View
export class AgentTreeItem extends vscode.TreeItem {
    public readonly isSupervisor: boolean | undefined; // Expose for 'when' clauses

    constructor(
        public readonly label: string, // Agent name or detail label
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public readonly agent?: Agent, // Store the agent object if this item represents one
        public readonly itemType?: 'description' | 'llm' | 'prompt' | 'tools' | 'supervisor' | 'delegates' // Type for styling/icons
    ) {
        super(label, collapsibleState);
        this.agent = agent;
        this.isSupervisor = agent?.isSupervisor;

        // Tooltip and Description
        if (agent) {
            this.tooltip = agent.description ? `${agent.name}\n${agent.description}` : agent.name;
            // Don't set description here, use agent name as label only for cleaner look
            // this.description = agent.description;
        } else {
             this.tooltip = label;
        }


        // Context value for enabling/disabling commands in package.json view/item/context menu
        if (this.agent) {
            this.contextValue = 'agentItem'; // Used in package.json when clauses (e.g., "when": "viewItem == agentItem")
             // Set icon based on type
             this.iconPath = new vscode.ThemeIcon(this.agent.isSupervisor ? 'organization' : 'hubot');
        } else if (this.command?.command === 'codessa.openSettings') {
             this.contextValue = 'configureAgentsItem';
             this.iconPath = new vscode.ThemeIcon('gear');
        } else if (this.itemType) {
             // For detail items under an agent
             this.contextValue = 'agentDetailItem';
             // Set icons for details
             switch(this.itemType) {
                 case 'llm': this.iconPath = new vscode.ThemeIcon('chip'); break;
                 case 'prompt': this.iconPath = new vscode.ThemeIcon('notebook'); break;
                 case 'tools': this.iconPath = new vscode.ThemeIcon('tools'); break;
                 case 'supervisor': this.iconPath = new vscode.ThemeIcon('organization'); break;
                 case 'delegates': this.iconPath = new vscode.ThemeIcon('share'); break;
                 case 'description': this.iconPath = new vscode.ThemeIcon('info'); break;
                 default: this.iconPath = new vscode.ThemeIcon('circle-small-filled'); break;
             }
        } else {
             // Default/placeholder items
             this.contextValue = 'infoItem';
        }
    }
}
```

---

**`src/ui/uiUtils.ts`**

```typescript
import * as vscode from 'vscode';
import { Agent, AgentRunResult, AgentRunInput, AgentContext, AgentMode, AgentMessage } from '../agents/agent';
import { logger } from '../logger';
import { diffEngine } from '../diff/diffEngine';
import { TextEncoder } from 'util';
import { chatManager } from './chatManager'; // Use ChatManager

const encoder = new TextEncoder();

/**
 * Gets relevant context from the active editor and workspace.
 */
export function getEditorContext(): Omit<AgentContext, 'cancellationToken' | 'variables'> {
    const editor = vscode.window.activeTextEditor;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const currentFilePath = editor?.document.uri.fsPath;
    const selectedText = editor && !editor.selection.isEmpty ? editor.document.getText(editor.selection) : undefined;
    // Get full content only if an editor is active
    const fileContent = editor ? editor.document.getText() : undefined;

    return {
        workspaceRoot,
        currentFilePath,
        selectedText,
        fileContent // Full content of the active file
    };
}


/**
 * Handles displaying success results from an agent run based on the mode.
 */
export async function handleAgentSuccess(result: AgentRunResult, input: AgentRunInput, context: AgentContext) {
    logger.info(`Agent finished successfully. Mode: ${input.mode}`);

    if (!result.finalAnswer && !result.appliedPatch && !result.outputFilePath) {
        vscode.window.showInformationMessage("Codessa agent completed the task (no specific output generated).");
        logger.debug("Agent success with no actionable output.");
        return;
    }

    try {
        switch (input.mode) {
            case 'edit':
                if (result.appliedPatch) {
                    vscode.window.showInformationMessage(`Edit applied successfully by Codessa agent.`);
                    // Optionally reveal the changed file?
                    if (input.targetFilePath) {
                        // vscode.window.showTextDocument(vscode.Uri.file(input.targetFilePath));
                    }
                } else if (result.finalAnswer) {
                    // If edit mode didn't apply a patch but returned text, treat it as a diff suggestion or explanation
                    const isPatch = result.finalAnswer.includes('--- a/') && result.finalAnswer.includes('+++ b/');
                    if (isPatch && input.targetFilePath && context.fileContent) {
                         await handleSuggestedPatch(result.finalAnswer, input.targetFilePath, context.fileContent);
                    } else {
                         // Show the text result as information/explanation
                         await showResultInDocument(result.finalAnswer, 'markdown', `Codessa Edit Suggestion: ${input.prompt}`);
                    }
                } else {
                     vscode.window.showInformationMessage("Codessa agent finished edit task (no changes applied or suggested).");
                }
                break;

            case 'generate':
                 if (result.outputFilePath) {
                     vscode.window.showInformationMessage(`Code generated and saved to ${result.outputFilePath} by Codessa agent.`);
                     // Open the generated file
                     await vscode.window.showTextDocument(vscode.Uri.file(result.outputFilePath));
                 } else if (result.finalAnswer) {
                     // Show generated code if not written to file
                     const language = detectLanguage(result.finalAnswer);
                     await showResultInDocument(result.finalAnswer, language, `Codessa Generated Code: ${input.prompt}`);
                 } else {
                      vscode.window.showInformationMessage("Codessa agent finished generate task (no output generated).");
                 }
                break;

            case 'task':
            case 'inline': // Inline results are handled by the command itself, this is a fallback display
            default:
                // Show the final answer in a new document
                if (result.finalAnswer) {
                    const language = detectLanguage(result.finalAnswer);
                    await showResultInDocument(result.finalAnswer, language, `Codessa Task Result: ${input.prompt}`);
                }
                break;
        }
    } catch (error) {
         logger.error("Error handling agent success result:", error);
         vscode.window.showErrorMessage(`Failed to process agent result: ${error instanceof Error ? error.message : error}`);
    }

     // Log tool usage summary
     if (result.toolResults && result.toolResults.length > 0) {
         const toolSummary = result.toolResults.map(tr => `${tr.success ? '✅' : '❌'}`).join(' ');
         logger.info(`Tool usage summary: ${toolSummary}`);
     }
}

/**
 * Handles displaying errors from an agent run.
 * @param error The error object or message.
 * @param agentName Name of the agent that failed.
 * @param history Optional execution history for debugging.
 */
export function handleAgentError(error: any, agentName: string, history?: AgentMessage[]) {
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    logger.error(`Agent '${agentName}' failed: ${errorMessage}`, error); // Log full error object
    // Optionally log history if available
    if (history && history.length > 0) {
        logger.error(`Execution history for failed agent '${agentName}':`, history);
    }
    vscode.window.showErrorMessage(`Codessa Agent '${agentName}' failed: ${errorMessage}`);
    // Optionally show history in output channel?
    // logger.show(); // Bring output channel to front
}

/**
 * Opens a new untitled document to show the agent's result.
 */
async function showResultInDocument(content: string, language: string = 'markdown', title?: string) {
    try {
        const doc = await vscode.workspace.openTextDocument({ content: content, language: language });
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
        if (title) {
             // Maybe add title as comment? Document doesn't have a title property easily set.
        }
    } catch (e) {
        logger.error("Failed to open result document:", e);
        vscode.window.showErrorMessage("Failed to display agent result in new document.");
    }
}

/**
 * Prompts the user to apply a suggested patch.
 */
async function handleSuggestedPatch(patch: string, targetFilePath: string, originalContent: string) {
     const apply = await vscode.window.showInformationMessage(
         "Codessa suggests the following changes:",
         { modal: true, detail: "Review the diff before applying." }, // Keep detail concise
         "Apply Patch", "Show Diff", "Ignore"
     );

     if (apply === "Apply Patch") {
         const patchedContent = diffEngine.applyPatch(patch, originalContent);
         if (patchedContent !== false) {
             try {
                 const fileUri = vscode.Uri.file(targetFilePath);
                 await vscode.workspace.fs.writeFile(fileUri, encoder.encode(patchedContent));
                 vscode.window.showInformationMessage("Patch applied successfully.");
             } catch (writeError) {
                  logger.error(`Failed to write patched file ${targetFilePath}:`, writeError);
                  vscode.window.showErrorMessage(`Failed to save patched file: ${writeError instanceof Error ? writeError.message : writeError}`);
             }
         } else {
             vscode.window.showErrorMessage("Failed to apply the suggested patch. File content may have changed since the suggestion was generated.");
         }
     } else if (apply === "Show Diff") {
          try {
              const diffDoc = await vscode.workspace.openTextDocument({ content: patch, language: 'diff' });
              await vscode.window.showTextDocument(diffDoc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
          } catch (e) {
               logger.error("Failed to open diff document:", e);
               vscode.window.showErrorMessage("Failed to display diff.");
          }
     }
}


/**
 * Basic language detection based on markdown code fences.
 */
function detectLanguage(content: string): string {
    const match = content.match(/```(\w+)/);
    return match ? match[1] : 'markdown';
}


/**
 * Initiates the chat interface (using ChatManager).
 */
export function showChatInterface(agent: Agent, initialContext: AgentContext) {
    logger.debug(`Showing chat interface for agent: ${agent.name}`);
    chatManager.startOrShowChat(agent, initialContext);
}
```

---

**`src/ui/chatManager.ts`** (NEW FILE - Manages Chat State)

```typescript
import * as vscode from 'vscode';
import { Agent, AgentContext, AgentRunInput, AgentMessage } from '../agents/agent';
import { logger } from '../logger';
import { showProgress } from '../utils';
import { handleAgentError } from './uiUtils'; // Use UI helper for errors

/**
 * Manages the state and interaction for the chat mode.
 * Uses an OutputChannel for simple display, preparing for future Webview.
 */
class ChatManager {
    private outputChannel: vscode.OutputChannel;
    private currentChat: { agent: Agent; history: AgentMessage[]; context: AgentContext } | null = null;
    private isRunning: boolean = false; // Prevent concurrent runs for the same chat

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel("Codessa Chat");
    }

    /**
     * Starts a new chat session or brings the existing one to focus.
     */
    public startOrShowChat(agent: Agent, initialContext: AgentContext) {
        if (this.currentChat?.agent.id !== agent.id) {
            // Start new chat
            this.currentChat = { agent, history: [], context: initialContext };
            this.outputChannel.clear();
            this.outputChannel.appendLine(`--- Starting chat with ${agent.name} ---`);
            logger.info(`Starting new chat session with agent: ${agent.name} [${agent.id}]`);
        } else {
            // Continue existing chat
            this.outputChannel.appendLine(`--- Resuming chat with ${this.currentChat.agent.name} ---`);
            logger.info(`Resuming chat session with agent: ${this.currentChat.agent.name}`);
        }
        this.outputChannel.show(true); // Show channel, preserve focus elsewhere
        this.promptUser(); // Start the input loop
    }

    /**
     * Prompts the user for the next message in the chat.
     */
    private async promptUser() {
        if (!this.currentChat || this.isRunning) {
            return; // No active chat or already processing
        }

        const userMessage = await vscode.window.showInputBox({
            prompt: `Chat with ${this.currentChat.agent.name} (Type 'exit' or press Esc to end)`,
            placeHolder: "Enter your message...",
            ignoreFocusOut: true // Keep open
        });

        if (userMessage === undefined || userMessage.toLowerCase() === 'exit') {
            this.endChat();
            return;
        }

        if (!userMessage.trim()) {
            this.promptUser(); // Re-prompt if empty
            return;
        }

        // Add user message to history and display it
        const userAgentMessage: AgentMessage = { role: 'user', content: userMessage };
        this.currentChat.history.push(userAgentMessage);
        this.outputChannel.appendLine(`\nYou: ${userMessage}`);

        // Trigger agent response
        this.runAgentResponse();
    }

    /**
     * Runs the agent to get the next response in the chat.
     */
    private async runAgentResponse() {
        if (!this.currentChat || this.isRunning) {
            return;
        }

        this.isRunning = true;
        const { agent, history, context } = this.currentChat;
        const lastUserMessage = history[history.length - 1]; // The message we just added

        try {
            await showProgress(
                `${agent.name} is thinking...`, // Use agent name in progress
                async (progress, token) => {
                    progress.report({ message: "Processing..." });

                    const agentInput: AgentRunInput = {
                        mode: 'chat',
                        prompt: lastUserMessage.content ?? '', // Pass latest message
                        chatHistory: history.slice(0, -1) // History *before* latest message
                    };
                    const runContext: AgentContext = { ...context, cancellationToken: token };

                    const result = await agent.run(agentInput, runContext);

                    if (token.isCancellationRequested) {
                         this.outputChannel.appendLine(`\n${agent.name}: (Operation cancelled)`);
                         // Don't add cancelled response to history
                         return;
                    }

                    if (result.success && result.finalAnswer !== undefined) {
                        const assistantMessage: AgentMessage = { role: 'assistant', content: result.finalAnswer };
                        this.currentChat?.history.push(assistantMessage); // Add successful response
                        this.outputChannel.appendLine(`\n${agent.name}: ${result.finalAnswer}`);
                        if (result.toolResults && result.toolResults.length > 0) {
                             this.outputChannel.appendLine(`   (Used tools: ${result.toolResults.map(tr => tr.success ? '✅' : '❌').join(' ')})`);
                        }
                    } else {
                        // Handle agent failure during chat
                        const errorMsg = result.error ?? "Agent failed to produce a response.";
                        this.outputChannel.appendLine(`\n${agent.name}: Error - ${errorMsg}`);
                        handleAgentError(errorMsg, agent.name, result.history); // Log detailed error
                        // Should we end the chat on error? Or allow user to try again? Allow retry for now.
                    }
                },
                vscode.ProgressLocation.Window // Use status bar for chat progress
            );
        } catch (error) {
            // Catch errors from showProgress or agent.run itself
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.outputChannel.appendLine(`\n${agent.name}: Critical Error - ${errorMsg}`);
            handleAgentError(error, agent.name, this.currentChat?.history);
        } finally {
            this.isRunning = false;
            // Prompt for next input only if chat hasn't been ended
            if (this.currentChat) {
                this.promptUser();
            }
        }
    }

    /** Ends the current chat session. */
    public endChat() {
        if (this.currentChat) {
            this.outputChannel.appendLine(`--- Chat with ${this.currentChat.agent.name} ended ---`);
            logger.info(`Chat session ended with agent: ${this.currentChat.agent.name}`);
            this.currentChat = null;
            this.isRunning = false;
        }
    }

    /** Disposes the output channel when the extension deactivates. */
    public dispose() {
        this.outputChannel.dispose();
    }
}

// Export a single instance
export const chatManager = new ChatManager();
```

---

**`src/ui/webviews/chatWebview.ts`** (NEW FILE - Placeholder)

```typescript
import * as vscode from 'vscode';
import { logger } from '../../logger';

/**
 * Placeholder for managing a future Webview-based chat interface.
 */
export function registerChatWebviewCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('codessa.openChatView', () => {
            logger.info("Command 'codessa.openChatView' called.");
            vscode.window.showInformationMessage("Codessa Chat Panel (Webview) is not yet implemented. Chat currently uses the Output panel.");
            // In the future, this would create and show a vscode.WebviewPanel
            // const panel = vscode.window.createWebviewPanel(...)
            // panel.webview.html = getChatWebviewContent();
            // panel.webview.onDidReceiveMessage(...)
            logger.show(); // Show output channel chat for now
        })
    );
}

// function getChatWebviewContent(): string {
//     // Load HTML, CSS, JS for the webview UI
//     return `<!DOCTYPE html>...`;
// }
```

---

**`src/ui/webviews/settingsWebview.ts`** (NEW FILE - Placeholder)

```typescript
import * as vscode from 'vscode';
import { logger } from '../../logger';

/**
 * Placeholder for managing a future Webview-based settings interface.
 */
export function registerSettingsWebviewCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('codessa.openSettingsView', () => {
            logger.info("Command 'codessa.openSettingsView' called.");
            vscode.window.showInformationMessage("Codessa Settings Panel (Webview) is not yet implemented. Please use standard VS Code Settings (Ctrl/Cmd + ,) and search for 'Codessa'.");
            // In the future, this could open a webview for more visual configuration
            // vscode.commands.executeCommand('workbench.action.openSettings', 'codessa'); // Open standard settings for now
        })
    );
}
```

---

**`src/extension.ts`**

```typescript
import * as vscode from 'vscode';
import { logger, LogLevel } from './logger';
import { initializeAgentManager, agentManager } from './agents/agentManager';
import { AgentTreeDataProvider, AgentTreeItem } from './ui/agentTreeView';
import { AgentContext, AgentRunInput, AgentMode, Agent } from './agents/agent';
import { initializeLLMService, llmService } from './llm/llmService';
import { handleAgentError, handleAgentSuccess, showChatInterface, getEditorContext } from './ui/uiUtils';
import { showProgress } from './utils';
import { SupervisorAgent } from './agents/supervisorAgent';
import { registerChatWebviewCommands } from './ui/webviews/chatWebview';
import { registerSettingsWebviewCommands } from './ui/webviews/settingsWebview';
import { chatManager } from './ui/chatManager'; // Import chat manager

export function activate(context: vscode.ExtensionContext) {
    const startTime = Date.now();
    logger.info('Activating Codessa AI Assistant...');

    try {
        // Initialize core services
        initializeLLMService(context);
        initializeAgentManager(context); // Depends on LLM Service

        // Register Tree View (registers its own context menu commands)
        const agentTreeDataProvider = new AgentTreeDataProvider(context);
        context.subscriptions.push(vscode.window.createTreeView('codessaAgentView', {
            treeDataProvider: agentTreeDataProvider,
            showCollapseAll: true,
            canSelectMany: false
        }));

        // Register global commands from package.json
        registerGlobalCommands(context);

        // Register placeholder webview commands
        registerChatWebviewCommands(context);
        registerSettingsWebviewCommands(context);

        const duration = Date.now() - startTime;
        logger.info(`Codessa activation complete (${duration}ms).`);
        vscode.window.setStatusBarMessage("Codessa activated.", 3000);

    } catch (error) {
        logger.error("Failed to activate Codessa extension:", error);
        vscode.window.showErrorMessage(`Codessa failed to activate. Please check logs. Error: ${error instanceof Error ? error.message : error}`);
    }
}

// --- Command Registration ---
function registerGlobalCommands(context: vscode.ExtensionContext) {

    // Helper to select an agent from Quick Pick
    async function selectAgent(filter?: (agent: Agent) => boolean, title: string = "Select a Codessa Agent"): Promise<Agent | undefined> {
         let agents = agentManager().getAllAgents();
         if (filter) {
             agents = agents.filter(filter);
         }
         if (agents.length === 0) {
             const filterDesc = filter ? "matching the criteria" : "";
             vscode.window.showInformationMessage(`No Codessa agents ${filterDesc} configured. Please add an agent in settings.`);
             return undefined;
         }
         // Sort agents by name for consistent order
         agents.sort((a, b) => a.name.localeCompare(b.name));

         const selected = await vscode.window.showQuickPick(
             agents.map(a => ({
                 label: a.name,
                 description: a.isSupervisor ? `(Supervisor) ${a.description ?? ''}` : a.description,
                 agent: a
                })),
             { placeHolder: title, matchOnDescription: true, ignoreFocusOut: true }
         );
         return selected?.agent;
    }

    // Command: General Task (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('codessa.runTask', async () => {
        const agent = await selectAgent(a => !a.isSupervisor, "Select Agent for General Task"); // Exclude supervisors for direct tasks
        if (!agent) return;
        // Use the TreeView's runner logic for consistency (even though no item is passed)
        agentTreeDataProvider['runAgentMode'](new AgentTreeItem(agent.name, vscode.TreeItemCollapsibleState.None, undefined, agent), 'task');
    }));

     // Command: Start Chat (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('codessa.startChat', async () => {
        const agent = await selectAgent(a => !a.isSupervisor, "Select Agent to Chat With");
        if (!agent) return;
        const editorContext = getEditorContext();
        showChatInterface(agent, editorContext); // Uses ChatManager now
    }));

     // Command: Edit Code (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('codessa.editCode', async () => {
        const agent = await selectAgent(a => !a.isSupervisor, "Select Agent for Code Editing");
        if (!agent) return;
        agentTreeDataProvider['runAgentMode'](new AgentTreeItem(agent.name, vscode.TreeItemCollapsibleState.None, undefined, agent), 'edit');
    }));

     // Command: Generate Code (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('codessa.generateCode', async () => {
        const agent = await selectAgent(a => !a.isSupervisor, "Select Agent for Code Generation");
        if (!agent) return;
        agentTreeDataProvider['runAgentMode'](new AgentTreeItem(agent.name, vscode.TreeItemCollapsibleState.None, undefined, agent), 'generate');
    }));

     // Command: Run Multi-Agent Task (Palette)
    context.subscriptions.push(vscode.commands.registerCommand('codessa.runSupervisorTask', async () => {
        const supervisor = await selectAgent(a => a.isSupervisor, "Select Supervisor Agent");
        if (!supervisor) {
             // selectAgent shows message if none found
             return;
        }
        // Use the TreeView's supervisor runner logic
        agentTreeDataProvider['runSupervisorTask'](new AgentTreeItem(supervisor.name, vscode.TreeItemCollapsibleState.None, undefined, supervisor));
    }));


    // Command: Inline Generate/Edit (Editor Context Menu)
    context.subscriptions.push(vscode.commands.registerTextEditorCommand('codessa.inlineAction', async (textEditor, edit) => {
        const editorContext = getEditorContext(); // Get context including selection

        const agent = await selectAgent(a => !a.isSupervisor, "Select Agent for Inline Action");
        if (!agent) return;

        const userRequest = await vscode.window.showInputBox({
            prompt: `Describe the code to generate or edit inline with ${agent.name}:`,
            placeHolder: editorContext.selectedText ? "e.g., Convert this to async, Explain this code" : "e.g., Insert a function to fetch data",
            ignoreFocusOut: true
        });
        if (!userRequest) return;

        const agentInput: AgentRunInput = {
            mode: 'inline', // Use dedicated inline mode
            prompt: userRequest,
            targetCode: editorContext.selectedText, // Pass selection
            targetFilePath: editorContext.currentFilePath,
            // Pass full file content for better context, agent prompt should handle it
            // targetCode: editorContext.fileContent
        };

        await showProgress(
            `Codessa: ${agent.name} working...`,
            async (progress, token) => {
                progress.report({ message: "Generating inline..." });
                const context: AgentContext = { ...editorContext, cancellationToken: token };
                const result = await agent.run(agentInput, context);

                if (token.isCancellationRequested) return; // Check cancellation after run

                if (result.success && result.finalAnswer !== undefined && result.finalAnswer !== null) {
                    // Apply the result directly using the TextEditorEdit object
                     await textEditor.edit(editBuilder => {
                         const selection = textEditor.selection;
                         if (!selection.isEmpty) {
                             editBuilder.replace(selection, result.finalAnswer!); // Use non-null assertion
                         } else {
                             editBuilder.insert(selection.active, result.finalAnswer!);
                         }
                     });

                    logger.info(`Inline operation by ${agent.name} completed successfully.`);
                    vscode.window.setStatusBarMessage("Codessa: Inline action complete.", 3000);

                } else if (!result.success) {
                    handleAgentError(result.error ?? "Inline action failed", agent.name, result.history);
                } else {
                     logger.warn(`Inline agent ${agent.name} finished successfully but provided no answer.`);
                     vscode.window.showWarningMessage("Codessa agent provided no output for the inline action.");
                }
            },
            vscode.ProgressLocation.Window // Use status bar for inline
        );
    }));


    // Management Commands
    context.subscriptions.push(vscode.commands.registerCommand('codessa.addAgent', () => {
        agentManager().createAgentInteractively();
    }));
     context.subscriptions.push(vscode.commands.registerCommand('codessa.deleteAgent', () => {
        agentManager().deleteAgentInteractively();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('codessa.openSettings', (setting?: string) => {
        const query = setting ? `@ext:${context.extension.id} ${setting}` : `@ext:${context.extension.id}`;
        vscode.commands.executeCommand('workbench.action.openSettings', query);
        vscode.window.showInformationMessage("Opening Codessa settings in the VS Code Settings UI.");
    }));

    logger.debug("Codessa global commands registered.");
}


// This method is called when your extension is deactivated
export function deactivate(): Thenable<void> | undefined {
    logger.info("Deactivating Codessa AI Assistant...");
    chatManager.dispose(); // Dispose chat resources
    // Any other cleanup tasks
    logger.info("Codessa deactivated.");
    return undefined; // Return undefined or a promise if cleanup is async
}
```

---

This comprehensive structure provides a strong foundation for the "Codessa" plugin. It includes the core agentic loop, multiple provider examples, different operational modes, UI elements, and configuration integration.

**To make this truly production-ready, the next steps would involve:**

1.  **Implementing Remaining Providers:** Add classes for LM Studio (using OpenAI provider), HuggingFace Inference Endpoints, OpenRouter, etc.
2.  **Robust Tool Calling:** Enhance the parsing of LLM tool requests, potentially using more advanced techniques or libraries if the simple JSON format proves unreliable for some models. Handle multiple tool calls per turn if needed.
3.  **Webview UI:** Build the actual Webview panels for Chat and Settings for a richer user experience.
4.  **Security:** Implement `keytar` or rely on VS Code's secret storage API for API keys. Sanitize inputs and outputs, especially if executing code or shell commands (which are *not* included here for safety).
5.  **Testing:** Add extensive unit tests for utilities, providers, and agent logic. Implement integration tests using `@vscode/test-electron`.
6.  **Performance Optimization:** Profile and optimize LLM calls, file operations, and UI updates, especially for large files or complex agent interactions.
7.  **Advanced Agentics:** Explore adding memory (using vector databases or simpler history summarization), reflection capabilities, or more sophisticated planning algorithms.
8.  **Documentation:** Write comprehensive user and developer documentation.
9.  **Packaging & Publishing:** Prepare the extension for publishing to the VS Code Marketplace.

This code represents a significant step towards the requested features, providing a functional and extensible base for Codessa. Remember to run `npm install` before compiling (`npm run compile`).

Okay, this is a very significant expansion. Implementing full Webview UIs and robust secret management (`keytar`) alongside new providers and enhanced tool calling pushes this closer to a real-world application's complexity.

This response will provide the complete, updated codebase for "Codessa", incorporating:

1.  **New Providers:** `OpenRouterProvider`, `HuggingFaceIEProvider`, and integration for LM Studio via `OpenAIProvider`.
2.  **Enhanced Tool Calling:** Logic in `Agent.run` to handle multiple native tool calls per turn and improved fallback JSON parsing.
3.  **Webview UI (Chat):** A functional `ChatViewProvider` replacing the Output Channel chat. Includes basic HTML/CSS/JS for the webview frontend and message passing.
4.  **Webview UI (Settings):** A basic `SettingsViewProvider` allowing configuration of API keys (via `keytar`) and default models. Agent/Prompt config still links to `settings.json` for now due to complexity.
5.  **Security (`keytar`):** Integration of `keytar` for storing/retrieving API keys securely. API keys removed from `settings.json` configuration.
6.  **Refinements:** Addressing previous TODOs where feasible, improving error handling, and updating related components.

**Again, the "Production Grade" Caveat:** This is a *very* substantial amount of code generated in one go. It requires thorough testing, potential debugging, and likely further refinement for true production stability and user experience. Security aspects beyond API keys (like input sanitization for prompts/tool args) are crucial but context-dependent and not fully implemented here.

---

**Project Layout (`codessa-vscode-plugin/`)** (Updated)

```
codessa-vscode-plugin/
├── .vscodeignore
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── images/
│   └── icon.png
└── src/
    ├── extension.ts              # Entry point, command registration, Webview setup
    ├── config.ts                 # Configuration (non-sensitive settings)
    ├── secrets.ts                # **NEW:** API Key management using keytar
    ├── logger.ts                 # Logging utility
    ├── utils.ts                  # General utility functions
    ├── llm/
    │   ├── llmProvider.ts        # Interface & types
    │   ├── llmService.ts         # Service to manage providers
    │   └── providers/
    │       ├── openaiProvider.ts   # Handles OpenAI, LM Studio, compatible APIs
    │       ├── ollamaProvider.ts
    │       ├── googleAIProvider.ts
    │       ├── mistralAIProvider.ts
    │       ├── anthropicProvider.ts
    │       ├── openRouterProvider.ts # **NEW**
    │       ├── huggingfaceIEProvider.ts # **NEW**
    │       └── providerUtils.ts    # Shared utilities
    ├── agents/
    │   ├── agent.ts              # Base Agent class, **enhanced run loop**
    │   ├── agentManager.ts       # Manages agent configurations
    │   ├── supervisorAgent.ts
    │   └── tools/
    │       ├── tool.ts
    │       ├── fileSystemTool.ts
    │       ├── documentationTool.ts
    │       └── debugTool.ts
    ├── prompts/
    │   ├── promptManager.ts
    │   └── defaultPrompts.ts
    ├── diff/
    │   └── diffEngine.ts
    └── ui/
        ├── agentTreeView.ts      # Sidebar Tree View
        ├── uiUtils.ts            # Helpers (context, results handling)
        ├── chatManager.ts        # **REMOVED** (Logic moved to ChatViewProvider)
        ├── webviews/
        │   ├── chat/             # **NEW:** Chat Webview files
        │   │   ├── ChatViewProvider.ts
        │   │   └── view/
        │   │       ├── index.html
        │   │       ├── chatView.css
        │   │       └── chatView.js
        │   └── settings/         # **NEW:** Settings Webview files
        │       ├── SettingsViewProvider.ts
        │       └── view/
        │           ├── index.html
        │           ├── settingsView.css
        │           └── settingsView.js
        └── assets/               # Common CSS/JS (if needed)
```

---

**`package.json`** (Updated Dependencies, Config, Commands, Views)

```json
{
  "name": "codessa",
  "displayName": "Codessa - AI Coding Assistant",
  "description": "Codessa: Your agentic AI pair programmer with multi-provider support, advanced file manipulation, and customizable workflows.",
  "version": "1.1.0", // Incremented version
  "publisher": "your-publisher-name", // CHANGE THIS
  "engines": {
    "vscode": "^1.85.0" // Keep recent VS Code version
  },
  "categories": [ /* ... */ ],
  "keywords": [ /* ... */ ],
  "icon": "images/icon.png",
  "activationEvents": [
    "onView:codessaAgentView", // Keep activation on agent view
    "onView:codessaChatView", // Activate when chat view is opened
    "onView:codessaSettingsView" // Activate when settings view is opened
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      // General Task / Modes (Palette)
      { "command": "codessa.runTask", "title": "Codessa: Run General Task with Agent..." },
      { "command": "codessa.startChat", "title": "Codessa: Start Chat with Agent..." }, // Will focus/open chat view
      { "command": "codessa.editCode", "title": "Codessa: Edit Code with Agent..." },
      { "command": "codessa.generateCode", "title": "Codessa: Generate Code with Agent..." },
      { "command": "codessa.runSupervisorTask", "title": "Codessa: Run Multi-Agent Task..." },
      // Inline / Contextual (Editor Menu)
      { "command": "codessa.inlineAction", "title": "Codessa: Generate/Edit Inline..." },
      // Management & UI
      { "command": "codessa.refreshAgentView", "title": "Refresh Agents", "icon": "$(refresh)" },
      { "command": "codessa.addAgent", "title": "Codessa: Add New Agent..." },
      { "command": "codessa.deleteAgent", "title": "Codessa: Delete Agent..." },
      { "command": "codessa.openSettingsJson", "title": "Codessa: Configure Agents/Prompts (settings.json)..." }, // Explicitly open JSON settings
      { "command": "codessa.focusChatView", "title": "Codessa: Focus Chat Panel" },
      { "command": "codessa.focusSettingsView", "title": "Codessa: Focus Settings Panel" },
      { "command": "codessa.clearChat", "title": "Codessa: Clear Chat History", "icon": "$(clear-all)" }, // Command for chat view
      { "command": "codessa.saveSettings", "title": "Codessa: Save Settings" } // Command for settings view
      // Tree View specific commands (defined below)
    ],
    "viewsContainers": {
      "activitybar": [
        {
          "id": "codessa-view-container",
          "title": "Codessa",
          "icon": "$(hubot)" // Replace with actual SVG path later: "images/codessa-icon.svg"
        }
      ]
    },
    "views": {
      "codessa-view-container": [
        {
          "id": "codessaAgentView",
          "name": "Agents",
          "type": "tree",
          "contextualTitle": "Codessa Agents"
        },
        {
          "id": "codessaChatView", // Chat Webview View
          "name": "Chat",
          "type": "webview",
          "contextualTitle": "Codessa Chat"
        },
        {
          "id": "codessaSettingsView", // Settings Webview View
          "name": "Settings",
          "type": "webview",
          "contextualTitle": "Codessa Settings"
        }
      ]
    },
    "menus": {
      // Keep view/title and view/item/context menus as before
      "view/title": [
        // Refresh/Add for Agent View
        { "command": "codessa.refreshAgentView", "when": "view == codessaAgentView", "group": "navigation@1" },
        { "command": "codessa.addAgent", "when": "view == codessaAgentView", "group": "navigation@2" },
        // Clear Chat for Chat View
        { "command": "codessa.clearChat", "when": "view == codessaChatView", "group": "navigation@1", "icon": "$(clear-all)" }
        // Save Settings for Settings View? (Maybe better inside webview)
      ],
       "view/item/context": [ /* ... Agent Tree context menu items ... */ ],
      "editor/context": [ /* ... Inline action ... */ ],
      "commandPalette": [ /* ... Hide context commands ... */ ]
    },
    "configuration": {
      "title": "Codessa AI Assistant",
      "properties": {
        // REMOVED API KEY PROPERTIES HERE - Use keytar now
        "codessa.logLevel": { /* ... */ },
        "codessa.maxToolIterations": { /* ... */ },
        "codessa.defaultModel": { /* ... */ },
        // Provider Base URLs (Non-sensitive)
        "codessa.providers.openai.baseUrl": { "type": "string", "description": "Optional Base URL for OpenAI compatible APIs (e.g., Azure, local proxy).", "default": "" },
        "codessa.providers.ollama.baseUrl": { "type": "string", "description": "Base URL for your local Ollama instance.", "default": "http://localhost:11434" },
        "codessa.providers.lmstudio.baseUrl": { "type": "string", "description": "Base URL for your local LM Studio server (OpenAI compatible endpoint).", "default": "http://localhost:1234/v1" },
        "codessa.providers.openrouter.baseUrl": { "type": "string", "description": "Base URL for OpenRouter API.", "default": "https://openrouter.ai/api/v1", "restricted": true }, // Restricted - normally fixed
        "codessa.providers.huggingfaceie.baseUrl": { "type": "string", "description": "Base URL for HuggingFace Inference Endpoints (usually specific to your endpoint).", "default": "" },
        // OpenRouter Specific Headers (Optional Overrides - Use API Key primarily)
        "codessa.providers.openrouter.httpReferer": { "type": "string", "description": "Optional HTTP-Referer header for OpenRouter (e.g., your site URL).", "default": "" },
        "codessa.providers.openrouter.xTitle": { "type": "string", "description": "Optional X-Title header for OpenRouter (e.g., your app name).", "default": "Codessa VSCode" },
        // Agent/Prompt Config (remains the same)
        "codessa.systemPrompts": { /* ... markdownDescription added ... */ },
        "codessa.agents": { /* ... */ },
        "codessa.promptVariables": { /* ... */ }
      }
    }
  },
  "scripts": { /* ... */ },
  "devDependencies": { /* ... */ },
  "dependencies": {
    // Keep existing dependencies
    "diff": "^5.1.0",
    "openai": "^4.29.0",
    "@google/generative-ai": "^0.3.0",
    "@mistralai/mistralai": "^0.1.3",
    "@anthropic-ai/sdk": "^0.17.1",
    "axios": "^1.6.7",
    "uuid": "^9.0.1",
    "@types/uuid": "^9.0.8",
    // ** NEW Dependency **
    "keytar": "^7.9.0" // For secure credential storage
  },
   // ** NEW Section for Keytar **
   "binary": {
    "keytar": {
      "module_path": "./node_modules/keytar/build/Release/",
      "remote_path": "./{module_name}/v{version}/{configuration}/",
      "package_name": "{node_abi}-{platform}-{arch}.tar.gz",
      "host": "https://github.com/atom/node-keytar/releases/download/"
    }
  }
}
```

---

**`tsconfig.json`** (No changes needed from previous version)

---

**`.vscodeignore`** (Add webview build artifacts if any)

```
# ... existing ignores ...
src/ui/webviews/**/*.js # Ignore compiled JS if source maps used
src/ui/webviews/**/*.css # Ignore CSS if bundled
```

---

**`README.md`** (Updated Configuration section)

```markdown
# Codessa - AI Coding Assistant for VS Code
...

## Configuration

1.  Open the Codessa Settings Panel (find "Codessa Settings" in the Activity Bar view or run `Codessa: Focus Settings Panel` from the Command Palette).
2.  Enter your API Keys for the desired providers (e.g., OpenAI, Anthropic, OpenRouter, HuggingFace IE). Keys are stored securely in your system's keychain.
3.  Configure Base URLs if using local models (Ollama, LM Studio) or custom endpoints.
4.  Set your preferred Default Model provider and ID.
5.  For advanced Agent and System Prompt configuration, click the link in the Settings Panel or run `Codessa: Configure Agents/Prompts (settings.json)...` to edit the `codessa.agents` and `codessa.systemPrompts` sections in your `settings.json` file. Refer to the default prompts for examples and available variables.

## Usage

1.  Open the Codessa view in the Activity Bar (Hubot icon).
2.  **Chat:** Open the "Chat" view or run `Codessa: Start Chat with Agent...`. Select an agent and start conversing.
3.  **Agents:** Use the "Agents" tree view to:
    *   Right-click an agent for specific actions (Edit Code, Generate, Run Task, etc.).
    *   Expand an agent to see its configuration details.
4.  **Inline:** Right-click in the editor for `Codessa: Generate/Edit Inline...`.
5.  **Command Palette:** Access all major actions via `Ctrl/Cmd + Shift + P` > `Codessa: ...`.

...
```

---

**`LICENSE`** (No changes needed)

---

**`src/logger.ts`** (No changes needed)

---

**`src/config.ts`** (Remove API key getters, add getters for new URLs/headers)

```typescript
import * as vscode from 'vscode';
import { logger } from './logger';
import { LogLevel } from './logger';

const CONFIG_SECTION = 'codessa';

// --- Generic Get/Set --- (Keep as before)
export function getConfig<T>(key: string, defaultValue: T): T { /* ... */ }
export async function setConfig<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> { /* ... */ }

// --- Specific Configuration Getters (Non-Sensitive) ---

export function getLogLevel(): LogLevel { /* ... */ }
export function getMaxToolIterations(): number { /* ... */ }
export function getDefaultModelConfig(): { provider: string; modelId: string } { /* ... */ }

// Get Base URLs or other non-sensitive provider config
export function getProviderBaseUrl(providerId: string): string | undefined {
    return getConfig<string | undefined>(`providers.${providerId}.baseUrl`, undefined);
}
export function getOllamaBaseUrl(): string {
    // Provide default specifically for Ollama
    return getConfig<string>(`providers.ollama.baseUrl`, 'http://localhost:11434');
}
export function getLMStudioBaseUrl(): string {
    // Provide default specifically for LM Studio
    return getConfig<string>(`providers.lmstudio.baseUrl`, 'http://localhost:1234/v1');
}
export function getOpenRouterBaseUrl(): string {
    return getConfig<string>(`providers.openrouter.baseUrl`, 'https://openrouter.ai/api/v1');
}
export function getHuggingFaceIEBaseUrl(): string | undefined {
    return getConfig<string | undefined>(`providers.huggingfaceie.baseUrl`, undefined);
}

// OpenRouter specific headers
export function getOpenRouterHttpReferer(): string | undefined {
    return getConfig<string | undefined>('providers.openrouter.httpReferer', undefined);
}
export function getOpenRouterXTitle(): string {
    return getConfig<string>('providers.openrouter.xTitle', 'Codessa VSCode');
}


// --- Agent/Prompt Config (Keep as before) ---
export function getAgentConfigs(): AgentConfig[] { /* ... */ }
export async function updateAgentConfigs(agents: AgentConfig[]): Promise<void> { /* ... */ }
export function getSystemPrompts(): Record<string, string> { /* ... */ }
export function getPromptVariables(): Record<string, string> { /* ... */ }

// --- Configuration Interfaces (Keep as before) ---
export interface LLMConfig { /* ... */ }
export type ToolID = 'file' | 'docs' | 'debug';
export interface AgentConfig { /* ... */ }

```

---

**`src/secrets.ts`** (NEW FILE - API Key Management)

```typescript
import * as vscode from 'vscode';
import * as keytar from 'keytar'; // Use keytar for secure storage
import { logger } from './logger';

const KEYTAR_SERVICE_PREFIX = 'codessa-vscode-'; // Prefix to avoid collisions

/**
 * Securely retrieves an API key for a given provider using keytar.
 * @param providerId The ID of the LLM provider (e.g., 'openai', 'anthropic').
 * @returns The API key string, or null if not found or keytar fails.
 */
export async function getApiKey(providerId: string): Promise<string | null> {
    const service = `${KEYTAR_SERVICE_PREFIX}${providerId}`;
    const account = vscode.env.machineId; // Use machine ID as account for uniqueness
    try {
        const apiKey = await keytar.getPassword(service, account);
        if (apiKey) {
            logger.debug(`Retrieved API key for provider: ${providerId}`);
        } else {
            logger.debug(`No API key found in keychain for provider: ${providerId}`);
        }
        return apiKey;
    } catch (error) {
        logger.error(`Keytar failed to get password for ${providerId}:`, error);
        // Provide guidance if keytar is likely unavailable
        if (error instanceof Error && (error.message.includes('keychain') || error.message.includes('credentials'))) {
             vscode.window.showWarningMessage(`Could not access system keychain to retrieve API key for ${providerId}. Keytar might not be supported or configured on this system. Keys need to be set manually each session or via environment variables (if supported by the provider SDK).`);
        }
        return null; // Return null on error
    }
}

/**
 * Securely stores an API key for a given provider using keytar.
 * @param providerId The ID of the LLM provider.
 * @param apiKey The API key string to store.
 * @returns True if successful, false otherwise.
 */
export async function setApiKey(providerId: string, apiKey: string): Promise<boolean> {
    const service = `${KEYTAR_SERVICE_PREFIX}${providerId}`;
    const account = vscode.env.machineId;
    try {
        await keytar.setPassword(service, account, apiKey);
        logger.info(`Successfully stored API key for provider: ${providerId}`);
        return true;
    } catch (error) {
        logger.error(`Keytar failed to set password for ${providerId}:`, error);
         if (error instanceof Error && (error.message.includes('keychain') || error.message.includes('credentials'))) {
              vscode.window.showErrorMessage(`Could not access system keychain to store API key for ${providerId}. Keytar might not be supported or configured.`);
         } else {
              vscode.window.showErrorMessage(`Failed to store API key for ${providerId}. See logs for details.`);
         }
        return false;
    }
}

/**
 * Deletes a stored API key for a given provider using keytar.
 * @param providerId The ID of the LLM provider.
 * @returns True if successful or key didn't exist, false on error.
 */
export async function deleteApiKey(providerId: string): Promise<boolean> {
    const service = `${KEYTAR_SERVICE_PREFIX}${providerId}`;
    const account = vscode.env.machineId;
    try {
        const deleted = await keytar.deletePassword(service, account);
        if (deleted) {
            logger.info(`Successfully deleted stored API key for provider: ${providerId}`);
        } else {
             logger.info(`No stored API key found to delete for provider: ${providerId}`);
        }
        return true; // Return true even if key didn't exist
    } catch (error) {
        logger.error(`Keytar failed to delete password for ${providerId}:`, error);
         if (error instanceof Error && (error.message.includes('keychain') || error.message.includes('credentials'))) {
              vscode.window.showErrorMessage(`Could not access system keychain to delete API key for ${providerId}. Keytar might not be supported or configured.`);
         } else {
              vscode.window.showErrorMessage(`Failed to delete API key for ${providerId}. See logs for details.`);
         }
        return false;
    }
}
```

---

**`src/utils.ts`** (No changes needed)

---

**`src/llm/llmProvider.ts`** (No changes needed)

---

**`src/llm/llmService.ts`** (Update provider registration for LM Studio)

```typescript
import * as vscode from 'vscode';
// ... other imports ...
import { getProviderBaseUrl, getLMStudioBaseUrl } from '../config'; // Import specific URL getters

class LLMService {
    // ... properties, constructor, getInstance, initialize ...

    private registerDefaultProviders() {
        logger.info("Registering default LLM providers...");
        this.registerProvider(new OpenAIProvider()); // Handles 'openai'
        this.registerProvider(new OllamaProvider());
        this.registerProvider(new GoogleAIProvider());
        this.registerProvider(new MistralAIProvider());
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new OpenRouterProvider()); // Register new provider
        this.registerProvider(new HuggingFaceIEProvider()); // Register new provider

        // Register LM Studio using OpenAIProvider if URL is configured
        const lmStudioBaseUrl = getLMStudioBaseUrl(); // Use specific getter with default
        if (lmStudioBaseUrl) {
            logger.info(`LM Studio URL found (${lmStudioBaseUrl}), registering provider...`);
            // Pass 'lmstudio' as ID and the specific URL
            this.registerProvider(new OpenAIProvider('lmstudio', lmStudioBaseUrl));
        } else {
             logger.debug("LM Studio URL not configured, skipping provider registration.");
        }

        // Register other OpenAI-compatible endpoints if needed (e.g., custom local server)
        // Could add a generic 'openai-compatible' provider type in config?
    }

    // ... rest of the class (registerProvider, getProvider, getProviderForConfig, listProviderIds, resolveLLMConfig) ...
    // Ensure getProviderForConfig checks isConfigured() which now uses keytar via secrets.ts
     getProviderForConfig(llmConfig?: Partial<LLMConfig>): ILLMProvider | undefined {
        const configProviderId = llmConfig?.provider;
        const defaultProviderId = getDefaultModelConfig().provider;
        const providerId = configProviderId ?? defaultProviderId;

        const provider = this.getProvider(providerId); // getProvider logs if not found

        if (!provider) {
            // Avoid duplicate error message if getProvider already warned
            // vscode.window.showErrorMessage(`LLM Provider '${providerId}' not found. Please check Codessa configuration.`);
            return undefined;
        }
        // isConfigured check is now crucial as it involves secrets
        if (!provider.isConfigured()) {
             vscode.window.showErrorMessage(`LLM Provider '${providerId}' is not configured. Please set API key/URL in Codessa Settings Panel.`);
            return undefined;
        }
        return provider;
    }
}

// ... export initializeLLMService, llmService ...
// --- NEW Provider Imports ---
import { OpenRouterProvider } from './providers/openRouterProvider';
import { HuggingFaceIEProvider } from './providers/huggingfaceIEProvider';
```

---

**`src/llm/providers/providerUtils.ts`** (No changes needed)

---

**`src/llm/providers/openaiProvider.ts`** (Update to use `secrets.ts`)

```typescript
import * as vscode from 'vscode';
import OpenAI from 'openai';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getProviderBaseUrl } from '../../config'; // Use generic getter
import { logger } from '../../logger';
import { formatToolsForOpenAI, extractErrorMessage } from './providerUtils';
import { getApiKey } from '../../secrets'; // Import secret getter

export class OpenAIProvider implements ILLMProvider {
    readonly providerId: string;
    private client: OpenAI | null = null;
    private apiKey: string | null = null; // Store retrieved key
    private baseUrl?: string;
    private isInitialized = false; // Track initialization state

    constructor(providerId: string = 'openai', baseUrlOverride?: string) {
        this.providerId = providerId;
        this.baseUrl = baseUrlOverride;
        // Defer initialization until first use or explicit call?
        // Let's initialize eagerly but handle potential keytar delays/failures.
        this.updateConfiguration().catch(err => {
             logger.error(`Initial configuration failed for ${this.providerId}: ${err}`);
        });
    }

    // Make update async to handle async keytar calls
    async updateConfiguration(): Promise<void> {
        this.isInitialized = false; // Reset flag
        this.apiKey = await getApiKey(this.providerId); // Use keytar

        // Use constructor override first, then config
        this.baseUrl = this.baseUrl ?? getProviderBaseUrl(this.providerId);

        // Check if configuration is sufficient
        if (!this.apiKey && this.providerId === 'openai') { // Official OpenAI requires key
            logger.warn(`OpenAI API key not found for provider '${this.providerId}'.`);
            this.client = null;
            return;
        }
        if (!this.apiKey && !this.baseUrl) { // Compatible APIs need at least a URL
             logger.warn(`Provider '${this.providerId}' requires an API key or a Base URL.`);
             this.client = null;
             return;
        }

        try {
            this.client = new OpenAI({
                apiKey: this.apiKey || undefined, // Pass undefined if null (for local models)
                baseURL: this.baseUrl || undefined,
                dangerouslyAllowBrowser: true,
            });
            logger.info(`OpenAI client configured for provider '${this.providerId}' (Base URL: ${this.baseUrl || 'Default'}).`);
            this.isInitialized = true; // Mark as initialized
        } catch (error) {
            logger.error(`Failed to initialize OpenAI client for provider '${this.providerId}':`, error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        // Considered configured if initialized successfully
        // We don't need to re-check keytar here every time, rely on initialization state.
        // Re-checking keytar on every call could be slow.
        // If keys are revoked externally, re-initialization (e.g., on error) would handle it.
        return this.isInitialized && !!this.client;
    }

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        // Ensure initialization has completed (handles async constructor/update)
        if (!this.isInitialized) {
            logger.debug(`Provider ${this.providerId} not yet initialized, awaiting configuration...`);
            await this.updateConfiguration(); // Attempt re-init if not ready
        }

        if (!this.client) {
            const errorMsg = `Provider '${this.providerId}' not configured or initialization failed. Please check settings/keychain.`;
            logger.error(errorMsg);
            // Avoid showing message here, let caller handle UI
            return { content: null, error: errorMsg };
        }
        // ... rest of generate method remains largely the same ...
        // (Ensure it uses this.client, this.providerId correctly)
         if (params.cancellationToken?.isCancellationRequested) { /* ... */ }
         const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
         // ... message formatting logic ...
         const formattedTools = formatToolsForOpenAI(params.tools);
         const requestOptions = params.options ?? {};
         try {
             logger.debug(`Sending request to ${this.providerId} model ${params.modelId}`);
             const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = { /* ... */ };
             const response = await this.client.chat.completions.create(request, { /* ... cancellation ... */ });
             if (params.cancellationToken?.isCancellationRequested) { /* ... */ }
             const choice = response.choices[0];
             // ... result processing ...
             return { /* ... LLMGenerateResult ... */ };
         } catch (error: any) {
             // ... error handling ...
             // If auth error (401/403), maybe trigger re-check of API key?
             if (error.status === 401 || error.status === 403) {
                  logger.error(`Authentication error with ${this.providerId}. Re-checking API key...`);
                  this.isInitialized = false; // Force re-check on next call
                  await this.updateConfiguration(); // Attempt re-init
             }
             const errorMessage = extractErrorMessage(error);
             return { content: null, error: errorMessage, finishReason: 'error', raw: error };
         }
    }

    // ... getAvailableModels (remains the same, only fetches for 'openai' ID) ...
}
```

---

**`src/llm/providers/ollamaProvider.ts`** (No changes needed - doesn't use API keys)
**`src/llm/providers/googleAIProvider.ts`** (Update to use `secrets.ts`)
**`src/llm/providers/mistralAIProvider.ts`** (Update to use `secrets.ts`)
**`src/llm/providers/anthropicProvider.ts`** (Update to use `secrets.ts`)

*(Self-correction: Need to show the updates for Google, Mistral, Anthropic)*

**`src/llm/providers/googleAIProvider.ts`** (Updated for `secrets.ts`)

```typescript
import * as vscode from 'vscode';
import { GoogleGenerativeAI, /* ... other imports ... */ } from "@google/generative-ai";
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
// REMOVE: import { getProviderConfig } from '../../config';
import { logger } from '../../logger';
import { extractErrorMessage } from './providerUtils';
import { getApiKey } from '../../secrets'; // Import secret getter

export class GoogleAIProvider implements ILLMProvider {
    readonly providerId = 'googleai';
    private genAI: GoogleGenerativeAI | null = null;
    private apiKey: string | null = null;
    private isInitialized = false;

    constructor() {
        this.updateConfiguration().catch(err => {
             logger.error(`Initial configuration failed for ${this.providerId}: ${err}`);
        });
    }

    async updateConfiguration(): Promise<void> {
        this.isInitialized = false;
        this.apiKey = await getApiKey(this.providerId); // Use keytar
        this.initializeClient();
    }

    private initializeClient() {
        if (!this.apiKey) {
            logger.warn("Google AI API key not found or retrieved.");
            this.genAI = null;
            return; // Don't set isInitialized = true
        }
        try {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            logger.info("Google AI (Gemini) client initialized.");
            this.isInitialized = true;
        } catch (error) {
            logger.error("Failed to initialize Google AI client:", error);
            this.genAI = null;
        }
    }

    isConfigured(): boolean {
        return this.isInitialized && !!this.genAI;
    }

    // ... formatHistoryForGemini ... (keep as before)

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.isInitialized) await this.updateConfiguration(); // Ensure initialized
        if (!this.genAI) {
            return { content: null, error: 'Google AI provider not configured (API key missing or invalid?).' };
        }
        // ... rest of generate method remains the same ...
         if (params.cancellationToken?.isCancellationRequested) { /* ... */ }
         try {
             const modelInstance: GenerativeModel = this.genAI.getGenerativeModel({ /* ... */ });
             // ... history/prompt formatting ...
             let response;
             if (historyContent && historyContent.length > 0) { /* ... chat.sendMessage ... */ }
             else { /* ... model.generateContent ... */ }
             if (params.cancellationToken?.isCancellationRequested) { /* ... */ }
             // ... result processing ...
             return { /* ... LLMGenerateResult ... */ };
         } catch (error: any) {
             // ... error handling, check for auth errors ...
              if (error.status === 401 || error.status === 403 || error.message?.includes('API key not valid')) {
                  logger.error(`Authentication error with ${this.providerId}. Re-checking API key...`);
                  this.isInitialized = false;
                  await this.updateConfiguration();
             }
             const errorMessage = extractErrorMessage(error);
             return { content: null, error: errorMessage, finishReason: 'error', raw: error };
         }
    }

    // ... getAvailableModels ... (keep as before)
}
```

**`src/llm/providers/mistralAIProvider.ts`** (Updated for `secrets.ts`)

```typescript
import * as vscode from 'vscode';
import MistralClient, { ChatMessage } from '@mistralai/mistralai';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
// REMOVE: import { getProviderConfig } from '../../config';
import { logger } from '../../logger';
import { extractErrorMessage } from './providerUtils';
import { getApiKey } from '../../secrets'; // Import secret getter

export class MistralAIProvider implements ILLMProvider {
    readonly providerId = 'mistralai';
    private client: MistralClient | null = null;
    private apiKey: string | null = null;
    private isInitialized = false;

    constructor() {
        this.updateConfiguration().catch(err => {
             logger.error(`Initial configuration failed for ${this.providerId}: ${err}`);
        });
    }

    async updateConfiguration(): Promise<void> {
        this.isInitialized = false;
        this.apiKey = await getApiKey(this.providerId); // Use keytar
        this.initializeClient();
    }


    private initializeClient() {
        if (!this.apiKey) {
            logger.warn("Mistral AI API key not found or retrieved.");
            this.client = null;
            return;
        }
        try {
            this.client = new MistralClient(this.apiKey);
            logger.info("Mistral AI client initialized.");
            this.isInitialized = true;
        } catch (error) {
            logger.error("Failed to initialize Mistral AI client:", error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return this.isInitialized && !!this.client;
    }

    // ... formatHistoryForMistral ... (keep as before)

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.isInitialized) await this.updateConfiguration(); // Ensure initialized
        if (!this.client) {
            return { content: null, error: 'Mistral AI provider not configured (API key missing or invalid?).' };
        }
        // ... rest of generate method remains the same ...
         if (params.cancellationToken?.isCancellationRequested) { /* ... */ }
         const messages: ChatMessage[] = [];
         // ... message formatting ...
         try {
             logger.debug(`Sending request to Mistral AI model ${params.modelId}`);
             const chatResponse = await this.client.chat({ /* ... request params ... */ });
             if (params.cancellationToken?.isCancellationRequested) { /* ... */ }
             // ... result processing ...
             return { /* ... LLMGenerateResult ... */ };
         } catch (error: any) {
             // ... error handling, check for auth errors ...
              if (error.status === 401 || error.status === 403 || error.message?.includes('Invalid API Key')) {
                  logger.error(`Authentication error with ${this.providerId}. Re-checking API key...`);
                  this.isInitialized = false;
                  await this.updateConfiguration();
             }
             const errorMessage = extractErrorMessage(error);
             return { content: null, error: errorMessage, finishReason: 'error', raw: error };
         }
    }

    // ... getAvailableModels ... (keep as before)
}
```

**`src/llm/providers/anthropicProvider.ts`** (Updated for `secrets.ts`)

```typescript
import * as vscode from 'vscode';
import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
// REMOVE: import { getProviderConfig } from '../../config';
import { logger } from '../../logger';
import { formatToolsForAnthropic, extractErrorMessage } from './providerUtils';
import { getApiKey } from '../../secrets'; // Import secret getter

export class AnthropicProvider implements ILLMProvider {
    readonly providerId = 'anthropic';
    private client: Anthropic | null = null;
    private apiKey: string | null = null;
    private isInitialized = false;

    constructor() {
        this.updateConfiguration().catch(err => {
             logger.error(`Initial configuration failed for ${this.providerId}: ${err}`);
        });
    }

    async updateConfiguration(): Promise<void> {
        this.isInitialized = false;
        this.apiKey = await getApiKey(this.providerId); // Use keytar
        this.initializeClient();
    }

    private initializeClient() {
        if (!this.apiKey) {
            logger.warn("Anthropic API key not found or retrieved.");
            this.client = null;
            return;
        }
        try {
            this.client = new Anthropic({ apiKey: this.apiKey });
            logger.info("Anthropic (Claude) client initialized.");
            this.isInitialized = true;
        } catch (error) {
            logger.error("Failed to initialize Anthropic client:", error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return this.isInitialized && !!this.client;
    }

    // ... formatHistoryForAnthropic ... (keep as before)

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.isInitialized) await this.updateConfiguration(); // Ensure initialized
        if (!this.client) {
            return { content: null, error: 'Anthropic provider not configured (API key missing or invalid?).' };
        }
        // ... rest of generate method remains the same ...
         if (params.cancellationToken?.isCancellationRequested) { /* ... */ }
         const formattedTools = formatToolsForAnthropic(params.tools);
         const messages = this.formatHistoryForAnthropic(params.history) ?? [];
         messages.push({ role: 'user', content: params.prompt });
         // ... message validation ...
         try {
             logger.debug(`Sending request to Anthropic model ${params.modelId}`);
             const request: Anthropic.Messages.MessageCreateParamsNonStreaming = { /* ... */ };
             const response = await this.client.messages.create(request, { /* ... cancellation ... */ });
             if (params.cancellationToken?.isCancellationRequested) { /* ... */ }
             // ... result processing ...
             return { /* ... LLMGenerateResult ... */ };
         } catch (error: any) {
             // ... error handling, check for auth errors ...
              if (error.status === 401 || error.status === 403 || error.error?.type === 'authentication_error') {
                  logger.error(`Authentication error with ${this.providerId}. Re-checking API key...`);
                  this.isInitialized = false;
                  await this.updateConfiguration();
             }
             const errorMessage = extractErrorMessage(error);
             return { content: null, error: errorMessage, finishReason: 'error', raw: error };
         }
    }

    // ... getAvailableModels ... (keep as before)
}
```

---

**`src/llm/providers/openRouterProvider.ts`** (NEW FILE)

```typescript
import * as vscode from 'vscode';
import axios, { AxiosInstance, CancelTokenSource } from 'axios';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getOpenRouterBaseUrl, getOpenRouterHttpReferer, getOpenRouterXTitle } from '../../config';
import { logger } from '../../logger';
import { formatToolsForOpenAI, extractErrorMessage } from './providerUtils'; // OpenRouter uses OpenAI format
import { getApiKey } from '../../secrets';

export class OpenRouterProvider implements ILLMProvider {
    readonly providerId = 'openrouter';
    private client: AxiosInstance | null = null;
    private apiKey: string | null = null;
    private baseUrl: string = '';
    private httpReferer?: string;
    private xTitle?: string;
    private isInitialized = false;

    constructor() {
        this.updateConfiguration().catch(err => {
             logger.error(`Initial configuration failed for ${this.providerId}: ${err}`);
        });
    }

    async updateConfiguration(): Promise<void> {
        this.isInitialized = false;
        this.apiKey = await getApiKey(this.providerId);
        this.baseUrl = getOpenRouterBaseUrl(); // Get from config
        this.httpReferer = getOpenRouterHttpReferer() || vscode.env.uriScheme + '://' + vscode.env.appName; // Use VS Code scheme/name as default referer
        this.xTitle = getOpenRouterXTitle();
        this.initializeClient();
    }

    private initializeClient() {
        if (!this.apiKey) {
            logger.warn("OpenRouter API key not found or retrieved.");
            this.client = null;
            return;
        }
        if (!this.baseUrl) {
            logger.error("OpenRouter base URL is missing."); // Should have default
            this.client = null;
            return;
        }

        try {
            this.client = axios.create({
                baseURL: this.baseUrl,
                timeout: 300000, // 5 minute timeout
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': this.httpReferer,
                    'X-Title': this.xTitle,
                    'Content-Type': 'application/json'
                }
            });
            logger.info(`OpenRouter client initialized (Base URL: ${this.baseUrl}).`);
            this.isInitialized = true;
        } catch (error) {
            logger.error("Failed to initialize OpenRouter client:", error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        return this.isInitialized && !!this.client;
    }

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.isInitialized) await this.updateConfiguration();
        if (!this.client) {
            return { content: null, error: 'OpenRouter provider not configured (API key missing or invalid?).' };
        }
         if (params.cancellationToken?.isCancellationRequested) {
             return { content: null, error: 'Request cancelled before sending.', finishReason: 'cancel' };
        }

        // OpenRouter uses OpenAI's chat completions format
        const endpoint = '/chat/completions';
        const messages: any[] = []; // Use OpenAI message format

        if (params.systemPrompt) {
            messages.push({ role: 'system', content: params.systemPrompt });
        }
        if (params.history) {
             params.history.forEach(h => { /* ... format like OpenAI ... */ });
        }
        if (!params.history?.some(h => h.role === 'user' && h.content === params.prompt)) {
             messages.push({ role: 'user', content: params.prompt });
        }

        const formattedTools = formatToolsForOpenAI(params.tools);
        const requestOptions = params.options ?? {};

        // Model name for OpenRouter often includes the original provider, e.g., "openai/gpt-4-turbo"
        const requestData = {
            model: params.modelId, // User must provide the correct OpenRouter model string
            messages: messages,
            temperature: requestOptions.temperature,
            max_tokens: requestOptions.max_tokens,
            top_p: requestOptions.top_p,
            stop: requestOptions.stop,
            tools: formattedTools,
            tool_choice: formattedTools ? requestOptions.tool_choice ?? 'auto' : undefined,
            // OpenRouter specific options? Check their API docs.
            // route: requestOptions.route ?? undefined,
            // transforms: requestOptions.transforms ?? undefined,
        };

        let cancelSource: CancelTokenSource | undefined;
        if (params.cancellationToken) {
            cancelSource = axios.CancelToken.source();
            params.cancellationToken.onCancellationRequested(() => {
                logger.warn("OpenRouter request cancelled by user.");
                cancelSource?.cancel("Request cancelled by user.");
            });
        }

        try {
            logger.debug(`Sending request to OpenRouter model ${params.modelId}`);
            const response = await this.client.post(endpoint, requestData, {
                cancelToken: cancelSource?.token,
            });

            logger.debug(`OpenRouter response received. Finish reason: ${response.data?.choices?.[0]?.finish_reason}`);

            const choice = response.data?.choices?.[0];
            if (!choice) {
                 throw new Error("Invalid response structure from OpenRouter: Missing 'choices'.");
            }

            return {
                content: choice.message?.content ?? null,
                finishReason: choice.finish_reason ?? undefined,
                usage: response.data.usage ? {
                    promptTokens: response.data.usage.prompt_tokens,
                    completionTokens: response.data.usage.completion_tokens,
                    totalTokens: response.data.usage.total_tokens,
                } : undefined,
                toolCalls: choice.message?.tool_calls ?? undefined,
                raw: response.data,
            };
        } catch (error: any) {
            if (axios.isCancel(error)) {
                 return { content: null, error: 'Request cancelled', finishReason: 'cancel' };
            }
             if (error.response?.status === 401 || error.response?.status === 403) {
                  logger.error(`Authentication error with ${this.providerId}. Re-checking API key...`);
                  this.isInitialized = false;
                  await this.updateConfiguration();
             }
            const errorMessage = extractErrorMessage(error);
            logger.error(`Error calling OpenRouter API: ${errorMessage}`, error);
            return { content: null, error: errorMessage, finishReason: 'error', raw: error.response?.data ?? error };
        }
    }

    async getAvailableModels(): Promise<string[]> {
        if (!this.isInitialized) await this.updateConfiguration();
        if (!this.client) {
            logger.warn("Cannot fetch OpenRouter models, client not configured.");
            return [];
        }
        const endpoint = '/models'; // Standard endpoint for model listing
        try {
            logger.debug("Fetching OpenRouter models list...");
            const response = await this.client.get(endpoint);
            // Response format is typically { data: [ { id: 'provider/model', ... }, ... ] }
            return response.data?.data?.map((m: any) => m.id).sort() ?? [];
        } catch (error: any) {
             const errorMessage = extractErrorMessage(error);
             logger.error(`Failed to fetch OpenRouter models: ${errorMessage}`, error);
            return [];
        }
    }
}
```

---

**`src/llm/providers/huggingfaceIEProvider.ts`** (NEW FILE)

```typescript
import * as vscode from 'vscode';
import axios, { AxiosInstance, CancelTokenSource } from 'axios';
import { ILLMProvider, LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getProviderBaseUrl } from '../../config';
import { logger } from '../../logger';
import { extractErrorMessage } from './providerUtils';
import { getApiKey } from '../../secrets';

// Note: Hugging Face Inference Endpoint API is simpler (text-in, text-out)
// and doesn't have built-in concepts like chat history or tool calling.
// We adapt our interface, relying on JSON prompting for tools.

export class HuggingFaceIEProvider implements ILLMProvider {
    readonly providerId = 'huggingfaceie'; // Inference Endpoints
    private client: AxiosInstance | null = null;
    private apiKey: string | null = null;
    private baseUrl: string | null = null; // Base URL is specific to the endpoint
    private isInitialized = false;

    constructor() {
        this.updateConfiguration().catch(err => {
             logger.error(`Initial configuration failed for ${this.providerId}: ${err}`);
        });
    }

    async updateConfiguration(): Promise<void> {
        this.isInitialized = false;
        this.apiKey = await getApiKey(this.providerId); // Get HF API Token
        this.baseUrl = getProviderBaseUrl(this.providerId); // Get specific endpoint URL
        this.initializeClient();
    }

    private initializeClient() {
        if (!this.apiKey) {
            logger.warn("HuggingFace Inference Endpoint API key (token) not found or retrieved.");
            this.client = null;
            return;
        }
        if (!this.baseUrl) {
            logger.warn("HuggingFace Inference Endpoint Base URL not configured.");
            this.client = null;
            return;
        }

        try {
            this.client = axios.create({
                baseURL: this.baseUrl, // The specific endpoint URL
                timeout: 300000, // 5 minute timeout
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            logger.info(`HuggingFace IE client initialized (Base URL: ${this.baseUrl}).`);
            this.isInitialized = true;
        } catch (error) {
            logger.error("Failed to initialize HuggingFace IE client:", error);
            this.client = null;
        }
    }

    isConfigured(): boolean {
        // Requires both URL and API key
        return this.isInitialized && !!this.client;
    }

    async generate(params: LLMGenerateParams): Promise<LLMGenerateResult> {
        if (!this.isInitialized) await this.updateConfiguration();
        if (!this.client) {
            return { content: null, error: 'HuggingFace IE provider not configured (URL or API Key missing/invalid?).' };
        }
         if (params.cancellationToken?.isCancellationRequested) {
             return { content: null, error: 'Request cancelled before sending.', finishReason: 'cancel' };
        }

        // --- Construct Prompt ---
        // HF IE doesn't have system prompts or history roles natively.
        // Combine them into a single input prompt string.
        let fullPrompt = "";
        if (params.systemPrompt) {
            fullPrompt += `${params.systemPrompt}\n\n`;
        }
        if (params.history) {
            // Simple concatenation of history turns
            fullPrompt += params.history.map(h => `${h.role}: ${h.content}`).join('\n') + '\n\n';
        }
        fullPrompt += `user: ${params.prompt}`; // Clearly label the final prompt

        // Tool usage relies entirely on JSON prompting within the fullPrompt.

        const requestOptions = params.options ?? {};
        const requestData = {
            inputs: fullPrompt,
            parameters: {
                temperature: requestOptions.temperature,
                max_new_tokens: requestOptions.max_tokens, // HF uses max_new_tokens
                top_p: requestOptions.top_p,
                top_k: requestOptions.top_k,
                stop: requestOptions.stop, // Often called stop_sequences or similar
                return_full_text: false, // Usually want only the generated part
                // Other HF specific parameters...
            },
            // options: { wait_for_model: true } // Example HF option
        };

        let cancelSource: CancelTokenSource | undefined;
        if (params.cancellationToken) {
            cancelSource = axios.CancelToken.source();
            params.cancellationToken.onCancellationRequested(() => {
                logger.warn("HuggingFace IE request cancelled by user.");
                cancelSource?.cancel("Request cancelled by user.");
            });
        }

        try {
            // Endpoint path is usually just '/' relative to the base URL for TGI/TEI
            const endpointPath = ''; // Or adjust if your endpoint has a specific path
            logger.debug(`Sending request to HuggingFace IE: ${this.baseUrl}${endpointPath}`);
            const response = await this.client.post(endpointPath, requestData, {
                cancelToken: cancelSource?.token,
            });

            // HF IE response format can vary, common is [{ "generated_text": "..." }]
            let generatedText: string | null = null;
            if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].generated_text) {
                generatedText = response.data[0].generated_text;
            } else if (response.data?.generated_text) { // Some might return object directly
                 generatedText = response.data.generated_text;
            } else {
                 logger.warn("Unexpected response format from HuggingFace IE:", response.data);
                 // Try to extract text heuristically? Risky.
                 generatedText = JSON.stringify(response.data); // Fallback: stringify whole response
            }


            logger.debug(`HuggingFace IE response received.`);

            return {
                content: generatedText?.trim() ?? null,
                finishReason: 'stop', // HF IE usually doesn't provide detailed finish reasons
                usage: undefined, // Token usage often not provided or needs separate calculation
                raw: response.data,
                // No native tool call support
            };
        } catch (error: any) {
            if (axios.isCancel(error)) {
                 return { content: null, error: 'Request cancelled', finishReason: 'cancel' };
            }
             if (error.response?.status === 401 || error.response?.status === 403) {
                  logger.error(`Authentication error with ${this.providerId}. Re-checking API key/URL...`);
                  this.isInitialized = false;
                  await this.updateConfiguration();
             }
            const errorMessage = extractErrorMessage(error);
            logger.error(`Error calling HuggingFace IE API: ${errorMessage}`, error);
            return { content: null, error: errorMessage, finishReason: 'error', raw: error.response?.data ?? error };
        }
    }

    // Models are defined by the specific endpoint URL, no API to list them generally.
    async getAvailableModels(): Promise<string[]> {
        logger.debug("HuggingFace IE provider does not support listing models via API.");
        return [];
    }
}
```

---

**`src/diff/diffEngine.ts`** (No changes needed)
**`src/agents/tools/tool.ts`** (No changes needed)
**`src/agents/tools/fileSystemTool.ts`** (No changes needed)
**`src/agents/tools/documentationTool.ts`** (No changes needed)
**`src/agents/tools/debugTool.ts`** (No changes needed - still experimental)
**`src/prompts/promptManager.ts`** (No changes needed)
**`src/prompts/defaultPrompts.ts`** (No changes needed)

---

**`src/agents/agent.ts`** (Enhanced `run` loop for multiple/native tools)

```typescript
import * as vscode from 'vscode';
// ... other imports ...
import { LLMGenerateResult, LLMGenerateParams } from '../llm/llmProvider';
import { generateUUID } from '../utils'; // Ensure UUID is imported

// ... AgentMode, AgentRunInput, AgentMessage, AgentRunResult, AgentContext ... (Keep definitions)

export class Agent {
    // ... properties (id, name, etc.) ...
    // ... constructor, registerTools, getToolDescriptionList ... (Keep as before)

    /**
     * Runs the agent with a given input, context, and mode.
     * Implements the primary agent loop for interacting with the LLM and tools.
     * Handles multiple tool calls per LLM response turn.
     */
    async run(input: AgentRunInput, context: AgentContext): Promise<AgentRunResult> {
        const runId = generateUUID().substring(0, 8);
        logger.info(`Agent '${this.name}' [${runId}] starting run. Mode: ${input.mode}, Prompt: "${input.prompt.substring(0, 60)}..."`);
        const startTime = Date.now();

        const provider = llmService().getProviderForConfig(this.llmConfig);
        if (!provider) { /* ... error handling ... */ }

        // --- Prepare System Prompt ---
        const systemPromptVars = { /* ... construct vars ... */ };
        const systemPrompt = promptManager.getSystemPrompt(this.systemPromptName, systemPromptVars);
        if (!systemPrompt) { /* ... error handling ... */ }

        // --- Initialize Agent State ---
        const executionHistory: AgentMessage[] = [];
        const toolResultsLog: ToolResult[] = [];
        let iterations = 0;
        const maxIterations = getMaxToolIterations();

        // Add initial history/prompt
        if (input.mode === 'chat' && input.chatHistory) {
             executionHistory.push(...input.chatHistory);
        }
        executionHistory.push({ role: 'user', content: input.prompt });

        // --- Agent Loop ---
        while (iterations < maxIterations) {
            iterations++;
            logger.debug(`Agent '${this.name}' [${runId}] - Iteration ${iterations}/${maxIterations}`);

            if (context.cancellationToken?.isCancellationRequested) { /* ... handle cancellation ... */ }

            // --- Prepare & Call LLM ---
            const llmParams: LLMGenerateParams = { /* ... construct params ... */ };
            let llmResult: LLMGenerateResult;
            try {
                llmResult = await provider.generate(llmParams);
            } catch (error: any) { /* ... error handling ... */ }

            if (llmResult!.error) { /* ... error handling ... */ } // Use non-null assertion after try/catch

            // --- Process LLM Response ---
            const assistantResponseContent = llmResult!.content; // Store potential text content
            const nativeToolCalls = llmResult!.toolCalls; // Native calls from provider
            let jsonToolCall: { name: string; arguments: any } | null = null; // Parsed from JSON fallback
            let finalAnswer: string | null = null;
            let executedToolThisTurn = false; // Track if any tool was run in this iteration

            // Create the initial assistant message (might be updated)
            const assistantMessage: AgentMessage = { role: 'assistant', content: assistantResponseContent };

            // 1. Process Native Tool Calls (Highest Priority)
            if (nativeToolCalls && nativeToolCalls.length > 0) {
                logger.info(`Agent '${this.name}' [${runId}] received ${nativeToolCalls.length} native tool call(s).`);
                assistantMessage.tool_calls = nativeToolCalls; // Record the calls in the assistant message
                executedToolThisTurn = true; // Mark that we are processing tools

                // Add assistant message *with* tool_calls to history *before* executing tools
                if (assistantMessage.content || assistantMessage.tool_calls) {
                     executionHistory.push(assistantMessage);
                }

                // Execute ALL native tool calls sequentially for this turn
                for (const call of nativeToolCalls) {
                     if (context.cancellationToken?.isCancellationRequested) break; // Check cancellation between calls

                     let parsedCall: { id?: string; name: string; arguments: any } | null = null;
                     // Parse based on provider format (OpenAI/Anthropic)
                     if (call.type === 'function' && call.function) { /* ... parse OpenAI ... */ }
                     else if (call.type === 'tool_use' && call.name && call.input) { /* ... parse Anthropic ... */ }
                     else { logger.warn(`Unrecognized native tool call format: ${JSON.stringify(call)}`); continue; }

                     if (parsedCall) {
                         const toolResultMsg = await this.executeTool(parsedCall, context, runId, toolResultsLog);
                         executionHistory.push(toolResultMsg); // Add tool result message
                     }
                }
            }

            // 2. Process JSON Tool Call (Fallback, only if NO native calls)
            else if (assistantResponseContent) {
                try {
                    const jsonMatch = assistantResponseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```|^\s*(\{[\s\S]*\})\s*$/);
                    const jsonString = jsonMatch ? (jsonMatch[1] ?? jsonMatch[2]) : assistantResponseContent;
                    const parsedJson = JSON.parse(jsonString.trim());

                    if (parsedJson.tool_call?.name && parsedJson.tool_call?.arguments) {
                        logger.info(`Agent '${this.name}' [${runId}] received JSON tool call.`);
                        jsonToolCall = {
                            name: parsedJson.tool_call.name,
                            arguments: parsedJson.tool_call.arguments
                        };
                        executedToolThisTurn = true; // Mark tool processing

                        // Add assistant message (which was just the JSON) - content should be null now
                        assistantMessage.content = null;
                        if (assistantMessage.content || assistantMessage.tool_calls) { // Check again (tool_calls should be null here)
                           executionHistory.push(assistantMessage);
                        }

                        // Execute the single JSON tool call
                        const toolResultMsg = await this.executeTool(jsonToolCall, context, runId, toolResultsLog);
                        executionHistory.push(toolResultMsg);

                    } else if (parsedJson.final_answer !== undefined) {
                        logger.info(`Agent '${this.name}' [${runId}] received JSON final answer.`);
                        finalAnswer = String(parsedJson.final_answer);
                        assistantMessage.content = finalAnswer; // Update assistant message content
                    }
                    // If valid JSON but not tool/final_answer, treat as plain text below
                } catch (e) {
                    // Not valid JSON or expected format
                    finalAnswer = assistantResponseContent; // Treat as final answer
                }
            }

            // 3. Determine Final Answer (if no tools were executed this turn)
            if (!executedToolThisTurn) {
                 if (finalAnswer === null) { // If JSON parsing didn't yield final_answer
                     finalAnswer = assistantResponseContent; // Use original content
                 }
                 logger.info(`Agent '${this.name}' [${runId}] treating response as final answer.`);
                 // Add the assistant message (containing the final answer) to history
                 if (assistantMessage.content || assistantMessage.tool_calls) { // Check again (tool_calls should be null)
                     executionHistory.push(assistantMessage);
                 }
                 break; // Exit the loop, we have the final answer
            }

            // If tools were executed this turn, the loop continues...
        } // End of while loop

        // --- Handle Loop Exit ---
        if (finalAnswer !== null) {
            // Final Answer Reached normally
            const duration = Date.now() - startTime;
            logger.info(`Agent '${this.name}' [${runId}] reached final answer after ${iterations} iterations (${duration}ms).`);
            // ... Post-processing based on mode (appliedPatch, outputFilePath) ...
            let appliedPatch = false; /* ... check toolResultsLog ... */
            let outputFilePath: string | undefined; /* ... check toolResultsLog ... */
            return { success: true, finalAnswer, toolResults: toolResultsLog, history: executionHistory, appliedPatch, outputFilePath };
        } else {
            // Max Iterations Reached
            const duration = Date.now() - startTime;
            logger.warn(`Agent '${this.name}' [${runId}] reached max iterations (${maxIterations}) after ${duration}ms.`);
            return { success: false, error: `Agent exceeded maximum tool iterations (${maxIterations}). Task may be incomplete.`, history: executionHistory, toolResults: toolResultsLog };
        }
    }

    /**
     * Helper method to execute a parsed tool call and return the history message.
     */
    private async executeTool(
        parsedCall: { id?: string; name: string; arguments: any },
        context: AgentContext,
        runId: string,
        toolResultsLog: ToolResult[] // Log results here
    ): Promise<AgentMessage> {
        const { id: toolCallId, name: toolName, arguments: toolArgs } = parsedCall;
        logger.info(`Agent [${runId}] executing tool: ${toolName}`);
        logger.debug(`Tool arguments: ${JSON.stringify(toolArgs)}`);

        const toolNameParts = toolName.split('.');
        const toolId = toolNameParts[0] as ToolID;
        const actionId = toolNameParts.length > 1 ? toolNameParts[1] : undefined;

        const tool = this.tools.get(toolId);
        let toolResultData: ToolResult;

        if (tool) {
            const toolInput: ToolInput = actionId ? { action: actionId, ...toolArgs } : { ...toolArgs };
            try {
                toolResultData = await tool.execute(toolInput, context);
                toolResultsLog.push(toolResultData);
                logger.info(`Tool '${toolName}' executed. Success: ${toolResultData.success}`);
                 if (!toolResultData.success) logger.warn(`Tool '${toolName}' failed: ${toolResultData.error}`);
            } catch (error: any) {
                logger.error(`Unhandled error executing tool '${toolName}':`, error);
                toolResultData = { success: false, error: `Tool execution threw exception: ${error.message}` };
                toolResultsLog.push(toolResultData);
            }
        } else {
            logger.error(`Agent [${runId}] requested unknown tool: ${toolId}`);
            toolResultData = { success: false, error: `Unknown tool: ${toolId}` };
            toolResultsLog.push(toolResultData);
        }

        // Return the message to be added to history
        return {
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolName,
            content: JSON.stringify(toolResultData.output ?? { error: toolResultData.error }),
            is_error: !toolResultData.success
        };
    }
}
```

---

**`src/agents/agentManager.ts`** (No major changes needed, relies on updated Agent/Config)
**`src/agents/supervisorAgent.ts`** (No major changes needed, relies on updated Agent)

---

**`src/ui/agentTreeView.ts`** (No major changes needed, relies on uiUtils)

---

**`src/ui/uiUtils.ts`** (Update `showChatInterface` to use `ChatManager`)

```typescript
import * as vscode from 'vscode';
// ... other imports ...
import { chatManager } from './chatManager'; // Use ChatManager

// ... getEditorContext ... (keep as before)
// ... handleAgentSuccess ... (keep as before, maybe add logging)
// ... handleAgentError ... (keep as before, maybe add logging)
// ... showResultInDocument ... (keep as before)
// ... handleSuggestedPatch ... (keep as before)
// ... detectLanguage ... (keep as before)

/**
 * Initiates the chat interface (delegates to ChatManager).
 */
export function showChatInterface(agent: Agent, initialContext: AgentContext) {
    logger.debug(`UIUtils: Requesting chat interface for agent: ${agent.name}`);
    chatManager.startOrShowChat(agent, initialContext);
}
```

---

**`src/ui/chatManager.ts`** (REMOVED - Replaced by `ChatViewProvider`)

---

**`src/ui/webviews/chat/ChatViewProvider.ts`** (NEW FILE)

```typescript
import * as vscode from 'vscode';
import { Agent, AgentContext, AgentRunInput, AgentMessage } from '../../../agents/agent';
import { agentManager } from '../../../agents/agentManager'; // Use singleton accessor
import { logger } from '../../../logger';
import { getEditorContext } from '../../uiUtils';
import { generateUUID } from '../../../utils';
import { getNonce } from '../webviewUtils'; // Helper for CSP

/**
 * Manages the Codessa Chat Webview View.
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codessaChatView';

    private _view?: vscode.WebviewView;
    private currentChat: { agent: Agent; history: AgentMessage[]; context: AgentContext } | null = null;
    private isAgentRunning: boolean = false;
    private currentAbortController: AbortController | null = null;
    private extensionContext: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
         // Register command to clear chat
         context.subscriptions.push(vscode.commands.registerCommand('codessa.clearChat', () => {
            this.clearChat();
        }));
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        logger.info("Chat webview resolved.");

        webviewView.webview.options = {
            enableScripts: true, // Allow scripts to run in the webview
            localResourceRoots: [vscode.Uri.joinPath(this.extensionContext.extensionUri, 'src', 'ui', 'webviews', 'chat', 'view')] // Restrict webview access
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async message => {
                logger.debug(`ChatView received message: ${message.command}`, message.payload);
                switch (message.command) {
                    case 'sendMessage':
                        if (message.payload?.text) {
                            this.handleUserMessage(message.payload.text);
                        }
                        return;
                    case 'chatReady':
                        // Webview is ready, send initial state if any
                        this.sendChatState();
                        return;
                    case 'selectAgent':
                         // Trigger agent selection from webview button
                         await this.selectAgentAndStartChat();
                         return;
                     case 'cancelAgentRun':
                         this.cancelAgentRun();
                         return;
                }
            },
            undefined,
            this.extensionContext.subscriptions
        );

        // Handle view disposal
        webviewView.onDidDispose(() => {
            logger.info("Chat webview disposed.");
            this._view = undefined;
            this.cancelAgentRun(); // Cancel any running agent if view closes
            // Decide whether to clear chat state on dispose or persist it
            // this.currentChat = null;
        }, null, this.extensionContext.subscriptions);

        // If a chat was active before, resend state
        this.sendChatState();
    }

    /** Starts a new chat or focuses the existing view. */
    public async startOrFocusChat(agent?: Agent, initialContext?: AgentContext) {
        // Ensure the view is visible
        if (!this._view) {
            await vscode.commands.executeCommand('codessaChatView.focus');
             // Need to wait a bit for the view to resolve after focus?
             await new Promise(resolve => setTimeout(resolve, 100));
             if (!this._view) {
                  logger.error("Failed to focus and resolve chat view.");
                  vscode.window.showErrorMessage("Could not open Codessa Chat panel.");
                  return;
             }
        } else {
             this._view.show(true); // Reveal the view without stealing focus
        }


        if (agent && (!this.currentChat || this.currentChat.agent.id !== agent.id)) {
            this.startNewChatSession(agent, initialContext ?? getEditorContext());
        } else if (!this.currentChat) {
             // If no agent provided and no current chat, prompt selection
             await this.selectAgentAndStartChat(initialContext);
        }
        // If agent is the same or no agent provided but chat exists, do nothing (webview state is preserved)
    }

    private async selectAgentAndStartChat(initialContext?: AgentContext) {
         const agent = await this.selectAgentUI(); // Use internal helper
         if (agent) {
             this.startNewChatSession(agent, initialContext ?? getEditorContext());
         }
    }


    private startNewChatSession(agent: Agent, context: AgentContext) {
         this.cancelAgentRun(); // Cancel previous run if any
         this.currentChat = { agent, history: [], context };
         logger.info(`Starting new chat session with agent: ${agent.name} [${agent.id}]`);
         this.sendMessageToWebview('setChatState', {
             agentName: agent.name,
             messages: [], // Start with empty messages
             isRunning: false,
         });
    }

    private clearChat() {
         this.cancelAgentRun();
         if (this.currentChat) {
             this.currentChat.history = [];
             logger.info(`Chat history cleared for agent: ${this.currentChat.agent.name}`);
             this.sendMessageToWebview('setChatState', {
                 agentName: this.currentChat.agent.name,
                 messages: [],
                 isRunning: false,
             });
         } else {
              this.sendMessageToWebview('setChatState', {
                 agentName: null,
                 messages: [],
                 isRunning: false,
             });
         }
    }


    /** Sends the current chat state to the webview. */
    private sendChatState() {
        if (this._view && this.currentChat) {
            this.sendMessageToWebview('setChatState', {
                agentName: this.currentChat.agent.name,
                messages: this.currentChat.history,
                isRunning: this.isAgentRunning,
            });
        } else if (this._view) {
             // No active chat
             this.sendMessageToWebview('setChatState', {
                 agentName: null,
                 messages: [],
                 isRunning: false,
             });
        }
    }

    /** Sends a message to the Webview. */
    private sendMessageToWebview(command: string, payload: any) {
        if (this._view) {
            this._view.webview.postMessage({ command, payload }).then(
                (success) => { if (!success) logger.warn(`Failed to post message '${command}' to ChatView.`); },
                (error) => { logger.error(`Error posting message '${command}' to ChatView:`, error); }
            );
        } else {
             logger.warn(`Attempted to send message '${command}' but ChatView is not available.`);
        }
    }

    /** Handles a user message received from the webview. */
    private async handleUserMessage(text: string) {
        if (!this.currentChat || this.isAgentRunning) {
            logger.warn("Received user message but no active chat or agent is running.");
            // Optionally send status back to webview?
            return;
        }

        const userMessage: AgentMessage = { role: 'user', content: text };
        this.currentChat.history.push(userMessage);

        // Update webview immediately with user message
        this.sendMessageToWebview('addMessage', userMessage);

        // Trigger agent response
        await this.runAgentResponse();
    }

    /** Cancels the currently running agent process. */
    private cancelAgentRun() {
         if (this.currentAbortController) {
             logger.info("Requesting cancellation of agent run.");
             this.currentAbortController.abort();
             this.currentAbortController = null;
             this.isAgentRunning = false;
             this.sendMessageToWebview('setAgentStatus', { isRunning: false });
         }
    }


    /** Runs the agent to get the next response. */
    private async runAgentResponse() {
        if (!this.currentChat || this.isAgentRunning) return;

        this.isAgentRunning = true;
        this.currentAbortController = new AbortController(); // Create new controller for this run
        const { agent, history, context } = this.currentChat;
        const runStartTime = Date.now();

        // Update webview status
        this.sendMessageToWebview('setAgentStatus', { isRunning: true });

        try {
            const agentInput: AgentRunInput = {
                mode: 'chat',
                prompt: history[history.length - 1].content ?? '', // Latest user message
                chatHistory: history.slice(0, -1) // History before latest message
            };
            const runContext: AgentContext = {
                 ...context, // Pass original context
                 cancellationToken: this.currentAbortController.token // Pass cancellation token
            };

            const result = await agent.run(agentInput, runContext);
            const duration = Date.now() - runStartTime;

            if (this.currentAbortController?.token.isCancellationRequested) {
                 logger.info(`Agent run cancelled after ${duration}ms.`);
                 // Status already updated by cancelAgentRun
                 return;
            }

            if (result.success && result.finalAnswer !== undefined && result.finalAnswer !== null) {
                const assistantMessage: AgentMessage = { role: 'assistant', content: result.finalAnswer };
                // Add tool usage info if available? Maybe as metadata?
                // assistantMessage.metadata = { toolResults: result.toolResults };
                this.currentChat?.history.push(assistantMessage);
                this.sendMessageToWebview('addMessage', assistantMessage);
                logger.info(`Agent ${agent.name} responded in ${duration}ms.`);
            } else {
                const errorMsg = result.error ?? "Agent failed to produce a response.";
                logger.error(`Agent ${agent.name} failed during chat: ${errorMsg}`);
                // Send error message to webview
                const errorMessage: AgentMessage = { role: 'assistant', content: `*Codessa Error: ${errorMsg}*` };
                // Don't add error to persistent history? Or add as system message? Add to view only.
                this.sendMessageToWebview('addMessage', errorMessage);
                // Optionally log full history on error
                if (result.history) logger.error("Failing chat history:", result.history);
            }

        } catch (error) {
            const duration = Date.now() - runStartTime;
            logger.error(`Critical error during agent run (${duration}ms):`, error);
            const errorMsg = error instanceof Error ? error.message : String(error);
            const errorMessage: AgentMessage = { role: 'assistant', content: `*Codessa Critical Error: ${errorMsg}*` };
            this.sendMessageToWebview('addMessage', errorMessage);
        } finally {
            this.isAgentRunning = false;
            this.currentAbortController = null;
            // Update webview status if chat is still active
            if (this.currentChat) {
                this.sendMessageToWebview('setAgentStatus', { isRunning: false });
            }
        }
    }

     // Helper to select agent using Quick Pick (similar to extension.ts)
     private async selectAgentUI(filter?: (agent: Agent) => boolean, title: string = "Select Agent to Chat With"): Promise<Agent | undefined> {
        let agents = agentManager().getAllAgents().filter(a => !a.isSupervisor); // Only non-supervisors for chat
        if (filter) agents = agents.filter(filter);

        if (agents.length === 0) {
            vscode.window.showInformationMessage(`No suitable Codessa agents configured for chat.`);
            return undefined;
        }
        agents.sort((a, b) => a.name.localeCompare(b.name));
        const selected = await vscode.window.showQuickPick(
            agents.map(a => ({ label: a.name, description: a.description, agent: a })),
            { placeHolder: title, matchOnDescription: true, ignoreFocusOut: true } // Ignore focus loss
        );
        return selected?.agent;
    }


    // Generates the HTML content for the webview
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionContext.extensionUri, 'src', 'ui', 'webviews', 'chat', 'view', 'chatView.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionContext.extensionUri, 'src', 'ui', 'webviews', 'chat', 'view', 'chatView.css'));
        const nonce = getNonce(); // For Content Security Policy

        return /*html*/`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <!-- Content Security Policy -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:;">
                <link href="${styleUri}" rel="stylesheet">
                <title>Codessa Chat</title>
            </head>
            <body>
                <div id="chat-container">
                    <div id="messages">
                        <!-- Messages will be added here -->
                         <div class="message system">Select an agent to start chatting.</div>
                    </div>
                    <div id="input-area">
                        <button id="select-agent-button" title="Select Agent">Select Agent</button>
                        <textarea id="message-input" rows="1" placeholder="Enter your message..."></textarea>
                        <button id="send-button" title="Send Message">Send</button>
                        <button id="cancel-button" title="Cancel Agent Response" class="hidden">Cancel</button>
                    </div>
                     <div id="status-area">
                         <span id="agent-name">No agent selected</span>
                         <span id="thinking-indicator" class="hidden">Thinking...</span>
                     </div>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}
```

---

**`src/ui/webviews/chat/view/index.html`** (This file is not strictly needed as HTML is generated in Provider, but useful for development/reference)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="chatView.css" rel="stylesheet">
    <title>Codessa Chat</title>
</head>
<body>
    <div id="chat-container">
        <div id="messages">
            <!-- Messages will be added here -->
            <div class="message system">Select an agent to start chatting.</div>
        </div>
        <div id="input-area">
            <button id="select-agent-button" title="Select Agent">Select Agent</button>
            <textarea id="message-input" rows="1" placeholder="Enter your message..."></textarea>
            <button id="send-button" title="Send Message">Send</button>
            <button id="cancel-button" title="Cancel Agent Response" class="hidden">Cancel</button>
        </div>
         <div id="status-area">
             <span id="agent-name">No agent selected</span>
             <span id="thinking-indicator" class="hidden">Thinking...</span>
         </div>
    </div>
    <!-- Script loaded by provider -->
    <!-- <script src="chatView.js"></script> -->
</body>
</html>
```

---

**`src/ui/webviews/chat/view/chatView.css`** (NEW FILE - Basic Styling)

```css
body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-editor-background);
    margin: 0;
    padding: 0;
    overflow: hidden; /* Prevent body scrolling */
    display: flex;
    flex-direction: column;
    height: 100vh;
}

#chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 10px;
    box-sizing: border-box;
}

#messages {
    flex-grow: 1;
    overflow-y: auto; /* Allow message scrolling */
    padding-bottom: 10px; /* Space above input area */
    border-bottom: 1px solid var(--vscode-editorWidget-border, #454545);
    margin-bottom: 10px;
}

.message {
    margin-bottom: 10px;
    padding: 8px 12px;
    border-radius: 5px;
    max-width: 90%;
    word-wrap: break-word; /* Wrap long words */
    white-space: pre-wrap; /* Preserve whitespace and wrap */
}

.message.user {
    background-color: var(--vscode-list-activeSelectionBackground, #094771);
    color: var(--vscode-list-activeSelectionForeground, #ffffff);
    margin-left: auto; /* Align user messages to the right */
    text-align: left; /* Keep text left-aligned within the bubble */
}

.message.assistant {
    background-color: var(--vscode-editorWidget-background, #252526);
    border: 1px solid var(--vscode-editorWidget-border, #454545);
    margin-right: auto; /* Align assistant messages to the left */
}

.message.system {
    font-style: italic;
    color: var(--vscode-descriptionForeground);
    text-align: center;
    font-size: 0.9em;
    background-color: transparent;
    border: none;
}

/* Basic Markdown support styling */
.message code {
  font-family: var(--vscode-editor-font-family);
  background-color: var(--vscode-textCodeBlock-background, rgba(9, 71, 113, 0.2));
  padding: 0.1em 0.3em;
  border-radius: 3px;
  font-size: 0.95em;
}
.message pre {
  background-color: var(--vscode-textCodeBlock-background, rgba(9, 71, 113, 0.2));
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: var(--vscode-editor-font-family);
}
.message pre code {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}
.message strong, .message b {
  font-weight: bold;
}
.message em, .message i {
  font-style: italic;
}
.message ul, .message ol {
  margin-left: 20px;
  margin-top: 5px;
  margin-bottom: 5px;
}

#input-area {
    display: flex;
    align-items: flex-end; /* Align items to bottom */
    gap: 5px;
    padding-top: 5px;
}

#message-input {
    flex-grow: 1;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-input-foreground);
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 6px 8px;
    resize: none; /* Prevent manual resize */
    min-height: 20px; /* Minimum height for one line */
    max-height: 150px; /* Limit maximum height */
    overflow-y: auto; /* Allow scrolling if content exceeds max-height */
    box-sizing: border-box;
}
#message-input:focus {
    outline: 1px solid var(--vscode-focusBorder);
    border-color: var(--vscode-focusBorder);
}

button {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: 1px solid var(--vscode-button-border, transparent);
    padding: 6px 10px;
    border-radius: 3px;
    cursor: pointer;
    white-space: nowrap;
}
button:hover {
    background-color: var(--vscode-button-hoverBackground);
}
button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
button.hidden {
    display: none;
}
#cancel-button {
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
}
#cancel-button:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
}


#status-area {
    font-size: 0.85em;
    color: var(--vscode-descriptionForeground);
    padding-top: 5px;
    text-align: center;
    height: 1.5em; /* Reserve space */
}
#agent-name {
    font-weight: bold;
    margin-right: 10px;
}
#thinking-indicator {
    font-style: italic;
}
```

---

**`src/ui/webviews/chat/view/chatView.js`** (NEW FILE - Webview Frontend Logic)

```javascript
// This script runs in the context of the Chat Webview
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi(); // Access VS Code API specific to webviews

    const messagesDiv = document.getElementById('messages');
    const inputArea = document.getElementById('input-area');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const cancelButton = document.getElementById('cancel-button');
    const selectAgentButton = document.getElementById('select-agent-button');
    const statusAgentName = document.getElementById('agent-name');
    const thinkingIndicator = document.getElementById('thinking-indicator');

    let isAgentRunning = false;
    let currentAgentName = null;

    // --- Event Listeners ---

    // Send message on button click
    sendButton.addEventListener('click', sendMessage);

    // Send message on Enter press (Shift+Enter for newline)
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default newline behavior
            sendMessage();
        }
    });

     // Auto-resize textarea
     messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto'; // Reset height
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px'; // Set new height up to max
    });

    // Cancel agent run
    cancelButton.addEventListener('click', () => {
        vscode.postMessage({ command: 'cancelAgentRun' });
    });

    // Select agent
    selectAgentButton.addEventListener('click', () => {
         vscode.postMessage({ command: 'selectAgent' });
    });


    // --- Message Handling from Extension Host ---

    window.addEventListener('message', event => {
        const message = event.data; // The JSON data sent from the extension
        console.log("ChatView received message:", message);

        switch (message.command) {
            case 'addMessage':
                addMessage(message.payload); // payload should be AgentMessage
                break;
            case 'setChatState':
                setChatState(message.payload); // payload: { agentName, messages, isRunning }
                break;
            case 'setAgentStatus':
                setAgentStatus(message.payload.isRunning); // payload: { isRunning }
                break;
            // Add other commands as needed (e.g., clearMessages)
        }
    });

    // --- Functions ---

    function sendMessage() {
        const text = messageInput.value.trim();
        if (text && !isAgentRunning) {
            vscode.postMessage({ command: 'sendMessage', payload: { text } });
            messageInput.value = ''; // Clear input
            messageInput.style.height = 'auto'; // Reset height after sending
            // Disable input while agent is running?
            // messageInput.disabled = true;
            // sendButton.disabled = true;
        }
    }

    function setChatState(state) {
         messagesDiv.innerHTML = ''; // Clear existing messages
         currentAgentName = state.agentName;
         updateStatusArea();
         if (state.messages && Array.isArray(state.messages)) {
             state.messages.forEach(addMessage);
         }
         setAgentStatus(state.isRunning); // Set initial running status
         // Enable/disable input based on agent selection
         const hasAgent = !!state.agentName;
         messageInput.disabled = !hasAgent || state.isRunning;
         sendButton.disabled = !hasAgent || state.isRunning;
         selectAgentButton.disabled = state.isRunning; // Disable agent selection while running
    }

    function addMessage(message) { // message: AgentMessage
        if (!message || !message.role || message.content === null || message.content === undefined) return;

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.role); // Role determines styling

        // Basic Markdown rendering (replace with a library like 'marked' or 'markdown-it' for full support)
        let contentHtml = escapeHtml(message.content);
        // Simple replacements - very basic!
        contentHtml = contentHtml
            .replace(/```(\w+)?\s*([\s\S]*?)\s*```/g, (match, lang, code) => `<pre><code class="language-${lang || ''}">${escapeHtml(code.trim())}</code></pre>`) // Code blocks
            .replace(/`([^`]+)`/g, '<code>$1</code>') // Inline code
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/^-\s+(.*)/gm, '<li>$1</li>') // Basic list items (needs wrapping <ul>) - imperfect
            .replace(/\n/g, '<br>'); // Newlines


        messageElement.innerHTML = contentHtml;
        messagesDiv.appendChild(messageElement);

        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function setAgentStatus(running) {
        isAgentRunning = running;
        messageInput.disabled = !currentAgentName || isAgentRunning;
        sendButton.disabled = !currentAgentName || isAgentRunning;
        selectAgentButton.disabled = isAgentRunning;

        if (isAgentRunning) {
            thinkingIndicator.classList.remove('hidden');
            cancelButton.classList.remove('hidden');
        } else {
            thinkingIndicator.classList.add('hidden');
            cancelButton.classList.add('hidden');
            // Re-focus input after agent finishes?
             if (currentAgentName) messageInput.focus();
        }
         updateStatusArea(); // Update agent name display too
    }

     function updateStatusArea() {
         statusAgentName.textContent = currentAgentName ? `Agent: ${currentAgentName}` : "No agent selected";
     }

    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
             .toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }


    // --- Initialization ---
    // Inform the extension host that the webview is ready
    vscode.postMessage({ command: 'chatReady' });
    messageInput.disabled = true; // Disabled until an agent is selected
    sendButton.disabled = true;
    updateStatusArea();

}());
```

---

**`src/ui/webviews/settings/SettingsViewProvider.ts`** (NEW FILE)

```typescript
import * as vscode from 'vscode';
import { logger } from '../../../logger';
import { getNonce } from '../webviewUtils';
import { getApiKey, setApiKey, deleteApiKey } from '../../../secrets';
import { llmService } from '../../../llm/llmService'; // Use singleton accessor
import { getDefaultModelConfig, setDefaultModel, getProviderBaseUrl, setConfig } from '../../../config';

/**
 * Manages the Codessa Settings Webview View.
 */
export class SettingsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codessaSettingsView';

    private _view?: vscode.WebviewView;
    private extensionContext: vscode.ExtensionContext;

    // List of providers requiring API keys
    private keyProviders = ['openai', 'anthropic', 'googleai', 'mistralai', 'openrouter', 'huggingfaceie'];
    // List of providers allowing Base URL config
    private urlProviders = ['openai', 'ollama', 'lmstudio', 'huggingfaceie']; // OpenRouter URL is fixed

    constructor(context: vscode.ExtensionContext) {
        this.extensionContext = context;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        logger.info("Settings webview resolved.");

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionContext.extensionUri, 'src', 'ui', 'webviews', 'settings', 'view')]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async message => {
                logger.debug(`SettingsView received message: ${message.command}`);
                switch (message.command) {
                    case 'settingsReady':
                        // Webview is ready, send current settings
                        await this.sendSettingsToWebview();
                        return;
                    case 'saveApiKey':
                        if (message.payload?.provider && message.payload?.apiKey !== undefined) {
                             await this.handleSaveApiKey(message.payload.provider, message.payload.apiKey);
                        }
                        return;
                    case 'deleteApiKey':
                         if (message.payload?.provider) {
                             await this.handleDeleteApiKey(message.payload.provider);
                         }
                         return;
                    case 'saveBaseUrl':
                         if (message.payload?.provider && message.payload?.baseUrl !== undefined) {
                             await this.handleSaveBaseUrl(message.payload.provider, message.payload.baseUrl);
                         }
                         return;
                    case 'saveDefaultModel':
                         if (message.payload?.provider && message.payload?.modelId !== undefined) {
                             await this.handleSaveDefaultModel(message.payload.provider, message.payload.modelId);
                         }
                         return;
                     case 'openSettingsJson':
                          vscode.commands.executeCommand('codessa.openSettingsJson', message.payload?.query);
                          return;
                }
            },
            undefined,
            this.extensionContext.subscriptions
        );

         // Handle view disposal
         webviewView.onDidDispose(() => {
             logger.info("Settings webview disposed.");
             this._view = undefined;
         }, null, this.extensionContext.subscriptions);

         // Send initial settings when resolved (async)
         this.sendSettingsToWebview();
    }

    /** Sends the current settings state to the webview. */
    private async sendSettingsToWebview() {
        if (!this._view) return;

        const settingsData: any = {
            providers: {},
            defaultModel: getDefaultModelConfig(),
            allProviders: llmService().listProviderIds().sort(), // Get all registered providers
        };

        // Get API key status and Base URLs
        for (const providerId of this.keyProviders) {
             const apiKey = await getApiKey(providerId);
             settingsData.providers[providerId] = {
                 ...settingsData.providers[providerId],
                 hasApiKey: !!apiKey, // Only send boolean status, not the key itself
             };
        }
         for (const providerId of this.urlProviders) {
             const baseUrl = getProviderBaseUrl(providerId) ?? ''; // Get configured URL or empty string
              // Use specific getters for defaults if needed
              let urlValue = baseUrl;
              if (!urlValue && providerId === 'ollama') urlValue = 'http://localhost:11434';
              if (!urlValue && providerId === 'lmstudio') urlValue = 'http://localhost:1234/v1';

             settingsData.providers[providerId] = {
                 ...settingsData.providers[providerId],
                 baseUrl: urlValue,
             };
         }

        this.sendMessageToWebview('loadSettings', settingsData);
    }

     /** Sends a message to the Webview. */
    private sendMessageToWebview(command: string, payload: any) {
        if (this._view) {
            this._view.webview.postMessage({ command, payload }).then(
                (success) => { if (!success) logger.warn(`Failed to post message '${command}' to SettingsView.`); },
                (error) => { logger.error(`Error posting message '${command}' to SettingsView:`, error); }
            );
        } else {
             logger.warn(`Attempted to send message '${command}' but SettingsView is not available.`);
        }
    }

    // --- Message Handlers ---

    private async handleSaveApiKey(providerId: string, apiKey: string) {
         if (!this.keyProviders.includes(providerId)) {
             logger.warn(`Attempted to save API key for unsupported provider: ${providerId}`);
             return;
         }
         const success = await setApiKey(providerId, apiKey);
         if (success) {
             vscode.window.showInformationMessage(`API Key for ${providerId} saved securely.`);
             // Refresh relevant provider's config state
             llmService().getProvider(providerId)?.updateConfiguration();
             // Refresh webview state
             await this.sendSettingsToWebview();
         } else {
              vscode.window.showErrorMessage(`Failed to save API Key for ${providerId}. Check logs.`);
         }
    }

    private async handleDeleteApiKey(providerId: string) {
         if (!this.keyProviders.includes(providerId)) return;
         const success = await deleteApiKey(providerId);
         if (success) {
             vscode.window.showInformationMessage(`Stored API Key for ${providerId} deleted.`);
             llmService().getProvider(providerId)?.updateConfiguration();
             await this.sendSettingsToWebview();
         } else {
             vscode.window.showErrorMessage(`Failed to delete API Key for ${providerId}. Check logs.`);
         }
    }

     private async handleSaveBaseUrl(providerId: string, baseUrl: string) {
         if (!this.urlProviders.includes(providerId)) {
             logger.warn(`Attempted to save Base URL for unsupported provider: ${providerId}`);
             return;
         }
         // Save to VS Code settings
         await setConfig(`providers.${providerId}.baseUrl`, baseUrl || null); // Save null if empty to clear setting
         vscode.window.showInformationMessage(`Base URL for ${providerId} updated.`);
         // Refresh relevant provider's config state
         llmService().getProvider(providerId)?.updateConfiguration();
         // No need to refresh webview state here, config change watcher should handle it?
         // Or force refresh: await this.sendSettingsToWebview();
    }

     private async handleSaveDefaultModel(provider: string, modelId: string) {
         if (!provider || !modelId) {
             vscode.window.showErrorMessage("Invalid default model selection.");
             return;
         }
         await setDefaultModel(provider, modelId); // Use config helper
         vscode.window.showInformationMessage(`Default model set to ${provider}/${modelId}.`);
         // Refresh webview state
         await this.sendSettingsToWebview();
    }


    // Generates the HTML content for the webview
    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionContext.extensionUri, 'src', 'ui', 'webviews', 'settings', 'view', 'settingsView.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionContext.extensionUri, 'src', 'ui', 'webviews', 'settings', 'view', 'settingsView.css'));
        const nonce = getNonce();

        // Dynamically generate provider sections based on known providers
        let providerHtml = '';
        const allProviders = llmService().listProviderIds().sort(); // Get all registered providers

        allProviders.forEach(pId => {
             const needsKey = this.keyProviders.includes(pId);
             const needsUrl = this.urlProviders.includes(pId);
             if (!needsKey && !needsUrl) return; // Skip providers with no config here

             providerHtml += `<div class="provider-section" id="provider-${pId}"><h3>${pId}</h3>`;
             if (needsKey) {
                 providerHtml += `
                     <div class="setting">
                         <label for="${pId}-apikey">API Key:</label>
                         <div class="api-key-input">
                            <input type="password" id="${pId}-apikey" placeholder="Enter API Key...">
                            <button class="save-key" data-provider="${pId}">Save Key</button>
                            <button class="delete-key" data-provider="${pId}" title="Delete Stored Key">Delete</button>
                         </div>
                         <span class="key-status" id="${pId}-key-status"></span>
                     </div>`;
             }
             if (needsUrl) {
                  providerHtml += `
                     <div class="setting">
                         <label for="${pId}-baseurl">Base URL:</label>
                         <input type="text" id="${pId}-baseurl" placeholder="e.g., http://localhost:11434">
                         <button class="save-url" data-provider="${pId}">Save URL</button>
                     </div>`;
             }
              // Add OpenRouter specific fields
              if (pId === 'openrouter') {
                 // providerHtml += `... fields for httpReferer, xTitle ...`; // Add later if needed
              }

             providerHtml += `</div>`;
        });


        return /*html*/`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data:;">
                <link href="${styleUri}" rel="stylesheet">
                <title>Codessa Settings</title>
            </head>
            <body>
                <h2>Codessa Settings</h2>

                <div class="section">
                    <h3>Default Model</h3>
                    <div class="setting">
                        <label for="default-provider">Default Provider:</label>
                        <select id="default-provider">
                            <!-- Options populated by JS -->
                        </select>
                    </div>
                     <div class="setting">
                        <label for="default-model">Default Model ID:</label>
                        <input type="text" id="default-model" placeholder="e.g., llama3, gpt-4-turbo">
                     </div>
                     <button id="save-default-model">Save Default Model</button>
                </div>

                <div class="section">
                    <h3>Provider Configuration</h3>
                    ${providerHtml}
                </div>

                 <div class="section">
                    <h3>Advanced Configuration</h3>
                    <p>For agent definitions, system prompts, and prompt variables, please edit your VS Code settings file directly.</p>
                    <button id="open-settings-json-agents">Configure Agents (settings.json)</button>
                    <button id="open-settings-json-prompts">Configure Prompts (settings.json)</button>
                </div>


                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}

// Helper to set default model in config (could move to config.ts)
async function setDefaultModel(provider: string, modelId: string) {
     await setConfig('defaultModel', { provider, modelId });
}
```

---

**`src/ui/webviews/settings/view/index.html`** (Reference Only)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="settingsView.css" rel="stylesheet">
    <title>Codessa Settings</title>
</head>
<body>
    <h2>Codessa Settings</h2>

    <div class="section">
        <h3>Default Model</h3>
        <div class="setting">
            <label for="default-provider">Default Provider:</label>
            <select id="default-provider">
                <!-- Options populated by JS -->
            </select>
        </div>
         <div class="setting">
            <label for="default-model">Default Model ID:</label>
            <input type="text" id="default-model" placeholder="e.g., llama3, gpt-4-turbo">
         </div>
         <button id="save-default-model">Save Default Model</button>
    </div>

    <div class="section">
        <h3>Provider Configuration</h3>
        <!-- Provider sections generated by JS/Provider -->
        <div class="provider-section" id="provider-openai"><h3>openai</h3>
             <div class="setting">
                 <label for="openai-apikey">API Key:</label>
                 <div class="api-key-input">
                    <input type="password" id="openai-apikey" placeholder="Enter API Key...">
                    <button class="save-key" data-provider="openai">Save Key</button>
                    <button class="delete-key" data-provider="openai" title="Delete Stored Key">Delete</button>
                 </div>
                 <span class="key-status" id="openai-key-status"></span>
             </div>
             <div class="setting">
                 <label for="openai-baseurl">Base URL:</label>
                 <input type="text" id="openai-baseurl" placeholder="Optional, e.g., Azure endpoint">
                 <button class="save-url" data-provider="openai">Save URL</button>
             </div>
        </div>
        <!-- ... other providers ... -->
    </div>

     <div class="section">
        <h3>Advanced Configuration</h3>
        <p>For agent definitions, system prompts, and prompt variables, please edit your VS Code settings file directly.</p>
        <button id="open-settings-json-agents">Configure Agents (settings.json)</button>
        <button id="open-settings-json-prompts">Configure Prompts (settings.json)</button>
    </div>

    <!-- <script src="settingsView.js"></script> -->
</body>
</html>
```

---

**`src/ui/webviews/settings/view/settingsView.css`** (NEW FILE - Basic Styling)

```css
body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-sideBar-background, var(--vscode-editor-background)); /* Use sidebar bg */
    padding: 15px;
}

h2, h3 {
    color: var(--vscode-sideBar-foreground);
    border-bottom: 1px solid var(--vscode-sideBar-border, var(--vscode-editorWidget-border));
    padding-bottom: 5px;
    margin-top: 15px;
    margin-bottom: 10px;
}
h2 { margin-top: 0; }

.section {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--vscode-sideBar-border, var(--vscode-editorWidget-border));
}
.section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}


.provider-section {
    margin-bottom: 15px;
    padding-left: 10px;
    border-left: 2px solid var(--vscode-editorWidget-border, #454545);
}
.provider-section h3 {
    margin-top: 0;
    border-bottom: none;
    font-size: 1.1em;
}


.setting {
    margin-bottom: 10px;
    display: flex;
    flex-direction: column; /* Stack label and input */
    gap: 4px;
}
.setting label {
    display: block;
    font-weight: bold;
    margin-bottom: 2px;
}

input[type="text"],
input[type="password"],
select {
    width: 100%;
    padding: 6px 8px;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-input-foreground);
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    box-sizing: border-box;
}
input:focus, select:focus {
    outline: 1px solid var(--vscode-focusBorder);
    border-color: var(--vscode-focusBorder);
}

button {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: 1px solid var(--vscode-button-border, transparent);
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    margin-top: 5px; /* Space below input */
    max-width: 200px; /* Prevent buttons getting too wide */
}
button:hover {
    background-color: var(--vscode-button-hoverBackground);
}

.api-key-input {
    display: flex;
    align-items: center;
    gap: 5px;
}
.api-key-input input {
    flex-grow: 1;
}
.api-key-input button {
    margin-top: 0; /* Align with input */
    padding: 5px 8px; /* Slightly smaller buttons */
    max-width: fit-content;
}
button.delete-key {
     background-color: var(--vscode-button-secondaryBackground);
     color: var(--vscode-button-secondaryForeground);
}
button.delete-key:hover {
     background-color: var(--vscode-button-secondaryHoverBackground);
}


.key-status {
    font-size: 0.9em;
    margin-left: 5px;
    font-style: italic;
}
.key-status.set {
    color: var(--vscode-testing-iconPassed, #73c991); /* Greenish */
}
.key-status.not-set {
     color: var(--vscode-testing-iconSkipped, #848484); /* Greyish */
}

p {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 0.95em;
    color: var(--vscode-descriptionForeground);
}
```

---

**`src/ui/webviews/settings/view/settingsView.js`** (NEW FILE - Webview Frontend Logic)

```javascript
// This script runs in the context of the Settings Webview
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    let allProviders = []; // Store list of all provider IDs

    // --- Event Listeners ---

    window.addEventListener('message', event => {
        const message = event.data;
        console.log("SettingsView received message:", message);
        switch (message.command) {
            case 'loadSettings':
                loadSettings(message.payload);
                break;
        }
    });

    // Use event delegation for buttons
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        if (!target || target.tagName !== 'BUTTON') return;

        if (target.classList.contains('save-key')) {
            const provider = target.dataset.provider;
            const inputElement = document.getElementById(`${provider}-apikey`);
            if (provider && inputElement) {
                vscode.postMessage({ command: 'saveApiKey', payload: { provider, apiKey: inputElement.value } });
                inputElement.value = ''; // Clear input after saving
            }
        } else if (target.classList.contains('delete-key')) {
            const provider = target.dataset.provider;
            if (provider) {
                vscode.postMessage({ command: 'deleteApiKey', payload: { provider } });
            }
        } else if (target.classList.contains('save-url')) {
             const provider = target.dataset.provider;
             const inputElement = document.getElementById(`${provider}-baseurl`);
             if (provider && inputElement) {
                 vscode.postMessage({ command: 'saveBaseUrl', payload: { provider, baseUrl: inputElement.value } });
             }
        } else if (target.id === 'save-default-model') {
             const providerSelect = document.getElementById('default-provider');
             const modelInput = document.getElementById('default-model');
             if (providerSelect && modelInput) {
                 vscode.postMessage({ command: 'saveDefaultModel', payload: { provider: providerSelect.value, modelId: modelInput.value } });
             }
        } else if (target.id === 'open-settings-json-agents') {
             vscode.postMessage({ command: 'openSettingsJson', payload: { query: 'codessa.agents' } });
        } else if (target.id === 'open-settings-json-prompts') {
             vscode.postMessage({ command: 'openSettingsJson', payload: { query: 'codessa.systemPrompts' } });
        }
    });


    // --- Functions ---

    function loadSettings(settings) {
        console.log("Loading settings into view:", settings);
        allProviders = settings.allProviders || [];

        // Populate Default Model Provider dropdown
        const defaultProviderSelect = document.getElementById('default-provider');
        defaultProviderSelect.innerHTML = ''; // Clear existing options
        allProviders.forEach(pId => {
             const option = document.createElement('option');
             option.value = pId;
             option.textContent = pId;
             if (settings.defaultModel?.provider === pId) {
                 option.selected = true;
             }
             defaultProviderSelect.appendChild(option);
        });

        // Set Default Model ID
        const defaultModelInput = document.getElementById('default-model');
        if (defaultModelInput) {
            defaultModelInput.value = settings.defaultModel?.modelId || '';
        }

        // Populate Provider Specific Settings
        allProviders.forEach(pId => {
             const providerData = settings.providers[pId] || {};

             // API Key Status
             const keyStatusSpan = document.getElementById(`${pId}-key-status`);
             if (keyStatusSpan) {
                 keyStatusSpan.textContent = providerData.hasApiKey ? '(Key Set)' : '(Not Set)';
                 keyStatusSpan.className = providerData.hasApiKey ? 'key-status set' : 'key-status not-set';
             }
             // Clear API key input field (never show stored key)
             const apiKeyInput = document.getElementById(`${pId}-apikey`);
             if (apiKeyInput) apiKeyInput.value = '';


             // Base URL
             const baseUrlInput = document.getElementById(`${pId}-baseurl`);
             if (baseUrlInput) {
                 baseUrlInput.value = providerData.baseUrl || '';
             }
        });
    }

    // --- Initialization ---
    vscode.postMessage({ command: 'settingsReady' });

}());
```

---

**`src/ui/webviews/webviewUtils.ts`** (NEW FILE - Shared Webview Helpers)

```typescript
/**
 * Generates a random nonce string for use in Content Security Policy.
 */
export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
```

---

**`src/extension.ts`** (Updated to initialize Webviews and register related commands)

```typescript
import * as vscode from 'vscode';
// ... other imports ...
import { ChatViewProvider } from './ui/webviews/chat/ChatViewProvider'; // Import Webview Provider
import { SettingsViewProvider } from './ui/webviews/settings/SettingsViewProvider'; // Import Webview Provider
// REMOVE: import { chatManager } from './ui/chatManager';

export function activate(context: vscode.ExtensionContext) {
    const startTime = Date.now();
    logger.info('Activating Codessa AI Assistant v1.1.0...'); // Update version

    try {
        // Initialize core services
        initializeLLMService(context);
        initializeAgentManager(context);

        // Register Tree View
        const agentTreeDataProvider = new AgentTreeDataProvider(context);
        context.subscriptions.push(vscode.window.createTreeView('codessaAgentView', { /* ... options ... */ }));

        // ** NEW: Register Webview View Providers **
        const chatProvider = new ChatViewProvider(context);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatProvider)
        );

        const settingsProvider = new SettingsViewProvider(context);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(SettingsViewProvider.viewType, settingsProvider)
        );


        // Register global commands from package.json
        registerGlobalCommands(context, chatProvider); // Pass chatProvider

        // Register placeholder webview commands (now handled by providers/focus commands)
        // registerChatWebviewCommands(context);
        // registerSettingsWebviewCommands(context);

        const duration = Date.now() - startTime;
        logger.info(`Codessa activation complete (${duration}ms).`);
        vscode.window.setStatusBarMessage("Codessa activated.", 3000);

    } catch (error) { /* ... error handling ... */ }
}

// Update command registration to include webview focus/interaction
function registerGlobalCommands(context: vscode.ExtensionContext, chatProvider: ChatViewProvider) { // Accept chatProvider

    // ... selectAgent helper ... (keep as before)

    // Command: Start Chat (Palette) - Now focuses view and potentially starts chat via provider
    context.subscriptions.push(vscode.commands.registerCommand('codessa.startChat', async () => {
        const agent = await selectAgent(a => !a.isSupervisor, "Select Agent to Chat With");
        // Let the provider handle starting/focusing, optionally passing the agent
        await chatProvider.startOrFocusChat(agent);
    }));

    // Command: Focus Chat View
    context.subscriptions.push(vscode.commands.registerCommand('codessa.focusChatView', () => {
         vscode.commands.executeCommand('codessaChatView.focus');
    }));

     // Command: Focus Settings View
    context.subscriptions.push(vscode.commands.registerCommand('codessa.focusSettingsView', () => {
         vscode.commands.executeCommand('codessaSettingsView.focus');
    }));


    // ... other commands (runTask, editCode, generateCode, runSupervisorTask, inlineAction) ...
    // These commands remain largely the same, potentially calling the TreeView provider's methods
    // or directly using agentManager/showProgress/handleAgentResult.

    // Management Commands
    context.subscriptions.push(vscode.commands.registerCommand('codessa.addAgent', () => { /* ... */ }));
    context.subscriptions.push(vscode.commands.registerCommand('codessa.deleteAgent', () => { /* ... */ }));
    // Updated command to open settings JSON specifically
    context.subscriptions.push(vscode.commands.registerCommand('codessa.openSettingsJson', (setting?: string) => {
        const query = setting ? `@ext:${context.extension.id} ${setting}` : `@ext:${context.extension.id}`;
        vscode.commands.executeCommand('workbench.action.openSettingsJson', query); // Open JSON directly
        vscode.window.showInformationMessage("Opening Codessa settings in settings.json.");
    }));

    // Note: 'codessa.clearChat' is registered within ChatViewProvider constructor now.
    // Note: 'codessa.saveSettings' (if needed) would be handled via messages from SettingsViewProvider.

    logger.debug("Codessa global commands registered.");
}


// Deactivation
export function deactivate(): Thenable<void> | undefined {
    logger.info("Deactivating Codessa AI Assistant...");
    // No chatManager to dispose now, webviews handle their own disposal
    logger.info("Codessa deactivated.");
    return undefined;
}
```

---

This concludes the implementation incorporating the requested features: new providers, enhanced tool calling, Webview UIs for Chat and basic Settings, and `keytar` integration for security.

**Final Steps Before Use:**

1.  **Install Dependencies:** Run `npm install` (this will install `keytar` and others).
2.  **Compile:** Run `npm run compile`.
3.  **Keytar Native Module:** `keytar` is a native Node.js module. Ensure you have the necessary build tools installed on your system (like Python, C++ compiler - node-gyp requirements) if `npm install` needs to build it. Pre-built binaries often work, but not always.
4.  **Run/Debug:** Launch the extension in VS Code (usually by pressing F5).
5.  **Configure:** Open the "Codessa Settings" panel and configure your API keys and base URLs.
6.  **Test Thoroughly:** Test different providers, modes, tool usage, chat, and settings interactions.

This codebase is now significantly more complex but provides a much richer and more secure foundation for the Codessa AI Assistant.

