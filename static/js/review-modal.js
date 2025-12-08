// ============================================================================
// REVIEW MODAL SYSTEM FOR IMGCRAFT
// Intelligent, non-intrusive feedback collection
// ============================================================================

class ReviewModalManager {
    constructor() {
        this.storageKey = 'imgcraft_review_state';
        this.state = this.loadState();
        this.currentRating = 0;
        this.triggers = {
            creditPurchase: false,
            toolUsageCount: 5, // Show after 5 tool uses
            timeOnSite: 60000, // Show after 60 seconds (1 minute)
            firstToolUse: false
        };

        this.init();
    }

    init() {
        // Don't show if user has already reviewed or dismissed permanently
        if (this.state.hasReviewed || this.state.permanentlyDismissed) {
            return;
        }

        // Initialize triggers
        this.initTriggers();
    }

    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load review state:', e);
        }

        // Default state
        return {
            hasReviewed: false,
            permanentlyDismissed: false,
            remindLaterCount: 0,
            lastRemindLater: null,
            toolUsageCount: 0,
            firstVisit: Date.now(),
            lastReviewPrompt: null
        };
    }

    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (e) {
            console.warn('Failed to save review state:', e);
        }
    }

    initTriggers() {
        // Setup 60-second timer on any page
        if (!this.state.lastReviewPrompt && this.shouldShowAgain()) {
            this.reviewTimer = setTimeout(() => {
                if (this.canShowReview()) {
                    this.show('general', {
                        title: 'Enjoying ImgCraft?',
                        subtitle: 'We\'d love to hear your thoughts! Your feedback helps us improve.',
                        icon: '✨'
                    });
                }
            }, this.triggers.timeOnSite);
        }

        // Listen for credit purchase or ads removal
        document.addEventListener('imgcraft:creditPurchased', () => {
            if (this.canShowReview()) {
                setTimeout(() => {
                    this.show('purchase', {
                        title: 'Thank you for your purchase!',
                        subtitle: 'How was your experience? We\'d appreciate your feedback.',
                        icon: '🎉'
                    });
                }, 2000);
            }
        });

        // Listen for remove ads action
        document.addEventListener('imgcraft:adsRemoved', () => {
            if (this.canShowReview()) {
                setTimeout(() => {
                    this.show('purchase', {
                        title: 'Thank you!',
                        subtitle: 'We appreciate your support. Any feedback for us?',
                        icon: '🌟'
                    });
                }, 2000);
            }
        });

        // Listen for tool usage (trigger at 5 tools)
        document.addEventListener('imgcraft:toolUsed', () => {
            this.state.toolUsageCount++;
            this.saveState();

            if (this.state.toolUsageCount === this.triggers.toolUsageCount && this.canShowReview()) {
                setTimeout(() => {
                    this.show('tools', {
                        title: 'How are we doing?',
                        subtitle: `You've used ${this.triggers.toolUsageCount} tools! Mind sharing your experience?`,
                        icon: '🎨'
                    });
                }, 1000);
            }
        });
    }

    canShowReview() {
        // Don't show if already reviewed or permanently dismissed
        if (this.state.hasReviewed || this.state.permanentlyDismissed) {
            return false;
        }

        // Don't show if reminded later recently (wait 24 hours)
        if (this.state.lastRemindLater) {
            const hoursSinceReminder = (Date.now() - this.state.lastRemindLater) / (1000 * 60 * 60);
            if (hoursSinceReminder < 24) {
                return false;
            }
        }

        // Don't show more than once per session (allow showing once after page load)
        if (this.state.lastReviewPrompt) {
            const timeSinceLastPrompt = Date.now() - this.state.lastReviewPrompt;
            
            // Allow showing if more than 5 minutes have passed since last prompt (different session)
            if (timeSinceLastPrompt < 300000) { // 5 minutes in milliseconds
                return false;
            }
        }

        return true;
    }

    shouldShowAgain() {
        // After 3 "remind later" clicks, don't show again
        if (this.state.remindLaterCount >= 3) {
            this.state.permanentlyDismissed = true;
            this.saveState();
            return false;
        }

        return true;
    }

    show(type = 'general', options = {}) {
        const defaults = {
            title: 'How was your experience?',
            subtitle: 'We value your feedback and would love to hear from you.',
            icon: '⭐'
        };

        const config = { ...defaults, ...options };

        // Mark that we've shown the prompt
        this.state.lastReviewPrompt = Date.now();
        this.saveState();

        // Create modal content
        const content = this.createReviewModalContent(config);

        // Show modal using existing modal system
        if (window.modalManager) {
            window.modalManager.showCustomModal(content, 'review-modal-container');
        } else {
            // Fallback if modal manager not available
            this.showFallbackModal(content);
        }

        // Initialize star rating after modal is shown
        setTimeout(() => this.initStarRating(), 100);
    }

    createReviewModalContent(config) {
        return `
            <div class="review-modal-header">
                <div class="review-modal-icon">${config.icon}</div>
                <h2 class="review-modal-title">${config.title}</h2>
                <p class="review-modal-subtitle">${config.subtitle}</p>
            </div>
            <div class="review-modal-body">
                <div class="star-rating-container">
                    <label class="star-rating-label">Rate your experience</label>
                    <div class="star-rating" id="starRating">
                        <span class="star" data-rating="1">★</span>
                        <span class="star" data-rating="2">★</span>
                        <span class="star" data-rating="3">★</span>
                        <span class="star" data-rating="4">★</span>
                        <span class="star" data-rating="5">★</span>
                    </div>
                    <div class="rating-feedback" id="ratingFeedback"></div>
                </div>

                <div class="feedback-group">
                    <label class="feedback-label">
                        Tell us more <span class="optional">(optional)</span>
                    </label>
                    <textarea 
                        id="reviewFeedback" 
                        class="feedback-textarea" 
                        placeholder="What did you like? What could we improve? Any features you'd love to see?"
                        maxlength="1000"
                    ></textarea>
                </div>

                <div class="review-modal-actions">
                    <button class="review-btn review-btn-primary" id="submitReview" disabled>
                        <i class="fas fa-paper-plane"></i>
                        Submit Review
                    </button>
                    <button class="review-btn review-btn-secondary" id="remindLater">
                        <i class="fas fa-clock"></i>
                        Remind Me Later
                    </button>
                    <button class="review-btn review-btn-text" id="noThanks">
                        No Thanks
                    </button>
                </div>
            </div>
        `;
    }

    initStarRating() {
        const stars = document.querySelectorAll('.star');
        const submitBtn = document.getElementById('submitReview');
        const feedbackText = document.getElementById('ratingFeedback');
        const remindLaterBtn = document.getElementById('remindLater');
        const noThanksBtn = document.getElementById('noThanks');

        if (!stars.length) return;

        const feedbackMessages = {
            1: 'We\'re sorry to hear that 😔',
            2: 'We can do better 🤔',
            3: 'Thanks for your feedback! 👍',
            4: 'Great! We\'re glad you like it! 😊',
            5: 'Awesome! You made our day! 🎉'
        };

        // Star hover effect
        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    if (i <= index) {
                        s.classList.add('hovered');
                    } else {
                        s.classList.remove('hovered');
                    }
                });
            });

            star.addEventListener('mouseleave', () => {
                stars.forEach(s => s.classList.remove('hovered'));
            });

            // Star click
            star.addEventListener('click', () => {
                const rating = parseInt(star.dataset.rating);
                this.currentRating = rating;

                // Update star display
                stars.forEach((s, i) => {
                    if (i < rating) {
                        s.classList.add('active', 'just-selected');
                        setTimeout(() => s.classList.remove('just-selected'), 500);
                    } else {
                        s.classList.remove('active');
                    }
                });

                // Update feedback text
                feedbackText.textContent = feedbackMessages[rating];
                feedbackText.className = `rating-feedback rating-${rating}`;

                // Enable submit button
                submitBtn.disabled = false;
            });
        });

        // Submit review
        submitBtn.addEventListener('click', () => this.submitReview());

        // Remind later
        remindLaterBtn.addEventListener('click', () => this.remindLater());

        // No thanks
        noThanksBtn.addEventListener('click', () => this.dismiss());
    }

    async submitReview() {
        const submitBtn = document.getElementById('submitReview');
        const feedbackTextarea = document.getElementById('reviewFeedback');
        const feedback = feedbackTextarea?.value || '';

        if (!this.currentRating) {
            window.showToast('Please select a rating', 'warning', 'Rating Required');
            return;
        }

        // Show loading state
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

        try {
            // Prepare review data
            const reviewData = {
                rating: this.currentRating,
                feedback: feedback,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                toolUsageCount: this.state.toolUsageCount
            };

            // Get auth token if available
            const headers = {
                'Content-Type': 'application/json',
                ...(window.AuthManager ? window.AuthManager.getAuthHeaders() : {})
            };

            // Submit to backend
            const response = await fetch('/api/submit-review', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(reviewData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit review');
            }

            // Mark as reviewed
            this.state.hasReviewed = true;
            this.state.lastReviewSubmission = Date.now();
            this.saveState();

            // Show success message
            this.showSuccessMessage();

            // Close modal after 3 seconds
            setTimeout(() => {
                if (window.modalManager) {
                    window.modalManager.close();
                }
            }, 3000);

        } catch (error) {
            console.error('Failed to submit review:', error);
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
            window.showToast(
                'Failed to submit review. Please try again.',
                'error',
                'Submission Failed'
            );
        }
    }

    showSuccessMessage() {
        const modalContent = document.getElementById('modalContent');
        if (!modalContent) return;

        modalContent.innerHTML = `
            <div class="review-success">
                <div class="review-success-icon">
                    <i class="fas fa-check"></i>
                </div>
                <h2 class="review-success-title">Thank You!</h2>
                <p class="review-success-message">
                    Your feedback means the world to us and helps make ImgCraft better for everyone. 
                    ${this.currentRating >= 4 ? 'We\'re thrilled you\'re enjoying ImgCraft! 🎉' : 'We\'ll work hard to improve your experience.'}
                </p>
            </div>
        `;
    }

    remindLater() {
        this.state.remindLaterCount++;
        this.state.lastRemindLater = Date.now();
        this.saveState();

        if (window.modalManager) {
            window.modalManager.close();
        }

        window.showToast(
            'We\'ll ask again later. Thanks for your time!',
            'info',
            'Reminder Set'
        );
    }

    dismiss() {
        this.state.permanentlyDismissed = true;
        this.saveState();

        if (window.modalManager) {
            window.modalManager.close();
        }

        window.showToast(
            'You won\'t see this again. Thanks for using ImgCraft!',
            'info',
            'Dismissed'
        );
    }

    showFallbackModal(content) {
        // Simple fallback if main modal system isn't available
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
            <div class="modal-container review-modal-container">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="modal-content" id="modalContent">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    // Public method to trigger review from anywhere in the app
    static triggerReview(type, options) {
        if (window.reviewModalManager) {
            window.reviewModalManager.show(type, options);
        }
    }

    // Public method to track tool usage
    static trackToolUsage() {
        document.dispatchEvent(new CustomEvent('imgcraft:toolUsed'));
    }

    // Public method to track credit purchase
    static trackCreditPurchase() {
        document.dispatchEvent(new CustomEvent('imgcraft:creditPurchased'));
    }
}

// Initialize review modal manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Review] DOM Ready - Initializing ReviewModalManager');
    window.reviewModalManager = new ReviewModalManager();
    console.log('[Review] ReviewModalManager instance created:', window.reviewModalManager);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReviewModalManager;
}
