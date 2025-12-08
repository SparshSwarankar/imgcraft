// ============================================================================
// ImgCraft PWA - Advanced Usage Examples & Customization
// ============================================================================

/**
 * Advanced patterns and examples for PWA customization
 */

// ============================================================================
// 1. CUSTOM INSTALL PROMPT WITH ANALYTICS
// ============================================================================

class AdvancedInstallPrompt {
  constructor(pwa) {
    this.pwa = pwa;
    this.promptShown = 0;
    this.promptAccepted = 0;
    this.promptDismissed = 0;
  }

  trackPromptAnalytics() {
    this.pwa.trackEvent('install_prompt_shown', {
      total_shown: this.promptShown,
      total_accepted: this.promptAccepted,
      total_dismissed: this.promptDismissed,
      acceptance_rate: this.promptShown > 0 
        ? (this.promptAccepted / this.promptShown * 100).toFixed(2)
        : 0
    });
  }

  setupAdvancedPrompt() {
    // Show prompt only after user has used app for 30 seconds
    if (performance.now() > 30000 && this.promptShown === 0) {
      this.promptShown++;
      this.pwa.showInstallPrompt();
      this.trackPromptAnalytics();
    }
  }
}

// ============================================================================
// 2. INTELLIGENT OFFLINE DETECTION
// ============================================================================

class OfflineManager {
  constructor(pwa) {
    this.pwa = pwa;
    this.connectionQuality = 'unknown';
    this.lastPingTime = 0;
    this.consecutiveFailures = 0;
    this.maxRetries = 3;
  }

  async checkConnectionQuality() {
    const start = performance.now();
    
    try {
      const response = await fetch('/ping', {
        method: 'HEAD',
        cache: 'no-store'
      });
      
      const latency = performance.now() - start;
      
      if (latency < 100) {
        this.connectionQuality = 'fast';
      } else if (latency < 500) {
        this.connectionQuality = 'normal';
      } else if (latency < 2000) {
        this.connectionQuality = 'slow';
      } else {
        this.connectionQuality = 'very-slow';
      }
      
      this.consecutiveFailures = 0;
      return this.connectionQuality;
    } catch (error) {
      this.consecutiveFailures++;
      
      if (this.consecutiveFailures >= this.maxRetries) {
        this.connectionQuality = 'offline';
      }
      
      return this.connectionQuality;
    }
  }

  async retryWithBackoff(fn, maxAttempts = 3) {
    let attempt = 0;
    let lastError = null;
    
    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

// ============================================================================
// 3. SMART CACHING WITH ANALYTICS
// ============================================================================

class SmartCacheManager {
  constructor(pwa) {
    this.pwa = pwa;
    this.cacheLogs = [];
    this.maxLogs = 1000;
  }

  async getCacheAnalytics() {
    const status = await this.pwa.getCacheStatus();
    
    return {
      static_cache: status['imgcraft-v1-static'] || 0,
      image_cache: status['imgcraft-v1-images'] || 0,
      api_cache: status['imgcraft-v1-api'] || 0,
      total_cached_items: Object.values(status).reduce((a, b) => a + b, 0),
      total_cache_size_mb: this.estimateCacheSize(status),
      logs: this.cacheLogs.slice(-20)
    };
  }

  estimateCacheSize(cacheStatus) {
    // Rough estimate: avg 100KB per cached item
    const totalItems = Object.values(cacheStatus).reduce((a, b) => a + b, 0);
    return (totalItems * 100) / 1024;
  }

  logCacheOperation(operation, cacheName, size) {
    this.cacheLogs.push({
      timestamp: new Date().toISOString(),
      operation,
      cacheName,
      size
    });
    
    if (this.cacheLogs.length > this.maxLogs) {
      this.cacheLogs.shift();
    }
  }

  async optimizeCache() {
    const analytics = await this.getCacheAnalytics();
    
    if (analytics.total_cache_size_mb > 50) {
      // Cache is getting large, suggest cleanup
      this.pwa.notifyUser('Cache is getting large. Clearing old data...', 'info');
      await this.pwa.clearCache();
    }
  }
}

// ============================================================================
// 4. BACKGROUND SYNC WITH RETRY LOGIC
// ============================================================================

class SmartBackgroundSync {
  constructor(pwa) {
    this.pwa = pwa;
    this.syncQueue = [];
    this.syncInProgress = false;
    this.maxRetries = 5;
  }

  async addToSyncQueue(action) {
    this.syncQueue.push({
      ...action,
      retries: 0,
      timestamp: Date.now()
    });

    // Try to sync immediately if online
    if (this.pwa.isOnline) {
      await this.syncQueue();
    }
  }

  async syncQueue() {
    if (this.syncInProgress || !this.pwa.isOnline) {
      return;
    }

    this.syncInProgress = true;

    while (this.syncQueue.length > 0) {
      const action = this.syncQueue[0];

      try {
        const response = await fetch(action.endpoint, {
          method: action.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${action.token}`
          },
          body: JSON.stringify(action.data)
        });

        if (response.ok) {
          this.syncQueue.shift();
          this.pwa.trackEvent('action_synced', { type: action.type });
        } else if (response.status >= 500) {
          // Server error, retry
          throw new Error(`Server error: ${response.status}`);
        } else if (response.status >= 400) {
          // Client error, don't retry
          this.syncQueue.shift();
          this.pwa.notifyUser(`Failed to sync: ${response.statusText}`, 'error');
        }
      } catch (error) {
        action.retries++;

        if (action.retries >= this.maxRetries) {
          this.syncQueue.shift();
          this.pwa.notifyUser('Failed to sync after multiple retries', 'error');
        } else {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, action.retries) * 1000)
          );
        }
      }
    }

    this.syncInProgress = false;
  }
}

// ============================================================================
// 5. PUSH NOTIFICATION WITH CUSTOM ACTIONS
// ============================================================================

class AdvancedPushHandler {
  constructor(pwa) {
    this.pwa = pwa;
    this.setupNotificationHandlers();
  }

  setupNotificationHandlers() {
    // Handle notification clicks
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'notification-action') {
          this.handleNotificationAction(event.data);
        }
      });
    }

    // Listen for notification click in SW
    if ('Notification' in window) {
      Notification.requestPermission().then(() => {
        // Setup custom handlers for specific notification types
        this.registerCustomHandlers();
      });
    }
  }

  registerCustomHandlers() {
    document.addEventListener('notificationclick', (event) => {
      const { notification } = event;
      const data = notification.data;

      switch (data.type) {
        case 'credit_alert':
          event.notification.close();
          window.location.href = '/billing';
          break;

        case 'image_ready':
          event.notification.close();
          window.location.href = `/tool/${data.tool_id}`;
          break;

        case 'update_available':
          if (event.action === 'update') {
            if (this.pwa.sw && this.pwa.sw.controller) {
              this.pwa.sw.controller.postMessage({ type: 'skip-waiting' });
            }
            window.location.reload();
          }
          event.notification.close();
          break;

        default:
          window.location.href = data.url || '/';
          event.notification.close();
      }
    });
  }

  async sendCustomNotification(title, options = {}) {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          icon: '/static/image/icon-192x192.png',
          badge: '/static/image/icon-192x192.png',
          ...options
        });
      }
    }
  }

  // Show credit alert with action
  async showCreditAlert(creditsRemaining) {
    await this.sendCustomNotification('Low Credits', {
      body: `You have ${creditsRemaining} credits remaining`,
      tag: 'credit-alert',
      requireInteraction: true,
      actions: [
        { action: 'buy', title: 'Buy Credits' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      data: {
        type: 'credit_alert',
        url: '/billing'
      }
    });
  }

  // Show update notification with action
  async showUpdateNotification(version) {
    await this.sendCustomNotification('ImgCraft Update Available', {
      body: `Version ${version} is now available`,
      tag: 'update-notification',
      requireInteraction: false,
      actions: [
        { action: 'update', title: 'Update Now' },
        { action: 'later', title: 'Later' }
      ],
      data: {
        type: 'update_available',
        version
      }
    });
  }
}

// ============================================================================
// 6. OFFLINE DRAFT AUTO-SAVE
// ============================================================================

class AutoSaveDraftManager {
  constructor(pwa, toolName) {
    this.pwa = pwa;
    this.toolName = toolName;
    this.lastSaveTime = 0;
    this.saveInterval = 30000; // Save every 30 seconds
    this.isDirty = false;
    this.currentDraft = null;
  }

  markDirty() {
    this.isDirty = true;
  }

  async startAutoSave(getDataFn) {
    setInterval(async () => {
      if (this.isDirty && Date.now() - this.lastSaveTime > this.saveInterval) {
        try {
          const data = await getDataFn();
          await this.pwa.saveDraft(this.toolName, data);
          this.lastSaveTime = Date.now();
          this.isDirty = false;
        } catch (error) {
          console.error('[AutoSave] Error:', error);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  async loadLastDraft() {
    // Load from IndexedDB
    try {
      const db = await this.pwa.db;
      // TODO: Implement draft loading
      return null;
    } catch (error) {
      console.error('[AutoSave] Error loading draft:', error);
      return null;
    }
  }
}

// ============================================================================
// 7. PERFORMANCE MONITOR
// ============================================================================

class PWAPerformanceMonitor {
  constructor(pwa) {
    this.pwa = pwa;
    this.metrics = {};
    this.startMonitoring();
  }

  startMonitoring() {
    // Core Web Vitals
    if ('web-vital' in window) {
      this.measureCoreWebVitals();
    }

    // Resource timing
    if (window.performance && window.performance.getEntriesByType) {
      this.measureResourceTiming();
    }
  }

  measureCoreWebVitals() {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.metrics.LCP = entry.renderTime || entry.loadTime;
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP monitoring not supported');
      }
    }
  }

  measureResourceTiming() {
    const resources = window.performance.getEntriesByType('resource');
    
    this.metrics.resources = {
      total: resources.length,
      cached: resources.filter(r => r.transferSize === 0).length,
      average_load_time: resources.reduce((sum, r) => sum + r.duration, 0) / resources.length
    };
  }

  reportMetrics() {
    this.pwa.trackEvent('performance_metrics', this.metrics);
  }
}

// ============================================================================
// 8. COMPLETE PWA SETUP WITH ALL FEATURES
// ============================================================================

async function setupAdvancedPWA() {
  const pwa = window.ImgCraftPWA;

  // Initialize advanced modules
  const offlineManager = new OfflineManager(pwa);
  const cacheManager = new SmartCacheManager(pwa);
  const syncManager = new SmartBackgroundSync(pwa);
  const pushHandler = new AdvancedPushHandler(pwa);
  const performanceMonitor = new PWAPerformanceMonitor(pwa);

  // Start monitoring
  setInterval(() => {
    offlineManager.checkConnectionQuality();
  }, 30000); // Check every 30 seconds

  // Optimize cache periodically
  setInterval(() => {
    cacheManager.optimizeCache();
  }, 60000); // Check every minute

  // Report metrics
  setInterval(() => {
    performanceMonitor.reportMetrics();
  }, 300000); // Report every 5 minutes

  // Listen for online event
  window.addEventListener('online', () => {
    syncManager.syncQueue();
  });

  console.log('[PWA] Advanced features initialized');

  // Return managers for external use
  return {
    offline: offlineManager,
    cache: cacheManager,
    sync: syncManager,
    notifications: pushHandler,
    performance: performanceMonitor
  };
}

// ============================================================================
// 9. CUSTOM OFFLINE EXPERIENCE
// ============================================================================

class OfflineUX {
  constructor(pwa) {
    this.pwa = pwa;
    this.setupOfflineUI();
  }

  setupOfflineUI() {
    window.addEventListener('offline', () => {
      this.showOfflineBanner();
      this.disableOnlineOnlyFeatures();
    });

    window.addEventListener('online', () => {
      this.hideOfflineBanner();
      this.enableAllFeatures();
    });

    if (!navigator.onLine) {
      this.showOfflineBanner();
      this.disableOnlineOnlyFeatures();
    }
  }

  showOfflineBanner() {
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.className = 'offline-banner';
    banner.innerHTML = `
      <div class="offline-banner-content">
        <i class="fas fa-wifi-off"></i>
        <span>You're offline - Using cached data</span>
        <span class="offline-banner-sync" id="sync-status"></span>
      </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    // Add styles
    const style = document.createElement('style');
    style.innerHTML = `
      #offline-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff9800;
        color: white;
        padding: 8px;
        text-align: center;
        z-index: 9999;
        animation: slideDown 0.3s ease;
      }

      .offline-banner-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .offline-banner-sync {
        margin-left: auto;
        font-size: 12px;
      }

      body.offline-mode {
        padding-top: 40px;
      }

      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
    document.body.classList.add('offline-mode');
  }

  hideOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (banner) {
      banner.style.animation = 'slideUp 0.3s ease';
      setTimeout(() => banner.remove(), 300);
    }
    document.body.classList.remove('offline-mode');
  }

  disableOnlineOnlyFeatures() {
    // Disable buttons that require online
    const buttons = document.querySelectorAll('[data-requires-online]');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.title = 'Feature requires internet connection';
    });
  }

  enableAllFeatures() {
    const buttons = document.querySelectorAll('[data-requires-online]');
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.title = '';
    });
  }
}

// ============================================================================
// 10. INITIALIZATION
// ============================================================================

// When page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    // Setup advanced PWA features
    const advancedPWA = await setupAdvancedPWA();
    
    // Setup offline UX
    new OfflineUX(window.ImgCraftPWA);

    // Expose globally
    window.AdvancedPWA = advancedPWA;

    console.log('[PWA] Advanced PWA setup complete');
  });
} else {
  // DOM already loaded
  setupAdvancedPWA().then(adv => {
    window.AdvancedPWA = adv;
    new OfflineUX(window.ImgCraftPWA);
  });
}
