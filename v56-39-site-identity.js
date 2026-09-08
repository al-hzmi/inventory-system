(()=>{
'use strict';
const VERSION='56.39';
const CACHE_KEY='batco_site_identity_cache_v1';
const PREVIEW_KEY='batco_identity_preview_v1';
const CONTROL_COLLECTION='system_controls';
const CONTROL_DOC='site_identity';
const DEFAULT_IDENTITY='default';
const NATIONAL_IDENTITY='national96';
const IDENTITY_APP_NAME='batco-identity-v56-39';
const DEFAULT_STATE={activeIdentity:DEFAULT_IDENTITY,enabled:false,revision:1};
const FIREBASE_CONFIG={apiKey:'AIzaSyCCvNlnZDxL5P4cPQrHYkOh3C8wJ6yl4Bw',authDomain:'inventory-system-ca3dc.firebaseapp.com',projectId:'inventory-system-ca3dc',storageBucket:'inventory-system-ca3dc.firebasestorage.app',messagingSenderId:'139575913885',appId:'1:139575913885:web:110648e07345b36da15374'};
let liveState={...DEFAULT_STATE},unsubscribe=null;

const safeJson=value=>{try{return JSON.parse(value)}catch{return null}};
const readPreview=()=>{try{const v=sessionStorage.getItem(PREVIEW_KEY)||'';return v===NATIONAL_IDENTITY?v:''}catch{return''}};
const normalize=row=>{
  const source=row&&typeof row==='object'?row:{};
  const national=source.enabled===true&&source.activeIdentity===NATIONAL_IDENTITY;
  return {activeIdentity:national?NATIONAL_IDENTITY:DEFAULT_IDENTITY,enabled:national,revision:Number(source.revision)||1,updatedAt:source.updatedAt||null,updatedBy:String(source.updatedBy||'')};
};
const wanted=()=>readPreview()||liveState.activeIdentity||DEFAULT_IDENTITY;
const afterDom=fn=>document.body?fn():document.addEventListener('DOMContentLoaded',fn,{once:true});
const ensureStyle=()=>{
  let link=document.getElementById('v56-39-national-day-css');
  if(link)return link;
  link=document.createElement('link');link.id='v56-39-national-day-css';link.rel='stylesheet';link.href='./v56-39-national-day.css?v=56.39';document.head.appendChild(link);return link;
};
const ensureDecorations=()=>afterDom(()=>{
  if(!document.getElementById('batco-nd96-frame')){
    const frame=document.createElement('div');frame.id='batco-nd96-frame';frame.setAttribute('aria-hidden','true');frame.innerHTML='<i class="nd96-corner a"></i><i class="nd96-corner b"></i>';document.body.appendChild(frame);
  }
  if(!document.getElementById('batco-nd96-badge')){
    const badge=document.createElement('div');badge.id='batco-nd96-badge';badge.setAttribute('aria-hidden','true');badge.innerHTML='<img src="./national-day-96-mark.svg?v=56.39" alt="">';document.body.appendChild(badge);
  }
});
const clearDecorations=()=>afterDom(()=>{document.getElementById('batco-nd96-frame')?.remove();document.getElementById('batco-nd96-badge')?.remove()});
const setThemeColor=active=>{
  const meta=document.querySelector('meta[name="theme-color"]');if(!meta)return;
  if(!meta.dataset.identityDefault)meta.dataset.identityDefault=meta.getAttribute('content')||'#FFFFFF';
  meta.setAttribute('content',active?'#008B4C':meta.dataset.identityDefault);
};
const apply=(identity,source='live')=>{
  const active=identity===NATIONAL_IDENTITY;
  if(active)ensureStyle();
  document.documentElement.classList.toggle('batco-identity-national96',active);
  document.documentElement.dataset.siteIdentity=active?NATIONAL_IDENTITY:DEFAULT_IDENTITY;
  afterDom(()=>document.body.classList.toggle('batco-identity-national96',active));
  setThemeColor(active);
  active?ensureDecorations():clearDecorations();
  try{window.dispatchEvent(new CustomEvent('batco:identitychange',{detail:{identity:active?NATIONAL_IDENTITY:DEFAULT_IDENTITY,active,source,version:VERSION}}))}catch{}
};
const applyCurrent=source=>apply(wanted(),source||'live');
const cache=state=>{try{localStorage.setItem(CACHE_KEY,JSON.stringify({...state,cachedAt:Date.now()}))}catch{}};
const bootstrapCache=()=>{
  const preview=readPreview();
  if(preview){apply(preview,'preview-cache');return}
  try{const cached=normalize(safeJson(localStorage.getItem(CACHE_KEY)||'null'));liveState=cached;applyCurrent('cache')}catch{apply(DEFAULT_IDENTITY,'default')}
};
const loadScript=(id,src)=>new Promise((resolve,reject)=>{
  const existing=document.getElementById(id);if(existing){if(existing.dataset.ready==='1'||window.firebase)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
  const s=document.createElement('script');s.id=id;s.src=src;s.async=true;s.onload=()=>{s.dataset.ready='1';resolve()};s.onerror=reject;document.head.appendChild(s);
});
const defaultFirebaseReady=()=>{try{return Boolean(firebase.app())}catch{return false}};
const waitForDefaultFirebase=async(timeoutMs=12000)=>{
  if(defaultFirebaseReady())return true;
  const started=Date.now();
  while(Date.now()-started<timeoutMs){await new Promise(resolve=>setTimeout(resolve,80));if(defaultFirebaseReady())return true}
  return false;
};
const firestore=async()=>{
  if(!window.firebase?.firestore){await loadScript('batco-identity-firebase-app','https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');await loadScript('batco-identity-firestore','https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js')}
  if(!window.firebase?.firestore)throw new Error('FIREBASE_UNAVAILABLE');
  // Do not create any Firebase app while a host page is still bootstrapping its
  // default app. Several legacy runtimes use `if(!firebase.apps.length)` before
  // creating [DEFAULT]; creating our named app first would make that guard skip
  // and break the page with "No Firebase App [DEFAULT]". Once [DEFAULT] exists,
  // the identity listener remains isolated in its own named app.
  if(!await waitForDefaultFirebase())throw new Error('DEFAULT_FIREBASE_BOOTSTRAP_TIMEOUT');
  let app=(firebase.apps||[]).find(candidate=>candidate?.name===IDENTITY_APP_NAME);
  if(!app)app=firebase.initializeApp(FIREBASE_CONFIG,IDENTITY_APP_NAME);
  return app.firestore();
};
const subscribe=async()=>{
  try{
    const db=await firestore();
    unsubscribe=db.collection(CONTROL_COLLECTION).doc(CONTROL_DOC).onSnapshot(snap=>{
      liveState=normalize(snap.exists?snap.data():DEFAULT_STATE);cache(liveState);applyCurrent(readPreview()?'preview':'firestore');
    },error=>console.warn('[V56.39 identity] realtime unavailable; cached identity retained',error));
  }catch(error){console.warn('[V56.39 identity] control unavailable; cached/default identity retained',error)}
};
const setPreview=identity=>{try{if(identity===NATIONAL_IDENTITY)sessionStorage.setItem(PREVIEW_KEY,NATIONAL_IDENTITY);else sessionStorage.removeItem(PREVIEW_KEY)}catch{}applyCurrent('preview')};
const clearPreview=()=>{try{sessionStorage.removeItem(PREVIEW_KEY)}catch{}applyCurrent('preview-clear')};
const getState=()=>({version:VERSION,live:{...liveState},preview:readPreview(),effective:wanted()});

window.__BATCO_SITE_IDENTITY={version:VERSION,apply,setPreview,clearPreview,getState,control:{collection:CONTROL_COLLECTION,doc:CONTROL_DOC},supported:[DEFAULT_IDENTITY,NATIONAL_IDENTITY]};
bootstrapCache();subscribe();
window.addEventListener('storage',event=>{if(event.key===CACHE_KEY&&!readPreview()){liveState=normalize(safeJson(event.newValue||'null'));applyCurrent('storage')}});
})();
