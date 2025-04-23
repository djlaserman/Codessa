// Shared types/interfaces for settings panel

export interface Settings {
    logLevel: string;
    provider: string;
    openaiApiKey: string;
    openaiBaseUrl: string;
    googleAIApiKey: string;
    mistralAIApiKey: string;
    anthropicApiKey: string;
    memoryEnabled: boolean;
    maxMemories: number;
    relevanceThreshold: number;
    contextWindowSize: number;
    conversationHistorySize: number;
    vectorstore: string;
    showTimestamps: boolean;
    customEndpoint: string;
    theme: string;
    fontSize: number;
    chatLayout: string;
    agents: any[];
    workflows: any[];
    prompts: any[];
    tts: any;
    voice: any;
    database: any;
    workspace?: Workspace;
    workspaces?: Workspace[];
    activeWorkspace?: string;
    knowledgebase: any;
    providers?: any[];
    models?: any[];
}

export type WorkspaceFile = {
    path: string;
    name?: string;
    type?: string;
    tags?: string[];
    metadata?: Record<string, any>;
};

export type WorkspaceTeamMember = {
    id: string;
    name: string;
    email?: string;
    role?: string;
};

import type { KnowledgebaseSource } from './sections/knowledgebaseSection';

export type WorkspaceKnowledgebaseConfig = {
    sources: KnowledgebaseSource[];
    shared: boolean;
};

export type WorkspaceDocumentationItem = {
    type: 'file' | 'link' | 'note';
    value: string;
    label?: string;
};

export type Workspace = {
    id: string;
    name: string;
    path: string;
    description?: string;
    tags?: string[];
    files?: WorkspaceFile[];
    team?: WorkspaceTeamMember[];
    memory?: string;
    documentation?: WorkspaceDocumentationItem[];
    knowledgebase?: WorkspaceKnowledgebaseConfig;
};

// Add other shared types as needed
