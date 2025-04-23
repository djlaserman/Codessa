declare module 'langgraph' {
    export interface StateGraphArgs {
        channels?: Record<string, any>;
        [key: string]: any;
    }

    export class StateGraph {
        constructor(args?: StateGraphArgs);
        addNode(name: string, handler: (state: any, config?: any) => Promise<any>): void;
        addEdge(from: string, to: string): void;
        addConditionalEdges(from: string, condition: (state: any) => string): void;
        compile(): CompiledGraph;
    }

    export interface CompiledGraph {
        invoke(input: any): Promise<any>;
    }
}
