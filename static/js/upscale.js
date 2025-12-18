document.addEventListener('DOMContentLoaded', () => {
    console.log("Upscale Tool Loaded - Studio Version");

    // --- DOM Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');

    // Preview Images
    const previewOriginal = document.getElementById('previewOriginal');
    const previewProcessed = document.getElementById('previewProcessed');
    const imgWrapperOriginal = document.getElementById('imgWrapperOriginal');

    // Slider
    const sliderHandle = document.getElementById('sliderHandle');
    const compareContainer = document.querySelector('.compare-container');
    const scanOverlay = document.getElementById('scanOverlay');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Panels
    const fileInfoSection = document.getElementById('fileInfoSection');
    const startInfoLeft = document.getElementById('startInfoLeft');
    const startInfoRight = document.getElementById('startInfoRight');
    const upscaleControls = document.getElementById('upscaleControls');

    // Info Fields
    const fileNameSpan = document.getElementById('fileName');
    const fileDimSpan = document.getElementById('fileDim');
    const fileSizeSpan = document.getElementById('fileSize');
    const estimatedDimSpan = document.getElementById('estimatedDim');

    // Controls
    const upscaleBtn = document.getElementById('upscaleBtn');
    const downloadArea = document.getElementById('downloadArea');
    const downloadBtn = document.getElementById('downloadBtn');
    const costDisplay = document.getElementById('costDisplay');

    // Inputs
    const sharpnessInput = document.getElementById('sharpness');
    const contrastInput = document.getElementById('contrast');
    const sharpnessVal = document.getElementById('sharpnessVal');
    const contrastVal = document.getElementById('contrastVal');
    const formatSelect = document.getElementById('formatSelect'); // Hidden Input

    // State
    let currentFile = null;
    let currentFactor = 2; // Default
    let isSliding = false;

    // --- File Handling ---
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFile(e.dataTransfer.files[0]);
        });
    }
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Please upload a valid image', 'error');
            return;
        }
        currentFile = file;

        fileNameSpan.textContent = file.name.length > 20 ? file.name.substring(0, 15) + '...' : file.name;
        fileSizeSpan.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const w = img.width;
                const h = img.height;
                fileDimSpan.textContent = `${w} x ${h}`;
                updateEstimate(w, h);

                // Show Preview (Just original initially)
                previewOriginal.src = e.target.result;
                previewProcessed.src = e.target.result; // Placeholder until upscaled

                // Switch UI
                dropZone.style.display = 'none';
                previewContainer.style.display = 'flex';

                startInfoLeft.style.display = 'none';
                fileInfoSection.style.display = 'block';

                startInfoRight.style.display = 'none';
                upscaleControls.style.display = 'block';

                upscaleBtn.disabled = false;

                // Reset View
                if (compareContainer) {
                    imgWrapperOriginal.style.width = '100%'; // Show full original initially
                    sliderHandle.style.display = 'none'; // Hide slider until done
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function updateEstimate(w, h) {
        const newW = w * currentFactor;
        const newH = h * currentFactor;
        estimatedDimSpan.textContent = `${newW} x ${newH} px`;
    }

    // --- Factor Selection ---
    document.querySelectorAll('.factor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.factor-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFactor = parseInt(btn.dataset.factor);

            // Update Cost Display
            const cost = currentFactor === 8 ? 15 : (currentFactor === 4 ? 10 : 8);
            costDisplay.textContent = cost;

            // Recalculate Estimate
            const currentDimText = fileDimSpan.textContent;
            if (currentDimText !== '-') {
                const parts = currentDimText.split(' x ');
                if (parts.length === 2) updateEstimate(parseInt(parts[0]), parseInt(parts[1]));
            }
        });
    });

    // --- Sliders ---
    if (sharpnessInput) {
        sharpnessInput.addEventListener('input', (e) => sharpnessVal.textContent = e.target.value);
    }
    if (contrastInput) {
        contrastInput.addEventListener('input', (e) => contrastVal.textContent = e.target.value);
    }

    // --- API Call ---
    upscaleBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // Auth Check
        if (window.AuthManager && !AuthManager.user) {
            showToast('Login required for upscaling', 'error');
            setTimeout(() => window.location.href = '/auth', 1500);
            return;
        }

        const requiredCredits = parseInt(costDisplay.textContent);
        if (window.CreditManager && !CreditManager.hasCredits(requiredCredits)) {
            showToast(`Insufficient credits (${requiredCredits} required)`, 'error');
            return;
        }

        // Use unified loading UI
        if (window.ImgCraftBusyUI) {
            window.ImgCraftBusyUI.showLoading(`Upscaling to ${currentFactor}x...`);
        }

        // Scan Animation
        if (scanOverlay) scanOverlay.style.display = 'block';
        if (compareContainer) compareContainer.classList.add('scanning-active');

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('factor', currentFactor);
        formData.append('sharpness', sharpnessInput.value);
        formData.append('contrast', contrastInput.value);
        formData.append('format', formatSelect.value);

        try {
            const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};
            const response = await fetch('/api/upscale', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (response.ok) {
                // Update loading text
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.setLoadingText('Enhancing Image...');
                }

                const cost = response.headers.get('X-Credits-Cost');
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Update Processed View
                previewProcessed.src = url;

                // Show Comparison Slider
                sliderHandle.style.display = 'flex';
                imgWrapperOriginal.style.width = '50%';
                sliderHandle.style.left = '50%';

                // Show Download
                downloadArea.style.display = 'block';
                downloadBtn.href = url;
                downloadBtn.download = `upscaled_${currentFile.name}`;
                upscaleBtn.style.display = 'none';

                let msg = `Upscaled to ${currentFactor}x!`;
                if (cost) msg += ` (-${cost} Credits)`;
                showToast(msg, 'success');

                if (window.CreditManager) CreditManager.refreshCredits();

                // Update Streak
                if (window.StreakManager) {
                    StreakManager.updateStreak();
                }

                // Calculate and display Web-Ready Score
                if (window.WebReadyScore) {
                    const img = new Image();
                    img.onload = () => {
                        const scoreData = WebReadyScore.calculateScore({
                            blob: blob,
                            width: img.width,
                            height: img.height,
                            format: blob.type.split('/')[1],
                            hasMetadata: false // AI upscaling strips metadata
                        });

                        if (scoreData) {
                            WebReadyScore.displayScore('webReadyScoreRow', scoreData);
                        }
                    };
                    img.src = url;
                }
            } else {
                const errorMessage = await parseErrorResponse(response, 'Upscaling failed');
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
            if (scanOverlay) scanOverlay.style.display = 'none';
            if (compareContainer) compareContainer.classList.remove('scanning-active');
        }
    });

    // --- Compare Slider Logic ---
    if (sliderHandle && compareContainer) {
        sliderHandle.addEventListener('mousedown', startSlide);
        sliderHandle.addEventListener('touchstart', startSlide, { passive: false });

        function startSlide(e) {
            e.preventDefault();
            isSliding = true;
            window.addEventListener('mousemove', moveSlide);
            window.addEventListener('touchmove', moveSlide, { passive: false });
            window.addEventListener('mouseup', stopSlide);
            window.addEventListener('touchend', stopSlide);
        }

        function moveSlide(e) {
            if (!isSliding) return;
            const rect = compareContainer.getBoundingClientRect();
            let clientX = e.clientX;
            if (e.touches) clientX = e.touches[0].clientX;

            let x = clientX - rect.left;
            x = Math.max(0, Math.min(x, rect.width));

            const percent = (x / rect.width) * 100;
            sliderHandle.style.left = percent + '%';
            imgWrapperOriginal.style.width = percent + '%';
        }

        function stopSlide() {
            isSliding = false;
            window.removeEventListener('mousemove', moveSlide);
            window.removeEventListener('touchmove', moveSlide);
        }
    }

    // --- Dropdown Logic ---
    function setupCustomDropdowns() {
        const dropdowns = document.querySelectorAll('.custom-select');
        dropdowns.forEach(dropdown => {
            const trigger = dropdown.querySelector('.select-trigger');
            const options = dropdown.querySelectorAll('.option');
            const hiddenInput = dropdown.nextElementSibling;
            const triggerSpan = trigger.querySelector('span');

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.custom-select').forEach(d => {
                    if (d !== dropdown) d.classList.remove('open');
                });
                dropdown.classList.toggle('open');
            });

            options.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    triggerSpan.textContent = option.textContent.split('(')[0].trim();
                    hiddenInput.value = option.getAttribute('data-value');
                    dropdown.classList.remove('open');
                });
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select').forEach(d => d.classList.remove('open'));
        });
    }
    setupCustomDropdowns();

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
            console.warn('Upscale error parse failed', err);
            return fallbackMessage;
        }
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});