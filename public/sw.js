/* Public resources only. Never cache /api, RSC payloads, private history or audio. */
const CACHE = 'dava-public-v1';
const PUBLIC = [
  '/offline/index.html',
  '/offline/offline.js',
  '/offline/offline.css',
  '/offline/phrases.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
  '/manifest.webmanifest',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PUBLIC))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('dava-public-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    event.request.headers.has('rsc') ||
    url.search
  )
    return;
  if (PUBLIC.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    return;
  }
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline/index.html')));
  }
});
