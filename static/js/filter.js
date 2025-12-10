document.addEventListener('DOMContentLoaded', () => {
    console.log("Filter Tool Loaded - Studio Version");

    // --- DOM ELEMENTS ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Panels
    const startInfoLeft = document.getElementById('startInfoLeft');
    const startInfoRight = document.getElementById('startInfoRight');
    const filterControls = document.getElementById('filterControls');
    const presetSection = document.getElementById('presetSection');

    // Actions
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadArea = document.getElementById('downloadArea');
    const downloadBtn = document.getElementById('downloadBtn');
    const toggleComparisonBtn = document.getElementById('toggleComparison');

    // State
    let currentFile = null;
    let sourceImage = null;
    let isImageLoaded = false;
    let isComparing = false; // True = Show Original

    let filters = {
        brightness: 0, contrast: 0, saturation: 0, exposure: 0,
        sharpness: 0, vignette: 0, grain: 0, temperature: 0, tint: 0,
        highlights: 0, shadows: 0, vibrance: 0
    };

    // --- File Handling ---
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please upload a valid image', 'error');
            return;
        }
        currentFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            sourceImage = new Image();
            sourceImage.onload = () => {
                isImageLoaded = true;
                initEditor();
            };
            sourceImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function initEditor() {
        dropZone.style.display = 'none';
        previewContainer.style.display = 'flex';

        // Show presets
        if (presetSection) presetSection.style.display = 'block';

        startInfoLeft.style.display = 'none';
        startInfoRight.style.display = 'none';
        filterControls.style.display = 'block';

        applyBtn.disabled = false;
        resetBtn.disabled = false;
        downloadArea.style.display = 'none';

        // Resize Canvas to fit container
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        drawPreview();
    }

    function resizeCanvas() {
        if (!canvas || !previewContainer) return;
        const rect = previewContainer.getBoundingClientRect();
        // Set internal resolution matches display size for crispness
        canvas.width = rect.width;
        canvas.height = rect.height;
        if (isImageLoaded) drawPreview();
    }

    // --- Comparison Logic ---
    if (toggleComparisonBtn) {
        // Press and hold behavior (Desktop)
        toggleComparisonBtn.addEventListener('mousedown', () => { isComparing = true; drawPreview(); });
        toggleComparisonBtn.addEventListener('mouseup', () => { isComparing = false; drawPreview(); });
        toggleComparisonBtn.addEventListener('mouseleave', () => { isComparing = false; drawPreview(); });

        // Touch behavior
        toggleComparisonBtn.addEventListener('touchstart', (e) => { e.preventDefault(); isComparing = true; drawPreview(); });
        toggleComparisonBtn.addEventListener('touchend', (e) => { e.preventDefault(); isComparing = false; drawPreview(); });
    }

    // --- Rendering Logic (Client-Side Preview) ---
    function drawPreview() {
        if (!isImageLoaded || !ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate Aspect Ratio Fit
        const scale = Math.min(canvas.width / sourceImage.width, canvas.height / sourceImage.height);
        const w = sourceImage.width * scale;
        const h = sourceImage.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        // Determine Filters
        if (isComparing) {
            // Show Original (No Filters)
            ctx.filter = 'none';

            // Add "Original" Label
            ctx.drawImage(sourceImage, x, y, w, h);

            ctx.font = "bold 20px Arial";
            ctx.fillStyle = "white";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;
            ctx.fillText("Original", 20, 40);
        } else {
            // Apply Filters
            // Note: Canvas context filter string format
            // Brightness/Contrast: 100% is base. +/- values need conversion.
            const b = 100 + parseInt(filters.brightness);
            const c = 100 + parseInt(filters.contrast);
            const s = 100 + parseInt(filters.saturation);

            // Only applying basic filters for fast preview. 
            // Advanced ones (Grain, Vignette) are hard to do via ctx.filter alone without WebGL.
            // This is an approximation for the user.
            ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

            ctx.drawImage(sourceImage, x, y, w, h);
            ctx.filter = 'none'; // Reset
        }
    }

    // --- Sliders ---
    const sliderIds = ['brightness', 'contrast', 'saturation', 'exposure', 'sharpness', 'vignette', 'grain', 'temperature', 'tint', 'highlights', 'shadows', 'vibrance'];

    sliderIds.forEach(id => {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(`${id}Value`);

        if (slider) {
            slider.addEventListener('input', (e) => {
                filters[id] = e.target.value;
                if (valueDisplay) valueDisplay.textContent = e.target.value;
                requestAnimationFrame(drawPreview);
            });
        }
    });

    // --- Presets ---
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.dataset.preset);
        });
    });

    function applyPreset(name) {
        // Reset first logic (keep internal values clean)
        resetDataStructure();

        switch (name) {
            case 'cinematic':
                filters.contrast = 20; filters.saturation = -20; filters.vignette = 30;
                break;
            case 'vintage':
                filters.brightness = 10; filters.contrast = -10; filters.saturation = -30; filters.temperature = 20;
                break;
            case 'moody':
                filters.brightness = -10; filters.contrast = 15; filters.saturation = -20; filters.vignette = 40;
                break;
            case 'bright':
                filters.brightness = 10; filters.saturation = 20; filters.contrast = 10;
                break;
            case 'bw':
                filters.saturation = -100; filters.contrast = 20;
                break;
            case 'warm':
                filters.temperature = 30; filters.saturation = 10;
                break;
            case 'cool':
                filters.temperature = -30; filters.contrast = 10;
                break;
            case 'dramatic':
                filters.contrast = 40; filters.saturation = -10; filters.vignette = 50;
                break;
        }
        updateSlidersUI();
        drawPreview();
    }

    function resetDataStructure() {
        sliderIds.forEach(key => filters[key] = 0);
    }

    function resetFilters() {
        resetDataStructure();
        updateSlidersUI();
        drawPreview();

        // Reset Preset UI
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        const noneBtn = document.querySelector('[data-preset="none"]');
        if (noneBtn) noneBtn.classList.add('active');
    }

    function updateSlidersUI() {
        sliderIds.forEach(id => {
            const slider = document.getElementById(id);
            const valSpan = document.getElementById(`${id}Value`);
            if (slider) slider.value = filters[id] || 0;
            if (valSpan) valSpan.textContent = filters[id] || 0;
        });
    }

    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    // --- API Call (Apply & Download) ---
    if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
            if (!currentFile) return;

            // Auth Check
            if (window.AuthManager && !AuthManager.user) {
                showToast('Login required to download', 'error');
                setTimeout(() => window.location.href = '/auth', 1500);
                return;
            }

            // Credit Check
            if (window.CreditManager && !CreditManager.hasCredits(2)) {
                showToast('Insufficient credits (2 required)', 'error');
                return;
            }

            loadingOverlay.style.display = 'flex';
            applyBtn.disabled = true;

            const formData = new FormData();
            formData.append('image', currentFile);
            formData.append('filterData', JSON.stringify(filters));

            try {
                const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};
                const response = await fetch('/api/filter', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                if (response.ok) {
                    const cost = response.headers.get('X-Credits-Cost');
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);

                    // Show Download
                    downloadArea.style.display = 'block';
                    downloadBtn.href = url;
                    downloadBtn.download = `filtered_${currentFile.name}`;
                    applyBtn.style.display = 'none';

                    let msg = 'Filters applied!';
                    if (cost) msg += ` (-${cost} Credits)`;
                    showToast(msg, 'success');

                    if (window.CreditManager) CreditManager.refreshCredits();
                } else {
                    const errorMessage = await parseErrorResponse(response, 'Failed to apply filters');
                    showToast(errorMessage, 'error');
                }
            } catch (error) {
                console.error(error);
                showToast('Network error', 'error');
            } finally {
                loadingOverlay.style.display = 'none';
                applyBtn.disabled = false;
            }
        });
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
            console.warn('Filter error parse failed', err);
            return fallbackMessage;
        }
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});