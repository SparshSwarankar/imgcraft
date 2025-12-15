/**
 * ImgCraft - Busy UI unifier
 *
 * Goal: make loading UI consistent across all tools without rewriting every tool script.
 * - Shows a lightweight loading overlay inside the tool preview area.
 * - Adds a consistent loading spinner state to the download button.
 * - Mirrors existing tool loaders (e.g. #loadingOverlay) via a MutationObserver.
 */

(function () {
  'use strict';

  const PREVIEW_ROOT_SELECTORS = [
    '#previewContainer',
    '#resultContainer',
    '#editorStage',
    '#editorContainer',
    '.preview-stage'
  ];

  function $(selector) {
    return document.querySelector(selector);
  }

  function getPreviewRoot() {
    for (const selector of PREVIEW_ROOT_SELECTORS) {
      const element = $(selector);
      if (element) return element;
    }
    return null;
  }

  function getDownloadButton() {
    return $('#downloadBtn');
  }

  function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function ensurePreviewOverlay(previewRoot) {
    if (!previewRoot) return null;

    // Avoid adding multiple overlays if scripts re-run
    const existing = previewRoot.querySelector('.imgcraft-preview-loading');
    if (existing) return existing;

    // Ensure overlay positioning works even if tool CSS forgot it
    if (window.getComputedStyle(previewRoot).position === 'static') {
      previewRoot.style.position = 'relative';
    }

    const overlay = document.createElement('div');
    overlay.className = 'imgcraft-preview-loading';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="imgcraft-preview-loading-inner">
        <div class="imgcraft-spinner" aria-hidden="true"></div>
        <div class="imgcraft-preview-loading-text">Processing...</div>
      </div>
    `;

    previewRoot.appendChild(overlay);
    return overlay;
  }

  function setLoadingText(text) {
    const previewRoot = getPreviewRoot();
    if (!previewRoot) return;
    
    const overlay = ensurePreviewOverlay(previewRoot);
    if (overlay) {
      const textElement = overlay.querySelector('.imgcraft-preview-loading-text');
      if (textElement) {
        textElement.textContent = text;
      }
    }
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.classList.add('btn-loading');
      button.setAttribute('aria-busy', 'true');
      // <a> does not support disabled; use aria + pointer-events via CSS.
      button.classList.add('imgcraft-btn-disabled');
      button.setAttribute('aria-disabled', 'true');
    } else {
      button.classList.remove('btn-loading');
      button.removeAttribute('aria-busy');
      button.classList.remove('imgcraft-btn-disabled');
      button.removeAttribute('aria-disabled');
    }
  }

  function setPreviewBusy(previewRoot, isBusy) {
    if (!previewRoot) return;
    ensurePreviewOverlay(previewRoot);

    if (isBusy) {
      previewRoot.classList.add('imgcraft-busy');
    } else {
      previewRoot.classList.remove('imgcraft-busy');
    }
  }

  function setBusy(isBusy, message) {
    const previewRoot = getPreviewRoot();
    const downloadBtn = getDownloadButton();

    // Always show preview-area loading when busy.
    setPreviewBusy(previewRoot, isBusy);

    // Update loading message if provided
    if (isBusy && message) {
      setLoadingText(message);
    }

    // Only force download button loading if it is present and visible.
    // (Many tools hide download until processing is complete.)
    if (isVisible(downloadBtn)) {
      setButtonLoading(downloadBtn, isBusy);
    }
  }

  function disableActionButtons(disable) {
    // Find and disable/enable all action buttons during processing
    const actionButtons = document.querySelectorAll(
      '#convertBtn, #compressBtn, #resizeBtn, #removeBtn, #upscaleBtn, #cropBtn, #generateBtn, #applyBtn, #downloadBtn'
    );
    
    actionButtons.forEach(btn => {
      if (btn) {
        if (disable) {
          btn.disabled = true;
          btn.classList.add('imgcraft-btn-disabled');
          btn.setAttribute('aria-disabled', 'true');
        } else {
          btn.disabled = false;
          btn.classList.remove('imgcraft-btn-disabled');
          btn.removeAttribute('aria-disabled');
        }
      }
    });
  }

  function enhanceDownloadButton() {
    const downloadBtn = getDownloadButton();
    if (!downloadBtn) return;

    if (downloadBtn.dataset.imgcraftLoadingBound === 'true') return;
    downloadBtn.dataset.imgcraftLoadingBound = 'true';

    downloadBtn.addEventListener('click', () => {
      // Visual feedback only; browser handles actual download.
      setButtonLoading(downloadBtn, true);
      window.setTimeout(() => setButtonLoading(downloadBtn, false), 2500);
    });
  }

  // Expose a comprehensive API for tool scripts to use
  window.ImgCraftBusyUI = {
    setBusy,
    setLoadingText,
    disableActionButtons,
    showLoading: (message = 'Processing...') => {
      disableActionButtons(true);
      setBusy(true, message);
    },
    hideLoading: () => {
      setBusy(false);
      disableActionButtons(false);
    }
  };

  function observeExistingLoadingOverlay() {
    const loadingOverlay = $('#loadingOverlay');
    if (!loadingOverlay) return;

    const sync = () => {
      const busy = isVisible(loadingOverlay);
      setBusy(busy);
    };

    // Initial sync
    sync();

    const observer = new MutationObserver(() => sync());
    observer.observe(loadingOverlay, {
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden', 'aria-hidden']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Safe to run on every page.
      enhanceDownloadButton();
      observeExistingLoadingOverlay();
    });
  } else {
    enhanceDownloadButton();
    observeExistingLoadingOverlay();
  }
})();
