(()=>{
'use strict';
const VERSION='55.0';
const PATH=(location.pathname.split('/').pop()||'index.html').toLowerCase();
const IS_EMPLOYEE_SURFACE=PATH==='index.html'||(PATH==='customer.html'&&new URLSearchParams(location.search).get('employeeView')==='1');
if(!IS_EMPLOYEE_SURFACE)return;
const QA=Boolean(window.__V44_QA||['localhost','127.0.0.1'].includes(location.hostname)||navigator.webdriver===true||/[?&](?:qa|test)=1(?:&|$)/.test(location.search));
const K={name:'inventory_user_name_v2',id:'inventory_employee_id_v2',auth:'inventory_employee_auth_version_v2',token:'inventory_admin_token_v2',photoProof:'inventory_login_photo_proof_v2',accessVersion:'inventory_access_gate_version_v1',accessName:'inventory_access_approved_name_v1',secret:'inventory_v48_device_secret',lastAlias:'inventory_v48_last_alias'};
const ACK='inventory_v48_reauth_ack_';
const PENDING='inventory_v48_pending_reauth_';
const EMPLOYEES='employee_accounts',ALIASES='employee_aliases',RESET_LOGS='employee_password_reset_logs';
const FIREBASE_CONFIG={apiKey:'AIzaSyCCvNlnZDxL5P4cPQrHYkOh3C8wJ6yl4Bw',authDomain:'inventory-system-ca3dc.firebaseapp.com',projectId:'inventory-system-ca3dc',storageBucket:'inventory-system-ca3dc.firebasestorage.app',messagingSenderId:'139575913885',appId:'1:139575913885:web:110648e07345b36da15374'};
const AR='٠١٢٣٤٥٦٧٨٩',FA='۰۱۲۳۴۵۶۷۸۹';
const toEnglishDigits=s=>String(s??'').replace(/[٠-٩۰-۹]/g,d=>{const a=AR.indexOf(d);return a>-1?String(a):String(FA.indexOf(d))});
const norm=s=>toEnglishDigits(String(s??'')).toLowerCase().replace(/[\u064B-\u065F\u0670]/g,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/ة/g,'ه').replace(/[^\u0600-\u06FFa-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const safeDocId=s=>{const c=String(s||'').replace(/[\/\\\[\]#?]/g,'_').replace(/^\.+|\.+$/g,'').trim();return c.slice(0,200)||'unknown'};
const aliasVariants=v=>{const b=norm(v);return b?[...new Set([b,b.replace(/\s+/g,'')])]:[]};
const bytesToBase64=bytes=>{let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin)};
const base64ToBytes=b64=>{const bin=atob(String(b64||'')),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out};
const randomB64=(n=32)=>bytesToBase64(crypto.getRandomValues(new Uint8Array(n))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const serverTs=()=>window.firebase?.firestore?.FieldValue?.serverTimestamp?.()||new Date();
const deviceMeta=()=>({platform:navigator.platform||'',userAgent:navigator.userAgent||'',screen:`${screen.width||0}x${screen.height||0}`,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',standalone:Boolean(matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone)});
const currentSession=()=>{try{return {name:String(localStorage.getItem(K.name)||'').trim(),id:String(localStorage.getItem(K.id)||'').trim(),auth:String(localStorage.getItem(K.auth)||'')}}catch{return{name:'',id:'',auth:''}}};
const loadScript=src=>new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>String(s.src||'').includes(src.split('/').pop()));if(existing&&window.firebase){resolve();return}const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('SCRIPT_LOAD'));document.head.appendChild(s)});
let dbPromise=null;
async function ensureDb(){
  if(dbPromise)return dbPromise;
  dbPromise=(async()=>{
    if(!window.firebase)await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
    if(!window.firebase?.firestore)await loadScript('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js');
    if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
    return firebase.firestore();
  })().catch(e=>{dbPromise=null;throw e});
  return dbPromise;
}
async function sha256Hex(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function deviceSecret(create=true){try{let s=localStorage.getItem(K.secret)||'';if(!s&&create){s=randomB64(32);localStorage.setItem(K.secret,s)}return s}catch{return''}}
async function deviceHash(create=true){const s=deviceSecret(create);return s?await sha256Hex('BATCO-V48-DEVICE|'+s):''}
function trustedRecord(account,hash){const rec=account?.trustedRecoveryDevices?.[hash];return rec&&rec.enabled!==false?rec:null}
function reauthDecision(epoch,ack,pending){epoch=Number(epoch)||0;ack=Number(ack)||0;pending=Number(pending)||0;if(!epoch||epoch<=ack)return'none';if(pending===epoch)return'complete';return'force'}
async function enrollTrustedDevice(ref,account){
  if(QA)return'';
  const hash=await deviceHash(true);if(!hash)return'';
  const map={...(account?.trustedRecoveryDevices||{})};
  const old=map[hash]||{};
  map[hash]={...old,enabled:true,deviceHash:hash,firstTrustedAt:old.firstTrustedAt||serverTs(),lastSeenAt:serverTs(),...deviceMeta()};
  await ref.set({trustedRecoveryDevices:map,lastTrustedDeviceHash:hash,lastTrustedDeviceAt:serverTs(),securitySchemaVersion:48},{merge:true});
  return hash;
}
function softLogout(employeeId,epoch,name){
  try{
    localStorage.setItem(PENDING+employeeId,String(epoch));
    if(name)localStorage.setItem(K.lastAlias,name);
    [K.name,K.id,K.auth,K.token,K.photoProof,K.accessVersion,K.accessName].forEach(k=>localStorage.removeItem(k));
    sessionStorage.setItem('inventory_v48_reauth_notice','1');
  }catch{}
  const target=new URL('./index.html',location.href);target.searchParams.set('employee','1');target.searchParams.set('reauth','1');location.replace(target.href);
}
let watchedId='',unsub=null,checking=false;
async function watchAuthenticatedSession(){
  const s=currentSession();
  if(!s.id||s.auth!=='2'||norm(s.name)==='مهند'){if(unsub){try{unsub()}catch{}unsub=null;watchedId=''}return}
  if(s.id===watchedId||checking)return;
  checking=true;
  try{
    const db=await ensureDb(),ref=db.collection(EMPLOYEES).doc(s.id),snap=await ref.get();
    if(!snap.exists)return;
    const account={id:snap.id,...snap.data()},hash=await enrollTrustedDevice(ref,account);
    const fresh=(await ref.get()).data()||account,epoch=Number(fresh.forceReauthEpoch)||0;
    let ack=0,pending=0;try{ack=Number(localStorage.getItem(ACK+s.id)||0);pending=Number(localStorage.getItem(PENDING+s.id)||0)}catch{}
    const decision=reauthDecision(epoch,ack,pending);
    if(decision==='complete'){
      try{localStorage.setItem(ACK+s.id,String(epoch));localStorage.removeItem(PENDING+s.id)}catch{}
      if(!QA)await ref.set({lastReauthCompletedAt:serverTs(),lastReauthDeviceHash:hash,forceReauthCompletedEpoch:epoch},{merge:true});
    }else if(decision==='force'){
      if(!QA)ref.set({lastForcedLogoutSeenAt:serverTs(),lastForcedLogoutDeviceHash:hash},{merge:true}).catch(()=>{});
      softLogout(s.id,epoch,s.name);return;
    }else if(fresh.passwordResetRequiresPhoto&&!QA){
      // لا تُمسح هذه العلامة بمجرد وجود جلسة. وحده حفظ صورة مرتبطة بمحاولة الدخول يمسحها.
      softLogout(s.id,Date.now(),s.name);return;
    }
    watchedId=s.id;
    unsub=ref.onSnapshot(doc=>{
      if(!doc.exists)return;const data=doc.data()||{},now=currentSession();if(now.id!==s.id||now.auth!=='2')return;
      let a=0,p=0;try{a=Number(localStorage.getItem(ACK+s.id)||0);p=Number(localStorage.getItem(PENDING+s.id)||0)}catch{}
      const e=Number(data.forceReauthEpoch)||0,d=reauthDecision(e,a,p);
      if(data.passwordResetRequiresPhoto&&!QA){softLogout(s.id,Date.now(),now.name);return}
      if(d==='force')softLogout(s.id,e,now.name);
      else if(d==='complete'){
        try{localStorage.setItem(ACK+s.id,String(e));localStorage.removeItem(PENDING+s.id)}catch{}
        if(!QA)ref.set({lastReauthCompletedAt:serverTs(),lastReauthDeviceHash:hash,forceReauthCompletedEpoch:e},{merge:true}).catch(()=>{});
      }
    },()=>{});
  }catch(e){console.warn('[V48 auth watch]',e?.message||e)}finally{checking=false}
}
async function resolveAccount(alias){
  const db=await ensureDb();
  for(const key of aliasVariants(alias)){
    const a=await db.collection(ALIASES).doc(safeDocId(key)).get();
    if(a.exists&&a.data()?.employeeId){const d=await db.collection(EMPLOYEES).doc(String(a.data().employeeId)).get();if(d.exists)return{id:d.id,...d.data(),matchedAlias:key}}
  }
  const exact=String(alias||'').trim();if(exact){const q=await db.collection(EMPLOYEES).where('canonicalName','==',exact).limit(1).get();if(!q.empty){const d=q.docs[0];return{id:d.id,...d.data()}}}
  return null;
}
async function derivePinHash(pin,saltB64,iterations=120000){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pin)),{name:'PBKDF2'},false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:base64ToBytes(saltB64),iterations:Number(iterations)||120000},key,256);return bytesToBase64(new Uint8Array(bits))}
const newSalt=()=>bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
function toast(message){let e=document.getElementById('v48-auth-toast');if(!e){e=document.createElement('div');e.id='v48-auth-toast';e.style.cssText='position:fixed;z-index:1000002;left:50%;top:max(14px,env(safe-area-inset-top));transform:translateX(-50%);max-width:92vw;background:#1c1917;color:#fff;padding:10px 14px;border-radius:12px;font:600 12px/1.7 system-ui;text-align:center;box-shadow:0 12px 35px rgba(0,0,0,.2);opacity:0;transition:.18s;pointer-events:none';document.body.appendChild(e)}e.textContent=message;e.style.opacity='1';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.opacity='0',3200)}
function modalShell(){let bg=document.getElementById('v48-reset-bg');if(bg)return bg;bg=document.createElement('div');bg.id='v48-reset-bg';bg.style.cssText='position:fixed;inset:0;z-index:1000001;background:rgba(28,25,23,.48);display:none;align-items:flex-end;justify-content:center;padding:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;direction:rtl';bg.innerHTML='<div id="v48-reset-card" style="width:100%;max-width:480px;background:#fff;border-radius:22px 22px 0 0;padding:18px;box-shadow:0 -20px 60px rgba(0,0,0,.18);max-height:90dvh;overflow:auto"></div>';bg.addEventListener('click',e=>{if(e.target===bg)bg.style.display='none'});document.body.appendChild(bg);return bg}
function resetForm(account,alias,hash){
  const bg=modalShell(),card=bg.querySelector('#v48-reset-card');bg.style.display='flex';
  card.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-start"><div style="flex:1"><div style="font-size:10px;color:#15803d;font-weight:700">جهاز موثوق</div><div style="font-size:18px;font-weight:800;margin-top:3px">تحديث رمز الدخول</div><div style="font-size:11px;color:#57534e;margin-top:4px;line-height:1.7">${escapeHtml(account.canonicalName||alias)} · بعد التحديث ستسجل الدخول من جديد وسيتم التحقق بالصورة قبل فتح النظام.</div></div><button id="v48-reset-close" type="button" style="width:38px;height:38px;border:1px solid #e7e5e4;background:#fff;border-radius:11px">×</button></div><form id="v48-reset-form" style="display:grid;gap:11px;margin-top:16px"><input id="v48-new-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="رمز جديد من 4 أو 6 أرقام" style="height:50px;border:1px solid #e7e5e4;border-radius:12px;padding:0 13px;font-size:16px;text-align:center;outline:none"><input id="v48-new-pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" placeholder="تأكيد الرمز الجديد" style="height:50px;border:1px solid #e7e5e4;border-radius:12px;padding:0 13px;font-size:16px;text-align:center;outline:none"><div id="v48-reset-error" style="display:none;color:#b91c1c;font-size:11px;text-align:center"></div><button id="v48-reset-submit" type="submit" style="height:48px;border:0;border-radius:12px;background:#1c1917;color:#fff;font-weight:800">تحديث الرمز</button><div style="font-size:10px;color:#78716c;text-align:center;line-height:1.7">لا يمكن تنفيذ الاستعادة من جهاز جديد أو بعد مسح بيانات المتصفح.</div></form>`;
  card.querySelector('#v48-reset-close').onclick=()=>bg.style.display='none';
  const form=card.querySelector('#v48-reset-form'),p1=card.querySelector('#v48-new-pin'),p2=card.querySelector('#v48-new-pin2'),err=card.querySelector('#v48-reset-error'),submit=card.querySelector('#v48-reset-submit');
  const digits=el=>{el.value=toEnglishDigits(el.value).replace(/\D/g,'').slice(0,6)};p1.oninput=()=>digits(p1);p2.oninput=()=>digits(p2);
  form.onsubmit=async e=>{e.preventDefault();err.style.display='none';const a=p1.value,b=p2.value;if(![4,6].includes(a.length)){err.textContent='الرمز يجب أن يكون 4 أو 6 أرقام.';err.style.display='block';return}if(a!==b){err.textContent='الرمزان غير متطابقين.';err.style.display='block';return}submit.disabled=true;submit.textContent='جاري التحديث...';try{
      const db=await ensureDb(),ref=db.collection(EMPLOYEES).doc(account.id),fresh=await ref.get(),data=fresh.data()||{},secret=deviceSecret(false),freshHash=secret?await deviceHash(false):'';
      if(!fresh.exists||!freshHash||freshHash!==hash||!trustedRecord(data,freshHash))throw new Error('DEVICE_NOT_TRUSTED');
      const salt=newSalt(),passwordHash=await derivePinHash(a,salt,120000);
      if(!QA){await ref.set({passwordHash,passwordSalt:salt,passwordIterations:120000,passwordPending:false,passwordUpdatedAt:serverTs(),passwordResetAt:serverTs(),passwordResetDeviceHash:freshHash,passwordResetRequiresPhoto:true,securitySchemaVersion:48},{merge:true});await db.collection(RESET_LOGS).add({employeeId:account.id,canonicalName:account.canonicalName||alias,enteredAlias:alias,deviceHash:freshHash,method:'trusted_device_recovery',requiresPhoto:true,createdAt:serverTs(),...deviceMeta()})}
      try{localStorage.setItem(K.lastAlias,alias);[K.name,K.id,K.auth,K.token,K.photoProof,K.accessVersion,K.accessName].forEach(k=>localStorage.removeItem(k))}catch{};card.innerHTML='<div style="padding:18px 4px;text-align:center"><div style="font-size:30px">✓</div><div style="font-size:17px;font-weight:800;margin-top:8px">تم تحديث رمز الدخول</div><div style="font-size:11px;color:#57534e;margin-top:6px;line-height:1.8">سيتم تحديث شاشة الدخول. استخدم الرمز الجديد، وبعده ستظهر الكاميرا للتحقق بالصورة.</div></div>';setTimeout(()=>{const u=new URL('./index.html',location.href);u.searchParams.set('employee','1');u.searchParams.set('resetDone','1');location.replace(u.href)},1100);
    }catch(ex){submit.disabled=false;submit.textContent='تحديث الرمز';err.textContent=ex?.message==='DEVICE_NOT_TRUSTED'?'تعذر التحقق من هذا الجهاز. الاستعادة متاحة فقط من جهاز سبق تسجيل الدخول منه لهذا الحساب.':'تعذر تحديث الرمز الآن. حاول مرة أخرى.';err.style.display='block'}
  }
}
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function beginForgot(alias){
  try{
    const account=await resolveAccount(alias);if(!account){toast('تعذر العثور على الحساب. أعد كتابة الاسم ثم حاول.');return}if(account.status==='suspended'){toast('هذا الحساب موقوف حاليًا. راجع الإدارة.');return}
    const secret=deviceSecret(false);if(!secret){toast('لا يمكن تحديث الرمز من هذا الجهاز لأنه لم يُسجّل سابقًا لهذا الحساب.');return}
    const hash=await deviceHash(false);if(!hash||!trustedRecord(account,hash)){toast('الاستعادة متاحة فقط من نفس الجهاز الذي سبق تسجيل الدخول منه.');return}
    resetForm(account,alias,hash);
  }catch(e){console.warn('[V48 recovery]',e?.message||e);toast('تعذر التحقق من الجهاز الآن. حاول مرة أخرى.')}
}
function forgotContext(form){const ps=[...form.querySelectorAll('p')].map(x=>String(x.textContent||'').trim()),line=ps.find(x=>x.includes('دخلت باسم:'))||'',alias=line.split('دخلت باسم:')[1]?.trim()||String(form.querySelector('h2')?.textContent||'').trim();return alias}
function patchForgot(){
  if(PATH!=='index.html')return;
  const input=[...document.querySelectorAll('input[type="password"]')].find(x=>x.autocomplete==='current-password'||(x.closest('form')?.innerText||'').includes('رمز الدخول'));
  const form=input?.closest('form');if(!form||document.getElementById('v48-forgot-button'))return;
  if(!(form.innerText||'').includes('دخول'))return;
  const wrap=document.createElement('div');wrap.id='v48-forgot-wrap';wrap.style.cssText='display:grid;gap:5px;text-align:center';
  const btn=document.createElement('button');btn.id='v48-forgot-button';btn.type='button';btn.textContent='هل نسيت رمز الدخول؟';btn.style.cssText='border:0;background:transparent;color:#b45309;font:700 12px/1.8 system-ui;padding:4px;cursor:pointer';
  const note=document.createElement('div');note.textContent='يمكن تحديثه فقط من جهاز سبق تسجيل الدخول منه.';note.style.cssText='font:400 9px/1.6 system-ui;color:#a8a29e';
  btn.onclick=()=>{const alias=forgotContext(form);if(alias)beginForgot(alias);else toast('أعد اختيار اسم الموظف ثم حاول.')};wrap.append(btn,note);
  const other=[...form.querySelectorAll('button')].find(b=>(b.textContent||'').includes('استخدام اسم آخر'));if(other)form.insertBefore(wrap,other);else form.appendChild(wrap);
}
function showEntryNotice(){const p=new URLSearchParams(location.search);if(p.get('reauth')==='1')setTimeout(()=>toast('لأسباب أمنية، سجّل الدخول مرة أخرى. بياناتك وسلتك محفوظة على هذا الجهاز.'),500);else if(p.get('resetDone')==='1')setTimeout(()=>toast('تم تحديث الرمز. سجّل الدخول بالرمز الجديد لإكمال التحقق بالصورة.'),500)}
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(patchForgot,80)});mo.observe(document.documentElement,{childList:true,subtree:true});
setInterval(watchAuthenticatedSession,1400);setTimeout(watchAuthenticatedSession,250);setTimeout(patchForgot,250);showEntryNotice();
window.__V48_AUTH_SECURITY={version:VERSION,reauthDecision,trustedRecord,deviceHash:()=>deviceHash(false),beginForgot};
})();
