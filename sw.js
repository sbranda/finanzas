/* Service worker de Al toque.
   Guarda la app en el dispositivo para que abra sin conexión.
   Si cambiás algún archivo, subí el número de CACHE para que se actualice. */
var CACHE = 'tareas-diarias-v93';
var CACHE_AVISOS = 'tareas-diarias-avisos';
var ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.filter(function (k) { return k !== CACHE && k !== CACHE_AVISOS; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Responde desde el dispositivo y actualiza en segundo plano cuando hay red. */
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (guardado) {
      var red = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copia = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return res;
      }).catch(function () { return guardado || caches.match('./index.html'); });
      return guardado || red;
    })
  );
});

/* Avisos de fechas límite. La página guarda en la caché 'tareas-diarias-avisos' la lista de avisos;
   cuando el navegador despierta al service worker (sincronización periódica, solo en algunos
   navegadores y a su ritmo) mostramos los que ya vencieron y no se mostraron. */
var VENTANA_AVISO = 12 * 3600000;
function revisarAvisos() {
  var url = new URL('avisos.json', self.registration.scope).href, ahora = Date.now();
  return caches.open(CACHE_AVISOS).then(function (c) {
    return c.match(url).then(function (r) { return r ? r.json() : null; }).then(function (j) {
      if (!j || !j.plan) return;
      var hechos = j.hechos || {}, mejor = {}, marcar = [];
      j.plan.forEach(function (a) {
        if (a.at > ahora || ahora - a.at > VENTANA_AVISO || hechos[a.key]) return;
        var p = mejor[a.id];
        if (!p) mejor[a.id] = a;
        else if (a.at > p.at) { marcar.push(p.key); mejor[a.id] = a; }
        else marcar.push(a.key);
      });
      var mostrar = Object.keys(mejor).map(function (k) { return mejor[k]; });
      if (!mostrar.length && !marcar.length) return;
      mostrar.forEach(function (a) { hechos[a.key] = ahora; });
      marcar.forEach(function (k) { hechos[k] = ahora; });
      j.hechos = hechos;
      return Promise.all(mostrar.map(function (a) {
        return self.registration.showNotification(a.titulo, { body: a.cuerpo, tag: a.key, icon: 'icon-192.png', badge: 'icon-192.png', lang: 'es' });
      })).then(function () {
        return c.put(url, new Response(JSON.stringify(j), { headers: { 'Content-Type': 'application/json' } }));
      });
    });
  });
}
self.addEventListener('periodicsync', function (e) {
  if (e.tag === 'revisar-tareas') e.waitUntil(revisarAvisos().catch(function () {}));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) return cs[i].focus(); }
    return self.clients.openWindow('./');
  }));
});
