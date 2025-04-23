import * as vscode from 'vscode';

/**
 * Get a configuration value from VS Code settings
 */
export function getConfig<T>(key: string, defaultValue: T): T {
    try {
        const config = vscode.workspace.getConfiguration('codessa');
        return config.get<T>(key, defaultValue);
    } catch (error) {
        console.error(`Error reading configuration key 'codessa.${key}':`, error);
        return defaultValue;
    }
}

/**
 * Set a configuration value in VS Code settings
 */
export async function setConfig<T>(
    key: string,
    value: T,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
): Promise<boolean> {
    try {
        const config = vscode.workspace.getConfiguration('codessa');

        // Try with the specified target first
        try {
            await config.update(key, value, target);
            console.log(`Updated configuration key 'codessa.${key}' at target level ${target}`);
            return true;
        } catch (targetError) {
            console.warn(`Failed to update at target level ${target}: ${targetError}. Trying alternative targets...`);
        }

        // If the specified target fails, try Global
        if (target !== vscode.ConfigurationTarget.Global) {
            try {
                await config.update(key, value, vscode.ConfigurationTarget.Global);
                console.log(`Updated configuration key 'codessa.${key}' at Global level`);
                return true;
            } catch (globalError) {
                console.warn(`Failed to update at Global level: ${globalError}. Trying Workspace level...`);
            }
        }

        // If Global fails, try Workspace if available
        if (target !== vscode.ConfigurationTarget.Workspace &&
            vscode.workspace.workspaceFolders &&
            vscode.workspace.workspaceFolders.length > 0) {
            try {
                await config.update(key, value, vscode.ConfigurationTarget.Workspace);
                console.log(`Updated configuration key 'codessa.${key}' at Workspace level`);
                return true;
            } catch (workspaceError) {
                console.warn(`Failed to update at Workspace level: ${workspaceError}`);
            }
        }

        // If we get here, all attempts failed
        throw new Error(`Failed to update setting 'codessa.${key}' at any target level`);
    } catch (error) {
        console.error(`Error writing configuration key 'codessa.${key}':`, error);
        return false;
    }
}

// Core settings
export function getLogLevel(): string {
    return getConfig<string>('logLevel', 'info');
}

export function getMaxToolIterations(): number {
    return getConfig<number>('maxToolIterations', 5);
}

export function getDefaultModelConfig(): LLMConfig {
    const defaultConfig: LLMConfig = {
        provider: 'ollama',
        modelId: 'llama2',
        options: {
            temperature: 0.7,
            maxTokens: 2000
        }
    };
    return getConfig<LLMConfig>('defaultModel', defaultConfig);
}

// Memory settings
export function getMemoryEnabled(): boolean {
    return getConfig<boolean>('memory.enabled', true);
}

export function getMaxMemories(): number {
    return getConfig<number>('memory.maxMemories', 1000);
}

export function getMemoryRelevanceThreshold(): number {
    return getConfig<number>('memory.relevanceThreshold', 0.7);
}

export function getMemoryContextWindowSize(): number {
    return getConfig<number>('memory.contextWindowSize', 5);
}

export function getConversationHistorySize(): number {
    return getConfig<number>('memory.conversationHistorySize', 100);
}

// Provider configurations
export function getOpenAIApiKey(): string {
    return getConfig<string>('providers.openai.apiKey', '');
}

export function getOpenAIBaseUrl(): string {
    const defaultUrl = 'https://api.openai.com/v1';
    return getConfig<string>('providers.openai.baseUrl', defaultUrl);
}

export function getOpenAIOrganization(): string {
    return getConfig<string>('providers.openai.organization', '');
}

export function getGoogleAIApiKey(): string {
    return getConfig<string>('providers.googleai.apiKey', '');
}

export function getMistralAIApiKey(): string {
    return getConfig<string>('providers.mistralai.apiKey', '');
}

export function getAnthropicApiKey(): string {
    return getConfig<string>('providers.anthropic.apiKey', '');
}

export function getOllamaBaseUrl(): string {
    return getConfig<string>('providers.ollama.baseUrl', 'http://localhost:11434');
}

export function getLMStudioBaseUrl(): string {
    return getConfig<string>('providers.lmstudio.baseUrl', 'http://localhost:1234/v1');
}

// Agent configuration
export function getAgents(): AgentConfig[] {
    return getConfig<AgentConfig[]>('agents', []);
}

export async function saveAgents(agents: AgentConfig[]): Promise<boolean> {
    return await setConfig('agents', agents);
}

// Prompt configuration
export function getSystemPrompts(): Record<string, string> {
    return getConfig<Record<string, string>>('systemPrompts', {});
}

export function getPromptVariables(): Record<string, string> {
    return getConfig<Record<string, string>>('promptVariables', {});
}

// Interface definitions
export interface LLMConfig {
    provider: string;
    modelId: string;
    options?: {
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
        stopSequences?: string[];
        [key: string]: any;
    };
}

export interface AgentConfig {
    id: string;
    name: string;
    description?: string;
    systemPromptName: string;
    llm?: LLMConfig;
    tools?: string[];
    isSupervisor?: boolean;
    chainedAgentIds?: string[];
}

