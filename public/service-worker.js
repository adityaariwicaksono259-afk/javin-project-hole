// VinAPIay Service Worker — v1
const CACHE_NAME = 'vinapiay-v1';

const PRECACHE = [
  '/',
  '/style.css',
  '/app.js',
  '/tool-app.js',
  '/manifest.json'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE).catch(function(){});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  var url = new URL(req.url);

  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;
  if (url.pathname.indexOf('/admin') === 0) return;
  if (url.pathname.indexOf('/debug') === 0) return;

  event.respondWith(
    fetch(req).then(function(res){
      var isJsCss = url.pathname === '/style.css' ||
                    url.pathname === '/app.js' ||
                    url.pathname === '/tool-app.js';
      if (res && res.status === 200 && isJsCss) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(req, clone); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(cached){
        return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      });
    })
  );
});
