// Service Worker for WB OBC Archive - Offline Support
const CACHE_NAME = 'wb-obc-archive-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './timeline.html',
  './litigation.html',
  './obc-list.html',
  './documents.html',
  './evidence.html',
  './record-guide.html',
  './inventory.html',
  './obc-basics.html',
  './methods.html',
  './reports.html',
  './about.html',
  './contribute.html',
  './pwa-manifest.json',
  './css/shared.css',
  './css/site.css',
  './js/i18n.js',
  './js/site.js',
  './data/i18n.json',
  './obcwb-flat-dark-logo.webp',
  './obcwb-flat-light-logo.webp',
  './CRG_LOGO_light.png',
  './CRG_Logo_Dark.png',
  './obc_documents.json',
  './obc_classes.json',
  './timeline_events.json',
  './case_events.json',
  './public_hearings.json',
  './document_inventory.json',
  './case_manifest.json',
  './obc_pdf_manifest.json',
  './obc_hearing_pdf_manifest.json',
  './related_sources_catalog.json',
  './supplemental_documents.json'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(asset => cache.add(asset))
      );
    }).catch((err) => {
      console.log('[SW] Cache install error:', err);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external requests
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) {
    // Allow GitHub raw content for PDFs when not on GitHub Pages
    if (url.hostname === 'raw.githubusercontent.com') {
      event.respondWith(fetch(event.request));
    }
    return;
  }

  // App shell, scripts, styles, and JSON must update when the bundle changes.
  // Use the network first for these files, while retaining the cache as an
  // offline fallback. Large PDF assets remain cache-first below.
  const isAppFile = /\.(?:html|js|css|json)$/.test(url.pathname) || event.request.mode === 'navigate';
  if (isAppFile) {
    event.respondWith(
      fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version
        return cachedResponse;
      }
      
      // Not in cache - fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Don't cache failed requests
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        
        // Clone and cache successful responses
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
