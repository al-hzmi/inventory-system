import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const runtime=read('v56-39-site-identity.js'),css=read('v56-39-national-day.css'),page=read('identities.html'),nav=read('v46-admin-nav.js'),index=read('index.html'),customer=read('customer.html'),adminDashboard=read('admin-dashboard.html');

// Central seasonal-control contract remains unchanged.
must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const DEFAULT_IDENTITY='default'"),'default identity must remain explicit');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes("enabled:false"),'occasion identity must default off');
must(runtime.includes("VISUAL_REVISION='56.47'"),'V56.47 visual revision missing');
must(runtime.includes('onSnapshot'),'identity must update in realtime');
must(runtime.includes("PREVIEW_KEY='batco_identity_preview_v1'"),'local preview contract missing');
must(runtime.includes("const IDENTITY_APP_NAME='batco-identity-v56-39'"),'identity Firestore client must use an isolated named Firebase app');
must(runtime.includes('candidate?.name===IDENTITY_APP_NAME')&&runtime.includes('firebase.initializeApp(FIREBASE_CONFIG,IDENTITY_APP_NAME)'),'identity runtime must not start the default Firebase app/Firestore instance');
must(runtime.includes('return app.firestore()'),'identity runtime must subscribe through its isolated app');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');

// V56.47 art direction: ZIP-derived modular assets, restrained palette, no synthetic substitute.
for(const token of ['--nd96-deep:#064B43','--nd96-green:#0F7A5A','--nd96-emerald:#2E8B6E','--nd96-yellow:#F3C75E','--nd96-rust:#D9643A'])must(css.includes(token),`V56.47 palette token missing: ${token}`);
for(const asset of ['national-day-96/assets/header.svg','national-day-96/assets/border.svg','national-day-96/assets/corner.svg','national-day-96/assets/fort.svg','national-day-96/assets/landscape.svg']){
  must(fs.existsSync(asset),`ZIP-derived National Day asset missing: ${asset}`);
  must(css.includes(asset),`seasonal CSS does not reference: ${asset}`);
  const svg=read(asset);
  must(svg.includes('<svg')&&svg.includes('</svg>'),`invalid SVG asset: ${asset}`);
  must(!svg.includes('data:image/'),`raster embed forbidden in SVG asset: ${asset}`);
}
for(const retired of ['repeating-conic-gradient','national96-weave.svg','national96-watermark.svg','national96-landscape.svg','header-scene.svg','najdi-pattern.svg','corner-pattern.svg','fort-scene.svg','bottom-landscape.svg'])must(!css.includes(retired),`retired/synthetic visual behavior returned: ${retired}`);
must(css.includes('#batco-nd96-frame')&&css.includes('#batco-nd96-badge')&&css.includes('display:none!important'),'legacy injected visual DOM must remain hard-disabled');
must(css.includes('pointer-events:none'),'decorative layers must never intercept interaction');

// Critical UX contract: seasonal CSS must never alter persistent bottom-nav mechanics.
const blocks=[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
const navBlocks=blocks.filter(x=>/(^|[\s,>+~])nav(?:[\s.#:[>+~]|$)/.test(x.selector)&&!x.selector.includes('::'));
const navForbidden=['position','top','bottom','left','right','inset','inset-inline','inset-block','height','min-height','max-height','overflow','overflow-x','overflow-y','transform','margin','padding'];
for(const block of navBlocks)for(const prop of navForbidden)must(!new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,'m').test(block.body),`bottom navigation geometry override forbidden: ${prop} in ${block.selector}`);
must(!css.includes('body.nd96-customer nav{position:'),'seasonal skin must never replace fixed/sticky nav positioning');

// General UI geometry lock: dimensions belong only to decorative pseudo-elements, not real UI selectors.
const geometry=['width','height','min-width','max-width','min-height','max-height','padding','padding-top','padding-bottom','padding-left','padding-right','padding-inline','padding-block','margin','margin-top','margin-bottom','margin-left','margin-right','margin-inline','margin-block','gap','row-gap','column-gap','font-size','line-height','grid-template-columns','grid-template-rows','flex-basis','order','border-radius'];
for(const block of blocks){
  if(block.selector.includes('::before')||block.selector.includes('::after')||block.selector.startsWith('@'))continue;
  for(const prop of geometry)must(!new RegExp(`(^|[;\\s])${prop.replaceAll('-','\\-')}\\s*:`,'m').test(block.body),`base UI geometry override forbidden: ${prop} in ${block.selector}`);
}

// Existing controls/routes/loaders remain wired to the same base application.
must(page.includes('الهويات والمناسبات')&&page.includes("activeIdentity:national?'national96':'default'"),'identity console activation missing');
must(page.includes('window.confirm(question)'),'activation safety confirmation missing');
must(page.includes('مقفلة حتى تفعّلها'),'national identity must be visibly locked by default');
must(nav.includes("['identity','الهويات','./identities.html']"),'admin identities button missing');
must(nav.includes("'identities.html'")&&nav.includes("if(path==='identities.html')return'identity'"),'identity route missing');
must(adminDashboard.includes('v46-admin-nav.js?v=56.39'),'admin dashboard must cache-bust the identity-aware nav');
must(index.includes('v56-39-site-identity.js?v=56.39'),'employee runtime identity injection missing');
must(customer.includes('v56-39-site-identity.js?v=56.39'),'customer runtime identity injection missing');
for(const file of ['stocktake.html','stocktake-accountant.html','admin-stocktake.html'])if(fs.existsSync(file))must(read(file).includes('v56-39-site-identity.js?v=56.39'),`${file} identity injection missing`);
must(fs.existsSync('national-day-96-mark.svg'),'national day mark missing');

console.log('V56.47 occasion identity + zero-layout-drift regression: PASS');
