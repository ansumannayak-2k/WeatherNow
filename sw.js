// sw.js — simple service worker: caches static assets and API responses (basic)

const STATIC = 'wn-static-v1';
const RUNTIME = 'wn-runtime-v1';
const PRECACHE_URLS = [
  '/', '/index.html', '/styles.css', '/script.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC).then(cache => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) For OpenWeather API requests: network-first with fallback to cache
  if (url.hostname.includes('api.openweathermap.org')) {
    event.respondWith(
      fetch(req).then(res => {
        // clone & cache JSON responses
        if (res.ok) {
          const copy = res.clone();
          caches.open(RUNTIME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 2) For other requests: cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      return caches.open(RUNTIME).then(cache => {
        cache.put(req, res.clone());
        return res;
      });
    }))
  );
});
