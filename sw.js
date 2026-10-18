/* Cache only the stocktake shell. Never cache API, identity or Firestore traffic. */
const STOCKTAKE_CACHE='stocktake-shell-v77';
const RESOURCE_CACHE='batco-static-resources-v77';
const NAV_CACHE='batco-navigation-shell-v77';
const PAGES=['/stocktake.html','/admin-stocktake.html','/stocktake-accountant.html','/accountant-stocktake.html'];
const ASSETS=['/stocktake-core.js','/stocktake-workspace.css','/stocktake-workbook.js','/v71-brand.css','/v56-39-site-identity.js','/assets/batco-logo.svg','/assets/batco-app-icon.svg'];
const VENDORS=['https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'];
// Static HTML shells only. Never cache Firestore traffic, account data, or inventory quantities.
const NAV_PAGES=new Set([
 '/index.html','/customer.html','/admin-home.html','/admin-dashboard.html',
 '/control-center.html','/admin-stocktake-shell.html','/admin-stocktake.html',
 '/stocktake.html','/stocktake-accountant.html','/accountant-stocktake.html',
 '/inventory-analytics.html','/image-distribution.html','/admin-inventory-import.html',
 '/health-center.html','/security-center.html','/identities.html','/command-center.html',
 '/admin-feedback.html','/admin-image-export.html'
]);
const STATIC_FILES=new Set(["/batco-fast-nav.js","/inventory-import-ui.js","/stocktake-core.js","/stocktake-workbook.js","/stocktake-workspace.css","/v44-admin-bridge.js","/v44-observability.js","/v45-admin-ux.js","/v46-admin-nav.js","/v48-admin-security.js","/v48-auth-security.js","/v52-admin.css","/v53-admin-polish.css","/v54-1-desktop-canvas-fix.css","/v54-admin-enhancements.js","/v54-admin-overhaul.css","/v54-sales-clarity.js","/v56-35-new-arrivals-quick-delete.js","/v56-39-national-day.css","/v56-39-site-identity.js","/v56-49-nd96-home.css","/v56-50-nd96-catalog.css","/v56-51-nd96-categories.css","/v56-52-nd96-cart.css","/v56-53-admin-interaction.css","/v56-63-nd96-exact-webp.css","/v56-65-nd96-minimal.css","/v56-70-bulk-image-export.css","/v56-70-bulk-image-export.js","/v57-admin-import.css","/v57-admin-refresh.css","/v57-admin-workspace.js","/v59-admin-import-ui.js","/v59-admin-import.css","/v61-employee-pilot-admin.css","/v61-employee-pilot-admin.js","/v61-employee-pilot.css","/v61-employee-pilot.js","/v70-admin-feedback.js","/v70-employee-feedback.css","/v70-employee-feedback.js","/v71-brand.css"]);
const navPath=url=>url.pathname==='/'?'/index.html':url.pathname;
async function warmDependencies(response){
 const html=await response.clone().text(),paths=[...html.matchAll(/(?:src=["']|const CORE=')(.\/assets\/build\/[a-z0-9-]+\.[a-f0-9]{20}\.(?:js|html))/g)].map(m=>m[1]);
 const cache=await caches.open(RESOURCE_CACHE);
 await Promise.allSettled([...new Set(paths)].slice(0,4).map(async path=>{const key=new URL(path,self.location.origin).href;if(await cache.match(key))return;const r=await fetch(key);if(r.ok){await cache.put(key,r.clone());if(path.endsWith('.html'))await warmDependencies(r)}}));
}
async function freshShell(path){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-cache'});
 if(!response.ok||response.type==='opaque'||!String(response.headers.get('content-type')||'').includes('text/html'))return null;
 const store=await caches.open(NAV_CACHE);
 await store.put(path,response.clone());
 await warmDependencies(response).catch(()=>{});
 return response;
}
self.addEventListener('message',event=>{
 if(event.data?.type!=='BATCO_PREFETCH_SHELL'||!Array.isArray(event.data.paths))return;
 const paths=[...new Set(event.data.paths)].filter(path=>typeof path==='string'&&NAV_PAGES.has(path)).slice(0,3);
 event.waitUntil(Promise.allSettled(paths.map(async path=>{
   const cache=await caches.open(NAV_CACHE);
   if(!(await cache.match(path)))await freshShell(path);
 })));
});
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{const cache=await caches.open(STOCKTAKE_CACHE);await Promise.all([...PAGES,...ASSETS,...VENDORS].map(async path=>{const response=await fetch(path,{cache:'reload',mode:path.startsWith('https:')?'no-cors':'same-origin'});if(!response.ok&&response.type!=='opaque')throw new Error('Stocktake shell cache failed');await cache.put(path,response)}));await self.skipWaiting()})());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if((name.startsWith('batco-static-resources-')&&name!==RESOURCE_CACHE)||(name.startsWith('stocktake-shell-')&&name!==STOCKTAKE_CACHE)||(name.startsWith('batco-navigation-shell-')&&name!==NAV_CACHE))await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET')return;
 const local=url.origin===self.location.origin,eligible=local&&(PAGES.includes(url.pathname)||ASSETS.includes(url.pathname));
 // Content-addressed code and public static resources only; data and API requests never enter this cache.
 if(local&&(STATIC_FILES.has(url.pathname)||/^\/assets\/build\/[a-z0-9-]+\.[a-f0-9]{20}\.(js|html)$/.test(url.pathname))){
   event.respondWith((async()=>{const cache=await caches.open(RESOURCE_CACHE),key=url.href,hit=await cache.match(key);const immutable=url.pathname.startsWith('/assets/build/');
     const refresh=async()=>{const r=await fetch(request);if(r.ok&&r.type!=='opaque')await cache.put(key,r.clone());return r};
     if(hit){if(!immutable)event.waitUntil(refresh().catch(()=>{}));return hit}return refresh();})());return;
 }
 // Prefetched documents return instantly; fetch a fresh HTML shell in the background.
 if(local&&(request.mode==='navigate'||request.destination==='document')&&NAV_PAGES.has(navPath(url))){
   const path=navPath(url);
   event.respondWith((async()=>{
     const cache=await caches.open(NAV_CACHE),cached=await cache.match(path);
     if(cached){
       event.waitUntil(freshShell(path).catch(()=>{}));
       return cached;
     }
     try{
       const fresh=await fetch(request);
       if(fresh.ok&&String(fresh.headers.get('content-type')||'').includes('text/html'))event.waitUntil(cache.put(path,fresh.clone()).catch(()=>{}));
       return fresh;
     }catch(error){return (await cache.match(path))||Response.error()}
   })());
   return;
 }
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



