declare module 'redis' {
    export interface RedisSetAddOptions {
        NX?: boolean;
        XX?: boolean;
        CH?: boolean;
        INCR?: boolean;
    }

    export interface RedisZAddMember {
        score: number;
        value: string;
    }

    export interface RedisClientType {
        connect(): Promise<void>;
        disconnect(): Promise<void>;
        set(key: string, value: string): Promise<'OK'>;
        get(key: string): Promise<string | null>;
        del(key: string): Promise<number>;
        exists(key: string): Promise<number>;
        keys(pattern: string): Promise<string[]>;

        // Hash commands
        hSet(key: string, field: string, value: string): Promise<number>;
        hGet(key: string, field: string): Promise<string | null>;
        hGetAll(key: string): Promise<Record<string, string>>;
        hDel(key: string, field: string): Promise<number>;

        // Set commands
        sAdd(key: string, member: string): Promise<number>;
        sRem(key: string, member: string): Promise<number>;
        sMembers(key: string): Promise<string[]>;

        // Sorted set commands
        zAdd(key: string, member: RedisZAddMember): Promise<number>;
        zRem(key: string, member: string): Promise<number>;
        zRange(key: string, min: string | number, max: string | number, opts?: { BY?: 'SCORE' }): Promise<string[]>;
    }

    export function createClient(options?: any): RedisClientType;
}
