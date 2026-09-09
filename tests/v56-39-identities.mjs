import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const must=(ok,msg)=>{if(!ok)throw new Error(msg)};
const runtime=read('v56-39-site-identity.js'),css=read('v56-39-national-day.css'),page=read('identities.html'),nav=read('v46-admin-nav.js'),index=read('index.html'),customer=read('customer.html'),adminDashboard=read('admin-dashboard.html');

// Central seasonal-control contract remains unchanged.
must(runtime.includes("const CONTROL_DOC='site_identity'"),'central identity control missing');
must(runtime.includes("const DEFAULT_IDENTITY='default'"),'default identity must remain explicit');
must(runtime.includes("const NATIONAL_IDENTITY='national96'"),'national identity contract missing');
must(runtime.includes("enabled:false"),'occasion identity must default off');
must(runtime.includes("VISUAL_REVISION='56.46'"),'V56.46 visual revision missing');
must(runtime.includes('onSnapshot'),'identity must update in realtime');
must(runtime.includes("PREVIEW_KEY='batco_identity_preview_v1'"),'local preview contract missing');
must(runtime.includes("const IDENTITY_APP_NAME='batco-identity-v56-39'"),'identity Firestore client must use an isolated named Firebase app');
must(runtime.includes('candidate?.name===IDENTITY_APP_NAME')&&runtime.includes('firebase.initializeApp(FIREBASE_CONFIG,IDENTITY_APP_NAME)'),'identity runtime must not start the default Firebase app/Firestore instance');
must(runtime.includes('return app.firestore()'),'identity runtime must subscribe through its isolated app');
must(!runtime.includes("document.createElement('img')")&&!runtime.includes('document.createElement("img")'),'decorative image DOM injection is forbidden');

// V56.46 art-direction contract: local modular SVG system, restrained Saudi palette, no retired synthetic skin.
for(const token of ['--nd96-deep:#065F46','--nd96-emerald:#0F7A5A','--nd96-rust:#D9643A','--nd96-sun:#F3C75E'])must(css.includes(token),`V56.46 palette token missing: ${token}`);
for(const asset of ['national-day-96/header-scene.svg','national-day-96/najdi-pattern.svg','national-day-96/corner-pattern.svg','national-day-96/fort-scene.svg','national-day-96/bottom-landscape.svg']){
  must(fs.existsSync(asset),`modular National Day asset missing: ${asset}`);
  must(css.includes(asset),`seasonal CSS does not reference: ${asset}`);
  const svg=read(asset);
  must(svg.includes('<svg')&&svg.includes('</svg>'),`invalid SVG asset: ${asset}`);
  must(!svg.includes('data:image/'),`raster embed forbidden in SVG asset: ${asset}`);
}
for(const retired of ['repeating-conic-gradient','national96-weave.svg','national96-watermark.svg','national96-landscape.svg','#batco-nd96-frame','#batco-nd96-badge'])must(!css.includes(retired),`retired synthetic visual behavior returned: ${retired}`);
must(css.includes('pointer-events:none'),'decorative layers must never intercept interaction');

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

console.log('V56.46 occasion identity regression: PASS');
