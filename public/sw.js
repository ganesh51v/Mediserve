/* MediServe Precision Healthcare Systems - Service Worker */
const CACHE_VERSION = 'mediserve-v1.0.0';
const STATIC_CACHE = `mediserve-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `mediserve-dynamic-${CACHE_VERSION}`;
const FONT_CACHE = `mediserve-fonts-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-192x192.png',
  '/maskable-icon-512x512.png',
];

// Install: precache essential app shell assets and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(async (cache) => {
        // Use resilient caching so missing individual files don't fail installation
        const cachePromises = PRECACHE_ASSETS.map(async (asset) => {
          try {
            const response = await fetch(asset, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(asset, response);
            }
          } catch (err) {
            console.warn('[MediServe SW] Precache skipped asset:', asset, err);
          }
        });
        await Promise.allSettled(cachePromises);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: prune outdated caches and claim existing clients
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, FONT_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('mediserve-') && !currentCaches.includes(name))
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch routing with specialized caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Navigation requests: Network-first with SPA offline app shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/index.html');
          if (shell) return shell;
          return caches.match('/');
        })
    );
    return;
  }

  // 2. Google Fonts & Web Fonts: Stale-while-revalidate
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. API calls: Network-first with dynamic cache fallback for GET queries
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') {
      // Non-GET requests pass through to server
      return;
    }
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'You are currently working in offline mode.' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // 4. Static assets (JS, CSS, images, SVGs): Stale-while-revalidate
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Skip waiting triggered from client update prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

