import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const core=read('runtime/index-v37-source.txt');
const customer=read('runtime/customer-v37-source.txt');
const employeeBoot=read('index.html');
const customerBoot=read('customer.html');
const manifest=JSON.parse(read('manifest.json'));
const guestManifest=JSON.parse(read('customer-manifest.json'));
const logo=read('assets/batco-logo.svg'),icon=read('assets/batco-app-icon.svg');
const style=read('v71-brand.css');
assert.ok(logo.includes('viewBox="0 0 900 353"')&&logo.includes('fill="#000"'),'Approved black transparent BATCO logo must be present');
assert.ok(icon.includes('viewBox="0 0 512 512"')&&icon.includes('fill="#000"')&&icon.includes('fill="#fff"'),'BATCO PWA emblem must use monochrome geometry');
assert.equal((core.match(/<img src="\.\/assets\/batco-logo\.svg"/g)||[]).length,3,'Employee entrance, login and main title use official full wordmark');
assert.ok(customer.includes('<img src="./assets/batco-logo.svg"'),'Customer login uses same BATCO wordmark');
assert.ok(core.includes('>عرض صور الأصناف</span>'),'Photo switch must be labeled عرض صور الأصناف');
assert.ok(!core.includes('>صور نتائج البحث</span>'),'Old misleading toggle must be removed');
assert.ok(employeeBoot.includes('v71-brand.css?v=71.0')&&customerBoot.includes('v71-brand.css?v=71.0'),'Shared brand stylesheet must be loaded by both portals');
assert.ok(employeeBoot.includes('rev=71.0'),'New official core must bust previous browser cache');
assert.ok(employeeBoot.includes('const hit=await cache.match(CORE)'),'Repeat opens should use cached, revisioned UI shell');
assert.ok(employeeBoot.includes("cache:'no-cache'")&&employeeBoot.includes('setTimeout(()=>fetch(CORE'),'UI cache must revalidate in the background');
assert.ok(!core.includes('setTimeout(() => { prepareShareFile(); }, 120)'),'Gallery must not prefetch sharing blobs for all images');
assert.ok(!core.includes('onLoad={() => { if (!preparedFile && !preparing) prepareShareFile(); }}'),'Images must not double-fetch blobs on load');
assert.ok(core.includes('if (!file) file = await prepareShareFile()'),'File sharing must still work when actually requested');
assert.ok(core.includes('loading="lazy"')&&core.includes('decoding="async"'),'Product images must remain deferred and asynchronous');
assert.ok(core.includes('window.requestIdleCallback')&&core.includes('localStorage.setItem(cacheKey,text)'), 'Inventory offline cache writes must be idle and error-tolerant');
assert.ok(core.includes("}, 45000);"),'Image bindings should not poll every 15 seconds');
assert.ok(core.includes('defer src="https://unpkg.com/html5-qrcode')&&core.includes('defer src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh') ,'Scanner and camera libraries should no longer block first content');
assert.ok(core.includes('rel="apple-touch-icon" href="./icons/icon-180.png?v=71.0"'),'iOS installation should use the new BATCO icon');
assert.ok(core.includes('icons/icon-512.png?v=71.0')&&core.includes('twitter:image'),'Shared card should reference new BATCO icon');
for(const m of [manifest,guestManifest]){
 assert.equal(m.short_name,'BATCO');
 assert.ok(m.icons.some(i=>i.sizes==='192x192'&&i.src.includes('icon-192.png')),'Android 192 icon');
 assert.ok(m.icons.some(i=>i.sizes==='512x512'&&i.src.includes('icon-512.png')),'Android 512 icon');
 assert.ok(m.icons.some(i=>i.purpose.includes('maskable')),'Installable maskable mark');
}
assert.ok(style.includes('.batco-brand-logo-heading')&&style.includes('@media(max-width:430px)'),'Responsive mobile and desktop logo');
const pages=['index.html','customer.html','admin-home.html','admin-dashboard.html','admin-feedback.html','admin-image-export.html','admin-inventory-import.html','admin-stocktake-shell.html','admin-stocktake.html','accountant-stocktake.html','command-center.html','control-center.html','health-center.html','identities.html','image-distribution.html','inventory-analytics.html','security-center.html','stocktake-accountant.html','stocktake.html'];
for(const page of pages){
 const html=read(page);
 assert.ok(html.includes('assets/batco-app-icon.svg')||page==='index.html','Missing BATCO icon for '+page);
 assert.ok(html.includes('v71-brand.css?v=71.0'),'Missing brand stylesheet for '+page);
}
console.log('V71_BRAND_AND_SPEED_STATIC_PASS: approved logos, all 19 entry pages, PWA, lazy photos, cache and nonblocking libraries');
