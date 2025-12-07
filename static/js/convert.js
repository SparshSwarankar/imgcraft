document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const previewImage = document.getElementById('previewImage');

    // Panels
    const fileInfoSection = document.getElementById('fileInfoSection');
    const startInfo = document.getElementById('startInfo');
    const convertControls = document.getElementById('convertControls');
    const controlsInfo = document.getElementById('controlsInfo');

    // Info Fields
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');

    // Inputs & Buttons
    const formatSelect = document.getElementById('formatSelect'); // Hidden input
    const formatInfoText = document.getElementById('formatInfoText');
    const convertBtn = document.getElementById('convertBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const successArea = document.getElementById('successArea');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const progressText = document.getElementById('progressText');

    let currentFile = null;

    // --- File Handling ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Please upload a valid image file', 'error');
            return;
        }

        currentFile = file;

        // Update File Info
        fileName.textContent = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
        fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        fileType.textContent = file.type.split('/')[1].toUpperCase();

        // Show Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;

            // Switch UI State
            dropZone.style.display = 'none';
            previewContainer.style.display = 'flex';

            fileInfoSection.style.display = 'block';
            startInfo.style.display = 'none';

            convertControls.style.display = 'block';
            controlsInfo.style.display = 'none';

            convertBtn.disabled = false;
            convertBtn.innerHTML = 'Convert Image';

            // Reset Success Area
            successArea.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    // --- Conversion Logic ---
    convertBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        // UI Loading State
        convertBtn.disabled = true;
        loadingOverlay.style.display = 'flex';
        progressText.textContent = 'Converting...';

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('format', formatSelect.value);

        try {
            const token = window.AuthManager ? window.AuthManager.getToken() : null;
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (response.ok) {
                // Get Cost Header
                const cost = response.headers.get('X-Credits-Cost');

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                // Setup Download
                const ext = formatSelect.value.toLowerCase();
                const originalName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.'));
                downloadBtn.href = url;
                downloadBtn.download = `${originalName}_converted.${ext}`;

                // Show Success
                successArea.style.display = 'block';
                convertBtn.innerHTML = 'Convert Again';

                // Prepare Toast Message with Credit Cost
                let msg = `Converted to ${formatSelect.value} successfully!`;
                if (cost) {
                    if (cost === '0') {
                        msg += ' (FREE)';
                    } else {
                        msg += ` (-${cost} Credits)`;
                    }
                }
                showToast(msg, 'success');

                // Refresh Credits Display
                if (window.CreditManager) CreditManager.refreshCredits();

            } else {
                showToast('Conversion failed', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Network error', 'error');
        } finally {
            loadingOverlay.style.display = 'none';
            convertBtn.disabled = false;
        }
    });

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

                    // Update Info Text based on format
                    updateFormatInfo(value);
                });
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.custom-select').forEach(d => d.classList.remove('open'));
        });
    }
    setupCustomDropdowns();

    function updateFormatInfo(format) {
        let text = "";
        switch (format) {
            case 'PNG': text = "Best for high quality images with transparency support."; break;
            case 'JPEG': text = "Best for photographs and small file sizes."; break;
            case 'WEBP': text = "Modern format. Superior compression for web."; break;
            case 'BMP': text = "Uncompressed bitmap. Large file size."; break;
            case 'ICO': text = "Used for favicons and desktop icons."; break;
            case 'TIFF': text = "High quality for printing and editing."; break;
        }
        formatInfoText.innerHTML = `<i class="fas fa-info-circle" style="color: var(--primary); margin-right: 5px;"></i> ${text}`;
    }

    // Download Animation
    downloadBtn.addEventListener('click', function () {
        const btn = this;
        if (btn.classList.contains('btn-loading')) return;
        btn.classList.add('btn-loading');
        setTimeout(() => btn.classList.remove('btn-loading'), 2500);
    });

    function showToast(msg, type = 'info') {
        if (window.showToast) window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});