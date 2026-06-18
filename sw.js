/* Starkle service worker — lets the app open with no connection (for use at sea, etc.)
   HTML: network-first (fresh when online, cached when offline)
   Firebase SDK on gstatic + fonts: cache-first
   Firestore/auth API traffic (googleapis.com / firebaseapp.com): never intercepted */
const CACHE = 'starkle-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(_){ return; }

  // HTML / navigation: network-first, fall back to cache (offline)
  if(req.mode === 'navigate' || (url.origin === self.location.origin && url.pathname.endsWith('.html'))){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(c){ return c || caches.match('./index.html'); });
      })
    );
    return;
  }

  // Static assets we control: same-origin + Firebase SDK + font files -> cache-first
  var cacheable = (url.origin === self.location.origin) || url.hostname === 'www.gstatic.com' || url.hostname === 'fonts.gstatic.com';
  if(!cacheable) return; // let Firestore/auth/everything else go straight to the network

  e.respondWith(
    caches.match(req).then(function(cached){
      var net = fetch(req).then(function(res){
        if(res && res.status === 200){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
        return res;
      }).catch(function(){ return cached; });
      return cached || net;
    })
  );
});
