// ============================================================================
// ImgCraft Progressive Web App - Service Worker
// Comprehensive offline support, caching, background sync, and updates
// ============================================================================

const CACHE_VERSION = 'imgcraft-v6';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_FALLBACK = '/offline';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/docs',
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
  '/static/favicon/favicon.ico',
  '/static/favicon/favicon-96x96.png',
  '/static/favicon/favicon.svg',
  '/static/favicon/apple-touch-icon.png',
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
  '/remove-bg'
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
        const CDN_CACHE = `${CACHE_VERSION}-cdn`;
        const validCaches = [STATIC_CACHE, IMAGE_CACHE, API_CACHE, CDN_CACHE];

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

  // Favicon - treat all favicon variations (including ?v=) as the same cache key
  if (url.pathname === '/favicon.ico' || url.pathname === '/static/favicon.ico' || url.pathname.startsWith('/static/favicon/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request, { cache: 'no-store' });
        if (response && response.status === 200) {
          cache.put(request, response.clone());
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

  // CDN Resources (External Libraries) - Stale-while-revalidate with version tracking
  // Note: Removed cdnjs.cloudflare.com since we're not using glfx.js
  if (url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cdnCacheStrategy(request));
    return;
  }

  // HTML pages (navigation requests) - Network first with offline fallback
  if (request.mode === 'navigate' || request.destination === 'document' ||
    url.pathname === '/' || TOOL_PAGES.includes(url.pathname)) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Static assets - Network first with cache fallback
  if (url.pathname.startsWith('/static/')) {
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

    // Return offline page for navigation requests
    if (request.mode === 'navigate' || request.destination === 'document') {
      const offlinePage = await caches.match(OFFLINE_FALLBACK);
      if (offlinePage) {
        return offlinePage;
      }
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

    // Return offline page for navigation requests
    if (request.mode === 'navigate' || request.destination === 'document') {
      const offlinePage = await caches.match(OFFLINE_FALLBACK);
      if (offlinePage) {
        return offlinePage;
      }
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

    // For navigation requests (HTML pages), show offline page
    if (request.mode === 'navigate' || request.destination === 'document') {
      try {
        const offlinePage = await caches.match(OFFLINE_FALLBACK);
        if (offlinePage) {
          console.log('[ServiceWorker] Serving offline page');
          return offlinePage;
        }
      } catch (offlineError) {
        console.error('[ServiceWorker] Could not load offline page:', offlineError);
      }
    }

    // For other requests, try cache first
    try {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
    } catch (cacheError) {
      console.error('[ServiceWorker] Cache lookup error:', cacheError);
    }

    // Last resort: return error response
    return createOfflineResponse();
  }
}

/**
 * CDN Cache Strategy - Stale-while-revalidate with version tracking
 * Serves cached CDN resources immediately while updating in background
 * Perfect for external libraries like glfx.js, fonts, etc.
 */
async function cdnCacheStrategy(request) {
  const CDN_CACHE = `${CACHE_VERSION}-cdn`;
  const CDN_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  try {
    const cache = await caches.open(CDN_CACHE);
    const cached = await cache.match(request);

    // Check if cached version exists and is still fresh
    if (cached) {
      const cachedDate = cached.headers.get('sw-cached-date');
      const cacheAge = cachedDate ? Date.now() - parseInt(cachedDate) : Infinity;

      // If cache is fresh (< 7 days), return it immediately
      // and update in background (stale-while-revalidate)
      if (cacheAge < CDN_CACHE_DURATION) {
        console.log('[ServiceWorker] Serving CDN from cache:', request.url);

        // Update in background (don't await)
        updateCDNCache(request, cache).catch(err => {
          console.warn('[ServiceWorker] Background CDN update failed:', err.message);
        });

        return cached;
      }
    }

    // No cache or cache expired - fetch from network
    console.log('[ServiceWorker] Fetching CDN from network:', request.url);
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      // Clone response and add cache timestamp
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-cached-date', Date.now().toString());

      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });

      cache.put(request, cachedResponse);
      console.log('[ServiceWorker] CDN resource cached:', request.url);
    }

    return response;

  } catch (error) {
    console.warn('[ServiceWorker] CDN fetch failed, trying cache:', error.message);

    // Network failed - try to serve stale cache
    try {
      const cache = await caches.open(CDN_CACHE);
      const cached = await cache.match(request);

      if (cached) {
        console.log('[ServiceWorker] Serving stale CDN cache (offline):', request.url);
        return cached;
      }
    } catch (cacheError) {
      console.error('[ServiceWorker] CDN cache lookup error:', cacheError);
    }

    // No cache available - return error
    return new Response('CDN resource unavailable offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

/**
 * Update CDN cache in background (stale-while-revalidate)
 */
async function updateCDNCache(request, cache) {
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      const headers = new Headers(response.headers);
      headers.append('sw-cached-date', Date.now().toString());

      const cachedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });

      await cache.put(request, cachedResponse);
      console.log('[ServiceWorker] CDN cache updated in background:', request.url);
    }
  } catch (error) {
    // Silent fail for background updates
    throw error;
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

  // Handle action buttons
  if (event.action === 'dismiss') {
    return; // Do nothing
  }

  // Default action or 'open' action - open the app
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focus existing window and navigate
          client.focus();
          client.postMessage({ type: 'navigate', url: urlToOpen });
          return;
        }
      }

      // If no window found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
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
