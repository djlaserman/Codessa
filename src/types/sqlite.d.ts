declare module 'sqlite' {
    export function open(options: { filename: string, driver?: any }): Promise<Database>;

    export class Database {
        exec(sql: string, params?: any[]): Promise<any>;
        run(sql: string, params?: any[]): Promise<any>;
        get(sql: string, params?: any[]): Promise<any>;
        all(sql: string, params?: any[]): Promise<any[]>;
        close(): Promise<void>;
    }
}
