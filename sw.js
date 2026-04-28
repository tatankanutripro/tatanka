// ═══════════════════════════════════════════════════════
//  TATANKA Nutrition Pro — Service Worker v1.0
//  Strategia: Cache-first per assets statici,
//             Network-first per navigazione
// ═══════════════════════════════════════════════════════

const CACHE_NAME = 'tatanka-v1';
const STATIC_ASSETS = [
  '/tatanka/',
  '/tatanka/index.html',
  '/tatanka/manifest.json',
  '/tatanka/icons/icon-192.png',
  '/tatanka/icons/icon-512.png',
];

// ── INSTALL: precache assets fondamentali ──────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: rimuove cache vecchie ───────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: serve dalla cache, fallback network ─────────
self.addEventListener('fetch', event => {
  // Solo richieste GET
  if (event.request.method !== 'GET') return;

  // Font Google: network-first, cache fallback
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets statici: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // Offline fallback: ritorna index.html per navigazione
      if (event.request.mode === 'navigate') {
        return caches.match('/tatanka/index.html');
      }
    })
  );
});
