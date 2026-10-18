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
assert.ok(employeeBoot.includes('v71-brand.css?v=72.1')&&customerBoot.includes('v71-brand.css?v=72.1'),'Shared V72 brand stylesheet must be loaded by both portals');
assert.ok(employeeBoot.includes('rev=72.1'),'V72 employee core must invalidate old splash');
assert.ok(customerBoot.includes("runtime/customer-v37-source.txt?v=56.33&rev=72.1"),'V72 customer boot must invalidate old splash');
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
// V72 product-level visual regression: both phases of the loading transition
// show the same non-square wordmark without a caption on iPhone and Android.
for(const [name,boot] of [['employee',employeeBoot],['customer',customerBoot]]){
 assert.ok(boot.includes('id="v37boot"')&&boot.includes('class="batco-splash-wordmark"'),'Missing immediate '+name+' splash wordmark');
 assert.ok(boot.includes('src="./assets/batco-logo.svg?v=72.0"'),'Wrong '+name+' initial splash artwork');
 assert.ok(boot.includes('.v37box img{width:min(59vw,218px)'),'Wrong '+name+' first-frame desktop dimensions');
 assert.ok(boot.includes('@media(max-width:600px){.v37box img.batco-splash-wordmark{width:min(43vw,178px)}'),'Wrong '+name+' compact mobile first-frame dimensions');
 assert.ok(!boot.includes('<p>جاري فتح النظام...')&&!boot.includes('<p>جاري فتح بوابة العملاء...'),'The '+name+' splash must not show opening caption');
}
for(const [name,source] of [['employee',core],['customer',customer]]){
 assert.ok(source.includes('id="app-loader"')&&source.includes('class="batco-splash-wordmark"'),'Missing matching '+name+' in-app splash');
 assert.ok(source.includes('#app-loader img{width:min(59vw,218px)'),'Wrong '+name+' desktop in-app loader dimensions');
 assert.ok(source.includes('@media(max-width:600px){#app-loader img.batco-splash-wordmark{width:min(43vw,178px)}'),'Wrong '+name+' compact mobile in-app loader dimensions');
 assert.ok(source.includes('src="./assets/batco-logo.svg?v=72.0"'),'Wrong '+name+' in-app splash artwork');
 assert.ok(!source.includes('<img src="./assets/batco-app-icon.svg" alt="BATCO"'),'Old square '+name+' splash remains');
}
assert.ok(!core.includes('جاري التحقق من صلاحية الدخول...</div>'),'Permission-check waiting screen must use the uncluttered logo');
assert.ok(style.includes('.batco-brand-logo.is-header{width:clamp(180px,48vw,242px)}'),'Header logo should be smaller on desktop');
assert.ok(style.includes('.batco-brand-logo.is-header{width:min(56vw,215px)}'),'Header logo should be smaller on mobile');
assert.ok(style.includes('@media(max-width:600px){\n #v37boot .v37box img.batco-splash-wordmark,\n #app-loader img.batco-splash-wordmark {width:min(43vw,178px)}'),'V72.1 brand CSS must keep both mobile splash phases compact');

const pages=['index.html','customer.html','admin-home.html','admin-dashboard.html','admin-feedback.html','admin-image-export.html','admin-inventory-import.html','admin-stocktake-shell.html','admin-stocktake.html','accountant-stocktake.html','command-center.html','control-center.html','health-center.html','identities.html','image-distribution.html','inventory-analytics.html','security-center.html','stocktake-accountant.html','stocktake.html'];
for(const page of pages){
 const html=read(page);
 assert.ok(html.includes('assets/batco-app-icon.svg')||html.includes('assets/batco-logo.svg')||page==='index.html','Missing BATCO identity for '+page);
 assert.ok(html.includes(page==='index.html'||page==='customer.html'?'v71-brand.css?v=72.1':'v71-brand.css?v=71.0'),'Missing active brand stylesheet for '+page);
}
console.log('V72_1_MOBILE_SPLASH_PASS: compact 178px mobile logo across all loading phases and both portals');
