const C='meridian-v2';
const CORE=['./','index.html','manifest.webmanifest','assets/three.min.js','assets/leaflet.js','assets/leaflet.css','assets/world.json','assets/countries.json','assets/highlight.json','assets/earth-blue-marble.jpg','assets/earth-night.jpg','assets/earth-water.png','assets/night-sky.png','assets/inter.woff2','assets/serif.woff2','assets/serif-italic.woff2','assets/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('meridian-')&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);if(e.request.method!=='GET')return;
  if(u.origin!==location.origin){ // map tiles: cache as we go so recently viewed areas work offline
    if(u.hostname.endsWith('basemaps.cartocdn.com'))e.respondWith(caches.open(C+'-tiles').then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n.ok)c.put(e.request,n.clone());return n}))));
    return}
  const fresh=u.pathname.endsWith('voyage.json')||u.pathname.endsWith('/')||u.pathname.endsWith('index.html');
  if(fresh){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(n=>{if(n.ok){const cp=n.clone();caches.open(C).then(c=>c.put(e.request,cp))}return n})));
});
