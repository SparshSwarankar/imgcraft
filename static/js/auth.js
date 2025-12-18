/**
 * Authentication management for ImgCraft
 * Handles Supabase auth, session management, and UI updates
 */

// Prevent double declarations - check if already initialized
if (!window.AuthSystem) {
    window.AuthSystem = {};

    // Initialize Supabase client with localStorage persistence (only once)
    const supabaseOptions = {
        auth: {
            storage: window.localStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    };

    // Wait for window.supabase to be available from CDN
    async function initSupabase() {
        let attempts = 0;
        while (!window.supabase && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }

        if (!window.supabase) {
            console.error('Failed to load Supabase from CDN');
            return null;
        }

        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, supabaseOptions);
    }

    // Create supabase client
    let supabase = null;

    const AuthManager = {
        user: null,
        session: null,

        async init() {
            // Initialize supabase if not already done
            if (!supabase) {
                supabase = await initSupabase();
                window.supabaseClient = supabase;
            }

            if (!supabase) {
                console.error('Supabase initialization failed');
                return;
            }

            await this.checkSession();
            supabase.auth.onAuthStateChange((event, session) => {
                this.handleAuthChange(event, session);
            });
        },

        async checkSession() {
            // First check sessionStorage for manually stored sessions (from login)
            const storedSessionStr = sessionStorage.getItem('supabase.auth.token');
            if (storedSessionStr) {
                try {
                    const storedSession = JSON.parse(storedSessionStr);
                    console.log('Restored session from sessionStorage:', storedSession);

                    // Create proper session object that matches Supabase format
                    const session = {
                        access_token: storedSession.access_token,
                        refresh_token: storedSession.refresh_token,
                        expires_in: storedSession.expires_in,
                        expires_at: storedSession.expires_at,
                        token_type: storedSession.token_type,
                        type: storedSession.type,
                        user: storedSession.user
                    };

                    this.handleAuthChange('SESSION_RESTORED', session);
                    return;
                } catch (e) {
                    console.error('Failed to parse stored session:', e);
                }
            }

            // Then check Supabase session
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                this.handleAuthChange('INITIAL_CHECK', session);
            }
        },

        handleAuthChange(event, session) {
            this.session = session;
            this.user = session ? session.user : null;

            if (session) {
                this.updateUI(true);
                this.syncSessionWithBackend();
            } else {
                this.updateUI(false);
                if (window.CreditManager) {
                    window.CreditManager.reset();
                }
            }
        },

        async syncSessionWithBackend() {
            if (!this.session) return;

            try {
                const response = await fetch('/api/auth/session', {
                    headers: {
                        'Authorization': `Bearer ${this.session.access_token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    // Wait for CreditManager to load
                    const waitForCreditManager = async () => {
                        let attempts = 0;
                        while (!window.CreditManager && attempts < 50) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            attempts++;
                        }
                        return window.CreditManager;
                    };

                    const CreditManager = await waitForCreditManager();

                    if (CreditManager && data.credits) {
                        CreditManager.updateDisplay(data.credits);
                        await CreditManager.refreshCredits();
                    }
                }
            } catch (error) {
                console.error('Error syncing session:', error);
            }
        },

        updateUI(isLoggedIn) {
            const guestElements = document.querySelectorAll('.auth-guest');
            const userElements = document.querySelectorAll('.auth-user');

            // Mobile elements
            const guestMobileElements = document.querySelectorAll('.auth-guest-mobile');
            const userMobileElements = document.querySelectorAll('.auth-user-mobile');

            if (isLoggedIn) {
                guestElements.forEach(el => el.style.display = 'none');
                userElements.forEach(el => el.style.display = 'flex');
                guestMobileElements.forEach(el => el.style.display = 'none');
                userMobileElements.forEach(el => el.style.display = 'flex');

                const userNameEl = document.getElementById('userName');
                const userEmailEl = document.getElementById('userEmail');
                const userNameDisplayEl = document.getElementById('userNameDisplay');
                if (userNameEl && this.user.user_metadata.full_name) {
                    userNameEl.textContent = this.user.user_metadata.full_name;
                }
                if (userNameDisplayEl && this.user.user_metadata.full_name) {
                    userNameDisplayEl.textContent = this.user.user_metadata.full_name;
                }
                if (userEmailEl) {
                    userEmailEl.textContent = this.user.email;
                }
            } else {
                guestElements.forEach(el => el.style.display = 'flex');
                userElements.forEach(el => el.style.display = 'none');
                guestMobileElements.forEach(el => el.style.display = 'flex');
                userMobileElements.forEach(el => el.style.display = 'none');
            }
        },

        async signUp(email, password, fullName) {
            if (!supabase) {
                console.error('Supabase not initialized');
                return { data: null, error: 'Supabase not initialized' };
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });
            return { data, error };
        },

        async signIn(email, password) {
            if (!supabase) {
                console.error('Supabase not initialized');
                return { data: null, error: 'Supabase not initialized' };
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            return { data, error };
        },

        async signOut() {
            if (!supabase) {
                return { error: 'Supabase not initialized' };
            }

            const { error } = await supabase.auth.signOut();
            if (!error) {
                window.location.href = '/';
            }
            return { error };
        },

        getToken() {
            return this.session ? this.session.access_token : null;
        },

        getAuthHeaders() {
            const token = this.getToken();
            return token ? { 'Authorization': `Bearer ${token}` } : {};
        }
    };

    // Make AuthManager globally accessible
    window.AuthManager = AuthManager;
    window.AuthSystem.initialized = true;
}

// Initialize AuthManager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.AuthManager) {
            window.AuthManager.updateUI(false);
            window.AuthManager.init();
        }
    });
} else {
    // DOM is already loaded
    if (window.AuthManager) {
        window.AuthManager.updateUI(false);
        window.AuthManager.init();
    }
}

