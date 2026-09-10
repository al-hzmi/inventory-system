import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const bridge=read('v56-39-national-day.css');
const home=read('v56-49-nd96-home.css');
const catalog=read('v56-50-nd96-catalog.css');
const categories=read('v56-51-nd96-categories.css');
const css=categories.replace(/\/\*[\s\S]*?\*\//g,'');

must(home.includes('V56.49 — HOME ONLY'),'protected Home phase missing');
must(catalog.includes('V56.50 — CATALOG ONLY'),'protected Catalog phase missing');
must(categories.includes('V56.51 — CATEGORIES ONLY'),'Categories phase marker missing');
for(const imp of [
  '@import url("./v56-49-nd96-home.css?v=56.49")',
  '@import url("./v56-50-nd96-catalog.css?v=56.50")',
  '@import url("./v56-51-nd96-categories.css?v=56.51")'
]) must(bridge.includes(imp),`phase import missing: ${imp}`);
must(bridge.indexOf('v56-49-nd96-home.css')<bridge.indexOf('v56-50-nd96-catalog.css'),'Catalog must follow Home');
must(bridge.indexOf('v56-50-nd96-catalog.css')<bridge.indexOf('v56-51-nd96-categories.css'),'Categories must follow Catalog');

for(const required of ['body.nd96-customer','.nd96-categories-page','.nd96-category-tile','.ui-section-head','.sticky']){
  must(categories.includes(required),`Categories visual contract missing: ${required}`);
}
must(categories.includes('national-day-96/assets/corner.svg'),'approved ND96 corner artwork missing from Categories phase');
must(categories.includes('pointer-events:none'),'decorative Categories artwork must never intercept interaction');

// V56.51 is deliberately Categories-only. Cart, Orders, Account and bottom navigation stay untouched.
for(const forbidden of ['.nd96-cart-page','.nd96-empty-cart','.nd96-footer','.rights-footer','.orders-page','.account-page']){
  must(!css.includes(forbidden),`Categories phase leaked into a later page: ${forbidden}`);
}
must(!/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/m.test(css),'Categories seasonal layer must not target navigation');

// Product-card paint belongs to V56.50 and must not be duplicated here.
for(const forbidden of ['.nd96-product-card','.catalog-card.nd96-product-card','.nd96-add-button']){
  must(!css.includes(forbidden),`Categories phase duplicated protected Catalog styling: ${forbidden}`);
}

// Protect real UI geometry. Only decorative pseudo-elements may own dimensions/offset paint boxes.
const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','padding-inline','padding-block','margin','margin-top','margin-bottom','margin-left','margin-right','margin-inline','margin-block','gap','row-gap','column-gap','font-size','line-height','grid-template-columns','grid-template-rows','flex-basis','order','border-radius'];
for(const block of blocks){
  if(block.selector.includes('::before')||block.selector.includes('::after')||block.selector.startsWith('@'))continue;
  for(const prop of geometry){
    const re=new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,`m`);
    must(!re.test(block.body),`Categories base UI geometry override forbidden: ${prop} in ${block.selector}`);
  }
}

console.log('V56.51 Categories-only ND96 composition + protected Home/Catalog + zero-layout-drift regression: PASS');
