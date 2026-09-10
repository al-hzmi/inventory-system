import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const bridge=read('v56-39-national-day.css');
const home=read('v56-49-nd96-home.css');
const catalog=read('v56-50-nd96-catalog.css');
const stripComments=s=>s.replace(/\/\*[\s\S]*?\*\//g,'');
const css=stripComments(catalog);

must(home.includes('V56.49 — HOME ONLY'),'protected Home phase missing');
must(bridge.includes('@import url("./v56-49-nd96-home.css?v=56.49")'),'protected Home import missing');
must(bridge.includes('@import url("./v56-50-nd96-catalog.css?v=56.50")'),'V56.50 Catalog import missing');
must(bridge.indexOf('v56-49-nd96-home.css')<bridge.indexOf('v56-50-nd96-catalog.css'),'Catalog must layer after protected Home');
must(catalog.includes('V56.50 — CATALOG ONLY'),'Catalog phase marker missing');

for(const token of ['--nd96-deep:#064B43','--nd96-green:#0F7A5A','--nd96-mint:#EEF7F2','--nd96-rust:#D9643A']){
  must(catalog.includes(token),`Catalog palette token missing: ${token}`);
}
for(const asset of ['national-day-96-mark.svg','national-day-96/assets/header.svg','national-day-96/assets/border.svg','national-day-96/assets/corner.svg']){
  must(fs.existsSync(asset),`National Day asset missing: ${asset}`);
  must(catalog.includes(asset),`Catalog CSS does not reference approved asset: ${asset}`);
}

for(const required of ['body.nd96-customer','.rights-bar','.nd96-customer-headrow','.nd96-search-rail','.nd96-category-chip','.nd96-products-heading','.catalog-card.nd96-product-card','.nd96-add-button']){
  must(catalog.includes(required),`Catalog visual contract missing: ${required}`);
}

// V56.50 is deliberately Catalog-only. Categories and Cart content stay on the protected base UI.
for(const forbidden of ['.nd96-categories-page','.category-tile','.nd96-cart-page','.nd96-empty-cart','.rights-footer']){
  must(!css.includes(forbidden),`Catalog phase leaked into a later page: ${forbidden}`);
}

// Bottom navigation mechanics remain sacred. Ignore comments so prose cannot create false positives.
must(!/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/m.test(css),'Catalog seasonal layer must not target navigation');

// Real UI geometry is immutable. Only decorative pseudo-elements may own dimensions/offset paint boxes.
const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','padding-inline','padding-block','margin','margin-top','margin-bottom','margin-left','margin-right','margin-inline','margin-block','gap','row-gap','column-gap','font-size','line-height','grid-template-columns','grid-template-rows','flex-basis','order','border-radius'];
for(const block of blocks){
  if(block.selector.includes('::before')||block.selector.includes('::after')||block.selector.startsWith('@'))continue;
  for(const prop of geometry){
    const re=new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,`m`);
    must(!re.test(block.body),`Catalog base UI geometry override forbidden: ${prop} in ${block.selector}`);
  }
}

must(catalog.includes('pointer-events:none'),'decorative Catalog artwork must never intercept interaction');
console.log('V56.50 Catalog-only ND96 composition + protected Home + zero-layout-drift regression: PASS');
