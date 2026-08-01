// Minimal offline-first service worker.
// Caches the app shell on install so the app opens even with no connection.
// Your study session data itself lives in localStorage, not here.

const CACHE_NAME = 'study-log-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './js/storage.js',
  './js/date-utils.js',
  './js/streak.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Cache-first for app shell files, falling back to network for anything else.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          // Offline and not cached - only matters for the HTML shell itself.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        })
      );
    })
  );
});
