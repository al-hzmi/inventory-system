import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const runtime=read('v56-39-site-identity.js');
const bridge=read('v56-39-national-day.css');
const home=read('v56-49-nd96-home.css');
const page=read('identities.html'),nav=read('v46-admin-nav.js'),index=read('index.html'),customer=read('customer.html'),adminDashboard=read('admin-dashboard.html');

// Central identity runtime stays untouched; V56.49 is a paint-layer rollout only.
must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes('onSnapshot'),'identity realtime control missing');
must(runtime.includes("VISUAL_REVISION='56.48'"),'identity runtime unexpectedly changed during Home-only phase');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');

// Rejected V56.48 composition is fully retired; the old entrypoint only imports the clean Home skin.
must(bridge.includes('@import url("./v56-49-nd96-home.css?v=56.49")'),'V56.49 Home skin bridge missing');
must(!bridge.includes('nd96-products-heading')&&!bridge.includes('nd96-categories-page')&&!bridge.includes('nd96-cart-page'),'rejected multi-page composition leaked into bridge');
must(home.includes('V56.49 — HOME ONLY'),'Home-only rollout marker missing');

for(const token of ['--nd96-deep:#064B43','--nd96-green:#0F7A5A','--nd96-mint:#EEF7F2','--nd96-rust:#D9643A'])must(home.includes(token),`Home palette token missing: ${token}`);
for(const asset of ['national-day-96-mark.svg','national-day-96/assets/header.svg','national-day-96/assets/corner.svg','national-day-96/assets/fort.svg','national-day-96/assets/landscape.svg']){
  must(fs.existsSync(asset),`National Day asset missing: ${asset}`);
  must(home.includes(asset),`Home CSS does not reference approved asset: ${asset}`);
}

// Phase gate: only inventory/Home may receive seasonal composition in V56.49.
const foreignPageMarkers=[
  /body\.nd96-customer(?:\b|[\s.#:[>+~])/, /\.nd96-products-heading(?:\b|[\s.#:[>+~])/, /\.catalog-card(?:\b|[\s.#:[>+~])/,
  /\.nd96-categories-page(?:\b|[\s.#:[>+~])/, /\.category-tile(?:\b|[\s.#:[>+~])/, /\.nd96-cart-page(?:\b|[\s.#:[>+~])/,
  /\.nd96-empty-cart(?:\b|[\s.#:[>+~])/, /\.rights-footer(?:\b|[\s.#:[>+~])/
];
for(const marker of foreignPageMarkers)must(!marker.test(home),`Home-only phase leaked into another page: ${marker}`);
must(home.includes('.nd96-inventory-meta::before'),'approved Home header composition missing');
must(home.includes('.nd96-inventory-hero::before')&&home.includes('.nd96-inventory-hero::after'),'approved Home corner motifs missing');
must(home.includes('.nd96-inventory-catalog-heading::before'),'approved Home lower composition missing');
must(home.includes('min(23vw,168px)'),'Home fort scale cap missing');
must(home.includes('single occurrence only'),'single-landscape composition contract missing');
must(home.includes('pointer-events:none'),'decorative layers must never intercept interaction');

// Navigation mechanics are sacred: Home skin must not target nav at all.
must(!/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/m.test(home),'seasonal Home skin must not target bottom navigation');

// Geometry lock: real UI selectors may change paint/stacking only; dimensions live on pseudo-elements only.
const blocks=[...home.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','padding-inline','padding-block','margin','margin-top','margin-bottom','margin-left','margin-right','margin-inline','margin-block','gap','row-gap','column-gap','font-size','line-height','grid-template-columns','grid-template-rows','flex-basis','order','border-radius'];
for(const block of blocks){
  if(block.selector.includes('::before')||block.selector.includes('::after')||block.selector.startsWith('@'))continue;
  for(const prop of geometry)must(!new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,'m').test(block.body),`base UI geometry override forbidden: ${prop} in ${block.selector}`);
}

// Existing routes/loaders remain wired to the production application.
must(page.includes('الهويات والمناسبات')&&page.includes("activeIdentity:national?'national96':'default'"),'identity console activation missing');
must(nav.includes("['identity','الهويات','./identities.html']"),'admin identities button missing');
must(adminDashboard.includes('v46-admin-nav.js?v=56.39'),'admin dashboard identity-aware nav missing');
must(index.includes('v56-39-site-identity.js?v=56.39'),'employee identity runtime missing');
must(customer.includes('v56-39-site-identity.js?v=56.39'),'customer identity runtime missing');

console.log('V56.49 Home-only approved composition + clean rollback + zero-layout-drift regression: PASS');