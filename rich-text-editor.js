class RichTextEditor {
    constructor() {
        this.editor = null;
        this.toolbar = null;
        this.inlineFontSelect = null;
        this.init();
    }

    init() {
        this.editor = document.getElementById('noteContent');
        this.toolbar = document.getElementById('formattingToolbar');
        this.inlineFontSelect = document.getElementById('inlineFont');
        
        if (this.editor && this.toolbar && this.inlineFontSelect) {
            this.bindEvents();
        }
    }

    bindEvents() {
        // Font selection for selected text
        this.inlineFontSelect.addEventListener('change', (e) => {
            this.applyFontToSelection(e.target.value);
        });

        // Format buttons (Bold, Italic, Underline)
        const formatBtns = this.toolbar.querySelectorAll('.format-btn');
        formatBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const command = btn.getAttribute('data-command');
                this.executeCommand(command);
                this.updateButtonStates();
            });
        });

        // Update button states when selection changes
        this.editor.addEventListener('mouseup', () => this.updateButtonStates());
        this.editor.addEventListener('keyup', () => this.updateButtonStates());
        this.editor.addEventListener('focus', () => this.updateButtonStates());
    }

    applyFontToSelection(fontFamily) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return; // No text selected

        // Load Google Font if needed
        this.loadGoogleFont(fontFamily);

        // Create span element with font family
        const span = document.createElement('span');
        if (fontFamily && fontFamily !== '') {
            span.style.fontFamily = fontFamily + ', sans-serif';
        }

        try {
            // Extract selected content and wrap it in the span
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);

            // Clear selection
            selection.removeAllRanges();
        } catch (error) {
            console.error('Error applying font to selection:', error);
        }

        // Reset font selector
        this.inlineFontSelect.value = '';
    }

    executeCommand(command) {
        document.execCommand(command, false, null);
    }

    updateButtonStates() {
        const formatBtns = this.toolbar.querySelectorAll('.format-btn');
        formatBtns.forEach(btn => {
            const command = btn.getAttribute('data-command');
            if (document.queryCommandState(command)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
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
            'Lexend', 'Outfit', 'Space Grotesk', 'Sora', 'Be Vietnam Pro', 'Albert Sans'
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

    // Utility method to get the current font family of selected text
    getCurrentFontFamily() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE 
            ? range.commonAncestorContainer.parentElement 
            : range.commonAncestorContainer;

        return window.getComputedStyle(element).fontFamily;
    }

    // Clean up empty spans that might be created
    cleanupEmptySpans() {
        const spans = this.editor.querySelectorAll('span');
        spans.forEach(span => {
            if (!span.textContent.trim() && !span.innerHTML.trim()) {
                span.remove();
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.richTextEditor = new RichTextEditor();
});

// Also initialize if DOM is already loaded
if (document.readyState !== 'loading') {
    window.richTextEditor = new RichTextEditor();
}