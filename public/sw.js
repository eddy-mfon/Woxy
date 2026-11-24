// Woxy Service Worker - Full Offline Support
const CACHE_NAME = 'woxy-v3';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logot.svg',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/assets/journal-hero.jpg',
  '/assets/banner.jpg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Cache precache error:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
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

  // Skip external AI APIs from caching (transcription requests must not be cached by SW)
  if (
    url.hostname.includes('groq.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('openai.com') ||
    url.hostname.includes('vercel-insights.com')
  ) {
    return;
  }

  // 1. Navigation requests (HTML pages) -> network-first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkRes) => {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkRes;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // 2. Bundled assets (JS, CSS, static images) -> Stale-while-revalidate or Cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache for next time
        fetch(event.request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const clone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
          })
          .catch(() => {
            // Offline - ignore network error since we had cached response
          });
        return cachedResponse;
      }

      // If not in cache, fetch and store in cache
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          // If navigation or resource fails offline and is not cached
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          return new Response('Network unavailable', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
