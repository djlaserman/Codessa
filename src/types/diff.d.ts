declare module 'diff' {
    export interface Hunk {
        oldStart: number;
        oldLines: number;
        newStart: number;
        newLines: number;
        lines: string[];
    }

    export interface ParsedDiff {
        hunks: Hunk[];
        oldFileName: string;
        newFileName: string;
        oldHeader: string;
        newHeader: string;
    }

    export interface ApplyPatchOptions {
        fuzzFactor?: number;
    }

    export interface CreatePatchOptions {
        context?: number;
    }

    export function createPatch(
        oldFileName: string,
        newFileName: string,
        oldStr: string,
        newStr: string,
        oldHeader?: string,
        newHeader?: string,
        options?: CreatePatchOptions
    ): string;

    export function applyPatch(
        source: string,
        patch: string | ParsedDiff[],
        options?: ApplyPatchOptions
    ): string | false;

    export function parsePatch(
        patch: string
    ): ParsedDiff[];
} 