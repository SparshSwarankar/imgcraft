document.addEventListener('DOMContentLoaded', () => {
    console.log("Studio Script Loaded v4");

    // --- Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const collageWrapper = document.getElementById('collageWrapper');
    const collagePreview = document.getElementById('collagePreview');
    const scanOverlay = document.getElementById('scanOverlay');
    const layoutPlaceholder = document.getElementById('layoutPlaceholder');

    // Left Panel
    const imageGrid = document.getElementById('imageGrid');
    const layoutGrid = document.getElementById('layoutGrid');
    const layoutControls = document.getElementById('layoutControls');
    const imageCountSelector = document.getElementById('imageCountSelector');
    const selectedLayoutInput = document.getElementById('selectedLayoutInput');
    const imageCountBadge = document.getElementById('imageCountBadge');

    // Right Panel
    const customizeControls = document.getElementById('customizeControls');
    const styleControls = document.getElementById('styleControls');
    const startInfo = document.getElementById('startInfo');

    // Sliders & Inputs
    const spacingSlider = document.getElementById('spacingSlider');
    const spacingValue = document.getElementById('spacingValue');
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusValue = document.getElementById('radiusValue');
    const backgroundSelect = document.getElementById('backgroundSelect');
    const filterSelect = document.getElementById('filterSelect');

    // Action Buttons
    const generateBtn = document.getElementById('generateBtn');
    const regenerateBtn = document.getElementById('regenerateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadArea = document.getElementById('downloadArea');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');

    // State
    let uploadedFiles = [];
    let state = {
        layoutId: null,
        spacing: 10,
        cornerRadius: 0,
        background: 'transparent',
        filter: 'none',
        isGenerated: false
    };

    // --- Layout Definitions ---
    const LAYOUT_DEFINITIONS = {
        2: [
            { id: 'layout_2_v', name: 'Vertical Split', css: '1fr / 1fr 1fr', cells: 2 },
            { id: 'layout_2_h', name: 'Horizontal Split', css: '1fr 1fr / 1fr', cells: 2 },
        ],
        3: [
            { id: 'layout_3_cols', name: 'Columns', css: '1fr / 1fr 1fr 1fr', cells: 3 },
            { id: 'layout_3_rows', name: 'Rows', css: '1fr 1fr 1fr / 1fr', cells: 3 },
            { id: 'layout_3_grid', name: 'Grid', css: '1fr 1fr / 2fr 1fr', cells: 3 }
        ],
        4: [
            { id: 'layout_4_grid', name: '2x2 Grid', css: '1fr 1fr / 1fr 1fr', cells: 4 },
            { id: 'layout_4_cols', name: 'Columns', css: '1fr / 1fr 1fr 1fr 1fr', cells: 4 }
        ],
        5: [
            { id: 'layout_5_grid', name: 'Grid', css: '1fr 1fr / 1fr 1fr 1fr', cells: 6 },
            { id: 'layout_5_mosaic', name: 'Mosaic', css: '1fr 1fr / 1fr 1fr', cells: 5 }
        ],
        6: [
            { id: 'layout_6_grid', name: '2x3 Grid', css: '1fr 1fr / 1fr 1fr 1fr', cells: 6 },
            { id: 'layout_6_rows', name: '3x2 Grid', css: '1fr 1fr 1fr / 1fr 1fr', cells: 6 }
        ]
    };

    // --- File Upload Handling ---
    if (dropZone) {
        dropZone.addEventListener('click', (e) => {
            if (e.target === dropZone || e.target.closest('.upload-content')) {
                fileInput && fileInput.click();
            }
        });
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
    }

    if (fileInput) fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
        const fileArray = Array.from(files);
        const totalFiles = uploadedFiles.length + fileArray.length;

        if (totalFiles > 6) {
            showToast('Max 6 images allowed. Truncating selection.', 'warning');
            const slotsLeft = 6 - uploadedFiles.length;
            if (slotsLeft > 0) {
                uploadedFiles = [...uploadedFiles, ...fileArray.slice(0, slotsLeft)];
            }
        } else {
            uploadedFiles = [...uploadedFiles, ...fileArray];
        }

        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        uploadedFiles = uploadedFiles.filter(f => validTypes.includes(f.type));

        if (uploadedFiles.length > 0) {
            updateUIForUpload();
        }
    }

    function updateUIForUpload() {
        if (dropZone) dropZone.style.display = 'none';
        if (previewContainer) previewContainer.style.display = 'flex';

        if (layoutControls) layoutControls.style.display = 'block';
        if (customizeControls) customizeControls.style.display = 'block';
        if (startInfo) startInfo.style.display = 'none';

        if (generateBtn) {
            generateBtn.disabled = false;
            if (!state.isGenerated) {
                generateBtn.classList.add('btn-glow');
            }
        }

        renderSidebarImages();
        renderLayoutSelector(uploadedFiles.length);

        if (imageCountBadge) imageCountBadge.textContent = uploadedFiles.length;

        if (!state.isGenerated) {
            if (layoutPlaceholder) layoutPlaceholder.style.display = 'block';
            if (collageWrapper) collageWrapper.style.display = 'none';
        }
    }

    function renderSidebarImages() {
        if (!imageGrid) return;
        imageGrid.innerHTML = '';

        uploadedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const row = document.createElement('div');
                row.className = 'image-preview-row';
                row.innerHTML = `
                    <img src="${e.target.result}" class="mini-thumb">
                    <div class="row-info" title="${file.name}">
                        ${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}
                    </div>
                    <button class="btn-remove-row" onclick="removeImage(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                imageGrid.appendChild(row);
            };
            reader.readAsDataURL(file);
        });
    }

    window.removeImage = (index) => {
        uploadedFiles.splice(index, 1);
        if (uploadedFiles.length === 0) {
            resetToUpload();
        } else {
            updateUIForUpload();
            if (state.isGenerated) {
                state.isGenerated = false;
                layoutPlaceholder.style.display = 'block';
                collageWrapper.style.display = 'none';
                downloadArea.style.display = 'none';
                generateBtn.style.display = 'block';
            }
        }
    };

    function renderLayoutSelector(count) {
        const safeCount = Math.max(2, Math.min(count, 6));
        if (imageCountSelector) {
            imageCountSelector.innerHTML = '';
            const pill = document.createElement('div');
            pill.className = 'count-pill active';
            pill.textContent = safeCount;
            imageCountSelector.appendChild(pill);
        }
        renderLayoutOptions(safeCount);
    }

    function renderLayoutOptions(count) {
        if (!layoutGrid) return;
        layoutGrid.innerHTML = '';
        const templates = LAYOUT_DEFINITIONS[count] || LAYOUT_DEFINITIONS[2];

        templates.forEach(layout => {
            const thumb = document.createElement('div');
            thumb.className = `layout-thumb ${state.layoutId === layout.id ? 'selected' : ''}`;
            thumb.title = layout.name;
            thumb.onclick = () => selectLayout(layout.id, thumb);

            const wireframe = document.createElement('div');
            wireframe.className = 'wireframe-box';
            if (layout.css) wireframe.style.gridTemplate = layout.css;

            const cellCount = layout.cells || count;
            for (let i = 0; i < cellCount; i++) {
                const cell = document.createElement('div');
                cell.className = 'wf-cell';
                wireframe.appendChild(cell);
            }

            thumb.appendChild(wireframe);
            layoutGrid.appendChild(thumb);
        });
    }

    function selectLayout(id, element) {
        state.layoutId = id;
        selectedLayoutInput.value = id;
        document.querySelectorAll('.layout-thumb').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        if (layoutPlaceholder) layoutPlaceholder.style.display = 'none';
        if (state.isGenerated) {
            updateCollage(false);
        }
    }

    function setupSliders() {
        if (spacingSlider) {
            spacingSlider.addEventListener('input', (e) => {
                spacingValue.textContent = e.target.value;
                state.spacing = e.target.value;
            });
            spacingSlider.addEventListener('change', () => { if (state.isGenerated) updateCollage(false); });
        }
        if (radiusSlider) {
            radiusSlider.addEventListener('input', (e) => {
                radiusValue.textContent = e.target.value;
                state.cornerRadius = e.target.value;
            });
            radiusSlider.addEventListener('change', () => { if (state.isGenerated) updateCollage(false); });
        }
    }
    setupSliders();

    function applyCSSFilter(filter) {
        let css = 'none';
        if (filter === 'warm') css = 'sepia(0.2) saturate(1.2)';
        if (filter === 'cool') css = 'hue-rotate(10deg) contrast(0.9)';
        if (filter === 'vintage') css = 'sepia(0.4) contrast(1.1)';
        if (filter === 'bw') css = 'grayscale(1)';
        collagePreview.style.filter = css;
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            if (!state.layoutId) {
                showToast('Please select a layout from the left panel', 'error');
                layoutGrid.parentElement.style.animation = 'pulse 0.5s ease';
                setTimeout(() => layoutGrid.parentElement.style.animation = '', 500);
                return;
            }
            updateCollage(true);
        });
    }

    if (regenerateBtn) regenerateBtn.addEventListener('click', () => updateCollage(true));

    // Loading Animation for Download Button
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function (e) {
            // Visual feedback only (browser handles actual download via href)
            const btn = this;
            if (btn.classList.contains('btn-loading')) return;

            // Add loading class
            btn.classList.add('btn-loading');

            // Remove after 3 seconds (simulating download start)
            setTimeout(() => {
                btn.classList.remove('btn-loading');
                showToast('Download started!', 'success');
            }, 3000);
        });
    }

    function updateCollage(isRegeneration) {
        if (uploadedFiles.length === 0) return;

        // Use unified loading UI
        if (window.ImgCraftBusyUI) {
            const message = isRegeneration ? 'Regenerating Collage...' : 'Creating Collage...';
            window.ImgCraftBusyUI.showLoading(message);
        }

        if (progressContainer) progressContainer.style.display = 'block';
        if (scanOverlay) scanOverlay.classList.add('active');
        if (collageWrapper) collageWrapper.style.display = 'block';

        const formData = new FormData();
        uploadedFiles.forEach((file, i) => formData.append(`image${i + 1}`, file));
        formData.append('layout', state.layoutId);
        formData.append('spacing', state.spacing);
        formData.append('corner_radius', state.cornerRadius);
        formData.append('background', state.background);
        formData.append('filter', state.filter); // Important: Send filter to backend
        formData.append('shuffle', isRegeneration ? 'true' : 'false');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/collage', true);
        xhr.responseType = 'blob';

        const interval = setInterval(() => {
            if (progressBar && progressBar.style.width !== '90%') progressBar.style.width = '90%';
        }, 200);

        if (window.AuthManager) {
            const headers = AuthManager.getAuthHeaders();
            if (headers.Authorization) xhr.setRequestHeader('Authorization', headers.Authorization);
        }

        xhr.onload = () => {
            clearInterval(interval);
            if (progressBar) progressBar.style.width = '100%';

            if (xhr.status === 200) {
                // Update loading text
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.setLoadingText('Preparing Download...');
                }

                const url = URL.createObjectURL(xhr.response);

                // --- NEW: Get Cost from Header ---
                const cost = xhr.getResponseHeader('X-Credits-Cost');
                // ---------------------------------

                collagePreview.onload = () => {
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (scanOverlay) scanOverlay.classList.remove('active');
                    collagePreview.style.opacity = '1';
                };
                collagePreview.src = url;

                if (layoutPlaceholder) layoutPlaceholder.style.display = 'none';
                if (generateBtn) generateBtn.style.display = 'none';
                if (downloadArea) downloadArea.style.display = 'block';

                if (downloadBtn) {
                    downloadBtn.href = url;
                    downloadBtn.download = `collage-${state.layoutId}.png`;
                }

                state.isGenerated = true;

                // --- UPDATED: Show Cost in Toast ---
                let msg = 'Collage ready!';
                if (isRegeneration) msg = 'Collage updated!';

                if (cost) {
                    msg += ` (-${cost} Credits)`;
                }

                showToast(msg, 'success');
                // -----------------------------------

                if (window.CreditManager) CreditManager.refreshCredits();

                // Hide unified loading UI
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.hideLoading();
                }

            } else {
                if (progressContainer) progressContainer.style.display = 'none';
                if (scanOverlay) scanOverlay.classList.remove('active');

                const blob = xhr.response;
                if (blob && blob.type === 'application/json') {
                    const reader = new FileReader();
                    reader.onload = () => {
                        let message = 'Collage generation failed.';
                        try {
                            const parsed = JSON.parse(reader.result);
                            if (parsed?.error) {
                                message = parsed.error;
                                if (parsed?.request_id) {
                                    message += ` (Request ID: ${parsed.request_id})`;
                                }
                            }
                        } catch (err) {
                            console.warn('Failed to parse collage error', err);
                        }
                        showToast(message, 'error');
                        // Hide unified loading UI
                        if (window.ImgCraftBusyUI) {
                            window.ImgCraftBusyUI.hideLoading();
                        }
                    };
                    reader.onerror = () => {
                        showToast('Collage generation failed.', 'error');
                        // Hide unified loading UI
                        if (window.ImgCraftBusyUI) {
                            window.ImgCraftBusyUI.hideLoading();
                        }
                    };
                    reader.readAsText(blob);
                } else {
                    showToast('Collage generation failed.', 'error');
                    // Hide unified loading UI
                    if (window.ImgCraftBusyUI) {
                        window.ImgCraftBusyUI.hideLoading();
                    }
                }
            }
        };
        xhr.onerror = () => {
            clearInterval(interval);
            if (progressContainer) progressContainer.style.display = 'none';
            if (scanOverlay) scanOverlay.classList.remove('active');
            showToast('Network error', 'error');
            // Hide unified loading UI
            if (window.ImgCraftBusyUI) {
                window.ImgCraftBusyUI.hideLoading();
            }
        };
        xhr.send(formData);
    }

    function resetToUpload() {
        uploadedFiles = [];
        state.isGenerated = false;
        state.layoutId = null;
        if (imageCountBadge) imageCountBadge.textContent = '0';
        if (dropZone) dropZone.style.display = 'block';
        if (previewContainer) previewContainer.style.display = 'none';
        if (layoutControls) layoutControls.style.display = 'none';
        if (customizeControls) customizeControls.style.display = 'none';
        if (startInfo) startInfo.style.display = 'block';
        if (generateBtn) {
            generateBtn.style.display = 'block';
            generateBtn.disabled = true;
            generateBtn.classList.remove('btn-glow');
        }
        if (downloadArea) downloadArea.style.display = 'none';
    }

    // --- Custom Dropdown Setup ---
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
                    triggerSpan.textContent = option.textContent;
                    const value = option.getAttribute('data-value');
                    hiddenInput.value = value;
                    dropdown.classList.remove('open');

                    if (hiddenInput.id === 'backgroundSelect') state.background = value;
                    if (hiddenInput.id === 'filterSelect') {
                        state.filter = value;
                        if (typeof applyCSSFilter === 'function' && document.getElementById('collagePreview')) {
                            applyCSSFilter(value);
                        }
                    }
                    if (state.isGenerated) updateCollage(false);
                });
            });
        });
        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select').forEach(d => d.classList.remove('open'));
        });
    }
    setupCustomDropdowns();

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});