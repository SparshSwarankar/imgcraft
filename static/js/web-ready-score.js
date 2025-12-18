/**
 * Web-Ready Score System
 * Client-side image optimization scoring for ImgCraft
 * 
 * Evaluates images based on:
 * - File Size (40%)
 * - Format (30%)
 * - Metadata (15%)
 * - Dimensions (15%)
 */

const WebReadyScore = {
    /**
     * Calculate Web-Ready Score for an image
     * @param {Object} imageData - { blob, width, height, format, hasMetadata }
     * @returns {Object} - { score, breakdown, tips, grade }
     */
    calculateScore(imageData) {
        if (!imageData || !imageData.blob) {
            return null;
        }

        const breakdown = {
            fileSize: this._scoreFileSize(imageData.blob.size),
            format: this._scoreFormat(imageData.format || imageData.blob.type.split('/')[1]),
            metadata: this._scoreMetadata(imageData.hasMetadata),
            dimensions: this._scoreDimensions(imageData.width, imageData.height)
        };

        const totalScore = Math.round(
            breakdown.fileSize.score +
            breakdown.format.score +
            breakdown.metadata.score +
            breakdown.dimensions.score
        );

        return {
            score: totalScore,
            breakdown: breakdown,
            tips: this._generateTips(breakdown, imageData),
            grade: this._getGrade(totalScore)
        };
    },

    /**
     * Score based on file size (40 points max)
     */
    _scoreFileSize(bytes) {
        const kb = bytes / 1024;
        const mb = kb / 1024;

        let score, feedback;

        if (kb < 100) {
            score = 40;
            feedback = 'Excellent size for web';
        } else if (kb < 500) {
            score = 30;
            feedback = 'Good size for web';
        } else if (mb < 1) {
            score = 20;
            feedback = 'Acceptable size';
        } else if (mb < 2) {
            score = 10;
            feedback = 'Large file size';
        } else {
            score = 5;
            feedback = 'Very large file';
        }

        return { score, feedback, value: this._formatBytes(bytes) };
    },

    /**
     * Score based on image format (30 points max)
     */
    _scoreFormat(format) {
        format = format.toLowerCase();
        let score, feedback;

        if (format === 'webp' || format === 'avif') {
            score = 30;
            feedback = 'Modern web format';
        } else if (format === 'png') {
            score = 25;
            feedback = 'Good for transparency';
        } else if (format === 'jpeg' || format === 'jpg') {
            score = 20;
            feedback = 'Standard web format';
        } else if (format === 'gif') {
            score = 10;
            feedback = 'Consider WebP for animations';
        } else {
            score = 5;
            feedback = 'Legacy format';
        }

        return { score, feedback, value: format.toUpperCase() };
    },

    /**
     * Score based on metadata presence (15 points max)
     */
    _scoreMetadata(hasMetadata) {
        if (hasMetadata === undefined || hasMetadata === null) {
            // Can't determine, give neutral score
            return { score: 10, feedback: 'Metadata unknown', value: 'Unknown' };
        }

        if (!hasMetadata) {
            return { score: 15, feedback: 'Metadata stripped', value: 'Clean' };
        } else {
            return { score: 0, feedback: 'Contains metadata', value: 'Present' };
        }
    },

    /**
     * Score based on dimensions (15 points max)
     */
    _scoreDimensions(width, height) {
        if (!width || !height) {
            return { score: 10, feedback: 'Dimensions unknown', value: 'Unknown' };
        }

        const maxDim = Math.max(width, height);
        const aspectRatio = width / height;
        let score, feedback;

        // Check for common web sizes
        const isHero = (width >= 1800 && width <= 2000) && (height >= 900 && height <= 1200);
        const isSocial = (width >= 1200 && width <= 1300) && (height >= 600 && height <= 700);
        const isThumbnail = maxDim <= 800;
        const isStandard = maxDim > 800 && maxDim <= 1920;

        if (isHero || isSocial) {
            score = 15;
            feedback = isHero ? 'Perfect for hero images' : 'Perfect for social media';
        } else if (isThumbnail) {
            score = 15;
            feedback = 'Great for thumbnails';
        } else if (isStandard) {
            score = 12;
            feedback = 'Good web dimensions';
        } else if (maxDim > 2000) {
            score = 5;
            feedback = 'Consider resizing';
        } else {
            score = 10;
            feedback = 'Acceptable dimensions';
        }

        return { score, feedback, value: `${width} × ${height}` };
    },

    /**
     * Generate optimization tips based on breakdown
     */
    _generateTips(breakdown, imageData) {
        const tips = [];

        // File size tips
        if (breakdown.fileSize.score < 20) {
            tips.push('💡 Compress the image to reduce file size');
        }

        // Format tips
        if (breakdown.format.score < 25) {
            const format = imageData.format || imageData.blob.type.split('/')[1];
            if (format.toLowerCase() !== 'webp' && format.toLowerCase() !== 'avif') {
                tips.push('💡 Convert to WebP for better compression');
            }
        }

        // Metadata tips
        if (breakdown.metadata.score === 0) {
            tips.push('💡 Remove EXIF data to reduce size and improve privacy');
        }

        // Dimensions tips
        if (breakdown.dimensions.score < 10) {
            tips.push('💡 Resize to common web dimensions (e.g., 1920×1080)');
        }

        // Positive feedback
        if (tips.length === 0) {
            tips.push('✨ This image is well-optimized for web use!');
        }

        return tips;
    },

    /**
     * Get letter grade based on score
     */
    _getGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    },

    /**
     * Format bytes to human-readable string
     */
    _formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Display the Web-Ready Score in the UI
     * @param {string} containerId - ID of the container element
     * @param {Object} scoreData - Result from calculateScore()
     */
    displayScore(containerId, scoreData) {
        if (!scoreData) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        // Update score value
        const scoreValue = container.querySelector('#scoreValue');
        if (scoreValue) {
            scoreValue.textContent = `${scoreData.score}/100`;
            scoreValue.style.color = this._getScoreColor(scoreData.score);
        }

        // Update score ring (SVG circular progress)
        this._updateScoreRing(container, scoreData.score);

        // Update tips
        const scoreTips = container.querySelector('#scoreTips');
        if (scoreTips && scoreData.tips.length > 0) {
            scoreTips.innerHTML = scoreData.tips.map(tip =>
                `<div style="margin-top: 4px;">${tip}</div>`
            ).join('');
        }

        // Show the container
        container.style.display = 'block';

        // Add animation
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        setTimeout(() => {
            container.style.transition = 'all 0.3s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 50);
    },

    /**
     * Update SVG circular progress ring
     */
    _updateScoreRing(container, score) {
        const ring = container.querySelector('#scoreRing');
        if (!ring) return;

        const percentage = score;
        const circumference = 2 * Math.PI * 22; // radius = 22
        const offset = circumference - (percentage / 100) * circumference;

        ring.innerHTML = `
            <circle cx="30" cy="30" r="22" 
                fill="none" 
                stroke="rgba(255,255,255,0.1)" 
                stroke-width="4"/>
            <circle cx="30" cy="30" r="22" 
                fill="none" 
                stroke="${this._getScoreColor(score)}" 
                stroke-width="4"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
                stroke-linecap="round"
                transform="rotate(-90 30 30)"
                style="transition: stroke-dashoffset 0.5s ease;"/>
            <text x="30" y="35" 
                text-anchor="middle" 
                font-size="14" 
                font-weight="700" 
                fill="${this._getScoreColor(score)}">
                ${score}
            </text>
        `;
    },

    /**
     * Get color based on score
     */
    _getScoreColor(score) {
        if (score >= 80) return '#22C55E'; // Green
        if (score >= 60) return '#F59E0B'; // Yellow/Orange
        return '#EF4444'; // Red
    }
};

// Make available globally
window.WebReadyScore = WebReadyScore;
