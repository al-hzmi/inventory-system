/* V80: light, assigned-only employee launch button. No extra work for logged-out sessions. */
(()=>{
'use strict';
let name='',id='',photo=null;
try{
 name=String(localStorage.getItem('inventory_user_name_v2')||'').trim();
 id=String(localStorage.getItem('inventory_employee_id_v2')||'').trim();
 photo=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');
}catch{return}
if(!name||!id||localStorage.getItem('inventory_employee_auth_version_v2')!=='2'||photo?.employeeId!==id||photo?.role!=='employee'||!photo?.photoId)return;
const start=()=>{
 if(typeof getDb!=='function')return;
 getDb().then(database=>{
  const a=document.createElement('a');a.href='./branch-presence.html';a.id='branchPresenceHomeShortcut';a.textContent='جرد الفرع';
  a.style.cssText='display:none;position:fixed;z-index:700;bottom:calc(18px + env(safe-area-inset-bottom));left:12px;background:#111;color:#fff;border:1px solid #555;border-radius:13px;padding:11px 14px;box-shadow:0 7px 22px #0002;font:700 12px/1.5 system-ui,sans-serif;text-decoration:none';
  document.body.append(a);
  const un=database.collection('system_controls').doc('branch_presence_feature').onSnapshot(d=>{
   const c=d.data()||{};
   a.style.display=c.enabled&&(c.assignedEmployeeIds||[]).includes(id)?'block':'none';
  },()=>a.style.display='none');
  window.addEventListener('pagehide',()=>{try{un()}catch{}},{once:true});
 }).catch(()=>{});
};
const idle=window.requestIdleCallback||((fn)=>setTimeout(fn,1800));
idle(start);
})();
