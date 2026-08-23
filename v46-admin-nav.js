(()=>{
'use strict';
const VERSION='46.0';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
const allowed=path==='admin-dashboard.html'||path==='command-center.html';
const isAdmin=()=>String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')==='1jh297-spgf2z';
if(!allowed||!isAdmin())return;
function add(){
  if(document.getElementById('v46-control-tab'))return;
  const host=path==='command-center.html'?document.querySelector('.tabs'):[...document.querySelectorAll('.v45-desktop-tabs,div.flex.overflow-x-auto.no-scrollbar')].find(el=>/مركز القيادة|الآن|الحسابات|الأرقام/.test(el.innerText||''));
  if(!host)return;
  const a=document.createElement('a');
  a.id='v46-control-tab';
  a.href='./control-center.html';
  a.className='v45-admin-tab';
  a.innerHTML='<span>⚙</span><span>مركز التحكم</span>';
  a.style.textDecoration='none';
  host.appendChild(a);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(add,100)});mo.observe(document.documentElement,{childList:true,subtree:true});
window.__V46_ADMIN_NAV={version:VERSION};
})();
