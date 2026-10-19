/* V80: show branch barcode stocktake only for assigned employees. */
(()=>{
'use strict';
if(typeof db==='undefined'||typeof user==='undefined')return;
const accountId=user.isAdmin?'admin_mohanad':user.employeeId;
if(!accountId)return;
const a=document.createElement('a');
a.href='./branch-presence.html';
a.id='branch-presence-entry';
a.textContent='جرد الفرع';
a.style.cssText='position:fixed;bottom:calc(env(safe-area-inset-bottom) + 16px);left:14px;z-index:100;display:none;padding:11px 15px;border-radius:14px;background:#111;color:#fff;border:1px solid #444;text-decoration:none;font:700 13px system-ui,sans-serif;box-shadow:0 5px 18px #0003';
document.body.append(a);
const ref=db.collection('system_controls').doc('branch_presence_feature');
const un=ref.onSnapshot(d=>{const c=d.data()||{};a.style.display=c.enabled&&(c.assignedEmployeeIds||[]).includes(accountId)?'inline-flex':'none'},()=>{a.style.display='none'});
window.addEventListener('pagehide',()=>{try{un()}catch{}},{once:true});
})();
