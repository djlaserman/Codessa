(function() {
    'use strict';

    // --- State ---
    let isProcessing = initialState.isProcessing;
    let currentMessages = initialState.messages || [];
    let isTTSActive = initialState.isTTSActive || false;
    let currentMode = initialState.currentMode;
    let currentProvider = initialState.currentProvider;
    let currentModel = initialState.currentModel;
    let availableProviders = initialState.availableProviders || [];
    let availableModels = initialState.availableModels || [];

    // --- DOM Elements ---
    const messagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const btnSend = document.getElementById('btn-send');
    const btnCancel = document.getElementById('btn-cancel');
    const btnClear = document.getElementById('btn-clear');
    const btnExport = document.getElementById('btn-export');
    const btnSettings = document.getElementById('btn-settings');
    const btnAddContext = document.getElementById('btn-add-context');
    const btnAttachFile = document.getElementById('btn-attach-file');
    const btnAttachFolder = document.getElementById('btn-attach-folder');
    const btnUploadImage = document.getElementById('btn-upload-image');
    const btnRecordAudio = document.getElementById('btn-record-audio');
    const btnToggleTTS = document.getElementById('btn-toggle-tts');
    const btnInputCopy = document.getElementById('btn-input-copy');
    const btnInputCut = document.getElementById('btn-input-cut');
    const btnInputPaste = document.getElementById('btn-input-paste');
    const btnInputClear = document.getElementById('btn-input-clear');
    const modeSelector = document.getElementById('mode-selector');
    const providerSelector = document.getElementById('provider-selector');
    const modelSelector = document.getElementById('model-selector');
    const typingIndicator = document.getElementById('typing-indicator');
    const emptyChatMessage = document.getElementById('empty-chat-message');

    // --- Initialization ---
    function initializeChat() {
        messagesContainer.innerHTML = '';
        if (currentMessages.length > 0) {
            currentMessages.forEach(msg => addMessageToUI(msg, true));
            hideEmptyState();
        } else {
            showEmptyState();
        }
        populateDropdowns();
        setSelectedOptions();
        scrollToBottom(true);
        updateProcessingStateUI();
        updateTTSButtonUI();
        setupEventListeners();
        autoResizeTextarea();
    }

    // --- Dropdown Population ---
    function populateDropdowns() {
        providerSelector.innerHTML = '<option value="">Provider...</option>';
        availableProviders.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.id;
            option.textContent = provider.name;
            providerSelector.appendChild(option);
        });

        populateModelDropdown();
    }

    function populateModelDropdown() {
        modelSelector.innerHTML = '<option value="">Model...</option>';
        const filteredModels = currentProvider
            ? availableModels.filter(model => model.provider === currentProvider)
            : availableModels;

        filteredModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelSelector.appendChild(option);
        });
        modelSelector.value = currentModel && filteredModels.some(m => m.id === currentModel) ? currentModel : "";
    }

    function setSelectedOptions() {
        modeSelector.value = currentMode;
        providerSelector.value = currentProvider;
    }

    // --- UI Updates & DOM Manipulation ---
    function addMessageToUI(message, isInitial = false) {
        message = {
            role: 'system',
            content: '',
            timestamp: Date.now(),
            id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            ...message
        };

        if (document.getElementById(message.id)) {
            return;
        }

        const messageWrapper = document.createElement('div');
        messageWrapper.className = `message ${message.role}`;
        messageWrapper.id = message.id;
        messageWrapper.setAttribute('role', 'listitem');
        if (isInitial) {
             messageWrapper.style.animation = 'none';
             messageWrapper.style.opacity = '1';
        }

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.innerHTML = getAvatarIcon(message.role);
        if (message.role !== 'system') {
             messageWrapper.appendChild(avatar);
        } else {
             messageWrapper.style.justifyContent = 'center';
        }

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        try {
            contentElement.innerHTML = marked.parse(message.content || '');
        } catch (e) {
            console.error("Markdown parsing error:", e);
            contentElement.textContent = message.content || '';
        }

        bubble.appendChild(contentElement);

        const timestampElement = document.createElement('div');
        timestampElement.className = 'timestamp';
        timestampElement.textContent = formatTimestamp(message.timestamp);
        bubble.appendChild(timestampElement);

        messageWrapper.appendChild(bubble);
        messagesContainer.appendChild(messageWrapper);

        contentElement.querySelectorAll('pre code').forEach((block) => {
            enhanceCodeBlock(block.parentElement);
        });

        hideEmptyState();
        if (!isInitial) {
            scrollToBottom();
        }
    }

    function getAvatarIcon(role) {
        switch (role) {
            case 'user': return '<i class="codicon codicon-account"></i>';
            case 'assistant': return '<i class="codicon codicon-hubot"></i>';
            case 'system': return '<i class="codicon codicon-info"></i>';
            case 'error': return '<i class="codicon codicon-error"></i>';
            default: return '<i class="codicon codicon-comment"></i>';
        }
    }

    function enhanceCodeBlock(preElement) {
        const codeElement = preElement.querySelector('code');
        if (!codeElement || preElement.querySelector('.code-block-header')) return;

        const languageClass = codeElement.className.match(/language-(\S+)/);
        const language = languageClass ? languageClass[1] : 'plaintext';

        const header = document.createElement('div');
        header.className = 'code-block-header';

        const langSpan = document.createElement('span');
        langSpan.className = 'code-block-language';
        langSpan.textContent = language;

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-code-button';
        copyButton.title = 'Copy code';
        copyButton.innerHTML = '<i class="codicon codicon-copy"></i><span class="copy-status">Copy</span>';

        copyButton.addEventListener('click', () => {
            const codeToCopy = codeElement.textContent;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                const statusSpan = copyButton.querySelector('.copy-status');
                const icon = copyButton.querySelector('.codicon');
                if (!statusSpan || !icon) return;
                statusSpan.textContent = 'Copied!';
                icon.className = 'codicon codicon-check';
                copyButton.disabled = true;
                setTimeout(() => {
                    if (statusSpan && icon) {
                        statusSpan.textContent = 'Copy';
                        icon.className = 'codicon codicon-copy';
                    }
                    copyButton.disabled = false;
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy code: ', err);
                const statusSpan = copyButton.querySelector('.copy-status');
                 if (statusSpan) {
                    statusSpan.textContent = 'Error';
                    setTimeout(() => { if (statusSpan) statusSpan.textContent = 'Copy'; }, 1500);
                 }
            });
        });

        header.appendChild(langSpan);
        header.appendChild(copyButton);
        preElement.insertBefore(header, codeElement);
    }

    function formatTimestamp(timestamp) {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error("Error formatting timestamp:", e);
            return '';
        }
    }

    function scrollToBottom(instant = false) {
        const behavior = instant ? 'instant' : 'smooth';
        requestAnimationFrame(() => {
             messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior });
        });
    }

    function clearChatUI() {
        messagesContainer.innerHTML = '';
        currentMessages = [];
        showEmptyState();
    }

    function showEmptyState() {
        if (emptyChatMessage) {
            emptyChatMessage.style.display = 'block';
        }
    }

    function hideEmptyState() {
         if (emptyChatMessage) {
            emptyChatMessage.style.display = 'none';
        }
    }

    function updateProcessingStateUI() {
        const hasText = messageInput.value.trim().length > 0;
        const canInteract = !isProcessing;

        messageInput.disabled = !canInteract;
        btnSend.disabled = !canInteract || !hasText;

        if (isProcessing) {
            btnCancel.classList.add('visible');
            btnCancel.disabled = false;
            typingIndicator.classList.add('visible');
        } else {
            btnCancel.classList.remove('visible');
            btnCancel.disabled = true;
            typingIndicator.classList.remove('visible');
        }

        btnInputCopy.disabled = !canInteract || !hasText;
        btnInputCut.disabled = !canInteract || !hasText;
        btnInputPaste.disabled = !canInteract;
        btnInputClear.disabled = !canInteract || !hasText;
    }

    function updateTTSButtonUI() {
        const icon = btnToggleTTS.querySelector('i.codicon');
        if (isTTSActive) {
            btnToggleTTS.classList.add('active');
            btnToggleTTS.title = 'Disable Text-to-Speech Output';
            if (icon) icon.className = 'codicon codicon-mute';
        } else {
            btnToggleTTS.classList.remove('active');
            btnToggleTTS.title = 'Enable Text-to-Speech Output';
            if (icon) icon.className = 'codicon codicon-unmute';
        }
    }

    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        const scrollHeight = messageInput.scrollHeight;
        const maxHeight = parseInt(window.getComputedStyle(messageInput).maxHeight, 10) || 250;
        const minHeight = parseInt(window.getComputedStyle(messageInput).minHeight, 10) || 0;

        const targetHeight = Math.max(minHeight, scrollHeight);

        if (targetHeight > maxHeight) {
             messageInput.style.height = `${maxHeight}px`;
             messageInput.style.overflowY = 'auto';
        } else {
             messageInput.style.height = `${targetHeight}px`;
             messageInput.style.overflowY = 'hidden';
        }
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        messageInput.addEventListener('input', () => {
            updateProcessingStateUI();
            autoResizeTextarea();
        });
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        btnSettings.addEventListener('click', handleSettings);
        btnClear.addEventListener('click', handleClear);
        btnExport.addEventListener('click', handleExport);

        modeSelector.addEventListener('change', handleModeChange);
        providerSelector.addEventListener('change', handleProviderChange);
        modelSelector.addEventListener('change', handleModelChange);

        btnAddContext.addEventListener('click', handleAddContext);
        btnAttachFile.addEventListener('click', handleAttachFile);
        btnAttachFolder.addEventListener('click', handleAttachFolder);
        btnUploadImage.addEventListener('click', handleUploadImage);

        btnInputCopy.addEventListener('click', handleInputCopy);
        btnInputCut.addEventListener('click', handleInputCut);
        btnInputPaste.addEventListener('click', handleInputPaste);
        btnInputClear.addEventListener('click', handleInputClear);

        btnRecordAudio.addEventListener('click', handleRecordAudio);
        btnSend.addEventListener('click', handleSendMessage);
        btnCancel.addEventListener('click', handleCancel);

        btnToggleTTS.addEventListener('click', handleToggleTTS);

        window.addEventListener('message', handleExtensionMessage);
    }

    // --- Event Handlers ---
    function handleSendMessage() {
        const text = messageInput.value.trim();
        if (!text || isProcessing) return;

        const userMessage = {
            id: `msg_user_${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: Date.now()
        };
        addMessageToUI(userMessage);
        currentMessages.push(userMessage);

        vscode.postMessage({
            command: 'sendMessage',
            text: text,
            mode: currentMode,
            provider: currentProvider,
            model: currentModel
        });

        messageInput.value = '';
        autoResizeTextarea();
        isProcessing = true;
        updateProcessingStateUI();
        messageInput.focus();
    }

    function handleCancel() { vscode.postMessage({ command: 'cancelOperation' }); }
    function handleClear() { vscode.postMessage({ command: 'clearChat' }); }
    function handleExport() { vscode.postMessage({ command: 'exportChat' }); }
    function handleSettings() { vscode.postMessage({ command: 'openSettings' }); }
    function handleAddContext() { vscode.postMessage({ command: 'addContext' }); }
    function handleUploadImage() { vscode.postMessage({ command: 'uploadImage' }); }
    function handleRecordAudio() {
        vscode.postMessage({ command: 'recordAudio' });
        console.log("Record audio button clicked");
    }
    function handleAttachFile() { vscode.postMessage({ command: 'attachFile' }); }
    function handleAttachFolder() { vscode.postMessage({ command: 'attachFolder' }); }
    function handleToggleTTS() {
        isTTSActive = !isTTSActive;
        updateTTSButtonUI();
        vscode.postMessage({ command: 'toggleTTS', state: isTTSActive });
    }

    function handleModeChange(event) {
        currentMode = event.target.value;
        vscode.postMessage({ command: 'changeMode', mode: currentMode });
    }
    function handleProviderChange(event) {
        currentProvider = event.target.value;
        currentModel = "";
        populateModelDropdown();
        vscode.postMessage({ command: 'changeProvider', provider: currentProvider });
    }
    function handleModelChange(event) {
        currentModel = event.target.value;
        vscode.postMessage({ command: 'changeModel', model: currentModel });
    }

    function handleInputCopy() {
        if (isProcessing || !messageInput.value) return;
        messageInput.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(messageInput.value).then(() => {
                console.log("Input copied to clipboard.");
            }).catch(err => {
                console.error('Async clipboard copy failed: ', err);
                try { document.execCommand('copy'); } catch (e) { console.error('execCommand copy failed: ', e); }
            });
        } else {
            try { document.execCommand('copy'); } catch (e) { console.error('execCommand copy failed: ', e); }
        }
        window.getSelection()?.removeAllRanges();
        messageInput.focus();
    }

    function handleInputCut() {
        if (isProcessing || !messageInput.value) return;
        messageInput.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(messageInput.value).then(() => {
                messageInput.value = '';
                autoResizeTextarea();
                updateProcessingStateUI();
                console.log("Input cut to clipboard.");
            }).catch(err => {
                console.error('Async clipboard cut failed (copy part): ', err);
                try {
                    document.execCommand('cut');
                    autoResizeTextarea();
                    updateProcessingStateUI();
                } catch (e) { console.error('execCommand cut failed: ', e); }
            });
        } else {
            try {
                document.execCommand('cut');
                autoResizeTextarea();
                updateProcessingStateUI();
            } catch (e) { console.error('execCommand cut failed: ', e); }
        }
        messageInput.focus();
    }

    async function handleInputPaste() {
        if (isProcessing) return;
        messageInput.focus();
        if (navigator.clipboard && navigator.clipboard.readText) {
            try {
                const text = await navigator.clipboard.readText();
                const start = messageInput.selectionStart;
                const end = messageInput.selectionEnd;
                messageInput.value = messageInput.value.substring(0, start) + text + messageInput.value.substring(end);
                messageInput.selectionStart = messageInput.selectionEnd = start + text.length;
                autoResizeTextarea();
                updateProcessingStateUI();
                console.log("Pasted from clipboard.");
            } catch (err) {
                console.error('Async clipboard paste failed: ', err);
                 vscode.postMessage({ command: 'showInformationMessage', text: "Could not paste from clipboard. Please use Ctrl+V/Cmd+V." });
            }
        } else {
            console.warn("Using execCommand('paste') as fallback - may not work.");
            try {
                const success = document.execCommand('paste');
                if (!success) {
                     vscode.postMessage({ command: 'showInformationMessage', text: "Pasting failed. Please use Ctrl+V/Cmd+V." });
                } else {
                    autoResizeTextarea();
                    updateProcessingStateUI();
                }
            } catch (e) {
                console.error('execCommand paste failed: ', e);
                 vscode.postMessage({ command: 'showInformationMessage', text: "Pasting failed. Please use Ctrl+V/Cmd+V." });
            }
        }
    }

    function handleInputClear() {
        if (isProcessing) return;
        messageInput.value = '';
        autoResizeTextarea();
        updateProcessingStateUI();
        messageInput.focus();
    }

    // --- Message Handling from Extension ---
    function handleExtensionMessage(event) {
        const message = event.data;

        switch (message.type) {
            case 'addMessage':
                if (!currentMessages.some(m => m.id === message.message.id)) {
                    addMessageToUI(message.message);
                    currentMessages.push(message.message);
                } else if (message.message.role !== 'user') {
                    const existingElement = document.getElementById(message.message.id);
                    if (existingElement) {
                        const contentElement = existingElement.querySelector('.message-content');
                        if (contentElement) {
                             try {
                                contentElement.innerHTML = marked.parse(message.message.content || '');
                                contentElement.querySelectorAll('pre code').forEach(block => enhanceCodeBlock(block.parentElement));
                            } catch(e) {
                                console.error("Markdown parsing error on update:", e);
                                contentElement.textContent = message.message.content || '';
                            }
                        }
                    } else {
                         addMessageToUI(message.message);
                         currentMessages.push(message.message);
                    }
                }
                scrollToBottom();
                break;

            case 'clearMessages':
                clearChatUI();
                break;

            case 'processingState':
                isProcessing = message.isProcessing;
                updateProcessingStateUI();
                if (!isProcessing) {
                    btnSend.disabled = !messageInput.value.trim();
                }
                break;

            case 'ttsState':
                isTTSActive = message.isActive;
                updateTTSButtonUI();
                break;

            case 'updateProviders':
                availableProviders = message.providers || [];
                const selectedProvider = providerSelector.value;
                populateDropdowns();
                if (availableProviders.some(p => p.id === selectedProvider)) {
                    providerSelector.value = selectedProvider;
                } else {
                    currentProvider = "";
                    populateModelDropdown();
                }
                break;

            case 'updateModels':
                availableModels = message.models || [];
                const selectedModel = modelSelector.value;
                populateModelDropdown();
                if (availableModels.some(m => m.id === selectedModel && m.provider === currentProvider)) {
                    modelSelector.value = selectedModel;
                } else {
                    currentModel = "";
                }
                break;

            case 'error':
                addMessageToUI({
                    id: `error_${Date.now()}`,
                    role: 'error',
                    content: `**Error:** ${message.message}`,
                    timestamp: Date.now()
                });
                if (isProcessing) {
                    isProcessing = false;
                    updateProcessingStateUI();
                }
                scrollToBottom();
                break;

            default:
                console.warn("Received unknown message type from extension:", message.type);
        }
    }

    // --- Run Initialization ---
    initializeChat();

})();