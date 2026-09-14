import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const bridge=read('v56-39-national-day.css');
const categories=read('v56-51-nd96-categories.css');
const css=categories.replace(/\/\*[\s\S]*?\*\//g,'');

must(categories.includes('V56.60 — CATEGORIES'),'final Categories marker missing');
for(const imp of ['v56-49-nd96-home.css?v=56.60','v56-50-nd96-catalog.css?v=56.60','v56-51-nd96-categories.css?v=56.60'])must(bridge.includes(imp),`final identity import missing: ${imp}`);
must(bridge.indexOf('v56-50-nd96-catalog.css')<bridge.indexOf('v56-51-nd96-categories.css'),'Categories must layer after Catalog');

for(const required of ['body.nd96-customer','.nd96-categories-page','.nd96-category-tile','.ui-section-head']){
  must(categories.includes(required),`Categories visual contract missing: ${required}`);
}
must(categories.includes('var(--nd96-corner)'),'approved pale corner artwork missing from Categories');
must(categories.includes('pointer-events:none'),'decorative Categories artwork must never intercept interaction');
must(categories.includes('.nd96-category-tile::before')&&categories.includes('content:none!important'),'repeated card-pattern suppression missing');

// Cart and unrelated pages stay untouched by the Categories-only layer.
for(const forbidden of ['.nd96-cart-page','.nd96-empty-cart','.orders-page','.account-page','.nd96-product-card','.nd96-add-button']){
  must(!css.includes(forbidden),`Categories layer leaked outside its scope: ${forbidden}`);
}
must(!/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/m.test(css),'Categories seasonal layer must not target navigation');

// Category card geometry is inherited from application; paint only.
const protectedSelectors=['.nd96-category-tile'];
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','margin','margin-top','margin-bottom','margin-left','margin-right','gap','font-size','line-height','grid-template-columns','flex-basis','order','border-radius'];
const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
for(const block of blocks){
  if(block.selector.includes('::before')||block.selector.includes('::after'))continue;
  if(!protectedSelectors.some(s=>block.selector.includes(s)))continue;
  for(const prop of geometry){
    const re=new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,`m`);
    must(!re.test(block.body),`protected Categories UI geometry override forbidden: ${prop} in ${block.selector}`);
  }
}

console.log('V56.60 final approved Categories identity + clean cards + navigation safety: PASS');
