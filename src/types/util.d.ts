declare module 'util' {
    export class TextEncoder {
        constructor(encoding?: string);
        readonly encoding: string;
        encode(input?: string): Uint8Array;
    }

    export class TextDecoder {
        constructor(encoding?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
        readonly encoding: string;
        readonly fatal: boolean;
        readonly ignoreBOM: boolean;
        decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
    }
} 