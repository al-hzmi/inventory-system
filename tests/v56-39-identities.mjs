import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const runtime=read('v56-39-site-identity.js');
const bridge=read('v56-39-national-day.css');
const home=read('v56-49-nd96-home.css');
const catalog=read('v56-50-nd96-catalog.css');
const categories=read('v56-51-nd96-categories.css');
const cart=read('v56-52-nd96-cart.css');
const exact=read('v56-63-nd96-exact-webp.css');
const index=read('index.html');
const customer=read('customer.html');
const identityConsole=read('identities.html');
const vercel=JSON.parse(read('vercel.json'));

// Controller remains the proven V56.62 identity runtime; V56.63 is paint-only.
must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes("VERSION='56.62'")&&runtime.includes("VISUAL_REVISION='56.62'"),'identity controller unexpectedly changed');
must(runtime.includes('onSnapshot'),'identity realtime control missing');
must(runtime.includes("PREVIEW_KEY='batco_identity_preview_v1'"),'preview contract missing');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');
must(runtime.includes("active?'#0A5143'"),'approved browser theme color missing');

const headerRules=new Map((Array.isArray(vercel.headers)?vercel.headers:[]).map(rule=>[rule.source,rule]));
for(const source of ['/v56-39-site-identity.js','/v56-39-national-day.css','/v56-49-nd96-home.css','/v56-50-nd96-catalog.css','/v56-51-nd96-categories.css','/v56-52-nd96-cart.css','/v56-63-nd96-exact-webp.css','/national-day-96-mark.svg','/national-day-96/assets/:path*']){
  const rule=headerRules.get(source);must(rule,`Vercel cache policy missing for ${source}`);
  const cache=(Array.isArray(rule.headers)?rule.headers:[]).find(h=>String(h.key||'').toLowerCase()==='cache-control');
  must(cache&&/\bno-store\b/i.test(String(cache.value||'')),`no-store cache policy missing for ${source}`);
}

for(const file of ['v56-49-nd96-home.css','v56-50-nd96-catalog.css','v56-51-nd96-categories.css','v56-52-nd96-cart.css','v56-63-nd96-exact-webp.css'])must(fs.existsSync(file),`identity layer missing: ${file}`);
for(const imp of ['@import url("./v56-49-nd96-home.css?v=56.62")','@import url("./v56-50-nd96-catalog.css?v=56.62")','@import url("./v56-51-nd96-categories.css?v=56.62")','@import url("./v56-52-nd96-cart.css?v=56.62")','@import url("./v56-63-nd96-exact-webp.css?v=56.63")'])must(bridge.includes(imp),`identity bridge import missing: ${imp}`);
must(bridge.includes('V56.63 — FINAL APPROVED NATIONAL DAY 96 IDENTITY'),'V56.63 final identity marker missing');

// These are the actual user-approved standalone binary artworks used in browser paint.
for(const asset of ['national-day-96/assets/v56-63-mark.webp','national-day-96/assets/v56-63-corner.webp','national-day-96/assets/v56-63-skyline.webp'])must(fs.existsSync(asset)&&fs.statSync(asset).size>1000,`Exact V56.63 artwork missing/empty: ${asset}`);
for(const token of ['v56-63-mark.webp','v56-63-corner.webp','v56-63-skyline.webp'])must(exact.includes(token),`Exact V56.63 artwork not wired: ${token}`);
must(!exact.includes('exact-corner-top.svg')&&!exact.includes('exact-corner-bottom.svg')&&!exact.includes('exact-skyline.svg'),'nested raster-in-SVG artwork must never return');

// Proven V56.62 structural/base paint remains intact.
const baseCombined=[home,catalog,categories,cart].join('\n');
for(const css of [home,catalog,categories,cart]){
  must(!css.includes('exact-corner-top.svg'),'broken raster-in-SVG top corner must not be used');
  must(!css.includes('exact-corner-bottom.svg'),'broken raster-in-SVG bottom corner must not be used');
  must(!css.includes('exact-skyline.svg'),'broken raster-in-SVG skyline must not be used');
  must(!css.includes('repeating-conic-gradient'),'synthetic/repetitive motif is forbidden');
}
must(home.includes('V56.62 — HOME / INVENTORY'),'Home V56.62 base marker missing');
must(catalog.includes('V56.62 — CUSTOMER / CATALOG'),'Catalog V56.62 base marker missing');
must(categories.includes('V56.62 — CATEGORIES'),'Categories V56.62 base marker missing');
must(cart.includes('V56.62 — CART'),'Cart V56.62 base marker missing');
must(home.includes('.nd96-warehouse-button.bg-primary'),'Home active warehouse treatment missing');
must(catalog.includes('.nd96-add-button')&&catalog.includes('#0C5C49'),'Catalog approved add CTA missing');
must(categories.includes('.nd96-category-tile::before')&&categories.includes('content:none!important'),'Category-card decoration suppression missing');
must(cart.includes('.rights-footer{background:#FBFDFC!important'),'Cart light footer treatment missing');

// Exact V56.63 composition contract.
must(exact.includes('.nd96-inventory-meta::after')&&exact.includes('var(--nd96-mark-local)'),'Home exact badge override missing');
must(exact.includes('.nd96-inventory-hero::before')&&exact.includes('var(--nd96-corner-local)'),'Home exact motif override missing');
must(exact.includes('.nd96-warehouse-empty::before')&&exact.includes('var(--nd96-skyline-local)'),'Home exact skyline override missing');
must(exact.includes('body.nd96-customer .rights-bar::before')&&exact.includes('var(--nd96-mark-local)'),'Customer exact badge override missing');
must(exact.includes('body.nd96-customer:not(:has(.nd96-categories-page)):not(:has(.nd96-cart-page))::after')&&exact.includes('var(--nd96-skyline-local)'),'Catalog exact skyline missing');
must(exact.includes('.nd96-categories-page::before')&&exact.includes('.nd96-categories-page::after'),'Categories exact edge motifs missing');
must(exact.includes('.nd96-category-tile::before')&&exact.includes('content:none!important'),'V56.63 must keep category cards clean');
must(exact.includes('.nd96-empty-cart')&&exact.includes('background-image:var(--nd96-skyline-local)'),'Cart exact empty-state skyline missing');
must(exact.includes('pointer-events:none'),'V56.63 artwork must be non-interactive');

// Neither base seasonal paint nor final override may own bottom-navigation positioning.
for(const css of [home,catalog,categories,cart,exact]){
  const navPosition=/(^|[}\n])[^{}]*\bnav\b[^{}]*\{[^{}]*\bposition\s*:/m.test(css);
  must(!navPosition,'seasonal CSS must not redefine bottom-navigation positioning');
}

must(index.includes('v56-39-site-identity.js'),'employee identity runtime missing');
must(customer.includes('v56-39-site-identity.js'),'customer identity runtime missing');
must(identityConsole.includes('الهويات والمناسبات')&&identityConsole.includes("activeIdentity:national?'national96':'default'"),'identity console activation missing');
console.log('V56.63 exact supplied WebP artwork + Safari/iOS safety + four-view app-safety regression: PASS');
