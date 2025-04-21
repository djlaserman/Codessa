export interface VSCodeAPI {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp: number;
}

export interface Provider {
    id: string;
    name: string;
}

export interface Model {
    id: string;
    name: string;
    provider: string;
}

export interface ChatState {
    isProcessing: boolean;
    messages: ChatMessage[];
    isTTSActive: boolean;
    currentMode: string;
    currentProvider: string;
    currentModel: string;
    availableProviders: Provider[];
    availableModels: Model[];
}