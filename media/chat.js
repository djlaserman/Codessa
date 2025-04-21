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
    // Add state for recording if needed
    // let isRecording = false;

    // --- DOM Elements ---
    const messagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const btnSend = document.getElementById('btn-send');
    const btnCancel = document.getElementById('btn-cancel');
    const btnClear = document.getElementById('btn-clear'); // Chat history clear
    const btnExport = document.getElementById('btn-export');
    const btnSettings = document.getElementById('btn-settings');
    // Input Toolbar Buttons
    const btnAddContext = document.getElementById('btn-add-context');
    const btnAttachFile = document.getElementById('btn-attach-file');
    const btnAttachFolder = document.getElementById('btn-attach-folder');
    const btnUploadImage = document.getElementById('btn-upload-image');
    // Buttons in specific locations
    const btnRecordAudio = document.getElementById('btn-record-audio'); // In input-actions-main
    const btnToggleTTS = document.getElementById('btn-toggle-tts'); // Now positioned via Flexbox next to input wrapper
    // Secondary Input Action Buttons (Top Toolbar Right Group)
    const btnInputCopy = document.getElementById('btn-input-copy');
    const btnInputCut = document.getElementById('btn-input-cut'); // Correctly referenced
    const btnInputPaste = document.getElementById('btn-input-paste');
    const btnInputClear = document.getElementById('btn-input-clear'); // Input field clear
    // Top Toolbar Dropdowns
    const modeSelector = document.getElementById('mode-selector');
    const providerSelector = document.getElementById('provider-selector');
    const modelSelector = document.getElementById('model-selector');
    const typingIndicator = document.getElementById('typing-indicator');
    const emptyChatMessage = document.getElementById('empty-chat-message');

    // --- Initialization ---
    function initializeChat() {
        messagesContainer.innerHTML = ''; // Clear any potential placeholders

        // Add the animated background logo
        addAnimatedBackgroundLogo();

        if (currentMessages.length > 0) {
            currentMessages.forEach(msg => addMessageToUI(msg, true)); // Pass true for initial load
            hideEmptyState();
        } else {
            showEmptyState();
        }

        console.log('Initial state:', {
            mode: currentMode,
            provider: currentProvider,
            model: currentModel,
            providers: availableProviders.length,
            models: availableModels.length
        });

        // Set up event listeners first so we can receive messages
        setupEventListeners();

        // Initialize UI
        populateDropdowns();
        setSelectedOptions();
        scrollToBottom(true); // Initial scroll, no animation
        updateProcessingStateUI(); // Initial state check for buttons
        updateTTSButtonUI();
        autoResizeTextarea(); // Initial size check

        // Request providers and models from extension
        console.log('Requesting providers and models from extension');
        setTimeout(() => {
            console.log('Sending getProviders request');
            vscode.postMessage({ command: 'getProviders' });

            setTimeout(() => {
                console.log('Sending getModels request');
                vscode.postMessage({ command: 'getModels' });
            }, 500);
        }, 500);
    }

    // Add animated background logo to chat messages area
    function addAnimatedBackgroundLogo() {
        // Create the container
        const logoContainer = document.createElement('div');
        logoContainer.className = 'background-logo-container';
        logoContainer.style.position = 'absolute';
        logoContainer.style.top = '0';
        logoContainer.style.left = '0';
        logoContainer.style.right = '0';
        logoContainer.style.bottom = '0';
        logoContainer.style.display = 'flex';
        logoContainer.style.justifyContent = 'center';
        logoContainer.style.alignItems = 'center';
        logoContainer.style.pointerEvents = 'none';
        logoContainer.style.zIndex = '0';
        logoContainer.style.overflow = 'hidden';
        logoContainer.style.userSelect = 'none'; // Prevent selection

        // Create the water effect canvas
        const waterCanvas = document.createElement('canvas');
        waterCanvas.className = 'water-canvas';
        waterCanvas.style.position = 'absolute';
        waterCanvas.style.top = '0';
        waterCanvas.style.left = '0';
        waterCanvas.style.width = '100%';
        waterCanvas.style.height = '100%';
        waterCanvas.style.opacity = '0.3';
        waterCanvas.style.pointerEvents = 'none';
        waterCanvas.style.zIndex = '0';
        logoContainer.appendChild(waterCanvas);

        // Create a full-height water background
        const waterBackground = document.createElement('div');
        waterBackground.className = 'water-background';
        waterBackground.style.position = 'absolute';
        waterBackground.style.top = '0';
        waterBackground.style.left = '0';
        waterBackground.style.right = '0';
        waterBackground.style.bottom = '0';
        waterBackground.style.background = 'linear-gradient(to bottom, rgba(0,122,204,0.01), rgba(0,122,204,0.03))';
        waterBackground.style.pointerEvents = 'none';
        waterBackground.style.zIndex = '-1';
        logoContainer.appendChild(waterBackground);

        // Create the wrapper for logo and ripples
        const logoWrapper = document.createElement('div');
        logoWrapper.className = 'logo-wrapper';
        logoWrapper.style.position = 'relative';
        logoWrapper.style.width = '300px';
        logoWrapper.style.height = '300px';
        logoWrapper.style.transform = 'perspective(800px) rotateX(10deg)';
        logoWrapper.style.transformStyle = 'preserve-3d';

        // Create the logo image with mesh distortion effect
        const logoImg = document.createElement('img');

        // Try to get the logo from the extension URI
        try {
            // This will be converted to a webview URI by VS Code
            const logoPath = document.querySelector('.logo').src;
            if (logoPath) {
                logoImg.src = logoPath;
            }
        } catch (e) {
            console.error('Error getting logo path:', e);
            // Fallback to a simple circle SVG
            logoImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJjdXJyZW50Q29sb3IiPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ1IiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+';
        }

        logoImg.className = 'background-logo';
        logoImg.style.width = '100%';
        logoImg.style.height = '100%';
        logoImg.style.opacity = '0.15';
        logoImg.style.filter = 'blur(1px)';
        logoImg.style.position = 'relative';
        logoImg.style.marginTop = '50px';
        logoImg.style.transition = 'transform 0.5s ease-out';
        logoImg.style.transformOrigin = 'center center';
        logoImg.style.willChange = 'transform';
        logoImg.style.userSelect = 'none'; // Prevent selection
        logoImg.style.webkitUserSelect = 'none'; // For Safari
        logoImg.style.msUserSelect = 'none'; // For IE/Edge
        logoImg.style.pointerEvents = 'none'; // Prevent interaction
        logoImg.setAttribute('draggable', 'false'); // Prevent dragging

        // Add advanced animations via CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes waterFloat {
                0% { transform: translateY(0) rotate(-1deg) scale(0.98) skew(1deg, 1deg); }
                25% { transform: translateY(-5px) rotate(-0.5deg) scale(1) skew(-0.5deg, 0.5deg); }
                50% { transform: translateY(-10px) rotate(0deg) scale(1.02) skew(-1deg, -1deg); }
                75% { transform: translateY(-5px) rotate(0.5deg) scale(1) skew(0.5deg, -0.5deg); }
                100% { transform: translateY(0) rotate(1deg) scale(0.98) skew(1deg, 1deg); }
            }

            @keyframes waterDistort {
                0% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
                50% { border-radius: 40% 60% 30% 70% / 60% 40% 60% 30%; }
                75% { border-radius: 60% 40% 70% 30% / 40% 50% 60% 50%; }
                100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
            }

            @keyframes waterRipple {
                0% {
                    width: 0%;
                    height: 0%;
                    opacity: 0.5;
                }
                100% {
                    width: 200%;
                    height: 200%;
                    opacity: 0;
                }
            }

            @keyframes clothFold {
                0% {
                    transform: perspective(500px) rotateX(5deg) rotateY(2deg) translateZ(0px);
                    filter: blur(1px);
                }
                25% {
                    transform: perspective(500px) rotateX(-2deg) rotateY(-3deg) translateZ(10px);
                    filter: blur(1.2px);
                }
                50% {
                    transform: perspective(500px) rotateX(-5deg) rotateY(1deg) translateZ(5px);
                    filter: blur(1.5px);
                }
                75% {
                    transform: perspective(500px) rotateX(3deg) rotateY(3deg) translateZ(-5px);
                    filter: blur(1.2px);
                }
                100% {
                    transform: perspective(500px) rotateX(5deg) rotateY(2deg) translateZ(0px);
                    filter: blur(1px);
                }
            }

            .background-logo {
                animation: waterFloat 12s ease-in-out infinite, waterDistort 15s ease-in-out infinite, clothFold 20s ease-in-out infinite;
                transform-style: preserve-3d;
                backface-visibility: hidden;
                transform-origin: center center;
                will-change: transform, border-radius, filter;
                box-shadow: 0 0 20px rgba(0, 122, 204, 0.1);
            }

            .logo-wrapper {
                animation: waterFloat 15s ease-in-out infinite alternate;
                transform-style: preserve-3d;
                will-change: transform;
            }

            .water-ripple {
                position: absolute;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(0,122,204,0.15) 0%, rgba(0,122,204,0) 70%);
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 1;
                opacity: 0;
                animation: rippleEffect 2s ease-out forwards;
                user-select: none;
            }

            @keyframes rippleEffect {
                0% { transform: translate(-50%, -50%) scale(0.1); opacity: 0.5; }
                100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
            }

            body.vscode-dark .background-logo {
                opacity: 0.12 !important;
                filter: blur(1px) brightness(1.5) !important;
            }

            body.vscode-dark .water-ripple {
                background: radial-gradient(circle, rgba(100,180,255,0.15) 0%, rgba(100,180,255,0) 70%);
            }

            /* Prevent selection of all water elements */
            .background-logo-container, .water-canvas, .logo-wrapper, .background-logo, .water-ripple {
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);

        // Create ripple effects
        const ripple1 = document.createElement('div');
        ripple1.style.position = 'absolute';
        ripple1.style.top = '50%';
        ripple1.style.left = '50%';
        ripple1.style.width = '100%';
        ripple1.style.height = '100%';
        ripple1.style.borderRadius = '60% 40% 30% 70% / 60% 30% 70% 40%';
        ripple1.style.background = 'transparent';
        ripple1.style.border = '2px solid rgba(0, 122, 204, 0.15)';
        ripple1.style.transform = 'translate(-50%, -50%)';
        ripple1.style.animation = 'waterRipple 10s linear infinite, waterDistort 15s ease-in-out infinite';

        const ripple2 = document.createElement('div');
        ripple2.style.position = 'absolute';
        ripple2.style.top = '50%';
        ripple2.style.left = '50%';
        ripple2.style.width = '80%';
        ripple2.style.height = '80%';
        ripple2.style.borderRadius = '40% 60% 70% 30% / 40% 40% 60% 50%';
        ripple2.style.background = 'transparent';
        ripple2.style.border = '2px solid rgba(0, 122, 204, 0.15)';
        ripple2.style.transform = 'translate(-50%, -50%)';
        ripple2.style.animation = 'waterRipple 10s linear infinite, waterDistort 15s ease-in-out infinite';
        ripple2.style.animationDelay = '-5s';

        // Assemble the elements
        logoWrapper.appendChild(logoImg);
        logoWrapper.appendChild(ripple1);
        logoWrapper.appendChild(ripple2);
        logoContainer.appendChild(logoWrapper);

        // Add to the chat messages container
        messagesContainer.appendChild(logoContainer);

        // Add click event listener to create ripples
        messagesContainer.addEventListener('click', function(e) {
            // Only create ripples if the click is directly on the messages container
            // or on elements that don't need interaction (like the background)
            const clickedElement = e.target;

            // Don't create ripples when clicking on interactive elements or text
            if (clickedElement.tagName === 'BUTTON' ||
                clickedElement.tagName === 'A' ||
                clickedElement.tagName === 'INPUT' ||
                clickedElement.tagName === 'TEXTAREA' ||
                clickedElement.classList.contains('message-content') ||
                clickedElement.closest('.message-bubble')) {
                return;
            }

            createRippleEffect(e.clientX, e.clientY, logoContainer);
        });

        // Initialize water canvas effect
        initWaterCanvas(waterCanvas);
    }

    // Create ripple effect at the clicked position
    function createRippleEffect(x, y, container) {
        const ripple = document.createElement('div');
        ripple.className = 'water-ripple';

        // Get position relative to the container
        const rect = container.getBoundingClientRect();
        const relX = x - rect.left;
        const relY = y - rect.top;

        ripple.style.left = relX + 'px';
        ripple.style.top = relY + 'px';
        ripple.style.width = '10px';
        ripple.style.height = '10px';

        container.appendChild(ripple);

        // Remove the ripple after animation completes
        setTimeout(() => {
            if (ripple && ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 2000);
    }

    // Initialize water canvas effect
    function initWaterCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        let width, height;
        let mouseX = 0, mouseY = 0;
        let lastMouseX = 0, lastMouseY = 0;
        let mouseSpeed = 0;
        let isMouseMoving = false;
        let mouseTimer = null;

        function resizeCanvas() {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Water surface parameters
        const waves = [];
        const waveCount = 5; // More waves for more complexity
        const ripples = []; // Array to store dynamic ripples

        // Initialize waves with different parameters
        for (let i = 0; i < waveCount; i++) {
            waves.push({
                amplitude: 1.5 + Math.random() * 2,
                length: width / (2 + Math.random() * 3),
                frequency: 0.0005 + Math.random() * 0.001, // Slower for more realistic water
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5 // Variable speed for each wave
            });
        }

        // Track mouse movement over the canvas
        document.addEventListener('mousemove', function(e) {
            const rect = canvas.getBoundingClientRect();
            lastMouseX = mouseX;
            lastMouseY = mouseY;
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;

            // Calculate mouse speed
            const dx = mouseX - lastMouseX;
            const dy = mouseY - lastMouseY;
            mouseSpeed = Math.sqrt(dx*dx + dy*dy);

            if (mouseSpeed > 5) { // Only consider significant movements
                isMouseMoving = true;

                // Create ripple at mouse position if moving fast enough
                if (mouseSpeed > 15 && Math.random() > 0.7) {
                    addRipple(mouseX, mouseY, 2 + mouseSpeed / 10);
                }

                // Reset the timer
                clearTimeout(mouseTimer);
                mouseTimer = setTimeout(() => {
                    isMouseMoving = false;
                }, 100);
            }
        });

        // Add ripple to the water
        function addRipple(x, y, strength = 3) {
            ripples.push({
                x: x,
                y: y,
                radius: 0,
                maxRadius: 50 + Math.random() * 100,
                strength: strength,
                opacity: 0.5,
                speed: 1 + Math.random() * 2
            });
        }

        // Add click handler to create ripples
        messagesContainer.addEventListener('click', function(e) {
            // Only create ripples if the click is directly on the messages container
            // or on elements that don't need interaction
            const clickedElement = e.target;

            // Don't create ripples when clicking on interactive elements or text
            if (clickedElement.tagName === 'BUTTON' ||
                clickedElement.tagName === 'A' ||
                clickedElement.tagName === 'INPUT' ||
                clickedElement.tagName === 'TEXTAREA' ||
                clickedElement.classList.contains('message-content') ||
                clickedElement.closest('.message-bubble')) {
                return;
            }

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Add multiple ripples for a more natural effect
            addRipple(x, y, 5);
            setTimeout(() => addRipple(x + (Math.random() * 20 - 10), y + (Math.random() * 20 - 10), 3), 100);
            setTimeout(() => addRipple(x + (Math.random() * 30 - 15), y + (Math.random() * 30 - 15), 2), 200);
        });

        function drawWater() {
            ctx.clearRect(0, 0, width, height);

            // Update wave phases with variable speeds
            waves.forEach(wave => {
                wave.phase += wave.frequency * wave.speed;

                // Adjust wave speed based on mouse movement
                if (isMouseMoving) {
                    wave.speed = 0.5 + (mouseSpeed / 50) * (Math.random() * 0.5 + 0.5);
                } else {
                    // Gradually return to normal speed
                    wave.speed = wave.speed * 0.95 + (0.5 + Math.random() * 0.5) * 0.05;
                }
            });

            // Draw multiple water layers for depth
            for (let layer = 0; layer < 3; layer++) {
                ctx.beginPath();

                // Different starting point for each layer - cover the entire height
                // First layer at top, second in middle, third at bottom
                const startY = height * (layer * 0.3);
                ctx.moveTo(0, startY);

                // Draw the wave path
                for (let x = 0; x < width; x += 3) { // Smaller step for smoother curves
                    let y = startY;

                    // Combine all waves
                    waves.forEach((wave, index) => {
                        // Different amplitude for each layer
                        const layerAmplitude = wave.amplitude * (layer === 1 ? 1 : 0.5);
                        y += Math.sin(x / wave.length + wave.phase + index) * layerAmplitude;
                    });

                    // Add ripple effects
                    ripples.forEach(ripple => {
                        const dx = x - ripple.x;
                        const dy = startY - ripple.y;
                        const distance = Math.sqrt(dx*dx + dy*dy);

                        // Only affect points within the ripple radius
                        if (distance > ripple.radius - 10 && distance < ripple.radius + 10) {
                            // Ripple wave effect
                            const amplitude = (ripple.strength * ripple.opacity) *
                                             Math.sin((distance - ripple.radius) * 0.5) *
                                             (1 - distance / ripple.maxRadius);
                            y += amplitude;
                        }
                    });

                    ctx.lineTo(x, y);
                }

                // Complete the water surface - different for each layer
                if (layer < 2) {
                    // For top and middle layers, just go to the next section
                    const nextLayerY = height * ((layer + 1) * 0.3);
                    ctx.lineTo(width, nextLayerY);
                    ctx.lineTo(0, nextLayerY);
                } else {
                    // For bottom layer, go to bottom of canvas
                    ctx.lineTo(width, height);
                    ctx.lineTo(0, height);
                }
                ctx.closePath();

                // Create gradient for water - different for each layer
                const gradientStartY = startY;
                const gradientEndY = (layer < 2) ? height * ((layer + 1) * 0.3) : height;

                const gradient = ctx.createLinearGradient(0, gradientStartY, 0, gradientEndY);

                if (layer === 0) { // Top layer (lightest)
                    gradient.addColorStop(0, 'rgba(0, 122, 204, 0.02)');
                    gradient.addColorStop(1, 'rgba(0, 122, 204, 0.03)');
                } else if (layer === 1) { // Middle layer
                    gradient.addColorStop(0, 'rgba(0, 122, 204, 0.03)');
                    gradient.addColorStop(1, 'rgba(0, 122, 204, 0.04)');
                } else { // Bottom layer (darkest)
                    gradient.addColorStop(0, 'rgba(0, 122, 204, 0.04)');
                    gradient.addColorStop(1, 'rgba(0, 122, 204, 0.02)');
                }

                ctx.fillStyle = gradient;
                ctx.fill();
            }

            // Update and draw ripples
            for (let i = ripples.length - 1; i >= 0; i--) {
                const ripple = ripples[i];

                // Update ripple
                ripple.radius += ripple.speed;
                ripple.opacity -= 0.01;

                // Remove faded ripples
                if (ripple.opacity <= 0 || ripple.radius >= ripple.maxRadius) {
                    ripples.splice(i, 1);
                    continue;
                }

                // Draw ripple (subtle circle)
                ctx.beginPath();
                ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 122, 204, ${ripple.opacity * 0.2})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            requestAnimationFrame(drawWater);
        }

        drawWater();

        // Occasionally add random ripples for ambient movement
        setInterval(() => {
            if (Math.random() > 0.7 && !isMouseMoving) {
                const x = Math.random() * width;
                // Generate ripples throughout the entire height
                const y = Math.random() * height;
                addRipple(x, y, 1 + Math.random() * 2);
            }
        }, 2000);

        // Add initial ripples across the entire canvas
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            addRipple(x, y, 1 + Math.random() * 3);
        }
    }

    // --- Dropdown Population ---
    function populateDropdowns() {
        // Request providers from extension if not available
        if (!availableProviders || availableProviders.length === 0) {
            vscode.postMessage({ command: 'getProviders' });
            console.log('Requesting providers from extension');
        } else {
            updateProviderDropdown();
        }

        // Request models from extension if not available
        if (!availableModels || availableModels.length === 0) {
            vscode.postMessage({ command: 'getModels' });
            console.log('Requesting models from extension');
        } else {
            populateModelDropdown();
        }
    }

    function updateProviderDropdown() {
        console.log('Updating provider dropdown with', availableProviders.length, 'providers');
        providerSelector.innerHTML = '<option value="">Provider...</option>';

        if (availableProviders && availableProviders.length > 0) {
            // Sort providers alphabetically by name
            const sortedProviders = [...availableProviders].sort((a, b) => a.name.localeCompare(b.name));

            // Add providers to dropdown
            sortedProviders.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.id;
                option.textContent = provider.name;
                providerSelector.appendChild(option);
            });

            // Set the current provider if it exists in the list
            if (currentProvider && availableProviders.some(p => p.id === currentProvider)) {
                providerSelector.value = currentProvider;
                console.log('Selected existing provider:', currentProvider);
            } else if (availableProviders.length > 0) {
                // Set default provider if none selected
                currentProvider = availableProviders[0].id;
                providerSelector.value = currentProvider;
                console.log('Set default provider:', currentProvider);
            }

            // Update models for this provider
            populateModelDropdown();
        } else {
            console.warn('No providers available to populate dropdown');
        }
    }

    function populateModelDropdown() {
        console.log('Updating model dropdown with', availableModels.length, 'models');
        modelSelector.innerHTML = '<option value="">Model...</option>';

        // Filter models for current provider
        const filteredModels = currentProvider
            ? availableModels.filter(model => model.provider === currentProvider)
            : availableModels;

        console.log('Filtered models for provider', currentProvider, ':', filteredModels.length);

        if (filteredModels && filteredModels.length > 0) {
            // Sort models alphabetically by name
            const sortedModels = [...filteredModels].sort((a, b) => a.name.localeCompare(b.name));

            // Add models to dropdown
            sortedModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                modelSelector.appendChild(option);
            });

            // Set the current model if it exists in the filtered list
            if (currentModel && filteredModels.some(m => m.id === currentModel)) {
                modelSelector.value = currentModel;
                console.log('Selected existing model:', currentModel);
            } else if (filteredModels.length > 0) {
                // Set default model if none selected
                currentModel = filteredModels[0].id;
                modelSelector.value = currentModel;
                console.log('Set default model:', currentModel);
            }
        } else {
            console.warn('No models available for provider:', currentProvider);
            // Request models again
            vscode.postMessage({ command: 'getModels' });
        }
    }

    function setSelectedOptions() {
        // Set mode dropdown value
        if (currentMode) {
            modeSelector.value = currentMode;
        }

        // Set provider dropdown value
        if (currentProvider) {
            providerSelector.value = currentProvider;
        }

        // Set model dropdown value
        if (currentModel) {
            modelSelector.value = currentModel;
        }

        console.log('Selected options set:', {
            mode: modeSelector.value,
            provider: providerSelector.value,
            model: modelSelector.value
        });
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

        // Add chat-head component
        if (message.role !== 'system' && message.role !== 'error') {
            const chatHead = document.createElement('div');
            chatHead.className = 'chat-head';

            // Left line
            const leftLine = document.createElement('div');
            leftLine.className = 'chat-head-line';
            chatHead.appendChild(leftLine);

            // Circle
            const circle = document.createElement('div');
            circle.className = 'chat-head-circle';
            circle.addEventListener('click', () => {
                circle.classList.toggle('active');
                // You can add additional functionality here when the circle is clicked
            });
            chatHead.appendChild(circle);

            // Username
            const username = document.createElement('div');
            username.className = 'chat-head-username';
            if (message.role === 'user') {
                username.textContent = initialState.username || 'User';
            } else if (message.role === 'assistant') {
                username.textContent = 'codessa - ai response';
            }
            chatHead.appendChild(username);

            // Right line
            const rightLine = document.createElement('div');
            rightLine.className = 'chat-head-line';
            chatHead.appendChild(rightLine);

            messageWrapper.appendChild(chatHead);
        }

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // Add context information if available
        if (message.role === 'user') {
            // Add mode information for user messages
            const contextElement = document.createElement('div');
            contextElement.className = 'message-context';
            contextElement.textContent = `mode: ${currentMode || 'chat'}`;
            bubble.appendChild(contextElement);
        } else if (message.role === 'assistant' && message.context) {
            // Add file context for AI messages if available
            const contextElement = document.createElement('div');
            contextElement.className = 'message-context';
            contextElement.textContent = message.context;
            bubble.appendChild(contextElement);
        } else if (message.role === 'error') {
            // Add header for error messages
            const header = document.createElement('div');
            header.className = 'message-header';

            const headerLeft = document.createElement('div');
            headerLeft.className = 'message-username';
            headerLeft.textContent = 'Error';

            const headerRight = document.createElement('div');
            headerRight.className = 'message-id';
            const shortId = message.id.includes('_')
                ? message.id.split('_').pop().substring(0, 6)
                : Math.random().toString(16).substring(2, 8);
            headerRight.textContent = `#${shortId}`;

            header.appendChild(headerLeft);
            header.appendChild(headerRight);
            bubble.appendChild(header);
        }

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

    function handleCancel() {
        console.log('Cancel button clicked');
        // Show immediate visual feedback
        isProcessing = false;
        updateProcessingStateUI();
        // Add a temporary message
        addMessageToUI({
            id: `cancelling_${Date.now()}`,
            role: 'system',
            content: 'Cancelling operation...',
            timestamp: Date.now()
        });
        // Send the cancel command
        vscode.postMessage({ command: 'cancelOperation' });
    }
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
        const selectedMode = event.target.value;
        if (selectedMode && selectedMode !== currentMode) {
            currentMode = selectedMode;
            console.log('Mode changed to:', selectedMode);
            vscode.postMessage({ command: 'changeMode', mode: selectedMode });
        }
    }

    function handleProviderChange(event) {
        const selectedProvider = event.target.value;
        if (selectedProvider !== currentProvider) {
            currentProvider = selectedProvider;
            console.log('Provider changed to:', selectedProvider);
            // Reset model when provider changes
            currentModel = "";
            populateModelDropdown();
            vscode.postMessage({ command: 'changeProvider', provider: selectedProvider });
        }
    }

    function handleModelChange(event) {
        const selectedModel = event.target.value;
        if (selectedModel !== currentModel) {
            currentModel = selectedModel;
            console.log('Model changed to:', selectedModel);
            vscode.postMessage({ command: 'changeModel', model: selectedModel });
        }
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
        // Support both message.type and message.command for backward compatibility
        const messageType = message.command || message.type;
        console.log('Received message from extension:', messageType);

        switch (messageType) {
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

                                // Update context if provided
                                if (message.message.context) {
                                    let contextElement = existingElement.querySelector('.message-context');
                                    if (!contextElement) {
                                        contextElement = document.createElement('div');
                                        contextElement.className = 'message-context';
                                        const bubble = existingElement.querySelector('.message-bubble');
                                        const header = bubble.querySelector('.message-header');
                                        if (header) {
                                            bubble.insertBefore(contextElement, header.nextSibling);
                                        } else {
                                            bubble.insertBefore(contextElement, bubble.firstChild);
                                        }
                                    }
                                    contextElement.textContent = message.message.context;
                                }
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

            case 'providers':
                console.log('Received providers from extension:', message.providers);
                if (message.providers && message.providers.length > 0) {
                    availableProviders = message.providers;
                    console.log(`Received ${availableProviders.length} providers:`, availableProviders.map(p => p.name).join(', '));
                    updateProviderDropdown();
                } else {
                    console.warn('Received empty providers list from extension');
                    // Request providers again after a delay
                    setTimeout(() => {
                        console.log('Re-requesting providers');
                        vscode.postMessage({ command: 'getProviders' });
                    }, 1000);
                }
                break;

            case 'updateProviders':
                console.log('Received providers update from extension:', message.providers);
                if (message.providers && message.providers.length > 0) {
                    availableProviders = message.providers;
                    console.log(`Received ${availableProviders.length} providers:`, availableProviders.map(p => p.name).join(', '));
                    updateProviderDropdown();
                } else {
                    console.warn('Received empty providers list from extension update');
                }
                break;

            case 'models':
                console.log('Received models from extension:', message.models);
                if (message.models && message.models.length > 0) {
                    availableModels = message.models;
                    console.log(`Received ${availableModels.length} models`);
                    populateModelDropdown();
                } else {
                    console.warn('Received empty models list from extension');
                    // Request models again after a delay
                    setTimeout(() => {
                        console.log('Re-requesting models');
                        vscode.postMessage({ command: 'getModels' });
                    }, 1000);
                }
                break;

            case 'updateModels':
                console.log('Received models update from extension:', message.models);
                if (message.models && message.models.length > 0) {
                    availableModels = message.models;
                    console.log(`Received ${availableModels.length} models`);
                    populateModelDropdown();
                } else {
                    console.warn('Received empty models list from extension update');
                }
                break;

            case 'currentSettings':
                console.log('Received current settings from extension:', message.settings);
                if (message.settings) {
                    if (message.settings.mode) {
                        currentMode = message.settings.mode;
                    }
                    if (message.settings.provider) {
                        currentProvider = message.settings.provider;
                    }
                    if (message.settings.model) {
                        currentModel = message.settings.model;
                    }
                    setSelectedOptions();
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