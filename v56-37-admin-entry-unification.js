(()=>{
'use strict';
const VERSION='56.37';
const LEGACY_SELECTOR='button[title="إدارة المنتجات والأقسام"]';
function isAdmin(){
 try{
  const proof=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');
  return String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&Boolean(localStorage.getItem('inventory_admin_token_v2'))&&proof?.role==='admin'&&Boolean(proof?.photoId);
 }catch{return false}
}
function installStyle(){
 if(document.getElementById('v56-37-admin-entry-style'))return;
 const style=document.createElement('style');style.id='v56-37-admin-entry-style';
 style.textContent=`${LEGACY_SELECTOR}{display:none!important}`;
 document.head.appendChild(style);
}
function retireLegacyEntry(){
 if(!isAdmin())return;
 document.querySelectorAll(LEGACY_SELECTOR).forEach(button=>{
  button.dataset.v56RetiredAdminEntry='true';
  button.setAttribute('aria-hidden','true');
  button.tabIndex=-1;
 });
 const mainAdmin=[...document.querySelectorAll('button')].find(button=>button.getAttribute('title')==='لوحة التحكم الإدارية');
 if(mainAdmin){mainAdmin.dataset.v56UnifiedAdminEntry='true';mainAdmin.setAttribute('aria-label','فتح الإدارة التنفيذية الموحدة')}
}
function run(){installStyle();retireLegacyEntry()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
const observer=new MutationObserver(()=>{clearTimeout(observer._t);observer._t=setTimeout(retireLegacyEntry,30)});observer.observe(document.documentElement,{childList:true,subtree:true});
window.__V56_37_ADMIN_ENTRY_UNIFICATION={version:VERSION,refresh:run};
})();