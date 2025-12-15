document.addEventListener('DOMContentLoaded', () => {
    console.log("Annotation Studio Loaded");

    const AnnotationStudio = {
        // --- Core Configuration ---
        canvas: null,
        currentFile: null,
        originalImage: null,
        imageScale: 1, // Ratio between canvas size and actual image size

        // --- State ---
        mode: 'select', // select, rect, polygon, point
        isDrawing: false,
        isPanning: false,
        activeObject: null,

        // Polygon Specifics
        polyPoints: [],
        activeLine: null,
        activeShape: false,

        // Annotations Data
        annotations: [],
        nextId: 1,

        // --- DOM Elements Cache ---
        ui: {
            dropZone: document.getElementById('dropZone'),
            fileInput: document.getElementById('fileInput'),
            editorStage: document.getElementById('editorStage'),
            canvasWrapper: document.getElementById('canvasWrapper'),

            // Left Panel
            fileInfoSection: document.getElementById('fileInfoSection'),
            startInfoLeft: document.getElementById('startInfoLeft'),
            fileName: document.getElementById('fileName'),
            fileSize: document.getElementById('fileSize'),
            fileDim: document.getElementById('fileDimensions'),

            // Right Panel
            dataSection: document.getElementById('dataSection'),
            startInfoRight: document.getElementById('startInfoRight'),
            annotationsList: document.getElementById('annotationsList'),
            objectCount: document.getElementById('objectCount'),
            emptyListMsg: document.getElementById('emptyListMsg'),
            exportActions: document.getElementById('exportActions'),
            dummyExport: document.getElementById('dummyExportBtn'),

            // Tools
            btnSelect: document.getElementById('selectTool'),
            btnRect: document.getElementById('rectTool'),
            btnPoly: document.getElementById('polygonTool'),
            btnPoint: document.getElementById('pointTool'),

            // Canvas Controls
            btnZoomIn: document.getElementById('zoomInBtn'),
            btnZoomOut: document.getElementById('zoomOutBtn'),
            btnResetView: document.getElementById('resetViewBtn'),
            btnPan: document.getElementById('panTool'),
            zoomLevelDisplay: document.getElementById('zoomLevel'),

            // Properties
            activeProps: document.getElementById('activeProps'),
            activeLabel: document.getElementById('activeLabel'),
            activeColor: document.getElementById('activeColor'),
            activeHex: document.getElementById('colorHex'),
            btnDeleteActive: document.getElementById('deleteActiveBtn'),

            // Export
            btnExportJson: document.getElementById('exportJsonBtn'),
            btnExportImage: document.getElementById('exportImageBtn'),
            btnClear: document.getElementById('clearAllBtn'),

            // Metadata
            metaTitle: document.getElementById('metaTitle'),
            metaTags: document.getElementById('metaTags'),
        },

        // ============================================================
        // INITIALIZATION
        // ============================================================
        init() {
            console.log('Initializing Annotation Studio');
            if (typeof fabric === 'undefined') {
                console.error('Fabric.js not loaded!');
                return;
            }
            this.bindEvents();
            this.setupFabricDefaults();
        },

        setupFabricDefaults() {
            fabric.Object.prototype.transparentCorners = false;
            fabric.Object.prototype.cornerColor = '#ffffff';
            fabric.Object.prototype.cornerStrokeColor = '#000000';
            fabric.Object.prototype.borderColor = '#000000';
            fabric.Object.prototype.cornerSize = 8;
            fabric.Object.prototype.padding = 5;
            fabric.Object.prototype.borderDashArray = [4, 4];
        },

        // ============================================================
        // FILE HANDLING
        // ============================================================
        bindEvents() {
            // Upload
            this.ui.dropZone.addEventListener('click', () => this.ui.fileInput.click());
            this.ui.fileInput.addEventListener('change', (e) => this.handleUpload(e.target.files[0]));

            // Drag & Drop
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
                this.ui.dropZone.addEventListener(e, (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                });
            });
            this.ui.dropZone.addEventListener('drop', (e) => this.handleUpload(e.dataTransfer.files[0]));

            // Toolbar
            this.ui.btnSelect.addEventListener('click', () => this.setMode('select'));
            this.ui.btnRect.addEventListener('click', () => this.setMode('rect'));
            this.ui.btnPoly.addEventListener('click', () => this.setMode('polygon'));
            this.ui.btnPoint.addEventListener('click', () => this.setMode('point'));

            // Properties
            this.ui.activeLabel.addEventListener('input', (e) => this.updateActiveObject('label', e.target.value));
            this.ui.activeColor.addEventListener('input', (e) => {
                this.ui.activeHex.textContent = e.target.value;
                this.updateActiveObject('color', e.target.value);
            });
            this.ui.btnDeleteActive.addEventListener('click', () => this.deleteActiveObject());

            // Canvas Navigation
            this.ui.btnZoomIn.addEventListener('click', () => this.zoom(1.1));
            this.ui.btnZoomOut.addEventListener('click', () => this.zoom(0.9));
            this.ui.btnResetView.addEventListener('click', () => this.resetViewport());
            this.ui.btnPan.addEventListener('click', () => this.togglePan());

            // Export
            this.ui.btnExportJson.addEventListener('click', () => this.exportJSON());
            this.ui.btnExportImage.addEventListener('click', () => this.exportImage());
            this.ui.btnClear.addEventListener('click', () => this.showClearAllModal());

            // Keyboard Shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') this.deleteActiveObject();
                if (e.key === ' ' && !this.isPanning) {
                    this.togglePan(true); // Hold space to pan
                }
            });
            document.addEventListener('keyup', (e) => {
                if (e.key === ' ' && this.isPanning) {
                    this.togglePan(false);
                }
            });
        },

        async handleUpload(file) {
            console.log('handleUpload called with file:', file);
            if (!file || !file.type.startsWith('image/')) {
                showToast('Invalid file type. Please upload an image.', 'error');
                return;
            }

            // --- Auth Check ONLY (No credit deduction on upload) ---
            if (window.AuthManager && !AuthManager.user) {
                showToast('Login required to use this tool', 'error');
                setTimeout(() => window.location.href = '/auth', 1500);
                return;
            }

            this.currentFile = file;
            console.log('File accepted, reading...');

            // Update UI Info
            this.ui.fileName.textContent = file.name.length > 20 ? file.name.substring(0, 15) + '...' : file.name;
            this.ui.fileSize.textContent = this.formatBytes(file.size);

            const reader = new FileReader();
            reader.onload = (f) => {
                console.log('File read complete, creating image');
                const img = new Image();
                img.onload = () => {
                    console.log('Image loaded successfully:', img.width, 'x', img.height);
                    this.originalImage = img;
                    this.ui.fileDim.textContent = `${img.width} x ${img.height}`;

                    this.initCanvas(img);
                    this.switchViewToEditor();
                    showToast('Image loaded successfully', 'success');
                };
                img.onerror = (e) => {
                    console.error('Image load error:', e);
                    showToast('Failed to load image', 'error');
                };
                img.src = f.target.result;
            };
            reader.onerror = (e) => {
                console.error('FileReader error:', e);
                showToast('Failed to read file', 'error');
            };
            reader.readAsDataURL(file);
        },

        switchViewToEditor() {
            this.ui.dropZone.style.display = 'none';
            this.ui.editorStage.style.display = 'flex';

            this.ui.startInfoLeft.style.display = 'none';
            this.ui.fileInfoSection.style.display = 'block';

            this.ui.startInfoRight.style.display = 'none';
            this.ui.dataSection.style.display = 'block';
            this.ui.dummyExport.style.display = 'none';
            this.ui.exportActions.style.display = 'block';
        },

        // ============================================================
        // CANVAS LOGIC (FABRIC.JS)
        // ============================================================
        initCanvas(imgElement) {
            console.log('Initializing canvas with image:', imgElement.width, 'x', imgElement.height);
            
            // Dispose existing if any
            if (this.canvas) {
                this.canvas.dispose();
            }

            // Get wrapper dimensions - use parent if wrapper is 0
            const wrapper = this.ui.canvasWrapper;
            let containerW = wrapper.clientWidth;
            let containerH = wrapper.clientHeight;

            // Fallback: use studio-canvas dimensions if wrapper is 0
            if (containerW === 0 || containerH === 0) {
                const studioCanvas = document.querySelector('.studio-canvas');
                containerW = studioCanvas.clientWidth - 40; // padding
                containerH = studioCanvas.clientHeight - 40;
            }

            console.log('Canvas container size:', containerW, 'x', containerH);

            // Create Canvas with explicit dimensions
            this.canvas = new fabric.Canvas('c', {
                width: containerW,
                height: containerH,
                selection: true,
                preserveObjectStacking: true,
                backgroundColor: '#2a2a2a'
            });

            // Calculate scale to fit image in canvas
            const scaleX = containerW / imgElement.width;
            const scaleY = containerH / imgElement.height;
            this.imageScale = Math.min(scaleX, scaleY) * 0.9; // 90% fit with margin

            console.log('Image scale:', this.imageScale);

            // Set Background Image using setBackgroundImage for better rendering
            this.canvas.setBackgroundImage(imgElement.src, this.canvas.renderAll.bind(this.canvas), {
                scaleX: this.imageScale,
                scaleY: this.imageScale,
                originX: 'center',
                originY: 'center',
                left: containerW / 2,
                top: containerH / 2
            });

            // Attach Events
            this.attachCanvasEvents();
            this.canvas.renderAll();
            
            console.log('Canvas initialized successfully');
        },

        attachCanvasEvents() {
            this.canvas.on('mouse:down', (o) => this.onMouseDown(o));
            this.canvas.on('mouse:move', (o) => this.onMouseMove(o));
            this.canvas.on('mouse:up', (o) => this.onMouseUp(o));
            this.canvas.on('mouse:wheel', (o) => this.onZoom(o));

            // Selection events
            this.canvas.on('selection:created', (e) => this.onObjectSelected(e.selected[0]));
            this.canvas.on('selection:updated', (e) => this.onObjectSelected(e.selected[0]));
            this.canvas.on('selection:cleared', () => this.onSelectionCleared());

            // Polygon specific
            this.canvas.on('mouse:dblclick', () => {
                if (this.mode === 'polygon') this.finishPolygon();
            });
        },

        // --- Interaction Handlers ---

        onMouseDown(opt) {
            const pointer = this.canvas.getPointer(opt.e);

            // Pan Mode
            if (this.isPanning || (opt.e.altKey === true)) {
                this.canvas.isDragging = true;
                this.canvas.lastPosX = opt.e.clientX;
                this.canvas.lastPosY = opt.e.clientY;
                return;
            }

            // Drawing Modes
            if (this.mode === 'select') return;

            this.isDrawing = true;
            this.origX = pointer.x;
            this.origY = pointer.y;

            if (this.mode === 'rect') {
                const rect = new fabric.Rect({
                    left: this.origX,
                    top: this.origY,
                    originX: 'left',
                    originY: 'top',
                    width: pointer.x - this.origX,
                    height: pointer.y - this.origY,
                    angle: 0,
                    fill: 'rgba(249, 115, 22, 0.2)', // Primary with opacity
                    stroke: '#F97316',
                    strokeWidth: 2 / this.canvas.getZoom(), // Consistent stroke width
                    transparentCorners: false,
                    id: this.generateId()
                });
                this.canvas.add(rect);
                this.activeObject = rect;
            }
            else if (this.mode === 'point') {
                const point = new fabric.Circle({
                    left: pointer.x,
                    top: pointer.y,
                    radius: 5 / this.canvas.getZoom(),
                    fill: '#F97316',
                    stroke: '#fff',
                    strokeWidth: 2 / this.canvas.getZoom(),
                    originX: 'center',
                    originY: 'center',
                    id: this.generateId(),
                    type: 'point' // Custom type tag
                });
                this.canvas.add(point);
                this.addAnnotationToList(point, 'Point');
                this.isDrawing = false; // Point is instant
            }
            else if (this.mode === 'polygon') {
                const pointer = this.canvas.getPointer(opt.e);
                
                if (!this.activeShape) {
                    // Start new polygon
                    this.polyPoints = [{ x: pointer.x, y: pointer.y }];
                    const polygon = new fabric.Polygon(this.polyPoints, {
                        stroke: '#F97316',
                        strokeWidth: 2 / this.canvas.getZoom(),
                        fill: 'rgba(249, 115, 22, 0.2)',
                        opacity: 1,
                        selectable: false,
                        objectCaching: false,
                        id: this.generateId()
                    });
                    this.activeShape = polygon;
                    this.canvas.add(polygon);
                } else {
                    // Add point to existing polygon
                    this.polyPoints.push({ x: pointer.x, y: pointer.y });
                    this.activeShape.set({ points: this.polyPoints });
                    this.canvas.renderAll();
                }
            }
        },

        onMouseMove(opt) {
            // Panning
            if (this.canvas.isDragging) {
                const e = opt.e;
                const vpt = this.canvas.viewportTransform;
                vpt[4] += e.clientX - this.canvas.lastPosX;
                vpt[5] += e.clientY - this.canvas.lastPosY;
                this.canvas.requestRenderAll();
                this.canvas.lastPosX = e.clientX;
                this.canvas.lastPosY = e.clientY;
                return;
            }

            if (!this.isDrawing) return;
            const pointer = this.canvas.getPointer(opt.e);

            if (this.mode === 'rect') {
                if (this.origX > pointer.x) {
                    this.activeObject.set({ left: Math.abs(pointer.x) });
                }
                if (this.origY > pointer.y) {
                    this.activeObject.set({ top: Math.abs(pointer.y) });
                }
                this.activeObject.set({ width: Math.abs(this.origX - pointer.x) });
                this.activeObject.set({ height: Math.abs(this.origY - pointer.y) });
                this.canvas.renderAll();
            }
            else if (this.mode === 'polygon' && this.activeShape) {
                // Visualize line to current mouse pos
                // (Advanced feature, simplified here for robustness)
            }
        },

        onMouseUp(opt) {
            this.canvas.isDragging = false;

            if (this.mode === 'rect' && this.isDrawing) {
                this.isDrawing = false;
                this.activeObject.setCoords();

                // Ignore tiny accidental clicks
                if (this.activeObject.width < 5 || this.activeObject.height < 5) {
                    this.canvas.remove(this.activeObject);
                } else {
                    this.addAnnotationToList(this.activeObject, 'Rectangle');
                    // Auto-select
                    this.canvas.setActiveObject(this.activeObject);
                }
            }
            // Note: Polygon is handled in onMouseDown, not here
        },

        finishPolygon() {
            if (!this.activeShape) {
                console.log('No active polygon to finish');
                return;
            }

            console.log('Finishing polygon with ID:', this.activeShape.id);

            // Close the polygon and make it selectable
            this.activeShape.set({
                selectable: true
            });
            
            this.addAnnotationToList(this.activeShape, 'Polygon');

            // Reset state
            this.activeShape = null;
            this.polyPoints = [];
            this.isDrawing = false;
            this.setMode('select'); // Auto switch back
            
            console.log('Polygon finished and added to list');
        },

        onZoom(opt) {
            const delta = opt.e.deltaY;
            let zoom = this.canvas.getZoom();
            zoom *= 0.999 ** delta;
            if (zoom > 10) zoom = 10;
            if (zoom < 0.1) zoom = 0.1;

            this.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
            opt.e.preventDefault();
            opt.e.stopPropagation();

            this.ui.zoomLevelDisplay.textContent = Math.round(zoom * 100) + '%';
        },

        // ============================================================
        // ANNOTATION MANAGEMENT
        // ============================================================
        addAnnotationToList(fabricObj, defaultLabel) {
            const id = fabricObj.id;
            const label = defaultLabel || `Obj ${id}`;
            const color = fabricObj.stroke || fabricObj.fill;

            // Attach metadata to fabric object
            fabricObj.meta = { label: label, id: id };

            // Create DOM Element
            const item = document.createElement('div');
            item.className = 'anno-item';
            item.id = `list-item-${id}`;
            item.innerHTML = `
                <span class="color-dot" style="background:${color}"></span>
                <span class="anno-name">${label}</span>
                <button class="del-btn" onclick="event.stopPropagation();">&times;</button>
            `;

            // Click Handler (Select on Canvas)
            item.addEventListener('click', () => {
                this.setMode('select');
                this.canvas.setActiveObject(fabricObj);
                this.canvas.renderAll();
            });

            // Delete Handler
            item.querySelector('.del-btn').addEventListener('click', () => {
                this.canvas.remove(fabricObj);
                item.remove();
                this.updateCount();
            });

            this.ui.annotationsList.appendChild(item);
            this.ui.emptyListMsg.style.display = 'none';
            this.updateCount();
        },

        updateCount() {
            const count = this.ui.annotationsList.children.length;
            this.ui.objectCount.textContent = `${count} Objects`;
            if (count === 0) this.ui.emptyListMsg.style.display = 'block';
        },

        onObjectSelected(obj) {
            if (!obj) return;
            this.ui.activeProps.style.display = 'block';

            // Populate Props
            this.ui.activeLabel.value = obj.meta ? obj.meta.label : '';
            this.ui.activeColor.value = obj.stroke || obj.fill;
            this.ui.activeHex.textContent = obj.stroke || obj.fill;

            // Highlight List Item
            document.querySelectorAll('.anno-item').forEach(el => el.classList.remove('selected'));
            const listItem = document.getElementById(`list-item-${obj.id}`);
            if (listItem) listItem.classList.add('selected');
        },

        onSelectionCleared() {
            this.ui.activeProps.style.display = 'none';
            document.querySelectorAll('.anno-item').forEach(el => el.classList.remove('selected'));
        },

        updateActiveObject(prop, value) {
            const obj = this.canvas.getActiveObject();
            if (!obj) return;

            if (prop === 'color') {
                obj.set('stroke', value);
                if (obj.type !== 'point') obj.set('fill', value + '33'); // Add alpha for fill
                else obj.set('fill', value);

                // Update List Dot
                const listItem = document.getElementById(`list-item-${obj.id}`);
                if (listItem) listItem.querySelector('.color-dot').style.background = value;
            }
            else if (prop === 'label') {
                obj.meta.label = value;
                // Update List Name
                const listItem = document.getElementById(`list-item-${obj.id}`);
                if (listItem) listItem.querySelector('.anno-name').textContent = value;
            }
            this.canvas.requestRenderAll();
        },

        deleteActiveObject() {
            const obj = this.canvas.getActiveObject();
            if (obj) {
                const listItem = document.getElementById(`list-item-${obj.id}`);
                if (listItem) listItem.remove();
                this.canvas.remove(obj);
                this.canvas.discardActiveObject();
                this.updateCount();
            }
        },

        clearAll() {
            // Remove everything except background image (index 0)
            const objects = this.canvas.getObjects();
            // Filter objects that are annotations (have ids)
            const toRemove = objects.filter(o => o.id);

            toRemove.forEach(o => this.canvas.remove(o));
            this.ui.annotationsList.innerHTML = '';
            this.updateCount();
        },

        showClearAllModal() {
            const count = this.ui.annotationsList.children.length;
            if (count === 0) {
                showToast('No annotations to clear', 'info');
                return;
            }

            // Ensure modal is ready
            const showModal = () => {
                if (window.showConfirmModal) {
                    window.showConfirmModal(
                        'Clear All Annotations?',
                        `Are you sure you want to delete all ${count} annotation${count > 1 ? 's' : ''}? This action cannot be undone.`,
                        () => {
                            this.clearAll();
                            showToast('All annotations cleared', 'success');
                        },
                        () => {
                            // Cancel - do nothing
                        }
                    );
                } else {
                    // Fallback to confirm
                    if (confirm(`Clear all ${count} annotations? This cannot be undone.`)) {
                        this.clearAll();
                        showToast('All annotations cleared', 'success');
                    }
                }
            };

            // Small delay to ensure modal.js is loaded
            if (!window.showConfirmModal) {
                setTimeout(showModal, 100);
            } else {
                showModal();
            }
        },

        // ============================================================
        // TOOLS & UTILS
        // ============================================================
        setMode(mode) {
            this.mode = mode;

            // UI Toggle
            [this.ui.btnSelect, this.ui.btnRect, this.ui.btnPoly, this.ui.btnPoint].forEach(b => b.classList.remove('active'));

            if (mode === 'select') {
                this.ui.btnSelect.classList.add('active');
                this.canvas.selection = true;
                this.canvas.defaultCursor = 'default';
                this.canvas.getObjects().forEach(o => o.set('selectable', true));
            } else {
                this.canvas.discardActiveObject();
                this.canvas.requestRenderAll();
                this.canvas.selection = false;
                this.canvas.defaultCursor = 'crosshair';
                this.canvas.getObjects().forEach(o => o.set('selectable', false));

                if (mode === 'rect') this.ui.btnRect.classList.add('active');
                if (mode === 'polygon') this.ui.btnPoly.classList.add('active');
                if (mode === 'point') this.ui.btnPoint.classList.add('active');
            }
        },

        togglePan(forceState) {
            if (typeof forceState !== 'undefined') this.isPanning = forceState;
            else this.isPanning = !this.isPanning;

            if (this.isPanning) {
                this.ui.btnPan.classList.add('active');
                this.canvas.defaultCursor = 'grab';
                this.canvas.selection = false;
            } else {
                this.ui.btnPan.classList.remove('active');
                this.setMode(this.mode); // Restore cursor
            }
        },

        resetViewport() {
            if (!this.canvas) return;
            this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

            // Re-center logic
            // (Simplified: Just zoom to 1 and center)
            const wrapper = this.ui.canvasWrapper;
            const bg = this.canvas.backgroundImage;
            if (bg) {
                // Logic to re-fit if needed, currently resets to 1:1 map
            }
            this.ui.zoomLevelDisplay.textContent = '100%';
        },

        zoom(factor) {
            if (!this.canvas) return;
            let zoom = this.canvas.getZoom();
            zoom *= factor;
            this.canvas.setZoom(zoom);
            this.ui.zoomLevelDisplay.textContent = Math.round(zoom * 100) + '%';
        },

        generateId() {
            return this.nextId++;
        },

        formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // ============================================================
        // EXPORT
        // ============================================================
        async exportJSON() {
            // Auth & Credit Check
            if (window.AuthManager && !AuthManager.user) {
                showToast('Login required', 'error');
                return;
            }

            if (window.CreditManager && !CreditManager.hasCredits(15)) {
                showToast('Insufficient credits (15 required)', 'error');
                return;
            }

            // Deduct credits via backend
            try {
                const headers = window.AuthManager.getAuthHeaders();
                const response = await fetch('/api/annotation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    body: JSON.stringify({ export_type: 'json' })
                });

                const result = await response.json();
                
                if (!response.ok || !result.success) {
                    showToast(result.error || 'Failed to deduct credits', 'error');
                    return;
                }

                // Refresh credit display
                if (window.CreditManager) CreditManager.refreshCredits();

            } catch (error) {
                console.error('Credit deduction error:', error);
                showToast('Failed to process payment', 'error');
                return;
            }

            // Export JSON
            const objects = this.canvas.getObjects().filter(o => o.id);
            const exportData = {
                image: this.currentFile.name,
                metadata: {
                    title: this.ui.metaTitle.value,
                    tags: this.ui.metaTags.value
                },
                annotations: objects.map(o => {
                    return {
                        id: o.id,
                        label: o.meta ? o.meta.label : 'Unknown',
                        type: o.type,
                        left: o.left,
                        top: o.top,
                        width: o.width * (o.scaleX || 1),
                        height: o.height * (o.scaleY || 1),
                        angle: o.angle,
                        color: o.stroke
                    };
                })
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "annotations.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();

            showToast('JSON Exported Successfully (15 credits deducted)', 'success');
        },

        async exportImage() {
            // Auth & Credit Check
            if (window.AuthManager && !AuthManager.user) {
                showToast('Login required', 'error');
                return;
            }

            if (window.CreditManager && !CreditManager.hasCredits(15)) {
                showToast('Insufficient credits (15 required)', 'error');
                return;
            }

            // Use unified loading UI
            if (window.ImgCraftBusyUI) {
                window.ImgCraftBusyUI.showLoading('Exporting Annotated Image...');
            }

            // Deduct credits via backend
            try {
                const headers = window.AuthManager.getAuthHeaders();
                const response = await fetch('/api/annotation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    body: JSON.stringify({ export_type: 'image' })
                });

                const result = await response.json();
                
                if (!response.ok || !result.success) {
                    showToast(result.error || 'Failed to deduct credits', 'error');
                    // Hide unified loading UI
                    if (window.ImgCraftBusyUI) {
                        window.ImgCraftBusyUI.hideLoading();
                    }
                    return;
                }

                // Update loading text
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.setLoadingText('Processing Image...');
                }

                // Refresh credit display
                if (window.CreditManager) CreditManager.refreshCredits();

            } catch (error) {
                console.error('Credit deduction error:', error);
                showToast('Failed to process payment', 'error');
                // Hide unified loading UI
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.hideLoading();
                }
                return;
            }

            // Export only the image with annotations (not the canvas background)
            // Create a temporary canvas with just the image and annotations
            const tempCanvas = document.createElement('canvas');
            const ctx = tempCanvas.getContext('2d');
            
            // Get background image dimensions
            const bgImage = this.canvas.backgroundImage;
            if (!bgImage) {
                showToast('No image to export', 'error');
                // Hide unified loading UI
                if (window.ImgCraftBusyUI) {
                    window.ImgCraftBusyUI.hideLoading();
                }
                return;
            }
            
            // Set temp canvas to original image size
            const imgWidth = this.originalImage.width;
            const imgHeight = this.originalImage.height;
            tempCanvas.width = imgWidth;
            tempCanvas.height = imgHeight;
            
            // Draw original image
            ctx.drawImage(this.originalImage, 0, 0);
            
            // Calculate scale factor from canvas to original image
            const scaleFactor = 1 / this.imageScale;
            
            // Get canvas center offset
            const canvasCenterX = this.canvas.width / 2;
            const canvasCenterY = this.canvas.height / 2;
            const imgCenterX = imgWidth / 2;
            const imgCenterY = imgHeight / 2;
            
            // Draw annotations on top
            const objects = this.canvas.getObjects().filter(o => o.id);
            objects.forEach(obj => {
                ctx.save();
                
                // Adjust position from canvas coords to image coords
                const offsetX = (obj.left - canvasCenterX) * scaleFactor + imgCenterX;
                const offsetY = (obj.top - canvasCenterY) * scaleFactor + imgCenterY;
                
                ctx.strokeStyle = obj.stroke || '#F97316';
                ctx.fillStyle = obj.fill || 'rgba(249, 115, 22, 0.2)';
                ctx.lineWidth = 2;
                
                if (obj.type === 'rect') {
                    const w = obj.width * obj.scaleX * scaleFactor;
                    const h = obj.height * obj.scaleY * scaleFactor;
                    ctx.fillRect(offsetX, offsetY, w, h);
                    ctx.strokeRect(offsetX, offsetY, w, h);
                } else if (obj.type === 'circle' || obj.type === 'point') {
                    const r = obj.radius * scaleFactor;
                    ctx.beginPath();
                    ctx.arc(offsetX, offsetY, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else if (obj.type === 'polygon') {
                    if (obj.points && obj.points.length > 0) {
                        ctx.beginPath();
                        obj.points.forEach((point, i) => {
                            const px = (point.x - canvasCenterX) * scaleFactor + imgCenterX;
                            const py = (point.y - canvasCenterY) * scaleFactor + imgCenterY;
                            if (i === 0) ctx.moveTo(px, py);
                            else ctx.lineTo(px, py);
                        });
                        ctx.closePath();
                        ctx.fill();
                        ctx.stroke();
                    }
                }
                
                ctx.restore();
            });
            
            const dataURL = tempCanvas.toDataURL('image/png', 1.0);

            const link = document.createElement('a');
            link.download = 'annotated_image.png';
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            link.remove();

            showToast('Image Exported Successfully (15 credits deducted)', 'success');

            // Hide unified loading UI
            if (window.ImgCraftBusyUI) {
                window.ImgCraftBusyUI.hideLoading();
            }
        }
    };

    // Initialize App
    AnnotationStudio.init();

    // Toast Helper - use global window.showToast
    window.showToast = window.showToast || function(msg, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${msg}`);
    };
});