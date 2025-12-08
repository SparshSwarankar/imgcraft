// ============================================================================
// ImgCraft PWA - Main Module
// Manages all PWA features: installation, notifications, offline sync, theming
// ============================================================================

class ImgCraftPWA {
  constructor() {
    this.sw = null;
    this.isInstalled = this.checkIfInstalled();
    this.isOnline = navigator.onLine;
    this.deferredPrompt = null;
    this.db = null;
    this.theme = this.loadTheme();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize all PWA features
   */
  async init() {
    try {
      // Initialize databases
      await this.initDB();

      // Register service worker
      await this.registerServiceWorker();

      // Setup event listeners
      this.setupEventListeners();

      // Setup install prompt
      this.setupInstallPrompt();

      // Setup theme detection
      this.setupThemeDetection();

      // Check for offline status
      this.handleOnlineStatus();

      // Setup notification permission
      await this.setupNotifications();

      // Setup web app capabilities
      this.setupWebAPIs();

      // Check for update on startup
      await this.checkForUpdates();

    } catch (error) {
    }
  }

  // ========================================================================
  // SERVICE WORKER REGISTRATION
  // ========================================================================

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/static/service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      this.sw = registration;

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.notifyUpdate();
          }
        });
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update().catch((error) => {
          // Update check attempted
        });
      }, 60000); // Check every minute

      return true;
    } catch (error) {
      return false;
    }
  }

  // ========================================================================
  // INSTALL PROMPT & ADD TO HOME SCREEN
  // ========================================================================

  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      localStorage.setItem('imgcraft_app_installed', 'true');
      this.trackEvent('app_installed');
    });
  }

  /**
   * Show custom install prompt to user
   */
  showInstallPrompt() {
    // Check if we should show the prompt (not too frequently)
    const lastPrompt = localStorage.getItem('imgcraft_install_prompt_time');
    const now = Date.now();

    if (lastPrompt && now - parseInt(lastPrompt) < 86400000) {
      return; // Don't show more than once per 24 hours
    }

    // Create custom install prompt
    const promptDiv = document.createElement('div');
    promptDiv.id = 'imgcraft-install-prompt';
    promptDiv.innerHTML = `
      <div class="install-prompt-container">
        <div class="install-prompt-content">
          <div class="install-prompt-header">
            <img src="/static/image/icon-192x192.png" alt="ImgCraft" class="install-prompt-icon">
            <div class="install-prompt-text">
              <h3>Install ImgCraft App</h3>
              <p>Get fast, offline access to all your image tools</p>
            </div>
            <button class="install-prompt-close" aria-label="Close">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="install-prompt-features">
            <div class="feature">
              <span class="feature-icon">⚡</span>
              <span>Super Fast</span>
            </div>
            <div class="feature">
              <span class="feature-icon">🔒</span>
              <span>More Secure</span>
            </div>
            <div class="feature">
              <span class="feature-icon">✨</span>
              <span>Pro Features</span>
            </div>
          </div>
          <div class="install-prompt-actions">
            <button class="install-prompt-cancel">Not now</button>
            <button class="install-prompt-install">Install App</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(promptDiv);

    // Add styles
    this.addInstallPromptStyles();

    // Handle events
    const closeBtn = promptDiv.querySelector('.install-prompt-close');
    const cancelBtn = promptDiv.querySelector('.install-prompt-cancel');
    const installBtn = promptDiv.querySelector('.install-prompt-install');

    const closePrompt = () => {
      promptDiv.classList.add('hide');
      setTimeout(() => promptDiv.remove(), 300);
    };

    closeBtn.addEventListener('click', closePrompt);
    cancelBtn.addEventListener('click', closePrompt);

    installBtn.addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        // App install handled
        
        this.deferredPrompt = null;
        closePrompt();
      }
    });

    localStorage.setItem('imgcraft_install_prompt_time', now.toString());

    // Auto-hide after 5 seconds if not interacted
    setTimeout(() => {
      if (promptDiv.parentElement) {
        closePrompt();
      }
    }, 8000);
  }

  addInstallPromptStyles() {
    if (document.getElementById('imgcraft-install-prompt-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'imgcraft-install-prompt-styles';
    style.innerHTML = `
      :root {
        --primary: #F97316;
        --secondary: #E11D48;
        --dark-bg: #020617;
        --card-bg: #0F172A;
        --text-main: #F8FAFC;
        --text-muted: #94A3B8;
      }

      #imgcraft-install-prompt {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 10000;
        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      #imgcraft-install-prompt.hide {
        animation: slideDown 0.3s ease-in;
      }

      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes slideDown {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(100%);
          opacity: 0;
        }
      }

      .install-prompt-container {
        background: linear-gradient(135deg, var(--card-bg) 0%, rgba(30, 41, 59, 0.8) 100%);
        padding: 20px;
        box-shadow: 0 -8px 32px rgba(249, 115, 22, 0.15);
        color: var(--text-main);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        backdrop-filter: blur(10px);
        border-top: 1px solid rgba(249, 115, 22, 0.2);
      }

      .install-prompt-content {
        max-width: 600px;
        margin: 0 auto;
      }

      .install-prompt-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }

      .install-prompt-icon {
        width: 52px;
        height: 52px;
        border-radius: 12px;
        flex-shrink: 0;
        box-shadow: 0 4px 16px rgba(249, 115, 22, 0.3);
      }

      .install-prompt-text h3 {
        margin: 0 0 4px 0;
        font-size: 18px;
        font-weight: 700;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .install-prompt-text p {
        margin: 0;
        font-size: 14px;
        color: var(--text-muted);
      }

      .install-prompt-close {
        margin-left: auto;
        background: rgba(249, 115, 22, 0.1);
        border: 1px solid rgba(249, 115, 22, 0.2);
        color: var(--primary);
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: all 0.2s ease;
      }

      .install-prompt-close:hover {
        background: rgba(249, 115, 22, 0.2);
        transform: rotate(90deg);
      }

      .install-prompt-features {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .feature {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        background: rgba(249, 115, 22, 0.1);
        border: 1px solid rgba(249, 115, 22, 0.2);
        color: var(--text-main);
        padding: 8px 14px;
        border-radius: 20px;
        transition: all 0.2s ease;
      }

      .feature:hover {
        background: rgba(249, 115, 22, 0.2);
        border-color: rgba(249, 115, 22, 0.4);
      }

      .feature-icon {
        font-size: 16px;
        display: inline-flex;
        align-items: center;
      }

      .install-prompt-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .install-prompt-actions button {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .install-prompt-cancel {
        background: rgba(249, 115, 22, 0.1);
        color: var(--text-main);
        border: 1px solid rgba(249, 115, 22, 0.2);
      }

      .install-prompt-cancel:hover {
        background: rgba(249, 115, 22, 0.2);
        border-color: rgba(249, 115, 22, 0.4);
      }

      .install-prompt-install {
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: white;
        box-shadow: 0 4px 16px rgba(249, 115, 22, 0.3);
      }

      .install-prompt-install:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
      }

      @media (max-width: 480px) {
        .install-prompt-container {
          padding: 16px;
        }

        .install-prompt-header {
          gap: 12px;
        }

        .install-prompt-icon {
          width: 44px;
          height: 44px;
        }

        .install-prompt-text h3 {
          font-size: 16px;
        }

        .install-prompt-close {
          width: 32px;
          height: 32px;
          font-size: 16px;
        }

        .install-prompt-actions {
          flex-direction: column-reverse;
        }

        .install-prompt-actions button {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ========================================================================
  // THEME DETECTION & MANAGEMENT
  // ========================================================================

  loadTheme() {
    const saved = localStorage.getItem('imgcraft_theme');
    if (saved) {
      return saved;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  setupThemeDetection() {
    // Apply saved theme
    this.applyTheme(this.theme);

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const newTheme = e.matches ? 'dark' : 'light';
        this.setTheme(newTheme);
      });
    }

    // Listen for manual theme toggle
    document.addEventListener('theme-toggle', (e) => {
      const newTheme = e.detail?.theme || (this.theme === 'dark' ? 'light' : 'dark');
      this.setTheme(newTheme);
    });
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('imgcraft_theme', theme);
    this.applyTheme(theme);

    // Update manifest theme color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#F97316');
    }
  }

  applyTheme(theme) {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.classList.toggle('dark-theme', theme === 'dark');
    html.classList.toggle('light-theme', theme === 'light');

    // Update meta theme color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#F97316');
    }
  }

  // ========================================================================
  // PUSH NOTIFICATIONS
  // ========================================================================

  async setupNotifications() {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported');
      return;
    }

    // Check if user has already interacted with notification permission
    if (Notification.permission === 'granted') {
      this.subscribeToNotifications();
    } else if (Notification.permission !== 'denied') {
      // Request permission on user interaction (better UX)
      document.addEventListener('click', async () => {
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            this.subscribeToNotifications();
          }
        }
      }, { once: true });
    }
  }

  async subscribeToNotifications() {
    if (!('serviceWorker' in navigator) || !this.sw) {
      return;
    }

    try {
      if (!('pushManager' in this.sw)) {
        return;
      }

      // Check if VAPID key is configured first
      if (!document.querySelector('meta[name="vapid-public-key"]')?.getAttribute('content')) {
        return;
      }

      let subscription = await this.sw.pushManager.getSubscription();

      if (!subscription) {
        // Create subscription (VAPID public key should be set in manifest)
        subscription = await this.sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.getVAPIDPublicKey()
        });
      }

      // Send subscription to server for storage
      await this.sendSubscriptionToServer(subscription);
    } catch (error) {
      // Subscription error - silent fail
    }
  }

  getVAPIDPublicKey() {
    // This should be set by the server in a meta tag
    const key = document.querySelector('meta[name="vapid-public-key"]')?.getAttribute('content');
    if (!key) {
      return undefined;
    }
    return this.urlBase64ToUint8Array(key);
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  async sendSubscriptionToServer(subscription) {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(subscription)
      });
    } catch (error) {
      console.error('[PWA] Send subscription error:', error);
    }
  }

  // ========================================================================
  // WEB APIs INTEGRATION
  // ========================================================================

  setupWebAPIs() {
    this.setupShareAPI();
    this.setupClipboardAPI();
    this.setupFileHandling();
  }

  /**
   * Web Share API - Share images and results
   */
  setupShareAPI() {
    if (!navigator.share) {
      return;
    }

    // Add share buttons to pages dynamically
    document.addEventListener('image-ready', (e) => {
      const { imageData, title, url } = e.detail;
      this.addShareButton(imageData, title, url);
    });
  }

  async shareImage(imageData, title = 'Check out this image from ImgCraft') {
    if (!navigator.share) {
      // Fallback to copy to clipboard
      this.copyToClipboard(imageData);
      this.showToast('Copied to clipboard!', 'success');
      return;
    }

    try {
      const blob = await fetch(imageData).then((r) => r.blob());
      const file = new File([blob], 'imgcraft-image.png', { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'ImgCraft',
          text: title,
          files: [file]
        });
        this.trackEvent('image_shared');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Share error - silent fail
      }
    }
  }

  /**
   * Clipboard API - Copy and paste images
   */
  setupClipboardAPI() {
    if (!navigator.clipboard) {
      return;
    }

    // Listen for paste events
    document.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items || [];

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          document.dispatchEvent(
            new CustomEvent('clipboard-image', {
              detail: { file }
            })
          );
        }
      }
    });
  }

  async copyToClipboard(imageData) {
    if (!navigator.clipboard) {
      return;
    }

    try {
      const blob = await fetch(imageData).then((r) => r.blob());
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      this.trackEvent('image_copied');
    } catch (error) {
      // Clipboard copy error - silent fail
    }
  }

  /**
   * File Handling API - Open images directly from filesystem
   */
  setupFileHandling() {
    if (!window.launchQueue) {
      return;
    }

    window.launchQueue.setConsumer(async (launchParams) => {
      const files = launchParams.files;
      if (files.length > 0) {
        for (const fileHandle of files) {
          const file = await fileHandle.getFile();
          document.dispatchEvent(
            new CustomEvent('file-launched', {
              detail: { file }
            })
          );
        }
      }
    });
  }

  // ========================================================================
  // OFFLINE SUPPORT & SYNC
  // ========================================================================

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('imgcraft-db', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('pending_actions')) {
          db.createObjectStore('pending_actions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('user_data')) {
          db.createObjectStore('user_data', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('offline_drafts')) {
          db.createObjectStore('offline_drafts', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Add an action to queue for sync when online
   */
  async queueAction(action) {
    if (!this.db) {
      console.warn('[PWA] Database not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('pending_actions', 'readwrite');
      const store = transaction.objectStore('pending_actions');
      const request = store.add({
        id: `${Date.now()}-${Math.random()}`,
        ...action,
        timestamp: Date.now()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.notifyUser('Action saved for sync', 'info');
        resolve(request.result);
      };
    });
  }

  /**
   * Save draft when offline
   */
  async saveDraft(tool, data) {
    if (!this.db) {
      console.warn('[PWA] Database not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction('offline_drafts', 'readwrite');
      const store = transaction.objectStore('offline_drafts');
      const request = store.put({
        id: `${tool}-${Date.now()}`,
        tool,
        data,
        timestamp: Date.now()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.notifyUser('Draft saved locally', 'success');
        resolve(request.result);
      };
    });
  }

  handleOnlineStatus() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[PWA] Online');
      this.notifyUser('Back online', 'success');
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[PWA] Offline');
      this.notifyUser('Working offline - changes will sync when online', 'warning');
    });
  }

  async syncPendingActions() {
    if (!this.db) return;

    console.log('[PWA] Syncing pending actions...');

    // Request service worker to sync
    if (this.sw) {
      const channel = new MessageChannel();
      this.sw.controller.postMessage(
        { type: 'sync-pending-actions' },
        [channel.port2]
      );
    }
  }

  // ========================================================================
  // UPDATES & VERSIONING
  // ========================================================================

  async checkForUpdates() {
    if (!this.sw) return;

    try {
      const response = await fetch('/api/version');
      if (response.ok) {
        const { version } = await response.json();
        const savedVersion = localStorage.getItem('imgcraft_version');

        if (savedVersion && savedVersion !== version) {
          this.showUpdateNotification(version);
        }

        localStorage.setItem('imgcraft_version', version);
      }
    } catch (error) {
      console.warn('[PWA] Version check error:', error);
    }
  }

  notifyUpdate() {
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <i class="fas fa-bell"></i>
        <span>A new version of ImgCraft is available</span>
        <button class="update-reload">Reload</button>
      </div>
    `;

    document.body.appendChild(notification);

    notification.querySelector('.update-reload').addEventListener('click', () => {
      if (this.sw?.controller) {
        this.sw.controller.postMessage({ type: 'skip-waiting' });
      }
      window.location.reload();
    });

    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
  }

  showUpdateNotification(version) {
    console.log('[PWA] New version available:', version);
    this.notifyUser(`ImgCraft ${version} is available!`, 'info', 'Update', () => {
      window.location.reload();
    });
  }

  // ========================================================================
  // EVENT LISTENERS & UTILITY
  // ========================================================================

  setupEventListeners() {
    // Listen to service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from service worker:', event.data);

        const { type, data } = event.data;

        switch (type) {
          case 'cache-cleared':
            this.notifyUser('Cache cleared', 'success');
            break;
          case 'action-synced':
            this.notifyUser(`${data.action} synced successfully`, 'success');
            this.trackEvent('action_synced', { action: data.action });
            break;
          case 'credits-synced':
            document.dispatchEvent(
              new CustomEvent('credits-updated', { detail: data })
            );
            break;
          case 'update-available':
            this.showUpdateNotification(data.version);
            break;
          default:
            console.log('[PWA] Unknown message type:', type);
        }
      });
    }
  }

  addShareButton(imageData, title, url) {
    // Implementation depends on your UI
    const btn = document.createElement('button');
    btn.className = 'share-btn';
    btn.innerHTML = '<i class="fas fa-share-alt"></i> Share';
    btn.addEventListener('click', () => this.shareImage(imageData, title));
  }

  notifyUser(message, type = 'info', actionText = '', actionCallback = null) {
    // Dispatch custom event that can be caught by your existing toast system
    document.dispatchEvent(
      new CustomEvent('pwa-notification', {
        detail: { message, type, actionText, actionCallback }
      })
    );

    // Fallback to console
    console.log(`[PWA] ${type.toUpperCase()}: ${message}`);
  }

  showToast(message, type = 'info') {
    // Dispatch event for your toast system
    this.notifyUser(message, type);
  }

  trackEvent(eventName, eventData = {}) {
    // Track analytics event
    if (window.gtag) {
      window.gtag('event', eventName, eventData);
    }

    // Also send to your server if desired
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, ...eventData })
    }).catch(() => {
      // Silently fail if offline
    });
  }

  getAuthToken() {
    // Get from localStorage, session, or cookie
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  checkIfInstalled() {
    return localStorage.getItem('imgcraft_app_installed') === 'true' ||
           window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Get current cache status
   */
  async getCacheStatus() {
    return new Promise((resolve) => {
      if (!this.sw) {
        resolve({});
        return;
      }

      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.data || {});
      };

      this.sw.controller.postMessage(
        { type: 'get-cache-status' },
        [channel.port2]
      );
    });
  }

  /**
   * Clear specific caches
   */
  async clearCache(cacheNames = ['static', 'images', 'api']) {
    if (!this.sw) return;

    const cachesToClear = cacheNames.map((name) => `imgcraft-v1-${name}`);
    this.sw.controller.postMessage({
      type: 'clear-cache',
      payload: cachesToClear
    });
  }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================

let pwa = null;

// Initialize PWA when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pwa = new ImgCraftPWA();
    pwa.init();
    window.ImgCraftPWA = pwa;
  });
} else {
  pwa = new ImgCraftPWA();
  pwa.init();
  window.ImgCraftPWA = pwa;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImgCraftPWA;
}
