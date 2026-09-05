const CACHE_NAME="lir-check-v2";
const APP_FILES=["./","./index.html","./styles.css","./app.js","./manifest.json","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
   if(r.ok&&new URL(e.request.url).origin===self.location.origin){const copy=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy))}
   return r;
 }).catch(()=>e.request.mode==="navigate"?caches.match("./index.html"):new Response("",{status:503}))));
});