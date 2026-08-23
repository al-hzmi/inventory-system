(()=>{
'use strict';
const VERSION='47.0';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
const allowed=['admin-dashboard.html','command-center.html','control-center.html'].includes(path);
const isAdmin=()=>String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')==='1jh297-spgf2z';
if(!allowed||!isAdmin())return;
function add(){if(document.getElementById('v47-health-tab'))return;const a=document.createElement('a');a.id='v47-health-tab';a.href='./health-center.html';a.innerHTML='<span>♡</span><span>صحة النظام</span>';a.style.textDecoration='none';if(path==='control-center.html'){const host=document.querySelector('.topin');if(!host)return;a.className='navbtn';host.appendChild(a);return;}const host=path==='command-center.html'?document.querySelector('.tabs'):[...document.querySelectorAll('.v45-desktop-tabs,div.flex.overflow-x-auto.no-scrollbar')].find(el=>/مركز القيادة|الآن|الحسابات|الأرقام/.test(el.innerText||''));if(!host)return;a.className='v45-admin-tab';host.appendChild(a)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(add,100)});mo.observe(document.documentElement,{childList:true,subtree:true});window.__V47_ADMIN_NAV={version:VERSION};
})();
