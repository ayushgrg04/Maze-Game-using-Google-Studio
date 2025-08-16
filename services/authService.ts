// @ts-nocheck
// This service manages the Google Sign-In (OAuth 2.0) flow.

// --- IMPORTANT CONFIGURATION ---
// Replace this with your actual Google Cloud Project's OAuth 2.0 Client ID.
// You can create one for your web application here:
// https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";


class AuthService {
    private tokenClient: google.accounts.oauth2.TokenClient | null = null;
    private accessToken: string | null = null;
    private onAuthChangeCallback: ((isSignedIn: boolean) => void) | null = null;
    private initPromise: Promise<void> | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initialize();
        }
    }
    
    private initialize(): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = new Promise((resolve, reject) => {
                const checkGsi = () => {
                    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") {
                            const errorMsg = "Google Client ID is not configured. Please set the GOOGLE_CLIENT_ID constant in services/authService.ts.";
                            console.error(errorMsg);
                            // We alert the user because this is a developer configuration error, not a runtime user error.
                            alert(errorMsg); 
                            reject(new Error(errorMsg));
                            return;
                        }
                        try {
                            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                                client_id: GOOGLE_CLIENT_ID,
                                scope: 'https://www.googleapis.com/auth/cloud-platform',
                                callback: (tokenResponse) => {
                                    if (tokenResponse.error) {
                                        console.error("Google Sign-In Error:", tokenResponse.error, tokenResponse.error_description);
                                        this.accessToken = null;
                                        this.notifyAuthChange(false);
                                        return;
                                    }
                                    this.accessToken = tokenResponse.access_token;
                                    this.notifyAuthChange(true);
                                },
                                error_callback: (error) => {
                                     console.error("Google Sign-In Error Callback:", error.type, error.message);
                                     this.accessToken = null;
                                     this.notifyAuthChange(false);
                                }
                            });
                            resolve();
                        } catch (e) {
                            console.error("Failed to initialize Google Token Client:", e);
                            reject(e);
                        }
                    } else {
                        setTimeout(checkGsi, 100); // Poll every 100ms
                    }
                };
                checkGsi();
            });
        }
        return this.initPromise;
    }

    public async signIn(): Promise<void> {
        try {
            await this.initialize();
            if (this.tokenClient) {
                // Prompt the user to grant access. `prompt: ''` will not show a consent screen if already granted.
                this.tokenClient.requestAccessToken({ prompt: '' });
            } else {
                throw new Error("Token client is not available after initialization.");
            }
        } catch(error) {
             console.error("Sign-in failed:", error);
             // The detailed error is alerted during initialization. This is a fallback.
             alert("Could not start the sign-in process. Please check the console for errors and ensure the Google Client ID is configured correctly.");
        }
    }
    
    public signOut(): void {
        if (this.accessToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
            window.google.accounts.oauth2.revoke(this.accessToken, () => {});
            this.accessToken = null;
            this.notifyAuthChange(false);
        }
    }

    public getToken(): string | null {
        return this.accessToken;
    }

    public isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    public onAuthStateChanged(callback: (isSignedIn: boolean) => void): () => void {
        this.onAuthChangeCallback = callback;
        // Immediately call with current state
        callback(this.isAuthenticated());
        
        // Return an unsubscribe function
        return () => {
            this.onAuthChangeCallback = null;
        };
    }
    
    private notifyAuthChange(isSignedIn: boolean): void {
        if (this.onAuthChangeCallback) {
            this.onAuthChangeCallback(isSignedIn);
        }
    }
}

export const authService = new AuthService();