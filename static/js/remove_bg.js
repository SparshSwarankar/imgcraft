document.addEventListener('DOMContentLoaded', () => {
    console.log("Remove BG Script Loaded with New Toast System");

    // --- Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');

    // Preview Elements
    const previewSimple = document.getElementById('previewSimple');
    const compareWrapper = document.getElementById('compareWrapper');
    const previewOriginal = document.getElementById('previewOriginal');
    const previewProcessed = document.getElementById('previewProcessed');

    // UI & Controls
    const removeBtn = document.getElementById('removeBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const resultButtons = document.getElementById('resultButtons');
    const fileInfoSection = document.getElementById('fileInfoSection');
    const startInfoLeft = document.getElementById('startInfoLeft');
    const startInfoRight = document.getElementById('startInfoRight');
    const successInfo = document.getElementById('successInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const toastContainer = document.getElementById('toast-container');

    // Control Panel Elements
    const mainControls = document.getElementById('mainControls');
    const editorTools = document.getElementById('editorTools');
    const mainFooter = document.getElementById('mainFooter');
    const editorFooter = document.getElementById('editorFooter');

    // Slider Elements
    const sliderHandle = document.getElementById('sliderHandle');
    const imgWrapperOriginal = document.getElementById('imgWrapperOriginal');
    const compareContainer = document.querySelector('.compare-container');

    let currentFile = null;

    // --- 1. Initialize Slider Logic ---
    if (sliderHandle && compareContainer) initCompareSlider();

    // --- File Handling ---
    if (dropZone) {
        dropZone.addEventListener('click', () => fileInput && fileInput.click());
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
            showToast('error', 'Invalid File', 'Please upload a valid image file (JPG, PNG, WEBP).');
            return;
        }

        currentFile = file;
        console.log("File selected:", file.name);

        // Update Info Text
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        
        // Show file info, hide empty state
        if (fileInfoSection) fileInfoSection.style.display = 'block';
        if (startInfoLeft) startInfoLeft.style.display = 'none';
        if (startInfoRight) startInfoRight.style.display = 'none';

        // FORCE DISPLAY IMMEDIATELY
        if (previewContainer) {
            previewContainer.style.display = 'flex';
        }
        if (dropZone) dropZone.style.display = 'none';

        // Read File for Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            // 1. Show Simple Preview (Initial State)
            if (previewSimple) {
                previewSimple.src = e.target.result;
                previewSimple.style.display = 'block';
            }

            // 2. Hide Compare Slider (until processing is done)
            if (compareWrapper) compareWrapper.style.display = 'none';

            // 3. Reset & Enable Remove Button
            if (removeBtn) {
                removeBtn.disabled = false;
                removeBtn.style.display = 'inline-flex';
                removeBtn.textContent = 'Remove Background';
            }

            // 4. Hide Success/Progress Areas
            if (resultButtons) resultButtons.style.display = 'none';
            if (successInfo) successInfo.style.display = 'none';
            if (progressContainer) progressContainer.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    // --- Remove Background Action ---
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            // --- STRICT VALIDATION WITH TOAST ---
            if (!currentFile) {
                console.log("No file selected, triggered validation.");
                showToast('error', 'No Image Selected', 'Please upload an image before using this tool.');
                return;
            }
            // ------------------------------------

            // Auth & Credit Check
            if (window.AuthManager && !AuthManager.user) {
                showToast('error', 'Authentication Required', 'Please login to use this tool');
                setTimeout(() => window.location.href = '/auth', 1500);
                return;
            }

            if (window.CreditManager && !CreditManager.hasCredits(5)) {
                showToast('error', 'Insufficient Credits', 'Please purchase more credits.');
                return;
            }

            console.log("Starting background removal...");

            // Use unified loading UI
            if (window.ImgCraftBusyUI) {
                window.ImgCraftBusyUI.showLoading('Analyzing Image...');
            }

            const formData = new FormData();
            formData.append('image', currentFile);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/remove-bg', true);

            // Add Auth Header
            if (window.AuthManager) {
                const headers = AuthManager.getAuthHeaders();
                if (headers.Authorization) {
                    xhr.setRequestHeader('Authorization', headers.Authorization);
                }
            }

            xhr.responseType = 'blob';

            // 2. RESPONSE HANDLER (Runs when server is done)
            xhr.onload = () => {
                if (xhr.status === 200) {
                    // Update loading text
                    if (window.ImgCraftBusyUI) {
                        window.ImgCraftBusyUI.setLoadingText('Processing Results...');
                    }

                    // --- UPDATE: Get Credits ---
                    const creditsDeducted = xhr.getResponseHeader('X-Credits-Cost');
                    const costMsg = creditsDeducted ? ` (-${creditsDeducted} Credits)` : '';

                    const blob = xhr.response;
                    const url = URL.createObjectURL(blob);

                    // --- SETUP SLIDER ---
                    const originalReader = new FileReader();
                    originalReader.onload = (e) => {
                        if (previewOriginal) previewOriginal.src = e.target.result;
                    };
                    originalReader.readAsDataURL(currentFile);

                    if (previewProcessed) previewProcessed.src = url;

                    // SWITCH VIEWS
                    if (previewSimple) previewSimple.style.display = 'none';
                    if (compareWrapper) compareWrapper.style.display = 'flex';

                    // ANIMATE SLIDER (Wipe Effect)
                    if (imgWrapperOriginal && sliderHandle) {
                        imgWrapperOriginal.style.width = '100%';
                        sliderHandle.style.left = '100%';

                        imgWrapperOriginal.classList.add('wipe-effect');
                        sliderHandle.classList.add('wipe-effect');

                        requestAnimationFrame(() => {
                            imgWrapperOriginal.style.width = '50%';
                            sliderHandle.style.left = '50%';
                        });

                        setTimeout(() => {
                            imgWrapperOriginal.classList.remove('wipe-effect');
                            sliderHandle.classList.remove('wipe-effect');
                        }, 1500);
                    }

                    // DOWNLOAD LINK
                    const originalName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.'));
                    // Hide unified loading UI
                    if (window.ImgCraftBusyUI) {
                        window.ImgCraftBusyUI.hideLoading();
                    }

                    if (resultButtons) resultButtons.style.display = 'block';
                    if (successInfo) successInfo.style.display = 'block';
                    if (removeBtn) {
                        removeBtn.style.display = 'none';
                    }

                    // --- UPDATE: SUCCESS NOTIFICATION WITH CREDITS ---
                    showToast('success', 'Success!', `Background removed successfully.${costMsg}`);

                    // Refresh credits
                    if (window.CreditManager) {
                        CreditManager.refreshCredits();
                    }

                } else {
                    failUI();
                    showToast('error', 'Processing Failed', 'Could not remove background. Please try again.');
                }
            };

            xhr.onerror = () => {
                failUI();
                showToast('error', 'Network Error', 'Connection lost. Please check your internet.');
            };
            xhr.send(formData);
        });
    }

    function failUI() {
        // Hide unified loading UI
        if (window.ImgCraftBusyUI) {
            window.ImgCraftBusyUI.hideLoading();
        }
    }

    // --- Helper: Draggable Element (File Info) ---
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

    // --- Helper: Compare Slider Logic ---
    function initCompareSlider() {
        let isSliding = false;

        sliderHandle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            isSliding = true;
            sliderHandle.setPointerCapture(e.pointerId);
            sliderHandle.style.cursor = 'grabbing';
        });

        window.addEventListener('pointermove', (e) => {
            if (!isSliding) return;
            e.preventDefault();
            updateSlider(e.clientX);
        });

        window.addEventListener('pointerup', (e) => {
            if (isSliding) {
                isSliding = false;
                sliderHandle.style.cursor = 'col-resize';
                sliderHandle.releasePointerCapture(e.pointerId);
            }
        });

        compareContainer.addEventListener('click', (e) => {
            if (e.target !== sliderHandle && !sliderHandle.contains(e.target)) {
                updateSlider(e.clientX);
            }
        });

        function updateSlider(clientX) {
            const rect = compareContainer.getBoundingClientRect();
            let x = clientX - rect.left;

            if (x < 0) x = 0;
            if (x > rect.width) x = rect.width;

            const percentage = (x / rect.width) * 100;

            sliderHandle.style.left = percentage + '%';
            if (imgWrapperOriginal) imgWrapperOriginal.style.width = percentage + '%';
        }
    }

    // --- MANUAL FIX / EDITOR LOGIC ---

    // Editor Elements
    const manualFixBtn = document.getElementById('manualFixBtn');
    const editorContainer = document.getElementById('editorContainer');
    const canvasWrapper = document.getElementById('canvasWrapper');
    const canvas = document.getElementById('editorCanvas');
    const brushCursor = document.getElementById('brushCursor');
    const ghostOverlay = document.getElementById('ghostOverlay');
    const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;

    // Toolbar Elements
    const toolErase = document.getElementById('toolErase');
    const toolRestore = document.getElementById('toolRestore');
    const brushSizeInput = document.getElementById('brushSize');
    const brushHardnessInput = document.getElementById('brushHardness');
    const btnUndo = document.getElementById('btnUndo');
    const btnRedo = document.getElementById('btnRedo');
    const btnResetEdit = document.getElementById('btnResetEdit');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const btnApplyEdit = document.getElementById('btnApplyEdit');

    // Modal Elements (Custom Reset Modal)
    const resetModal = document.getElementById('resetModal');
    const btnCancelReset = document.getElementById('btnCancelReset');
    const btnConfirmReset = document.getElementById('btnConfirmReset');

    // State
    let isEditing = false;
    let activeTool = 'erase'; // 'erase' or 'restore'
    let brushSize = 30;
    let brushHardness = 0.8;
    let isDrawing = false;
    let history = [];
    let historyStep = -1;

    // Zoom/Pan State
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;

    // Images
    let editImage = new Image(); // The image being edited (processed)
    let sourceImage = new Image(); // The original image (for restore)
    let originalProcessedUrl = ''; // To restore on Reset

    if (manualFixBtn) {
        manualFixBtn.addEventListener('click', () => {
            if (!previewProcessed.src || !previewOriginal.src) return;
            enterEditMode();
        });
    }

    function enterEditMode() {
        isEditing = true;
        logEvent('enter_edit_mode');

        // Validate images exist
        if (!previewProcessed || !previewProcessed.src || !previewOriginal || !previewOriginal.src) {
            showToast('error', 'Error', 'Images not loaded. Please process the image first.');
            return;
        }

        // Hide Comparison, Show Editor
        compareWrapper.style.display = 'none';
        editorContainer.style.display = 'flex';
        manualFixBtn.style.display = 'none';
        resultButtons.style.display = 'none';

        // Switch Control Panels
        if (mainControls) mainControls.style.display = 'none';
        if (editorTools) editorTools.style.display = 'block';
        if (mainFooter) mainFooter.style.display = 'none';
        if (editorFooter) editorFooter.style.display = 'block';

        // Load Images
        editImage.src = previewProcessed.src;
        sourceImage.src = previewOriginal.src;
        originalProcessedUrl = previewProcessed.src;

        // Set Ghost Overlay Source
        if (ghostOverlay) {
            ghostOverlay.src = previewOriginal.src;
        }

        // Wait for BOTH images to load
        let processedLoaded = false;
        let sourceLoaded = false;

        const checkBothLoaded = () => {
            if (processedLoaded && sourceLoaded) {
                initializeCanvas();
            }
        };

        editImage.onload = () => {
            processedLoaded = true;
            checkBothLoaded();
        };

        sourceImage.onload = () => {
            sourceLoaded = true;
            checkBothLoaded();
        };

        // Error handling
        editImage.onerror = () => {
            showToast('error', 'Error', 'Failed to load processed image.');
            exitEditMode(false);
        };

        sourceImage.onerror = () => {
            showToast('error', 'Error', 'Failed to load original image.');
            exitEditMode(false);
        };
    }

    function initializeCanvas() {
        if (!canvas || !ctx || !editImage) return;

        // Setup Canvas dimensions
        canvas.width = editImage.naturalWidth;
        canvas.height = editImage.naturalHeight;

        console.log('Canvas initialized:', canvas.width, 'x', canvas.height);

        // Reset canvas style to ensure visibility
        canvas.style.display = 'block';

        // Clear and draw the processed image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(editImage, 0, 0, canvas.width, canvas.height);

        // Verify the image was drawn
        const imageData = ctx.getImageData(0, 0, 1, 1);
        console.log('Canvas pixel check:', imageData.data);

        // Reset History
        history = [];
        historyStep = -1;
        saveState();

        // Reset Zoom and Fit - use timeout to ensure DOM is ready
        setTimeout(() => {
            fitCanvas();
            updateBrushCursor();
        }, 50);
    }

    function exitEditMode(apply = false) {
        isEditing = false;
        editorContainer.style.display = 'none';
        compareWrapper.style.display = 'flex';
        manualFixBtn.style.display = 'inline-block';
        resultButtons.style.display = 'block';

        // Switch Control Panels Back
        if (mainControls) mainControls.style.display = 'block';
        if (editorTools) editorTools.style.display = 'none';
        if (mainFooter) mainFooter.style.display = 'block';
        if (editorFooter) editorFooter.style.display = 'none';

        if (apply) {
            logEvent('apply_edits');
            // Update Processed Image
            const newUrl = canvas.toDataURL('image/png');
            previewProcessed.src = newUrl;

            // Update Download Link
            if (downloadBtn) {
                downloadBtn.href = newUrl;
            }

            // Re-init slider to ensure it works with new image
            if (sliderHandle) {
                sliderHandle.style.left = '50%';
                if (imgWrapperOriginal) imgWrapperOriginal.style.width = '50%';
            }

            showToast('success', 'Changes Applied', 'Manual edits have been saved.');
        } else {
            logEvent('cancel_edits');
            showToast('info', 'Cancelled', 'Manual edits discarded.');
        }
    }

    function fitCanvas() {
        if (!canvas || !canvasWrapper) return;

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        
        // Ensure wrapper has dimensions
        if (wrapperRect.width === 0 || wrapperRect.height === 0) {
            console.warn('Canvas wrapper not ready, retrying...');
            setTimeout(fitCanvas, 100);
            return;
        }

        const scaleX = wrapperRect.width / canvas.width;
        const scaleY = wrapperRect.height / canvas.height;
        scale = Math.min(scaleX, scaleY, 1) * 0.85; // Max 85% fit, never upscale

        // Center
        offsetX = (wrapperRect.width - canvas.width * scale) / 2;
        offsetY = (wrapperRect.height - canvas.height * scale) / 2;

        updateTransform();
    }

    function updateTransform() {
        if (!canvas) return;

        const transformStr = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        canvas.style.transform = transformStr;
        canvas.style.transformOrigin = '0 0';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';

        // Sync Ghost Overlay
        if (ghostOverlay) {
            ghostOverlay.style.width = canvas.width + 'px';
            ghostOverlay.style.height = canvas.height + 'px';
            ghostOverlay.style.transform = transformStr;
            ghostOverlay.style.transformOrigin = '0 0';
            ghostOverlay.style.position = 'absolute';
            ghostOverlay.style.top = '0';
            ghostOverlay.style.left = '0';
        }

        updateBrushCursor();
    }

    // --- Toolbar Actions ---
    if (toolErase) toolErase.addEventListener('click', () => setTool('erase'));
    if (toolRestore) toolRestore.addEventListener('click', () => setTool('restore'));

    function setTool(tool) {
        activeTool = tool;
        toolErase.classList.toggle('active', tool === 'erase');
        toolRestore.classList.toggle('active', tool === 'restore');

        // Update Tool Description
        const toolDesc = document.getElementById('toolDesc');
        if (toolDesc) {
            toolDesc.textContent = tool === 'erase' 
                ? 'Click to remove background' 
                : 'Click to restore original';
        }

        // Toggle Ghost Overlay Class
        if (canvasWrapper) {
            if (tool === 'restore') {
                canvasWrapper.classList.add('restore-active');
            } else {
                canvasWrapper.classList.remove('restore-active');
            }
        }
    }

    if (brushSizeInput) {
        brushSizeInput.addEventListener('input', (e) => {
            brushSize = parseInt(e.target.value);
            const brushSizeVal = document.getElementById('brushSizeVal');
            if (brushSizeVal) brushSizeVal.textContent = brushSize;
            updateBrushCursor();
        });
    }
    if (brushHardnessInput) {
        brushHardnessInput.addEventListener('input', (e) => {
            brushHardness = parseInt(e.target.value) / 100;
            const brushHardnessVal = document.getElementById('brushHardnessVal');
            if (brushHardnessVal) brushHardnessVal.textContent = e.target.value;
        });
    }

    if (btnUndo) btnUndo.addEventListener('click', undo);
    if (btnRedo) btnRedo.addEventListener('click', redo);
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => exitEditMode(false));
    if (btnApplyEdit) btnApplyEdit.addEventListener('click', () => exitEditMode(true));

    // --- RESET LOGIC WITH CUSTOM MODAL ---

    // Open Modal logic
    if (btnResetEdit) {
        btnResetEdit.addEventListener('click', () => {
            if (resetModal) {
                resetModal.style.display = 'flex';
                logEvent('modal_open', { type: 'reset' });
            } else if (confirm('Reset changes?')) {
                // Fallback only if modal is missing
                performReset();
            }
        });
    }

    // Modal Actions
    if (btnCancelReset) {
        btnCancelReset.addEventListener('click', () => {
            if (resetModal) resetModal.style.display = 'none';
        });
    }

    if (btnConfirmReset) {
        btnConfirmReset.addEventListener('click', () => {
            performReset();
            if (resetModal) resetModal.style.display = 'none';
        });
    }

    // Close modal on outside click
    if (resetModal) {
        resetModal.addEventListener('click', (e) => {
            if (e.target === resetModal) resetModal.style.display = 'none';
        });
    }

    function performReset() {
        // Reload the original processed image
        editImage.src = originalProcessedUrl;
        editImage.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(editImage, 0, 0);

            // Clear history and add initial state
            history = [];
            historyStep = -1;
            saveState();
            logEvent('reset_edits');
            showToast('info', 'Reset', 'Manual changes have been reset.');
        };
    }

    // --- History Logic ---
    function saveState() {
        historyStep++;
        if (historyStep < history.length) {
            history.length = historyStep;
        }
        if (history.length > 20) {
            history.shift();
            historyStep--;
        }
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        updateHistoryButtons();
    }

    function updateHistoryButtons() {
        if (btnUndo) btnUndo.disabled = historyStep <= 0;
        if (btnRedo) btnRedo.disabled = historyStep >= history.length - 1;
    }

    function undo() {
        if (historyStep > 0) {
            historyStep--;
            ctx.putImageData(history[historyStep], 0, 0);
            updateHistoryButtons();
        }
    }

    function redo() {
        if (historyStep < history.length - 1) {
            historyStep++;
            ctx.putImageData(history[historyStep], 0, 0);
            updateHistoryButtons();
        }
    }

    // --- Drawing & Interaction Logic ---
    function getPointerPos(e) {
        const rect = canvasWrapper.getBoundingClientRect();
        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left - offsetX) / scale;
        const y = (clientY - rect.top - offsetY) / scale;

        return { x, y, clientX, clientY };
    }

    function updateBrushCursor(e) {
        if (!brushCursor) return;

        // Size on screen = brushSize * scale
        const visualSize = brushSize * scale;
        brushCursor.style.width = visualSize + 'px';
        brushCursor.style.height = visualSize + 'px';

        if (e && isEditing && !isPanning && (!e.touches || e.touches.length === 1)) {
            const rect = canvasWrapper.getBoundingClientRect();
            let clientX, clientY;

            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const relX = clientX - rect.left;
            const relY = clientY - rect.top;

            brushCursor.style.left = relX + 'px';
            brushCursor.style.top = relY + 'px';
            brushCursor.style.display = 'block';
        } else {
            brushCursor.style.display = 'none';
        }
    }

    if (canvasWrapper) {
        // Prevent context menu to allow Right-Click Pan
        canvasWrapper.addEventListener('contextmenu', (e) => e.preventDefault());

        // State for gestures
        let initialPinchDistance = null;
        let initialScale = null;

        const handleStart = (e) => {
            if (!isEditing) return;

            // Touch: Check for 2 fingers (Pan/Zoom)
            if (e.touches && e.touches.length === 2) {
                isPanning = true;
                isDrawing = false;

                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
                initialScale = scale;

                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                startPanX = centerX - offsetX;
                startPanY = centerY - offsetY;

                canvasWrapper.style.cursor = 'grabbing';
                brushCursor.style.display = 'none';
                return;
            }

            // Mouse: Right Click or Space+Left = Pan
            if (e.button === 2 || (e.button === 0 && e.getModifierState && e.getModifierState('Space'))) {
                isPanning = true;
                isDrawing = false;
                startPanX = e.clientX - offsetX;
                startPanY = e.clientY - offsetY;
                canvasWrapper.style.cursor = 'grabbing';
                brushCursor.style.display = 'none';
                return;
            }

            // Left Click / 1 Finger Touch = Draw
            if (e.button === 0 || (e.touches && e.touches.length === 1)) {
                isDrawing = true;
                isPanning = false;
                draw(e);
            }
        };

        const handleMove = (e) => {
            if (!isEditing) return;
            e.preventDefault();

            if (e.touches && e.touches.length === 2 && isPanning) {
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                offsetX = centerX - startPanX;
                offsetY = centerY - startPanY;

                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);

                if (initialPinchDistance > 0) {
                    const zoomFactor = currentDistance / initialPinchDistance;
                    const newScale = Math.min(Math.max(0.1, initialScale * zoomFactor), 5);
                    scale = newScale;
                }

                updateTransform();
                return;
            }

            if (isPanning && !e.touches) {
                offsetX = e.clientX - startPanX;
                offsetY = e.clientY - startPanY;
                updateTransform();
                return;
            }

            if (isDrawing) {
                draw(e);
            }

            if (!isPanning) {
                updateBrushCursor(e);
            }
        };

        const handleEnd = (e) => {
            if (isPanning) {
                if (e.touches && e.touches.length < 2) {
                    isPanning = false;
                    canvasWrapper.style.cursor = 'none';
                    initialPinchDistance = null;
                } else if (!e.touches) {
                    isPanning = false;
                    canvasWrapper.style.cursor = 'none';
                }
            }

            if (isDrawing) {
                isDrawing = false;
                saveState();
            }
        };

        // Event Listeners
        canvasWrapper.addEventListener('mousedown', handleStart);
        canvasWrapper.addEventListener('touchstart', handleStart, { passive: false });

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove, { passive: false });

        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchend', handleEnd);

        canvasWrapper.addEventListener('mouseleave', () => {
            if (!isPanning && !isDrawing) brushCursor.style.display = 'none';
        });
        canvasWrapper.addEventListener('mouseenter', (e) => {
            if (!isPanning && !isDrawing) updateBrushCursor(e);
        });

        canvasWrapper.addEventListener('wheel', (e) => {
            if (!isEditing) return;
            e.preventDefault();

            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const newScale = Math.min(Math.max(0.1, scale + delta), 5);

            const rect = canvasWrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const canvasX = (mouseX - offsetX) / scale;
            const canvasY = (mouseY - offsetY) / scale;

            scale = newScale;
            offsetX = mouseX - canvasX * scale;
            offsetY = mouseY - canvasY * scale;

            updateTransform();
            updateBrushCursor(e);
        }, { passive: false });
    }

    function draw(e) {
        if (!ctx) return;

        const pos = getPointerPos(e);
        const x = pos.x;
        const y = pos.y;

        // --- UPDATE: SOFTNESS LOGIC ---
        // We use a Radial Gradient to achieve feathering
        // Hardness 1.0 = Sharp Edge
        // Hardness 0.0 = Very Soft Edge

        const radius = brushSize / 2;

        // Create gradient from center (opaque) to edge (transparent)
        // brushHardness controls where the fade begins
        const innerRadius = radius * brushHardness;
        const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);

        // Configuration for the gradient opacity
        if (activeTool === 'erase') {
            // For Erasing: simple black gradient (alpha handles the erasing)
            gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Solid center
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent edge

            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = gradient;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over'; // Reset

        } else if (activeTool === 'restore') {
            // Restore is tricky with gradients. 
            // We use the gradient as a mask to draw the source image.

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);

            // 1. Clip to the circle area
            ctx.clip();

            // 2. We can't easily "feather" a restore using standard 2D canvas 
            // without complex offscreen masking. 
            // Current best fallback for Restore is simply drawing the image.
            // (True soft-restore requires compositing layers which is heavy for this script)

            ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        }
    }

    // --- Logging Helper ---
    function logEvent(message, context = {}) {
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level: 'info',
                message: message,
                context: context
            })
        }).catch(err => console.error("Log failed:", err));
    }

    // ============================================
    //  NEW UNIFIED TOAST NOTIFICATION SYSTEM
    // ============================================
    window.showToast = function (type, title, message) {
        // Ensure container exists
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        // Define icons based on type
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        const iconClass = icons[type] || icons.info;

        // Create Toast Element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Construct HTML
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${iconClass}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="toast-progress"></div>
        `;

        // Append to container
        container.appendChild(toast);

        // Trigger Animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto-Dismiss after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 400); // Wait for transition out
        }, 4000);
    };

    // Make it available globally in case other scripts need it
    window.showFlashMessage = function (msg, type) {
        // Compatibility wrapper for old calls
        let title = type === 'error' ? 'Error' : 'Notification';
        showToast(type || 'info', title, msg);
    };
});