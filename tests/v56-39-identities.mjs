import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const strip=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const runtime=read('v56-39-site-identity.js');
const bridge=read('v56-39-national-day.css');
const home=read('v56-49-nd96-home.css');
const css=strip(home);
const page=read('identities.html'),nav=read('v46-admin-nav.js'),index=read('index.html'),customer=read('customer.html'),adminDashboard=read('admin-dashboard.html');

// Identity architecture and activation remain centralized and reversible.
must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes('onSnapshot'),'identity realtime control missing');
must(runtime.includes("VISUAL_REVISION='56.48'"),'identity runtime changed unexpectedly');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');

// Final V56.60 bridge must load all four page skins in deterministic order.
const imports=[
  'v56-49-nd96-home.css?v=56.60',
  'v56-50-nd96-catalog.css?v=56.60',
  'v56-51-nd96-categories.css?v=56.60',
  'v56-52-nd96-cart.css?v=56.60'
];
for(const imp of imports)must(bridge.includes(imp),`final identity import missing: ${imp}`);
for(let i=1;i<imports.length;i++)must(bridge.indexOf(imports[i-1])<bridge.indexOf(imports[i]),`identity layer order invalid: ${imports[i-1]} -> ${imports[i]}`);
must(home.includes('V56.60 — HOME / INVENTORY'),'final Home marker missing');

for(const token of ['--nd96-deep:#0A5143','--nd96-green:#0F765B','--nd96-ink:#0C4038','--nd96-mint:#EDF6F2','--nd96-rust:#B85C16']){
  must(home.includes(token),`final Home palette token missing: ${token}`);
}
for(const asset of ['national-day-96-mark.svg','national-day-96/assets/corner.svg','national-day-96/assets/landscape.svg']){
  must(fs.existsSync(asset),`approved National Day asset missing: ${asset}`);
  must(home.includes(asset),`Home CSS does not reference approved asset: ${asset}`);
}
for(const required of ['.nd96-inventory-meta','.nd96-inventory-hero','.nd96-inventory-title','.nd96-warehouse-button','.nd96-customers-button','.nd96-inventory-chip','.nd96-inventory-catalog-heading','.nd96-warehouse-empty']){
  must(home.includes(required),`Home visual contract missing: ${required}`);
}
must(home.includes('.nd96-inventory-meta::after'),'approved centered National Day badge missing on Home');
must(home.includes('.nd96-inventory-hero::before')&&home.includes('.nd96-inventory-hero::after'),'approved pale Home corner motifs missing');
must(home.includes('.nd96-inventory-catalog-heading::after'),'approved Home landscape anchor missing');
must(home.includes('pointer-events:none'),'Home decorative layers must never intercept interaction');

// Home skin may not leak into customer SPA pages or bottom navigation.
for(const marker of [/body\.nd96-customer/,/\.nd96-products-heading/,/\.nd96-categories-page/,/\.nd96-cart-page/,/\.nd96-empty-cart/]){
  must(!marker.test(css),`Home skin leaked into another page: ${marker}`);
}
must(!/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/m.test(css),'seasonal Home skin must not target bottom navigation');
must(!/(?:html|body)[^{]*\{[^}]*\b(?:transform|filter|perspective|contain|will-change)\s*:/m.test(css),'Home skin must not create a fixed-position containing block on root elements');

// Critical interactive geometry remains inherited from the production UI.
const protectedSelectors=['.nd96-warehouse-button','.nd96-customers-button','.nd96-inventory-chip','body.nd96-inventory input'];
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','margin','margin-top','margin-bottom','margin-left','margin-right','gap','font-size','line-height','grid-template-columns','flex-basis','order','border-radius'];
const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
for(const block of blocks){
  if(!protectedSelectors.some(s=>block.selector.includes(s)))continue;
  for(const prop of geometry){
    const re=new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,`m`);
    must(!re.test(block.body),`protected Home UI geometry override forbidden: ${prop} in ${block.selector}`);
  }
}

// Existing routes/loaders remain wired to production application.
must(page.includes('الهويات والمناسبات')&&page.includes("activeIdentity:national?'national96':'default'"),'identity console activation missing');
must(nav.includes("['identity','الهويات','./identities.html']"),'admin identities button missing');
must(adminDashboard.includes('v46-admin-nav.js?v=56.53'),'admin dashboard identity-aware nav missing');
must(index.includes('v56-39-site-identity.js?v=56.39'),'employee identity runtime missing');
must(customer.includes('v56-39-site-identity.js?v=56.39'),'customer identity runtime missing');

console.log('V56.60 final approved Home identity + protected UI geometry + navigation safety: PASS');
