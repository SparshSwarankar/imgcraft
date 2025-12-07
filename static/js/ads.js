/**
 * ImgCraft Ad Management System
 * Handles ad tracking, click counting, modal display, and Razorpay integration
 * 
 * This module:
 * - Tracks ad clicks passively (non-intrusive)
 * - Shows ad-free modal after 2 clicks
 * - Integrates with Razorpay for payment
 * - Updates user ad_free status after payment
 * - Hides all ads when user has purchased ad-free access
 */

class AdManager {
    constructor() {
        // Configuration
        this.AD_CLICK_THRESHOLD = 2;
        this.SESSION_STORAGE_KEY = 'imgcraft_ad_clicks';
        this.MODAL_SHOWN_KEY = 'imgcraft_ad_modal_shown';
        
        // State
        this.user = null;
        this.adFree = false;
        this.clickCount = 0;
        this.isProcessing = false;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize ad manager
     */
    async init() {
        try {
            // Try to immediately hide ads if user has ad-free
            // This runs before AuthManager might be ready
            await this.attemptAdFreeCheck();
            
            // Wait for AuthManager to be ready
            if (!window.AuthManager) {
                console.warn('[AdManager] AuthManager not available');
                return;
            }
            
            // Check if user is logged in
            if (window.AuthManager.user) {
                this.user = window.AuthManager.user;
                await this.checkAdFreeStatus();
                
                if (!this.adFree) {
                    this.loadClickCount();
                    this.setupAdClickTracking();
                }
                
                // Periodically check ad-free status (every 30 seconds)
                // This allows ads to be hidden immediately after purchase without page reload
                setInterval(() => {
                    this.checkAdFreeStatus();
                }, 30000);
            } else {
                // Not logged in - just track clicks (no modal shown)
                this.loadClickCount();
                this.setupAdClickTracking();
            }
            
        } catch (error) {
            console.error('[AdManager] Initialization error:', error);
        }
    }
    
    /**
     * Attempt to check ad-free status immediately from backend
     * This runs before AuthManager might be initialized
     */
    async attemptAdFreeCheck() {
        try {
            // Get token from localStorage/sessionStorage directly
            const token = localStorage.getItem('sb-access-token') || 
                         sessionStorage.getItem('sb-access-token');
            
            if (!token) {
                return; // Guest user - keep ads visible
            }
            
            const response = await fetch('/api/ads/status', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Check for active/permanent ad-free status (payment completed)
                this.adFree = data.ad_free || data.has_ad_free || false;
                
                if (this.adFree) {
                    this.hideAllAds();
                    return;
                }
            }
            
        } catch (error) {
            // Silent fail - not critical
        }
    }
    
    /**
     * Check current user's ad-free status from backend
     */
    async checkAdFreeStatus() {
        try {
            const token = await this.getAuthToken();
            if (!token) return;
            
            const response = await fetch('/api/ads/status', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.adFree = data.ad_free || data.has_ad_free || false;
                
                if (this.adFree) {
                    this.hideAllAds();
                }
            }
            
        } catch (error) {
            // Silently handle errors
        }
    }
    
    /**
     * Get current authentication token
     */
    async getAuthToken() {
        try {
            if (window.AuthManager && window.AuthManager.getToken) {
                return await window.AuthManager.getToken();
            }
            return null;
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Load ad click count from sessionStorage
     */
    loadClickCount() {
        const stored = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
        this.clickCount = stored ? parseInt(stored, 10) : 0;
    }
    
    /**
     * Save ad click count to sessionStorage
     */
    saveClickCount() {
        sessionStorage.setItem(this.SESSION_STORAGE_KEY, this.clickCount.toString());
    }
    
    /**
     * Reset ad click count
     */
    resetClickCount() {
        this.clickCount = 0;
        sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
        sessionStorage.removeItem(this.MODAL_SHOWN_KEY);
    }
    
    /**
     * Setup passive ad click tracking
     * Uses event delegation on .adsbygoogle containers
     */
    setupAdClickTracking() {
        // Listen for clicks on ad containers
        document.addEventListener('click', (event) => {
            const adElement = event.target.closest('.adsbygoogle, [data-ad-slot]');
            
            if (adElement) {
                this.trackAdClick();
            }
        }, true); // Use capture phase to catch clicks early
        }
    
    /**
     * Track an ad click
     */
    trackAdClick() {
        // Only track if user is logged in or not logged in at all
        if (!this.user && !window.AuthManager.user) {
            this.clickCount++;
            this.saveClickCount();
            
            // Show "login to remove ads" message
            if (this.clickCount === 1) {
                showToast(
                    'Please log in to unlock the ad-free experience.',
                    'info',
                    'Ad-Free Available',
                    3000
                );
            }
            return;
        }
        
        // If logged in and ads are free, show modal
        if (this.user && !this.adFree) {
            this.clickCount++;
            this.saveClickCount();
            
            if (this.clickCount >= this.AD_CLICK_THRESHOLD) {
                const alreadyShown = sessionStorage.getItem(this.MODAL_SHOWN_KEY);
                if (!alreadyShown) {
                    this.showAdFreeModal();
                    sessionStorage.setItem(this.MODAL_SHOWN_KEY, 'true');
                }
            }
        }
    }
    
    /**
     * Show ad-free purchase modal
     */
    showAdFreeModal() {
        // Create modal HTML
        const modalHTML = `
            <div class="ad-modal-overlay" id="adFreeModalOverlay">
                <div class="ad-modal-container" id="adFreeModal">
                    <!-- Close button -->
                    <button class="ad-modal-close" onclick="AdManager.closeAdFreeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <!-- Content -->
                    <div class="ad-modal-content">
                        <div class="ad-modal-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        
                        <h2 class="ad-modal-title">Go Ad-Free</h2>
                        
                        <p class="ad-modal-description">
                            Remove all ads and enjoy a distraction-free experience while using ImgCraft tools.
                        </p>
                        
                        <!-- Pricing -->
                        <div class="ad-pricing-box">
                            <div class="ad-price-display">
                                <span class="ad-price-original">₹99</span>
                                <span class="ad-price-current">₹49</span>
                            </div>
                            <div class="ad-price-badge">50% OFF</div>
                        </div>
                        
                        <!-- Features -->
                        <div class="ad-features-list">
                            <div class="ad-feature-item">
                                <i class="fas fa-check"></i>
                                <span>Lifetime ad-free access</span>
                            </div>
                            <div class="ad-feature-item">
                                <i class="fas fa-check"></i>
                                <span>Works on all devices</span>
                            </div>
                            <div class="ad-feature-item">
                                <i class="fas fa-check"></i>
                                <span>One-time payment</span>
                            </div>
                        </div>
                        
                        <!-- Buttons -->
                        <div class="ad-modal-actions">
                            <button class="btn btn-primary btn-full" id="adFreePurchaseBtn" onclick="AdManager.handlePurchaseClick()">
                                <i class="fas fa-lock-open"></i> Unlock Now
                            </button>
                            <button class="btn btn-secondary btn-full" onclick="AdManager.closeAdFreeModal()">
                                Maybe Later
                            </button>
                        </div>
                        
                        <p class="ad-modal-note">
                            <i class="fas fa-shield-alt"></i> Secure payment powered by Razorpay
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        // Add to DOM
        const container = document.body || document.documentElement;
        const modalElement = document.createElement('div');
        modalElement.innerHTML = modalHTML;
        container.appendChild(modalElement.firstElementChild);
        
        // Trigger animation
        requestAnimationFrame(() => {
            const overlay = document.getElementById('adFreeModalOverlay');
            if (overlay) {
                overlay.classList.add('show');
            }
        });
    }
    
    /**
     * Close ad-free modal
     */
    static closeAdFreeModal() {
        const overlay = document.getElementById('adFreeModalOverlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    }
    
    /**
     * Handle purchase button click
     */
    static async handlePurchaseClick() {
        if (!window.AdManager) return;
        
        if (window.AdManager.isProcessing) return;
        window.AdManager.isProcessing = true;
        
        try {
            const btn = document.getElementById('adFreePurchaseBtn');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
            
            // Create order
            const result = await window.AdManager.createPurchaseOrder();
            
            if (result && result.status === 'success') {
                // Open Razorpay checkout
                await window.AdManager.openRazorpayCheckout(result.order);
            } else {
                showToast(
                    result?.message || 'Failed to create payment order',
                    'error',
                    'Payment Error'
                );
                
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-lock-open"></i> Unlock Now';
                }
            }
            
        } catch (error) {
            console.error('[AdManager] Purchase error:', error);
            showToast('An error occurred. Please try again.', 'error', 'Error');
            
            const btn = document.getElementById('adFreePurchaseBtn');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-lock-open"></i> Unlock Now';
            }
        } finally {
            window.AdManager.isProcessing = false;
        }
    }
    
    /**
     * Create purchase order via backend
     */
    async createPurchaseOrder() {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const response = await fetch('/api/ads/create-order', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create order');
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('[AdManager] Order creation error:', error);
            throw error;
        }
    }
    
    /**
     * Open Razorpay checkout
     */
    async openRazorpayCheckout(order) {
        if (!window.Razorpay) {
            throw new Error('Razorpay not loaded');
        }
        
        try {
            const checkout = new Razorpay({
                key: window.RAZORPAY_KEY_ID,
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                
                handler: async (response) => {
                    // Payment successful - verify on backend
                    await this.verifyPayment(response);
                },
                
                prefill: {
                    email: this.user?.email || ''
                },
                
                notes: {
                    product: 'ad-free-lifetime',
                    description: 'ImgCraft Ad-Free Experience'
                },
                
                theme: {
                    color: '#F97316'  // ImgCraft primary color
                }
            });
            
            checkout.open();
            
        } catch (error) {
            console.error('[AdManager] Razorpay checkout error:', error);
            throw error;
        }
    }
    
    /**
     * Verify payment on backend
     */
    async verifyPayment(response) {
        try {
            const token = await this.getAuthToken();
            if (!token) {
                throw new Error('Not authenticated');
            }
            
            const verifyResponse = await fetch('/api/ads/verify-payment', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                })
            });
            
            if (!verifyResponse.ok) {
                const error = await verifyResponse.json();
                throw new Error(error.message || 'Payment verification failed');
            }
            
            const result = await verifyResponse.json();
            
            if (result.status === 'success') {
                // Payment verified!
                this.adFree = true;
                this.resetClickCount();
                
                // Close modal
                this.constructor.closeAdFreeModal();
                
                // Hide ads
                this.hideAllAds();
                
                // Show success message
                showToast(
                    'Welcome to your ad-free experience! All ads have been removed.',
                    'success',
                    'Payment Successful',
                    5000
                );
                
            } else {
                throw new Error(result.message || 'Payment verification failed');
            }
            
        } catch (error) {
            console.error('[AdManager] Payment verification error:', error);
            showToast(
                error.message || 'Payment verification failed',
                'error',
                'Verification Error'
            );
        }
    }
    
    /**
     * Hide all ad units and ads script
     */
    hideAllAds() {
        // Hide all ad containers
        const adContainers = document.querySelectorAll('.ad-container');
        adContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        // Hide all AdSense ad units
        const adUnits = document.querySelectorAll('.adsbygoogle, [data-ad-slot]');
        adUnits.forEach(unit => {
            unit.style.display = 'none';
        });
        
        // Disable AdSense script execution (if not already loaded)
        // Note: AdSense script is controlled via Jinja2 in backend
        // This is a client-side fallback
        const adScripts = document.querySelectorAll('script[src*="adsbygoogle"]');
        adScripts.forEach(script => {
            script.disabled = true;
        });
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.AdManager = new AdManager();
});

// Expose static methods for inline onclick handlers
window.AdManager = window.AdManager || {
    closeAdFreeModal: function() {
        if (window.AdManager instanceof Object && window.AdManager.closeAdFreeModal) {
            window.AdManager.closeAdFreeModal();
        }
    },
    handlePurchaseClick: function() {
        if (window.AdManager instanceof Object && window.AdManager.handlePurchaseClick) {
            window.AdManager.handlePurchaseClick();
        }
    }
};
