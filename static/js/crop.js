document.addEventListener('DOMContentLoaded', () => {
    console.log("Crop Tool Loaded - Heavy Version");

    // --- DOM Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const editorContainer = document.getElementById('editorContainer');
    const resultContainer = document.getElementById('resultContainer');
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const croppedResult = document.getElementById('croppedResult');
    const scanOverlay = document.getElementById('scanOverlay');

    // Panels
    const fileInfoDisplay = document.getElementById('fileInfoDisplay');
    const startInfoLeft = document.getElementById('startInfoLeft');
    const startInfoRight = document.getElementById('startInfoRight');
    const cropControls = document.getElementById('cropControls');

    // Info Fields
    const fileNameSpan = document.getElementById('fileName');
    const fileSizeSpan = document.getElementById('fileSize');
    const fileDimSpan = document.getElementById('fileDimensions');

    // Controls
    const cropBtn = document.getElementById('cropBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadArea = document.getElementById('downloadArea');
    const downloadBtn = document.getElementById('downloadBtn');

    // Zoom/Pan
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomLevelSpan = document.getElementById('zoomLevel');
    const panToggleBtn = document.getElementById('panToggle');

    // Custom Inputs
    const customInputsDiv = document.getElementById('customInputs');
    const customWidthInput = document.getElementById('customWidth');
    const customHeightInput = document.getElementById('customHeight');

    // --- State Variables ---
    let currentFile = null;
    let sourceImage = null;
    let isImageLoaded = false;

    // View State
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    // Image State
    let rotation = 0;
    let flipH = false;
    let flipV = false;

    // Crop Box State (Image Coordinates)
    let cropBox = { x: 0, y: 0, width: 0, height: 0 };
    let aspectRatio = null; // null = free
    let gridType = 'thirds';

    // Interaction State
    let isDragging = false;
    let isResizing = false;
    let resizeHandle = null; // 'tl', 'tr', 'bl', 'br', 'n', 's', 'e', 'w'
    let isPanning = false;
    let startX = 0, startY = 0;
    let startCropBox = null;
    let startPan = { x: 0, y: 0 };

    const HANDLE_SIZE = 10;
    const MIN_CROP_SIZE = 20;

    // --- File Handling ---
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

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please upload a valid image', 'error');
            return;
        }
        currentFile = file;
        fileNameSpan.textContent = file.name.length > 20 ? file.name.substring(0, 15) + '...' : file.name;
        fileSizeSpan.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

        const reader = new FileReader();
        reader.onload = (e) => {
            sourceImage = new Image();
            sourceImage.onload = () => {
                isImageLoaded = true;
                fileDimSpan.textContent = `${sourceImage.width} x ${sourceImage.height}`;
                initEditor();
            };
            sourceImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function initEditor() {
        // Switch UI
        dropZone.style.display = 'none';
        editorContainer.style.display = 'flex';
        resultContainer.style.display = 'none';

        fileInfoDisplay.style.display = 'block';
        startInfoLeft.style.display = 'none';
        startInfoRight.style.display = 'none';
        cropControls.style.display = 'block';
        cropBtn.disabled = false;
        resetBtn.disabled = false;
        downloadArea.style.display = 'none';

        // Reset Logic
        rotation = 0; flipH = false; flipV = false;
        scale = 1; offsetX = 0; offsetY = 0;

        // Default Crop: 80% centered
        const w = sourceImage.width * 0.8;
        const h = sourceImage.height * 0.8;
        cropBox = {
            x: (sourceImage.width - w) / 2,
            y: (sourceImage.height - h) / 2,
            width: w,
            height: h
        };

        fitImageToCanvas();
        requestAnimationFrame(draw);
    }

    function fitImageToCanvas() {
        const container = editorContainer.getBoundingClientRect();
        const padding = 40;
        const availW = container.width - padding;
        const availH = container.height - padding;

        const scaleW = availW / sourceImage.width;
        const scaleH = availH / sourceImage.height;
        scale = Math.min(scaleW, scaleH);

        // Center image
        offsetX = (container.width - sourceImage.width * scale) / 2;
        offsetY = (container.height - sourceImage.height * scale) / 2;

        updateZoomDisplay();
    }

    // --- Drawing System ---
    function draw() {
        if (!isImageLoaded || !ctx || !sourceImage) return;

        // 1. Setup High DPI Canvas
        const dpr = window.devicePixelRatio || 1;
        const rect = editorContainer.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);

        ctx.save();

        // 2. Apply Pan & Zoom
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // 3. Apply Image Transforms (Rotate/Flip)
        ctx.translate(sourceImage.width / 2, sourceImage.height / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.translate(-sourceImage.width / 2, -sourceImage.height / 2);

        // 4. Draw Image
        ctx.drawImage(sourceImage, 0, 0);
        ctx.restore();

        // 5. Draw Overlay (Darken non-cropped area)
        // We need to apply the SAME transforms to the overlay rectangles so they match the rotated image
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        ctx.translate(sourceImage.width / 2, sourceImage.height / 2);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.translate(-sourceImage.width / 2, -sourceImage.height / 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';

        // Draw 4 rects around the crop box
        // Top
        ctx.fillRect(0, 0, sourceImage.width, cropBox.y);
        // Bottom
        ctx.fillRect(0, cropBox.y + cropBox.height, sourceImage.width, sourceImage.height - (cropBox.y + cropBox.height));
        // Left
        ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.height);
        // Right
        ctx.fillRect(cropBox.x + cropBox.width, cropBox.y, sourceImage.width - (cropBox.x + cropBox.width), cropBox.height);

        // 6. Draw Crop Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);

        // 7. Draw Grid
        if (gridType !== 'none') drawGrid();

        // 8. Draw Handles
        drawHandles();

        ctx.restore();
    }

    function drawGrid() {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1 / scale;
        const { x, y, width: w, height: h } = cropBox;

        if (gridType === 'thirds') {
            ctx.moveTo(x + w / 3, y); ctx.lineTo(x + w / 3, y + h);
            ctx.moveTo(x + 2 * w / 3, y); ctx.lineTo(x + 2 * w / 3, y + h);
            ctx.moveTo(x, y + h / 3); ctx.lineTo(x + w, y + h / 3);
            ctx.moveTo(x, y + 2 * h / 3); ctx.lineTo(x + w, y + 2 * h / 3);
        } else if (gridType === 'golden') {
            const phi = 0.618;
            ctx.moveTo(x + w * (1 - phi), y); ctx.lineTo(x + w * (1 - phi), y + h);
            ctx.moveTo(x + w * phi, y); ctx.lineTo(x + w * phi, y + h);
            ctx.moveTo(x, y + h * (1 - phi)); ctx.lineTo(x + w, y + h * (1 - phi));
            ctx.moveTo(x, y + h * phi); ctx.lineTo(x + w, y + h * phi);
        }
        ctx.stroke();
    }

    function drawHandles() {
        const size = (HANDLE_SIZE / scale);
        ctx.fillStyle = '#fff';
        const { x, y, width: w, height: h } = cropBox;

        // Corners
        ctx.fillRect(x - size / 2, y - size / 2, size, size); // TL
        ctx.fillRect(x + w - size / 2, y - size / 2, size, size); // TR
        ctx.fillRect(x - size / 2, y + h - size / 2, size, size); // BL
        ctx.fillRect(x + w - size / 2, y + h - size / 2, size, size); // BR

        // Edges
        ctx.fillRect(x + w / 2 - size / 2, y - size / 2, size, size); // N
        ctx.fillRect(x + w / 2 - size / 2, y + h - size / 2, size, size); // S
        ctx.fillRect(x - size / 2, y + h / 2 - size / 2, size, size); // W
        ctx.fillRect(x + w - size / 2, y + h / 2 - size / 2, size, size); // E
    }

    // --- Interaction Logic (Mouse & Touch) ---
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);

    // Convert screen coordinates to Image Space (accounting for pan, zoom, rotate, flip)
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;

        // 1. Undo Pan & Zoom
        let x = (screenX - offsetX) / scale;
        let y = (screenY - offsetY) / scale;

        // 2. Undo Rotation & Flip (Inverse Transform)
        // Move origin to image center
        x -= sourceImage.width / 2;
        y -= sourceImage.height / 2;

        const rad = -rotation * Math.PI / 180;
        const rx = x * Math.cos(rad) - y * Math.sin(rad);
        const ry = x * Math.sin(rad) + y * Math.cos(rad);

        const fx = flipH ? -rx : rx;
        const fy = flipV ? -ry : ry;

        // Move origin back
        return {
            x: fx + sourceImage.width / 2,
            y: fy + sourceImage.height / 2
        };
    }

    function getHandle(pos) {
        const s = (HANDLE_SIZE / scale) * 2; // Larger hit area
        const { x, y, width: w, height: h } = cropBox;

        if (Math.abs(pos.x - x) < s && Math.abs(pos.y - y) < s) return 'tl';
        if (Math.abs(pos.x - (x + w)) < s && Math.abs(pos.y - y) < s) return 'tr';
        if (Math.abs(pos.x - x) < s && Math.abs(pos.y - (y + h)) < s) return 'bl';
        if (Math.abs(pos.x - (x + w)) < s && Math.abs(pos.y - (y + h)) < s) return 'br';

        if (Math.abs(pos.x - (x + w / 2)) < s && Math.abs(pos.y - y) < s) return 'n';
        if (Math.abs(pos.x - (x + w / 2)) < s && Math.abs(pos.y - (y + h)) < s) return 's';
        if (Math.abs(pos.x - x) < s && Math.abs(pos.y - (y + h / 2)) < s) return 'w';
        if (Math.abs(pos.x - (x + w)) < s && Math.abs(pos.y - (y + h / 2)) < s) return 'e';

        return null;
    }

    function handleStart(e) {
        if (!isImageLoaded) return;
        if (e.touches) e.preventDefault(); // Prevent scrolling on touch

        if (isPanning) {
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            startX = clientX;
            startY = clientY;
            startPan = { x: offsetX, y: offsetY };
            return;
        }

        const pos = getMousePos(e);
        resizeHandle = getHandle(pos);

        if (resizeHandle) {
            isResizing = true;
            startCropBox = { ...cropBox };
            startX = pos.x;
            startY = pos.y;
        } else if (pos.x >= cropBox.x && pos.x <= cropBox.x + cropBox.width &&
            pos.y >= cropBox.y && pos.y <= cropBox.y + cropBox.height) {
            isDragging = true;
            startCropBox = { ...cropBox };
            startX = pos.x;
            startY = pos.y;
        }
    }

    function handleMove(e) {
        if (!isImageLoaded) return;

        if (isPanning && isDragging) {
            if (e.touches) e.preventDefault();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            offsetX = startPan.x + (clientX - startX);
            offsetY = startPan.y + (clientY - startY);
            requestAnimationFrame(draw);
            return;
        }

        // Cursor Updates
        const pos = getMousePos(e);
        if (!isDragging && !isResizing) {
            const handle = getHandle(pos);
            if (handle) {
                canvas.style.cursor = handle.match(/n|s/) ? 'ns-resize' :
                    handle.match(/e|w/) ? 'ew-resize' :
                        handle === 'tl' || handle === 'br' ? 'nwse-resize' : 'nesw-resize';
            } else if (pos.x >= cropBox.x && pos.x <= cropBox.x + cropBox.width &&
                pos.y >= cropBox.y && pos.y <= cropBox.y + cropBox.height) {
                canvas.style.cursor = 'move';
            } else {
                canvas.style.cursor = 'default';
            }
            return;
        }

        e.preventDefault();
        const dx = pos.x - startX;
        const dy = pos.y - startY;

        if (isDragging) {
            let newX = startCropBox.x + dx;
            let newY = startCropBox.y + dy;

            // Constrain
            newX = Math.max(0, Math.min(newX, sourceImage.width - cropBox.width));
            newY = Math.max(0, Math.min(newY, sourceImage.height - cropBox.height));

            cropBox.x = newX;
            cropBox.y = newY;
        }
        else if (isResizing) {
            let newBox = { ...startCropBox };

            // Apply delta based on handle
            if (resizeHandle.includes('e')) newBox.width = Math.max(MIN_CROP_SIZE, startCropBox.width + dx);
            if (resizeHandle.includes('w')) {
                const w = Math.max(MIN_CROP_SIZE, startCropBox.width - dx);
                newBox.x = startCropBox.x + startCropBox.width - w;
                newBox.width = w;
            }
            if (resizeHandle.includes('s')) newBox.height = Math.max(MIN_CROP_SIZE, startCropBox.height + dy);
            if (resizeHandle.includes('n')) {
                const h = Math.max(MIN_CROP_SIZE, startCropBox.height - dy);
                newBox.y = startCropBox.y + startCropBox.height - h;
                newBox.height = h;
            }

            // Aspect Ratio Enforcement
            if (aspectRatio) {
                if (resizeHandle.match(/n|s/)) {
                    newBox.width = newBox.height * aspectRatio;
                    // If center expanding, adjust x
                    if (resizeHandle === 'n' || resizeHandle === 's') {
                        // This logic centers the growth, simple version:
                        // Just keep left edge? No, usually ratio lock expands width when height changes
                    }
                } else {
                    newBox.height = newBox.width / aspectRatio;
                }
            }

            // Boundary Constraints
            if (newBox.x < 0) newBox.x = 0;
            if (newBox.y < 0) newBox.y = 0;
            if (newBox.x + newBox.width > sourceImage.width) newBox.width = sourceImage.width - newBox.x;
            if (newBox.y + newBox.height > sourceImage.height) newBox.height = sourceImage.height - newBox.y;

            cropBox = newBox;
            updateCustomInputs();
        }

        requestAnimationFrame(draw);
    }

    function handleEnd() {
        isDragging = false;
        isResizing = false;
        resizeHandle = null;
    }

    // --- Inputs & Buttons Logic ---

    // Zoom
    zoomInBtn.addEventListener('click', () => { scale *= 1.1; updateZoomDisplay(); draw(); });
    zoomOutBtn.addEventListener('click', () => { scale /= 1.1; updateZoomDisplay(); draw(); });
    function updateZoomDisplay() { zoomLevelSpan.textContent = Math.round(scale * 100) + '%'; }

    panToggleBtn.addEventListener('click', () => {
        isPanning = !isPanning;
        panToggleBtn.classList.toggle('active');
        canvas.style.cursor = isPanning ? 'grab' : 'default';
        showToast(isPanning ? 'Pan Mode Active' : 'Crop Mode Active', 'info');
    });

    // Transforms
    document.getElementById('rotateLeft').addEventListener('click', () => { rotation -= 90; draw(); });
    document.getElementById('rotateRight').addEventListener('click', () => { rotation += 90; draw(); });
    document.getElementById('flipH').addEventListener('click', () => { flipH = !flipH; draw(); });
    document.getElementById('flipV').addEventListener('click', () => { flipV = !flipV; draw(); });

    // Grid Type
    document.getElementById('gridRuleThirds').addEventListener('click', (e) => setGrid('thirds', e.currentTarget));
    document.getElementById('gridGolden').addEventListener('click', (e) => setGrid('golden', e.currentTarget));
    document.getElementById('gridNone').addEventListener('click', (e) => setGrid('none', e.currentTarget));

    function setGrid(type, btn) {
        gridType = type;
        document.querySelectorAll('.tool-btn').forEach(b => {
            if (b.id.startsWith('grid')) b.classList.remove('active');
        });
        btn.classList.add('active');
        draw();
    }

    // Aspect Ratios
    document.querySelectorAll('.aspect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const ratio = btn.dataset.ratio;
            if (ratio === 'custom') {
                customInputsDiv.style.display = 'grid';
                aspectRatio = cropBox.width / cropBox.height; // Lock to current
                updateCustomInputs();
            } else {
                customInputsDiv.style.display = 'none';
                if (ratio === 'free') {
                    aspectRatio = null;
                } else {
                    const [w, h] = ratio.split(':').map(Number);
                    aspectRatio = w / h;
                    // Apply immediately
                    if (cropBox.width / cropBox.height > aspectRatio) {
                        cropBox.width = cropBox.height * aspectRatio;
                    } else {
                        cropBox.height = cropBox.width / aspectRatio;
                    }
                    draw();
                }
            }
        });
    });

    function updateCustomInputs() {
        if (customInputsDiv.style.display === 'none') return;
        customWidthInput.value = Math.round(cropBox.width);
        customHeightInput.value = Math.round(cropBox.height);
    }

    // Spinner Buttons
    document.querySelectorAll('.spin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            const delta = btn.dataset.action === 'up' ? 10 : -10;
            let val = parseInt(input.value) + delta;
            if (val < 20) val = 20;

            // Update CropBox
            if (targetId === 'customWidth') {
                if (val > sourceImage.width) val = sourceImage.width;
                cropBox.width = val;
            } else {
                if (val > sourceImage.height) val = sourceImage.height;
                cropBox.height = val;
            }

            input.value = val;
            aspectRatio = cropBox.width / cropBox.height; // Update ratio lock
            draw();
        });
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        document.getElementById('resetModal').style.display = 'flex';
    });
    document.getElementById('btnCancelReset').addEventListener('click', () => {
        document.getElementById('resetModal').style.display = 'none';
    });
    document.getElementById('btnConfirmReset').addEventListener('click', () => {
        initEditor();
        document.getElementById('resetModal').style.display = 'none';
    });

    // --- CROP API CALL ---
    cropBtn.addEventListener('click', () => {
        cropBtn.disabled = true;
        cropBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        if (scanOverlay) scanOverlay.style.display = 'block'; // Show scanning animation

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('x', cropBox.x);
        formData.append('y', cropBox.y);
        formData.append('width', cropBox.width);
        formData.append('height', cropBox.height);
        formData.append('rotation', rotation);
        formData.append('flipH', flipH);
        formData.append('flipV', flipV);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/crop', true);
        xhr.responseType = 'blob';

        // Headers
        if (window.AuthManager) {
            const headers = AuthManager.getAuthHeaders();
            if (headers.Authorization) xhr.setRequestHeader('Authorization', headers.Authorization);
        }

        xhr.onload = () => {
            if (scanOverlay) scanOverlay.style.display = 'none';

            if (xhr.status === 200) {
                const creditsDeducted = xhr.getResponseHeader('X-Credits-Cost');
                const costMsg = creditsDeducted ? ` (-${creditsDeducted} Credits)` : '';

                const blob = xhr.response;
                const url = URL.createObjectURL(blob);

                // Show Result
                croppedResult.src = url;
                editorContainer.style.display = 'none';
                resultContainer.style.display = 'flex';

                // Update UI
                downloadArea.style.display = 'block';
                downloadBtn.href = url;
                downloadBtn.download = `cropped_${currentFile.name}`;
                cropBtn.style.display = 'none';

                showToast(`Image cropped!${costMsg}`, 'success');
                if (window.CreditManager) CreditManager.refreshCredits();
            } else {
                showToast('Crop failed. Check credits or try again.', 'error');
                cropBtn.disabled = false;
                cropBtn.innerHTML = 'Apply Crop';
            }
        };
        xhr.send(formData);
    });

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});