import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const bridge=read('v56-39-national-day.css');
const cart=read('v56-52-nd96-cart.css');
const css=cart.replace(/\/\*[\s\S]*?\*\//g,'');

must(cart.includes('V56.60 — CART'),'final Cart marker missing');
const imports=['v56-49-nd96-home.css?v=56.60','v56-50-nd96-catalog.css?v=56.60','v56-51-nd96-categories.css?v=56.60','v56-52-nd96-cart.css?v=56.60'];
for(const imp of imports)must(bridge.includes(imp),`final identity import missing: ${imp}`);
for(let i=1;i<imports.length;i++)must(bridge.indexOf(imports[i-1])<bridge.indexOf(imports[i]),`identity layer order invalid: ${imports[i-1]} -> ${imports[i]}`);

for(const required of ['body.nd96-customer','.nd96-cart-page','.nd96-empty-cart','.ui-section-head','.sticky']){
  must(cart.includes(required),`Cart visual contract missing: ${required}`);
}
for(const asset of ['national-day-96-mark.svg','national-day-96/assets/corner.svg','national-day-96/assets/landscape.svg'])must(fs.existsSync(asset),`approved ND96 asset missing: ${asset}`);
must(cart.includes('var(--nd96-corner)'),'Cart pale corner motif missing');
must(cart.includes('var(--nd96-landscape)'),'Cart approved lower landscape missing');
must(cart.includes('pointer-events:none'),'decorative Cart artwork must never intercept interaction');

// Cart layer may not target earlier page content or navigation.
for(const forbidden of ['.nd96-inventory-hero','.nd96-products-heading','.nd96-category-tile','.orders-page','.account-page']){
  must(!css.includes(forbidden),`Cart layer leaked outside Cart: ${forbidden}`);
}
must(!/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/m.test(css),'Cart seasonal layer must not target navigation');
must(!/(?:html|body)[^{]*\{[^}]*\b(?:transform|filter|perspective|contain|will-change)\s*:/m.test(css),'Cart skin must not create a fixed-position containing block on root elements');

// Empty state and real cart controls keep their production geometry; the seasonal masthead may reserve badge space.
const protectedSelectors=['.nd96-empty-cart','.nd96-cart-page>.grid>.bg-white.border','.nd96-cart-page>.grid>.sticky'];
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','margin','margin-top','margin-bottom','margin-left','margin-right','gap','font-size','line-height','grid-template-columns','flex-basis','order','border-radius'];
const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
for(const block of blocks){
  if(block.selector.includes('::before')||block.selector.includes('::after'))continue;
  if(!protectedSelectors.some(s=>block.selector.includes(s)))continue;
  for(const prop of geometry){
    const re=new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,`m`);
    must(!re.test(block.body),`protected Cart UI geometry override forbidden: ${prop} in ${block.selector}`);
  }
}

must(cart.includes('button.bg-primary'),'checkout primary action identity contract missing');
console.log('V56.60 final approved Cart identity + empty-state composition + navigation safety: PASS');
