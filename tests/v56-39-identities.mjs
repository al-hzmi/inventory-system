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

must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes('onSnapshot'),'identity realtime control missing');
must(runtime.includes("PREVIEW_KEY='batco_identity_preview_v1'"),'preview contract missing');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');

must(bridge.includes('@import url("./v56-65-nd96-minimal.css?v=56.66")'),'V56.66 visible-minimal bridge import missing');
for(const oldImport of ['v56-49-nd96-home.css','v56-50-nd96-catalog.css','v56-51-nd96-categories.css','v56-52-nd96-cart.css','v56-63-nd96-exact-webp.css'])
  must(!bridge.includes(oldImport),`legacy seasonal import must be detached: ${oldImport}`);
must(bridge.includes('V56.66 — VISIBLE MINIMAL NATIONAL DAY 96 IDENTITY'),'V56.66 bridge marker missing');

for(const asset of ['national-day-96/assets/v56-63-mark.webp','national-day-96/assets/corner.svg'])
  must(fs.existsSync(asset)&&fs.statSync(asset).size>1000,`V56.66 identity asset missing/empty: ${asset}`);
must(minimal.includes('v56-63-mark.webp'),'official National Day mark not wired');
must(minimal.includes('corner.svg'),'subtle motif asset not wired');
must(minimal.includes('body.nd96-customer .rights-bar'),'customer top strip placement missing');
must(minimal.includes('background-image:var(--nd96-logo)'),'official mark must be painted without layout injection');
must(minimal.includes('.nd96-inventory-meta'),'inventory top mark placement missing');
must(minimal.includes('.nd96-header-action::after'),'header-action motif missing');
must(minimal.includes('.nd96-category-tile:nth-child(4n+1)::after'),'restrained category motif missing');
must(minimal.includes('pointer-events:none'),'decorative layers must be non-interactive');

const navPosition=/(^|[}\n])[^{}]*\bnav\b[^{}]*\{[^{}]*\bposition\s*:/m.test(minimal);
must(!navPosition,'seasonal CSS must not redefine bottom-navigation positioning');
must(!minimal.includes('position:fixed'),'V56.66 identity must not introduce fixed decorative layers');
for(const forbidden of ['min-height:','padding-bottom:','padding-top:']) must(!minimal.includes(forbidden),`seasonal CSS must not alter application geometry: ${forbidden}`);

must(minimal.includes('body.nd96-customer::before')&&minimal.includes('body.nd96-customer::after')&&minimal.includes('content:none!important'),'customer scenic layer suppression missing');
must(minimal.includes('.nd96-warehouse-empty::before')&&minimal.includes('.nd96-warehouse-empty::after'),'home scenic layer suppression missing');
must(minimal.includes('.nd96-empty-cart::before')&&minimal.includes('.nd96-empty-cart::after'),'cart scenic layer suppression missing');

const headerRules=new Map((Array.isArray(vercel.headers)?vercel.headers:[]).map(rule=>[rule.source,rule]));
for(const source of ['/v56-39-site-identity.js','/v56-39-national-day.css','/v56-65-nd96-minimal.css','/national-day-96/assets/:path*']){
  const rule=headerRules.get(source);must(rule,`Vercel cache policy missing for ${source}`);
  const cache=(Array.isArray(rule.headers)?rule.headers:[]).find(h=>String(h.key||'').toLowerCase()==='cache-control');
  must(cache&&/\bno-store\b/i.test(String(cache.value||'')),`no-store cache policy missing for ${source}`);
}

must(index.includes('v56-39-site-identity.js'),'employee identity runtime missing');
must(customer.includes('v56-39-site-identity.js'),'customer identity runtime missing');
must(identityConsole.includes('الهويات والمناسبات')&&identityConsole.includes("activeIdentity:national?'national96':'default'"),'identity console activation missing');

console.log('V56.66 visible minimal National Day identity regression: PASS');
