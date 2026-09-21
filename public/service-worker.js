// VinAPIay Service Worker — v3 (auto-update)
const CACHE_VERSION = 'v3.1';
const CACHE_NAME = 'vinapiay-' + CACHE_VERSION;

const PRECACHE = [
  '/',
  '/style.css',
  '/native.css',
  '/app.js',
  '/tool-app.js',
  '/manifest.json'
];

// Install — langsung aktif
self.addEventListener('install', function(event){
  console.log('[SW] Installing v3.1');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE).catch(function(e){ console.warn('[SW] Precache err:', e); });
    })
  );
  // LANGSUNG aktif tanpa tunggu
  self.skipWaiting();
});

// Activate — hapus cache lama + notify clients
self.addEventListener('activate', function(event){
  console.log('[SW] Activating v3.1');
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ 
              console.log('[SW] Delete old cache:', k);
              return caches.delete(k); 
            })
      );
    }).then(function(){
      // Notify semua clients kalau ada update
      return self.clients.matchAll({ type: 'window' }).then(function(clients){
        clients.forEach(function(client){
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
  self.clients.claim();
});

// Message — skip waiting + reload
self.addEventListener('message', function(event){
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch — NETWORK FIRST, fallback cache
self.addEventListener('fetch', function(event){
  var req = event.request;
  var url = new URL(req.url);

  // Skip POST/PUT/DELETE
  if (req.method !== 'GET') return;

  // Skip cross-origin
  if (url.origin !== self.location.origin) return;

  // Skip API
  if (url.pathname.indexOf('/api/') === 0) return;

  // Skip admin
  if (url.pathname.indexOf('/admin') === 0) return;

  // Skip debug
  if (url.pathname.indexOf('/debug') === 0) return;

  // Network-first, fallback cache
  event.respondWith(
    fetch(req).then(function(res){
      // Cache CSS/JS untuk offline
      var isAsset = url.pathname === '/style.css' ||
                    url.pathname === '/native.css' ||
                    url.pathname === '/app.js' ||
                    url.pathname === '/tool-app.js' ||
                    url.pathname === '/settings.js';
      if (res && res.status === 200 && isAsset) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, clone); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(cached){
        return cached || new Response('Offline', { 
          status: 503, 
          headers: { 'Content-Type': 'text/plain' } 
        });
      });
    })
  );
});
