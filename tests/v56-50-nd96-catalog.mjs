import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const bridge=read('v56-39-national-day.css');
const catalog=read('v56-50-nd96-catalog.css');
const css=catalog.replace(/\/\*[\s\S]*?\*\//g,'');

must(catalog.includes('V56.60 — CUSTOMER / CATALOG'),'final Catalog marker missing');
for(const imp of ['v56-49-nd96-home.css?v=56.60','v56-50-nd96-catalog.css?v=56.60'])must(bridge.includes(imp),`final identity import missing: ${imp}`);
must(bridge.indexOf('v56-49-nd96-home.css')<bridge.indexOf('v56-50-nd96-catalog.css'),'Catalog must layer after Home');

for(const token of ['--nd96-deep:#0A5143','--nd96-green:#0F765B','--nd96-ink:#0C4038','--nd96-mint:#EDF6F2','--nd96-rust:#B85C16']){
  must(catalog.includes(token),`Catalog palette token missing: ${token}`);
}
for(const asset of ['national-day-96-mark.svg','national-day-96/assets/corner.svg','national-day-96/assets/landscape.svg']){
  must(fs.existsSync(asset),`approved ND96 asset missing: ${asset}`);
  must(catalog.includes(asset),`Catalog CSS does not reference approved asset: ${asset}`);
}
for(const required of ['body.nd96-customer','.rights-bar','.nd96-customer-header','.nd96-customer-headrow','.nd96-search-rail','.nd96-category-chip','.nd96-products-heading','.catalog-card.nd96-product-card','.nd96-add-button']){
  must(catalog.includes(required),`Catalog visual contract missing: ${required}`);
}

must(catalog.includes('.rights-bar::before'),'Catalog masthead National Day badge missing');
must(catalog.includes('.rights-bar::after'),'Catalog masthead pale edge motif missing');
must(catalog.includes('pointer-events:none'),'decorative Catalog artwork must never intercept interaction');
must(catalog.includes('body.nd96-customer:not(:has(.nd96-categories-page)):not(:has(.nd96-cart-page))::after'),'Catalog lower landscape guard missing');

// Bottom navigation mechanics remain sacred.
must(!/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/m.test(css),'Catalog seasonal layer must not target navigation');
must(!/(?:html|body)[^{]*\{[^}]*\b(?:transform|filter|perspective|contain|will-change)\s*:/m.test(css),'Catalog skin must not create a fixed-position containing block on root elements');

// Interactive UI geometry remains inherited. Masthead itself may reserve seasonal badge space.
const protectedSelectors=['.nd96-customer-header','.nd96-customer-headrow','.nd96-header-action','.nd96-search-rail','nd96-search-rail input','.nd96-category-chip','.catalog-card.nd96-product-card','.nd96-add-button'];
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','margin','margin-top','margin-bottom','margin-left','margin-right','gap','font-size','line-height','grid-template-columns','flex-basis','order','border-radius'];
const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
for(const block of blocks){
  if(!protectedSelectors.some(s=>block.selector.includes(s)))continue;
  for(const prop of geometry){
    const re=new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,`m`);
    must(!re.test(block.body),`protected Catalog UI geometry override forbidden: ${prop} in ${block.selector}`);
  }
}

console.log('V56.60 final approved Catalog identity + product geometry lock + navigation safety: PASS');
