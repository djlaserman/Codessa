// @ts-check

(function () {
    // Get VS Code API
    const vscode = acquireVsCodeApi();

    // State
    let memories = [];
    let selectedMemoryId = null;
    let memorySettings = null;

    // DOM Elements
    const memoriesList = document.getElementById('memoriesList');
    const memoryDetail = document.getElementById('memoryDetail');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const chunkFileBtn = document.getElementById('chunkFileBtn');
    const chunkWorkspaceBtn = document.getElementById('chunkWorkspaceBtn');
    const clearBtn = document.getElementById('clearBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const closeModalBtn = document.querySelector('.close');

    // Initialize
    init();

    /**
     * Initialize the webview
     */
    function init() {
        // Load memories
        loadMemories();

        // Load settings
        loadMemorySettings();

        // Add event listeners
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });

        refreshBtn.addEventListener('click', loadMemories);
        settingsBtn.addEventListener('click', openSettingsModal);
        chunkFileBtn.addEventListener('click', handleChunkFile);
        chunkWorkspaceBtn.addEventListener('click', handleChunkWorkspace);
        clearBtn.addEventListener('click', handleClearMemories);

        saveSettingsBtn.addEventListener('click', handleSaveSettings);
        cancelSettingsBtn.addEventListener('click', closeSettingsModal);
        closeModalBtn.addEventListener('click', closeSettingsModal);

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                closeSettingsModal();
            }
        });

        // Handle messages from extension
        window.addEventListener('message', (event) => {
            const message = event.data;

            switch (message.command) {
                case 'memories':
                    memories = message.memories;
                    renderMemoriesList();
                    break;
                case 'searchResults':
                    memories = message.memories;
                    renderMemoriesList();
                    break;
                case 'memoryDeleted':
                    if (message.success) {
                        if (selectedMemoryId === message.id) {
                            selectedMemoryId = null;
                            renderMemoryDetail();
                        }
                    }
                    break;
                case 'memoriesCleared':
                    memories = [];
                    selectedMemoryId = null;
                    renderMemoriesList();
                    renderMemoryDetail();
                    break;
                case 'memorySettings':
                    memorySettings = message.settings;
                    renderSettingsForm();
                    break;
                case 'memorySettingsUpdated':
                    // Remove saving indicator
                    const saveStatus = document.getElementById('save-status');
                    if (saveStatus) {
                        saveStatus.remove();
                    }

                    if (message.success) {
                        showNotification('Memory settings updated successfully');
                        closeSettingsModal();
                    } else {
                        showError('Failed to update memory settings');
                    }
                    break;
                case 'fileChunked':
                    vscode.postMessage({
                        command: 'getMemories'
                    });
                    showNotification(`File chunked: ${message.filePath} (${message.count} chunks)`);
                    break;
                case 'workspaceChunked':
                    vscode.postMessage({
                        command: 'getMemories'
                    });
                    showNotification(`Workspace chunked: ${message.folderPath} (${message.count} chunks)`);
                    break;
                case 'error':
                    showError(message.message);
                    break;
            }
        });
    }

    /**
     * Load memories from extension
     */
    function loadMemories() {
        vscode.postMessage({
            command: 'getMemories'
        });
    }

    /**
     * Load memory settings from extension
     */
    function loadMemorySettings() {
        vscode.postMessage({
            command: 'getMemorySettings'
        });
    }

    /**
     * Handle search
     */
    function handleSearch() {
        const query = searchInput.value.trim();

        if (!query) {
            loadMemories();
            return;
        }

        vscode.postMessage({
            command: 'searchMemories',
            query,
            options: {
                limit: 50
            }
        });
    }

    /**
     * Handle chunk file
     */
    function handleChunkFile() {
        vscode.postMessage({
            command: 'chunkFile'
        });
    }

    /**
     * Handle chunk workspace
     */
    function handleChunkWorkspace() {
        vscode.postMessage({
            command: 'chunkWorkspace'
        });
    }

    /**
     * Handle clear memories
     */
    function handleClearMemories() {
        if (confirm('Are you sure you want to clear all memories? This cannot be undone.')) {
            vscode.postMessage({
                command: 'clearMemories'
            });
        }
    }

    /**
     * Open settings modal
     */
    function openSettingsModal() {
        renderSettingsForm();
        settingsModal.style.display = 'block';
    }

    /**
     * Close settings modal
     */
    function closeSettingsModal() {
        settingsModal.style.display = 'none';
    }

    /**
     * Handle save settings
     */
    function handleSaveSettings() {
        try {
            // Get form values
            const enabled = document.getElementById('memoryEnabled').checked;
            const system = document.getElementById('memorySystem').value;
            const maxMemories = parseInt(document.getElementById('maxMemories').value);
            const relevanceThreshold = parseFloat(document.getElementById('relevanceThreshold').value);
            const contextWindowSize = parseInt(document.getElementById('contextWindowSize').value);
            const conversationHistorySize = parseInt(document.getElementById('conversationHistorySize').value);
            const vectorStore = document.getElementById('vectorStore').value;
            const database = document.getElementById('database').value;

            // Vector store settings
            const chromaDirectory = document.getElementById('chromaDirectory').value;
            const chromaCollectionName = document.getElementById('chromaCollectionName').value;
            const pineconeApiKey = document.getElementById('pineconeApiKey').value;
            const pineconeEnvironment = document.getElementById('pineconeEnvironment').value;
            const pineconeIndexName = document.getElementById('pineconeIndexName').value;

            // Database settings
            const sqliteFilename = document.getElementById('sqliteFilename').value;

            // MySQL settings
            const mysqlHost = document.getElementById('mysqlHost').value;
            const mysqlPort = parseInt(document.getElementById('mysqlPort').value);
            const mysqlUser = document.getElementById('mysqlUser').value;
            const mysqlPassword = document.getElementById('mysqlPassword').value;
            const mysqlDatabase = document.getElementById('mysqlDatabase').value;
            const mysqlTable = document.getElementById('mysqlTable').value;

            const postgresConnectionString = document.getElementById('postgresConnectionString').value;
            const postgresSchema = document.getElementById('postgresSchema').value;
            const mongodbConnectionString = document.getElementById('mongodbConnectionString').value;
            const mongodbDatabase = document.getElementById('mongodbDatabase').value;
            const mongodbCollection = document.getElementById('mongodbCollection').value;
            const redisUrl = document.getElementById('redisUrl').value;
            const redisKeyPrefix = document.getElementById('redisKeyPrefix').value;

            // File chunking settings
            const chunkSize = parseInt(document.getElementById('chunkSize').value);
            const chunkOverlap = parseInt(document.getElementById('chunkOverlap').value);
            const maxChunksPerFile = parseInt(document.getElementById('maxChunksPerFile').value);

            // Create settings object
            const settings = {
                enabled,
                system,
                maxMemories,
                relevanceThreshold,
                contextWindowSize,
                conversationHistorySize,
                vectorStore,
                vectorStoreSettings: {
                    chroma: {
                        directory: chromaDirectory,
                        collectionName: chromaCollectionName
                    },
                    pinecone: {
                        apiKey: pineconeApiKey,
                        environment: pineconeEnvironment,
                        indexName: pineconeIndexName
                    }
                },
                database,
                databaseSettings: {
                    sqlite: {
                        filename: sqliteFilename
                    },
                    mysql: {
                        host: mysqlHost,
                        port: mysqlPort,
                        user: mysqlUser,
                        password: mysqlPassword,
                        database: mysqlDatabase,
                        table: mysqlTable
                    },
                    postgres: {
                        connectionString: postgresConnectionString,
                        schema: postgresSchema
                    },
                    mongodb: {
                        connectionString: mongodbConnectionString,
                        database: mongodbDatabase,
                        collection: mongodbCollection
                    },
                    redis: {
                        url: redisUrl,
                        keyPrefix: redisKeyPrefix
                    }
                },
                fileChunking: {
                    chunkSize,
                    chunkOverlap,
                    maxChunksPerFile
                }
            };

            // Show saving indicator
            const saveStatus = document.createElement('span');
            saveStatus.id = 'save-status';
            saveStatus.textContent = 'Saving settings...';
            saveStatus.className = 'status-saving';
            saveSettingsBtn.parentNode.appendChild(saveStatus);

            // Save settings
            vscode.postMessage({
                command: 'updateMemorySettings',
                settings
            });
        } catch (error) {
            console.error('Error saving memory settings:', error);
            showError(`Error saving memory settings: ${error.message}`);
        }
    }

    /**
     * Render memories list
     */
    function renderMemoriesList() {
        if (!memoriesList) return;

        memoriesList.innerHTML = '';

        if (memories.length === 0) {
            memoriesList.innerHTML = '<div class="empty-state">No memories found</div>';
            return;
        }

        // Sort memories by timestamp (newest first)
        memories.sort((a, b) => b.timestamp - a.timestamp);

        for (const memory of memories) {
            const memoryItem = document.createElement('div');
            memoryItem.className = 'memory-item';
            if (memory.id === selectedMemoryId) {
                memoryItem.classList.add('selected');
            }

            // Format timestamp
            const date = new Date(memory.timestamp);
            const formattedDate = date.toLocaleString();

            // Get memory type and source
            const type = memory.metadata.type || 'unknown';
            const source = memory.metadata.source || 'unknown';

            // Create content preview
            const contentPreview = memory.content.length > 100
                ? memory.content.substring(0, 100) + '...'
                : memory.content;

            memoryItem.innerHTML = `
                <div class="memory-header">
                    <div class="memory-type ${type}">${type}</div>
                    <div class="memory-source">${source}</div>
                    <div class="memory-date">${formattedDate}</div>
                </div>
                <div class="memory-preview">${escapeHtml(contentPreview)}</div>
            `;

            memoryItem.addEventListener('click', () => {
                selectedMemoryId = memory.id;
                renderMemoriesList();
                renderMemoryDetail();
            });

            memoriesList.appendChild(memoryItem);
        }
    }

    /**
     * Render memory detail
     */
    function renderMemoryDetail() {
        if (!memoryDetail) return;

        if (!selectedMemoryId) {
            memoryDetail.innerHTML = '<div class="empty-state">Select a memory to view details</div>';
            return;
        }

        const memory = memories.find(m => m.id === selectedMemoryId);

        if (!memory) {
            memoryDetail.innerHTML = '<div class="empty-state">Memory not found</div>';
            return;
        }

        // Format timestamp
        const date = new Date(memory.timestamp);
        const formattedDate = date.toLocaleString();

        // Format content
        const formattedContent = formatContent(memory.content, memory.metadata.type);

        // Format metadata
        const metadataHtml = Object.entries(memory.metadata)
            .map(([key, value]) => {
                if (key === 'tags' && Array.isArray(value)) {
                    return `
                        <div class="metadata-item">
                            <div class="metadata-key">${key}:</div>
                            <div class="metadata-value tags">
                                ${value.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="metadata-item">
                        <div class="metadata-key">${key}:</div>
                        <div class="metadata-value">${formatMetadataValue(value)}</div>
                    </div>
                `;
            })
            .join('');

        memoryDetail.innerHTML = `
            <div class="memory-detail-header">
                <div class="memory-detail-id">${memory.id}</div>
                <div class="memory-detail-date">${formattedDate}</div>
                <button class="delete-btn" title="Delete Memory"><i class="codicon codicon-trash"></i></button>
            </div>
            <div class="memory-detail-content">${formattedContent}</div>
            <div class="memory-detail-metadata">
                <h3>Metadata</h3>
                <div class="metadata-list">
                    ${metadataHtml}
                </div>
            </div>
        `;

        // Add event listener to delete button
        const deleteBtn = memoryDetail.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this memory? This cannot be undone.')) {
                    vscode.postMessage({
                        command: 'deleteMemory',
                        id: selectedMemoryId
                    });
                }
            });
        }
    }

    /**
     * Render settings form
     */
    function renderSettingsForm() {
        if (!settingsForm || !memorySettings) return;

        settingsForm.innerHTML = `
            <div class="form-group">
                <label for="memoryEnabled">
                    <input type="checkbox" id="memoryEnabled" ${memorySettings.enabled ? 'checked' : ''} />
                    Enable Memory System
                </label>
            </div>

            <div class="form-group">
                <label for="memorySystem">Memory System</label>
                <select id="memorySystem">
                    <option value="basic" ${memorySettings.system === 'basic' ? 'selected' : ''}>Basic</option>
                    <option value="langchain" ${memorySettings.system === 'langchain' ? 'selected' : ''}>LangChain/LangGraph</option>
                </select>
            </div>

            <div class="form-group">
                <label for="maxMemories">Maximum Memories</label>
                <input type="number" id="maxMemories" value="${memorySettings.maxMemories}" min="10" max="10000" />
            </div>

            <div class="form-group">
                <label for="relevanceThreshold">Relevance Threshold</label>
                <input type="number" id="relevanceThreshold" value="${memorySettings.relevanceThreshold}" min="0" max="1" step="0.1" />
            </div>

            <div class="form-group">
                <label for="contextWindowSize">Context Window Size</label>
                <input type="number" id="contextWindowSize" value="${memorySettings.contextWindowSize}" min="1" max="50" />
            </div>

            <div class="form-group">
                <label for="conversationHistorySize">Conversation History Size</label>
                <input type="number" id="conversationHistorySize" value="${memorySettings.conversationHistorySize}" min="5" max="1000" />
            </div>

            <h3>Vector Store</h3>

            <div class="form-group">
                <label for="vectorStore">Vector Store</label>
                <select id="vectorStore">
                    <option value="memory" ${memorySettings.vectorStore === 'memory' ? 'selected' : ''}>In-Memory</option>
                    <option value="chroma" ${memorySettings.vectorStore === 'chroma' ? 'selected' : ''}>Chroma</option>
                    <option value="pinecone" ${memorySettings.vectorStore === 'pinecone' ? 'selected' : ''}>Pinecone</option>
                    <option value="weaviate" ${memorySettings.vectorStore === 'weaviate' ? 'selected' : ''}>Weaviate</option>
                    <option value="hnswlib" ${memorySettings.vectorStore === 'hnswlib' ? 'selected' : ''}>HNSWLIB</option>
                </select>
            </div>

            <div id="chromaSettings" class="nested-settings ${memorySettings.vectorStore === 'chroma' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="chromaDirectory">Directory</label>
                    <input type="text" id="chromaDirectory" value="${memorySettings.vectorStoreSettings.chroma.directory}" />
                </div>

                <div class="form-group">
                    <label for="chromaCollectionName">Collection Name</label>
                    <input type="text" id="chromaCollectionName" value="${memorySettings.vectorStoreSettings.chroma.collectionName}" />
                </div>
            </div>

            <div id="pineconeSettings" class="nested-settings ${memorySettings.vectorStore === 'pinecone' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="pineconeApiKey">API Key</label>
                    <input type="password" id="pineconeApiKey" value="${memorySettings.vectorStoreSettings.pinecone.apiKey}" />
                </div>

                <div class="form-group">
                    <label for="pineconeEnvironment">Environment</label>
                    <input type="text" id="pineconeEnvironment" value="${memorySettings.vectorStoreSettings.pinecone.environment}" />
                </div>

                <div class="form-group">
                    <label for="pineconeIndexName">Index Name</label>
                    <input type="text" id="pineconeIndexName" value="${memorySettings.vectorStoreSettings.pinecone.indexName}" />
                </div>
            </div>

            <h3>Database</h3>

            <div class="form-group">
                <label for="database">Database</label>
                <select id="database">
                    <option value="sqlite" ${memorySettings.database === 'sqlite' ? 'selected' : ''}>SQLite</option>
                    <option value="mysql" ${memorySettings.database === 'mysql' ? 'selected' : ''}>MySQL</option>
                    <option value="postgres" ${memorySettings.database === 'postgres' ? 'selected' : ''}>PostgreSQL</option>
                    <option value="mongodb" ${memorySettings.database === 'mongodb' ? 'selected' : ''}>MongoDB</option>
                    <option value="redis" ${memorySettings.database === 'redis' ? 'selected' : ''}>Redis</option>
                </select>
            </div>

            <div id="sqliteSettings" class="nested-settings ${memorySettings.database === 'sqlite' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="sqliteFilename">Filename</label>
                    <input type="text" id="sqliteFilename" value="${memorySettings.databaseSettings.sqlite.filename}" />
                </div>
            </div>

            <div id="mysqlSettings" class="nested-settings ${memorySettings.database === 'mysql' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="mysqlHost">Host</label>
                    <input type="text" id="mysqlHost" value="${memorySettings.databaseSettings.mysql?.host || 'localhost'}" />
                </div>

                <div class="form-group">
                    <label for="mysqlPort">Port</label>
                    <input type="number" id="mysqlPort" value="${memorySettings.databaseSettings.mysql?.port || 3306}" min="1" max="65535" />
                </div>

                <div class="form-group">
                    <label for="mysqlUser">User</label>
                    <input type="text" id="mysqlUser" value="${memorySettings.databaseSettings.mysql?.user || 'root'}" />
                </div>

                <div class="form-group">
                    <label for="mysqlPassword">Password</label>
                    <input type="password" id="mysqlPassword" value="${memorySettings.databaseSettings.mysql?.password || ''}" />
                </div>

                <div class="form-group">
                    <label for="mysqlDatabase">Database</label>
                    <input type="text" id="mysqlDatabase" value="${memorySettings.databaseSettings.mysql?.database || 'codessa'}" />
                </div>

                <div class="form-group">
                    <label for="mysqlTable">Table</label>
                    <input type="text" id="mysqlTable" value="${memorySettings.databaseSettings.mysql?.table || 'memories'}" />
                </div>
            </div>

            <div id="postgresSettings" class="nested-settings ${memorySettings.database === 'postgres' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="postgresConnectionString">Connection String</label>
                    <input type="password" id="postgresConnectionString" value="${memorySettings.databaseSettings.postgres.connectionString}" />
                </div>

                <div class="form-group">
                    <label for="postgresSchema">Schema</label>
                    <input type="text" id="postgresSchema" value="${memorySettings.databaseSettings.postgres.schema}" />
                </div>
            </div>

            <div id="mongodbSettings" class="nested-settings ${memorySettings.database === 'mongodb' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="mongodbConnectionString">Connection String</label>
                    <input type="password" id="mongodbConnectionString" value="${memorySettings.databaseSettings.mongodb.connectionString}" />
                </div>

                <div class="form-group">
                    <label for="mongodbDatabase">Database</label>
                    <input type="text" id="mongodbDatabase" value="${memorySettings.databaseSettings.mongodb.database}" />
                </div>

                <div class="form-group">
                    <label for="mongodbCollection">Collection</label>
                    <input type="text" id="mongodbCollection" value="${memorySettings.databaseSettings.mongodb.collection}" />
                </div>
            </div>

            <div id="redisSettings" class="nested-settings ${memorySettings.database === 'redis' ? '' : 'hidden'}">
                <div class="form-group">
                    <label for="redisUrl">URL</label>
                    <input type="password" id="redisUrl" value="${memorySettings.databaseSettings.redis.url}" />
                </div>

                <div class="form-group">
                    <label for="redisKeyPrefix">Key Prefix</label>
                    <input type="text" id="redisKeyPrefix" value="${memorySettings.databaseSettings.redis.keyPrefix}" />
                </div>
            </div>

            <h3>File Chunking</h3>

            <div class="form-group">
                <label for="chunkSize">Chunk Size</label>
                <input type="number" id="chunkSize" value="${memorySettings.fileChunking.chunkSize}" min="100" max="10000" />
            </div>

            <div class="form-group">
                <label for="chunkOverlap">Chunk Overlap</label>
                <input type="number" id="chunkOverlap" value="${memorySettings.fileChunking.chunkOverlap}" min="0" max="1000" />
            </div>

            <div class="form-group">
                <label for="maxChunksPerFile">Max Chunks Per File</label>
                <input type="number" id="maxChunksPerFile" value="${memorySettings.fileChunking.maxChunksPerFile}" min="1" max="1000" />
            </div>
        `;

        // Add event listeners for dynamic form elements
        const vectorStoreSelect = document.getElementById('vectorStore');
        const databaseSelect = document.getElementById('database');

        if (vectorStoreSelect) {
            vectorStoreSelect.addEventListener('change', () => {
                const value = vectorStoreSelect.value;

                // Hide all vector store settings
                document.querySelectorAll('[id$="Settings"]').forEach(el => {
                    if (el.id.startsWith('vectorStore')) {
                        el.classList.add('hidden');
                    }
                });

                // Show selected vector store settings
                const settingsEl = document.getElementById(`${value}Settings`);
                if (settingsEl) {
                    settingsEl.classList.remove('hidden');
                }
            });
        }

        if (databaseSelect) {
            databaseSelect.addEventListener('change', () => {
                const value = databaseSelect.value;

                // Hide all database settings
                document.querySelectorAll('[id$="Settings"]').forEach(el => {
                    if (el.id.startsWith('database')) {
                        el.classList.add('hidden');
                    }
                });

                // Show selected database settings
                const settingsEl = document.getElementById(`${value}Settings`);
                if (settingsEl) {
                    settingsEl.classList.remove('hidden');
                }
            });
        }
    }

    /**
     * Format content based on type
     */
    function formatContent(content, type) {
        if (!content) return '';

        const escapedContent = escapeHtml(content);

        if (type === 'code') {
            return `<pre><code>${escapedContent}</code></pre>`;
        }

        return `<div class="content-text">${escapedContent.replace(/\n/g, '<br>')}</div>`;
    }

    /**
     * Format metadata value
     */
    function formatMetadataValue(value) {
        if (value === null || value === undefined) {
            return '<em>null</em>';
        }

        if (typeof value === 'object') {
            return `<pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
        }

        return escapeHtml(String(value));
    }

    /**
     * Escape HTML
     */
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Show notification
     */
    function showNotification(message) {
        vscode.postMessage({
            command: 'showNotification',
            message
        });
    }

    /**
     * Show error
     */
    function showError(message) {
        vscode.postMessage({
            command: 'showError',
            message
        });
    }
})();
