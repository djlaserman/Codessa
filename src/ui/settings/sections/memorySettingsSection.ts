// Memory Management section logic and rendering

declare function acquireVsCodeApi(): { postMessage: (msg: any) => void };

export type MemorySettings = {
    provider: string;
    maxMemories: number;
    relevanceThreshold: number;
    contextWindowSize: number;
    conversationHistorySize: number;
    vectorstore: string;
};

let memorySettings: MemorySettings = {
    provider: '',
    maxMemories: 1000,
    relevanceThreshold: 0.7,
    contextWindowSize: 5,
    conversationHistorySize: 100,
    vectorstore: 'chroma'
};

export function renderMemorySettingsSection(container: HTMLElement, settings: any) {
    // Sync from settings
    memorySettings = {
        provider: settings.provider || '',
        maxMemories: typeof settings.maxMemories === 'number' ? settings.maxMemories : 1000,
        relevanceThreshold: typeof settings.relevanceThreshold === 'number' ? settings.relevanceThreshold : 0.7,
        contextWindowSize: typeof settings.contextWindowSize === 'number' ? settings.contextWindowSize : 5,
        conversationHistorySize: typeof settings.conversationHistorySize === 'number' ? settings.conversationHistorySize : 100,
        vectorstore: settings.vectorstore || 'chroma',
    };
    container.innerHTML = `
        <label>Provider
            <input id="memoryProvider" placeholder="e.g. local, chroma, pinecone" />
        </label>
        <label>Max Memories
            <input id="maxMemories" type="number" min="1" />
        </label>
        <label>Relevance Threshold
            <input id="relevanceThreshold" type="number" min="0" max="1" step="0.01" />
        </label>
        <label>Context Window Size
            <input id="contextWindowSize" type="number" min="1" />
        </label>
        <label>Conversation History Size
            <input id="conversationHistorySize" type="number" min="1" />
        </label>
        <label>Vectorstore
            <input id="vectorstore" placeholder="e.g. chroma, pinecone, qdrant" />
        </label>
        <button id="clearAllMemoriesBtn" type="button">Clear All Memories</button>
    `;
    // Populate fields from memorySettings
    (container.querySelector('#memoryProvider') as HTMLInputElement).value = memorySettings.provider;
    (container.querySelector('#maxMemories') as HTMLInputElement).value = String(memorySettings.maxMemories);
    (container.querySelector('#relevanceThreshold') as HTMLInputElement).value = String(memorySettings.relevanceThreshold);
    (container.querySelector('#contextWindowSize') as HTMLInputElement).value = String(memorySettings.contextWindowSize);
    (container.querySelector('#conversationHistorySize') as HTMLInputElement).value = String(memorySettings.conversationHistorySize);
    (container.querySelector('#vectorstore') as HTMLInputElement).value = memorySettings.vectorstore;
    // Add change listeners
    [
        'memoryProvider',
        'maxMemories',
        'relevanceThreshold',
        'contextWindowSize',
        'conversationHistorySize',
        'vectorstore'
    ].forEach((id) => {
        const el = container.querySelector(`#${id}`);
        if (el) el.addEventListener('input', () => updateMemorySettingsFromUI(settings));
    });
    // Clear all memories button
    const clearBtn = container.querySelector('#clearAllMemoriesBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (confirm('Clear all memories? This cannot be undone.')) {
            if (typeof acquireVsCodeApi === 'function') {
                acquireVsCodeApi().postMessage({ command: 'clearAllMemories' });
            }
        }
    });
}

function updateMemorySettingsFromUI(settings: any) {
    const providerInput = document.getElementById('memoryProvider') as HTMLInputElement | null;
    const maxMemoriesInput = document.getElementById('maxMemories') as HTMLInputElement | null;
    const relevanceThresholdInput = document.getElementById('relevanceThreshold') as HTMLInputElement | null;
    const contextWindowSizeInput = document.getElementById('contextWindowSize') as HTMLInputElement | null;
    const conversationHistorySizeInput = document.getElementById('conversationHistorySize') as HTMLInputElement | null;
    const vectorstoreInput = document.getElementById('vectorstore') as HTMLInputElement | null;
    memorySettings = {
        provider: providerInput?.value || '',
        maxMemories: parseInt(maxMemoriesInput?.value || '1000', 10),
        relevanceThreshold: parseFloat(relevanceThresholdInput?.value || '0.7'),
        contextWindowSize: parseInt(contextWindowSizeInput?.value || '5', 10),
        conversationHistorySize: parseInt(conversationHistorySizeInput?.value || '100', 10),
        vectorstore: vectorstoreInput?.value || 'chroma'
    };
    // Sync back to main settings object
    settings.maxMemories = memorySettings.maxMemories;
    settings.relevanceThreshold = memorySettings.relevanceThreshold;
    settings.contextWindowSize = memorySettings.contextWindowSize;
    settings.conversationHistorySize = memorySettings.conversationHistorySize;
    settings.vectorstore = memorySettings.vectorstore;
    settings.provider = memorySettings.provider;
}

