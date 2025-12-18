document.addEventListener('DOMContentLoaded', () => {
    console.log("Crop Tool Loaded - Rewritten Version");


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

    // Crop Box State (in SOURCE IMAGE coordinates - ALWAYS)
    let cropBox = { x: 0, y: 0, width: 0, height: 0 };
    let aspectRatio = null; // null = free
    let gridType = 'thirds';

    // Interaction State
    let activeAction = null; // 'drag', 'resize-tl', 'resize-tr', etc., or 'pan'
    let dragStart = { x: 0, y: 0 };
    let cropBoxStart = null;
    let panStart = { x: 0, y: 0 };

    const HANDLE_SIZE = 12; // Visual size in screen pixels
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

        // Reset State
        rotation = 0;
        flipH = false;
        flipV = false;
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        activeAction = null;

        // Default Crop: 80% centered in SOURCE image space
        const w = sourceImage.width * 0.8;
        const h = sourceImage.height * 0.8;
        cropBox = {
            x: (sourceImage.width - w) / 2,
            y: (sourceImage.height - h) / 2,
            width: w,
            height: h
        };

        fitImageToCanvas();
        draw();
    }

    function fitImageToCanvas() {
        const container = editorContainer.getBoundingClientRect();
        const padding = 80;
        const availW = container.width - padding;
        const availH = container.height - padding;

        const scaleW = availW / sourceImage.width;
        const scaleH = availH / sourceImage.height;
        scale = Math.min(scaleW, scaleH, 1); // Don't upscale beyond 100%

        // Center image
        offsetX = (container.width - sourceImage.width * scale) / 2;
        offsetY = (container.height - sourceImage.height * scale) / 2;

        updateZoomDisplay();
    }

    // --- SIMPLIFIED Drawing System ---
    function draw() {
        if (!isImageLoaded || !ctx || !sourceImage) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = editorContainer.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw the transformed image
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Apply rotation and flip at image center
        ctx.translate(sourceImage.width / 2, sourceImage.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.translate(-sourceImage.width / 2, -sourceImage.height / 2);

        // Draw source image
        ctx.drawImage(sourceImage, 0, 0);

        // Draw darkened overlay (4 rectangles around crop box)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

        // Top
        ctx.fillRect(0, 0, sourceImage.width, cropBox.y);
        // Bottom
        ctx.fillRect(0, cropBox.y + cropBox.height, sourceImage.width, sourceImage.height - (cropBox.y + cropBox.height));
        // Left
        ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.height);
        // Right
        ctx.fillRect(cropBox.x + cropBox.width, cropBox.y, sourceImage.width - (cropBox.x + cropBox.width), cropBox.height);

        // Draw crop box border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 / scale;
        ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);

        // Draw grid
        if (gridType !== 'none') drawGrid();

        // Draw resize handles
        drawHandles();

        ctx.restore();
    }

    function drawGrid() {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1 / scale;

        const { x, y, width: w, height: h } = cropBox;

        if (gridType === 'thirds') {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(x + w / 3, y);
            ctx.lineTo(x + w / 3, y + h);
            ctx.moveTo(x + 2 * w / 3, y);
            ctx.lineTo(x + 2 * w / 3, y + h);
            // Horizontal lines
            ctx.moveTo(x, y + h / 3);
            ctx.lineTo(x + w, y + h / 3);
            ctx.moveTo(x, y + 2 * h / 3);
            ctx.lineTo(x + w, y + 2 * h / 3);
            ctx.stroke();
        } else if (gridType === 'golden') {
            const phi = 0.618;
            ctx.beginPath();
            ctx.moveTo(x + w * phi, y);
            ctx.lineTo(x + w * phi, y + h);
            ctx.moveTo(x + w * (1 - phi), y);
            ctx.lineTo(x + w * (1 - phi), y + h);
            ctx.moveTo(x, y + h * phi);
            ctx.lineTo(x + w, y + h * phi);
            ctx.moveTo(x, y + h * (1 - phi));
            ctx.lineTo(x + w, y + h * (1 - phi));
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawHandles() {
        const handleSize = HANDLE_SIZE / scale;
        const { x, y, width: w, height: h } = cropBox;

        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1 / scale;

        const handles = [
            { x: x, y: y }, // tl
            { x: x + w, y: y }, // tr
            { x: x, y: y + h }, // bl
            { x: x + w, y: y + h }, // br
            { x: x + w / 2, y: y }, // n
            { x: x + w / 2, y: y + h }, // s
            { x: x, y: y + h / 2 }, // w
            { x: x + w, y: y + h / 2 }, // e
        ];

        handles.forEach(handle => {
            ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        });
    }

    // --- Mouse/Touch Coordinate Conversion ---
    function getCanvasPoint(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function canvasToImageSpace(canvasX, canvasY) {
        // Reverse the transformations applied in draw()
        // 1. Undo offset and scale
        let x = (canvasX - offsetX) / scale;
        let y = (canvasY - offsetY) / scale;

        // 2. Undo rotation and flip (inverse transform)
        const centerX = sourceImage.width / 2;
        const centerY = sourceImage.height / 2;

        // Translate to origin
        x -= centerX;
        y -= centerY;

        // Undo flip
        if (flipH) x = -x;
        if (flipV) y = -y;

        // Undo rotation
        const angle = (-rotation * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;

        // Translate back
        return {
            x: rx + centerX,
            y: ry + centerY
        };
    }

    function getHandleAtPoint(imgX, imgY) {
        const threshold = (HANDLE_SIZE * 1.5) / scale;
        const { x, y, width: w, height: h } = cropBox;

        const handles = {
            'tl': { x: x, y: y },
            'tr': { x: x + w, y: y },
            'bl': { x: x, y: y + h },
            'br': { x: x + w, y: y + h },
            'n': { x: x + w / 2, y: y },
            's': { x: x + w / 2, y: y + h },
            'w': { x: x, y: y + h / 2 },
            'e': { x: x + w, y: y + h / 2 }
        };

        for (const [name, handle] of Object.entries(handles)) {
            const dist = Math.sqrt(Math.pow(imgX - handle.x, 2) + Math.pow(imgY - handle.y, 2));
            if (dist < threshold) return name;
        }

        return null;
    }

    function isInsideCropBox(imgX, imgY) {
        return imgX >= cropBox.x && imgX <= cropBox.x + cropBox.width &&
            imgY >= cropBox.y && imgY <= cropBox.y + cropBox.height;
    }

    // --- Interaction Handlers ---
    let isPanning = false;

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);

    function handlePointerDown(e) {
        if (!isImageLoaded) return;
        if (e.touches) e.preventDefault();

        const canvasPoint = getCanvasPoint(e);
        dragStart = canvasPoint;

        if (isPanning) {
            activeAction = 'pan';
            panStart = { x: offsetX, y: offsetY };
            canvas.style.cursor = 'grabbing';
            return;
        }

        const imgPoint = canvasToImageSpace(canvasPoint.x, canvasPoint.y);
        const handle = getHandleAtPoint(imgPoint.x, imgPoint.y);

        if (handle) {
            activeAction = 'resize-' + handle;
            cropBoxStart = { ...cropBox };
        } else if (isInsideCropBox(imgPoint.x, imgPoint.y)) {
            activeAction = 'drag';
            cropBoxStart = { ...cropBox };
        }
    }

    function handlePointerMove(e) {
        if (!isImageLoaded) return;

        const canvasPoint = getCanvasPoint(e);

        // Update cursor when not dragging
        if (!activeAction) {
            const imgPoint = canvasToImageSpace(canvasPoint.x, canvasPoint.y);
            const handle = getHandleAtPoint(imgPoint.x, imgPoint.y);

            if (handle) {
                if (handle === 'n' || handle === 's') canvas.style.cursor = 'ns-resize';
                else if (handle === 'e' || handle === 'w') canvas.style.cursor = 'ew-resize';
                else if (handle === 'tl' || handle === 'br') canvas.style.cursor = 'nwse-resize';
                else canvas.style.cursor = 'nesw-resize';
            } else if (isInsideCropBox(imgPoint.x, imgPoint.y)) {
                canvas.style.cursor = 'move';
            } else {
                canvas.style.cursor = isPanning ? 'grab' : 'default';
            }
            return;
        }

        if (e.touches) e.preventDefault();

        if (activeAction === 'pan') {
            offsetX = panStart.x + (canvasPoint.x - dragStart.x);
            offsetY = panStart.y + (canvasPoint.y - dragStart.y);
            draw();
            return;
        }

        const imgPoint = canvasToImageSpace(canvasPoint.x, canvasPoint.y);
        const imgStart = canvasToImageSpace(dragStart.x, dragStart.y);
        const dx = imgPoint.x - imgStart.x;
        const dy = imgPoint.y - imgStart.y;

        if (activeAction === 'drag') {
            cropBox.x = cropBoxStart.x + dx;
            cropBox.y = cropBoxStart.y + dy;

            // Constrain to image bounds
            cropBox.x = Math.max(0, Math.min(cropBox.x, sourceImage.width - cropBox.width));
            cropBox.y = Math.max(0, Math.min(cropBox.y, sourceImage.height - cropBox.height));
        } else if (activeAction.startsWith('resize-')) {
            const handle = activeAction.replace('resize-', '');
            let newBox = { ...cropBoxStart };

            // Apply resize based on handle
            if (handle.includes('e')) {
                newBox.width = Math.max(MIN_CROP_SIZE, cropBoxStart.width + dx);
            }
            if (handle.includes('w')) {
                const newWidth = Math.max(MIN_CROP_SIZE, cropBoxStart.width - dx);
                newBox.x = cropBoxStart.x + (cropBoxStart.width - newWidth);
                newBox.width = newWidth;
            }
            if (handle.includes('s')) {
                newBox.height = Math.max(MIN_CROP_SIZE, cropBoxStart.height + dy);
            }
            if (handle.includes('n')) {
                const newHeight = Math.max(MIN_CROP_SIZE, cropBoxStart.height - dy);
                newBox.y = cropBoxStart.y + (cropBoxStart.height - newHeight);
                newBox.height = newHeight;
            }

            // Apply aspect ratio constraint
            if (aspectRatio) {
                if (handle === 'n' || handle === 's') {
                    // Height changed, adjust width
                    const oldWidth = newBox.width;
                    newBox.width = newBox.height * aspectRatio;
                    // Center the width change
                    if (handle === 'n' || handle === 's') {
                        newBox.x = newBox.x + (oldWidth - newBox.width) / 2;
                    }
                } else if (handle === 'e' || handle === 'w') {
                    // Width changed, adjust height
                    const oldHeight = newBox.height;
                    newBox.height = newBox.width / aspectRatio;
                    // Center the height change
                    if (handle === 'e' || handle === 'w') {
                        newBox.y = newBox.y + (oldHeight - newBox.height) / 2;
                    }
                } else {
                    // Corner handle - maintain aspect ratio
                    if (handle === 'br' || handle === 'tl') {
                        newBox.height = newBox.width / aspectRatio;
                        if (handle === 'tl') {
                            newBox.y = cropBoxStart.y + cropBoxStart.height - newBox.height;
                        }
                    } else {
                        newBox.height = newBox.width / aspectRatio;
                        if (handle === 'tr') {
                            newBox.y = cropBoxStart.y + cropBoxStart.height - newBox.height;
                        }
                    }
                }
            }

            // Constrain to image bounds
            if (newBox.x < 0) {
                newBox.width += newBox.x;
                newBox.x = 0;
            }
            if (newBox.y < 0) {
                newBox.height += newBox.y;
                newBox.y = 0;
            }
            if (newBox.x + newBox.width > sourceImage.width) {
                newBox.width = sourceImage.width - newBox.x;
            }
            if (newBox.y + newBox.height > sourceImage.height) {
                newBox.height = sourceImage.height - newBox.y;
            }

            cropBox = newBox;
            updateCustomInputs();
        }

        draw();
    }

    function handlePointerUp() {
        activeAction = null;
        if (isPanning) {
            canvas.style.cursor = 'grab';
        }
    }

    // --- UI Controls ---
    zoomInBtn.addEventListener('click', () => {
        scale *= 1.2;
        updateZoomDisplay();
        draw();
    });

    zoomOutBtn.addEventListener('click', () => {
        scale /= 1.2;
        updateZoomDisplay();
        draw();
    });

    function updateZoomDisplay() {
        zoomLevelSpan.textContent = Math.round(scale * 100) + '%';
    }

    panToggleBtn.addEventListener('click', () => {
        isPanning = !isPanning;
        panToggleBtn.classList.toggle('active');
        canvas.style.cursor = isPanning ? 'grab' : 'default';
        showToast(isPanning ? 'Pan Mode ON' : 'Pan Mode OFF', 'info');
    });

    // Transform buttons
    document.getElementById('rotateLeft').addEventListener('click', () => {
        rotation = (rotation - 90) % 360;
        draw();
    });

    document.getElementById('rotateRight').addEventListener('click', () => {
        rotation = (rotation + 90) % 360;
        draw();
    });

    document.getElementById('flipH').addEventListener('click', () => {
        flipH = !flipH;
        draw();
    });

    document.getElementById('flipV').addEventListener('click', () => {
        flipV = !flipV;
        draw();
    });

    // Grid controls
    document.getElementById('gridRuleThirds').addEventListener('click', function () {
        setGrid('thirds', this);
    });

    document.getElementById('gridGolden').addEventListener('click', function () {
        setGrid('golden', this);
    });

    document.getElementById('gridNone').addEventListener('click', function () {
        setGrid('none', this);
    });

    function setGrid(type, btn) {
        gridType = type;
        document.querySelectorAll('.tool-btn').forEach(b => {
            if (b.id && b.id.startsWith('grid')) b.classList.remove('active');
        });
        if (btn) btn.classList.add('active');
        draw();
    }

    // Aspect ratio buttons
    document.querySelectorAll('.aspect-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const ratio = this.dataset.ratio;

            if (ratio === 'custom') {
                customInputsDiv.style.display = 'block';
                aspectRatio = cropBox.width / cropBox.height;
                updateCustomInputs();
            } else {
                customInputsDiv.style.display = 'none';

                if (ratio === 'free') {
                    aspectRatio = null;
                } else {
                    const [w, h] = ratio.split(':').map(Number);
                    aspectRatio = w / h;

                    // Adjust crop box to match aspect ratio
                    const currentRatio = cropBox.width / cropBox.height;
                    if (currentRatio > aspectRatio) {
                        // Too wide, reduce width
                        const newWidth = cropBox.height * aspectRatio;
                        cropBox.x += (cropBox.width - newWidth) / 2;
                        cropBox.width = newWidth;
                    } else {
                        // Too tall, reduce height
                        const newHeight = cropBox.width / aspectRatio;
                        cropBox.y += (cropBox.height - newHeight) / 2;
                        cropBox.height = newHeight;
                    }
                    draw();
                }
            }
        });
    });

    function updateCustomInputs() {
        if (customInputsDiv.style.display === 'none' || customInputsDiv.style.display === '') return;
        customWidthInput.value = Math.round(cropBox.width);
        customHeightInput.value = Math.round(cropBox.height);
    }

    // Custom input spinners
    document.querySelectorAll('.spin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            const delta = btn.dataset.action === 'up' ? 10 : -10;
            let val = parseInt(input.value || 0) + delta;

            if (val < MIN_CROP_SIZE) val = MIN_CROP_SIZE;

            if (targetId === 'customWidth') {
                if (val > sourceImage.width) val = sourceImage.width;
                const oldWidth = cropBox.width;
                cropBox.width = val;
                cropBox.x += (oldWidth - val) / 2; // Keep centered
                if (cropBox.x < 0) cropBox.x = 0;
                if (cropBox.x + cropBox.width > sourceImage.width) {
                    cropBox.x = sourceImage.width - cropBox.width;
                }
            } else {
                if (val > sourceImage.height) val = sourceImage.height;
                const oldHeight = cropBox.height;
                cropBox.height = val;
                cropBox.y += (oldHeight - val) / 2; // Keep centered
                if (cropBox.y < 0) cropBox.y = 0;
                if (cropBox.y + cropBox.height > sourceImage.height) {
                    cropBox.y = sourceImage.height - cropBox.height;
                }
            }

            input.value = val;
            aspectRatio = cropBox.width / cropBox.height;
            draw();
        });
    });

    // Reset button
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

    // Crop API Call
    cropBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // Auth check
        if (window.AuthManager && !AuthManager.user) {
            showToast('Please login to use this tool', 'error');
            setTimeout(() => window.location.href = '/auth', 1500);
            return;
        }

        if (window.CreditManager && !CreditManager.hasCredits(2)) {
            showToast('Insufficient credits', 'error');
            return;
        }

        // Use unified loading UI
        if (window.ImgCraftBusyUI) {
            window.ImgCraftBusyUI.showLoading('Cropping Image...');
        }

        if (scanOverlay) scanOverlay.style.display = 'block';

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('x', Math.round(cropBox.x));
        formData.append('y', Math.round(cropBox.y));
        formData.append('width', Math.round(cropBox.width));
        formData.append('height', Math.round(cropBox.height));
        formData.append('rotation', rotation);
        formData.append('flipH', flipH ? '1' : '0');
        formData.append('flipV', flipV ? '1' : '0');

        try {
            const token = window.AuthManager ? window.AuthManager.getToken() : null;
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/crop', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (scanOverlay) scanOverlay.style.display = 'none';

            if (response.ok) {
                // Update loading text
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.setLoadingText('Preparing Download...');
                }

                const cost = response.headers.get('X-Credits-Cost');
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Show result
                croppedResult.src = url;
                editorContainer.style.display = 'none';
                resultContainer.style.display = 'flex';

                downloadArea.style.display = 'block';
                downloadBtn.href = url;
                downloadBtn.download = `cropped_${currentFile.name}`;
                cropBtn.style.display = 'none';

                let msg = 'Image cropped successfully!';
                if (cost && cost !== '0') msg += ` (-${cost} credits)`;
                showToast(msg, 'success');

                if (window.CreditManager && cost && cost !== '0') {
                    CreditManager.refreshCredits();
                }

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
                            hasMetadata: undefined // Cropping preserves metadata status
                        });

                        if (scoreData) {
                            WebReadyScore.displayScore('webReadyScoreRow', scoreData);
                        }
                    };
                    img.src = url;
                }
            } else {
                const errorMessage = await parseErrorResponse(response, 'Crop failed');
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Crop error:', error);
            showToast('Network error', 'error');
            if (scanOverlay) scanOverlay.style.display = 'none';
        } finally {
            // Hide unified loading UI
            if (window.ImgCraftBusyUI) {
                window.ImgCraftBusyUI.hideLoading();
            }
        }
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
            console.warn('Crop error parse failed', err);
            return fallbackMessage;
        }
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) {
            window.showToast(type, type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info', msg);
        } else {
            console.log(`[${type}] ${msg}`);
        }
    }
});
