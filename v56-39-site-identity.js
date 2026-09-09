(()=>{
'use strict';
const VERSION='56.40';
const VISUAL_REVISION='56.48';
const CACHE_KEY='batco_site_identity_cache_v1';
const PREVIEW_KEY='batco_identity_preview_v1';
const CONTROL_COLLECTION='system_controls';
const CONTROL_DOC='site_identity';
const DEFAULT_IDENTITY='default';
const NATIONAL_IDENTITY='national96';
const IDENTITY_APP_NAME='batco-identity-v56-39';
const DEFAULT_STATE={activeIdentity:DEFAULT_IDENTITY,enabled:false,revision:1};
const FIREBASE_CONFIG={apiKey:'AIzaSyCCvNlnZDxL5P4cPQrHYkOh3C8wJ6yl4Bw',authDomain:'inventory-system-ca3dc.firebaseapp.com',projectId:'inventory-system-ca3dc',storageBucket:'inventory-system-ca3dc.firebasestorage.app',messagingSenderId:'139575913885',appId:'1:139575913885:web:110648e07345b36da15374'};
let liveState={...DEFAULT_STATE},unsubscribe=null,uiObserver=null,uiFrame=0;

const safeJson=value=>{try{return JSON.parse(value)}catch{return null}};
const readPreview=()=>{try{const v=sessionStorage.getItem(PREVIEW_KEY)||'';return v===NATIONAL_IDENTITY?v:''}catch{return''}};
const normalize=row=>{const source=row&&typeof row==='object'?row:{};const national=source.enabled===true&&source.activeIdentity===NATIONAL_IDENTITY;return {activeIdentity:national?NATIONAL_IDENTITY:DEFAULT_IDENTITY,enabled:national,revision:Number(source.revision)||1,updatedAt:source.updatedAt||null,updatedBy:String(source.updatedBy||'')}};
const wanted=()=>readPreview()||liveState.activeIdentity||DEFAULT_IDENTITY;
const afterDom=fn=>document.body?fn():document.addEventListener('DOMContentLoaded',fn,{once:true});
const normText=value=>String(value||'').replace(/\s+/g,' ').trim();
const allByText=(selector,text)=>[...document.querySelectorAll(selector)].filter(el=>normText(el.textContent).includes(text));

const ensureStyle=()=>{
  let link=document.getElementById('v56-39-national-day-css');
  if(link){if(!String(link.href||'').includes('v='+VISUAL_REVISION))link.href='./v56-39-national-day.css?v='+VISUAL_REVISION;return link}
  link=document.createElement('link');link.id='v56-39-national-day-css';link.rel='stylesheet';link.href='./v56-39-national-day.css?v='+VISUAL_REVISION;document.head.appendChild(link);return link;
};
const setThemeColor=active=>{const meta=document.querySelector('meta[name="theme-color"]');if(!meta)return;if(!meta.dataset.identityDefault)meta.dataset.identityDefault=meta.getAttribute('content')||'#FFFFFF';meta.setAttribute('content',active?'#064B43':meta.dataset.identityDefault)};

/* V56.48: no decorative DOM injection. Existing UI receives semantic variant tags only.
   Seasonal artwork is CSS/SVG paint outside normal document flow. */
const decorateCustomer=()=>{
  const rights=document.querySelector('.rights-bar');if(!rights)return false;
  document.body.classList.add('nd96-customer');document.body.classList.remove('nd96-inventory');
  rights.classList.add('nd96-brand-strip');
  const header=rights.closest('header');if(header)header.classList.add('nd96-customer-header');
  if(header){
    const second=[...header.children].find(el=>el!==rights&&el.querySelector?.('b'));
    second?.classList.add('nd96-customer-headrow');
    const title=second?[...second.querySelectorAll('b')].find(el=>normText(el.textContent).includes('المعرض الرقمي')):null;
    title?.classList.add('nd96-portal-title');
    second?.querySelectorAll('button').forEach(btn=>btn.classList.add('nd96-header-action'));
  }
  const main=document.querySelector('main');
  if(main){
    const search=[...main.querySelectorAll('input')].find(i=>String(i.placeholder||'').includes('ابحث برقم الصنف'));
    if(search){const sticky=search.closest('.sticky');sticky?.classList.add('nd96-search-rail');sticky?.querySelectorAll('button').forEach(btn=>btn.classList.add('nd96-category-chip'))}
    allByText('b','جميع المنتجات').forEach(title=>title.closest('.flex')?.classList.add('nd96-products-heading'));
    main.querySelectorAll('.catalog-card').forEach(card=>{card.classList.add('nd96-product-card');card.querySelectorAll('button').forEach(btn=>{if(normText(btn.textContent).includes('إضافة'))btn.classList.add('nd96-add-button')})});
    allByText('h2','الأقسام').forEach(h=>h.closest('.fade-in')?.classList.add('nd96-categories-page'));
    main.querySelectorAll('.category-tile').forEach(tile=>tile.classList.add('nd96-category-tile'));
    allByText('h2','طلب الشراء').forEach(h=>h.closest('.fade-in')?.classList.add('nd96-cart-page'));
    allByText('b','طلبك فارغ').forEach(title=>{let box=title.parentElement;for(let i=0;i<5&&box;i++,box=box.parentElement){if(box.classList?.contains('border')&&box.classList?.contains('bg-surface')){box.classList.add('nd96-empty-cart');break}}});
  }
  document.querySelectorAll('.rights-footer').forEach(footer=>footer.classList.add('nd96-footer'));
  return true;
};

const findInventoryMeta=()=>{
  const nodes=[...document.querySelectorAll('div,header,section')].filter(el=>{const t=normText(el.textContent);return t.includes('مشغّل بواسطة')&&t.includes('تطوير مهند الحزمي')&&t.length<220});
  if(!nodes.length)return null;
  return nodes.sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length)[0];
};
const decorateInventory=()=>{
  const title=[...document.querySelectorAll('h1,h2')].find(el=>normText(el.textContent).includes('مخزون شركة بيت الأواني الطيبة'));
  if(!title||document.querySelector('.rights-bar'))return false;
  document.body.classList.add('nd96-inventory');document.body.classList.remove('nd96-customer');
  findInventoryMeta()?.classList.add('nd96-inventory-meta');
  title.classList.add('nd96-inventory-title');title.parentElement?.classList.add('nd96-inventory-hero');
  document.querySelectorAll('button').forEach(btn=>{
    const label=normText(btn.textContent);
    if(label.includes('مخزون جدة')||label.includes('مخزون الرياض'))btn.classList.add('nd96-warehouse-button');
    else if(label.includes('عملاء'))btn.classList.add('nd96-customers-button');
    else if(['جديدنا','البلاستيك','الأواني المنزلية','الألعاب والسباحة','العدد','العناية والنظافة','أدوات الشواء','القرطاسية','التحف والهدايا','البرطمان','أحذية OGS','مجات OGS','المخفضة','بقية الأصناف'].some(x=>label.includes(x)))btn.classList.add('nd96-inventory-chip');
  });
  allByText('h2','المعرض الرقمي').forEach(h=>h.parentElement?.classList.add('nd96-inventory-catalog-heading'));
  allByText('b','اختر المستودع').forEach(h=>{let box=h.parentElement;for(let i=0;i<5&&box;i++,box=box.parentElement){if(box.classList?.contains('border')){box.classList.add('nd96-warehouse-empty');break}}});
  return true;
};

const enhanceNationalUI=()=>{if(!document.body||!document.documentElement.classList.contains('batco-identity-national96'))return;decorateCustomer()||decorateInventory()};
const scheduleEnhance=()=>{if(uiFrame)return;uiFrame=requestAnimationFrame(()=>{uiFrame=0;enhanceNationalUI()})};
const startEnhancer=()=>afterDom(()=>{scheduleEnhance();if(uiObserver)return;uiObserver=new MutationObserver(scheduleEnhance);uiObserver.observe(document.body,{subtree:true,childList:true})});
const stopEnhancer=()=>afterDom(()=>{
  try{uiObserver?.disconnect()}catch{}uiObserver=null;if(uiFrame)cancelAnimationFrame(uiFrame);uiFrame=0;
  document.body.classList.remove('nd96-customer','nd96-inventory');
  document.querySelectorAll('[data-nd96-injected="1"],#batco-nd96-frame,#batco-nd96-badge,#batco-nd96-inventory-masthead').forEach(el=>el.remove());
  document.querySelectorAll('[class*="nd96-"]').forEach(el=>{[...el.classList].filter(c=>c.startsWith('nd96-')).forEach(c=>el.classList.remove(c))});
});

const apply=(identity,source='live')=>{
  const active=identity===NATIONAL_IDENTITY;if(active)ensureStyle();
  document.documentElement.classList.toggle('batco-identity-national96',active);document.documentElement.dataset.siteIdentity=active?NATIONAL_IDENTITY:DEFAULT_IDENTITY;
  afterDom(()=>document.body.classList.toggle('batco-identity-national96',active));setThemeColor(active);
  if(active){startEnhancer()}else{stopEnhancer()}
  try{window.dispatchEvent(new CustomEvent('batco:identitychange',{detail:{identity:active?NATIONAL_IDENTITY:DEFAULT_IDENTITY,active,source,version:VERSION,visualRevision:VISUAL_REVISION}}))}catch{}
};
const applyCurrent=source=>apply(wanted(),source||'live');
const cache=state=>{try{localStorage.setItem(CACHE_KEY,JSON.stringify({...state,cachedAt:Date.now()}))}catch{}};
const bootstrapCache=()=>{const preview=readPreview();if(preview){apply(preview,'preview-cache');return}try{const cached=normalize(safeJson(localStorage.getItem(CACHE_KEY)||'null'));liveState=cached;applyCurrent('cache')}catch{apply(DEFAULT_IDENTITY,'default')}};
const loadScript=(id,src)=>new Promise((resolve,reject)=>{const existing=document.getElementById(id);if(existing){if(existing.dataset.ready==='1'||window.firebase)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=()=>{s.dataset.ready='1';resolve()};s.onerror=reject;document.head.appendChild(s)});
const defaultFirebaseReady=()=>{try{return Boolean(firebase.app())}catch{return false}};
const waitForDefaultFirebase=async(timeoutMs=12000)=>{if(defaultFirebaseReady())return true;const started=Date.now();while(Date.now()-started<timeoutMs){await new Promise(resolve=>setTimeout(resolve,80));if(defaultFirebaseReady())return true}return false};
const firestore=async()=>{if(!window.firebase?.firestore){await loadScript('batco-identity-firebase-app','https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');await loadScript('batco-identity-firestore','https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js')}if(!window.firebase?.firestore)throw new Error('FIREBASE_UNAVAILABLE');if(!await waitForDefaultFirebase())throw new Error('DEFAULT_FIREBASE_BOOTSTRAP_TIMEOUT');let app=(firebase.apps||[]).find(candidate=>candidate?.name===IDENTITY_APP_NAME);if(!app)app=firebase.initializeApp(FIREBASE_CONFIG,IDENTITY_APP_NAME);return app.firestore()};
const subscribe=async()=>{try{const db=await firestore();unsubscribe=db.collection(CONTROL_COLLECTION).doc(CONTROL_DOC).onSnapshot(snap=>{liveState=normalize(snap.exists?snap.data():DEFAULT_STATE);cache(liveState);applyCurrent(readPreview()?'preview':'firestore')},error=>console.warn('[V56.48 identity] realtime unavailable; cached identity retained',error))}catch(error){console.warn('[V56.48 identity] control unavailable; cached/default identity retained',error)}};
const setPreview=identity=>{try{if(identity===NATIONAL_IDENTITY)sessionStorage.setItem(PREVIEW_KEY,NATIONAL_IDENTITY);else sessionStorage.removeItem(PREVIEW_KEY)}catch{}applyCurrent('preview')};
const clearPreview=()=>{try{sessionStorage.removeItem(PREVIEW_KEY)}catch{}applyCurrent('preview-clear')};
const getState=()=>({version:VERSION,visualRevision:VISUAL_REVISION,live:{...liveState},preview:readPreview(),effective:wanted()});
window.__BATCO_SITE_IDENTITY={version:VERSION,visualRevision:VISUAL_REVISION,apply,setPreview,clearPreview,getState,control:{collection:CONTROL_COLLECTION,doc:CONTROL_DOC},supported:[DEFAULT_IDENTITY,NATIONAL_IDENTITY]};
bootstrapCache();subscribe();
window.addEventListener('storage',event=>{if(event.key===CACHE_KEY&&!readPreview()){liveState=normalize(safeJson(event.newValue||'null'));applyCurrent('storage')}});
})();