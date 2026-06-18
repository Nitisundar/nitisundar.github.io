/* Starkle service worker — v2
   Fixes "old version on launch": HTML is fetched fresh from the network on every
   launch when online (bypassing the browser cache), and the latest copy is stored
   under a single key so an offline launch always serves the most recent version.
   Firebase/auth API traffic is never intercepted; offline data is handled by Firestore. */
const CACHE = 'starkle-v2';
const ASSET_HOSTS = ['www.gstatic.com', 'fonts.gstatic.com'];

self.addEventListener('install', function(e){
  e.waitUntil((async function(){
    try{
      const c = await caches.open(CACHE);
      await c.addAll(['./manifest.json', './icon-512.png']).catch(function(){});
      const r = await fetch('./index.html', {cache:'no-store'});
      if(r && r.status === 200) await c.put('index', r.clone());
    }catch(_){}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    const keys = await caches.keys();
    await Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(e){
  const req = e.request;
  if(req.method !== 'GET') return;
  let url; try{ url = new URL(req.url); }catch(_){ return; }
  if(url.pathname.endsWith('sw.js')) return; // never intercept the worker script itself

  // HTML / navigation -> always network-first, fresh (no browser cache), single fallback key
  if(req.mode === 'navigate' || (url.origin === self.location.origin && url.pathname.endsWith('.html'))){
    e.respondWith((async function(){
      try{
        const fresh = await fetch(req, {cache:'no-store'});
        const c = await caches.open(CACHE);
        c.put('index', fresh.clone());
        return fresh;
      }catch(_){
        const c = await caches.open(CACHE);
        return (await c.match('index')) || (await c.match(req)) || Response.error();
      }
    })());
    return;
  }

  // App assets (same-origin) + Firebase SDK + fonts -> cache-first
  if(url.origin === self.location.origin || ASSET_HOSTS.indexOf(url.hostname) >= 0){
    e.respondWith((async function(){
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      const net = fetch(req).then(function(r){ if(r && r.status === 200) c.put(req, r.clone()); return r; }).catch(function(){ return hit; });
      return hit || net;
    })());
  }
});
