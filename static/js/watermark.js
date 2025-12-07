document.addEventListener('DOMContentLoaded', () => {
    // ========================================
    // DOM ELEMENTS
    // ========================================
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const canvas = document.getElementById('watermarkCanvas');
    const ctx = canvas.getContext('2d');

    // File Info
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');

    // Controls
    const typeText = document.getElementById('typeText');
    const typeImage = document.getElementById('typeImage');
    const textControls = document.getElementById('textControls');
    const imageControls = document.getElementById('imageControls');

    // Text Controls
    const watermarkText = document.getElementById('watermarkText');
    const fontFamily = document.getElementById('fontFamily');
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const fontBold = document.getElementById('fontBold');
    const fontItalic = document.getElementById('fontItalic');
    const fontColor = document.getElementById('fontColor');

    // Image Controls
    const watermarkImageInput = document.getElementById('watermarkImageInput');
    const watermarkImageName = document.getElementById('watermarkImageName');

    // Common Controls
    const opacity = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacityValue');
    const scale = document.getElementById('scale');
    const scaleValue = document.getElementById('scaleValue');
    const rotation = document.getElementById('rotation');
    const rotationValue = document.getElementById('rotationValue');

    // Buttons
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadArea = document.getElementById('downloadArea');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Modal
    const resetModal = document.getElementById('resetModal');

    // ========================================
    // STATE
    // ========================================
    let currentFile = null;
    let baseImage = null;
    let watermarkImage = null;
    let watermarkType = 'text';
    let isBold = false;
    let isItalic = false;

    // Watermark position (center of watermark)
    let watermarkX = 0;
    let watermarkY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    // ========================================
    // INITIALIZE
    // ========================================
    if (fileInfo) {
        makeDraggable(fileInfo);
    }

    // Initialize custom dropdown for font family
    const fontFamilyDropdown = document.getElementById('fontFamilyDropdown');
    const fontFamilyOptions = document.getElementById('fontFamilyOptions');
    const fontFamilyText = document.getElementById('fontFamilyText');
    const fontFamilyHidden = document.getElementById('fontFamily');

    if (fontFamilyDropdown) {
        // Toggle dropdown
        fontFamilyDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            fontFamilyDropdown.classList.toggle('active');
            fontFamilyOptions.classList.toggle('show');
        });

        // Select option
        fontFamilyOptions.querySelectorAll('.dropdown-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.getAttribute('data-value');

                // Update selected option
                fontFamilyOptions.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                // Update display and hidden input
                fontFamilyText.textContent = value;
                fontFamilyHidden.value = value;

                // Close dropdown
                fontFamilyDropdown.classList.remove('active');
                fontFamilyOptions.classList.remove('show');

                // Trigger canvas render
                renderCanvas();
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            fontFamilyDropdown.classList.remove('active');
            fontFamilyOptions.classList.remove('show');
        });
    }

    // Initialize custom color picker
    const colorSwatches = document.querySelectorAll('.color-swatch:not(.color-swatch-custom)');
    const customColorSwatch = document.getElementById('customColorSwatch');
    const fontColorInput = document.getElementById('fontColor');
    const customColorPanel = document.getElementById('customColorPanel');
    const colorSwatchesContainer = document.getElementById('colorSwatches');
    const closeColorPicker = document.getElementById('closeColorPicker');
    const colorR = document.getElementById('colorR');
    const colorG = document.getElementById('colorG');
    const colorB = document.getElementById('colorB');
    const colorPreviewBox = document.getElementById('colorPreviewBox');

    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Helper function to convert RGB to hex
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Update RGB inputs and preview
    function updateColorInputs(color) {
        const rgb = hexToRgb(color);
        if (rgb && colorR && colorG && colorB) {
            colorR.value = rgb.r;
            colorG.value = rgb.g;
            colorB.value = rgb.b;
        }
        if (colorPreviewBox) {
            colorPreviewBox.style.background = color;
        }
    }

    if (colorSwatches.length > 0) {
        // Handle preset color swatches
        colorSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.getAttribute('data-color');

                // Update active state
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');

                // Update hidden color input
                fontColorInput.value = color;

                // Hide custom panel if open
                if (customColorPanel) {
                    customColorPanel.style.display = 'none';
                    colorSwatchesContainer.style.display = 'grid';
                }

                // Trigger canvas render
                renderCanvas();
            });
        });

        // Handle custom color picker - show panel
        if (customColorSwatch) {
            customColorSwatch.addEventListener('click', () => {
                // Hide swatches, show panel
                colorSwatchesContainer.style.display = 'none';
                customColorPanel.style.display = 'block';

                // Update RGB inputs with current color
                updateColorInputs(fontColorInput.value);
            });
        }

        // Close custom color panel
        if (closeColorPicker) {
            closeColorPicker.addEventListener('click', () => {
                customColorPanel.style.display = 'none';
                colorSwatchesContainer.style.display = 'grid';

                // Make custom swatch active
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                customColorSwatch.classList.add('active');
            });
        }

        // Handle native color input change
        if (fontColorInput) {
            fontColorInput.addEventListener('input', (e) => {
                updateColorInputs(e.target.value);
                renderCanvas();
            });
        }

        // Handle RGB input changes
        [colorR, colorG, colorB].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    const r = parseInt(colorR.value) || 0;
                    const g = parseInt(colorG.value) || 0;
                    const b = parseInt(colorB.value) || 0;
                    const hex = rgbToHex(r, g, b);
                    fontColorInput.value = hex;
                    colorPreviewBox.style.background = hex;
                    renderCanvas();
                });
            }
        });
    }

    // ========================================
    // FILE UPLOAD HANDLERS
    // ========================================
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput.click());

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
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFile(e.target.files[0]);
            }
        });
    }

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('error', 'Invalid File', 'Please upload a valid image file.');
            return;
        }

        currentFile = file;

        // Update file info
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);

        // Load image
        const reader = new FileReader();
        reader.onload = (e) => {
            baseImage = new Image();
            baseImage.onload = () => {
                // Show preview
                if (previewContainer) previewContainer.style.display = 'flex';
                if (dropZone) dropZone.style.display = 'none';
                if (fileInfo) {
                    fileInfo.style.display = 'flex';
                    // Reset position
                    fileInfo.style.top = '20px';
                    fileInfo.style.left = '50%';
                    fileInfo.style.transform = 'translateX(-50%)';
                }

                // Setup canvas
                setupCanvas();

                // Enable apply button
                if (applyBtn) applyBtn.disabled = false;

                // Hide download area
                if (downloadArea) downloadArea.style.display = 'none';
            };
            baseImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ========================================
    // CANVAS SETUP AND RENDERING
    // ========================================
    function setupCanvas() {
        // Set canvas size to match image
        const maxWidth = previewContainer.clientWidth - 20;
        const maxHeight = previewContainer.clientHeight - 20;

        let canvasWidth = baseImage.width;
        let canvasHeight = baseImage.height;

        // Scale down if too large
        if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
            const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
            canvasWidth *= ratio;
            canvasHeight *= ratio;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Set default watermark position (bottom-right)
        watermarkX = canvasWidth - 100;
        watermarkY = canvasHeight - 50;

        renderCanvas();
    }

    function renderCanvas() {
        if (!baseImage) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw base image
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

        // Draw watermark
        if (watermarkType === 'text') {
            drawTextWatermark();
        } else if (watermarkType === 'image' && watermarkImage) {
            drawImageWatermark();
        }
    }

    function drawTextWatermark() {
        const text = watermarkText.value || '© ImgCraft';
        const size = parseInt(fontSize.value);
        const family = fontFamily.value;
        const color = fontColor.value;
        const alpha = parseInt(opacity.value) / 100;
        const scaleVal = parseInt(scale.value) / 100;
        const rotationVal = parseInt(rotation.value) * Math.PI / 180;

        ctx.save();

        // Move to watermark position
        ctx.translate(watermarkX, watermarkY);

        // Apply rotation
        ctx.rotate(rotationVal);

        // Apply scale
        ctx.scale(scaleVal, scaleVal);

        // Set font
        let fontStyle = '';
        if (isItalic) fontStyle += 'italic ';
        if (isBold) fontStyle += 'bold ';
        ctx.font = `${fontStyle}${size}px ${family}`;

        // Set color and opacity
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw text
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }

    function drawImageWatermark() {
        const alpha = parseInt(opacity.value) / 100;
        const scaleVal = parseInt(scale.value) / 100;
        const rotationVal = parseInt(rotation.value) * Math.PI / 180;

        const imgWidth = watermarkImage.width * scaleVal;
        const imgHeight = watermarkImage.height * scaleVal;

        ctx.save();

        // Move to watermark position
        ctx.translate(watermarkX, watermarkY);

        // Apply rotation
        ctx.rotate(rotationVal);

        // Set opacity
        ctx.globalAlpha = alpha;

        // Draw image centered at position
        ctx.drawImage(watermarkImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

        ctx.restore();
    }

    // ========================================
    // WATERMARK TYPE SWITCHING
    // ========================================
    window.setWatermarkType = function (type) {
        watermarkType = type;

        if (type === 'text') {
            typeText.classList.add('active');
            typeImage.classList.remove('active');
            textControls.style.display = 'block';
            imageControls.style.display = 'none';
        } else {
            typeText.classList.remove('active');
            typeImage.classList.add('active');
            textControls.style.display = 'none';
            imageControls.style.display = 'block';
        }

        renderCanvas();
    };

    // ========================================
    // CONTROL HANDLERS
    // ========================================

    // Text input
    if (watermarkText) {
        watermarkText.addEventListener('input', renderCanvas);
    }

    // Font controls
    if (fontFamily) {
        fontFamily.addEventListener('change', renderCanvas);
    }

    if (fontSize) {
        fontSize.addEventListener('input', (e) => {
            fontSizeValue.textContent = e.target.value;
            renderCanvas();
        });
    }

    window.toggleBold = function () {
        isBold = !isBold;
        fontBold.classList.toggle('active');
        renderCanvas();
    };

    window.toggleItalic = function () {
        isItalic = !isItalic;
        fontItalic.classList.toggle('active');
        renderCanvas();
    };

    if (fontColor) {
        fontColor.addEventListener('input', renderCanvas);
    }

    // Image watermark upload
    if (watermarkImageInput) {
        watermarkImageInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                const file = e.target.files[0];
                watermarkImageName.textContent = file.name;

                const reader = new FileReader();
                reader.onload = (event) => {
                    watermarkImage = new Image();
                    watermarkImage.onload = () => {
                        renderCanvas();
                    };
                    watermarkImage.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Common controls
    if (opacity) {
        opacity.addEventListener('input', (e) => {
            opacityValue.textContent = e.target.value;
            renderCanvas();
        });
    }

    if (scale) {
        scale.addEventListener('input', (e) => {
            scaleValue.textContent = e.target.value;
            renderCanvas();
        });
    }

    if (rotation) {
        rotation.addEventListener('input', (e) => {
            rotationValue.textContent = e.target.value;
            renderCanvas();
        });
    }

    // ========================================
    // POSITION CONTROL
    // ========================================
    window.setPosition = function (position) {
        // Remove active class from all buttons
        document.querySelectorAll('.position-btn').forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        event.target.closest('.position-btn').classList.add('active');

        const padding = 50;

        switch (position) {
            case 'top-left':
                watermarkX = padding;
                watermarkY = padding;
                break;
            case 'top-center':
                watermarkX = canvas.width / 2;
                watermarkY = padding;
                break;
            case 'top-right':
                watermarkX = canvas.width - padding;
                watermarkY = padding;
                break;
            case 'center-left':
                watermarkX = padding;
                watermarkY = canvas.height / 2;
                break;
            case 'center':
                watermarkX = canvas.width / 2;
                watermarkY = canvas.height / 2;
                break;
            case 'center-right':
                watermarkX = canvas.width - padding;
                watermarkY = canvas.height / 2;
                break;
            case 'bottom-left':
                watermarkX = padding;
                watermarkY = canvas.height - padding;
                break;
            case 'bottom-center':
                watermarkX = canvas.width / 2;
                watermarkY = canvas.height - padding;
                break;
            case 'bottom-right':
                watermarkX = canvas.width - padding;
                watermarkY = canvas.height - padding;
                break;
        }

        renderCanvas();
    };

    // ========================================
    // DRAG AND DROP WATERMARK
    // ========================================
    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Calculate dynamic hit threshold based on watermark size
            let hitThreshold = 50; // Minimum clickable area radius
            const currentScale = parseInt(scale.value) / 100;

            if (watermarkType === 'image' && watermarkImage) {
                // For images: Use the image dimensions (scaled) to define hit area
                const w = watermarkImage.width * currentScale;
                const h = watermarkImage.height * currentScale;
                // Calculate roughly half the diagonal to cover corners, ensure at least 50px
                hitThreshold = Math.max(50, Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2)));
            } else if (watermarkType === 'text') {
                // For text: Measure text dimensions
                const size = parseInt(fontSize.value);
                const text = watermarkText.value || '© ImgCraft';
                ctx.font = `${size}px ${fontFamily.value}`; // Quick measure font
                const metrics = ctx.measureText(text);
                const w = metrics.width * currentScale;
                const h = size * currentScale;
                hitThreshold = Math.max(50, Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2)));
            }

            // Check if click is near watermark position using dynamic threshold
            const distance = Math.sqrt(Math.pow(x - watermarkX, 2) + Math.pow(y - watermarkY, 2));
            if (distance < hitThreshold) {
                isDragging = true;
                dragStartX = x - watermarkX;
                dragStartY = y - watermarkY;
                canvas.style.cursor = 'grabbing';
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const rect = canvas.getBoundingClientRect();
                watermarkX = e.clientX - rect.left - dragStartX;
                watermarkY = e.clientY - rect.top - dragStartY;

                // Keep within bounds
                watermarkX = Math.max(0, Math.min(canvas.width, watermarkX));
                watermarkY = Math.max(0, Math.min(canvas.height, watermarkY));

                renderCanvas();
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'move';
        });

        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
            canvas.style.cursor = 'move';
        });

        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // Recalculate dynamic hit threshold for touch as well
            let hitThreshold = 50;
            const currentScale = parseInt(scale.value) / 100;

            if (watermarkType === 'image' && watermarkImage) {
                const w = watermarkImage.width * currentScale;
                const h = watermarkImage.height * currentScale;
                hitThreshold = Math.max(50, Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2)));
            } else if (watermarkType === 'text') {
                const size = parseInt(fontSize.value);
                const text = watermarkText.value || '© ImgCraft';
                ctx.font = `${size}px ${fontFamily.value}`;
                const metrics = ctx.measureText(text);
                const w = metrics.width * currentScale;
                const h = size * currentScale;
                hitThreshold = Math.max(50, Math.sqrt(Math.pow(w / 2, 2) + Math.pow(h / 2, 2)));
            }

            const distance = Math.sqrt(Math.pow(x - watermarkX, 2) + Math.pow(y - watermarkY, 2));
            if (distance < hitThreshold) {
                isDragging = true;
                dragStartX = x - watermarkX;
                dragStartY = y - watermarkY;
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                watermarkX = touch.clientX - rect.left - dragStartX;
                watermarkY = touch.clientY - rect.top - dragStartY;

                watermarkX = Math.max(0, Math.min(canvas.width, watermarkX));
                watermarkY = Math.max(0, Math.min(canvas.height, watermarkY));

                renderCanvas();
            }
        });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    // ========================================
    // RESET WATERMARK
    // ========================================
    window.resetWatermark = function () {
        resetModal.style.display = 'flex';
    };

    window.closeResetModal = function () {
        resetModal.style.display = 'none';
    };

    window.confirmReset = function () {
        // Reset all controls to defaults
        watermarkText.value = '© ImgCraft';
        fontSize.value = 40;
        fontSizeValue.textContent = '40';
        fontFamily.value = 'Arial';
        fontColor.value = '#ffffff';
        opacity.value = 70;
        opacityValue.textContent = '70';
        scale.value = 100;
        scaleValue.textContent = '100';
        rotation.value = 0;
        rotationValue.textContent = '0';

        isBold = false;
        isItalic = false;
        fontBold.classList.remove('active');
        fontItalic.classList.remove('active');

        // Reset position to bottom-right
        watermarkX = canvas.width - 100;
        watermarkY = canvas.height - 50;

        renderCanvas();
        closeResetModal();

        showToast('success', 'Reset Complete', 'Watermark settings have been reset.');
    };

    // ========================================
    // APPLY WATERMARK
    // ========================================
    if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
            if (!currentFile) {
                showToast('error', 'No Image', 'Please upload an image first.');
                return;
            }

            // Auth & Credit Check
            if (window.AuthManager && !AuthManager.user) {
                showToast('error', 'Authentication Required', 'Please login to use this tool');
                setTimeout(() => window.location.href = '/auth', 1500);
                return;
            }

            if (window.CreditManager && !CreditManager.hasCredits(3)) {
                showToast('error', 'Insufficient Credits', 'Please purchase more credits.');
                return;
            }

            if (watermarkType === 'text' && !watermarkText.value) {
                showToast('error', 'No Text', 'Please enter watermark text.');
                return;
            }

            if (watermarkType === 'image' && !watermarkImage) {
                showToast('error', 'No Image', 'Please upload a watermark image.');
                return;
            }

            // Show loading
            loadingOverlay.style.display = 'flex';
            applyBtn.disabled = true;

            // Prepare form data
            const formData = new FormData();
            formData.append('image', currentFile);
            formData.append('watermark_type', watermarkType);

            // Calculate position as percentage
            const posX = (watermarkX / canvas.width * 100).toFixed(2);
            const posY = (watermarkY / canvas.height * 100).toFixed(2);

            formData.append('position_x', posX);
            formData.append('position_y', posY);
            formData.append('opacity', opacity.value);
            formData.append('scale', scale.value);
            formData.append('rotation', rotation.value);

            if (watermarkType === 'text') {
                formData.append('text', watermarkText.value);
                formData.append('font_family', fontFamily.value);
                formData.append('font_size', fontSize.value);
                formData.append('font_bold', isBold);
                formData.append('font_italic', isItalic);
                formData.append('color', fontColor.value);
            } else {
                formData.append('watermark_image', watermarkImageInput.files[0]);
            }

            try {
                const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};

                const response = await fetch('/api/watermark', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);

                    // Set download link
                    const ext = currentFile.name.split('.').pop();
                    const baseName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.'));
                    downloadBtn.href = url;
                    downloadBtn.download = `${baseName}_watermarked.${ext}`;

                    // Show success
                    downloadArea.style.display = 'block';
                    showToast('success', 'Success!', 'Watermark applied successfully!');

                    // Refresh credits
                    if (window.CreditManager) {
                        CreditManager.refreshCredits();
                    }
                } else {
                    throw new Error('Failed to apply watermark');
                }
            } catch (error) {
                console.error(error);
                showToast('error', 'Error', 'Failed to apply watermark. Please try again.');
            } finally {
                loadingOverlay.style.display = 'none';
                applyBtn.disabled = false;
            }
        });
    }

    // ========================================
    // DRAGGABLE FILE INFO CARD
    // ========================================
    function makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        element.style.cursor = 'grab';
        element.style.touchAction = 'none';
        element.ondragstart = () => false;

        element.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button')) return;
            e.preventDefault();
            element.setPointerCapture(e.pointerId);

            const rect = element.getBoundingClientRect();
            const offsetParent = element.offsetParent || document.body;
            const parentRect = offsetParent.getBoundingClientRect();

            initialLeft = rect.left - parentRect.left;
            initialTop = rect.top - parentRect.top;
            startX = e.clientX;
            startY = e.clientY;

            if (getComputedStyle(element).transform !== 'none') {
                element.style.left = initialLeft + 'px';
                element.style.top = initialTop + 'px';
                element.style.transform = 'none';
            }

            isDragging = true;
            element.style.cursor = 'grabbing';

            element.addEventListener('pointermove', onPointerMove);
            element.addEventListener('pointerup', onPointerUp);
        });

        function onPointerMove(e) {
            if (!isDragging) return;
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = (initialLeft + dx) + 'px';
            element.style.top = (initialTop + dy) + 'px';
        }

        function onPointerUp(e) {
            isDragging = false;
            element.style.cursor = 'grab';
            element.releasePointerCapture(e.pointerId);
            element.removeEventListener('pointermove', onPointerMove);
            element.removeEventListener('pointerup', onPointerUp);
        }
    }

    // ========================================
    // TOAST FALLBACK
    // ========================================
    if (typeof window.showToast !== 'function') {
        window.showToast = function (type, title, message) {
            console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
            alert(`${title}: ${message}`);
        };
    }
});