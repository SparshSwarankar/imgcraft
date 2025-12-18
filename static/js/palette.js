document.addEventListener('DOMContentLoaded', () => {
    console.log("Palette Tool Loaded - Studio Version");

    // --- DOM Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const miniPreviewImage = document.getElementById('miniPreviewImage');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const scanOverlay = document.getElementById('scanOverlay');

    // Panels
    const fileInfoSection = document.getElementById('fileInfoSection');
    const startInfoLeft = document.getElementById('startInfoLeft');
    const startInfoRight = document.getElementById('startInfoRight');
    const paletteResult = document.getElementById('paletteResult');
    const paletteGrid = document.getElementById('paletteGrid');

    // Info Fields
    const fileNameSpan = document.getElementById('fileName');
    const fileSizeSpan = document.getElementById('fileSize');

    // Actions
    const generateBtn = document.getElementById('generateBtn');
    const resetArea = document.getElementById('resetArea');

    let currentFile = null;

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
        fileNameSpan.textContent = file.name.length > 20 ? file.name.substring(0, 15) + '...' : file.name;
        fileSizeSpan.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            if (miniPreviewImage) miniPreviewImage.src = e.target.result;

            // Switch UI
            dropZone.style.display = 'none';
            previewContainer.style.display = 'flex';

            startInfoLeft.style.display = 'none';
            fileInfoSection.style.display = 'block';

            generateBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    // --- API Call ---
    generateBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // Auth & Credit Check
        if (window.AuthManager && !AuthManager.user) {
            showToast('Login required', 'error');
            setTimeout(() => window.location.href = '/auth', 1500);
            return;
        }
        if (window.CreditManager && !CreditManager.hasCredits(2)) {
            showToast('Insufficient credits (2 required)', 'error');
            return;
        }

        // Loading State
        loadingOverlay.style.display = 'flex';
        generateBtn.disabled = true;

        // Show scan overlay
        if (scanOverlay) scanOverlay.parentElement.classList.add('scanning-active');
        if (scanOverlay) scanOverlay.style.display = 'block';

        const formData = new FormData();
        formData.append('image', currentFile);

        try {
            const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};
            const response = await fetch('/api/palette', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (response.ok) {
                const cost = response.headers.get('X-Credits-Cost');
                const data = await response.json();

                displayPalette(data.colors);

                // Show Results
                startInfoRight.style.display = 'none';
                paletteResult.style.display = 'block';

                generateBtn.style.display = 'none';
                resetArea.style.display = 'block';

                let msg = 'Palette generated!';
                if (cost) msg += ` (-${cost} Credits)`;
                showToast(msg, 'success');

                if (window.CreditManager) CreditManager.refreshCredits();

                // Update Streak
                if (window.StreakManager) {
                    StreakManager.updateStreak();
                }

                // Calculate and display Web-Ready Score for uploaded image
                if (window.WebReadyScore && currentFile) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const img = new Image();
                        img.onload = () => {
                            const scoreData = WebReadyScore.calculateScore({
                                blob: currentFile,
                                width: img.width,
                                height: img.height,
                                format: currentFile.type.split('/')[1],
                                hasMetadata: undefined // Unknown for uploaded image
                            });

                            if (scoreData) {
                                WebReadyScore.displayScore('webReadyScoreRow', scoreData);
                            }
                        };
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(currentFile);
                }

            } else {
                const errorMessage = await parseErrorResponse(response, 'Failed to generate palette');
                showToast(errorMessage, 'error');
                generateBtn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            showToast('Network error', 'error');
            generateBtn.disabled = false;
        } finally {
            loadingOverlay.style.display = 'none';
            if (scanOverlay) {
                scanOverlay.parentElement.classList.remove('scanning-active');
                scanOverlay.style.display = 'none';
            }
        }
    });

    function displayPalette(colors) {
        paletteGrid.innerHTML = '';

        // Iterate through all colors (expecting 8)
        colors.forEach((color, index) => {
            const card = document.createElement('div');
            card.className = 'color-card';
            // Stagger animation
            card.style.animation = `fadeIn 0.5s ease forwards ${index * 0.1}s`;
            card.style.opacity = '0';

            const hex = color.hex;
            const rgb = `rgb(${color.rgb.join(', ')})`;

            card.innerHTML = `
                <div class="color-preview" style="background-color: ${hex}"></div>
                <div class="color-details">
                    <div class="hex-value">
                        ${hex}
                        <i class="far fa-copy copy-icon"></i>
                    </div>
                    <div class="rgb-value">${rgb}</div>
                    
                    <div class="dual-preview">
                        <div class="preview-light" style="color: ${hex}">Text</div>
                        <div class="preview-dark" style="color: ${hex}">Text</div>
                    </div>
                </div>
            `;

            // Click to Copy
            card.addEventListener('click', () => {
                navigator.clipboard.writeText(hex);
                showToast(`Copied ${hex}`, 'success');
            });

            paletteGrid.appendChild(card);
        });
    }

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
            console.warn('Palette error parse failed', err);
            return fallbackMessage;
        }
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});