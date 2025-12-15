/**
 * Skeleton Loader System
 * Professional loading placeholders for better UX
 * Usage: Import this file and call showSkeleton/hideSkeleton methods
 */

class SkeletonLoader {
    constructor() {
        this.loaders = new Map();
    }

    /**
     * Create and inject skeleton HTML into a container
     * @param {string} elementId - The ID of the container element
     * @param {string} type - Type of skeleton ('text', 'card', 'image', etc.)
     * @param {object} options - Configuration options
     */
    createSkeleton(elementId, type = 'card', options = {}) {
        const container = document.getElementById(elementId);
        if (!container) {
            console.warn(`Element with ID "${elementId}" not found`);
            return;
        }

        const skeletonHTML = this.generateSkeletonHTML(type, options);
        container.innerHTML = skeletonHTML;
        container.classList.add('skeleton-wrapper', 'loading');
        
        this.loaders.set(elementId, { type, options });
    }

    /**
     * Remove skeleton and show actual content
     * @param {string} elementId - The ID of the container element
     * @param {string|HTMLElement} content - The content to show
     */
    hideSkeleton(elementId, content = null) {
        const container = document.getElementById(elementId);
        if (!container) {
            console.warn(`Element with ID "${elementId}" not found`);
            return;
        }

        if (content) {
            if (typeof content === 'string') {
                container.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                container.innerHTML = '';
                container.appendChild(content);
            }
        }

        container.classList.remove('loading');
        container.classList.add('loaded');
        this.loaders.delete(elementId);
    }

    /**
     * Show skeleton loading state
     * @param {string} elementId - The ID of the container element
     */
    show(elementId) {
        const container = document.getElementById(elementId);
        if (!container) return;
        container.classList.add('loading');
        container.classList.remove('loaded');
    }

    /**
     * Hide skeleton loading state
     * @param {string} elementId - The ID of the container element
     */
    hide(elementId) {
        const container = document.getElementById(elementId);
        if (!container) return;
        container.classList.remove('loading');
        container.classList.add('loaded');
    }

    /**
     * Generate skeleton HTML based on type
     * @private
     */
    generateSkeletonHTML(type, options = {}) {
        const skeletons = {
            // Simple text/lines
            text: () => `<div class="skeleton skeleton-text"></div>`,
            
            textShort: () => `<div class="skeleton skeleton-text short"></div>`,
            
            textMedium: () => `<div class="skeleton skeleton-text medium"></div>`,
            
            textLong: () => `<div class="skeleton skeleton-text long"></div>`,

            // Heading
            heading: () => `<div class="skeleton skeleton-heading"></div>`,

            // Avatar
            avatar: () => `<div class="skeleton skeleton-avatar"></div>`,
            
            avatarLarge: () => `<div class="skeleton skeleton-avatar large"></div>`,

            // Image
            image: () => `<div class="skeleton skeleton-image"></div>`,
            
            imageSquare: () => `<div class="skeleton skeleton-image square"></div>`,
            
            imageWide: () => `<div class="skeleton skeleton-image wide"></div>`,

            // Button
            button: () => `<div class="skeleton skeleton-button"></div>`,
            
            buttonSmall: () => `<div class="skeleton skeleton-button small"></div>`,

            // Card - Simple
            card: () => `
                <div class="skeleton-card">
                    <div class="skeleton skeleton-heading" style="width: 50%;"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                    <div class="skeleton skeleton-button" style="margin-top: 1rem;"></div>
                </div>
            `,

            // File Info
            fileInfo: () => `
                <div class="skeleton-file-info">
                    <div class="skeleton-file-row">
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                    </div>
                    <div class="skeleton-file-row">
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                    </div>
                    <div class="skeleton-file-row">
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                    </div>
                    <div class="skeleton-file-row">
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                    </div>
                </div>
            `,

            // Slider Control
            slider: () => `
                <div class="skeleton-slider-group">
                    <div class="skeleton-slider-label">
                        <div class="skeleton skeleton-text" style="width: 30%;"></div>
                        <div class="skeleton skeleton-text" style="width: 30%;"></div>
                    </div>
                    <div class="skeleton skeleton-slider-track"></div>
                    <div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
                        <div class="skeleton skeleton-text" style="width: 25%;"></div>
                        <div class="skeleton skeleton-text" style="width: 25%;"></div>
                    </div>
                </div>
            `,

            // Billing Card
            billingCard: () => `
                <div class="skeleton-billing-card">
                    <div class="skeleton-billing-header">
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                        <div class="skeleton skeleton-text" style="width: 30%;"></div>
                    </div>
                    <div class="skeleton skeleton-text" style="width: 60%; margin-bottom: 1rem;"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                    <div class="skeleton-billing-button"></div>
                </div>
            `,

            // Pricing Grid (3 columns)
            pricingGrid: () => {
                return Array(3).fill(0).map(() => `
                    <div class="skeleton-billing-card">
                        <div class="skeleton skeleton-heading" style="width: 50%; margin-bottom: 1rem;"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text short"></div>
                        <div class="skeleton-billing-button"></div>
                    </div>
                `).join('');
            },

            // Form Input
            formInput: () => `
                <div class="skeleton-form-group">
                    <div class="skeleton skeleton-form-label"></div>
                    <div class="skeleton skeleton-form-input"></div>
                </div>
            `,

            // Form - Login/Register
            authForm: () => `
                <div class="skeleton-auth-container">
                    <div class="skeleton skeleton-heading"></div>
                    <div class="skeleton-social-buttons">
                        <div class="skeleton skeleton-social-button"></div>
                        <div class="skeleton skeleton-social-button"></div>
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: center; margin: 1.5rem 0;">
                        <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                        <div class="skeleton skeleton-text" style="flex: 0 0 40px; margin-bottom: 0;"></div>
                        <div style="flex: 1; height: 1px; background: rgba(255,255,255,0.1);"></div>
                    </div>
                    ${Array(3).fill(0).map(() => `
                        <div class="skeleton-form-group">
                            <div class="skeleton skeleton-form-label"></div>
                            <div class="skeleton skeleton-form-input"></div>
                        </div>
                    `).join('')}
                    <div class="skeleton skeleton-form-button"></div>
                </div>
            `,

            // List with items
            list: () => `
                <div class="skeleton-list">
                    ${Array(3).fill(0).map(() => `
                        <div class="skeleton-list-item">
                            <div class="skeleton skeleton-list-item-avatar"></div>
                            <div class="skeleton-list-item-content" style="flex: 1;">
                                <div class="skeleton skeleton-list-item-title"></div>
                                <div class="skeleton skeleton-list-item-subtitle"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `,

            // Table
            table: () => `
                <div class="skeleton-table-header">
                    <div class="skeleton skeleton-table-cell"></div>
                    <div class="skeleton skeleton-table-cell"></div>
                    <div class="skeleton skeleton-table-cell"></div>
                </div>
                ${Array(3).fill(0).map(() => `
                    <div class="skeleton-table-row">
                        <div class="skeleton skeleton-table-cell"></div>
                        <div class="skeleton skeleton-table-cell"></div>
                        <div class="skeleton skeleton-table-cell"></div>
                    </div>
                `).join('')}
            `,

            // Tool Canvas Area
            toolCanvas: () => `
                <div class="skeleton-tool-canvas">
                    <div class="skeleton skeleton-canvas-image"></div>
                </div>
            `,

            // Tool Panel
            toolPanel: () => `
                <div class="skeleton-tool-panel">
                    <div class="skeleton skeleton-tool-panel-header"></div>
                    ${Array(4).fill(0).map(() => `
                        <div class="skeleton-slider-group">
                            <div class="skeleton skeleton-text" style="width: 50%;"></div>
                            <div class="skeleton skeleton-slider-track"></div>
                        </div>
                    `).join('')}
                </div>
            `,

            // Dashboard Overview Card
            dashboardCard: () => `
                <div class="skeleton-card">
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <div class="skeleton skeleton-avatar"></div>
                        <div style="flex: 1;">
                            <div class="skeleton skeleton-text" style="width: 70%;"></div>
                            <div class="skeleton skeleton-text" style="width: 50%; margin-top: 0.5rem;"></div>
                        </div>
                    </div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
            `,

            // Profile Section
            profile: () => `
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div class="skeleton skeleton-avatar xl" style="margin: 0 auto 1rem;"></div>
                    <div class="skeleton skeleton-heading" style="width: 60%; margin: 0 auto 1rem;"></div>
                    <div class="skeleton skeleton-text" style="width: 70%; margin: 0 auto;"></div>
                </div>
            `,

            // Page Header
            pageHeader: () => `
                <div style="margin-bottom: 2rem;">
                    <div class="skeleton skeleton-heading" style="width: 50%;"></div>
                    <div class="skeleton skeleton-text" style="width: 80%; margin-top: 1rem;"></div>
                </div>
            `,

            // Custom amount of text lines
            textLines: (count = 3) => `
                ${Array(count).fill(0).map((_, i) => `
                    <div class="skeleton skeleton-text" style="width: ${100 - (i * 10)}%;"></div>
                `).join('')}
            `,

            // Tool Card for Grid Display (Index page)
            toolCard: () => {
                return Array(12).fill(0).map(() => `
                    <div class="skeleton-tool-card">
                        <div class="skeleton skeleton-tool-icon"></div>
                        <div class="skeleton skeleton-heading" style="width: 70%; margin: 0.75rem auto;"></div>
                        <div class="skeleton skeleton-text"></div>
                        <div class="skeleton skeleton-text short" style="width: 85%;"></div>
                        <div class="skeleton skeleton-button" style="margin-top: 1rem; height: 40px;"></div>
                    </div>
                `).join('');
            },
        };

        const generator = skeletons[type];
        if (!generator) {
            console.warn(`Skeleton type "${type}" not found`);
            return `<div class="skeleton"></div>`;
        }

        if (typeof generator === 'function' && type.startsWith('textLines')) {
            return generator(options.count);
        }

        return typeof generator === 'function' ? generator() : generator;
    }

    /**
     * Batch show skeleton on multiple elements
     */
    showMultiple(elementIds) {
        elementIds.forEach(id => this.show(id));
    }

    /**
     * Batch hide skeleton on multiple elements
     */
    hideMultiple(elementIds) {
        elementIds.forEach(id => this.hide(id));
    }

    /**
     * Clear all skeletons
     */
    clearAll() {
        this.loaders.forEach((_, elementId) => {
            this.hide(elementId);
        });
        this.loaders.clear();
    }

    /**
     * Wait for skeleton to hide with optional timeout
     */
    async waitForLoad(elementId, timeout = 30000) {
        return new Promise((resolve) => {
            const container = document.getElementById(elementId);
            if (!container) {
                resolve(false);
                return;
            }

            if (!container.classList.contains('loading')) {
                resolve(true);
                return;
            }

            const observer = new MutationObserver(() => {
                if (!container.classList.contains('loading')) {
                    observer.disconnect();
                    resolve(true);
                }
            });

            observer.observe(container, { attributes: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(false);
            }, timeout);
        });
    }
}

// Create global instance
const skeletonLoader = new SkeletonLoader();

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkeletonLoader;
}
