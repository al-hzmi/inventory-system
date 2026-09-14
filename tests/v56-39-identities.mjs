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

// V56.60 runtime contract: centralized identity control, realtime activation, no decorative DOM injection.
must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes("VERSION='56.60'")&&runtime.includes("VISUAL_REVISION='56.60'"),'V56.60 runtime/cache revision missing');
must(runtime.includes('onSnapshot'),'identity realtime control missing');
must(runtime.includes("PREVIEW_KEY='batco_identity_preview_v1'"),'preview contract missing');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');
must(runtime.includes("active?'#0A5143'"),'approved browser theme color missing');

// Final four-view bridge must point exclusively to the V56.60 approved layers.
for(const file of ['v56-49-nd96-home.css','v56-50-nd96-catalog.css','v56-51-nd96-categories.css','v56-52-nd96-cart.css'])must(fs.existsSync(file),`identity layer missing: ${file}`);
for(const imp of [
  '@import url("./v56-49-nd96-home.css?v=56.60")',
  '@import url("./v56-50-nd96-catalog.css?v=56.60")',
  '@import url("./v56-51-nd96-categories.css?v=56.60")',
  '@import url("./v56-52-nd96-cart.css?v=56.60")'
])must(bridge.includes(imp),`V56.60 bridge import missing: ${imp}`);
must(bridge.includes('FINAL APPROVED NATIONAL DAY 96 IDENTITY'),'final identity marker missing');

// Approved shared artwork must remain repository assets, not generated substitutes.
for(const asset of [
  'national-day-96-mark.svg',
  'national-day-96/assets/corner.svg',
  'national-day-96/assets/landscape.svg',
  'national-day-96/assets/header.svg',
  'national-day-96/assets/border.svg',
  'national-day-96/assets/fort.svg'
])must(fs.existsSync(asset)&&fs.statSync(asset).size>0,`National Day asset missing/empty: ${asset}`);
for(const css of [home,catalog,categories,cart])must(!css.includes('repeating-conic-gradient'),'synthetic/repetitive motif is forbidden');

// HOME / INVENTORY reference: light shell, centered official badge, quiet corners, white controls, pale Saudi landscape.
must(home.includes('V56.60 — HOME / INVENTORY'),'Home V56.60 marker missing');
for(const token of ['--nd96-deep:#0A5143','--nd96-green:#0F765B','--nd96-ink:#0C4038','--nd96-line:#DDE9E4'])must(home.includes(token),`Home palette token missing: ${token}`);
must(home.includes('.nd96-inventory-meta::after')&&home.includes('var(--nd96-mark) center/contain no-repeat'),'Home centered badge missing');
must(home.includes('.nd96-inventory-hero::before')&&home.includes('.nd96-inventory-hero::after'),'Home paired corner motifs missing');
must(home.includes('background:#fff!important')||home.includes('background:#FBFDFC!important'),'Home light surfaces missing');
must(home.includes('.nd96-inventory-catalog-heading::after')&&home.includes('var(--nd96-landscape)'),'Home Saudi landscape missing');
must(home.includes('.nd96-warehouse-button.bg-primary'),'Home active warehouse treatment missing');

// CUSTOMER CATALOG reference: white badge masthead, clean product hierarchy, dark-green CTA, pale lower skyline.
must(catalog.includes('V56.60 — CUSTOMER / CATALOG'),'Catalog V56.60 marker missing');
must(catalog.includes('.rights-bar::before')&&catalog.includes('var(--nd96-mark) center/contain no-repeat'),'Catalog centered badge missing');
must(catalog.includes('.rights-bar{')&&catalog.includes('background:#FBFDFC!important'),'Catalog light masthead missing');
must(catalog.includes('.nd96-add-button')&&catalog.includes('#0C5C49'),'Catalog approved add CTA missing');
must(catalog.includes('body.nd96-customer:not(:has(.nd96-categories-page)):not(:has(.nd96-cart-page))::after')&&catalog.includes('var(--nd96-landscape)'),'Catalog lower landscape missing');

// CATEGORIES reference: formal white two-column tiles, very restrained edge motifs, no decorative wallpaper per tile.
must(categories.includes('V56.60 — CATEGORIES'),'Categories V56.60 marker missing');
must(categories.includes('.nd96-categories-page::before')&&categories.includes('.nd96-categories-page::after'),'Categories edge motifs missing');
must(categories.includes('.nd96-category-tile{background:rgba(255,255,255,.985)!important'),'Categories white-card treatment missing');
must(categories.includes('.nd96-category-tile::before')&&categories.includes('content:none!important'),'Category-card decoration suppression missing');

// CART reference: white badge field over a dedicated green strip; empty-state card carries corners + Saudi landscape.
must(cart.includes('V56.60 — CART'),'Cart V56.60 marker missing');
must(cart.includes('body.nd96-customer:has(.nd96-cart-page) .rights-bar::after')&&cart.includes('height:34px')&&cart.includes('background:var(--nd96-deep)!important'),'Cart green identity strip missing');
must(cart.includes('.nd96-empty-cart{')&&cart.includes('var(--nd96-corner),var(--nd96-corner),var(--nd96-landscape)'),'Cart empty-state composition missing');
must(cart.includes('.rights-footer{background:#FBFDFC!important'),'Cart light footer treatment missing');

// Decorative identity paint can never intercept controls, and bottom-navigation mechanics remain owned by the app.
const combined=[home,catalog,categories,cart].join('\n');
must(combined.includes('pointer-events:none'),'non-interactive seasonal artwork contract missing');
for(const css of [home,catalog,categories,cart]){
  const navPosition=/(^|[}\n])[^{}]*\bnav\b[^{}]*\{[^{}]*\bposition\s*:/m.test(css);
  must(!navPosition,'seasonal CSS must not redefine bottom-navigation positioning');
}

// Production application wiring remains present; identity is still centrally switchable from the admin console.
must(index.includes('v56-39-site-identity.js'),'employee identity runtime missing');
must(customer.includes('v56-39-site-identity.js'),'customer identity runtime missing');
must(identityConsole.includes('الهويات والمناسبات')&&identityConsole.includes("activeIdentity:national?'national96':'default'"),'identity console activation missing');

console.log('V56.60 National Day four-view reference contract + cache revision + app-safety regression: PASS');
