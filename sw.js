// Service worker de Crecé. Subí el número de VERSION cada vez que cambies archivos.
const VERSION = 'v48';
const CACHE = 'cuentas-' + VERSION;
const FONTS = 'cuentas-fuentes';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Tipografías de Google: se guardan al verse y se sirven sin conexión.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONTS).then(cache =>
        cache.match(req).then(hit => {
          const red = fetch(req).then(r => { cache.put(req, r.clone()); return r; }).catch(() => hit);
          return hit || red;
        })
      )
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Archivos propios: primero la copia local, y se actualiza en segundo plano.
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(req, { ignoreSearch: true }).then(hit => {
        const red = fetch(req)
          .then(r => { if (r.ok) cache.put(req, r.clone()); return r; })
          .catch(() => hit || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
        return hit || red;
      })
    )
  );
});
