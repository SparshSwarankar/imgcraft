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
