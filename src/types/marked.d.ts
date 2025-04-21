declare module 'marked' {
    export interface MarkedOptions {
        baseUrl?: string;
        breaks?: boolean;
        gfm?: boolean;
        headerIds?: boolean;
        headerPrefix?: string;
        highlight?: (code: string, lang: string) => string;
        langPrefix?: string;
        mangle?: boolean;
        pedantic?: boolean;
        sanitize?: boolean;
        silent?: boolean;
        smartLists?: boolean;
        smartypants?: boolean;
        xhtml?: boolean;
    }

    export function marked(src: string, options?: MarkedOptions): string;
    export function setOptions(options: MarkedOptions): void;
}