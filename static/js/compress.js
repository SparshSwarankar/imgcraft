document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');

    // Panels
    const fileInfoSection = document.getElementById('fileInfoSection');
    const startInfo = document.getElementById('startInfo');
    const controlsInfo = document.getElementById('controlsInfo');
    const compressionControls = document.getElementById('compressionControls');

    // Data Fields
    const fileName = document.getElementById('fileName');
    const fileFormat = document.getElementById('fileFormat');
    const fileDimensions = document.getElementById('fileDimensions');

    // Controls
    const qualityRange = document.getElementById('qualityRange');
    const qualityValue = document.getElementById('qualityValue');
    const compressBtn = document.getElementById('compressBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const successArea = document.getElementById('successArea');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Stats
    const statsContainer = document.getElementById('statsContainer');
    const originalSizeSpan = document.getElementById('originalSize');
    const compressedSizeSpan = document.getElementById('compressedSize');
    const savingsSpan = document.getElementById('savings');

    let currentFile = null;

    // --- File Handling ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;

        currentFile = file;
        originalSizeSpan.textContent = formatBytes(file.size);
        fileName.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
        fileFormat.textContent = file.type.split('/')[1].toUpperCase();

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                fileDimensions.textContent = `${img.width} × ${img.height}`;
            };
            img.src = e.target.result;

            previewImage.src = e.target.result;

            // Switch Views
            dropZone.style.display = 'none';
            previewContainer.style.display = 'flex';

            fileInfoSection.style.display = 'block';
            startInfo.style.display = 'none';

            compressionControls.style.display = 'block';
            controlsInfo.style.display = 'none';

            compressBtn.disabled = false;
            compressBtn.classList.add('btn-glow');

            // Reset Results
            statsContainer.style.display = 'none';
            successArea.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    qualityRange.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value + '%';
    });

    async function compressImage() {
        if (!currentFile) return;

        // Use unified loading UI
        if (window.ImgCraftBusyUI) {
            window.ImgCraftBusyUI.showLoading('Compressing Image...');
        }

        const formData = new FormData();
        formData.append('image', currentFile);

        // Convert intensity (0-95) to quality (100-5)
        const intensity = parseInt(qualityRange.value);
        const serverQuality = 100 - intensity;
        formData.append('quality', serverQuality);

        try {
            const token = window.AuthManager ? window.AuthManager.getToken() : null;
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/compress', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (response.ok) {
                // Update loading text
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.setLoadingText('Processing Results...');
                }

                // Get Cost Header
                const cost = response.headers.get('X-Credits-Cost');

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Update Preview
                previewImage.src = url;

                // Update Stats
                const newSize = blob.size;
                compressedSizeSpan.textContent = formatBytes(newSize);

                const savings = ((currentFile.size - newSize) / currentFile.size * 100).toFixed(1);

                if (newSize > currentFile.size) {
                    savingsSpan.textContent = `+${Math.abs(savings)}%`;
                    savingsSpan.style.color = '#ef4444';
                } else {
                    savingsSpan.textContent = `${savings}%`;
                    savingsSpan.style.color = '#22c55e';
                }

                statsContainer.style.display = 'block';
                successArea.style.display = 'block';
                downloadBtn.href = url;
                downloadBtn.download = `compressed_${currentFile.name}`;

                // Update Streak FIRST (with animation)
                if (window.StreakManager) {
                    await StreakManager.updateStreak();
                }

                // Then refresh credits
                if (window.CreditManager) CreditManager.refreshCredits();

                // Prepare Toast Message
                let msg = `Compressed by ${savings}%!`;
                if (cost) msg += ` (-${cost} Credits)`;

                showToast(msg, 'success');

            } else {
                const errorMessage = await parseErrorResponse(response, 'Compression failed. Please try again.');
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('An error occurred', 'error');
        } finally {
            // Hide unified loading UI
            if (window.ImgCraftBusyUI) {
                window.ImgCraftBusyUI.hideLoading();
            }
            compressBtn.classList.remove('btn-glow');
        }
    }

    compressBtn.addEventListener('click', compressImage);

    // Download Loading Animation
    downloadBtn.addEventListener('click', function () {
        const btn = this;
        if (btn.classList.contains('btn-loading')) return;
        btn.classList.add('btn-loading');
        setTimeout(() => btn.classList.remove('btn-loading'), 2500);
    });

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
            console.warn('Compression error parse failed', err);
            return fallbackMessage;
        }
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});