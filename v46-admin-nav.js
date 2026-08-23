(()=>{
'use strict';
const VERSION='46.1';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
const allowed=path==='admin-dashboard.html'||path==='command-center.html';
const isAdmin=()=>String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')==='1jh297-spgf2z';
if(!allowed||!isAdmin())return;
function preferredHost(){
  if(path==='command-center.html')return document.querySelector('.tabs')||document.querySelector('.topin');
  const command=document.getElementById('v45-command-tab');
  if(command?.parentElement)return command.parentElement;
  const tabs=document.querySelector('.v45-desktop-tabs');
  if(tabs)return tabs;
  const legacy=[...document.querySelectorAll('div.flex.overflow-x-auto.no-scrollbar')].find(el=>/مركز القيادة|الآن|الحسابات|الأرقام/.test(el.innerText||''));
  return legacy||document.querySelector('.topin')||document.querySelector('header');
}
function add(){
  if(!isAdmin())return;
  const host=preferredHost();if(!host)return;
  let a=document.getElementById('v46-control-tab');
  if(!a){
    a=document.createElement('a');a.id='v46-control-tab';a.href='./control-center.html';a.className='v45-admin-tab';a.innerHTML='<span>⚙</span><span>مركز التحكم</span>';a.style.textDecoration='none';
  }
  if(a.parentElement!==host)host.appendChild(a);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(add,100)});mo.observe(document.documentElement,{childList:true,subtree:true});
let tries=0;const timer=setInterval(()=>{add();if(++tries>=20||document.getElementById('v46-control-tab')?.parentElement?.classList?.contains('v45-desktop-tabs'))clearInterval(timer)},350);
window.addEventListener('load',()=>setTimeout(add,50));
window.__V46_ADMIN_NAV={version:VERSION};
})();
