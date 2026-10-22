/* BATCO V103: single verified employee presence engine. No UI and no sign-out requirement. */
(()=>{
'use strict';
if(window.__BATCO_EMPLOYEE_SESSION_V103)return;
const KEY='inventory_login_photo_proof_v2';
const HEARTBEAT_MS=60000, VERIFY_TTL_MS=5*60*1000;
let lastVerified=null, inFlight=false, failures=0, retryAfter=0;
const read=key=>{try{return localStorage.getItem(key)||''}catch{return''}};
function identity(){
  try{
    const p=JSON.parse(read(KEY)||'null'),employeeId=read('inventory_employee_id_v2'),name=read('inventory_user_name_v2');
    if(!name||!employeeId||read('inventory_employee_auth_version_v2')!=='2'||p?.role!=='employee')return null;
    if(p.employeeId!==employeeId||!p.photoId||!p.loginAttemptId||!p.loginLogId)return null;
    if(!/^[a-zA-Z0-9_-]+$/.test(String(p.loginLogId)))return null;
    return {employeeId,name,photoId:String(p.photoId),loginAttemptId:String(p.loginAttemptId),loginLogId:String(p.loginLogId)};
  }catch{return null}
}
const signature=p=>p&&[p.employeeId,p.photoId,p.loginAttemptId,p.loginLogId].join('|');
function stillCurrent(p){return signature(identity())===signature(p)}
async function database(){
  if(typeof window.getDb==='function')return window.getDb();
  if(window.firebase?.apps?.length&&typeof window.firebase.firestore==='function')return window.firebase.firestore();
  return null;
}
async function verify(db,p){
  const key=signature(p),now=Date.now();
  if(lastVerified?.key===key&&now-lastVerified.checkedAt<VERIFY_TTL_MS)return lastVerified;
  const login=await db.collection('login_logs').doc(p.loginLogId).get({source:'server'});
  if(!login.exists)throw new Error('LOGIN_RECORD_MISSING');
  const row=login.data()||{};
  if(row.faceVerified!==true||row.isAdmin===true||
     String(row.employeeId||'')!==p.employeeId||
     String(row.securityPhotoId||'')!==p.photoId||
     String(row.loginAttemptId||'')!==p.loginAttemptId||
     (row.loginStatus&&row.loginStatus!=='verified'))throw new Error('LOGIN_RECORD_MISMATCH');
  const account=await db.collection('employee_accounts').doc(p.employeeId).get({source:'server'});
  if(account.exists&&['suspended','merged','deleted'].includes(String(account.data()?.status||'')))throw new Error('EMPLOYEE_ACCOUNT_INACTIVE');
  if(!stillCurrent(p))return null;
  lastVerified={key,checkedAt:Date.now(),loginTime:row.time||null};
  return lastVerified;
}
async function pulse(){
  if(inFlight||document.visibilityState!=='visible'||navigator.onLine===false||Date.now()<retryAfter)return;
  const p=identity();
  if(!p){lastVerified=null;return}
  inFlight=true;
  try{
    const db=await database();
    if(!db)throw new Error('FIRESTORE_NOT_READY');
    const verified=await verify(db,p);
    if(!verified||!stillCurrent(p)||document.visibilityState!=='visible'||navigator.onLine===false)return;
    const payload={
      name:p.name,employeeId:p.employeeId,loginAttemptId:p.loginAttemptId,
      securityPhotoId:p.photoId,loginLogId:p.loginLogId,
      identitySource:'verified_login_server_v103',sessionProtocol:103,
      lastActive:firebase.firestore.FieldValue.serverTimestamp(),
      state:'online',userAgent:navigator.userAgent||'',activePage:location.pathname
    };
    if(verified.loginTime)payload.startTime=verified.loginTime;
    await db.collection('site_sessions').doc('employee_login_'+p.loginLogId).set(payload,{merge:true});
    failures=0;retryAfter=0;
  }catch(e){
    failures=Math.min(failures+1,6);
    retryAfter=Date.now()+Math.min(60000,2000*Math.pow(2,failures-1));
    if(/LOGIN_RECORD_|EMPLOYEE_ACCOUNT_INACTIVE/.test(String(e?.message||'')))lastVerified=null;
    console.warn('[BATCO employee attendance]',e?.code||e?.message||e);
  }finally{inFlight=false}
}
function wake(){
  retryAfter=0;
  if(document.visibilityState==='visible')pulse();
}
const timer=setInterval(pulse,HEARTBEAT_MS);
const discovery=setInterval(()=>{if(identity()&&!lastVerified&&!inFlight)pulse()},3000);
document.addEventListener('visibilitychange',wake);
window.addEventListener('pageshow',wake);
window.addEventListener('focus',wake);
window.addEventListener('online',wake);
window.addEventListener('storage',e=>{if(!e.key||['inventory_login_photo_proof_v2','inventory_employee_id_v2','inventory_user_name_v2'].includes(e.key)){lastVerified=null;wake()}});
window.addEventListener('batco:employee-login',()=>{lastVerified=null;wake()});
window.__BATCO_EMPLOYEE_SESSION_V103={pulse,wake,stop:()=>{clearInterval(timer);clearInterval(discovery)}};
wake();
})();