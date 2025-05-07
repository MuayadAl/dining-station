const CACHE_NAME = 'foodheaven-cache-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/landing',
  '/about',
  '/contact',
  '/manifest.json',
  '/offline.html',
  '/icons/web-app-manifest-192x192.png',
  '/icons/web-app-manifest-512x512.png',
];

// On install – cache static files
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installed');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// On fetch – respond with cache or offline fallback
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // ✅ Runtime cache for CSS files
  if (requestUrl.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return (
          cachedResponse ||
          fetch(event.request).then((response) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
              return response;
            });
          })
        );
      })
    );
    return;
  }

  // ✅ Default behavior: try network, fallback to cache or offline.html
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((response) => {
        return response || caches.match('/offline.html');
      })
    )
  );
});

// On activate – clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
