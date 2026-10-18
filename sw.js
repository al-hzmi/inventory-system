/* Cache only the stocktake shell. Never cache API, identity or Firestore traffic. */
const STOCKTAKE_CACHE='stocktake-shell-v75-1';
const PAGES=['/stocktake.html','/admin-stocktake.html','/stocktake-accountant.html','/accountant-stocktake.html'];
const ASSETS=['/stocktake-core.js','/stocktake-workspace.css','/stocktake-workbook.js','/v71-brand.css','/v56-39-site-identity.js','/assets/batco-logo.svg','/assets/batco-app-icon.svg'];
const VENDORS=['https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{const cache=await caches.open(STOCKTAKE_CACHE);await Promise.all([...PAGES,...ASSETS,...VENDORS].map(async path=>{const response=await fetch(path,{cache:'reload',mode:path.startsWith('https:')?'no-cors':'same-origin'});if(!response.ok&&response.type!=='opaque')throw new Error('Stocktake shell cache failed');await cache.put(path,response)}));await self.skipWaiting()})());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('stocktake-shell-')&&name!==STOCKTAKE_CACHE)await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET')return;
 const local=url.origin===self.location.origin,eligible=local&&(PAGES.includes(url.pathname)||ASSETS.includes(url.pathname));
 if(!eligible&&!VENDORS.includes(url.href))return;
 const key=local?url.pathname:url.href;
 event.respondWith((async()=>{const cache=await caches.open(STOCKTAKE_CACHE),cached=await cache.match(key);
   if(!local&&cached)return cached;
   const network=fetch(request).then(async response=>{if(response.ok||response.type==='opaque')await cache.put(key,response.clone());return !response.ok&&response.type!=='opaque'&&cached?cached:response});
   if(!cached)return network;
   event.waitUntil(network.catch(()=>{}));
   return Promise.race([network.catch(()=>cached),new Promise(resolve=>setTimeout(()=>resolve(cached),2500))]);
 })());
});


