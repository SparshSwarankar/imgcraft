document.addEventListener('DOMContentLoaded', () => {
    console.log("EXIF Tool Loaded - Studio Version");

    // --- DOM ELEMENTS ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    // Panels
    const fileInfoSection = document.getElementById('fileInfoSection');
    const startInfoLeft = document.getElementById('startInfoLeft');
    const startInfoRight = document.getElementById('startInfoRight');
    const exifContainer = document.getElementById('exifContainer');
    const exifList = document.getElementById('exifList');
    const noExifMsg = document.getElementById('noExifMsg');

    // Info Fields
    const fileNameSpan = document.getElementById('fileName');
    const fileSizeSpan = document.getElementById('fileSize');
    const fileTypeSpan = document.getElementById('fileType');
    const fileDimSpan = document.getElementById('fileDim');

    // Actions
    const actionArea = document.getElementById('actionArea');
    const dummyBtn = document.getElementById('dummyBtn');
    const removeBtn = document.getElementById('removeBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    // Modals
    const confirmModal = document.getElementById('confirmModal');
    const btnCancelRemove = document.getElementById('btnCancelRemove');
    const btnConfirmRemove = document.getElementById('btnConfirmRemove');

    let currentFile = null;

    // --- FILE HANDLING ---
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
            showToast('Please upload a valid image (JPG, PNG, TIFF)', 'error');
            return;
        }
        currentFile = file;

        // Update Left Panel
        fileNameSpan.textContent = file.name.length > 20 ? file.name.substring(0, 15) + '...' : file.name;
        fileSizeSpan.textContent = formatBytes(file.size);
        fileTypeSpan.textContent = file.type.split('/')[1].toUpperCase();

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                fileDimSpan.textContent = `${img.width} x ${img.height}`;
            };
            img.src = e.target.result;

            previewImage.src = e.target.result;

            // Switch UI
            dropZone.style.display = 'none';
            previewContainer.style.display = 'flex';

            startInfoLeft.style.display = 'none';
            fileInfoSection.style.display = 'block';

            startInfoRight.style.display = 'none';
            exifContainer.style.display = 'block';

            // Show remove buttons
            dummyBtn.style.display = 'none';
            actionArea.style.display = 'block';

            // Fetch Data
            fetchExifData(file);
        };
        reader.readAsDataURL(file);
    }

    // --- API: FETCH EXIF (View Action - 1 Credit) ---
    async function fetchExifData(file) {
        if (window.AuthManager && !AuthManager.user) {
            showToast('Login required to view metadata', 'error');
            setTimeout(() => window.location.href = '/auth', 1500);
            return;
        }

        // Show Loading
        loadingOverlay.style.display = 'flex';
        loadingText.textContent = 'Reading Metadata...';

        const formData = new FormData();
        formData.append('image', file);
        formData.append('action', 'view');

        try {
            const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};
            const response = await fetch('/api/exif', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                renderExifList(data.exif);

                // Show success message with credit cost
                const cost = response.headers.get('X-Credits-Cost') || '1';
                showToast(`Metadata loaded (-${cost} Credit)`, 'success');

                // Credit refresh (if backend deducted)
                if (window.CreditManager) CreditManager.refreshCredits();
            } else {
                const errorMessage = await parseErrorResponse(response, 'Failed to load metadata');
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Network error', 'error');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    // --- RENDER EXIF DATA ---
    function renderExifList(data) {
        exifList.innerHTML = '';

        if (!data || Object.keys(data).length === 0) {
            noExifMsg.style.display = 'block';
            removeBtn.disabled = true;
            return;
        }

        noExifMsg.style.display = 'none';
        removeBtn.disabled = false;

        // Build Categories
        for (const [category, fields] of Object.entries(data)) {
            if (Object.keys(fields).length === 0) continue;

            const section = document.createElement('div');
            section.className = 'exif-category';

            // Header
            const header = document.createElement('div');
            header.className = 'exif-category-header';
            header.innerHTML = `
                <div class="category-title">
                    <i class="fas fa-chevron-down category-icon"></i>
                    <span>${category}</span>
                    <span class="category-count" style="margin-left:auto; font-size:0.8rem; color:#888;">(${Object.keys(fields).length})</span>
                </div>
            `;

            // Content Container
            const content = document.createElement('div');
            content.className = 'exif-category-content';

            // Fields
            for (const [key, value] of Object.entries(fields)) {
                const item = document.createElement('div');
                item.className = 'exif-item';

                // Format value if object
                let displayVal = value;
                if (typeof value === 'object') displayVal = JSON.stringify(value);

                item.innerHTML = `
                    <span class="exif-key">${key}</span>
                    <span class="exif-value" title="${displayVal}">${displayVal}</span>
                `;
                content.appendChild(item);
            }

            // Click to Toggle
            header.addEventListener('click', () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                const icon = header.querySelector('.category-icon');
                icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
            });

            section.appendChild(header);
            section.appendChild(content);
            exifList.appendChild(section);
        }
    }

    // --- API: REMOVE METADATA (2 Credits) ---
    removeBtn.addEventListener('click', () => {
        confirmModal.style.display = 'flex';
    });

    btnCancelRemove.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });

    btnConfirmRemove.addEventListener('click', async () => {
        confirmModal.style.display = 'none';
        loadingOverlay.style.display = 'flex';
        loadingText.textContent = 'Scrubbing Data...';

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('action', 'remove');

        try {
            const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};
            const response = await fetch('/api/exif', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (response.ok) {
                // Get Cost
                const cost = response.headers.get('X-Credits-Cost');

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Update UI
                downloadBtn.href = url;
                downloadBtn.download = `clean_${currentFile.name}`;
                downloadBtn.style.display = 'inline-flex';

                removeBtn.style.display = 'none';

                // Clear list to show it's gone
                exifList.innerHTML = '';
                noExifMsg.style.display = 'block';
                noExifMsg.innerHTML = '<i class="fas fa-shield-check" style="color:#22c55e; font-size:2rem;"></i><p>Metadata Removed Successfully!</p>';

                let msg = 'Metadata removed!';
                if (cost) msg += ` (-${cost} Credits)`;
                showToast(msg, 'success');

                if (window.CreditManager) CreditManager.refreshCredits();
            } else {
                const errorMessage = await parseErrorResponse(response, 'Failed to remove metadata');
                showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Network error', 'error');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

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
            console.warn('EXIF error parse failed', err);
            return fallbackMessage;
        }
    }

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});