class DriveService {
    constructor() {
        this.accessToken = null;
        this.isAuthenticated = false;
        this.isInitialized = false;
        this.tokenClient = null;
        this.initPromise = null; // Cache initialization promise
        this.gapiLoadingPromise = null; // Cache gapi loading promise
        this.gisLoadingPromise = null; // Cache GIS loading promise

        // ChillQuill's Google OAuth Client ID
        this.CLIENT_ID = '89000906280-q3b4ep4lrg05erf5e3oo0fjkujr8pcpq.apps.googleusercontent.com';
        this.SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
        this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

        // Base URL for Drive API (we'll use fetch instead of gapi.client)
        this.DRIVE_API_BASE = 'https://www.googleapis.com';
    }

    async init() {
        // Return cached promise if already initializing/initialized
        if (this.initPromise) {
            return this.initPromise;
        }

        // Cache the initialization promise
        this.initPromise = this._performInit();
        return this.initPromise;
    }

    async _performInit() {
        // Check current environment
        const isLocalhost = window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('local');

        console.log('Google Drive init - Environment check:', {
            hostname: window.location.hostname,
            origin: window.location.origin,
            isLocalhost: isLocalhost
        });

        if (!this.CLIENT_ID || this.CLIENT_ID === 'YOUR_CHILLQUILL_CLIENT_ID_HERE') {
            console.warn('ChillQuill Google Client ID not configured');
            return false;
        }

        // Warning for localhost development
        if (isLocalhost) {
            console.warn('Running on localhost - make sure your Google OAuth app has this origin authorized:', window.location.origin);
        }

        try {
            // Only initialize GIS - no more gapi mixing!
            await this.ensureGoogleIdentityServices();
            await this.initializeGoogleIdentityServices();
            return true;
        } catch (error) {
            console.error('Failed to initialize Google Drive:', error);
            // Reset the promise so it can be retried
            this.initPromise = null;
            return false;
        }
    }

    // Ensure Google Identity Services is loaded (with proper race condition handling)
    async ensureGoogleIdentityServices() {
        if (window.google?.accounts?.oauth2) {
            return true; // Already loaded
        }

        // Return existing promise if already loading
        if (this.gisLoadingPromise) {
            return this.gisLoadingPromise;
        }

        console.log('Loading Google Identity Services...');

        this.gisLoadingPromise = new Promise((resolve, reject) => {
            // Check if script already exists in DOM
            const existingScript = Array.from(document.scripts)
                .find(s => s.src.includes('accounts.google.com/gsi/client'));

            if (existingScript) {
                console.log('GIS script already exists, waiting for load...');
                // Wait for it to load
                this.waitForGIS().then(resolve).catch(reject);
                return;
            }

            // Create and load the script
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;

            script.onload = () => {
                console.log('GIS script loaded, waiting for availability...');
                this.waitForGIS().then(resolve).catch(reject);
            };

            script.onerror = (error) => {
                console.error('Failed to load GIS script:', error);
                reject(new Error('Google Identity Services script failed to load'));
            };

            document.head.appendChild(script);
        });

        return this.gisLoadingPromise;
    }

    // Wait for GIS to be available on window object
    async waitForGIS() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 100; // 10 seconds

            const check = () => {
                attempts++;

                if (window.google?.accounts?.oauth2) {
                    console.log('Google Identity Services is available');
                    resolve(true);
                    return;
                }

                if (attempts >= maxAttempts) {
                    reject(new Error('Google Identity Services not available after 10 seconds'));
                    return;
                }

                setTimeout(check, 100);
            };

            check();
        });
    }

    // Initialize GIS token client with proper error handling
    async initializeGoogleIdentityServices() {
        console.log('Initializing Google Identity Services token client...');

        try {
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.CLIENT_ID,
                scope: this.SCOPES,
                callback: (response) => {
                    console.log('Token callback received:', {
                        hasError: !!response.error,
                        hasToken: !!response.access_token
                    });

                    if (response.error) {
                        console.error('OAuth error:', response.error);
                        // Set flag for authenticate() method to pick up
                        this.authError = response.error;
                        return;
                    }

                    if (response.access_token) {
                        this.accessToken = response.access_token;
                        this.isAuthenticated = true;
                        this.authError = null;
                        console.log('Authentication successful!');
                    }
                },
            });

            this.isInitialized = true;
            console.log('Google Identity Services initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Google Identity Services:', error);
            throw error;
        }
    }


    async authenticate() {
        if (!this.isInitialized) {
            throw new Error('DriveService not initialized. Call init() first.');
        }

        return new Promise((resolve, reject) => {
            // Clear any previous auth state
            this.authError = null;
            this.isAuthenticated = false;

            try {
                // Request access token
                this.tokenClient.requestAccessToken({
                    prompt: 'consent',
                });

                // Monitor for completion or error
                const checkAuth = () => {
                    if (this.authError) {
                        // Authentication failed
                        reject(new Error(`Authentication failed: ${this.authError}`));
                        return;
                    }

                    if (this.isAuthenticated) {
                        // Authentication successful
                        resolve(true);
                        return;
                    }

                    // Still waiting, check again
                    setTimeout(checkAuth, 100);
                };

                // Set timeout for authentication
                setTimeout(() => {
                    if (!this.isAuthenticated && !this.authError) {
                        reject(new Error('Authentication timeout - user may have closed popup or denied access'));
                    }
                }, 60000); // 60 second timeout (generous for slow users)

                checkAuth();
            } catch (error) {
                console.error('Authentication error:', error);
                reject(error);
            }
        });
    }

    signOut() {
        if (this.accessToken) {
            google.accounts.oauth2.revoke(this.accessToken, () => {
                console.log('Access token revoked');
            });
        }

        this.accessToken = null;
        this.isAuthenticated = false;
        this.authError = null;
        console.log('Signed out from Google Drive');
    }

    // Generic method to save any JSON file
    async saveJSON(fileName, data) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        try {
            const fileContent = JSON.stringify(data, null, 2);

            // Check if file already exists
            const existingFile = await this.findFile(fileName);

            if (existingFile) {
                // Update existing file
                await this.updateFile(existingFile.id, fileContent);
                console.log(`Updated ${fileName} in Google Drive`);
            } else {
                // Create new file
                await this.createFile(fileName, fileContent);
                console.log(`Created ${fileName} in Google Drive`);
            }
        } catch (error) {
            console.error(`Error saving ${fileName}:`, error);
            throw error;
        }
    }

    // Generic method to load any JSON file
    async loadJSON(fileName, defaultValue = null) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        try {
            const file = await this.findFile(fileName);

            if (!file) {
                console.log(`${fileName} not found in Google Drive`);
                return defaultValue;
            }

            // Use fetch instead of gapi.client for file download
            const response = await fetch(`${this.DRIVE_API_BASE}/drive/v3/files/${file.id}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const content = await response.text();
            return JSON.parse(content);
        } catch (error) {
            console.error(`Error loading ${fileName}:`, error);
            return defaultValue;
        }
    }

    // Helper method to find a file by name in appDataFolder
    async findFile(fileName) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        try {
            const query = encodeURIComponent(`name='${fileName}' and parents in 'appDataFolder' and trashed=false`);
            const url = `${this.DRIVE_API_BASE}/drive/v3/files?q=${query}&fields=files(id,name)&spaces=appDataFolder`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.files && data.files.length > 0 ? data.files[0] : null;
        } catch (error) {
            console.error(`Error finding file ${fileName}:`, error);
            return null;
        }
    }

    // Helper method to create a new file
    async createFile(fileName, content) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        const fileMetadata = {
            name: fileName,
            parents: ['appDataFolder']
        };

        // Create multipart upload
        const delimiter = '-------314159265358979323846';
        const close_delim = `\r\n--${delimiter}--`;

        const body = [
            `--${delimiter}`,
            'Content-Type: application/json\r\n',
            JSON.stringify(fileMetadata),
            `--${delimiter}`,
            'Content-Type: application/json\r\n',
            content,
            close_delim
        ].join('\r\n');

        const response = await fetch(`${this.DRIVE_API_BASE}/upload/drive/v3/files?uploadType=multipart&fields=id`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': `multipart/related; boundary="${delimiter}"`
            },
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // Helper method to update an existing file
    async updateFile(fileId, content) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Google Drive');
        }

        const response = await fetch(`${this.DRIVE_API_BASE}/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: content
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    // Convenience methods for specific data types
    async saveNotes(notes) {
        return this.saveJSON('notes.json', notes);
    }

    async loadNotes() {
        return this.loadJSON('notes.json', []);
    }

    async saveFolders(folders) {
        return this.saveJSON('folders.json', folders);
    }

    async loadFolders() {
        return this.loadJSON('folders.json', []);
    }

    async saveSettings(settings) {
        return this.saveJSON('settings.json', settings);
    }

    async loadSettings() {
        return this.loadJSON('settings.json', {});
    }

    getAuthStatus() {
        return {
            isInitialized: this.isInitialized,
            isAuthenticated: this.isAuthenticated,
            hasToken: !!this.accessToken
        };
    }
}

// Create and export a single instance
window.driveService = new DriveService();