const CACHE_NAME = 'olympic-menu-v1';
const PRE_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); return null; })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // API menu: try network then cache fallback (keep cache fresh)
  if (url.pathname.startsWith('/api/menu')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(event.request)
          .then((res) => { cache.put(event.request, res.clone()); return res; })
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // Navigation requests (HTML) - network first, fallback to cached index.html
  if (event.request.mode === 'navigate' || (event.request.headers.get && event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Other resources: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
      return res;
    }))
  );
});
