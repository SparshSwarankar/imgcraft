const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const scaleRange = document.getElementById('scaleRange');
const scaleValue = document.getElementById('scaleValue');
const resizeBtn = document.getElementById('resizeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const aspectRatioCheckbox = document.getElementById('aspectRatio');

let currentFile = null;
let originalWidth = 0;
let originalHeight = 0;
let currentMode = 'pixel';

// UI Helpers
function setMode(mode) {
    currentMode = mode;
    document.getElementById('modePixel').classList.toggle('active', mode === 'pixel');
    document.getElementById('modePercent').classList.toggle('active', mode === 'percent');
    document.getElementById('pixelControls').style.display = mode === 'pixel' ? 'block' : 'none';
    document.getElementById('percentControls').style.display = mode === 'percent' ? 'block' : 'none';
}

// File Handling
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    currentFile = file;

    // Update File Info
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileInfo = document.getElementById('fileInfo');

    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    if (fileInfo) fileInfo.style.display = 'flex';

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewContainer.style.display = 'flex';
        dropZone.style.display = 'none';

        // Get original dimensions
        const img = new Image();
        img.onload = () => {
            originalWidth = img.width;
            originalHeight = img.height;
            widthInput.value = originalWidth;
            heightInput.value = originalHeight;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Aspect Ratio Logic
widthInput.addEventListener('input', () => {
    if (aspectRatioCheckbox.checked && originalWidth > 0) {
        const ratio = originalHeight / originalWidth;
        heightInput.value = Math.round(widthInput.value * ratio);
    }
});

heightInput.addEventListener('input', () => {
    if (aspectRatioCheckbox.checked && originalWidth > 0) {
        const ratio = originalWidth / originalHeight;
        widthInput.value = Math.round(heightInput.value * ratio);
    }
});

scaleRange.addEventListener('input', (e) => {
    scaleValue.textContent = e.target.value;
});

// Spin Button Logic
window.adjustValue = function (inputId, delta) {
    const input = document.getElementById(inputId);
    let newValue = (parseInt(input.value) || 0) + delta;
    if (newValue < 1) newValue = 1;
    input.value = newValue;

    // Trigger input event to update aspect ratio if needed
    input.dispatchEvent(new Event('input'));
};

// Resize Action
resizeBtn.addEventListener('click', () => {
    if (!currentFile) {
        showToast('Please upload an image first!', 'error');
        return;
    }

    // Define safe limits (matching backend)
    const MAX_DIMENSION = 10000;
    const MAX_TOTAL_PIXELS = 100000000; // 100 megapixels

    // Calculate target dimensions
    let targetWidth, targetHeight;
    if (currentMode === 'pixel') {
        targetWidth = parseInt(widthInput.value) || 0;
        targetHeight = parseInt(heightInput.value) || 0;
    } else {
        const scale = parseInt(scaleRange.value) / 100;
        targetWidth = Math.round(originalWidth * scale);
        targetHeight = Math.round(originalHeight * scale);
    }

    // Validate dimensions BEFORE sending request
    if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
        showToast(`⚠️ Dimensions too large! Maximum: ${MAX_DIMENSION.toLocaleString()}x${MAX_DIMENSION.toLocaleString()} pixels. Requested: ${targetWidth.toLocaleString()}x${targetHeight.toLocaleString()}`, 'error');
        return;
    }

    const totalPixels = targetWidth * targetHeight;
    if (totalPixels > MAX_TOTAL_PIXELS) {
        showToast(`⚠️ Image too large! Maximum: ${MAX_TOTAL_PIXELS.toLocaleString()} pixels. Requested: ${totalPixels.toLocaleString()} pixels (${targetWidth.toLocaleString()}x${targetHeight.toLocaleString()})`, 'error');
        return;
    }

    // Show warning for very large images (above 50 megapixels)
    if (totalPixels > 50000000) {
        const proceed = confirm(
            `⚠️ WARNING: Large Image Resize\n\n` +
            `You are about to resize to ${targetWidth.toLocaleString()}x${targetHeight.toLocaleString()} (${(totalPixels / 1000000).toFixed(1)}MP)\n\n` +
            `This may:\n` +
            `• Take a long time to process\n` +
            `• Use significant memory\n` +
            `• Result in a very large file\n\n` +
            `Do you want to continue?`
        );

        if (!proceed) {
            return;
        }
    }

    // Auth & Credit Check (only for logged-in users)
    if (window.AuthManager && AuthManager.user) {
        if (window.CreditManager && !CreditManager.hasCredits(1)) {
            showToast('Insufficient credits! Please purchase more.', 'error');
            return;
        }
    }

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const downloadArea = document.getElementById('downloadArea');
    const downloadBtn = document.getElementById('downloadBtn');

    // Reset UI
    progressContainer.style.display = 'block';
    downloadArea.style.display = 'none';
    progressBar.style.width = '0%';
    progressBar.classList.remove('processing');
    progressText.textContent = 'Uploading... 0%';
    resizeBtn.disabled = true;

    const formData = new FormData();
    formData.append('image', currentFile);
    formData.append('mode', currentMode);

    if (currentMode === 'pixel') {
        formData.append('width', widthInput.value);
        formData.append('height', heightInput.value);
    } else {
        formData.append('scale', scaleRange.value);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/resize', true);

    // Add Auth Header
    if (window.AuthManager) {
        const headers = AuthManager.getAuthHeaders();
        if (headers.Authorization) {
            xhr.setRequestHeader('Authorization', headers.Authorization);
        }
    }

    xhr.responseType = 'blob';

    // Upload Progress
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';
            progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;

            if (percentComplete >= 100) {
                progressText.textContent = 'Resizing Image...';
                progressBar.classList.add('processing');
            }
        }
    };

    xhr.onload = () => {
        if (xhr.status === 200) {
            const blob = xhr.response;
            const url = URL.createObjectURL(blob);

            downloadBtn.href = url;
            downloadBtn.download = `resized_${currentFile.name}`;

            // Show Success UI
            progressContainer.style.display = 'none';
            downloadArea.style.display = 'block';

            resizeBtn.textContent = 'Resize Another';
            resizeBtn.disabled = false;
            showToast('Image resized successfully!', 'success');

            // Refresh credits
            if (window.CreditManager) {
                CreditManager.refreshCredits();
            }
        } else {
            // Handle error response
            progressContainer.style.display = 'none';
            resizeBtn.disabled = false;

            // Try to parse error message from JSON response
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const errorData = JSON.parse(reader.result);
                    showToast(errorData.error || 'Error resizing image', 'error');
                } catch (e) {
                    showToast('Error resizing image', 'error');
                }
            };
            reader.readAsText(xhr.response);
        }
    };

    xhr.onerror = () => {
        progressContainer.style.display = 'none';
        resizeBtn.disabled = false;
        showToast('Network error occurred', 'error');
    };

    xhr.send(formData);
});
