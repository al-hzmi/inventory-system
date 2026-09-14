import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

const runtime=read('v56-39-site-identity.js');
const bridge=read('v56-39-national-day.css');
const home=read('v56-49-nd96-home.css');
const catalog=read('v56-50-nd96-catalog.css');
const categories=read('v56-51-nd96-categories.css');
const cart=read('v56-52-nd96-cart.css');
const index=read('index.html');
const customer=read('customer.html');
const identityConsole=read('identities.html');
const vercel=JSON.parse(read('vercel.json'));

// Runtime/controller remains V56.60; V56.61 is a paint-only revision loaded through the no-store bridge.
must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes("VERSION='56.60'")&&runtime.includes("VISUAL_REVISION='56.60'"),'identity runtime contract unexpectedly changed');
must(runtime.includes('onSnapshot'),'identity realtime control missing');
must(runtime.includes("PREVIEW_KEY='batco_identity_preview_v1'"),'preview contract missing');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');
must(runtime.includes("active?'#0A5143'"),'approved browser theme color missing');

// The legacy controller URL is intentionally stable, therefore all identity files must remain no-store.
const headerRules=new Map((Array.isArray(vercel.headers)?vercel.headers:[]).map(rule=>[rule.source,rule]));
for(const source of [
  '/v56-39-site-identity.js',
  '/v56-39-national-day.css',
  '/v56-49-nd96-home.css',
  '/v56-50-nd96-catalog.css',
  '/v56-51-nd96-categories.css',
  '/v56-52-nd96-cart.css',
  '/national-day-96-mark.svg',
  '/national-day-96/assets/:path*'
]){
  const rule=headerRules.get(source);
  must(rule,`Vercel cache policy missing for ${source}`);
  const cache=(Array.isArray(rule.headers)?rule.headers:[]).find(h=>String(h.key||'').toLowerCase()==='cache-control');
  must(cache&&/\bno-store\b/i.test(String(cache.value||'')),`no-store cache policy missing for ${source}`);
}

// V56.61 bridge: cache-busted four-view paint only.
for(const file of ['v56-49-nd96-home.css','v56-50-nd96-catalog.css','v56-51-nd96-categories.css','v56-52-nd96-cart.css'])must(fs.existsSync(file),`identity layer missing: ${file}`);
for(const imp of [
  '@import url("./v56-49-nd96-home.css?v=56.61")',
  '@import url("./v56-50-nd96-catalog.css?v=56.61")',
  '@import url("./v56-51-nd96-categories.css?v=56.61")',
  '@import url("./v56-52-nd96-cart.css?v=56.61")'
])must(bridge.includes(imp),`V56.61 bridge import missing: ${imp}`);
must(bridge.includes('FINAL APPROVED NATIONAL DAY 96 IDENTITY'),'final identity marker missing');

// Exact approved artwork must be repository assets and must be the assets actually referenced by paint CSS.
for(const asset of [
  'national-day-96-mark.svg',
  'national-day-96/assets/exact-corner-top.svg',
  'national-day-96/assets/exact-corner-bottom.svg',
  'national-day-96/assets/exact-skyline.svg'
])must(fs.existsSync(asset)&&fs.statSync(asset).size>0,`Exact National Day asset missing/empty: ${asset}`);
const combined=[home,catalog,categories,cart].join('\n');
for(const token of ['exact-corner-top.svg','exact-corner-bottom.svg','exact-skyline.svg'])must(combined.includes(token),`Exact artwork is not wired: ${token}`);
for(const css of [home,catalog,categories,cart])must(!css.includes('repeating-conic-gradient'),'synthetic/repetitive motif is forbidden');

// HOME / INVENTORY: light shell, official badge, exact top/bottom motifs and exact skyline.
must(home.includes('V56.61 — HOME / INVENTORY'),'Home V56.61 marker missing');
for(const token of ['--nd96-deep:#0A5143','--nd96-green:#0F765B','--nd96-ink:#0C4038','--nd96-line:#DDE9E4'])must(home.includes(token),`Home palette token missing: ${token}`);
must(home.includes('--nd96-mark:url("./national-day-96-mark.svg")'),'Home local official badge reference missing');
must(home.includes('--nd96-corner-top:url("./national-day-96/assets/exact-corner-top.svg")'),'Home exact top motif missing');
must(home.includes('--nd96-corner-bottom:url("./national-day-96/assets/exact-corner-bottom.svg")'),'Home exact bottom motif missing');
must(home.includes('--nd96-landscape:url("./national-day-96/assets/exact-skyline.svg")'),'Home exact skyline missing');
must(home.includes('.nd96-inventory-meta::after')&&home.includes('var(--nd96-mark) center/contain no-repeat'),'Home centered badge missing');
must(home.includes('.nd96-inventory-hero::before')&&home.includes('var(--nd96-corner-top)'),'Home exact corner composition missing');
must(home.includes('.nd96-warehouse-empty::before')&&home.includes('var(--nd96-landscape)'),'Home exact skyline composition missing');
must(home.includes('.nd96-warehouse-button.bg-primary'),'Home active warehouse treatment missing');

// CUSTOMER CATALOG: official badge, exact corner motifs, product hierarchy and exact lower skyline.
must(catalog.includes('V56.61 — CUSTOMER / CATALOG'),'Catalog V56.61 marker missing');
must(catalog.includes('.rights-bar::before')&&catalog.includes('var(--nd96-mark) center/contain no-repeat'),'Catalog centered badge missing');
must(catalog.includes('.rights-bar::after')&&catalog.includes('var(--nd96-corner-top)'),'Catalog exact header motif missing');
must(catalog.includes('.nd96-add-button')&&catalog.includes('#0C5C49'),'Catalog approved add CTA missing');
must(catalog.includes('body.nd96-customer:not(:has(.nd96-categories-page)):not(:has(.nd96-cart-page))::after')&&catalog.includes('var(--nd96-landscape)'),'Catalog exact lower skyline missing');

// CATEGORIES: exact asymmetric edge art; no wallpaper painted inside every tile.
must(categories.includes('V56.61 — CATEGORIES'),'Categories V56.61 marker missing');
must(categories.includes('background-image:var(--nd96-corner-top)')&&categories.includes('background-image:var(--nd96-corner-bottom)'),'Categories exact edge motifs missing');
must(categories.includes('.nd96-category-tile{background:rgba(255,255,255,.985)!important'),'Categories white-card treatment missing');
must(categories.includes('.nd96-category-tile::before')&&categories.includes('content:none!important'),'Category-card decoration suppression missing');

// CART: exact top motif plus exact bottom corners and Saudi skyline in the empty state.
must(cart.includes('V56.61 — CART'),'Cart V56.61 marker missing');
must(cart.includes('body.nd96-customer:has(.nd96-cart-page) .rights-bar::after')&&cart.includes('height:34px')&&cart.includes('background:var(--nd96-deep)!important'),'Cart green identity strip missing');
must(cart.includes('.nd96-cart-page::before')&&cart.includes('var(--nd96-corner-top)'),'Cart exact top motif missing');
must(cart.includes('.nd96-empty-cart{')&&cart.includes('var(--nd96-corner-bottom),var(--nd96-corner-bottom),var(--nd96-landscape)'),'Cart exact empty-state composition missing');
must(cart.includes('.rights-footer{background:#FBFDFC!important'),'Cart light footer treatment missing');

// Decorative identity paint can never intercept controls; bottom-nav mechanics stay owned by the app.
must(combined.includes('pointer-events:none'),'non-interactive seasonal artwork contract missing');
for(const css of [home,catalog,categories,cart]){
  const navPosition=/(^|[}\n])[^{}]*\bnav\b[^{}]*\{[^{}]*\bposition\s*:/m.test(css);
  must(!navPosition,'seasonal CSS must not redefine bottom-navigation positioning');
}

// Production wiring remains centralized and switchable.
must(index.includes('v56-39-site-identity.js'),'employee identity runtime missing');
must(customer.includes('v56-39-site-identity.js'),'customer identity runtime missing');
must(identityConsole.includes('الهويات والمناسبات')&&identityConsole.includes("activeIdentity:national?'national96':'default'"),'identity console activation missing');

console.log('V56.61 National Day exact-artwork four-view + no-store + app-safety regression: PASS');
