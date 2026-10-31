// Service Worker - v2 (cache-busted)
const CACHE_NAME = 'woxy-cache-v2';

self.addEventListener('install', (event) => {
  // Skip waiting immediately so new SW activates right away
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/logot.svg',
        '/manifest.json'
      ]).catch((err) => console.log('SW cache error during install', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  // Delete ALL old caches to ensure no stale content
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For JS/CSS assets (hashed filenames) - cache first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // For navigation requests - network first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }

  // Everything else - network first
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
