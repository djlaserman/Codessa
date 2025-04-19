declare module 'axios' {
    export interface AxiosRequestConfig {
        url?: string;
        method?: 'get' | 'GET' | 'delete' | 'DELETE' | 'head' | 'HEAD' | 'options' | 'OPTIONS' | 'post' | 'POST' | 'put' | 'PUT' | 'patch' | 'PATCH';
        baseURL?: string;
        headers?: Record<string, string>;
        data?: any;
        timeout?: number;
        cancelToken?: CancelToken;
        signal?: AbortSignal;
        [key: string]: any;
    }

    export interface AxiosResponse<T = any> {
        data: T;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        config: AxiosRequestConfig;
        request?: any;
    }

    export interface AxiosError<T = any> extends Error {
        config: AxiosRequestConfig;
        code?: string;
        request?: any;
        response?: AxiosResponse<T>;
        isAxiosError: boolean;
    }

    export interface CancelToken {
        promise: Promise<any>;
        reason?: any;
        throwIfRequested(): void;
    }

    export interface CancelTokenSource {
        token: CancelToken;
        cancel(message?: string): void;
    }

    export interface AxiosInstance {
        (config: AxiosRequestConfig): Promise<AxiosResponse>;
        (url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
        defaults: AxiosRequestConfig;
        interceptors: {
            request: any;
            response: any;
        };
        get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
        delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
        head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
        options<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
        post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
        put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
        patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    }

    export function create(config?: AxiosRequestConfig): AxiosInstance;
    export function isCancel(value: any): boolean;
    
    export namespace CancelToken {
        function source(): CancelTokenSource;
    }
    
    export default function axios(config: AxiosRequestConfig): Promise<AxiosResponse>;
} 