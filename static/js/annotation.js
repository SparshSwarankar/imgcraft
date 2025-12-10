/**
 * ============================================================================
 * IMAGE ANNOTATION TOOL - PROFESSIONAL EDITION
 * Client-side annotation system using Fabric.js
 * Features: Rectangles, Polygons, Points, Tagging, Metadata, JSON Export/Import
 * ============================================================================
 */

// Global state management
const AnnotationApp = {
    // Core components
    canvas: null,
    originalImage: null,
    currentFile: null,
    currentTool: 'rectangle', // 'select', 'rectangle', 'polygon', 'point'
    
    // Annotation data structure
    annotations: [],
    nextAnnotationId: 1,
    selectedAnnotation: null,
    
    // Polygon drawing state
    polygonPoints: [],
    tempPolygonLine: null,
    isDrawingPolygon: false,
    
    // Credit & Auth tracking
    creditsDeducted: false,
    
    // Canvas settings
    zoomLevel: 1,
    
    /**
     * Initialize the annotation tool
     */
    init() {
        console.log('Initializing Annotation Tool...');
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.checkAuthAndCredits();
    },
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
        
        // Tool selection
        document.getElementById('selectTool').addEventListener('click', () => this.setTool('select'));
        document.getElementById('rectangleTool').addEventListener('click', () => this.setTool('rectangle'));
        document.getElementById('polygonTool').addEventListener('click', () => this.setTool('polygon'));
        document.getElementById('pointTool').addEventListener('click', () => this.setTool('point'));
        
        // Canvas controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('zoomReset').addEventListener('click', () => this.resetZoom());
        document.getElementById('changeImage').addEventListener('click', () => this.changeImage());
        
        // Active annotation controls
        document.getElementById('annotationLabel').addEventListener('input', (e) => {
            if (this.selectedAnnotation) {
                this.updateAnnotationLabel(this.selectedAnnotation, e.target.value);
            }
        });
        
        document.getElementById('annotationColor').addEventListener('change', (e) => {
            if (this.selectedAnnotation) {
                this.updateAnnotationColor(this.selectedAnnotation, e.target.value);
            }
        });
        
        document.getElementById('deleteAnnotation').addEventListener('click', () => {
            if (this.selectedAnnotation) {
                this.deleteAnnotation(this.selectedAnnotation);
            }
        });
        
        // Export/Import
        document.getElementById('exportJSON').addEventListener('click', () => this.exportAnnotations());
        document.getElementById('importJSON').addEventListener('click', () => {
            document.getElementById('jsonFileInput').click();
        });
        
        document.getElementById('jsonFileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importAnnotations(e.target.files[0]);
            }
        });
    },
    
    /**
     * Set up drag and drop for file upload
     */
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = 'var(--annotation-primary)';
                dropZone.style.background = 'rgba(249, 115, 22, 0.1)';
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = '';
                dropZone.style.background = '';
            });
        });
        
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.handleFileUpload(files[0]);
            } else {
                showToast('Please drop a valid image file', 'error');
            }
        });
    },
    
    /**
     * Check authentication and credits
     */
    async checkAuthAndCredits() {
        // Wait for AuthManager to initialize
        await new Promise(resolve => {
            const checkAuth = setInterval(() => {
                if (window.AuthManager && window.CreditManager) {
                    clearInterval(checkAuth);
                    resolve();
                }
            }, 100);
        });
        
        console.log('Auth & Credit managers ready');
    },
    
    /**
     * Handle file upload and credit deduction
     */
    async handleFileUpload(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file', 'error');
            return;
        }
        
        // Check authentication
        if (!AuthManager || !AuthManager.session) {
            showToast('Please login to use this tool', 'warning');
            setTimeout(() => {
                window.location.href = '/auth';
            }, 2000);
            return;
        }
        
        // Deduct credits if not already done
        if (!this.creditsDeducted) {
            const success = await this.deductCredits();
            if (!success) {
                return; // Credit deduction failed
            }
        }
        
        // Store file info
        this.currentFile = file;
        
        // Update UI with file info
        this.displayFileInfo(file);
        
        // Load image onto canvas
        this.loadImageToCanvas(file);
    },
    
    /**
     * Deduct credits for using this tool (6 credits)
     */
    async deductCredits() {
        try {
            const headers = AuthManager.getAuthHeaders();
            if (!headers.Authorization) {
                showToast('Authentication required', 'error');
                return false;
            }
            
            const response = await fetch('/api/credits/deduct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: JSON.stringify({
                    tool_name: 'annotation',
                    credits: 6
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.creditsDeducted = true;
                showToast('6 credits deducted successfully', 'success');
                
                // Refresh credit display
                if (window.CreditManager) {
                    window.CreditManager.refreshCredits();
                }
                
                return true;
            } else {
                showToast(result.message || 'Not enough credits', 'error');
                setTimeout(() => {
                    window.location.href = '/billing';
                }, 2000);
                return false;
            }
        } catch (error) {
            console.error('Credit deduction error:', error);
            showToast('Failed to process credits', 'error');
            return false;
        }
    },
    
    /**
     * Display file information in the UI
     */
    displayFileInfo(file) {
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);
        
        // Show file info sections
        document.getElementById('fileInfoSection').style.display = 'block';
        document.getElementById('startInfoLeft').style.display = 'none';
        
        document.getElementById('metadataSection').style.display = 'block';
        document.getElementById('startInfoRight').style.display = 'none';
    },
    
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },
    
    /**
     * Load image onto Fabric.js canvas
     */
    loadImageToCanvas(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Store original image
                this.originalImage = img;
                
                // Update dimensions display
                document.getElementById('imageDimensions').textContent = `${img.width} × ${img.height}`;
                
                // Initialize Fabric.js canvas
                this.initializeCanvas(img);
                
                // Hide upload area, show canvas
                document.getElementById('dropZone').style.display = 'none';
                document.getElementById('canvasStage').style.display = 'flex';
                
                showToast('Image loaded successfully! Start annotating.', 'success');
            };
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    },
    
    /**
     * Initialize Fabric.js canvas with image
     */
    initializeCanvas(img) {
        // Calculate canvas dimensions to fit container
        const containerWidth = document.getElementById('canvasWrapper').clientWidth - 40;
        const containerHeight = document.getElementById('canvasWrapper').clientHeight - 40;
        
        let canvasWidth = img.width;
        let canvasHeight = img.height;
        
        // Scale down if image is too large
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
        
        canvasWidth = img.width * scale;
        canvasHeight = img.height * scale;
        
        // Create or update canvas
        if (this.canvas) {
            this.canvas.dispose();
        }
        
        this.canvas = new fabric.Canvas('annotationCanvas', {
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: '#ffffff',
            selection: true
        });
        
        // Add background image
        const fabricImg = new fabric.Image(img, {
            selectable: false,
            evented: false,
            scaleX: scale,
            scaleY: scale
        });
        
        this.canvas.setBackgroundImage(fabricImg, this.canvas.renderAll.bind(this.canvas));
        
        // Set up canvas event listeners
        this.setupCanvasEvents();
    },
    
    /**
     * Set up Fabric.js canvas event listeners
     */
    setupCanvasEvents() {
        // Mouse down - start drawing
        this.canvas.on('mouse:down', (options) => {
            if (this.currentTool === 'select') return;
            
            const pointer = this.canvas.getPointer(options.e);
            
            if (this.currentTool === 'rectangle') {
                this.startDrawingRectangle(pointer);
            } else if (this.currentTool === 'polygon') {
                this.addPolygonPoint(pointer);
            } else if (this.currentTool === 'point') {
                this.addPoint(pointer);
            }
        });
        
        // Mouse move - update drawing
        this.canvas.on('mouse:move', (options) => {
            if (this.currentTool === 'rectangle' && this.canvas.isDrawingMode === false) {
                const pointer = this.canvas.getPointer(options.e);
                this.updateDrawingRectangle(pointer);
            } else if (this.currentTool === 'polygon' && this.isDrawingPolygon) {
                const pointer = this.canvas.getPointer(options.e);
                this.updateTempPolygonLine(pointer);
            }
        });
        
        // Mouse up - finish drawing
        this.canvas.on('mouse:up', () => {
            if (this.currentTool === 'rectangle') {
                this.finishDrawingRectangle();
            }
        });
        
        // Object selection
        this.canvas.on('selection:created', (options) => {
            this.onObjectSelected(options.selected[0]);
        });
        
        this.canvas.on('selection:updated', (options) => {
            this.onObjectSelected(options.selected[0]);
        });
        
        this.canvas.on('selection:cleared', () => {
            this.onObjectDeselected();
        });
        
        // Double-click to finish polygon
        this.canvas.on('mouse:dblclick', () => {
            if (this.currentTool === 'polygon' && this.isDrawingPolygon) {
                this.finishPolygon();
            }
        });
    },
    
    /**
     * Set the current drawing tool
     */
    setTool(toolName) {
        this.currentTool = toolName;
        
        // Update UI
        document.querySelectorAll('.tool-btn-item').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const toolMap = {
            'select': 'selectTool',
            'rectangle': 'rectangleTool',
            'polygon': 'polygonTool',
            'point': 'pointTool'
        };
        
        document.getElementById(toolMap[toolName]).classList.add('active');
        
        // Enable/disable selection mode
        if (toolName === 'select') {
            this.canvas.selection = true;
            this.canvas.forEachObject(obj => {
                if (obj.annotationData) {
                    obj.selectable = true;
                }
            });
        } else {
            this.canvas.selection = false;
            this.canvas.forEachObject(obj => {
                if (obj.annotationData) {
                    obj.selectable = false;
                }
            });
        }
        
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
    },
    
    /**
     * Rectangle drawing methods
     */
    startDrawingRectangle(pointer) {
        const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: '#F97316',
            strokeWidth: 2,
            selectable: false,
            evented: false
        });
        
        this.tempRect = rect;
        this.tempRectStart = pointer;
        this.canvas.add(rect);
    },
    
    updateDrawingRectangle(pointer) {
        if (!this.tempRect) return;
        
        const width = pointer.x - this.tempRectStart.x;
        const height = pointer.y - this.tempRectStart.y;
        
        this.tempRect.set({
            width: Math.abs(width),
            height: Math.abs(height),
            left: width > 0 ? this.tempRectStart.x : pointer.x,
            top: height > 0 ? this.tempRectStart.y : pointer.y
        });
        
        this.canvas.renderAll();
    },
    
    finishDrawingRectangle() {
        if (!this.tempRect || this.tempRect.width < 5 || this.tempRect.height < 5) {
            if (this.tempRect) {
                this.canvas.remove(this.tempRect);
                this.tempRect = null;
            }
            return;
        }
        
        const annotationData = {
            id: this.nextAnnotationId++,
            type: 'rectangle',
            label: `Rectangle ${this.annotations.length + 1}`,
            color: '#F97316',
            coords: {
                x: this.tempRect.left,
                y: this.tempRect.top,
                width: this.tempRect.width,
                height: this.tempRect.height
            }
        };
        
        this.tempRect.set({
            annotationData: annotationData,
            selectable: false,
            stroke: annotationData.color
        });
        
        this.annotations.push({
            id: annotationData.id,
            fabricObject: this.tempRect,
            data: annotationData
        });
        
        this.tempRect = null;
        this.updateAnnotationsList();
        showToast('Rectangle annotation added', 'success');
    },
    
    /**
     * Polygon drawing methods
     */
    addPolygonPoint(pointer) {
        if (!this.isDrawingPolygon) {
            this.isDrawingPolygon = true;
            this.polygonPoints = [];
        }
        
        // Add point marker
        const point = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 4,
            fill: '#F97316',
            selectable: false,
            evented: false,
            originX: 'center',
            originY: 'center'
        });
        
        this.canvas.add(point);
        this.polygonPoints.push({ x: pointer.x, y: pointer.y, marker: point });
        
        // Update temp line
        if (this.polygonPoints.length > 1) {
            this.drawPolygonLines();
        }
    },
    
    drawPolygonLines() {
        // Remove old lines
        this.canvas.getObjects().forEach(obj => {
            if (obj.tempPolygonLine) {
                this.canvas.remove(obj);
            }
        });
        
        // Draw lines between points
        for (let i = 0; i < this.polygonPoints.length - 1; i++) {
            const line = new fabric.Line([
                this.polygonPoints[i].x, this.polygonPoints[i].y,
                this.polygonPoints[i + 1].x, this.polygonPoints[i + 1].y
            ], {
                stroke: '#F97316',
                strokeWidth: 2,
                selectable: false,
                evented: false,
                tempPolygonLine: true
            });
            this.canvas.add(line);
        }
        
        this.canvas.renderAll();
    },
    
    updateTempPolygonLine(pointer) {
        if (this.polygonPoints.length === 0) return;
        
        // Remove old temp line
        if (this.tempPolygonLine) {
            this.canvas.remove(this.tempPolygonLine);
        }
        
        // Draw temp line from last point to cursor
        const lastPoint = this.polygonPoints[this.polygonPoints.length - 1];
        this.tempPolygonLine = new fabric.Line([
            lastPoint.x, lastPoint.y, pointer.x, pointer.y
        ], {
            stroke: '#F97316',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false
        });
        
        this.canvas.add(this.tempPolygonLine);
        this.canvas.renderAll();
    },
    
    finishPolygon() {
        if (this.polygonPoints.length < 3) {
            showToast('Polygon needs at least 3 points', 'warning');
            this.cancelPolygon();
            return;
        }
        
        // Remove temp markers and lines
        this.canvas.getObjects().forEach(obj => {
            if (obj.tempPolygonLine) {
                this.canvas.remove(obj);
            }
        });
        
        this.polygonPoints.forEach(p => {
            this.canvas.remove(p.marker);
        });
        
        if (this.tempPolygonLine) {
            this.canvas.remove(this.tempPolygonLine);
        }
        
        // Create polygon
        const points = this.polygonPoints.map(p => ({ x: p.x, y: p.y }));
        const polygon = new fabric.Polygon(points, {
            fill: 'rgba(249, 115, 22, 0.1)',
            stroke: '#F97316',
            strokeWidth: 2,
            selectable: false
        });
        
        const annotationData = {
            id: this.nextAnnotationId++,
            type: 'polygon',
            label: `Polygon ${this.annotations.length + 1}`,
            color: '#F97316',
            points: points
        };
        
        polygon.annotationData = annotationData;
        
        this.canvas.add(polygon);
        
        this.annotations.push({
            id: annotationData.id,
            fabricObject: polygon,
            data: annotationData
        });
        
        this.isDrawingPolygon = false;
        this.polygonPoints = [];
        this.tempPolygonLine = null;
        
        this.updateAnnotationsList();
        showToast('Polygon annotation added', 'success');
    },
    
    cancelPolygon() {
        this.polygonPoints.forEach(p => {
            this.canvas.remove(p.marker);
        });
        
        this.canvas.getObjects().forEach(obj => {
            if (obj.tempPolygonLine) {
                this.canvas.remove(obj);
            }
        });
        
        if (this.tempPolygonLine) {
            this.canvas.remove(this.tempPolygonLine);
        }
        
        this.isDrawingPolygon = false;
        this.polygonPoints = [];
        this.tempPolygonLine = null;
        this.canvas.renderAll();
    },
    
    /**
     * Point marker methods
     */
    addPoint(pointer) {
        const point = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 6,
            fill: '#F97316',
            stroke: '#ffffff',
            strokeWidth: 2,
            selectable: false,
            originX: 'center',
            originY: 'center'
        });
        
        const annotationData = {
            id: this.nextAnnotationId++,
            type: 'point',
            label: `Point ${this.annotations.length + 1}`,
            color: '#F97316',
            coords: { x: pointer.x, y: pointer.y }
        };
        
        point.annotationData = annotationData;
        
        this.canvas.add(point);
        
        this.annotations.push({
            id: annotationData.id,
            fabricObject: point,
            data: annotationData
        });
        
        this.updateAnnotationsList();
        showToast('Point marker added', 'success');
    },
    
    /**
     * Update annotations list in the UI
     */
    updateAnnotationsList() {
        const listContainer = document.getElementById('annotationsList');
        const emptyState = document.getElementById('emptyAnnotationsList');
        const countBadge = document.getElementById('annotationCount');
        
        countBadge.textContent = this.annotations.length;
        
        if (this.annotations.length === 0) {
            listContainer.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        listContainer.innerHTML = '';
        
        this.annotations.forEach(ann => {
            const item = document.createElement('div');
            item.className = 'annotation-item';
            item.dataset.annotationId = ann.id;
            
            const icons = {
                rectangle: 'fa-vector-square',
                polygon: 'fa-draw-polygon',
                point: 'fa-map-pin'
            };
            
            item.innerHTML = `
                <div class="annotation-color-dot" style="background-color: ${ann.data.color}"></div>
                <div class="annotation-item-content">
                    <div class="annotation-item-label">${ann.data.label}</div>
                    <div class="annotation-item-type">${ann.data.type}</div>
                </div>
                <i class="fas ${icons[ann.data.type]} annotation-item-icon"></i>
            `;
            
            item.addEventListener('click', () => {
                this.selectAnnotationById(ann.id);
            });
            
            listContainer.appendChild(item);
        });
    },
    
    /**
     * Select annotation by ID
     */
    selectAnnotationById(id) {
        const annotation = this.annotations.find(a => a.id === id);
        if (!annotation) return;
        
        // Switch to select tool
        this.setTool('select');
        
        // Select the object on canvas
        this.canvas.setActiveObject(annotation.fabricObject);
        this.canvas.renderAll();
        
        this.onObjectSelected(annotation.fabricObject);
    },
    
    /**
     * Handle object selection on canvas
     */
    onObjectSelected(obj) {
        if (!obj || !obj.annotationData) return;
        
        this.selectedAnnotation = this.annotations.find(a => a.id === obj.annotationData.id);
        
        if (!this.selectedAnnotation) return;
        
        // Update active annotation settings
        document.getElementById('activeAnnotationSettings').style.display = 'block';
        document.getElementById('annotationLabel').value = this.selectedAnnotation.data.label;
        document.getElementById('annotationColor').value = this.selectedAnnotation.data.color;
        
        // Highlight in list
        document.querySelectorAll('.annotation-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const listItem = document.querySelector(`[data-annotation-id="${this.selectedAnnotation.id}"]`);
        if (listItem) {
            listItem.classList.add('selected');
            listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },
    
    /**
     * Handle object deselection
     */
    onObjectDeselected() {
        this.selectedAnnotation = null;
        document.getElementById('activeAnnotationSettings').style.display = 'none';
        
        document.querySelectorAll('.annotation-item').forEach(item => {
            item.classList.remove('selected');
        });
    },
    
    /**
     * Update annotation label
     */
    updateAnnotationLabel(annotation, newLabel) {
        annotation.data.label = newLabel;
        this.updateAnnotationsList();
    },
    
    /**
     * Update annotation color
     */
    updateAnnotationColor(annotation, newColor) {
        annotation.data.color = newColor;
        annotation.fabricObject.set('stroke', newColor);
        
        if (annotation.data.type === 'polygon') {
            annotation.fabricObject.set('fill', newColor + '1A'); // Add alpha
        }
        
        this.canvas.renderAll();
        this.updateAnnotationsList();
    },
    
    /**
     * Delete annotation
     */
    deleteAnnotation(annotation) {
        // Remove from canvas
        this.canvas.remove(annotation.fabricObject);
        
        // Remove from array
        const index = this.annotations.findIndex(a => a.id === annotation.id);
        if (index > -1) {
            this.annotations.splice(index, 1);
        }
        
        this.selectedAnnotation = null;
        this.updateAnnotationsList();
        this.onObjectDeselected();
        
        showToast('Annotation deleted', 'success');
    },
    
    /**
     * Export annotations as JSON
     */
    exportAnnotations() {
        if (this.annotations.length === 0) {
            showToast('No annotations to export', 'warning');
            return;
        }
        
        const exportData = {
            imageName: this.currentFile ? this.currentFile.name : 'image.jpg',
            imageWidth: this.originalImage ? this.originalImage.width : 0,
            imageHeight: this.originalImage ? this.originalImage.height : 0,
            metadata: {
                title: document.getElementById('imageTitle').value || '',
                description: document.getElementById('imageDescription').value || '',
                tags: document.getElementById('imageTags').value.split(',').map(t => t.trim()).filter(t => t)
            },
            annotations: this.annotations.map(ann => ({
                id: ann.data.id,
                type: ann.data.type,
                label: ann.data.label,
                color: ann.data.color,
                ...(ann.data.type === 'rectangle' && { coords: ann.data.coords }),
                ...(ann.data.type === 'polygon' && { points: ann.data.points }),
                ...(ann.data.type === 'point' && { coords: ann.data.coords })
            })),
            exportDate: new Date().toISOString(),
            tool: 'ImgCraft Annotation Tool v1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const filename = `annotations_${this.currentFile ? this.currentFile.name.split('.')[0] : 'image'}_${Date.now()}.json`;
        
        saveAs(blob, filename);
        showToast('Annotations exported successfully!', 'success');
    },
    
    /**
     * Import annotations from JSON
     */
    importAnnotations(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate structure
                if (!data.annotations || !Array.isArray(data.annotations)) {
                    throw new Error('Invalid JSON structure');
                }
                
                // Clear existing annotations
                this.annotations.forEach(ann => {
                    this.canvas.remove(ann.fabricObject);
                });
                this.annotations = [];
                
                // Import metadata
                if (data.metadata) {
                    document.getElementById('imageTitle').value = data.metadata.title || '';
                    document.getElementById('imageDescription').value = data.metadata.description || '';
                    document.getElementById('imageTags').value = (data.metadata.tags || []).join(', ');
                }
                
                // Recreate annotations
                data.annotations.forEach(annData => {
                    let fabricObject;
                    
                    if (annData.type === 'rectangle') {
                        fabricObject = new fabric.Rect({
                            left: annData.coords.x,
                            top: annData.coords.y,
                            width: annData.coords.width,
                            height: annData.coords.height,
                            fill: 'transparent',
                            stroke: annData.color,
                            strokeWidth: 2,
                            selectable: false
                        });
                    } else if (annData.type === 'polygon') {
                        fabricObject = new fabric.Polygon(annData.points, {
                            fill: annData.color + '1A',
                            stroke: annData.color,
                            strokeWidth: 2,
                            selectable: false
                        });
                    } else if (annData.type === 'point') {
                        fabricObject = new fabric.Circle({
                            left: annData.coords.x,
                            top: annData.coords.y,
                            radius: 6,
                            fill: annData.color,
                            stroke: '#ffffff',
                            strokeWidth: 2,
                            selectable: false,
                            originX: 'center',
                            originY: 'center'
                        });
                    }
                    
                    if (fabricObject) {
                        fabricObject.annotationData = annData;
                        this.canvas.add(fabricObject);
                        
                        this.annotations.push({
                            id: annData.id,
                            fabricObject: fabricObject,
                            data: annData
                        });
                        
                        if (annData.id >= this.nextAnnotationId) {
                            this.nextAnnotationId = annData.id + 1;
                        }
                    }
                });
                
                this.updateAnnotationsList();
                showToast(`Imported ${data.annotations.length} annotations successfully!`, 'success');
                
            } catch (error) {
                console.error('Import error:', error);
                showToast('Failed to import annotations - invalid JSON', 'error');
            }
        };
        
        reader.readAsText(file);
    },
    
    /**
     * Zoom controls
     */
    zoom(factor) {
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.5, Math.min(3, this.zoomLevel)); // Limit 0.5x to 3x
        
        this.canvas.setZoom(this.zoomLevel);
        this.canvas.renderAll();
    },
    
    resetZoom() {
        this.zoomLevel = 1;
        this.canvas.setZoom(1);
        this.canvas.renderAll();
    },
    
    /**
     * Change image (reset everything)
     */
    changeImage() {
        if (confirm('This will clear all current annotations. Continue?')) {
            // Clear canvas
            if (this.canvas) {
                this.canvas.dispose();
                this.canvas = null;
            }
            
            // Reset state
            this.annotations = [];
            this.nextAnnotationId = 1;
            this.selectedAnnotation = null;
            this.currentFile = null;
            this.originalImage = null;
            
            // Reset UI
            document.getElementById('dropZone').style.display = 'flex';
            document.getElementById('canvasStage').style.display = 'none';
            document.getElementById('fileInfoSection').style.display = 'none';
            document.getElementById('startInfoLeft').style.display = 'block';
            document.getElementById('metadataSection').style.display = 'none';
            document.getElementById('startInfoRight').style.display = 'block';
            
            // Clear file input
            document.getElementById('fileInput').value = '';
            
            showToast('Ready for new image', 'info');
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    AnnotationApp.init();
});
