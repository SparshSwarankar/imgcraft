/**
 * Font Switcher - Dynamic Font Family Changer
 * Allows users to switch between different font families
 */

(function () {
    'use strict';

    // Font configurations
    const FONTS = {
        'inter': {
            name: 'Inter',
            family: "'Inter', sans-serif",
            class: 'font-inter'
        },
        'poppins': {
            name: 'Poppins',
            family: "'Poppins', sans-serif",
            class: 'font-poppins'
        },
        'fira-code': {
            name: 'Fira Code',
            family: "'Fira Code', monospace",
            class: 'font-fira-code'
        }
    };

    const STORAGE_KEY = 'imgcraft_font_preference';
    const DEFAULT_FONT = 'poppins';

    /**
     * Initialize font switcher
     */
    function init() {
        // Load saved font preference
        const savedFont = localStorage.getItem(STORAGE_KEY) || DEFAULT_FONT;
        applyFont(savedFont);

        // Setup event listeners
        setupFontButtons();

        // Set initial active state
        setInitialActiveState(savedFont);
    }

    /**
     * Set initial active state based on saved preference
     */
    function setInitialActiveState(fontKey) {
        const buttons = document.querySelectorAll('.font-option');
        buttons.forEach(btn => {
            if (btn.getAttribute('data-font') === fontKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /**
     * Setup click handlers for font option buttons
     */
    function setupFontButtons() {
        const fontButtons = document.querySelectorAll('.font-option');

        fontButtons.forEach(button => {
            button.addEventListener('click', function () {
                const fontKey = this.getAttribute('data-font');

                if (fontKey && FONTS[fontKey]) {
                    applyFont(fontKey);
                    saveFontPreference(fontKey);
                    updateActiveButton(this);

                    // Show feedback
                    showFontChangeFeedback(FONTS[fontKey].name);
                }
            });
        });
    }

    /**
     * Apply font to the document
     */
    function applyFont(fontKey) {
        const font = FONTS[fontKey];

        if (!font) {
            console.warn(`Font "${fontKey}" not found, using default`);
            fontKey = DEFAULT_FONT;
        }

        // Remove all font classes
        Object.values(FONTS).forEach(f => {
            document.body.classList.remove(f.class);
        });

        // Add selected font class
        document.body.classList.add(FONTS[fontKey].class);

        // Update CSS variables (fallback)
        document.documentElement.style.setProperty('--font-main', FONTS[fontKey].family);
        document.documentElement.style.setProperty('--font-heading', FONTS[fontKey].family);
    }

    /**
     * Save font preference to localStorage
     */
    function saveFontPreference(fontKey) {
        try {
            localStorage.setItem(STORAGE_KEY, fontKey);
        } catch (e) {
            console.warn('Could not save font preference:', e);
        }
    }

    /**
     * Update active state of font buttons
     */
    function updateActiveButton(activeButton) {
        // Remove active class from all buttons
        document.querySelectorAll('.font-option').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to clicked button
        activeButton.classList.add('active');
    }

    /**
     * Show visual feedback when font changes
     */
    function showFontChangeFeedback(fontName) {
        // Use global toast if available
        if (window.showToast) {
            window.showToast(`Font changed to ${fontName}`, 'success');
        } else {
            console.log(`Font changed to ${fontName}`);
        }
    }

    /**
     * Get current font preference
     */
    function getCurrentFont() {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_FONT;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API for external use
    window.FontSwitcher = {
        applyFont: applyFont,
        getCurrentFont: getCurrentFont,
        fonts: FONTS
    };

})();
