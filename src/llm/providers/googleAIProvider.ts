import { BaseLLMProvider } from './baseLLMProvider';
import { LLMGenerateParams, LLMGenerateResult } from '../llmProvider';
import { getGoogleAIApiKey } from '../../config';
import { logger } from '../../logger';
import * as vscode from 'vscode';
// Gemini AI SDK import removed. Using direct REST API calls instead.

export class GoogleAIProvider extends BaseLLMProvider {
    readonly providerId = 'googleai';
    readonly displayName = 'Google AI';
    readonly description = 'Google Gemini AI models';
    readonly website = 'https://ai.google.dev/';
    readonly requiresApiKey = true;
    readonly supportsEndpointConfiguration = false;
    readonly defaultEndpoint = 'https://generativelanguage.googleapis.com';
    readonly defaultModel = 'gemini-pro';

    private apiKey: string | null = null;

    constructor(context?: vscode.ExtensionContext) {
        super(context);
        this.initializeClient();

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('codessa.providers.googleai')) {
                logger.info("Google AI configuration changed, re-initializing client.");
                this.initializeClient();
            }
        });
    }

    private initializeClient() {
        this.apiKey = getGoogleAIApiKey();
        if (!this.apiKey) {
            logger.warn('Google AI API key not set.');
        } else {
            logger.info('Google AI credentials initialized.');
        }
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async generate(
        _params: LLMGenerateParams,
        _cancellationToken?: vscode.CancellationToken
    ): Promise<LLMGenerateResult> {
        if (!this.isConfigured()) {
            return {
                content: '',
                error: 'Google AI provider not configured (API key missing). Please set the API key in settings.'
            };
        }

        try {
            // Example REST API call to Google Gemini AI
            const fetch = require('node-fetch');
            const response = await fetch(`${this.defaultEndpoint}/v1beta/models/${this.defaultModel}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    contents: Array.isArray((_params as any).contents) ? (_params as any).contents : [],
                    ..._params
                })
            });
            const data = await response.json();
            if (response.ok && data.candidates && data.candidates.length > 0 && data.candidates[0].content && Array.isArray(data.candidates[0].content.parts) && data.candidates[0].content.parts[0]?.text) {
                return {
                    content: data.candidates[0].content.parts[0].text,
                    finishReason: data.candidates[0].finishReason || 'stop',
                    error: undefined
                };
            } else {
                return {
                    content: '',
                    error: data.error && data.error.message ? data.error.message : 'Unknown error from Google Gemini AI'
                };
            }
        } catch (err: any) {
            return {
                content: '',
                error: 'Google Gemini AI API call failed: ' + (err && err.message ? err.message : String(err))
            };
        }
    }

    async getAvailableModels(): Promise<string[]> {
        if (!this.isConfigured()) {
            return [];
        }
        // Return default models
        return [
            'gemini-pro',
            'gemini-pro-vision'
        ];
    }

    async listModels(): Promise<{id: string}[]> {
        if (!this.isConfigured()) {
            return [];
        }
        // Return default models
        const models = [
            'gemini-pro',
            'gemini-pro-vision'
        ];
        logger.info(`Provider googleai has ${models.length} models available`);
        return models.map(id => ({ id }));
    }

    /**
     * Test connection to Google AI
     */
    public async testConnection(modelId: string): Promise<{success: boolean, message: string}> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Google AI not configured. Please check your API key.'
            };
        }

        // Since we don't have a real implementation yet, just check if the model is in our list
        const availableModels = await this.getAvailableModels();
        if (!availableModels.includes(modelId)) {
            return {
                success: false,
                message: `Model '${modelId}' not found in available models.`
            };
        }

        return {
            success: true,
            message: `Google AI provider is configured with model '${modelId}'. Note: This is a placeholder implementation.`
        };
    }

    // Use the parent class implementation for getConfig and updateConfig

    /**
     * Get the configuration fields for this provider
     */
    public getConfigurationFields(): Array<{id: string, name: string, description: string, required: boolean, type: 'string' | 'boolean' | 'number' | 'select', options?: string[]}> {
        return [
            {
                id: 'apiKey',
                name: 'API Key',
                description: 'Your Google AI API key',
                required: true,
                type: 'string'
            },
            {
                id: 'defaultModel',
                name: 'Default Model',
                description: 'The default model to use (e.g., gemini-pro)',
                required: false,
                type: 'string'
            }
        ];
    }
}


