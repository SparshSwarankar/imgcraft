// ============================================================================
// ImgCraft Progressive Web App - Service Worker
// Comprehensive offline support, caching, background sync, and updates
// ============================================================================

const CACHE_VERSION = 'imgcraft-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_FALLBACK = '/offline';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/static/css/style.css',
  '/static/css/footer.css',
  '/static/css/review-modal.css',
  '/static/css/ads.css',
  '/static/js/auth.js',
  '/static/js/credits.js',
  '/static/js/modal.js',
  '/static/js/review-modal.js',
  '/static/js/ads.js',
  '/static/js/background.js',
  '/static/js/pwa.js',
  '/static/image/Logo.jpg',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Tool pages to cache on first visit
const TOOL_PAGES = [
  '/resize',
  '/compress',
  '/convert',
  '/crop',
  '/filter',
  '/watermark',
  '/collage',
  '/upscale',
  '/exif',
  '/palette',
  '/remove_bg'
];

// Cache size limits
const CACHE_LIMITS = {
  images: 50,
  api: 100,
  static: 50
};

// Track pending actions for background sync
const PENDING_ACTIONS_KEY = 'imgcraft_pending_actions';

// ============================================================================
// INSTALL EVENT - Cache static assets
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        await staticCache.addAll(STATIC_ASSETS);
        console.log('[ServiceWorker] Static assets cached');

        // Attempt to cache tool pages (non-critical)
        const toolCache = await caches.open(STATIC_CACHE);
        TOOL_PAGES.forEach((page) => {
          toolCache.add(page).catch(() => {
            // Silently fail if tool page isn't available yet
          });
        });

        // Skip waiting and claim clients
        self.skipWaiting();
      } catch (error) {
        console.error('[ServiceWorker] Install error:', error);
      }
    })()
  );
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const validCaches = [STATIC_CACHE, IMAGE_CACHE, API_CACHE];

        await Promise.all(
          cacheNames.map((name) => {
            if (!validCaches.includes(name) && name.startsWith('imgcraft-')) {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            }
          })
        );

        self.clients.claim();
        console.log('[ServiceWorker] Activation complete');
      } catch (error) {
        console.error('[ServiceWorker] Activation error:', error);
      }
    })()
  );
});

// ============================================================================
// FETCH EVENT - Intelligent caching strategy
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, external resources, and certain URLs
  if (request.method !== 'GET') {
    return;
  }

  // Favicon - treat all /favicon.ico variations (including ?v=) as the same cache key
  if (url.pathname === '/favicon.ico') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match('/favicon.ico');
        if (cached) return cached;

        const response = await fetch('/favicon.ico', { cache: 'no-store' });
        if (response && response.status === 200) {
          cache.put('/favicon.ico', response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // API requests - Network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Images - Cache first with network fallback
  if (request.destination === 'image' || url.pathname.startsWith('/static/image/')) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // CSS/JS - Cache first with network fallback
  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Tool pages and HTML - Network first with cache fallback
  if (url.pathname.startsWith('/static/') || url.pathname === '/' || TOOL_PAGES.includes(url.pathname)) {
    event.respondWith(networkFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Default - Network first with offline fallback
  event.respondWith(networkFirstWithOfflineFallback(request));
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Cache First Strategy - Return cached version if available, else fetch from network
 * Good for: Static assets that change infrequently
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);

    // Only cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());

      // Enforce cache size limits
      await enforceCacheLimit(cacheName, CACHE_LIMITS[cacheName] || 50);
    }

    return response;
  } catch (error) {
    console.error('[ServiceWorker] Cache first error:', error);

    // Return offline page for HTML requests
    if (request.destination === 'document') {
      return caches.match(OFFLINE_FALLBACK);
    }

    return createOfflineResponse();
  }
}

/**
 * Network First Strategy - Fetch from network first, fallback to cache
 * Good for: Dynamic content that should be fresh when possible
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      )
    ]);

    // Cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());

      // Enforce cache size limits
      await enforceCacheLimit(cacheName, CACHE_LIMITS[cacheName] || 50);
    }

    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network first failed, trying cache:', error.message);

    try {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
    } catch (cacheError) {
      console.error('[ServiceWorker] Cache lookup error:', cacheError);
    }

    // Return offline page for HTML requests
    if (request.destination === 'document') {
      return caches.match(OFFLINE_FALLBACK);
    }

    return createOfflineResponse();
  }
}

/**
 * Network First with Offline Fallback
 */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      )
    ]);

    if (response && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network first fallback:', error.message);

    try {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
    } catch (cacheError) {
      console.error('[ServiceWorker] Cache lookup error:', cacheError);
    }

    if (request.destination === 'document') {
      return caches.match(OFFLINE_FALLBACK);
    }

    return createOfflineResponse();
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Enforce cache size limits using LRU (Least Recently Used) eviction
 */
async function enforceCacheLimit(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    if (keys.length > maxItems) {
      // Delete oldest items (first items in the array)
      const itemsToDelete = keys.length - maxItems;
      for (let i = 0; i < itemsToDelete; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Cache limit enforcement error:', error);
  }
}

/**
 * Create an offline response object
 */
function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'offline',
      message: 'You are currently offline. Some features may not be available.',
      timestamp: new Date().toISOString()
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    }
  );
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync triggered:', event.tag);

  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  } else if (event.tag === 'sync-credits') {
    event.waitUntil(syncCredits());
  } else if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
});

/**
 * Sync pending actions from IndexedDB
 */
async function syncPendingActions() {
  try {
    const db = await openDB();
    const pending = await getAllFromDB(db, 'pending_actions');

    for (const action of pending) {
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
          await deleteFromDB(db, 'pending_actions', action.id);

          // Notify clients of successful sync
          notifyClients({
            type: 'action-synced',
            action: action.type,
            success: true
          });
        }
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync action:', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync pending actions error:', error);
    throw error; // Retry by the browser
  }
}

/**
 * Sync user credits
 */
async function syncCredits() {
  try {
    const response = await fetch('/api/credits', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${await getStoredToken()}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      const db = await openDB();
      await putInDB(db, 'user_data', { key: 'credits', value: data });

      // Notify clients
      notifyClients({
        type: 'credits-synced',
        credits: data.credits
      });
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync credits error:', error);
    throw error;
  }
}

/**
 * Sync all user data
 */
async function syncUserData() {
  try {
    const token = await getStoredToken();
    if (!token) return;

    const response = await fetch('/api/user', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const userData = await response.json();
      const db = await openDB();
      await putInDB(db, 'user_data', { key: 'user', value: userData });

      notifyClients({
        type: 'user-synced',
        user: userData
      });
    }
  } catch (error) {
    console.error('[ServiceWorker] Sync user data error:', error);
    throw error;
  }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');

  if (!event.data) {
    console.warn('[ServiceWorker] Push event has no data');
    return;
  }

  try {
    const options = event.data.json();
    event.waitUntil(
      self.registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/static/image/icon-192x192.png',
        badge: options.badge || '/static/image/icon-192x192.png',
        tag: options.tag || 'imgcraft-notification',
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || [],
        data: options.data || {}
      })
    );
  } catch (error) {
    console.error('[ServiceWorker] Push notification error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Check if there's already a window open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If no window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })()
  );
});

// ============================================================================
// MESSAGE HANDLING (Communication with clients)
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data.type);

  const { type, payload } = event.data;

  switch (type) {
    case 'clear-cache':
      handleClearCache(payload);
      break;
    case 'cache-asset':
      handleCacheAsset(payload);
      break;
    case 'get-cache-status':
      handleGetCacheStatus(event.ports[0]);
      break;
    case 'add-pending-action':
      handleAddPendingAction(payload);
      break;
    case 'subscribe-notifications':
      handleSubscribeNotifications(event.ports[0], payload);
      break;
    case 'skip-waiting':
      self.skipWaiting();
      break;
    default:
      console.warn('[ServiceWorker] Unknown message type:', type);
  }
});

async function handleClearCache(cacheNames) {
  try {
    for (const cacheName of cacheNames || [STATIC_CACHE, IMAGE_CACHE, API_CACHE]) {
      await caches.delete(cacheName);
    }
    notifyClients({ type: 'cache-cleared' });
  } catch (error) {
    console.error('[ServiceWorker] Clear cache error:', error);
  }
}

async function handleCacheAsset(payload) {
  try {
    const { url, cacheName } = payload;
    const cache = await caches.open(cacheName || STATIC_CACHE);
    await cache.add(url);
  } catch (error) {
    console.error('[ServiceWorker] Cache asset error:', error);
  }
}

async function handleGetCacheStatus(port) {
  try {
    const cacheNames = await caches.keys();
    const status = {};

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      status[cacheName] = keys.length;
    }

    port.postMessage({ type: 'cache-status', data: status });
  } catch (error) {
    console.error('[ServiceWorker] Get cache status error:', error);
    port.postMessage({ type: 'error', error: error.message });
  }
}

async function handleAddPendingAction(payload) {
  try {
    const db = await openDB();
    const action = {
      id: `${Date.now()}-${Math.random()}`,
      ...payload,
      timestamp: Date.now()
    };
    await putInDB(db, 'pending_actions', action);

    // Attempt background sync
    if (self.registration.sync) {
      self.registration.sync.register('sync-pending-actions');
    }
  } catch (error) {
    console.error('[ServiceWorker] Add pending action error:', error);
  }
}

async function handleSubscribeNotifications(port, payload) {
  try {
    const { endpoint, auth, p256dh } = payload;

    // Store subscription details for server-side push
    const db = await openDB();
    await putInDB(db, 'subscription', {
      key: 'push_subscription',
      value: { endpoint, auth, p256dh }
    });

    port.postMessage({ type: 'subscribed', success: true });
  } catch (error) {
    console.error('[ServiceWorker] Subscribe notifications error:', error);
    port.postMessage({ type: 'error', error: error.message });
  }
}

// ============================================================================
// UTILITY FUNCTIONS - IndexedDB Operations
// ============================================================================

const DB_NAME = 'imgcraft-db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('pending_actions')) {
        db.createObjectStore('pending_actions', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('user_data')) {
        db.createObjectStore('user_data', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('subscription')) {
        db.createObjectStore('subscription', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('offline_drafts')) {
        db.createObjectStore('offline_drafts', { keyPath: 'id' });
      }
    };
  });
}

function putInDB(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getFromDB(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getAllFromDB(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromDB(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// ============================================================================
// UTILITY FUNCTIONS - Client Notifications
// ============================================================================

function notifyClients(message) {
  clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

async function getStoredToken() {
  try {
    const db = await openDB();
    const userData = await getFromDB(db, 'user_data', 'token');
    return userData?.value || null;
  } catch (error) {
    console.error('[ServiceWorker] Get stored token error:', error);
    return null;
  }
}

// ============================================================================
// PERIODIC BACKGROUND SYNC (if supported)
// ============================================================================

self.addEventListener('periodicsync', (event) => {
  console.log('[ServiceWorker] Periodic sync triggered:', event.tag);

  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  } else if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
});

async function checkForUpdates() {
  try {
    const response = await fetch('/api/version', {
      method: 'GET'
    });

    if (response.ok) {
      const { version, updateUrl } = await response.json();

      // Check if we need to update
      const db = await openDB();
      const stored = await getFromDB(db, 'user_data', 'app_version');

      if (stored?.value !== version) {
        notifyClients({
          type: 'update-available',
          version,
          updateUrl
        });
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Check updates error:', error);
  }
}

console.log('[ServiceWorker] Service Worker loaded and ready');
