/* Verified employee heartbeat shared by inventory and stocktake pages. No UI. */
(()=>{
'use strict';
let db=null,busy=false,pulseTimer=null,readyTimer=null,attempts=0,lastAttemptAt=0;
function proof(){
  try{
    const p=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');
    const id=localStorage.getItem('inventory_employee_id_v2')||'';
    if(!id||!localStorage.getItem('inventory_user_name_v2')||localStorage.getItem('inventory_employee_auth_version_v2')!=='2')return null;
    if(p?.role!=='employee'||p.employeeId!==id||!p.photoId||!p.loginAttemptId||!p.loginLogId)return null;
    return {employeeId:id,photoId:p.photoId,loginAttemptId:p.loginAttemptId,loginLogId:p.loginLogId};
  }catch{return null}
}
async function pulse(){
  if(busy||document.visibilityState!=='visible'||navigator.onLine===false)return;
  const p=proof();
  if(!p||!db)return;
  if(Date.now()-lastAttemptAt<90000)return;
  lastAttemptAt=Date.now();
  busy=true;
  try{
    await db.collection('site_sessions').doc('employee_login_'+String(p.loginLogId)).set({
      name:localStorage.getItem('inventory_user_name_v2')||'',
      employeeId:p.employeeId,securityPhotoId:p.photoId,
      loginAttemptId:p.loginAttemptId,loginLogId:p.loginLogId,
      identitySource:'employee_login_photo_record',
      lastActive:firebase.firestore.FieldValue.serverTimestamp(),
      state:'online',userAgent:navigator.userAgent,
      activePage:location.pathname
    },{merge:true});
  }catch(error){console.warn('[Employee cross-page attendance]',error?.code||error?.message||error)}
  finally{busy=false}
}
function begin(){
  if(pulseTimer)return;
  pulseTimer=setInterval(pulse,90000);
  document.addEventListener('visibilitychange',pulse);
  window.addEventListener('pageshow',pulse);
  window.addEventListener('online',pulse);
  pulse();
}
function connect(){
  if(!proof()){clearInterval(readyTimer);return}
  try{
    if(window.firebase?.apps?.length&&typeof window.firebase.firestore==='function'){
      db=window.firebase.firestore();
      clearInterval(readyTimer);
      begin();
    }
  }catch(error){console.warn('[Employee attendance init]',error?.code||error?.message||error)}
  if(++attempts>=120)clearInterval(readyTimer);
}
readyTimer=setInterval(connect,500);
connect();
})();