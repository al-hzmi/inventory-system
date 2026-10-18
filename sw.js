/* Cache only the stocktake shell. Never cache API, identity or Firestore traffic. */
const STOCKTAKE_CACHE='stocktake-shell-v83';
const RESOURCE_CACHE='batco-static-resources-v83';
const NAV_CACHE='batco-navigation-shell-v83';
const PAGES=['/admin-branch-presence.html','/branch-presence.html','/branch-stocktake.html','/stocktake.html','/admin-stocktake.html','/stocktake-accountant.html','/accountant-stocktake.html'];
const ASSETS=['/batco-brand-footer.js','/branch-presence-core.js','/branch-presence.js','/branch-presence-main-launcher.js','/branch-presence-page.css','/branch-presence-admin.css','/branch-presence-admin.js','/branch-presence-entry.js','/branch-presence.css','/branch-stocktake-core.js','/branch-stocktake.js','/branch-stocktake.css','/stocktake-core.js','/stocktake-workspace.css','/stocktake-workbook.js','/v71-brand.css','/v56-39-site-identity.js','/assets/batco-logo.svg','/assets/batco-app-icon.svg'];
const VENDORS=['https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js','https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'];
// Static HTML shells only. Never cache Firestore traffic, account data, or inventory quantities.
const NAV_PAGES=new Set([
 '/index.html','/customer.html','/admin-home.html','/admin-dashboard.html','/admin-branch-presence.html','/branch-stocktake.html','/branch-presence.html',
 '/control-center.html','/admin-stocktake-shell.html','/admin-stocktake.html',
 '/stocktake.html','/stocktake-accountant.html','/accountant-stocktake.html',
 '/inventory-analytics.html','/image-distribution.html','/admin-inventory-import.html',
 '/health-center.html','/security-center.html','/identities.html','/command-center.html',
 '/admin-feedback.html','/admin-image-export.html'
]);
const STATIC_FILES=new Set(["/batco-brand-footer.js","/batco-fast-nav.js","/inventory-import-ui.js","/stocktake-core.js","/stocktake-workbook.js","/stocktake-workspace.css","/v44-admin-bridge.js","/v44-observability.js","/v45-admin-ux.js","/v46-admin-nav.js","/v48-admin-security.js","/v48-auth-security.js","/v52-admin.css","/v53-admin-polish.css","/v54-1-desktop-canvas-fix.css","/v54-admin-enhancements.js","/v54-admin-overhaul.css","/v54-sales-clarity.js","/v56-35-new-arrivals-quick-delete.js","/v56-39-national-day.css","/v56-39-site-identity.js","/v56-49-nd96-home.css","/v56-50-nd96-catalog.css","/v56-51-nd96-categories.css","/v56-52-nd96-cart.css","/v56-53-admin-interaction.css","/v56-63-nd96-exact-webp.css","/v56-65-nd96-minimal.css","/v56-70-bulk-image-export.css","/v56-70-bulk-image-export.js","/v57-admin-import.css","/v57-admin-refresh.css","/v57-admin-workspace.js","/v59-admin-import-ui.js","/v59-admin-import.css","/v61-employee-pilot-admin.css","/v61-employee-pilot-admin.js","/v61-employee-pilot.css","/v61-employee-pilot.js","/v70-admin-feedback.js","/v70-employee-feedback.css","/v70-employee-feedback.js","/v71-brand.css"]);
// CacheStorage can be unavailable in private/low-storage Safari. A cache failure
// must never turn a successful network response into a blank document.
const bounded=(promise,ms,fallback)=>new Promise(resolve=>{const timer=setTimeout(()=>resolve(fallback),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value)},()=>{clearTimeout(timer);resolve(fallback)})});
const openCache=name=>bounded(caches.open(name),700,null);
const match=(cache,key)=>cache?bounded(cache.match(key),700,null):Promise.resolve(null);
const put=(cache,key,response)=>cache?bounded(cache.put(key,response),1500,null):Promise.resolve(null);
const navPath=url=>url.pathname==='/'?'/index.html':url.pathname;
async function warmDependencies(response){
 const html=await response.clone().text(),paths=[...html.matchAll(/(?:src=["']|href=["']|const CORE=')(.\/assets\/build\/[a-z0-9-]+\.[a-f0-9]{20}\.(?:js|html|css))/g)].map(m=>m[1]);
 const cache=await openCache(RESOURCE_CACHE);
 await Promise.allSettled([...new Set(paths)].slice(0,12).map(async path=>{const key=new URL(path,self.location.origin).href;if(await match(cache,key))return;const r=await fetch(key);if(r.ok){await put(cache,key,r.clone());if(path.endsWith('.html'))await warmDependencies(r)}}));
}
async function freshShell(path){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-cache'});
 if(!response.ok||response.type==='opaque'||!String(response.headers.get('content-type')||'').includes('text/html'))return null;
 const store=await openCache(NAV_CACHE);
 await put(store,path,response.clone());
 await warmDependencies(response).catch(()=>{});
 return response;
}
self.addEventListener('message',event=>{
 if(event.data?.type!=='BATCO_PREFETCH_SHELL'||!Array.isArray(event.data.paths))return;
 const paths=[...new Set(event.data.paths)].filter(path=>typeof path==='string'&&NAV_PAGES.has(path)).slice(0,3);
 event.waitUntil(Promise.allSettled(paths.map(async path=>{
   const cache=await openCache(NAV_CACHE);
   if(!(await match(cache,path)))await freshShell(path);
 })));
});
self.addEventListener('install',event=>{
 // The employee shell can be installed even when an optional scanner CDN is down.
 event.waitUntil((async()=>{
   await bounded(freshShell('/index.html'),12000,null);
   const cache=await openCache(STOCKTAKE_CACHE);
   await Promise.allSettled([...PAGES,...ASSETS,...VENDORS].map(path=>bounded((async()=>{const response=await fetch(path,{cache:'reload',mode:path.startsWith('https:')?'no-cors':'same-origin'});if(response.ok||response.type==='opaque')await put(cache,path,response)})(),8000,null)));
   await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const names=await bounded(caches.keys(),700,[]);
 // Previous tabs may still request their content-addressed scripts after an update.
 const resources=names.filter(n=>n.startsWith('batco-static-resources-'));
 const keep=new Set([RESOURCE_CACHE,...resources.filter(n=>n!==RESOURCE_CACHE).slice(-1)]);
 for(const name of names)if((name.startsWith('batco-static-resources-')&&!keep.has(name))||(name.startsWith('stocktake-shell-')&&name!==STOCKTAKE_CACHE)||(name.startsWith('batco-navigation-shell-')&&name!==NAV_CACHE))await bounded(caches.delete(name),700,null);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET')return;
 const local=url.origin===self.location.origin,eligible=local&&(PAGES.includes(url.pathname)||ASSETS.includes(url.pathname));
 // Content-addressed code and public static resources only; data and API requests never enter this cache.
 if(local&&(STATIC_FILES.has(url.pathname)||/^\/assets\/build\/[a-z0-9-]+\.[a-f0-9]{20}\.(js|html|css)$/.test(url.pathname))){
   event.respondWith((async()=>{const cache=await openCache(RESOURCE_CACHE),key=url.href;const immutable=url.pathname.startsWith('/assets/build/');const hit=(await match(cache,key))||(immutable?await bounded(caches.match(key),700,null):null);
     const refresh=async()=>{const r=await fetch(request);if(r.ok&&r.type!=='opaque')await put(cache,key,r.clone());return r};
     if(hit){if(!immutable)event.waitUntil(refresh().catch(()=>{}));return hit}return refresh();})());return;
 }
 // Prefetched documents return instantly; fetch a fresh HTML shell in the background.
 if(local&&(request.mode==='navigate'||request.destination==='document')&&NAV_PAGES.has(navPath(url))){
   const path=navPath(url);
   event.respondWith((async()=>{
     const cache=await openCache(NAV_CACHE),cached=await match(cache,path);
     if(cached&&!url.searchParams.has('batco-retry')){
       event.waitUntil(freshShell(path).catch(()=>{}));
       return cached;
     }
     try{
       const fresh=await fetch(request,url.searchParams.has('batco-retry')?{cache:'reload'}:undefined);
       if(fresh.ok&&String(fresh.headers.get('content-type')||'').includes('text/html'))event.waitUntil(Promise.allSettled([put(cache,path,fresh.clone()),warmDependencies(fresh)]));
       return fresh;
     }catch(error){return cached||new Response('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BATCO</title><body style="font:16px/1.8 system-ui;text-align:center;padding:25vh 24px;background:white;color:#111"><h1>BATCO</h1><p>تعذر الاتصال بالنظام. أعد المحاولة عند توفر الاتصال.</p><button onclick="location.reload()" style="font:inherit;padding:12px 24px">إعادة المحاولة</button></body></html>',{status:503,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}})}
   })());
   return;
 }
 if(!eligible&&!VENDORS.includes(url.href))return;
 const key=local?url.pathname:url.href;
 event.respondWith((async()=>{const cache=await openCache(STOCKTAKE_CACHE),cached=await match(cache,key);
   if(!local&&cached)return cached;
   const network=fetch(request).then(async response=>{if(response.ok||response.type==='opaque')await put(cache,key,response.clone());return !response.ok&&response.type!=='opaque'&&cached?cached:response});
   if(!cached)return network;
   event.waitUntil(network.catch(()=>{}));
   return Promise.race([network.catch(()=>cached),new Promise(resolve=>setTimeout(()=>resolve(cached),2500))]);
 })());
});
