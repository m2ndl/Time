/* Offline support: network first so updates arrive at once, the cached copy when offline. */
const CACHE = 'time-offline-1';
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-180.png", "./icons/icon-maskable-512.png"];
const REMOTE = [];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all([
    cache.addAll(ASSETS),
    ...REMOTE.map(url => fetch(url, { mode: 'no-cors' }).then(res => cache.put(url, res)).catch(() => {}))
  ])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const allowed = url.origin === self.location.origin ||
    ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.tailwindcss.com'].includes(url.hostname);
  if (!allowed) return;
  const key = req.mode === 'navigate' ? './index.html' : req;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key, { ignoreSearch: true }).then(hit => hit || caches.match(req.url)))
  );
});
