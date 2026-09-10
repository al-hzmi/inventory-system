import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const bridge=read('v56-39-national-day.css');
const home=read('v56-49-nd96-home.css');
const catalog=read('v56-50-nd96-catalog.css');
const categories=read('v56-51-nd96-categories.css');
const cart=read('v56-52-nd96-cart.css');
const css=cart.replace(/\/\*[\s\S]*?\*\//g,'');

for(const [src,marker] of [[home,'V56.49 — HOME ONLY'],[catalog,'V56.50 — CATALOG ONLY'],[categories,'V56.51 — CATEGORIES ONLY'],[cart,'V56.52 — CART ONLY']]){
  must(src.includes(marker),`phase marker missing: ${marker}`);
}
const imports=[
  'v56-49-nd96-home.css?v=56.49',
  'v56-50-nd96-catalog.css?v=56.50',
  'v56-51-nd96-categories.css?v=56.51',
  'v56-52-nd96-cart.css?v=56.52'
];
for(const imp of imports)must(bridge.includes(imp),`phase import missing: ${imp}`);
for(let i=1;i<imports.length;i++)must(bridge.indexOf(imports[i-1])<bridge.indexOf(imports[i]),`phase order invalid: ${imports[i-1]} -> ${imports[i]}`);

for(const required of ['body.nd96-customer','.nd96-cart-page','.nd96-empty-cart','.ui-section-head','.sticky']){
  must(cart.includes(required),`Cart visual contract missing: ${required}`);
}
for(const asset of ['national-day-96-mark.svg','national-day-96/assets/corner.svg']){
  must(fs.existsSync(asset),`approved ND96 asset missing: ${asset}`);
  must(cart.includes(asset),`Cart CSS does not reference approved asset: ${asset}`);
}
must(cart.includes('pointer-events:none'),'decorative Cart artwork must never intercept interaction');

// Cart phase may never restyle prior pages, later pages, or bottom navigation.
for(const forbidden of ['.nd96-inventory-hero','.nd96-products-heading','.nd96-category-tile','.nd96-categories-page','.orders-page','.account-page','.nd96-footer','.rights-footer']){
  must(!css.includes(forbidden),`Cart phase leaked outside Cart: ${forbidden}`);
}
must(!/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/m.test(css),'Cart seasonal layer must not target navigation');

// Protect real UI geometry. Only decorative pseudo-elements may own dimensions/offset paint boxes.
const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','padding-inline','padding-block','margin','margin-top','margin-bottom','margin-left','margin-right','margin-inline','margin-block','gap','row-gap','column-gap','font-size','line-height','grid-template-columns','grid-template-rows','flex-basis','order','border-radius'];
for(const block of blocks){
  if(block.selector.includes('::before')||block.selector.includes('::after')||block.selector.startsWith('@'))continue;
  for(const prop of geometry){
    const re=new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,`m`);
    must(!re.test(block.body),`Cart base UI geometry override forbidden: ${prop} in ${block.selector}`);
  }
}

must(cart.includes('button.bg-dangerSoft'),'danger action semantic color contract missing');
must(cart.includes('button.bg-primary'),'checkout primary action identity contract missing');
console.log('V56.52 Cart-only ND96 composition + protected Home/Catalog/Categories + zero-layout-drift regression: PASS');
