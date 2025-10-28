// Global function called when Google Identity Services script loads
window.gisLoaded = async function() {
    console.log('Google Identity Services script has loaded via onload callback.');

    // Initialize Google Drive service now that GIS is ready
    if (window.driveService) {
        try {
            console.log('Starting Google Drive service initialization...');
            const initialized = await window.driveService.init();
            if (initialized) {
                console.log('Google Drive service initialized successfully from gisLoaded callback');

                // Update UI to show Drive is ready
                const settings = window.chillquillSettings;
                if (settings) {
                    settings.updateDriveUI();
                }
            } else {
                console.log('Google Drive service initialization failed from gisLoaded callback');
            }
        } catch (error) {
            console.error('Error initializing Google Drive service from gisLoaded callback:', error);
        }
    } else {
        console.warn('window.driveService not available when gisLoaded was called');
    }
};

// Global function called when Google Identity Services script fails to load
window.gisLoadError = function(error) {
    console.error('Google Identity Services script failed to load!', error);
    console.error('This could be due to:');
    console.error('1. Network connectivity issues');
    console.error('2. Content Security Policy blocking the script');
    console.error('3. The script URL being incorrect or unavailable');
    console.error('4. Ad blockers or privacy extensions blocking Google scripts');

    // Check if we're in a restrictive environment
    console.log('Current environment:', {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        userAgent: navigator.userAgent
    });
};

class NotesApp {
    constructor() {
        this.notes = [];
        this.folders = [];
        this.trashedNotes = [];
        this.currentEditingId = null;
        this.currentFolder = 'all';
        this.currentParentFolder = null;
        this.expandedFolders = new Set(); // Track which folders are expanded
        this.initAsync();
    }

    async initAsync() {
        // Load data asynchronously
        this.notes = await this.loadNotes();
        this.folders = await this.loadFolders();
        this.trashedNotes = this.loadTrashedNotes();
        this.loadExpandedFolders();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderFolders();
        this.renderNotes();
        this.updateNoteCounts();
    }

    bindEvents() {
        // Note modal events
        const addNoteBtn = document.getElementById('addNoteBtn');
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const saveNoteBtn = document.getElementById('saveNoteBtn');
        const modal = document.getElementById('noteModal');

        addNoteBtn.addEventListener('click', () => this.openModal());
        closeModal.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        saveNoteBtn.addEventListener('click', () => this.saveNote());

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Folder modal events
        const addFolderBtn = document.getElementById('addFolderBtn');
        const closeFolderModal = document.getElementById('closeFolderModal');
        const cancelFolderBtn = document.getElementById('cancelFolderBtn');
        const saveFolderBtn = document.getElementById('saveFolderBtn');
        const folderModal = document.getElementById('folderModal');

        addFolderBtn.addEventListener('click', () => {
            this.currentParentFolder = null;
            this.openFolderModal();
        });
        closeFolderModal.addEventListener('click', () => this.closeFolderModal());
        cancelFolderBtn.addEventListener('click', () => this.closeFolderModal());
        saveFolderBtn.addEventListener('click', () => this.saveFolder());

        folderModal.addEventListener('click', (e) => {
            if (e.target === folderModal) {
                this.closeFolderModal();
            }
        });

        // AI Assistant events
        const aiAssistBtn = document.getElementById('aiAssistBtn');
        const closeAiModal = document.getElementById('closeAiModal');
        const aiModal = document.getElementById('aiModal');
        const sendChatBtn = document.getElementById('sendChatBtn');
        const clearChatBtn = document.getElementById('clearChatBtn');
        const chatInput = document.getElementById('chatInput');
        const enhanceNoteBtn = document.getElementById('enhanceNoteBtn');
        const createQuizBtn = document.getElementById('createQuizBtn');

        aiAssistBtn.addEventListener('click', () => this.openAiModal());
        closeAiModal.addEventListener('click', () => this.closeAiModal());
        sendChatBtn.addEventListener('click', () => this.sendChatMessage());
        clearChatBtn.addEventListener('click', () => this.clearChatHistory());
        enhanceNoteBtn.addEventListener('click', () => this.enhanceCurrentNote());
        createQuizBtn.addEventListener('click', () => this.createQuizFromNote());

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        aiModal.addEventListener('click', (e) => {
            if (e.target === aiModal) {
                this.closeAiModal();
            }
        });

        // Formatting toolbar events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('format-btn')) {
                e.preventDefault();
                this.handleFormatCommand(e.target);
            }
        });

        // Color picker and font size events
        document.addEventListener('change', (e) => {
            if (e.target.id === 'highlightColor') {
                this.applyHighlight(e.target.value);
            } else if (e.target.id === 'fontColor') {
                this.applyFontColor(e.target.value);
            } else if (e.target.id === 'fontSizeSelect') {
                this.applyFontSize(e.target.value);
            }
        });

        // Update toolbar state on selection change
        document.addEventListener('selectionchange', () => {
            if (document.activeElement && document.activeElement.id === 'noteContent') {
                this.updateToolbarState();
            }
        });

        // Global events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeFolderModal();
                this.closeAiModal();
                this.closeQuizModal();
                if (window.chillquillSettings) {
                    window.chillquillSettings.closeSettingsModal();
                }
            }
            
            // Keyboard shortcuts for formatting
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'b':
                        e.preventDefault();
                        this.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.execCommand('underline');
                        break;
                    case '=':
                    case '+':
                        e.preventDefault();
                        this.handleFontSizeChange('increase');
                        break;
                    case '-':
                        e.preventDefault();
                        this.handleFontSizeChange('decrease');
                        break;
                }
            }
        });
    }

    openModal(noteId = null) {
        const modal = document.getElementById('noteModal');
        const modalTitle = document.getElementById('modalTitle');
        const noteTitle = document.getElementById('noteTitle');
        const noteContent = document.getElementById('noteContent');
        const noteFolder = document.getElementById('noteFolder');

        // Populate folder dropdown
        this.populateFolderDropdown();

        if (noteId) {
            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                modalTitle.textContent = 'edit your masterpiece';
                noteTitle.value = note.title;
                noteContent.innerHTML = note.content || '';
                noteFolder.value = note.folder || '';
                this.currentEditingId = noteId;
            }
        } else {
            modalTitle.textContent = 'quill your thoughts';
            noteTitle.value = '';
            noteContent.innerHTML = '';
            noteFolder.value = this.currentFolder === 'all' ? '' : this.currentFolder;
            this.currentEditingId = null;
        }

        modal.style.display = 'block';
        noteTitle.focus();
    }

    closeModal() {
        const modal = document.getElementById('noteModal');
        modal.style.display = 'none';
        this.currentEditingId = null;
    }

    saveNote() {
        const noteTitle = document.getElementById('noteTitle');
        const noteContent = document.getElementById('noteContent');
        const noteFolder = document.getElementById('noteFolder');

        if (!noteTitle.value.trim()) {
            alert('hey! your note needs a catchy title');
            noteTitle.focus();
            return;
        }

        const contentText = noteContent.textContent || noteContent.innerText;
        if (!contentText.trim()) {
            alert('come on, share your brilliant thoughts! 💭');
            noteContent.focus();
            return;
        }

        const folder = noteFolder.value.trim();
        const htmlContent = noteContent.innerHTML;

        if (this.currentEditingId) {
            this.updateNote(this.currentEditingId, noteTitle.value.trim(), htmlContent, folder);
        } else {
            this.createNote(noteTitle.value.trim(), htmlContent, folder);
        }

        this.closeModal();
    }

    createNote(title, content, folder = '') {
        const note = {
            id: Date.now().toString(),
            title: title,
            content: content,
            folder: folder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.notes.unshift(note);
        this.saveNotes();
        this.renderNotes();
        this.updateNoteCounts();
    }

    updateNote(id, title, content, folder = '') {
        const noteIndex = this.notes.findIndex(n => n.id === id);
        if (noteIndex !== -1) {
            this.notes[noteIndex].title = title;
            this.notes[noteIndex].content = content;
            this.notes[noteIndex].folder = folder;
            this.notes[noteIndex].updatedAt = new Date().toISOString();
            this.saveNotes();
            this.renderNotes();
            this.updateNoteCounts();
        }
    }

    deleteNote(id) {
        if (this.currentFolder === 'trash') {
            // Permanent delete from trash
            if (confirm('permanently delete this note? this cannot be undone!')) {
                this.trashedNotes = this.trashedNotes.filter(n => n.id !== id);
                this.saveTrashedNotes();
                this.renderNotes();
                this.updateNoteCounts();
            }
        } else {
            // Move to trash
            if (confirm('move this note to trash?')) {
                const note = this.notes.find(n => n.id === id);
                if (note) {
                    note.trashedAt = new Date().toISOString();
                    this.trashedNotes.push(note);
                    this.notes = this.notes.filter(n => n.id !== id);
                    this.saveNotes();
                    this.saveTrashedNotes();
                    this.renderNotes();
                    this.updateNoteCounts();
                    this.showNotification('note moved to trash');
                }
            }
        }
    }

    renderNotes() {
        const container = document.getElementById('notesContainer');
        const filteredNotes = this.getFilteredNotes();
        
        if (filteredNotes.length === 0) {
            // Get the display name for custom folders
            let folderDisplayName = this.currentFolder;
            if (this.currentFolder !== 'all' && this.currentFolder !== 'trash') {
                const customFolder = this.findFolderById(this.currentFolder);
                folderDisplayName = customFolder ? customFolder.name : this.currentFolder;
            }
            
            const emptyMessage = this.currentFolder === 'all' 
                ? 'no chill vibes yet!'
                : `no notes in "${folderDisplayName}" yet! 📁`;
            const emptySubtext = this.currentFolder === 'all'
                ? 'click "quill something" to start your chill collection'
                : 'create a note and assign it to this folder!';
                
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: #f5e6d3; font-family: 'Space Grotesk', monospace;">
                    <h3 style="font-size: 2rem; margin-bottom: 16px;">${emptyMessage}</h3>
                    <p style="font-size: 1.2rem; opacity: 0.8;">${emptySubtext}</p>
                </div>
            `;
            return;
        }

        const isTrash = this.currentFolder === 'trash';
        container.innerHTML = filteredNotes.map(note => `
            <div class="note ${isTrash ? 'trashed-note' : ''}" ${!isTrash ? `draggable="true" data-note-id="${note.id}" ondragstart="app.handleDragStart(event)" ondragend="app.handleDragEnd(event)"` : ''}>
                <h3>${this.escapeHtml(note.title)}</h3>
                <div class="note-content">${note.content || this.escapeHtml(note.content)}</div>
                ${note.folder && !isTrash ? `<div class="note-folder">📁 ${this.escapeHtml(note.folder)}</div>` : ''}
                ${isTrash ? `<div class="note-trashed">trashed: ${this.formatDate(note.trashedAt)}</div>` : ''}
                <div class="note-date">${this.formatDate(note.updatedAt)}</div>
                <div class="note-actions">
                    ${isTrash ? `
                        <button class="restore-btn" onclick="app.restoreNote('${note.id}')">restore</button>
                        <button class="delete-btn permanent" onclick="app.deleteNote('${note.id}')">delete forever</button>
                    ` : `
                        <button class="edit-btn" onclick="app.openModal('${note.id}')">edit</button>
                        <button class="delete-btn" onclick="app.deleteNote('${note.id}')">delete</button>
                    `}
                </div>
            </div>
        `).join('');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateId() {
        return 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveNotes() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
        this.syncData();
    }

    // Load all data from Google Drive (used after connection)
    async loadFromGoogleDrive() {
        if (!window.driveService || !window.driveService.isAuthenticated) {
            console.log('Google Drive not connected, skipping load');
            return false;
        }

        try {
            console.log('Loading all data from Google Drive...');

            // Load data from Google Drive
            const [driveNotes, driveFolders] = await Promise.all([
                window.driveService.loadNotes(),
                window.driveService.loadFolders()
            ]);

            let dataLoaded = false;

            // Update notes if we got data from Drive
            if (driveNotes && Array.isArray(driveNotes) && driveNotes.length > 0) {
                console.log(`Loaded ${driveNotes.length} notes from Google Drive`);
                this.notes = driveNotes;
                dataLoaded = true;
            }

            // Update folders if we got data from Drive
            if (driveFolders && Array.isArray(driveFolders) && driveFolders.length > 0) {
                console.log(`Loaded ${driveFolders.length} folders from Google Drive`);
                this.folders = driveFolders;
                dataLoaded = true;
            }

            if (dataLoaded) {
                // Update localStorage with Drive data
                localStorage.setItem('notes', JSON.stringify(this.notes));
                localStorage.setItem('folders', JSON.stringify(this.folders));

                // Re-render the UI
                this.renderFolders();
                this.renderNotes();
                this.updateNoteCounts();

                console.log('Successfully loaded and applied data from Google Drive');

                // Show notification to user
                if (window.chillquillSettings) {
                    window.chillquillSettings.showNotification('Data loaded from Google Drive!');
                }

                return true;
            } else {
                console.log('No data found in Google Drive or data was empty');
                return false;
            }
        } catch (error) {
            console.error('Error loading data from Google Drive:', error);
            return false;
        }
    }

    // Sync data to cloud if authenticated
    async syncData() {
        // Check if Google Drive sync is enabled and authenticated
        const settings = window.chillquillSettings ? window.chillquillSettings.currentSettings : {};
        
        if (settings.driveSync && window.driveService && window.driveService.isAuthenticated) {
            // Debounce sync to avoid too many calls
            clearTimeout(this.syncTimeout);
            this.syncTimeout = setTimeout(async () => {
                try {
                    console.log('Syncing data to Google Drive...');
                    await Promise.all([
                        window.driveService.saveNotes(this.notes),
                        window.driveService.saveFolders(this.folders),
                        window.driveService.saveSettings(settings)
                    ]);
                    console.log('Data synced to Google Drive successfully');
                } catch (error) {
                    console.error('Failed to sync data to Google Drive:', error);
                    // Show notification to user
                    if (window.chillquillSettings) {
                        window.chillquillSettings.showNotification('Failed to sync to Google Drive');
                    }
                }
            }, 1000);
        }

        // Fallback: sync with auth service if available
        if (window.chillquillAuth && window.chillquillAuth.isAuthenticated) {
            clearTimeout(this.legacySyncTimeout);
            this.legacySyncTimeout = setTimeout(() => {
                window.chillquillAuth.syncData();
            }, 1000);
        }
    }

    async loadNotes() {
        // First try to load from localStorage
        const stored = localStorage.getItem('notes');
        let localNotes = stored ? JSON.parse(stored) : [];

        // If Google Drive sync is enabled, try to load from there
        const settings = window.chillquillSettings ? window.chillquillSettings.currentSettings : {};
        
        if (settings.driveSync && window.driveService && window.driveService.isAuthenticated) {
            try {
                console.log('Loading notes from Google Drive...');
                const driveNotes = await window.driveService.loadNotes();
                
                if (driveNotes && Array.isArray(driveNotes)) {
                    // Use Drive data if it exists and has more recent updates
                    if (driveNotes.length >= localNotes.length || !localNotes.length) {
                        console.log('Using notes from Google Drive');
                        // Update localStorage with Drive data
                        localStorage.setItem('notes', JSON.stringify(driveNotes));
                        return driveNotes;
                    }
                }
            } catch (error) {
                console.error('Failed to load notes from Google Drive:', error);
                // Fall back to local storage
            }
        }
        
        return localNotes;
    }

    saveFolders(folders = this.folders) {
        localStorage.setItem('folders', JSON.stringify(folders));
        this.syncData();
    }

    async loadFolders() {
        // First try to load from localStorage
        const stored = localStorage.getItem('folders');
        let localFolders = stored ? JSON.parse(stored) : [];
        
        // Convert old flat array format to new nested format
        if (Array.isArray(localFolders) && localFolders.length > 0 && typeof localFolders[0] === 'string') {
            localFolders = localFolders.map(name => ({
                id: this.generateId(),
                name: name,
                children: [],
                parentId: null
            }));
        }

        // If Google Drive sync is enabled, try to load from there
        const settings = window.chillquillSettings ? window.chillquillSettings.currentSettings : {};
        
        if (settings.driveSync && window.driveService && window.driveService.isAuthenticated) {
            try {
                console.log('Loading folders from Google Drive...');
                const driveFolders = await window.driveService.loadFolders();
                
                if (driveFolders && Array.isArray(driveFolders)) {
                    // Use Drive data if it exists and has more recent updates
                    if (driveFolders.length >= localFolders.length || !localFolders.length) {
                        console.log('Using folders from Google Drive');
                        // Update localStorage with Drive data
                        localStorage.setItem('folders', JSON.stringify(driveFolders));
                        return driveFolders;
                    }
                }
            } catch (error) {
                console.error('Failed to load folders from Google Drive:', error);
                // Fall back to local storage
            }
        }
        
        // Save any format conversions
        if (localFolders.length > 0) {
            this.saveFolders(localFolders);
        }
        
        return localFolders || [];
    }

    saveTrashedNotes() {
        localStorage.setItem('trashedNotes', JSON.stringify(this.trashedNotes));
    }

    loadTrashedNotes() {
        const stored = localStorage.getItem('trashedNotes');
        return stored ? JSON.parse(stored) : [];
    }

    // Folder management methods
    openFolderModal() {
        const modal = document.getElementById('folderModal');
        const folderName = document.getElementById('folderName');
        const modalTitle = document.getElementById('folderModalTitle');
        
        // Reset to create root folder if not explicitly set
        if (!this.currentParentFolder) {
            modalTitle.textContent = 'create new folder';
        }
        
        folderName.value = '';
        modal.style.display = 'block';
        folderName.focus();
    }

    closeFolderModal() {
        const modal = document.getElementById('folderModal');
        modal.style.display = 'none';
    }

    // AI Modal methods
    openAiModal() {
        const modal = document.getElementById('aiModal');
        const chatInput = document.getElementById('chatInput');

        modal.style.display = 'block';
        chatInput.focus();

        // Clear conversation history for new session
        if (window.aiService) {
            window.aiService.clearConversationHistory();
        }
    }

    closeAiModal() {
        const modal = document.getElementById('aiModal');
        modal.style.display = 'none';
    }

    clearChatHistory() {
        if (window.aiService) {
            window.aiService.clearConversationHistory();
        }

        // Clear the chat container except for the initial Chillian message
        const chatContainer = document.getElementById('chatContainer');
        const initialMessage = chatContainer.querySelector('.ai-message');

        if (initialMessage) {
            chatContainer.innerHTML = '';
            chatContainer.appendChild(initialMessage);
        }

        this.showNotification('Chat history cleared! 🧹');
    }

    async sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const chatContainer = document.getElementById('chatContainer');
        const message = chatInput.value.trim();

        if (!message) return;

        // Check if AI service is configured
        if (!window.aiService || !window.aiService.isReady()) {
            this.addChatMessage('AI service is not available. The proxy server may not be running. For local development, you need a PHP server to run the proxy.', 'ai');
            return;
        }

        // Add user message to chat
        this.addChatMessage(message, 'user');
        chatInput.value = '';

        try {
            // Get current note content for context
            const noteContent = this.getCurrentNoteContent();

            // Use contextual chat if we're in a note
            let response;
            if (noteContent) {
                response = await window.aiService.chatWithNoteContext(message, noteContent);
            } else {
                response = await window.aiService.chat(message);
            }

            this.addChatMessage(response, 'ai');
        } catch (error) {
            console.error('Chat error:', error);
            this.addChatMessage('Oops! I had trouble processing that. Please try again! 🤔\n\nIf this keeps happening, try changing the AI model in settings - different models handle requests differently!', 'ai');
        }
    }

    // Get current note content if in note editor
    getCurrentNoteContent() {
        const modal = document.getElementById('noteModal');
        const noteContentEl = document.getElementById('noteContent');

        // Check if we're currently in the note modal and have content
        if (modal && modal.style.display !== 'none' && noteContentEl) {
            const content = noteContentEl.innerHTML || noteContentEl.textContent || '';
            return content.trim();
        }

        // If not in note editor, return null
        return null;
    }

    // Get current mascot setting
    getCurrentMascot() {
        if (window.chillquillSettings && window.chillquillSettings.currentSettings) {
            return window.chillquillSettings.currentSettings.mascot || 'chillian';
        }
        return 'chillian'; // default
    }

    addChatMessage(message, sender) {
        const chatContainer = document.getElementById('chatContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'ai' ? 'ai-message' : 'user-message';
        
        // Ensure message is a string and handle null/undefined
        const safeMessage = message ? String(message).replace(/\n/g, '<br>') : 'No message content';
        
        // Get current mascot for AI messages
        let avatar;
        if (sender === 'ai') {
            const currentMascot = this.getCurrentMascot();
            const mascotImage = currentMascot === 'oldgrumps' ? 'images/oldgrumps.png' : 'images/chillian_brown.png';
            const mascotName = currentMascot === 'oldgrumps' ? 'Old Grumps' : 'Chillian';
            avatar = `<img src="${mascotImage}" alt="${mascotName}" class="message-avatar">`;
        } else {
            avatar = '<div class="message-avatar" style="background: #8b755d; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #f5e6d3; font-weight: bold;">You</div>';
        }
        
        messageDiv.innerHTML = `
            ${avatar}
            <div class="message-content">
                ${safeMessage}
            </div>
        `;
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async enhanceCurrentNote() {
        const noteContent = document.getElementById('noteContent');
        const content = noteContent.innerHTML;

        if (!content.trim()) {
            alert('Write some content first, then I can help enhance it! ✍️');
            noteContent.focus();
            return;
        }

        // Check if AI service is configured
        if (!window.aiService || !window.aiService.isReady()) {
            alert('AI service is not available. The proxy server may not be running. For local development, you need a PHP server.');
            return;
        }

        try {
            // Show loading state with time warning
            this.showLoadingState('Chillian is enhancing your note... ✨<br><small style="opacity: 0.8; font-size: 14px;">⏱️ This may take 15-30 seconds</small>');

            const enhancedContent = await window.aiService.enhanceNote(content);
            noteContent.innerHTML = enhancedContent;
            
            this.hideLoadingState();
            this.showNotification('Note enhanced by Chillian AI! 🎉');
        } catch (error) {
            console.error('Enhancement error:', error);
            this.hideLoadingState();
            alert(error.message || 'Enhancement failed. Please try again! 🤔');
        }
    }

    async createQuizFromNote() {
        const noteContent = document.getElementById('noteContent');
        const content = noteContent.innerHTML;

        if (!content.trim()) {
            alert('Write some content first, then I can create a quiz!');
            noteContent.focus();
            return;
        }

        // Check if AI service is configured
        if (!window.aiService || !window.aiService.isReady()) {
            alert('AI service is not available. The proxy server may not be running. For local development, you need a PHP server.');
            return;
        }

        try {
            // Show loading state with time warning
            this.showLoadingState('Chillian is creating your quiz...<br><small style="opacity: 0.8; font-size: 14px;">⏱️ This may take 30-60 seconds for complex content</small>');

            const quiz = await window.aiService.createQuiz(content);
            
            // Show quiz in a separate modal instead of adding to notes
            this.showQuizModal(quiz);
            
            this.hideLoadingState();
            this.showNotification('Quiz created by Chillian AI!');
        } catch (error) {
            console.error('Quiz creation error:', error);
            this.hideLoadingState();
            alert(error.message || 'Quiz creation failed. Please try again!');
        }
    }

    showQuizModal(quizHTML) {
        // Create quiz modal if it doesn't exist
        let quizModal = document.getElementById('quizModal');
        if (!quizModal) {
            quizModal = document.createElement('div');
            quizModal.id = 'quizModal';
            quizModal.className = 'modal';
            quizModal.innerHTML = `
                <div class="modal-content quiz-modal-content">
                    <div class="modal-header">
                        <h3>Your Generated Quiz</h3>
                        <span class="close" id="closeQuizModal">&times;</span>
                    </div>
                    <div class="modal-body quiz-modal-body">
                        <div id="quizContent"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(quizModal);

            // Add event listeners
            const closeQuizModal = document.getElementById('closeQuizModal');
            closeQuizModal.addEventListener('click', () => this.closeQuizModal());
            
            quizModal.addEventListener('click', (e) => {
                if (e.target === quizModal) {
                    this.closeQuizModal();
                }
            });
        }

        // Set the quiz content
        const quizContent = document.getElementById('quizContent');
        quizContent.innerHTML = quizHTML;

        // Show the modal
        quizModal.style.display = 'block';
    }

    closeQuizModal() {
        const quizModal = document.getElementById('quizModal');
        if (quizModal) {
            quizModal.style.display = 'none';
        }
    }

    showLoadingState(message) {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(26, 26, 26, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            backdrop-filter: blur(5px);
        `;
        
        overlay.innerHTML = `
            <div style="
                background: linear-gradient(145deg, #f5e6d3 0%, #e6d7c3 100%);
                padding: 32px;
                border-radius: 20px;
                border: 2px solid #8b755d;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            ">
                <img src="images/chillian_brown.png" alt="Chillian" style="
                    width: 64px;
                    height: 64px;
                    margin-bottom: 16px;
                    animation: spin 2s linear infinite;
                ">
                <h3 style="
                    color: #1a1a1a;
                    font-family: 'Space Grotesk', monospace;
                    font-size: 18px;
                    margin-bottom: 8px;
                ">${message}</h3>
                <p style="
                    color: #8b755d;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 14px;
                ">please wait a moment...</p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(overlay);
    }

    hideLoadingState() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    saveFolder() {
        const folderName = document.getElementById('folderName');
        const name = folderName.value.trim();

        if (!name) {
            alert('hey! your folder needs a name! 📁');
            folderName.focus();
            return;
        }

        if (this.folderExists(name, this.currentParentFolder)) {
            alert('this folder already exists! try a different name 🤔');
            folderName.focus();
            return;
        }

        const newFolder = {
            id: this.generateId(),
            name: name,
            children: [],
            parentId: this.currentParentFolder
        };

        if (this.currentParentFolder) {
            const parentFolder = this.findFolderById(this.currentParentFolder);
            if (parentFolder) {
                parentFolder.children.push(newFolder);
            }
        } else {
            this.folders.push(newFolder);
        }

        this.saveFolders();
        this.renderFolders();
        this.closeFolderModal();
        this.currentParentFolder = null;
    }

    deleteFolder(folderName) {
        if (confirm(`are you sure you want to delete the "${folderName}" folder? notes will become unorganized! 🗑️`)) {
            this.folders = this.folders.filter(f => f !== folderName);
            // Remove folder from notes
            this.notes.forEach(note => {
                if (note.folder === folderName) {
                    note.folder = '';
                }
            });
            this.saveFolders();
            this.saveNotes();
            this.renderFolders();
            this.renderNotes();
            this.updateNoteCounts();
            
            // Switch to "all" if we deleted the current folder
            if (this.currentFolder === folderName) {
                this.switchFolder('all');
            }
        }
    }

    deleteFolderById(folderId) {
        const folder = this.findFolderById(folderId);
        if (!folder) return;
        
        if (confirm(`are you sure you want to delete the "${folder.name}" folder? all subfolders and notes will become unorganized! 🗑️`)) {
            this.removeFolderById(folderId);
            // Remove folder from notes
            this.notes.forEach(note => {
                if (note.folder === folderId) {
                    note.folder = '';
                }
            });
            this.saveFolders();
            this.saveNotes();
            this.renderFolders();
            this.renderNotes();
            this.updateNoteCounts();
            
            // Switch to "all" if we deleted the current folder
            if (this.currentFolder === folderId) {
                this.switchFolder('all');
            }
        }
    }

    removeFolderById(folderId) {
        const removeFromArray = (folders) => {
            for (let i = 0; i < folders.length; i++) {
                if (folders[i].id === folderId) {
                    folders.splice(i, 1);
                    return true;
                }
                if (removeFromArray(folders[i].children)) {
                    return true;
                }
            }
            return false;
        };
        removeFromArray(this.folders);
    }

    // Helper methods for nested folders
    folderExists(name, parentId = null) {
        const searchIn = parentId ? this.findFolderById(parentId)?.children || [] : this.folders;
        return searchIn.some(folder => folder.name === name);
    }

    findFolderById(id) {
        const search = (folders) => {
            for (const folder of folders) {
                if (folder.id === id) return folder;
                const found = search(folder.children);
                if (found) return found;
            }
            return null;
        };
        return search(this.folders);
    }

    getFolderFullPath(folderId) {
        const folder = this.findFolderById(folderId);
        if (!folder) return '';
        
        const path = [folder.name];
        let current = folder;
        while (current.parentId) {
            current = this.findFolderById(current.parentId);
            if (current) path.unshift(current.name);
        }
        return path.join(' / ');
    }

    getAllFolders() {
        const flatten = (folders) => {
            let result = [];
            folders.forEach(folder => {
                result.push(folder);
                result = result.concat(flatten(folder.children));
            });
            return result;
        };
        return flatten(this.folders);
    }

    openSubfolderModal(parentFolderId) {
        this.currentParentFolder = parentFolderId;
        const parentFolder = this.findFolderById(parentFolderId);
        const modalTitle = document.getElementById('folderModalTitle');
        if (parentFolder) {
            modalTitle.textContent = `create subfolder in "${parentFolder.name}"`;
        } else {
            modalTitle.textContent = 'create new folder';
        }
        this.openFolderModal();
    }

    showFolderContextMenu(event, folderId) {
        event.preventDefault();
        // For now, just open the subfolder modal
        this.openSubfolderModal(folderId);
    }

    switchFolder(folderName) {
        this.currentFolder = folderName;
        
        // Update active folder styling
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeFolder = document.querySelector(`[data-folder="${folderName}"]`);
        if (activeFolder) {
            activeFolder.classList.add('active');
        }
        
        // Update header title
        let title;
        if (folderName === 'all') {
            title = 'quirky notes';
        } else if (folderName === 'trash') {
            title = 'trash';
        } else {
            // Find the custom folder by ID (including subfolders) and use its display name
            const customFolder = this.findFolderById(folderName);
            title = customFolder ? customFolder.name : folderName;
        }
        document.getElementById('currentFolderTitle').textContent = title;
        
        this.renderNotes();
    }

    renderFolders() {
        const folderList = document.getElementById('folderList');
        
        let html = `
            <div class="folder-item ${this.currentFolder === 'all' ? 'active' : ''}" data-folder="all" onclick="app.switchFolder('all')" ondrop="app.handleDrop(event)" ondragover="app.handleDragOver(event)" ondragleave="app.handleDragLeave(event)">
                <span class="folder-icon custom-folder-icon"></span>
                <span class="folder-name">all notes</span>
                <span class="note-count" id="allCount">0</span>
            </div>
        `;
        
        // Render nested folders
        const renderFolderTree = (folders, depth = 0, parentExpanded = true) => {
            folders.forEach(folder => {
                const indentStyle = depth > 0 ? `style="padding-left: ${20 + (depth * 16)}px;"` : '';
                const folderKey = folder.id || folder.name; // Support both old and new format
                const isActive = this.currentFolder === folderKey;
                const hasChildren = folder.children && folder.children.length > 0;
                const isExpanded = this.expandedFolders.has(folder.id);
                const isVisible = depth === 0 || parentExpanded;
                
                // Choose appropriate icons
                let folderIconClass;
                if (hasChildren) {
                    folderIconClass = 'custom-folder-icon';
                } else {
                    folderIconClass = depth > 0 ? 'custom-file-icon' : 'custom-folder-icon';
                }
                
                const expandToggle = hasChildren ? 
                    `<span class="folder-toggle" onclick="event.stopPropagation(); app.toggleFolder('${folder.id}')" title="${isExpanded ? 'collapse' : 'expand'} folder">
                        ${isExpanded ? '▼' : '▶'}
                    </span>` : 
                    '<span class="folder-toggle-spacer"></span>';
                
                const visibilityStyle = isVisible ? '' : 'style="display: none;"';
                
                html += `
                    <div class="folder-item ${isActive ? 'active' : ''}" data-folder="${folderKey}" data-folder-id="${folder.id}" ${visibilityStyle} onclick="app.switchFolder('${folderKey}')" ondrop="app.handleDrop(event)" ondragover="app.handleDragOver(event)" ondragleave="app.handleDragLeave(event)" ${indentStyle} oncontextmenu="app.showFolderContextMenu(event, '${folder.id}')">
                        ${expandToggle}
                        <span class="folder-icon ${folderIconClass}"></span>
                        <span class="folder-name">${this.escapeHtml(folder.name)}</span>
                        <span class="note-count" id="count-${folderKey}">0</span>
                        <button class="delete-folder-btn" onclick="event.stopPropagation(); app.deleteFolderById('${folder.id}')" title="delete folder">&times;</button>
                        <button class="add-subfolder-btn" onclick="event.stopPropagation(); app.openSubfolderModal('${folder.id}')" title="add subfolder">+</button>
                    </div>
                `;
                
                if (hasChildren) {
                    renderFolderTree(folder.children, depth + 1, isExpanded);
                }
            });
        };
        
        renderFolderTree(this.folders);
        
        // Add trash folder at the end
        html += `
            <div class="folder-item trash-folder ${this.currentFolder === 'trash' ? 'active' : ''}" data-folder="trash" onclick="app.switchFolder('trash')">
                <span class="folder-icon custom-trash-icon"></span>
                <span class="folder-name">trash</span>
                <span class="note-count" id="trashCount">0</span>
            </div>
        `;
        
        folderList.innerHTML = html;
    }

    toggleFolder(folderId) {
        if (this.expandedFolders.has(folderId)) {
            this.expandedFolders.delete(folderId);
        } else {
            this.expandedFolders.add(folderId);
        }
        
        // Save expanded state to localStorage
        localStorage.setItem('expandedFolders', JSON.stringify([...this.expandedFolders]));
        
        // Re-render folders to update visibility
        this.renderFolders();
    }

    loadExpandedFolders() {
        try {
            const stored = localStorage.getItem('expandedFolders');
            if (stored) {
                this.expandedFolders = new Set(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load expanded folders:', error);
            this.expandedFolders = new Set();
        }
    }

    getFilteredNotes() {
        if (this.currentFolder === 'all') {
            return this.notes;
        } else if (this.currentFolder === 'trash') {
            return this.trashedNotes;
        }
        return this.notes.filter(note => note.folder === this.currentFolder);
    }
    
    restoreNote(id) {
        const note = this.trashedNotes.find(n => n.id === id);
        if (note) {
            delete note.trashedAt;
            this.notes.push(note);
            this.trashedNotes = this.trashedNotes.filter(n => n.id !== id);
            this.saveNotes();
            this.saveTrashedNotes();
            this.renderNotes();
            this.updateNoteCounts();
            this.showNotification('note restored');
        }
    }

    updateNoteCounts() {
        // Update "all notes" count
        const allCount = document.getElementById('allCount');
        if (allCount) allCount.textContent = this.notes.length;
        
        // Update individual folder counts
        const allFolders = this.getAllFolders();
        allFolders.forEach(folder => {
            const count = this.notes.filter(note => note.folder === folder.id).length;
            const countElement = document.getElementById(`count-${folder.id}`);
            if (countElement) countElement.textContent = count;
        });
        
        // Update trash count
        const trashCount = document.getElementById('trashCount');
        if (trashCount) trashCount.textContent = this.trashedNotes.length;
    }

    populateFolderDropdown() {
        const select = document.getElementById('noteFolder');
        select.innerHTML = '<option value="">choose a folder...</option>';
        
        const allFolders = this.getAllFolders();
        allFolders.forEach(folder => {
            const option = document.createElement('option');
            option.value = folder.id;
            option.textContent = this.getFolderFullPath(folder.id);
            select.appendChild(option);
        });
    }

    // Drag and Drop methods
    handleDragStart(event) {
        const noteElement = event.target;
        const noteId = noteElement.dataset.noteId;
        
        event.dataTransfer.setData('text/plain', noteId);
        event.dataTransfer.effectAllowed = 'move';
        
        noteElement.classList.add('dragging');
        
        // Store the dragged note ID for later use
        this.draggedNoteId = noteId;
    }

    handleDragEnd(event) {
        const noteElement = event.target;
        noteElement.classList.remove('dragging');
        this.draggedNoteId = null;
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const folderElement = event.currentTarget;
        if (!folderElement.classList.contains('drag-over')) {
            folderElement.classList.add('drag-over');
        }
    }

    handleDragLeave(event) {
        const folderElement = event.currentTarget;
        
        // Only remove drag-over if we're actually leaving the element
        const rect = folderElement.getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;
        
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
            folderElement.classList.remove('drag-over');
        }
    }

    handleDrop(event) {
        event.preventDefault();
        
        const folderElement = event.currentTarget;
        const targetFolder = folderElement.dataset.folder;
        const noteId = event.dataTransfer.getData('text/plain');
        
        // Remove drag-over styling
        folderElement.classList.remove('drag-over');
        
        if (noteId && this.draggedNoteId) {
            this.moveNoteToFolder(noteId, targetFolder === 'all' ? '' : targetFolder);
        }
    }

    moveNoteToFolder(noteId, targetFolder) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            const oldFolder = note.folder || 'all';
            const newFolder = targetFolder || 'all';
            
            // Only update if the folder actually changed
            if (oldFolder !== newFolder) {
                note.folder = targetFolder;
                note.updatedAt = new Date().toISOString();
                
                this.saveNotes();
                this.renderNotes();
                this.updateNoteCounts();
                
                // Show a subtle notification
                this.showNotification(`note moved to ${newFolder === 'all' ? 'all notes' : newFolder}!`);
            }
        }
    }

    showNotification(message) {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #8b755d 0%, #a0896b 100%);
            color: #f5e6d3;
            padding: 12px 20px;
            border-radius: 20px;
            font-family: 'Space Grotesk', monospace;
            font-weight: 600;
            font-size: 14px;
            z-index: 2000;
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
        }, 2000);
    }

    // Rich text formatting methods
    handleFormatCommand(button) {
        const command = button.dataset.command;
        const value = button.dataset.value;
        const editor = document.getElementById('noteContent');
        
        // Focus the editor first
        editor.focus();
        
        if (command === 'hiliteColor') {
            const colorPicker = document.getElementById('highlightColor');
            colorPicker.click();
            return;
        }
        
        if (command === 'foreColor') {
            const colorPicker = document.getElementById('fontColor');
            colorPicker.click();
            return;
        }
        
        if (command === 'fontSize') {
            this.handleFontSizeChange(value);
            return;
        }
        
        this.execCommand(command);
        this.updateToolbarState();
    }

    execCommand(command, value = null) {
        try {
            return document.execCommand(command, false, value);
        } catch (e) {
            console.warn('execCommand failed:', command, value, e);
            return false;
        }
    }

    applyHighlight(color) {
        const editor = document.getElementById('noteContent');
        editor.focus();
        this.execCommand('hiliteColor', color);
        this.updateToolbarState();
    }

    applyFontColor(color) {
        const editor = document.getElementById('noteContent');
        editor.focus();
        
        // Try modern approach first, fall back to execCommand
        if (document.queryCommandSupported && document.queryCommandSupported('styleWithCSS')) {
            document.execCommand('styleWithCSS', false, true);
        }
        
        const success = this.execCommand('foreColor', color);
        
        // If execCommand doesn't work, try alternative approach
        if (!success) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const span = document.createElement('span');
                span.style.color = color;
                
                try {
                    range.surroundContents(span);
                } catch (e) {
                    // If surroundContents fails, extract and wrap content
                    const content = range.extractContents();
                    span.appendChild(content);
                    range.insertNode(span);
                }
                
                // Clear and restore selection
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNodeContents(span);
                selection.addRange(newRange);
            }
        }
        
        this.updateToolbarState();
    }

    updateToolbarState() {
        // Update button active states based on current selection
        const commands = ['bold', 'italic', 'underline', 'insertUnorderedList'];
        
        commands.forEach(command => {
            const button = document.querySelector(`[data-command="${command}"]`);
            if (button) {
                if (document.queryCommandState(command)) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        });
        
        // Update font size select based on current selection
        this.updateFontSizeSelect();
    }
    
    handleFontSizeChange(direction) {
        const fontSizeSelect = document.getElementById('fontSizeSelect');
        const currentIndex = Array.from(fontSizeSelect.options).findIndex(option => option.selected);
        
        let newIndex;
        if (direction === 'increase') {
            newIndex = Math.min(currentIndex + 1, fontSizeSelect.options.length - 1);
        } else if (direction === 'decrease') {
            newIndex = Math.max(currentIndex - 1, 0);
        }
        
        if (newIndex !== undefined && newIndex !== currentIndex) {
            fontSizeSelect.selectedIndex = newIndex;
            this.applyFontSize(fontSizeSelect.value);
        }
    }
    
    applyFontSize(size) {
        const editor = document.getElementById('noteContent');
        editor.focus();
        
        // Use fontSize command with pixel values
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (!range.collapsed) {
                // Wrap selected text in span with font size
                const span = document.createElement('span');
                span.style.fontSize = size;
                try {
                    range.surroundContents(span);
                } catch (e) {
                    // If surroundContents fails, extract and wrap content
                    const contents = range.extractContents();
                    span.appendChild(contents);
                    range.insertNode(span);
                }
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        
        this.updateToolbarState();
    }
    
    updateFontSizeSelect() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
                ? range.commonAncestorContainer.parentElement 
                : range.commonAncestorContainer;
                
            // Find the closest element with font-size style
            let element = parentElement;
            while (element && element !== document.getElementById('noteContent')) {
                const fontSize = window.getComputedStyle(element).fontSize;
                if (fontSize && element.style.fontSize) {
                    const fontSizeSelect = document.getElementById('fontSizeSelect');
                    const option = Array.from(fontSizeSelect.options).find(opt => opt.value === element.style.fontSize);
                    if (option) {
                        fontSizeSelect.value = option.value;
                        return;
                    }
                }
                element = element.parentElement;
            }
        }
    }
}

const app = new NotesApp();
// Make the app globally available for Google Drive sync
window.notesApp = app;

// Settings will initialize themselves on DOMContentLoaded
// We just need to make sure window.notesApp is available immediately