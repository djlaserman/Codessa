declare module 'uuid' {
    export function v4(options?: any): string;
    export function v5(name: string, namespace: string | number[]): string;
    export function v3(name: string, namespace: string | number[]): string;
    export function v1(options?: any): string;
    export function validate(uuid: string): boolean;
    export function version(uuid: string): number;
    export const NIL: string;
} 