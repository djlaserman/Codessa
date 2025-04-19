import * as vscode from 'vscode';
import { logger } from './logger';

export function getConfig<T>(key: string, defaultValue: T): T {
    try {
        const config = vscode.workspace.getConfiguration('codessa');
        return config.get<T>(key, defaultValue);
    } catch (error) {
        logger.error(`Error reading configuration key 'codessa.${key}':`, error);
        return defaultValue;
    }
}

export async function setConfig<T>(key: string, value: T, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global): Promise<void> {
    try {
        const config = vscode.workspace.getConfiguration('codessa');
        await config.update(key, value, target);
    } catch (error) {
        logger.error(`Error writing configuration key 'codessa.${key}':`, error);
        vscode.window.showErrorMessage(`Failed to update setting 'codessa.${key}'. Check logs for details.`);
    }
}

// Specific configuration getters
export function getLogLevel(): string {
    return getConfig<string>('logLevel', 'info');
}

export function getMaxToolIterations(): number {
    return getConfig<number>('maxToolIterations', 5);
}

export function getDefaultModelConfig(): LLMConfig {
    return getConfig<LLMConfig>('defaultModel', { provider: 'ollama', modelId: 'llama3' });
}

// Provider specific getters
export function getOpenAIApiKey(): string {
    return getConfig<string>('providers.openai.apiKey', '');
}

export function getOpenAIBaseUrl(): string {
    return getConfig<string>('providers.openai.baseUrl', '');
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

export async function saveAgents(agents: AgentConfig[]): Promise<void> {
    await setConfig('agents', agents);
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
    options?: Record<string, any>;
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

