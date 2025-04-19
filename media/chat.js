/**
 * Codessa Chat Interface
 * 
 * Handles the interactive functionality of the chat UI
 */

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const btnSend = document.getElementById('btn-send');
const btnCancel = document.getElementById('btn-cancel');
const btnClear = document.getElementById('btn-clear');
const btnExport = document.getElementById('btn-export');

// Tracks if a message is being processed
let processingMessage = isProcessing || false;

// Utility functions
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Simple markdown-like formatting
function formatContent(content) {
    // Convert code blocks
    content = content.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, '<pre><code class="language-$1">$2</code></pre>');
    
    // Convert inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert bold
    content = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic
    content = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert links - simplified version
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Handle line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
}

// Add a message to the chat
function addMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', message.role);
    messageElement.id = message.id;
    
    let content = message.content;
    
    // Format the content if not a tool message (which might contain code)
    if (message.role !== 'tool') {
        content = formatContent(content);
    }
    
    messageElement.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="timestamp">${formatTimestamp(message.timestamp)}</div>
    `;
    
    // Add tool result if present
    if (message.toolResult) {
        const toolResultElement = document.createElement('div');
        toolResultElement.classList.add('tool-result');
        
        let toolResultContent = `<div class="tool-result-output">${escapeHTML(message.toolResult.output)}</div>`;
        
        if (message.toolResult.error) {
            toolResultContent += `<div class="tool-result-error">${escapeHTML(message.toolResult.error)}</div>`;
        }
        
        toolResultElement.innerHTML = toolResultContent;
        messageElement.appendChild(toolResultElement);
    }
    
    chatMessages.appendChild(messageElement);
    
    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Load initial messages
function loadInitialMessages() {
    chatMessages.innerHTML = '';
    
    if (!initialMessages || initialMessages.length === 0) {
        // Add welcome message if no messages
        const welcomeMessage = {
            id: 'welcome',
            role: 'system',
            content: `Welcome to your chat with ${agent.name}! Type a message to start the conversation.`,
            timestamp: Date.now()
        };
        addMessage(welcomeMessage);
    } else {
        // Add all messages from the session
        initialMessages.forEach(message => {
            addMessage(message);
        });
    }
}

// Send a message
function sendMessage() {
    if (processingMessage) return;
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    // Clear input
    messageInput.value = '';
    
    // Send message to extension host
    vscode.postMessage({
        command: 'sendMessage',
        text: text
    });
    
    // Update UI
    setProcessingState(true);
}

// Set the processing state
function setProcessingState(processing) {
    processingMessage = processing;
    
    if (processing) {
        btnSend.innerHTML = '<span class="spinner"></span>Processing...';
        btnSend.disabled = true;
        btnCancel.style.display = 'block';
        messageInput.disabled = true;
    } else {
        btnSend.innerHTML = 'Send';
        btnSend.disabled = false;
        btnCancel.style.display = 'none';
        messageInput.disabled = false;
        messageInput.focus();
    }
}

// Clear the chat
function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        vscode.postMessage({
            command: 'clearChat'
        });
    }
}

// Export the chat
function exportChat() {
    vscode.postMessage({
        command: 'exportChat'
    });
}

// Cancel the current operation
function cancelOperation() {
    vscode.postMessage({
        command: 'cancelOperation'
    });
}

// Listen for messages from the extension host
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
        case 'processingState':
            setProcessingState(message.isProcessing);
            break;
    }
});

// Setup event listeners
btnSend.addEventListener('click', sendMessage);
btnClear.addEventListener('click', clearChat);
btnExport.addEventListener('click', exportChat);
btnCancel.addEventListener('click', cancelOperation);

// Allow sending messages with Enter key (but Shift+Enter for new line)
messageInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// Initialize the chat
loadInitialMessages();
setProcessingState(processingMessage);

// Focus the input on load
messageInput.focus(); 