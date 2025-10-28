class ChillQuillAuth {
    constructor() {
        this.clerk = null;
        this.isAuthenticated = false;
        this.currentUser = null;
        this.hasShownWelcome = false;
        this.listenerAdded = false;
        this.lastSignInTime = 0;
        this.init();
    }

    async init() {
        try {
            // Wait for Clerk to load
            await this.waitForClerk();
            
            // Initialize Clerk
            await window.Clerk.load();
            this.clerk = window.Clerk;
            
            // Set up authentication listeners
            this.setupAuthListeners();
            
            // Check initial authentication state
            await this.checkAuthState();
            
            console.log('Clerk authentication initialized');
        } catch (error) {
            console.error('Failed to initialize Clerk:', error);
            // Fall back to local storage if Clerk fails
            this.initializeApp();
        }
    }

    waitForClerk() {
        return new Promise((resolve) => {
            const checkClerk = () => {
                if (window.Clerk) {
                    resolve();
                } else {
                    setTimeout(checkClerk, 100);
                }
            };
            checkClerk();
        });
    }

    setupAuthListeners() {
        // Prevent adding multiple listeners
        if (this.listenerAdded) {
            return;
        }
        
        this.clerk.addListener(({ user, session }) => {
            console.log('Auth state changed, user:', !!user);
            
            if (user && session && session.status === 'active') {
                this.handleSignIn(user);
            } else {
                this.handleSignOut();
            }
        });
        
        this.listenerAdded = true;
        console.log('Auth listener added');
    }

    async checkAuthState() {
        const user = this.clerk.user;
        const session = this.clerk.session;
        
        if (user && session && session.status === 'active') {
            this.handleSignIn(user);
        } else {
            this.showAuthInterface();
        }
    }

    async handleSignIn(user) {
        console.log('handleSignIn called for:', user.emailAddresses[0].emailAddress);
        
        // Prevent rapid-fire duplicate processing
        const now = Date.now();
        if (this.isAuthenticated && this.currentUser && this.currentUser.id === user.id) {
            if (now - this.lastSignInTime < 5000) {
                console.log('Skipping duplicate sign-in (too soon)');
                return;
            }
        }
        
        this.lastSignInTime = now;
        this.isAuthenticated = true;
        this.currentUser = user;
        
        // Hide auth interface and show app
        this.hideAuthInterface();
        this.showApp();
        
        // Show sign-out button
        this.showSignOutButton();
        
        // Initialize the main app
        this.initializeApp();
        
        // Show welcome message only once per session
        if (!this.hasShownWelcome) {
            this.showWelcomeMessage(user);
            this.hasShownWelcome = true;
        }
    }

    handleSignOut() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.hasShownWelcome = false;
        
        console.log('User signed out');
        
        // Hide sign-out button
        this.hideSignOutButton();
        
        // Show auth interface
        this.showAuthInterface();
        this.hideApp();
    }

    showAuthInterface() {
        // Create or show auth interface
        let authContainer = document.getElementById('auth-container');
        if (!authContainer) {
            authContainer = this.createAuthInterface();
            document.body.appendChild(authContainer);
        }
        authContainer.style.display = 'flex';
    }

    createAuthInterface() {
        const authContainer = document.createElement('div');
        authContainer.id = 'auth-container';
        authContainer.innerHTML = `
            <div class="landing-page">
                <div class="landing-hero">
                    <img src="images/chillian_brown.png" alt="Chillian" class="hero-chillian">
                    <h1>chillquill</h1>
                    <p class="hero-tagline">the most chill way to take notes</p>
                    <p class="hero-description">write, organize, and get AI help with your thoughts - all in one beautifully simple app</p>
                </div>

                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 21H5V3H13V9H19V21ZM12 12C10.34 12 9 13.34 9 15S10.34 18 12 18 15 16.66 15 15 13.66 12 12 12M12 16C11.45 16 11 15.55 11 15S11.45 14 12 14 13 14.45 13 15 12.55 16 12 16Z"/>
                            </svg>
                        </div>
                        <h3>AI-Powered Writing</h3>
                        <p>Meet Chillian, your AI writing assistant powered by leading AI models that helps brainstorm, edit, and enhance your notes</p>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
                            </svg>
                        </div>
                        <h3>Smart Organization</h3>
                        <p>Keep your thoughts organized with folders, tags, and lightning-fast search across all your notes</p>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,17H7V15H14M17,13H7V11H17M17,9H7V7H17M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z"/>
                            </svg>
                        </div>
                        <h3>Rich Text Editor</h3>
                        <p>Format your notes beautifully with bold, italics, lists, and more - all with simple shortcuts</p>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                            </svg>
                        </div>
                        <h3>Privacy First</h3>
                        <p>Your notes stay on your device. Sign in for sync across devices or use completely offline</p>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                            </svg>
                        </div>
                        <h3>Lightning Fast</h3>
                        <p>No loading screens, no delays. Your thoughts flow as fast as you can type them</p>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,9A1.5,1.5 0 0,1 19,10.5A1.5,1.5 0 0,1 17.5,12M14.5,8A1.5,1.5 0 0,1 13,6.5A1.5,1.5 0 0,1 14.5,5A1.5,1.5 0 0,1 16,6.5A1.5,1.5 0 0,1 14.5,8M9.5,8A1.5,1.5 0 0,1 8,6.5A1.5,1.5 0 0,1 9.5,5A1.5,1.5 0 0,1 11,6.5A1.5,1.5 0 0,1 9.5,8M6.5,12A1.5,1.5 0 0,1 5,10.5A1.5,1.5 0 0,1 6.5,9A1.5,1.5 0 0,1 8,10.5A1.5,1.5 0 0,1 6.5,12M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A1.5,1.5 0 0,0 13.5,19.5C13.5,19.11 13.35,18.76 13.11,18.5C12.88,18.23 12.73,17.88 12.73,17.5A1.5,1.5 0 0,1 14.23,16H16A5,5 0 0,0 21,11C21,6.58 16.97,3 12,3Z"/>
                            </svg>
                        </div>
                        <h3>Beautiful Themes</h3>
                        <p>Choose from warm browns, dark mode, forest green, and more to match your vibe</p>
                    </div>
                </div>

                <div class="cta-section">
                    <h2>ready to get started?</h2>
                    <p>join thousands of writers who've found their flow with chillquill</p>
                    
                    <div class="auth-buttons">
                        <button id="signInWithGoogle" class="auth-btn google-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Sign in with Google
                        </button>
                        
                        <button id="signInWithEmail" class="auth-btn email-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z"/>
                            </svg>
                            sign up with email
                        </button>
                        
                        <button id="continueOffline" class="auth-btn offline-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            try offline first
                        </button>
                    </div>
                    
                    <div class="auth-footer">
                        <p>your data stays private • works completely offline • no ads ever</p>
                        <div class="auth-links">
                            <a href="privacy.html" target="_blank">privacy policy</a>
                            <span class="auth-separator">•</span>
                            <a href="terms.html" target="_blank">terms of service</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #auth-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                overflow-y: auto;
                padding: 20px 0;
            }
            
            .landing-page {
                background: linear-gradient(145deg, #f5e6d3 0%, #e6d7c3 100%);
                border: 2px solid #8b755d;
                border-radius: 20px;
                padding: 60px 40px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                max-width: 1000px;
                width: 95%;
                text-align: center;
                margin: auto;
            }
            
            /* Hero Section */
            .landing-hero {
                margin-bottom: 60px;
            }
            
            .hero-chillian {
                width: 120px;
                height: 120px;
                margin-bottom: 30px;
                filter: drop-shadow(3px 3px 6px rgba(0, 0, 0, 0.2));
                animation: float 6s ease-in-out infinite;
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }
            
            .landing-hero h1 {
                color: #1a1a1a;
                font-family: 'Space Grotesk', monospace;
                font-size: 48px;
                font-weight: 800;
                margin: 0 0 16px 0;
                text-transform: lowercase;
                letter-spacing: -1px;
            }
            
            .hero-tagline {
                color: #8b755d;
                font-family: 'Space Grotesk', monospace;
                font-size: 24px;
                font-weight: 500;
                margin: 0 0 16px 0;
                text-transform: lowercase;
            }
            
            .hero-description {
                color: #5a5a5a;
                font-family: 'JetBrains Mono', monospace;
                font-size: 16px;
                line-height: 1.6;
                margin: 0;
                max-width: 600px;
                margin: 0 auto;
            }
            
            /* Features Grid */
            .features-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 30px;
                margin-bottom: 60px;
            }
            
            .feature-card {
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid #d4c4a8;
                border-radius: 16px;
                padding: 30px 25px;
                text-align: center;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
            }
            
            .feature-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 25px rgba(139, 117, 93, 0.2);
                background: rgba(255, 255, 255, 0.9);
            }
            
            .feature-icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 16px auto;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #8b755d;
                background: rgba(139, 117, 93, 0.1);
                border-radius: 16px;
                transition: all 0.3s ease;
            }
            
            .feature-card:hover .feature-icon {
                background: rgba(139, 117, 93, 0.2);
                transform: scale(1.1);
            }
            
            .feature-icon svg {
                width: 32px;
                height: 32px;
            }
            
            .feature-card h3 {
                color: #1a1a1a;
                font-family: 'Space Grotesk', monospace;
                font-size: 20px;
                font-weight: 700;
                margin: 0 0 12px 0;
                text-transform: lowercase;
            }
            
            .feature-card p {
                color: #5a5a5a;
                font-family: 'JetBrains Mono', monospace;
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
            }
            
            /* CTA Section */
            .cta-section h2 {
                color: #1a1a1a;
                font-family: 'Space Grotesk', monospace;
                font-size: 36px;
                font-weight: 700;
                margin: 0 0 16px 0;
                text-transform: lowercase;
            }
            
            .cta-section > p {
                color: #8b755d;
                font-family: 'JetBrains Mono', monospace;
                font-size: 16px;
                margin: 0 0 40px 0;
            }
            
            /* Auth Buttons */
            .auth-buttons {
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin-bottom: 40px;
                max-width: 400px;
                margin-left: auto;
                margin-right: auto;
            }
            
            .auth-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 18px 32px;
                border: 2px solid #8b755d;
                border-radius: 50px;
                font-family: 'Space Grotesk', monospace;
                font-size: 16px;
                font-weight: 600;
                text-transform: lowercase;
                letter-spacing: 0.5px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .google-btn {
                background: #ffffff;
                color: #1a1a1a;
                border-color: #dadce0;
            }
            
            .google-btn:hover {
                background: #f8f9fa;
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
            }
            
            .email-btn {
                background: linear-gradient(135deg, #8b755d 0%, #a0896b 100%);
                color: #f5e6d3;
                border-color: #8b755d;
            }
            
            .email-btn:hover {
                background: linear-gradient(135deg, #a0896b 0%, #b89977 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(139, 117, 93, 0.3);
            }
            
            .offline-btn {
                background: transparent;
                color: #8b755d;
                border-color: #8b755d;
            }
            
            .offline-btn:hover {
                background: rgba(139, 117, 93, 0.1);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(139, 117, 93, 0.2);
            }
            
            /* Footer */
            .auth-footer {
                color: #6c757d;
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                line-height: 1.6;
            }
            
            .auth-footer p {
                margin: 0 0 16px 0;
            }
            
            .auth-links a {
                color: #8b755d;
                text-decoration: underline;
                cursor: pointer;
                transition: color 0.3s ease;
            }
            
            .auth-links a:hover {
                color: #a0896b;
            }

            .auth-separator {
                color: #8b755d;
                margin: 0 8px;
                font-weight: 300;
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .landing-page {
                    padding: 40px 25px;
                }
                
                .landing-hero h1 {
                    font-size: 36px;
                }
                
                .hero-tagline {
                    font-size: 20px;
                }
                
                .hero-description {
                    font-size: 14px;
                }
                
                .features-grid {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                
                .cta-section h2 {
                    font-size: 28px;
                }
                
                .auth-btn {
                    font-size: 14px;
                    padding: 16px 24px;
                }
            }
        `;
        
        authContainer.appendChild(style);

        // Bind events
        setTimeout(() => {
            const googleBtn = document.getElementById('signInWithGoogle');
            const emailBtn = document.getElementById('signInWithEmail');
            const offlineBtn = document.getElementById('continueOffline');

            if (googleBtn) {
                googleBtn.addEventListener('click', () => this.signInWithGoogle());
            }
            
            if (emailBtn) {
                emailBtn.addEventListener('click', () => this.signInWithEmail());
            }
            
            if (offlineBtn) {
                offlineBtn.addEventListener('click', () => this.continueOffline());
            }
        }, 100);

        return authContainer;
    }

    hideAuthInterface() {
        const authContainer = document.getElementById('auth-container');
        if (authContainer) {
            authContainer.style.display = 'none';
        }
    }

    showApp() {
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) {
            appLayout.style.display = 'flex';
        }
    }

    hideApp() {
        const appLayout = document.querySelector('.app-layout');
        if (appLayout) {
            appLayout.style.display = 'none';
        }
    }

    async signInWithGoogle() {
        try {
            console.log('Starting Google sign-in...');
            
            // Prevent multiple sign-in attempts
            if (this.clerk.session && this.clerk.session.status === 'active') {
                console.log('Already have active session, skipping sign-in');
                return;
            }
            
            // Use Clerk's sign-in modal
            this.clerk.openSignIn();
            
        } catch (error) {
            console.error('Google sign-in error:', error);
            this.showError('Failed to open sign-in. Please try again.');
        }
    }

    async signInWithEmail() {
        try {
            // Use Clerk's sign-in modal for email
            this.clerk.openSignIn();
        } catch (error) {
            console.error('Email sign-in failed:', error);
            this.showError('Failed to open sign-in. Please try again.');
        }
    }

    continueOffline() {
        this.hideAuthInterface();
        this.showApp();
        this.initializeApp();
    }

    showSignOutButton() {
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.style.display = 'block';
            signOutBtn.addEventListener('click', () => this.signOut());
        }
    }

    hideSignOutButton() {
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.style.display = 'none';
        }
    }

    async signOut() {
        try {
            await this.clerk.signOut();
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    }

    initializeApp() {
        // Initialize the main ChillQuill app if not already initialized
        if (window.NotesApp && !window.notesApp) {
            window.notesApp = new NotesApp();
        }
        
        // Initialize settings if not already initialized
        if (window.ChillQuillSettings && !window.chillquillSettings) {
            window.chillquillSettings = new ChillQuillSettings();
        }
    }

    showWelcomeMessage(user) {
        const notification = document.createElement('div');
        notification.className = 'welcome-notification';
        notification.innerHTML = `
            <div class="welcome-content">
                <img src="images/chillian_brown.png" alt="Chillian" class="welcome-chillian">
                <div class="welcome-text">
                    <h3>Welcome!</h3>
                    <p>Signed in as ${user.emailAddresses[0].emailAddress}</p>
                    <p class="welcome-note">Your notes are saved locally on this device</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="welcome-close">×</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(145deg, #f5e6d3 0%, #e6d7c3 100%);
            border: 2px solid #8b755d;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 3000;
            max-width: 350px;
            animation: slideIn 0.5s ease-out;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            .welcome-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .welcome-chillian {
                width: 40px;
                height: 40px;
                flex-shrink: 0;
            }
            
            .welcome-text h3 {
                color: #1a1a1a;
                font-family: 'Space Grotesk', monospace;
                font-size: 16px;
                font-weight: 700;
                margin: 0 0 4px 0;
            }
            
            .welcome-text p {
                color: #8b755d;
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                margin: 0 0 4px 0;
            }
            
            .welcome-note {
                font-size: 10px !important;
                font-style: italic;
            }
            
            .welcome-close {
                background: none;
                border: none;
                color: #8b755d;
                font-size: 20px;
                cursor: pointer;
                margin-left: auto;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.3s ease;
            }
            
            .welcome-close:hover {
                background: rgba(139, 117, 93, 0.1);
            }
        `;
        
        document.body.appendChild(style);
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    showError(message) {
        alert(message); // Simple error display for now
    }

    // Method to be called when data changes (simplified for localStorage only)
    async syncData() {
        console.log('Data synced locally');
        // localStorage sync happens automatically in the app
    }
}

// Initialize authentication
window.chillquillAuth = new ChillQuillAuth();