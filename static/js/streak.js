/**
 * Streak Tracking System
 * Handles fetching, updating, and animating the daily streak counter.
 */

const StreakManager = {
    currentStreak: 0,
    longestStreak: 0,
    initialized: false,

    async init() {
        if (this.initialized) return;

        // Wait for Auth to be ready
        let attempts = 0;
        while ((!window.AuthManager || !window.AuthManager.user) && attempts < 20) {
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }

        if (window.AuthManager && window.AuthManager.user) {
            this.fetchStreak();
            this.initialized = true;
        }
    },

    async fetchStreak() {
        try {
            const token = window.AuthManager.getToken();
            if (!token) return;

            const response = await fetch('/api/streak', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.streak) {
                    this.updateUI(data.streak);
                }
            }
        } catch (error) {
            console.error('Error fetching streak:', error);
        }
    },

    async updateStreak() {
        try {
            const token = window.AuthManager.getToken();
            if (!token) return;

            const response = await fetch('/api/update_streak', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateUI({
                        current_streak: data.new_streak,
                        longest_streak: data.longest_streak || data.new_streak
                    });

                    // Only animate when streak actually changes (not on same-day "maintained")
                    if (data.status === 'started' || data.status === 'continued' || data.status === 'reset') {
                        this.animateSuccess();
                    }
                }
            }
        } catch (error) {
            console.error('Error updating streak:', error);
        }
    },

    updateUI(streakData) {
        this.currentStreak = streakData.current_streak || 0;
        this.longestStreak = streakData.longest_streak || 0;

        // Desktop Elements
        const badgeObj = document.getElementById('streakBadge');
        const countObj = document.getElementById('streakCount');
        const popoverCurrent = document.getElementById('streakPopoverCurrent');
        const popoverLongest = document.getElementById('streakPopoverLongest');

        // Mobile Elements
        const badgeMobile = document.getElementById('streakBadgeMobile');
        const countMobile = document.getElementById('streakCountMobile');

        // Update Desktop
        if (badgeObj) {
            badgeObj.style.display = 'flex';
            if (countObj) {
                this.animateValue(countObj, parseInt(countObj.innerText) || 0, this.currentStreak, 1000);
            }
            if (popoverCurrent) popoverCurrent.innerText = this.currentStreak;
            if (popoverLongest) popoverLongest.innerText = this.longestStreak;

            if (this.currentStreak > 0) badgeObj.classList.add('has-streak');
            else badgeObj.classList.remove('has-streak');
        }

        // Update Mobile
        if (badgeMobile) {
            badgeMobile.style.display = 'flex';
            if (countMobile) {
                this.animateValue(countMobile, parseInt(countMobile.innerText) || 0, this.currentStreak, 1000);
            }
        }
    },

    animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    },

    animateSuccess() {
        // Pulse effect on the entire badge
        const badges = document.querySelectorAll('.streak-badge, .streak-badge-mobile');
        badges.forEach(badge => {
            badge.classList.add('streak-updating');
            setTimeout(() => badge.classList.remove('streak-updating'), 700);
        });

        // Pulse effects for flame icons
        const icons = document.querySelectorAll('.streak-icon-flame, .streak-flame');
        icons.forEach(icon => {
            icon.classList.add('pulse-animation');
            setTimeout(() => icon.classList.remove('pulse-animation'), 1000);
        });
    }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    StreakManager.init();
});

// Expose globally
window.StreakManager = StreakManager;

// Mobile streak info function
function showMobileStreakInfo() {
    const current = StreakManager.currentStreak || 0;
    const longest = StreakManager.longestStreak || 0;

    if (window.showToast) {
        showToast(`🔥 Current: ${current} day${current !== 1 ? 's' : ''} | Best: ${longest} day${longest !== 1 ? 's' : ''}`, 'info', 'Your Streak');
    }
}

window.showMobileStreakInfo = showMobileStreakInfo;

// ============================================================================
// STREAK NOTIFICATION SYSTEM
// ============================================================================

const StreakNotifications = {
    NOTIFICATION_HOUR: 18, // 6 PM
    STORAGE_KEY: 'imgcraft_streak_notif',

    async init() {
        // Only initialize for logged-in users
        if (!window.AuthManager || !window.AuthManager.user) return;

        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('[StreakNotif] Notifications not supported');
            return;
        }

        // Request permission if not granted
        if (Notification.permission === 'default') {
            // Don't auto-request, wait for user action
            this.showPermissionPrompt();
        } else if (Notification.permission === 'granted') {
            this.scheduleCheck();
        }
    },

    showPermissionPrompt() {
        // Only show once per session
        if (sessionStorage.getItem('notif_prompt_shown')) return;
        sessionStorage.setItem('notif_prompt_shown', 'true');

        // Show after a delay to not overwhelm the user
        setTimeout(() => {
            if (window.showToast) {
                showToast('Want streak reminders? Click the 🔔 bell to enable notifications!', 'info', 'Stay on Track');
            }
        }, 5000);
    },

    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                showToast('🔔 Streak notifications enabled!', 'success');
                this.scheduleCheck();
                return true;
            } else {
                showToast('Notifications blocked. Enable in browser settings.', 'warning');
                return false;
            }
        } catch (error) {
            console.error('[StreakNotif] Permission error:', error);
            return false;
        }
    },

    scheduleCheck() {
        // Check every minute if we should send a notification
        setInterval(() => this.checkAndNotify(), 60000);
        // Also check immediately
        this.checkAndNotify();
    },

    async checkAndNotify() {
        const now = new Date();
        const currentHour = now.getHours();

        // Only notify after 6 PM
        if (currentHour < this.NOTIFICATION_HOUR) return;

        // Check if already notified today
        const lastNotif = localStorage.getItem(this.STORAGE_KEY);
        const today = now.toDateString();
        if (lastNotif === today) return;

        // Check if user has used a tool today
        const streakData = await this.fetchStreakData();
        if (!streakData) return;

        const lastActive = streakData.last_active_date;
        const todayISO = now.toISOString().split('T')[0];

        // If already active today, no need to notify
        if (lastActive === todayISO) return;

        // User hasn't used a tool today - streak at risk!
        const currentStreak = streakData.current_streak || 0;

        if (currentStreak > 0) {
            // Streak is at risk
            this.sendNotification(
                '🔥 Your streak is at risk!',
                `You have a ${currentStreak}-day streak! Use any tool before midnight to keep it alive.`,
                '/'
            );
        } else {
            // No streak yet
            this.sendNotification(
                '✨ Start your streak today!',
                'Use any ImgCraft tool to begin your daily streak.',
                '/'
            );
        }

        // Mark as notified today
        localStorage.setItem(this.STORAGE_KEY, today);
    },

    async fetchStreakData() {
        try {
            const token = window.AuthManager?.getToken();
            if (!token) return null;

            const response = await fetch('/api/streak', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                return data.streak || null;
            }
        } catch (error) {
            console.error('[StreakNotif] Fetch error:', error);
        }
        return null;
    },

    sendNotification(title, body, url) {
        if (Notification.permission !== 'granted') return;

        // Use service worker if available for better handling
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Service worker will handle click events
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: body,
                    icon: '/static/favicon/favicon-96x96.png',
                    badge: '/static/favicon/favicon-96x96.png',
                    tag: 'streak-reminder',
                    requireInteraction: true,
                    data: { url: url },
                    actions: [
                        { action: 'open', title: '🚀 Open App' },
                        { action: 'dismiss', title: 'Later' }
                    ]
                });
            });
        } else {
            // Fallback to basic notification
            const notification = new Notification(title, {
                body: body,
                icon: '/static/favicon/favicon-96x96.png',
                tag: 'streak-reminder'
            });

            notification.onclick = () => {
                window.focus();
                window.location.href = url;
                notification.close();
            };
        }
    }
};

// Initialize notifications after streak manager
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be ready, then init notifications
    setTimeout(() => StreakNotifications.init(), 3000);
});

// Expose for manual permission request (e.g., from settings)
window.StreakNotifications = StreakNotifications;

// Helper function to manually enable notifications (can be called from UI)
window.enableStreakNotifications = async function () {
    const granted = await StreakNotifications.requestPermission();
    return granted;
};
