class ChillQuillSettings {
    constructor() {
        this.defaultSettings = {
            theme: 'default',
            fontSize: 16,
            fontFamily: 'Space Grotesk',
            animations: true,
            aiModel: 'meituan/longcat-flash-chat:free',
            apiKey: '',
            autoSave: true,
            autoSaveDelay: 3,
            spellCheck: true,
            mascot: 'chillian',
            driveSync: false
        };
        
        this.currentSettings = this.loadSettings();
        this.init();
        this.initializeAIService();
    }

    init() {
        this.bindEvents();
        this.applySettings();
        this.updateSettingsUI();
        this.observeForNewElements();
    }

    bindEvents() {
        console.log('Binding settings events...');

        // Check if settings button exists when binding
        const settingsBtn = document.getElementById('settingsBtn');
        console.log('Settings button found during bind:', !!settingsBtn);

        // Use event delegation for more robust button binding
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'settingsBtn') {
                e.preventDefault();
                console.log('Settings button clicked via event delegation');
                this.openSettingsModal();
            }
        });

        // Also try direct binding as fallback
        this.tryBindSettingsButton();

        // Wait for DOM to be fully loaded before binding other events
        setTimeout(() => {
            const closeSettingsModal = document.getElementById('closeSettingsModal');
            const settingsModal = document.getElementById('settingsModal');
            const saveSettingsBtn = document.getElementById('saveSettingsBtn');
            const resetSettingsBtn = document.getElementById('resetSettingsBtn');

            if (closeSettingsModal) {
                closeSettingsModal.addEventListener('click', () => this.closeSettingsModal());
            }

            if (saveSettingsBtn) {
                console.log('Binding save settings button...');
                saveSettingsBtn.addEventListener('click', () => {
                    console.log('Save settings button clicked!');
                    this.saveSettings();
                });
                console.log('Save settings button bound successfully');
            } else {
                console.error('Save settings button not found!');
            }

            if (resetSettingsBtn) {
                resetSettingsBtn.addEventListener('click', () => this.resetSettings());
            }
            if (settingsModal) {
                settingsModal.addEventListener('click', (e) => {
                    if (e.target === settingsModal) {
                        this.closeSettingsModal();
                    }
                });
            }

            // Theme selector
            const themeSelect = document.getElementById('themeSelect');
            if (themeSelect) {
                themeSelect.addEventListener('change', (e) => {
                    this.previewTheme(e.target.value);
                });
            }

            // Font size slider
            const fontSizeSlider = document.getElementById('fontSizeSlider');
            const fontSizeValue = document.getElementById('fontSizeValue');
            if (fontSizeSlider && fontSizeValue) {
                fontSizeSlider.addEventListener('input', (e) => {
                    fontSizeValue.textContent = e.target.value + 'px';
                    this.previewFontSize(e.target.value);
                });
            }

            // Font family selector
            const fontFamilySelect = document.getElementById('fontFamilySelect');
            if (fontFamilySelect) {
                fontFamilySelect.addEventListener('change', (e) => {
                    this.previewFontFamily(e.target.value);
                });
            }

            // API Key input
            const apiKeyInput = document.getElementById('apiKeyInput');
            const toggleApiKey = document.getElementById('toggleApiKey');
            if (apiKeyInput) {
                apiKeyInput.addEventListener('input', (e) => {
                    this.handleApiKeyChange(e.target.value);
                });
            }
            if (toggleApiKey) {
                toggleApiKey.addEventListener('click', () => {
                    this.toggleApiKeyVisibility();
                });
            }

            // AI Model selector
            const aiModelSelect = document.getElementById('aiModelSelect');
            if (aiModelSelect) {
                aiModelSelect.addEventListener('change', (e) => {
                    this.updateAIModel(e.target.value);
                });
            }


            // Connect Drive button
            const connectDriveBtn = document.getElementById('connectDriveBtn');
            if (connectDriveBtn) {
                connectDriveBtn.addEventListener('click', () => {
                    this.connectGoogleDrive();
                });
            }

            // Disconnect Drive button
            const disconnectDriveBtn = document.getElementById('disconnectDriveBtn');
            if (disconnectDriveBtn) {
                disconnectDriveBtn.addEventListener('click', () => {
                    this.disconnectGoogleDrive();
                });
            }
        }, 100);
    }

    openSettingsModal() {
        console.log('Opening settings modal...');
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.updateSettingsUI();
            console.log('Settings modal opened successfully');
        } else {
            console.error('Settings modal not found in DOM');
        }
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'none';
    }

    updateSettingsUI() {
        // Update all UI elements to reflect current settings (with null checks)
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = this.currentSettings.theme;

        const fontSizeSlider = document.getElementById('fontSizeSlider');
        if (fontSizeSlider) fontSizeSlider.value = this.currentSettings.fontSize;

        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeValue) fontSizeValue.textContent = this.currentSettings.fontSize + 'px';

        const fontFamilySelect = document.getElementById('fontFamilySelect');
        if (fontFamilySelect) fontFamilySelect.value = this.currentSettings.fontFamily;

        const animationsToggle = document.getElementById('animationsToggle');
        if (animationsToggle) animationsToggle.checked = this.currentSettings.animations;

        const mascotSelect = document.getElementById('mascotSelect');
        if (mascotSelect) mascotSelect.value = this.currentSettings.mascot;

        const aiModelSelect = document.getElementById('aiModelSelect');
        if (aiModelSelect) aiModelSelect.value = this.currentSettings.aiModel;

        // apiKeyInput is optional since we use proxy
        const apiKeyInput = document.getElementById('apiKeyInput');
        if (apiKeyInput) apiKeyInput.value = this.currentSettings.apiKey || '';

        this.updateAIStatus();

        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) autoSaveToggle.checked = this.currentSettings.autoSave;

        const autoSaveDelay = document.getElementById('autoSaveDelay');
        if (autoSaveDelay) autoSaveDelay.value = this.currentSettings.autoSaveDelay;

        const spellCheckToggle = document.getElementById('spellCheckToggle');
        if (spellCheckToggle) spellCheckToggle.checked = this.currentSettings.spellCheck;

        // Update Google Drive settings
        const driveSync = document.getElementById('driveSync');
        if (driveSync) driveSync.checked = this.currentSettings.driveSync;

        // Update UI state based on drive connection
        this.updateDriveUI();
    }

    previewTheme(theme) {
        this.applyTheme(theme);
    }

    previewFontSize(size) {
        const editors = document.querySelectorAll('.rich-editor');
        editors.forEach(editor => {
            editor.style.fontSize = size + 'px';
        });
    }

    previewFontFamily(fontFamily) {
        this.applyFontFamily(fontFamily);
    }

    applySettings() {
        this.applyTheme(this.currentSettings.theme);
        this.applyFontSize(this.currentSettings.fontSize);
        this.applyFontFamily(this.currentSettings.fontFamily);
        this.applyAnimations(this.currentSettings.animations);
        this.applyMascot(this.currentSettings.mascot);
        this.applySpellCheck(this.currentSettings.spellCheck);
    }

    applyTheme(theme) {
        // Remove existing theme classes
        document.body.classList.remove('theme-default', 'theme-dark', 'theme-light', 'theme-nature', 'theme-ocean', 'theme-sunset');
        
        // Add new theme class
        document.body.classList.add(`theme-${theme}`);
        
        // Apply theme-specific styles
        this.setThemeColors(theme);
    }

    setThemeColors(theme) {
        // Apply theme by directly modifying CSS classes and styles
        const body = document.body;
        
        // Remove existing theme data attributes
        body.removeAttribute('data-theme');
        body.setAttribute('data-theme', theme);
        
        const themes = {
            default: {
                bodyBg: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
                cardBg: 'linear-gradient(145deg, #f5e6d3 0%, #e6d7c3 100%)',
                accentColor: '#8b755d',
                accentLight: '#a0896b',
                textPrimary: '#f5e6d3',
                textSecondary: '#2d2d2d',
                borderColor: '#8b755d'
            },
            dark: {
                bodyBg: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                cardBg: 'linear-gradient(145deg, #2a2a2a 0%, #1f1f1f 100%)',
                accentColor: '#4a4a4a',
                accentLight: '#6a6a6a',
                textPrimary: '#ffffff',
                textSecondary: '#ffffff',
                borderColor: '#4a4a4a'
            },
            light: {
                bodyBg: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #f8f9fa 100%)',
                cardBg: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                accentColor: '#6c757d',
                accentLight: '#495057',
                textPrimary: '#000000',
                textSecondary: '#000000',
                borderColor: '#6c757d'
            },
            nature: {
                bodyBg: 'linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 50%, #1a2e1a 100%)',
                cardBg: 'linear-gradient(145deg, #e8f5e8 0%, #d4edda 100%)',
                accentColor: '#4a7c59',
                accentLight: '#5d8f6b',
                textPrimary: '#ffffff',
                textSecondary: '#0a1a0a',
                borderColor: '#4a7c59'
            },
            ocean: {
                bodyBg: 'linear-gradient(135deg, #1a2332 0%, #2d3e50 50%, #1a2332 100%)',
                cardBg: 'linear-gradient(145deg, #ecf0f1 0%, #d5dbdb 100%)',
                accentColor: '#3498db',
                accentLight: '#5dade2',
                textPrimary: '#ffffff',
                textSecondary: '#0c1a26',
                borderColor: '#3498db'
            },
            sunset: {
                bodyBg: 'linear-gradient(135deg, #2e1a1a 0%, #4a2d2d 50%, #2e1a1a 100%)',
                cardBg: 'linear-gradient(145deg, #fdf2e9 0%, #f8c471 100%)',
                accentColor: '#e67e22',
                accentLight: '#f39c12',
                textPrimary: '#ffffff',
                textSecondary: '#1a0a0a',
                borderColor: '#e67e22'
            }
        };

        const selectedTheme = themes[theme] || themes.default;
        
        // Apply background to body
        body.style.background = selectedTheme.bodyBg;
        
        // Update specific elements
        this.applyThemeToElements(selectedTheme);
    }
    
    applyThemeToElements(theme) {
        // Update notes cards
        let noteCards = document.querySelectorAll('.note-card');
        noteCards.forEach(card => {
            card.style.background = theme.cardBg;
            card.style.borderColor = theme.borderColor;
            card.style.color = theme.textSecondary;
        });
        
        // Update modal content
        const modalContents = document.querySelectorAll('.modal-content');
        modalContents.forEach(modal => {
            modal.style.background = theme.cardBg;
            modal.style.borderColor = theme.borderColor;
        });
        
        // Update headers
        const headers = document.querySelectorAll('header');
        headers.forEach(header => {
            header.style.background = theme.cardBg;
            header.style.borderColor = theme.borderColor;
        });
        
        // Update buttons
        const buttons = document.querySelectorAll('.add-btn, .ai-btn, .settings-btn');
        buttons.forEach(button => {
            const bg = `linear-gradient(135deg, ${theme.accentColor} 0%, ${theme.accentLight} 100%)`;
            button.style.background = bg;
            button.style.borderColor = theme.borderColor;
            button.style.color = theme.textPrimary;
        });
        
        // Update sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.style.background = `linear-gradient(145deg, ${theme.accentColor}20, ${theme.accentLight}10)`;
            sidebar.style.borderColor = theme.borderColor;
        }
        
        // Update folder items
        const folderItems = document.querySelectorAll('.folder-item');
        folderItems.forEach(item => {
            item.style.color = theme.textPrimary;
        });
        
        // Update title
        const title = document.querySelector('#currentFolderTitle');
        if (title) {
            title.style.color = theme.textPrimary;
        }
        
        // Update all text elements for better contrast
        const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, .note-title, .note-content');
        textElements.forEach(element => {
            if (element.closest('.note-card')) {
                element.style.color = theme.textSecondary;
            } else if (element.closest('header')) {
                element.style.color = theme.textPrimary;
            }
        });
        
        // Update note card specific text
        noteCards = document.querySelectorAll('.note-card');
        noteCards.forEach(card => {
            const allTextInCard = card.querySelectorAll('*');
            allTextInCard.forEach(textEl => {
                if (textEl.tagName && !textEl.querySelector('*')) { // Only leaf text elements
                    textEl.style.color = theme.textSecondary;
                }
            });
        });
        
        // Update settings modal text
        const settingsModal = document.querySelector('#settingsModal .modal-content');
        if (settingsModal) {
            const settingsText = settingsModal.querySelectorAll('h3, h4, label, small');
            settingsText.forEach(text => {
                text.style.color = theme.textSecondary;
            });
        }
    }
    
    hexToRgb(hex) {
        // Convert hex to RGB for rgba usage
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
        }
        // Fallback for named colors or other formats
        return '139, 117, 93'; // Default brown
    }

    applyFontSize(size) {
        const editors = document.querySelectorAll('.rich-editor');
        editors.forEach(editor => {
            editor.style.fontSize = size + 'px';
        });
    }

    applyFontFamily(fontFamily) {
        // Load Google Fonts if needed
        this.loadGoogleFont(fontFamily);
        
        // Apply font to various elements
        const elementsToUpdate = [
            '.rich-editor',
            '.note-title',
            '.note-content',
            '.note-card',
            'body',
            '.modal-content',
            'input[type="text"]',
            'textarea',
            '.chat-input',
            '.ai-message',
            '.user-message'
        ];
        
        elementsToUpdate.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.fontFamily = fontFamily + ', sans-serif';
            });
        });
        
        // Also update the body font family
        document.body.style.fontFamily = fontFamily + ', sans-serif';
    }

    loadGoogleFont(fontFamily) {
        // List of fonts that need to be loaded from Google Fonts
        const googleFonts = [
            'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
            'Raleway', 'PT Sans', 'Lora', 'Ubuntu', 'Nunito', 'Playfair Display', 'Merriweather',
            'Roboto Slab', 'PT Serif', 'Libre Baskerville', 'Crimson Text', 'Cormorant Garamond',
            'Bitter', 'Arvo', 'Domine', 'Vollkorn', 'Fira Code', 'Source Code Pro', 'Inconsolata',
            'Roboto Mono', 'PT Mono', 'Cousine', 'Anonymous Pro', 'JetBrains Mono', 'Cascadia Code',
            'Lobster', 'Dancing Script', 'Pacifico', 'Righteous', 'Fredoka One', 'Bangers',
            'Permanent Marker', 'Kalam', 'Caveat', 'Satisfy', 'Great Vibes', 'Amatic SC',
            'Quicksand', 'Poppins', 'Mukti', 'Karla', 'Work Sans', 'Cabin', 'Oxygen',
            'Titillium Web', 'Dosis', 'ABeeZee', 'Noto Sans', 'Libre Franklin', 'Manrope',
            'DM Sans', 'IBM Plex Sans', 'Red Hat Display', 'Epilogue', 'Plus Jakarta Sans',
            'Lexend', 'Outfit', 'Space Grotesk', 'Sora', 'Be Vietnam Pro', 'Albert Sans',
            'Prata', 'Abril Fatface', 'Yeseva One', 'Cinzel', 'Philosopher', 'Old Standard TT',
            'Cardo', 'Neuton', 'Spectral', 'Alegreya', 'Press Start 2P', 'Orbitron',
            'Exo 2', 'Audiowide', 'Rajdhani', 'Black Ops One', 'Creepster', 'Nosifer',
            'Chiller', 'Eater', 'Butcherman'
        ];
        
        if (googleFonts.includes(fontFamily)) {
            // Check if font is already loaded
            const existingLink = document.querySelector(`link[href*="${fontFamily.replace(' ', '+')}"]`);
            if (existingLink) return;
            
            // Load the font from Google Fonts
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@300;400;500;600;700&display=swap`;
            document.head.appendChild(link);
        }
    }

    applyAnimations(enabled) {
        if (enabled) {
            document.body.classList.remove('no-animations');
        } else {
            document.body.classList.add('no-animations');
        }
    }

    applyMascot(mascot) {
        // Update all mascot images throughout the app
        const mascotImages = document.querySelectorAll('img[src*="chillian"], img[src*="oldgrumps"]');
        const newImagePath = mascot === 'oldgrumps' ? 'images/oldgrumps.png' : 'images/chillian_brown.png';
        
        mascotImages.forEach(img => {
            img.src = newImagePath;
            img.alt = mascot === 'oldgrumps' ? 'Old Grumps' : 'Chillian';
        });

        // Update any specific mascot elements
        const headerMascot = document.getElementById('chillianMascot');
        if (headerMascot) {
            headerMascot.src = newImagePath;
            headerMascot.alt = mascot === 'oldgrumps' ? 'Old Grumps' : 'Chillian';
        }

        // Update AI modal title and content
        const aiModalTitle = document.getElementById('aiModalTitle');
        if (aiModalTitle) {
            aiModalTitle.textContent = mascot === 'oldgrumps' ? 'chat with old grumps the grumpy porcupine' : 'chat with chillian the friendly porcupine';
        }

        // Update AI chat input placeholder
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.placeholder = mascot === 'oldgrumps' ? 'what do you need, young sprout? *adjusts sunglasses*' : 'ask chillian anything...';
        }

        // Update AI welcome message with personality
        const aiWelcomeMessage = document.querySelector('.ai-message .message-content');
        if (aiWelcomeMessage) {
            if (mascot === 'oldgrumps') {
                aiWelcomeMessage.innerHTML = `
                    <p>*grumbles and adjusts sunglasses* 😎 Listen up, young sprout! I'm Old Grumps, a grumpy old porcupine who's been quilling around long enough to know what's what. *snorts* I suppose I can help you with:</p>
                    <ul>
                        <li>📝 turning your point-less scribbles into sharp, well-quilled notes</li>
                        <li>🧠 creating spine-tingling quizzes that'll really test your mettle</li>
                        <li>💭 answering your questions (if they don't make my quills bristle with annoyance)</li>
                        <li>🎓 sharing the wisdom I've needled together over the years</li>
                    </ul>
                    <p>*taps paw impatiently* Now then, what knowledge do you seek? And don't be too dull about it, young sprout - I haven't got all day to quill around!</p>
                `;
            } else {
                aiWelcomeMessage.innerHTML = `
                    <p>hey there! 👋 I'm chillian, your friendly porcupine AI study buddy! I can help you:</p>
                    <ul>
                        <li>✨ enhance your notes with better structure and details</li>
                        <li>📚 create quizzes from your notes</li>
                        <li>🤔 answer questions about your content</li>
                        <li>💡 suggest improvements and connections</li>
                    </ul>
                    <p>what would you like me to help with today?</p>
                `;
            }
        }

        // Update auth interface mascots (if visible)
        const authMascots = document.querySelectorAll('.auth-chillian, .hero-chillian, .welcome-chillian, .reauth-chillian, .drive-auth-chillian');
        authMascots.forEach(img => {
            img.src = newImagePath;
            img.alt = mascot === 'oldgrumps' ? 'Old Grumps' : 'Chillian';
        });
    }

    applySpellCheck(enabled) {
        const editors = document.querySelectorAll('.rich-editor');
        editors.forEach(editor => {
            editor.spellcheck = enabled;
        });
    }

    updateAIModel(model) {
        if (window.aiService) {
            window.aiService.updateSettings({ model: model });
        }
    }

    handleApiKeyChange(apiKey) {
        this.currentSettings.apiKey = apiKey;
        this.updateAIStatus();

        // Configure the AI service if we have a valid key
        if (apiKey && apiKey.startsWith('sk-or-v1-')) {
            try {
                window.aiService.configure(apiKey);
                this.updateAIStatus();
            } catch (error) {
                console.error('Failed to configure AI service:', error);
            }
        }
    }

    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('apiKeyInput');
        const toggleBtn = document.getElementById('toggleApiKey');

        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            apiKeyInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    updateAIStatus() {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');

        if (!statusIndicator || !statusText) return;

        if (window.aiService && window.aiService.isReady()) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'configured and ready';
        } else if (this.currentSettings.apiKey) {
            statusIndicator.className = 'status-indicator warning';
            statusText.textContent = 'key provided, checking...';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'not configured';
        }
    }

    initializeAIService() {
        // Initialize AI service with saved API key if available
        if (this.currentSettings.apiKey && window.aiService) {
            try {
                window.aiService.configure(this.currentSettings.apiKey);
                console.log('AI service initialized with saved API key');
            } catch (error) {
                console.error('Failed to initialize AI service with saved key:', error);
            }
        }
    }

    updateResponseStyle(style) {
        if (window.chillianAI) {
            window.chillianAI.setResponseStyle(style);
        }
    }

    saveSettings() {
        console.log('SaveSettings called...');

        try {
            // Collect all settings from UI
            const elements = {
                themeSelect: document.getElementById('themeSelect'),
                fontSizeSlider: document.getElementById('fontSizeSlider'),
                fontFamilySelect: document.getElementById('fontFamilySelect'),
                animationsToggle: document.getElementById('animationsToggle'),
                mascotSelect: document.getElementById('mascotSelect'),
                aiModelSelect: document.getElementById('aiModelSelect'),
                autoSaveToggle: document.getElementById('autoSaveToggle'),
                autoSaveDelay: document.getElementById('autoSaveDelay'),
                spellCheckToggle: document.getElementById('spellCheckToggle'),
                driveSync: document.getElementById('driveSync')
            };

            // Check for missing critical elements (apiKey is optional since we use proxy)
            const missingElements = Object.entries(elements)
                .filter(([, element]) => !element)
                .map(([key]) => key);

            if (missingElements.length > 0) {
                console.warn('Missing elements (non-critical):', missingElements);
            }

            this.currentSettings = {
                theme: elements.themeSelect?.value || this.currentSettings.theme,
                fontSize: parseInt(elements.fontSizeSlider?.value || this.currentSettings.fontSize),
                fontFamily: elements.fontFamilySelect?.value || this.currentSettings.fontFamily,
                animations: elements.animationsToggle?.checked ?? this.currentSettings.animations,
                mascot: elements.mascotSelect?.value || this.currentSettings.mascot,
                aiModel: elements.aiModelSelect?.value || this.currentSettings.aiModel,
                apiKey: this.currentSettings.apiKey || '', // Keep existing API key
                autoSave: elements.autoSaveToggle?.checked ?? this.currentSettings.autoSave,
                autoSaveDelay: parseInt(elements.autoSaveDelay?.value || this.currentSettings.autoSaveDelay),
                spellCheck: elements.spellCheckToggle?.checked ?? this.currentSettings.spellCheck,
                driveSync: elements.driveSync?.checked ?? this.currentSettings.driveSync
            };

            console.log('Settings collected:', this.currentSettings);

            // Save to localStorage
            localStorage.setItem('chillquillSettings', JSON.stringify(this.currentSettings));
            console.log('Settings saved to localStorage');

            // Sync to cloud if authenticated
            this.syncData();

            // Apply settings
            this.applySettings();

            // Set up observer for dynamic content
            this.observeForNewElements();

            // Close modal
            this.closeSettingsModal();

            // Show confirmation
            this.showNotification('Settings saved successfully!');

        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings. Check console for details.');
        }
    }

    observeForNewElements() {
        // Watch for new note cards and modal content being added dynamically
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if new elements need theme applied
                            if (node.classList && (node.classList.contains('note-card') || 
                                                 node.classList.contains('modal-content') ||
                                                 node.querySelector('.note-card') ||
                                                 node.querySelector('.modal-content'))) {
                                // Apply current theme to new elements
                                setTimeout(() => {
                                    this.applyTheme(this.currentSettings.theme);
                                }, 10);
                            }
                        }
                    });
                }
            });
        });

        // Start observing
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    resetSettings() {
        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
            this.currentSettings = { ...this.defaultSettings };
            localStorage.setItem('chillquillSettings', JSON.stringify(this.currentSettings));
            this.syncData();
            this.applySettings();
            this.updateSettingsUI();
            this.showNotification('Settings reset to defaults!');
        }
    }

    // Sync data to cloud if authenticated
    syncData() {
        if (window.chillquillAuth && window.chillquillAuth.isAuthenticated) {
            // Debounce sync to avoid too many calls
            clearTimeout(this.syncTimeout);
            this.syncTimeout = setTimeout(() => {
                window.chillquillAuth.syncData();
            }, 1000);
        }
    }

    loadSettings() {
        try {
            const stored = localStorage.getItem('chillquillSettings');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure all properties exist
                return { ...this.defaultSettings, ...parsed };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
        return { ...this.defaultSettings };
    }

    tryBindSettingsButton() {
        let attempts = 0;
        const maxAttempts = 10;
        
        const bindAttempt = () => {
            const settingsBtn = document.getElementById('settingsBtn');
            console.log('Bind attempt', attempts + 1, '- button found:', !!settingsBtn, 'already bound:', settingsBtn?.hasAttribute('data-bound'));
            
            if (settingsBtn && !settingsBtn.hasAttribute('data-bound')) {
                settingsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Settings button clicked (direct binding)');
                    this.openSettingsModal();
                });
                settingsBtn.setAttribute('data-bound', 'true');
                console.log('Settings button bound successfully');
                return;
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(bindAttempt, 500);
            } else {
                console.error('Failed to bind settings button after', maxAttempts, 'attempts');
            }
        };
        
        bindAttempt();
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'settings-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-color, #8b755d);
            color: var(--text-primary, #f5e6d3);
            padding: 12px 20px;
            border-radius: 20px;
            font-family: 'Space Grotesk', monospace;
            font-weight: 600;
            font-size: 14px;
            z-index: 3000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transform: translateY(-50px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateY(-50px)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }


    updateDriveUI() {
        const driveSync = document.getElementById('driveSync');
        const connectBtn = document.getElementById('connectDriveBtn');
        const disconnectBtn = document.getElementById('disconnectDriveBtn');

        if (window.driveService && window.driveService.isAuthenticated) {
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-block';
            driveSync.disabled = false;
        } else {
            connectBtn.style.display = 'inline-block';
            disconnectBtn.style.display = 'none';
            driveSync.checked = false;
            driveSync.disabled = false; // Allow users to try connecting
        }
    }

    async connectGoogleDrive() {
        try {
            const connectBtn = document.getElementById('connectDriveBtn');
            connectBtn.textContent = 'connecting...';
            connectBtn.disabled = true;

            console.log('Starting Google Drive connection...');

            // Check if driveService exists
            if (!window.driveService) {
                throw new Error('Google Drive service not available');
            }

            console.log('Initializing Google Drive service...');
            // Initialize drive service
            const initialized = await window.driveService.init();

            if (!initialized) {
                throw new Error('Failed to initialize Google Drive service - check console for details');
            }

            console.log('Drive service initialized, attempting authentication...');
            // Authenticate
            const authenticated = await window.driveService.authenticate();

            if (authenticated) {
                console.log('Authentication successful!');
                this.showNotification('Successfully connected to Google Drive!');
                this.updateDriveUI();

                // Enable sync if not already enabled
                const driveSync = document.getElementById('driveSync');
                if (!driveSync.checked) {
                    driveSync.checked = true;
                    this.currentSettings.driveSync = true;
                    localStorage.setItem('chillquillSettings', JSON.stringify(this.currentSettings));
                }

                // Load existing data from Google Drive
                await this.loadDataFromDrive();
            } else {
                throw new Error('Authentication failed - user may have cancelled');
            }
        } catch (error) {
            console.error('Drive connection failed:', error);
            this.showNotification(`Failed to connect to Google Drive: ${error.message}`);
        } finally {
            const connectBtn = document.getElementById('connectDriveBtn');
            connectBtn.textContent = 'connect to google drive';
            connectBtn.disabled = false;
        }
    }

    async loadDataFromDrive() {
        if (window.notesApp && typeof window.notesApp.loadFromGoogleDrive === 'function') {
            console.log('Loading existing data from Google Drive...');
            try {
                const loaded = await window.notesApp.loadFromGoogleDrive();
                if (loaded) {
                    console.log('Existing data loaded from Google Drive');
                } else {
                    console.log('No existing data found in Google Drive');
                    // If no data in Drive, sync current local data to Drive
                    await window.notesApp.syncData();
                }
            } catch (error) {
                console.error('Error loading data from Google Drive:', error);
            }
        } else {
            console.error('NotesApp not available - this should not happen after initialization fix');
        }
    }

    async disconnectGoogleDrive() {
        if (confirm('Disconnect from Google Drive? Your local data will remain, but sync will stop.')) {
            try {
                window.driveService.signOut();

                // Disable sync
                const driveSync = document.getElementById('driveSync');
                driveSync.checked = false;
                this.currentSettings.driveSync = false;
                localStorage.setItem('chillquillSettings', JSON.stringify(this.currentSettings));

                this.updateDriveUI();
                this.showNotification('Disconnected from Google Drive');
            } catch (error) {
                console.error('Drive disconnection failed:', error);
                this.showNotification('Error disconnecting from Google Drive');
            }
        }
    }
}

// Debug function for troubleshooting
window.debugSettings = () => {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    console.log('Settings debug info:');
    console.log('- Settings button exists:', !!settingsBtn);
    console.log('- Settings button visible:', settingsBtn ? getComputedStyle(settingsBtn).display !== 'none' : 'N/A');
    console.log('- Settings modal exists:', !!settingsModal);
    console.log('- ChillQuillSettings available:', !!window.ChillQuillSettings);
    console.log('- Settings instance exists:', !!window.chillquillSettings);
    if (settingsBtn) {
        console.log('- Button bound:', settingsBtn.hasAttribute('data-bound'));
        console.log('- Button onclick:', settingsBtn.onclick);
    }
};

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing settings...');
    window.chillquillSettings = new ChillQuillSettings();
    console.log('Settings initialized');
});

// Fallback initialization if DOMContentLoaded already fired
if (document.readyState === 'loading') {
    // DOM hasn't finished loading yet
} else {
    // DOM has already loaded
    console.log('DOM already loaded, initializing settings immediately...');
    window.chillquillSettings = new ChillQuillSettings();
}