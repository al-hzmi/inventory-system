import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

const runtime=read('v56-39-site-identity.js');
const bridge=read('v56-39-national-day.css');
const minimal=read('v56-65-nd96-minimal.css');
const index=read('index.html');
const customer=read('customer.html');
const identityConsole=read('identities.html');
const vercel=JSON.parse(read('vercel.json'));

// Controller contract remains unchanged; V56.65 is paint-only.
must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes('onSnapshot'),'identity realtime control missing');
must(runtime.includes("PREVIEW_KEY='batco_identity_preview_v1'"),'preview contract missing');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');
must(runtime.includes("active?'#0A5143'"),'approved browser theme color missing');

// V56.65 bridge must load only the minimal seasonal layer.
must(bridge.includes('@import url("./v56-65-nd96-minimal.css?v=56.65")'),'V56.65 minimal bridge import missing');
for(const oldImport of [
  'v56-49-nd96-home.css',
  'v56-50-nd96-catalog.css',
  'v56-51-nd96-categories.css',
  'v56-52-nd96-cart.css',
  'v56-63-nd96-exact-webp.css'
]) must(!bridge.includes(oldImport),`legacy seasonal import must be detached: ${oldImport}`);
must(bridge.includes('V56.65 — MINIMAL CLEAN NATIONAL DAY 96 IDENTITY'),'V56.65 bridge marker missing');

// Only the official top mark and restrained mint/Najdi motif are wired.
for(const asset of ['national-day-96/assets/v56-63-mark.webp','national-day-96/assets/corner.svg'])
  must(fs.existsSync(asset)&&fs.statSync(asset).size>1000,`V56.65 identity asset missing/empty: ${asset}`);
must(minimal.includes('v56-63-mark.webp'),'official National Day mark not wired');
must(minimal.includes('corner.svg'),'subtle motif asset not wired');
must(minimal.includes('.nd96-inventory-meta::after'),'home top mark placement missing');
must(minimal.includes('body.nd96-customer .rights-bar::before'),'customer top mark placement missing');
must(minimal.includes('.nd96-inventory-chip::after'),'home button motif missing');
must(minimal.includes('.nd96-category-chip::after'),'catalog chip motif missing');
must(minimal.includes('.nd96-category-tile::after'),'category tile motif missing');
must(minimal.includes('pointer-events:none'),'decorative layers must be non-interactive');

// Seasonal CSS must not own bottom-navigation positioning or application geometry.
const navPosition=/(^|[}\n])[^{}]*\bnav\b[^{}]*\{[^{}]*\bposition\s*:/m.test(minimal);
must(!navPosition,'seasonal CSS must not redefine bottom-navigation positioning');
must(!minimal.includes('position:fixed'),'V56.65 minimal identity must not introduce fixed decorative layers');

// Explicitly suppress the former scenic/composite paint paths.
must(minimal.includes('body.nd96-customer::after{content:none!important'), 'customer scenic layer suppression missing');
must(minimal.includes('.nd96-warehouse-empty::before')&&minimal.includes('content:none!important'),'home scenic layer suppression missing');
must(minimal.includes('.nd96-empty-cart::before')&&minimal.includes('content:none!important'),'cart scenic layer suppression missing');

// No-store policies for live identity files/assets.
const headerRules=new Map((Array.isArray(vercel.headers)?vercel.headers:[]).map(rule=>[rule.source,rule]));
for(const source of [
  '/v56-39-site-identity.js',
  '/v56-39-national-day.css',
  '/v56-65-nd96-minimal.css',
  '/national-day-96/assets/:path*'
]){
  const rule=headerRules.get(source);must(rule,`Vercel cache policy missing for ${source}`);
  const cache=(Array.isArray(rule.headers)?rule.headers:[]).find(h=>String(h.key||'').toLowerCase()==='cache-control');
  must(cache&&/\bno-store\b/i.test(String(cache.value||'')),`no-store cache policy missing for ${source}`);
}

must(index.includes('v56-39-site-identity.js'),'employee identity runtime missing');
must(customer.includes('v56-39-site-identity.js'),'customer identity runtime missing');
must(identityConsole.includes('الهويات والمناسبات')&&identityConsole.includes("activeIdentity:national?'national96':'default'"),'identity console activation missing');

console.log('V56.65 minimal clean National Day identity regression: PASS');
