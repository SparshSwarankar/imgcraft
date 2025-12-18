document.addEventListener('DOMContentLoaded', () => {
    console.log("Resize Tool Loaded - Studio Version");

    // --- DOM Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Panels
    const fileInfoSection = document.getElementById('fileInfoSection');
    const startInfoLeft = document.getElementById('startInfoLeft');
    const startInfoRight = document.getElementById('startInfoRight');
    const resizeControls = document.getElementById('resizeControls');

    // Info Fields
    const fileNameSpan = document.getElementById('fileName');
    const fileSizeSpan = document.getElementById('fileSize');
    const fileDimSpan = document.getElementById('fileDimensions');
    const fileTypeSpan = document.getElementById('fileType');
    const resizedSizeSpan = document.getElementById('resizedSize');
    const resizedSizeRow = document.getElementById('resizedSizeRow');

    // Controls
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const scaleRange = document.getElementById('scaleRange');
    const scaleValue = document.getElementById('scaleValue');
    const aspectRatioCheckbox = document.getElementById('aspectRatio');

    // Mode Buttons
    const modePixelBtn = document.getElementById('modePixel');
    const modePercentBtn = document.getElementById('modePercent');
    const pixelControls = document.getElementById('pixelControls');
    const percentControls = document.getElementById('percentControls');

    // Actions
    const resizeBtn = document.getElementById('resizeBtn');
    const downloadArea = document.getElementById('successArea');
    const downloadBtn = document.getElementById('downloadBtn');

    // State
    let currentFile = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let currentMode = 'pixel';

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
    }
    if (fileInput) {
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

        // Update Left Panel
        fileNameSpan.textContent = file.name.length > 20 ? file.name.substring(0, 15) + '...' : file.name;
        fileSizeSpan.textContent = formatBytes(file.size);
        fileTypeSpan.textContent = file.type.split('/')[1].toUpperCase();

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalWidth = img.width;
                originalHeight = img.height;

                fileDimSpan.textContent = `${originalWidth} x ${originalHeight}`;

                // Initialize Inputs
                widthInput.value = originalWidth;
                heightInput.value = originalHeight;

                // Switch UI
                dropZone.style.display = 'none';
                previewContainer.style.display = 'flex';

                startInfoLeft.style.display = 'none';
                fileInfoSection.style.display = 'block';

                startInfoRight.style.display = 'none';
                resizeControls.style.display = 'block';

                resizeBtn.disabled = false;
            };
            img.src = e.target.result;
            previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // --- Mode Switching ---
    // Expose setMode to window if onclick is used in HTML
    window.setMode = function (mode) {
        currentMode = mode;

        modePixelBtn.classList.toggle('active', mode === 'pixel');
        modePercentBtn.classList.toggle('active', mode === 'percent');

        pixelControls.style.display = mode === 'pixel' ? 'block' : 'none';
        percentControls.style.display = mode === 'percent' ? 'block' : 'none';
    };

    // Bind listeners in case JS loads after HTML onclick setup
    modePixelBtn.addEventListener('click', () => window.setMode('pixel'));
    modePercentBtn.addEventListener('click', () => window.setMode('percent'));


    // --- Dimension Logic ---
    widthInput.addEventListener('input', () => {
        if (aspectRatioCheckbox.checked && originalWidth > 0) {
            const ratio = originalHeight / originalWidth;
            heightInput.value = Math.round(widthInput.value * ratio);
        }
    });

    heightInput.addEventListener('input', () => {
        if (aspectRatioCheckbox.checked && originalWidth > 0) {
            const ratio = originalWidth / originalHeight;
            widthInput.value = Math.round(heightInput.value * ratio);
        }
    });

    scaleRange.addEventListener('input', (e) => {
        scaleValue.textContent = e.target.value + '%';
    });

    // --- API Call ---
    resizeBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // Use unified loading UI
        if (window.ImgCraftBusyUI) {
            window.ImgCraftBusyUI.showLoading('Resizing Image...');
        }

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('mode', currentMode);

        if (currentMode === 'pixel') {
            formData.append('width', widthInput.value);
            formData.append('height', heightInput.value);
        } else {
            formData.append('scale', scaleRange.value);
        }

        try {
            // Guest access allowed, token optional
            const token = window.AuthManager ? window.AuthManager.getToken() : null;
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/resize', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (response.ok) {
                // Update loading text
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.setLoadingText('Preparing Download...');
                }

                // Resize is free, so cost might be 0
                const cost = response.headers.get('X-Credits-Cost');

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Show resized file size in green
                resizedSizeSpan.textContent = formatBytes(blob.size);
                resizedSizeRow.style.display = 'flex';

                // Show Download
                downloadArea.style.display = 'block';
                downloadBtn.href = url;
                downloadBtn.download = `resized_${currentFile.name}`;
                resizeBtn.style.display = 'none';

                let msg = 'Image resized!';
                // Only show credit deduction if cost > 0
                if (cost && cost !== '0') msg += ` (-${cost} Credits)`;

                showToast(msg, 'success');

                // Refresh credits if logged in
                if (window.CreditManager && cost && cost !== '0') {
                    CreditManager.refreshCredits();
                }

                // Update Streak
                if (window.StreakManager) {
                    StreakManager.updateStreak();
                }
            } else {
                const errorMessage = await parseErrorResponse(response, 'Failed to resize image');
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Network error', 'error');
        } finally {
            // Hide unified loading UI
            if (window.ImgCraftBusyUI) {
                window.ImgCraftBusyUI.hideLoading();
            }
        }
    });

    // Helper
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
            console.warn('Resize error parse failed', err);
            return fallbackMessage;
        }
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});