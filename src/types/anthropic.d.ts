declare module '@anthropic-ai/sdk' {
    export default class Anthropic {
        constructor(options: { apiKey: string });
        
        messages: {
            create(params: MessageCreateParamsNonStreaming): Promise<MessageResponse>;
        };
    }

    export interface MessageCreateParamsNonStreaming {
        model: string;
        messages: MessageParam[];
        max_tokens: number;
        temperature?: number;
        system?: string;
        tools?: Tool[];
    }

    export interface MessageParam {
        role: 'user' | 'assistant';
        content: string;
    }

    export interface MessageResponse {
        id: string;
        type: string;
        role: string;
        content: ContentBlock[];
        model: string;
        stop_reason: string;
        usage: {
            input_tokens: number;
            output_tokens: number;
        };
    }

    export interface ContentBlock {
        type: string;
        text?: string;
        name?: string;
        input?: string;
    }

    export interface Tool {
        function: {
            name: string;
            description: string;
            parameters: any;
        };
    }
}
