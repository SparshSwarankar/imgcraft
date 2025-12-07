const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const previewOriginal = document.getElementById('previewOriginal');
const previewUpscaled = document.getElementById('previewUpscaled');
const upscaleBtn = document.getElementById('upscaleBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const enhanceCheckbox = document.getElementById('enhance');

let currentFile = null;
let currentFactor = 2;

// UI Helpers
window.setFactor = function (factor) {
    currentFactor = factor;
    document.getElementById('factor2x').classList.toggle('active', factor === 2);
    document.getElementById('factor4x').classList.toggle('active', factor === 4);
};

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
    const reader = new FileReader();
    reader.onload = (e) => {
        previewOriginal.src = e.target.result;
        previewOriginal.style.display = 'block';
        previewUpscaled.style.display = 'none';
        previewContainer.style.display = 'flex';
        dropZone.style.display = 'none';
        upscaleBtn.disabled = false;

        downloadBtn.style.display = 'none';
        upscaleBtn.style.display = 'inline-flex';
    };
    reader.readAsDataURL(file);
}

upscaleBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    loadingOverlay.style.display = 'flex';
    const formData = new FormData();
    formData.append('image', currentFile);
    formData.append('factor', currentFactor);
    formData.append('enhance', enhanceCheckbox.checked);

    try {
        const headers = window.AuthManager ? window.AuthManager.getAuthHeaders() : {};

        const response = await fetch('/api/upscale', {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            previewUpscaled.src = url;
            previewUpscaled.style.display = 'block';
            previewOriginal.style.display = 'none';

            downloadBtn.href = url;
            downloadBtn.download = `upscaled_${currentFile.name}`;
            downloadBtn.style.display = 'inline-flex';
            upscaleBtn.textContent = 'Upscale Again';
            showToast('Image upscaled successfully!', 'success');
        } else {
            showToast('Error upscaling image', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Error upscaling image', 'error');
    } finally {
        loadingOverlay.style.display = 'none';
    }
});
