document.addEventListener('DOMContentLoaded', () => {
    console.log("Watermark Tool Loaded - Studio Version");

    // --- DOM Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const canvas = document.getElementById('watermarkCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Panels
    const fileInfoSection = document.getElementById('fileInfoSection');
    const startInfoLeft = document.getElementById('startInfoLeft');
    const startInfoRight = document.getElementById('startInfoRight');
    const watermarkControls = document.getElementById('watermarkControls');

    // Info Fields
    const fileNameSpan = document.getElementById('fileName');
    const fileSizeSpan = document.getElementById('fileSize');
    const fileDimSpan = document.getElementById('fileDimensions');

    // Controls
    const typeTextBtn = document.getElementById('typeText');
    const typeImageBtn = document.getElementById('typeImage');
    const textControls = document.getElementById('textControls');
    const imageControls = document.getElementById('imageControls');

    const watermarkText = document.getElementById('watermarkText');
    const fontFamily = document.getElementById('fontFamily');
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const fontBold = document.getElementById('fontBold');
    const fontItalic = document.getElementById('fontItalic');
    const fontColor = document.getElementById('fontColor');

    const watermarkImageInput = document.getElementById('watermarkImageInput');
    const watermarkImageName = document.getElementById('watermarkImageName');

    const opacity = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacityValue');
    const scale = document.getElementById('scale');
    const scaleValue = document.getElementById('scaleValue');
    const rotation = document.getElementById('rotation');
    const rotationValue = document.getElementById('rotationValue');

    // Actions
    const applyBtn = document.getElementById('applyBtn');
    const downloadArea = document.getElementById('downloadArea');
    const downloadBtn = document.getElementById('downloadBtn');

    // Modals
    const resetModal = document.getElementById('resetModal');

    // State
    let currentFile = null;
    let baseImage = null;
    let watermarkImage = null;
    let watermarkType = 'text'; // 'text' or 'image'

    // Watermark State
    let wmX = 0, wmY = 0;
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;

    let isBold = false;
    let isItalic = false;

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
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });
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
            baseImage = new Image();
            baseImage.onload = () => {
                fileDimSpan.textContent = `${baseImage.width} x ${baseImage.height}`;
                initEditor();
            };
            baseImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function initEditor() {
        dropZone.style.display = 'none';
        previewContainer.style.display = 'flex';

        startInfoLeft.style.display = 'none';
        fileInfoSection.style.display = 'block';

        startInfoRight.style.display = 'none';
        watermarkControls.style.display = 'block';

        applyBtn.disabled = false;

        // Fit Canvas
        fitCanvasToContainer();
        window.addEventListener('resize', fitCanvasToContainer);
    }

    function fitCanvasToContainer() {
        if (!baseImage || !canvas) return;

        const container = previewContainer.getBoundingClientRect();
        const padding = 40;
        const availW = container.width - padding;
        const availH = container.height - padding;

        // Calculate aspect ratio fit
        const scaleFit = Math.min(availW / baseImage.width, availH / baseImage.height);

        canvas.width = baseImage.width * scaleFit;
        canvas.height = baseImage.height * scaleFit;

        // Set initial position if first load (0,0 check)
        if (wmX === 0 && wmY === 0) {
            wmX = canvas.width - 120;
            wmY = canvas.height - 60;
        }

        draw();
    }

    // --- Drawing Logic ---
    function draw() {
        if (!baseImage || !ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Base Image
        ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

        // Draw Watermark
        ctx.save();

        // Move context to watermark position
        ctx.translate(wmX, wmY);

        // Rotation
        const rad = parseInt(rotation.value) * Math.PI / 180;
        ctx.rotate(rad);

        // Scale
        const s = parseInt(scale.value) / 100;
        ctx.scale(s, s);

        // Opacity
        ctx.globalAlpha = parseInt(opacity.value) / 100;

        if (watermarkType === 'text') {
            const text = watermarkText.value || "© ImgCraft";
            const size = parseInt(fontSize.value);
            const family = fontFamily.value;
            let style = "";
            if (isBold) style += "bold ";
            if (isItalic) style += "italic ";

            ctx.font = `${style}${size}px ${family}`;
            ctx.fillStyle = fontColor.value;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, 0, 0);
        }
        else if (watermarkType === 'image' && watermarkImage) {
            // Center the image at 0,0 (relative to translation)
            const w = watermarkImage.width;
            const h = watermarkImage.height;
            ctx.drawImage(watermarkImage, -w / 2, -h / 2, w, h);
        }

        ctx.restore();
    }

    // --- Interaction (Drag & Drop) ---
    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('mousemove', drag);
    window.addEventListener('touchmove', drag, { passive: false });
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    function startDrag(e) {
        if (!baseImage) return;
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Simple hit test (check distance from current center)
        const dist = Math.sqrt((x - wmX) ** 2 + (y - wmY) ** 2);

        if (dist < 100) { // Hit radius
            isDragging = true;
            dragStartX = x - wmX;
            dragStartY = y - wmY;
            canvas.style.cursor = 'grabbing';
        }
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        wmX = x - dragStartX;
        wmY = y - dragStartY;

        draw();
    }

    function endDrag() {
        isDragging = false;
        canvas.style.cursor = 'move';
    }

    // --- Controls ---
    window.setWatermarkType = function (type) {
        watermarkType = type;

        typeTextBtn.classList.toggle('active', type === 'text');
        typeImageBtn.classList.toggle('active', type === 'image');

        textControls.style.display = type === 'text' ? 'block' : 'none';
        imageControls.style.display = type === 'image' ? 'block' : 'none';

        draw();
    };

    // Text Inputs
    watermarkText.addEventListener('input', draw);
    fontSize.addEventListener('input', (e) => { fontSizeValue.textContent = e.target.value; draw(); });
    fontColor.addEventListener('input', draw);

    // Font Dropdown Logic
    const fontDropdown = document.getElementById('fontFamilyDropdown');
    const fontOptions = document.getElementById('fontFamilyOptions');
    const fontDisplay = document.getElementById('fontFamilyText');

    if (fontDropdown) {
        fontDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            fontDropdown.classList.toggle('open');
            fontOptions.style.display = fontOptions.style.display === 'block' ? 'none' : 'block';
        });

        document.querySelectorAll('.option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                fontFamily.value = opt.dataset.value;
                fontDisplay.textContent = opt.textContent;
                fontDisplay.style.fontFamily = opt.style.fontFamily;
                fontOptions.style.display = 'none';
                fontDropdown.classList.remove('open');
                draw();
            });
        });

        document.addEventListener('click', () => {
            if (fontOptions) fontOptions.style.display = 'none';
            if (fontDropdown) fontDropdown.classList.remove('open');
        });
    }

    window.toggleBold = function () {
        isBold = !isBold;
        fontBold.classList.toggle('active', isBold);
        draw();
    };
    window.toggleItalic = function () {
        isItalic = !isItalic;
        fontItalic.classList.toggle('active', isItalic);
        draw();
    };

    // Image Upload
    watermarkImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            watermarkImageName.textContent = e.target.files[0].name;
            const reader = new FileReader();
            reader.onload = (ev) => {
                watermarkImage = new Image();
                watermarkImage.onload = draw;
                watermarkImage.src = ev.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Appearance
    opacity.addEventListener('input', (e) => { opacityValue.textContent = e.target.value + '%'; draw(); });
    scale.addEventListener('input', (e) => { scaleValue.textContent = e.target.value + '%'; draw(); });
    rotation.addEventListener('input', (e) => { rotationValue.textContent = e.target.value + '°'; draw(); });

    // Position Grid
    window.setPosition = function (pos) {
        document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));

        const pad = 50;
        if (pos === 'center') { wmX = canvas.width / 2; wmY = canvas.height / 2; }
        else if (pos === 'top-left') { wmX = pad; wmY = pad; }
        else if (pos === 'top-right') { wmX = canvas.width - pad; wmY = pad; }
        else if (pos === 'bottom-left') { wmX = pad; wmY = canvas.height - pad; }
        else if (pos === 'bottom-right') { wmX = canvas.width - pad; wmY = canvas.height - pad; }
        else if (pos === 'top-center') { wmX = canvas.width / 2; wmY = pad; }
        else if (pos === 'bottom-center') { wmX = canvas.width / 2; wmY = canvas.height - pad; }
        else if (pos === 'center-left') { wmX = pad; wmY = canvas.height / 2; }
        else if (pos === 'center-right') { wmX = canvas.width - pad; wmY = canvas.height / 2; }

        draw();
    };

    // --- Reset ---
    window.resetWatermark = function () {
        resetModal.style.display = 'flex';
    };
    window.closeResetModal = () => resetModal.style.display = 'none';
    window.confirmReset = () => {
        watermarkText.value = '© ImgCraft';
        fontSize.value = 40;
        opacity.value = 70;
        scale.value = 100;
        rotation.value = 0;
        isBold = false; isItalic = false;
        fontBold.classList.remove('active');
        fontItalic.classList.remove('active');
        fontColor.value = '#ffffff';

        wmX = canvas.width - 100;
        wmY = canvas.height - 50;

        closeResetModal();
        draw();
        showToast('Settings reset', 'success');
    };

    // --- API Call ---
    applyBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        if (window.AuthManager && !AuthManager.user) {
            showToast('Login required', 'error');
            setTimeout(() => window.location.href = '/auth', 1500);
            return;
        }

        // Use unified loading UI
        if (window.ImgCraftBusyUI) {
            window.ImgCraftBusyUI.showLoading('Adding Watermark...');
        }

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('watermark_type', watermarkType);

        // Calculate relative position (%) to send to backend
        const posX = (wmX / canvas.width) * 100;
        const posY = (wmY / canvas.height) * 100;

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
            if (watermarkImageInput.files[0]) {
                formData.append('watermark_image', watermarkImageInput.files[0]);
            }
        }

        try {
            const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};
            const response = await fetch('/api/watermark', {
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

                downloadBtn.href = url;
                downloadBtn.download = `watermarked_${currentFile.name}`;
                downloadArea.style.display = 'block';
                applyBtn.style.display = 'none';

                let msg = 'Watermark applied!';
                if (cost) msg += ` (-${cost} Credits)`;
                showToast(msg, 'success');

                if (window.CreditManager) CreditManager.refreshCredits();

                // Update Streak
                if (window.StreakManager) {
                    StreakManager.updateStreak();
                }
            } else {
                showToast('Failed to apply watermark', 'error');
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
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});