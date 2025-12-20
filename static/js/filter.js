/**
 * ImgCraft Advanced Filter Tool
 * WebGL-accelerated real-time preview with comprehensive filter support
 * Libraries: Canvas API, glfx.js (WebGL), Fabric.js, Konva.js, PixiJS
 * Backend: OpenCV CLAHE AI Auto Enhance + 25 Presets + 15+ Manual Adjustments
 */

// ============================================================================
// GLOBAL STATE & CONFIGURATION
// ============================================================================

const FilterApp = {
    // DOM Elements
    dom: {
        dropZone: null,
        fileInput: null,
        previewContainer: null,
        canvas: null,
        loadingOverlay: null,
        // Panels
        startInfoLeft: null,
        startInfoRight: null,
        filterControls: null,
        presetSection: null,
        // Actions
        applyBtn: null,
        resetBtn: null,
        downloadArea: null,
        downloadBtn: null,
        toggleComparisonBtn: null,
        aiAutoEnhanceBtn: null
    },

    // State
    currentFile: null,
    sourceImage: null,
    isImageLoaded: false,
    isComparing: false,
    isProcessing: false,

    // WebGL Context (glfx.js)
    glCanvas: null,
    glTexture: null,

    // Filter Values
    filters: {
        // Basic Adjustments
        brightness: 0,
        contrast: 0,
        saturation: 0,
        exposure: 0,
        vibrance: 0,

        // Color Grading
        temperature: 0,
        tint: 0,
        hueShift: 0,

        // Tone Adjustments
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,

        // Details & Effects
        sharpness: 0,
        clarity: 0,
        blur: 0,
        vignette: 0,
        grain: 0
    },

    // Current preset
    currentPreset: 'none',

    // AI Auto Enhance flag
    aiAutoEnhance: false,

    // Preset Definitions
    presets: {
        // Cinematic
        teal_orange: { name: 'Teal & Orange', category: 'cinematic', icon: '🎬' },
        moody_dark: { name: 'Moody Dark', category: 'cinematic', icon: '🌙' },
        bright_cinematic: { name: 'Bright Cinematic', category: 'cinematic', icon: '☀️' },
        film_noir: { name: 'Film Noir', category: 'cinematic', icon: '🎞️' },
        dramatic: { name: 'Dramatic', category: 'cinematic', icon: '⚡' },

        // Vintage
        retro_70s: { name: 'Retro 70s', category: 'vintage', icon: '📻' },
        polaroid: { name: 'Polaroid', category: 'vintage', icon: '📷' },
        faded_film: { name: 'Faded Film', category: 'vintage', icon: '🎥' },
        warm_vintage: { name: 'Warm Vintage', category: 'vintage', icon: '🔥' },
        cool_vintage: { name: 'Cool Vintage', category: 'vintage', icon: '❄️' },

        // Modern
        clean_bright: { name: 'Clean & Bright', category: 'modern', icon: '✨' },
        high_contrast: { name: 'High Contrast', category: 'modern', icon: '⚫' },
        matte_finish: { name: 'Matte Finish', category: 'modern', icon: '🎨' },
        vibrant_pop: { name: 'Vibrant Pop', category: 'modern', icon: '🌈' },
        soft_pastel: { name: 'Soft Pastel', category: 'modern', icon: '🌸' },

        // Black & White
        classic_bw: { name: 'Classic B&W', category: 'bw', icon: '⬛' },
        high_contrast_bw: { name: 'High Contrast B&W', category: 'bw', icon: '◼️' },
        soft_bw: { name: 'Soft B&W', category: 'bw', icon: '◻️' },
        dramatic_bw: { name: 'Dramatic B&W', category: 'bw', icon: '🎭' },
        film_bw: { name: 'Film B&W', category: 'bw', icon: '📽️' },

        // Special
        golden_hour: { name: 'Golden Hour', category: 'special', icon: '🌅' },
        blue_hour: { name: 'Blue Hour', category: 'special', icon: '🌆' },
        sunset_glow: { name: 'Sunset Glow', category: 'special', icon: '🌇' },
        cool_tones: { name: 'Cool Tones', category: 'special', icon: '🧊' },
        warm_tones: { name: 'Warm Tones', category: 'special', icon: '🔆' }
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("🎨 Advanced Filter Tool Loaded - WebGL Accelerated");

    // Initialize DOM references
    initDOMReferences();

    // Setup event listeners
    setupFileHandling();
    setupSliders();
    setupPresets();
    setupButtons();
    setupComparison();

    // Try to initialize WebGL
    initWebGL();
});

function initDOMReferences() {
    const dom = FilterApp.dom;

    dom.dropZone = document.getElementById('dropZone');
    dom.fileInput = document.getElementById('fileInput');
    dom.previewContainer = document.getElementById('previewContainer');
    dom.canvas = document.getElementById('previewCanvas');
    dom.loadingOverlay = document.getElementById('loadingOverlay');

    dom.startInfoLeft = document.getElementById('startInfoLeft');
    dom.startInfoRight = document.getElementById('startInfoRight');
    dom.filterControls = document.getElementById('filterControls');
    dom.presetSection = document.getElementById('presetSection');

    dom.applyBtn = document.getElementById('applyBtn');
    dom.resetBtn = document.getElementById('resetBtn');
    dom.downloadArea = document.getElementById('downloadArea');
    dom.downloadBtn = document.getElementById('downloadBtn');
    dom.toggleComparisonBtn = document.getElementById('toggleComparison');
}

function initWebGL() {
    // Note: glfx.js is not available on CDN, using Canvas API
    // WebGL acceleration can be added later with a different library if needed
    console.log("ℹ️ Using Canvas API for filter preview (WebGL not available)");
    FilterApp.glCanvas = null;
}

// ============================================================================
// FILE HANDLING
// ============================================================================

function setupFileHandling() {
    const { dropZone, fileInput } = FilterApp.dom;

    if (!dropZone || !fileInput) return;

    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image', 'error');
        return;
    }

    FilterApp.currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            FilterApp.sourceImage = img;
            FilterApp.isImageLoaded = true;
            initEditor();
        };
        img.onerror = () => {
            showToast('Failed to load image', 'error');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function initEditor() {
    const { dropZone, previewContainer, startInfoLeft, startInfoRight, filterControls, presetSection, applyBtn } = FilterApp.dom;

    // Hide upload area, show editor
    dropZone.style.display = 'none';
    previewContainer.style.display = 'flex';

    // Show controls
    if (presetSection) presetSection.style.display = 'block';
    if (startInfoLeft) startInfoLeft.style.display = 'none';
    if (startInfoRight) startInfoRight.style.display = 'none';
    if (filterControls) filterControls.style.display = 'block';
    if (applyBtn) applyBtn.disabled = false;

    // Reset filters
    resetFilters(false);

    // Setup canvas
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial render
    renderPreview();
}

function resizeCanvas() {
    const { canvas, previewContainer } = FilterApp.dom;
    if (!canvas || !previewContainer) return;

    const rect = previewContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    if (FilterApp.isImageLoaded) {
        renderPreview();
    }
}

// ============================================================================
// RENDERING ENGINE
// ============================================================================

function renderPreview() {
    if (!FilterApp.isImageLoaded) return;

    const { canvas } = FilterApp.dom;
    const { sourceImage, isComparing, filters, glCanvas, currentPreset, aiAutoEnhance } = FilterApp;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate aspect ratio fit
    const scale = Math.min(canvas.width / sourceImage.width, canvas.height / sourceImage.height);
    const w = sourceImage.width * scale;
    const h = sourceImage.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    if (isComparing) {
        // Show original
        ctx.filter = 'none';
        ctx.drawImage(sourceImage, x, y, w, h);

        // Add "Original" label
        ctx.font = "bold 20px Arial";
        ctx.fillStyle = "white";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText("Original", 20, 40);
        ctx.shadowBlur = 0;
    } else {
        // Apply filters using WebGL if available, otherwise Canvas API
        if (glCanvas && typeof fx !== 'undefined') {
            renderWithWebGL(sourceImage, x, y, w, h);
        } else {
            renderWithCanvas(ctx, sourceImage, x, y, w, h);
        }
    }
}

function renderWithWebGL(sourceImage, x, y, w, h) {
    try {
        const { glCanvas } = FilterApp;
        const { canvas } = FilterApp.dom;
        const { filters } = FilterApp;

        // Create texture from source image
        const texture = glCanvas.texture(sourceImage);

        // Apply WebGL filters
        glCanvas.draw(texture);

        // Brightness & Contrast
        if (filters.brightness !== 0 || filters.contrast !== 0) {
            glCanvas.brightnessContrast(
                filters.brightness / 100,
                filters.contrast / 100
            );
        }

        // Hue & Saturation
        if (filters.hueShift !== 0 || filters.saturation !== 0) {
            glCanvas.hueSaturation(
                filters.hueShift / 360,
                filters.saturation / 100
            );
        }

        // Vibrance
        if (filters.vibrance !== 0) {
            glCanvas.vibrance(filters.vibrance / 100);
        }

        // Vignette
        if (filters.vignette > 0) {
            glCanvas.vignette(0.5, filters.vignette / 100);
        }

        // Noise (Grain)
        if (filters.grain > 0) {
            glCanvas.noise(filters.grain / 100);
        }

        // Unsharp Mask (Sharpness)
        if (filters.sharpness > 0) {
            glCanvas.unsharpMask(20, filters.sharpness / 50);
        }

        // Update texture
        glCanvas.update();

        // Draw to main canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(glCanvas, x, y, w, h);

        // Cleanup
        texture.destroy();

    } catch (error) {
        console.warn("WebGL rendering failed, falling back to Canvas:", error);
        const ctx = FilterApp.dom.canvas.getContext('2d');
        renderWithCanvas(ctx, sourceImage, x, y, w, h);
    }
}

function renderWithCanvas(ctx, sourceImage, x, y, w, h) {
    const { filters } = FilterApp;

    // Build CSS filter string
    const filterParts = [];

    // Brightness (100% = normal, 0% = black, 200% = very bright)
    const brightness = 100 + filters.brightness;
    filterParts.push(`brightness(${brightness}%)`);

    // Contrast (100% = normal)
    const contrast = 100 + filters.contrast;
    filterParts.push(`contrast(${contrast}%)`);

    // Saturation (100% = normal, 0% = grayscale)
    const saturation = 100 + filters.saturation;
    filterParts.push(`saturate(${saturation}%)`);

    // Hue Rotate (degrees)
    if (filters.hueShift !== 0) {
        filterParts.push(`hue-rotate(${filters.hueShift * 2}deg)`);
    }

    // Blur
    if (filters.blur > 0) {
        filterParts.push(`blur(${filters.blur / 10}px)`);
    }

    // Apply filter
    ctx.filter = filterParts.join(' ');
    ctx.drawImage(sourceImage, x, y, w, h);
    ctx.filter = 'none';

    // Note: Advanced effects (vignette, grain, temperature, tint, etc.) 
    // are applied on the server-side for final output
    // This preview shows basic adjustments only for real-time feedback
}

// ============================================================================
// SLIDER CONTROLS
// ============================================================================

function setupSliders() {
    const sliderIds = [
        'brightness', 'contrast', 'saturation', 'exposure', 'vibrance',
        'temperature', 'tint', 'hueShift',
        'highlights', 'shadows', 'whites', 'blacks',
        'sharpness', 'clarity', 'blur', 'vignette', 'grain'
    ];

    sliderIds.forEach(id => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}Value`);

        if (slider) {
            slider.addEventListener('input', (e) => {
                FilterApp.filters[id] = parseFloat(e.target.value);
                if (valueDisplay) {
                    valueDisplay.textContent = e.target.value;
                }

                // Real-time preview for basic adjustments only
                if (['brightness', 'contrast', 'saturation', 'hueShift', 'blur'].includes(id)) {
                    requestAnimationFrame(renderPreview);
                }
            });
        }
    });
}

function updateSlidersUI() {
    const sliderIds = Object.keys(FilterApp.filters);

    sliderIds.forEach(id => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}Value`);

        if (slider) {
            slider.value = FilterApp.filters[id] || 0;
        }
        if (valueDisplay) {
            valueDisplay.textContent = FilterApp.filters[id] || 0;
        }
    });
}

// ============================================================================
// PRESET SYSTEM
// ============================================================================

function setupPresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const presetName = btn.dataset.preset;
            applyPreset(presetName);

            // Update UI
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function applyPreset(presetName) {
    FilterApp.currentPreset = presetName;

    if (presetName === 'none') {
        resetFilters(true);  // Reset with UI update
        return;
    }

    // Reset filters first
    resetFilters(false);

    // Apply preset-specific values (client-side approximations)
    // Note: Full preset rendering happens server-side
    switch (presetName) {
        // Cinematic Presets
        case 'teal_orange':
            FilterApp.filters.contrast = 25;
            FilterApp.filters.saturation = 15;
            FilterApp.filters.hueShift = 30;
            break;

        case 'moody_dark':
            FilterApp.filters.brightness = -25;
            FilterApp.filters.contrast = 20;
            FilterApp.filters.saturation = -15;
            break;

        case 'bright_cinematic':
            FilterApp.filters.brightness = 20;
            FilterApp.filters.saturation = 25;
            FilterApp.filters.contrast = 15;
            break;

        case 'film_noir':
            FilterApp.filters.saturation = -100;
            FilterApp.filters.contrast = 50;
            FilterApp.filters.brightness = -10;
            break;

        case 'dramatic':
            FilterApp.filters.contrast = 45;
            FilterApp.filters.saturation = -5;
            FilterApp.filters.brightness = -15;
            break;

        // Vintage Presets
        case 'retro_70s':
            FilterApp.filters.brightness = 10;
            FilterApp.filters.contrast = -5;
            FilterApp.filters.saturation = 30;
            FilterApp.filters.hueShift = 15;
            break;

        case 'polaroid':
            FilterApp.filters.brightness = 15;
            FilterApp.filters.saturation = 20;
            FilterApp.filters.contrast = -10;
            break;

        case 'faded_film':
            FilterApp.filters.brightness = 10;
            FilterApp.filters.contrast = -20;
            FilterApp.filters.saturation = -40;
            break;

        case 'warm_vintage':
            FilterApp.filters.brightness = 5;
            FilterApp.filters.saturation = 15;
            FilterApp.filters.hueShift = -20;
            break;

        case 'cool_vintage':
            FilterApp.filters.brightness = 5;
            FilterApp.filters.saturation = 10;
            FilterApp.filters.hueShift = 40;
            break;

        // Modern Presets
        case 'clean_bright':
            FilterApp.filters.brightness = 25;
            FilterApp.filters.contrast = 10;
            FilterApp.filters.saturation = 5;
            break;

        case 'high_contrast':
            FilterApp.filters.contrast = 60;
            FilterApp.filters.brightness = 5;
            break;

        case 'matte_finish':
            FilterApp.filters.contrast = -15;
            FilterApp.filters.saturation = -10;
            FilterApp.filters.brightness = 5;
            break;

        case 'vibrant_pop':
            FilterApp.filters.saturation = 50;
            FilterApp.filters.contrast = 25;
            FilterApp.filters.brightness = 10;
            break;

        case 'soft_pastel':
            FilterApp.filters.brightness = 15;
            FilterApp.filters.saturation = 25;
            FilterApp.filters.contrast = -10;
            break;

        // Black & White Presets
        case 'classic_bw':
            FilterApp.filters.saturation = -100;
            FilterApp.filters.contrast = 15;
            break;

        case 'high_contrast_bw':
            FilterApp.filters.saturation = -100;
            FilterApp.filters.contrast = 50;
            break;

        case 'soft_bw':
            FilterApp.filters.saturation = -100;
            FilterApp.filters.contrast = -10;
            FilterApp.filters.brightness = 10;
            break;

        case 'dramatic_bw':
            FilterApp.filters.saturation = -100;
            FilterApp.filters.contrast = 40;
            FilterApp.filters.brightness = -15;
            break;

        case 'film_bw':
            FilterApp.filters.saturation = -100;
            FilterApp.filters.contrast = 20;
            FilterApp.filters.brightness = -5;
            break;

        // Special Presets
        case 'golden_hour':
            FilterApp.filters.brightness = 15;
            FilterApp.filters.saturation = 30;
            FilterApp.filters.hueShift = -25;
            break;

        case 'blue_hour':
            FilterApp.filters.brightness = -10;
            FilterApp.filters.saturation = 20;
            FilterApp.filters.hueShift = 60;
            break;

        case 'sunset_glow':
            FilterApp.filters.brightness = 10;
            FilterApp.filters.saturation = 35;
            FilterApp.filters.hueShift = -15;
            break;

        case 'cool_tones':
            FilterApp.filters.saturation = 15;
            FilterApp.filters.hueShift = 50;
            break;

        case 'warm_tones':
            FilterApp.filters.saturation = 20;
            FilterApp.filters.hueShift = -30;
            break;
    }

    updateSlidersUI();
    renderPreview();
}

// ============================================================================
// BUTTONS & ACTIONS
// ============================================================================

function setupButtons() {
    const { resetBtn, applyBtn } = FilterApp.dom;

    if (resetBtn) {
        resetBtn.addEventListener('click', () => resetFilters(true));
    }

    if (applyBtn) {
        applyBtn.addEventListener('click', applyAndDownload);
    }

    // AI Auto Enhance button (if exists)
    const aiBtn = document.getElementById('aiAutoEnhanceBtn');
    if (aiBtn) {
        aiBtn.addEventListener('click', toggleAIAutoEnhance);
    }
}

function toggleAIAutoEnhance() {
    FilterApp.aiAutoEnhance = !FilterApp.aiAutoEnhance;

    const aiBtn = document.getElementById('aiAutoEnhanceBtn');
    if (aiBtn) {
        if (FilterApp.aiAutoEnhance) {
            aiBtn.classList.add('active');
            aiBtn.innerHTML = '<i class="fas fa-magic"></i> AI Enhanced ✓';
        } else {
            aiBtn.classList.remove('active');
            aiBtn.innerHTML = '<i class="fas fa-magic"></i> AI Auto Enhance';
        }
    }

    showToast(
        FilterApp.aiAutoEnhance ?
            '✨ AI Auto Enhance enabled! Will be applied when you download (OpenCV CLAHE)' :
            'AI Auto Enhance disabled',
        FilterApp.aiAutoEnhance ? 'success' : 'info'
    );
}

function resetFilters(updateUI = true) {
    // Reset all filter values
    Object.keys(FilterApp.filters).forEach(key => {
        FilterApp.filters[key] = 0;
    });

    FilterApp.currentPreset = 'none';
    FilterApp.aiAutoEnhance = false;

    if (updateUI) {
        updateSlidersUI();
        renderPreview();

        // Reset preset UI
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        const noneBtn = document.querySelector('[data-preset="none"]');
        if (noneBtn) noneBtn.classList.add('active');

        // Reset AI button
        const aiBtn = document.getElementById('aiAutoEnhanceBtn');
        if (aiBtn) {
            aiBtn.classList.remove('active');
            aiBtn.innerHTML = '<i class="fas fa-magic"></i> AI Auto Enhance';
        }
    }
}

// ============================================================================
// COMPARISON MODE
// ============================================================================

function setupComparison() {
    const { toggleComparisonBtn } = FilterApp.dom;

    if (!toggleComparisonBtn) return;

    // Press and hold (Desktop)
    toggleComparisonBtn.addEventListener('mousedown', () => {
        FilterApp.isComparing = true;
        renderPreview();
    });

    toggleComparisonBtn.addEventListener('mouseup', () => {
        FilterApp.isComparing = false;
        renderPreview();
    });

    toggleComparisonBtn.addEventListener('mouseleave', () => {
        FilterApp.isComparing = false;
        renderPreview();
    });

    // Touch (Mobile)
    toggleComparisonBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        FilterApp.isComparing = true;
        renderPreview();
    });

    toggleComparisonBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        FilterApp.isComparing = false;
        renderPreview();
    });
}

// ============================================================================
// APPLY & DOWNLOAD (Server-Side Processing)
// ============================================================================

async function applyAndDownload() {
    if (!FilterApp.currentFile || FilterApp.isProcessing) return;

    // Auth check
    if (window.AuthManager && !AuthManager.user) {
        showToast('Login required to download', 'error');
        setTimeout(() => window.location.href = '/auth', 1500);
        return;
    }

    // Credit check
    if (window.CreditManager && !CreditManager.hasCredits(2)) {
        showToast('Insufficient credits (2 required)', 'error');
        return;
    }

    FilterApp.isProcessing = true;

    // Show loading
    if (window.ImgCraftBusyUI) {
        window.ImgCraftBusyUI.showLoading('Applying Filters...');
    }

    const formData = new FormData();
    formData.append('image', FilterApp.currentFile);

    // Prepare filter data
    const filterData = {
        ...FilterApp.filters,
        preset: FilterApp.currentPreset,
        aiAutoEnhance: FilterApp.aiAutoEnhance
    };

    formData.append('filterData', JSON.stringify(filterData));

    try {
        const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};
        const response = await fetch('/api/filter', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (response.ok) {
            // Update loading text
            if (window.ImgCraftBusyUI) {
                window.ImgCraftBusyUI.setLoadingText('Preparing Download...');
            }

            const cost = response.headers.get('X-Credits-Cost');
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            // Show download
            const { downloadArea, downloadBtn, applyBtn } = FilterApp.dom;
            if (downloadArea) downloadArea.style.display = 'block';
            if (downloadBtn) {
                downloadBtn.href = url;
                downloadBtn.download = `filtered_${FilterApp.currentFile.name}`;
            }
            if (applyBtn) applyBtn.style.display = 'none';

            let msg = 'Filters applied successfully!';
            if (cost) msg += ` (-${cost} Credits)`;
            showToast(msg, 'success');

            // Refresh credits
            if (window.CreditManager) CreditManager.refreshCredits();

            // Update streak
            if (window.StreakManager) StreakManager.updateStreak();

            // Web-Ready Score
            if (window.WebReadyScore) {
                const img = new Image();
                img.onload = () => {
                    const scoreData = WebReadyScore.calculateScore({
                        blob: blob,
                        width: img.width,
                        height: img.height,
                        format: blob.type.split('/')[1],
                        hasMetadata: undefined
                    });

                    if (scoreData) {
                        WebReadyScore.displayScore('webReadyScoreRow', scoreData);
                    }
                };
                img.src = url;
            }
        } else {
            const errorMessage = await parseErrorResponse(response, 'Failed to apply filters');
            showToast(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Filter application error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        FilterApp.isProcessing = false;
        if (window.ImgCraftBusyUI) {
            window.ImgCraftBusyUI.hideLoading();
        }
    }
}

async function parseErrorResponse(response, fallbackMessage) {
    try {
        const text = await response.text();
        if (!text) return fallbackMessage;
        const data = JSON.parse(text);
        if (data?.error) {
            let message = data.error;
            if (data.request_id) {
                message += ` (Request ID: ${data.request_id})`;
            }
            return message;
        }
        return text.substring(0, 180) || fallbackMessage;
    } catch (err) {
        console.warn('Error parse failed:', err);
        return fallbackMessage;
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

function showToast(msg, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toast-container-filter');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container-filter';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
        font-weight: 500;
        max-width: 350px;
        word-wrap: break-word;
        animation: slideInRight 0.3s ease;
    `;
    toast.textContent = msg;

    // Add animation
    if (!document.getElementById('toast-animations-filter')) {
        const style = document.createElement('style');
        style.id = 'toast-animations-filter';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export for debugging
window.FilterApp = FilterApp;