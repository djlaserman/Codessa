declare module 'pg' {
    export class Pool {
        constructor(config?: any);
        connect(): Promise<PoolClient>;
        query(text: string, params?: any[]): Promise<QueryResult>;
        end(): Promise<void>;
    }

    export class PoolClient {
        query(text: string, params?: any[]): Promise<QueryResult>;
        release(): void;
    }

    export interface QueryResult {
        rows: any[];
        rowCount: number;
    }
}
