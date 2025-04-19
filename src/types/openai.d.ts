declare module 'openai' {
    export interface ClientOptions {
        apiKey: string;
        baseURL?: string;
        timeout?: number;
        maxRetries?: number;
        defaultQuery?: Record<string, string>;
        defaultHeaders?: Record<string, string>;
    }

    export interface ChatCompletionMessageParam {
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string;
        name?: string;
        tool_call_id?: string;
    }

    export interface ChatCompletionTool {
        type: 'function';
        function: {
            name: string;
            description?: string;
            parameters: Record<string, any>;
        };
    }

    export interface ChatCompletionCreateParams {
        model: string;
        messages: ChatCompletionMessageParam[];
        temperature?: number;
        max_tokens?: number;
        stop?: string | string[];
        tools?: ChatCompletionTool[];
        tool_choice?: 'auto' | 'none' | Record<string, any>;
        signal?: AbortSignal;
        [key: string]: any;
    }

    export interface ToolCall {
        id: string;
        function: {
            name: string;
            arguments: string;
        };
    }

    export interface ChatCompletionMessage {
        role: string;
        content: string | null;
        tool_calls?: ToolCall[];
    }

    export interface ChatCompletionChoice {
        index: number;
        message: ChatCompletionMessage;
        finish_reason: string | null;
    }

    export interface ChatCompletionUsage {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }

    export interface ChatCompletion {
        id: string;
        choices: ChatCompletionChoice[];
        usage?: ChatCompletionUsage;
    }

    export interface OpenAIModel {
        id: string;
        object: string;
        created: number;
        owned_by: string;
    }

    export interface ModelList {
        data: OpenAIModel[];
    }

    export default class OpenAI {
        constructor(options: ClientOptions);
        
        chat: {
            completions: {
                create(params: ChatCompletionCreateParams): Promise<ChatCompletion>;
            };
        };

        models: {
            list(): Promise<ModelList>;
        };
    }
} 