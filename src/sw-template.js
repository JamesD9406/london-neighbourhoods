// Generated into dist/sw.js at build time (see astro.config.mjs).
// Cache-first for the whole site, so it opens with no connection after one visit.
const CACHE = 'london-guide-__VERSION__';
const FILES = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('london-guide-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith(
    // ignoreVary: servers often send "Vary: Origin" on JS, and module-script requests carry an
    // Origin header that the precache requests didn't, which would otherwise miss the cache.
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).catch(() =>
        // Offline and not cached: fall back to the page for this language.
        req.mode === 'navigate'
          ? caches.match(`/${url.pathname.split('/')[1] || 'en'}/`).then((r) => r || caches.match('/en/'))
          : Response.error(),
      );
    }),
  );
});
