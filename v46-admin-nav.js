(()=>{
'use strict';
const VERSION='49.0';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
const allowed=['admin-dashboard.html','command-center.html','control-center.html'].includes(path);
const isAdmin=()=>String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')==='1jh297-spgf2z';
if(!allowed)return;

function installFallbackCss(){
  if(document.getElementById('v49-admin-nav-css'))return;
  const s=document.createElement('style');s.id='v49-admin-nav-css';
  s.textContent=`#v49-security-tab{cursor:pointer}#v49-security-fallback{position:fixed;z-index:99990;left:max(14px,env(safe-area-inset-left));bottom:max(18px,calc(env(safe-area-inset-bottom) + 14px));height:46px;padding:0 15px;border:1px solid #d6d3d1;border-radius:14px;background:#1c1917;color:#fff;box-shadow:0 12px 32px rgba(28,25,23,.22);font:700 11px/1.2 "IBM Plex Sans Arabic",system-ui;display:none;align-items:center;gap:7px}.v49-security-visible{display:inline-flex!important}@media(min-width:1000px){#v49-security-fallback{bottom:22px;left:22px}}`;
  document.head.appendChild(s);
}
function preferredHost(){
  if(path==='control-center.html')return document.querySelector('.tabs')||document.querySelector('.topin');
  if(path==='command-center.html')return document.querySelector('.tabs')||document.querySelector('.topin');
  const command=document.getElementById('v45-command-tab');
  if(command?.parentElement)return command.parentElement;
  const tabs=document.querySelector('.v45-desktop-tabs');
  if(tabs)return tabs;
  const legacy=[...document.querySelectorAll('div.flex.overflow-x-auto.no-scrollbar')].find(el=>/مركز القيادة|الآن|الحسابات|الأرقام/.test(el.innerText||''));
  return legacy||null;
}
function securityApi(){return window.__V48_ADMIN_SECURITY&&typeof window.__V48_ADMIN_SECURITY.open==='function'?window.__V48_ADMIN_SECURITY:null}
function openSecurity(){
  if(!isAdmin())return;
  const api=securityApi();if(api){api.open();return}
  let script=document.getElementById('v49-security-loader');
  if(script){script.remove();script=null}
  script=document.createElement('script');script.id='v49-security-loader';script.src='./v48-admin-security.js?v=49.0-'+Date.now();script.async=true;
  script.onload=()=>{setTimeout(()=>{const ready=securityApi();if(ready)ready.open();else alert('تعذر تشغيل أمان الدخول. حدّث الصفحة وحاول مرة أخرى.')},80)};
  script.onerror=()=>alert('تعذر تحميل أمان الدخول. تحقق من الاتصال ثم حاول مرة أخرى.');
  document.head.appendChild(script);
}
function ensureFallback(){
  let b=document.getElementById('v49-security-fallback');
  if(!b){b=document.createElement('button');b.id='v49-security-fallback';b.type='button';b.innerHTML='<span>⌁</span><span>أمان الدخول</span>';b.onclick=openSecurity;document.body.appendChild(b)}
  return b;
}
function add(){
  installFallbackCss();
  const control=document.getElementById('v46-control-tab'),security=document.getElementById('v49-security-tab'),fallback=ensureFallback();
  if(!isAdmin()){if(control)control.remove();if(security)security.remove();fallback.classList.remove('v49-security-visible');return}
  const host=preferredHost();
  if(!host){fallback.classList.add('v49-security-visible');return}
  fallback.classList.remove('v49-security-visible');
  let a=control;
  if(!a){a=document.createElement('a');a.id='v46-control-tab';a.href='./control-center.html';a.className='v45-admin-tab';a.innerHTML='<span>⚙</span><span>مركز التحكم</span>';a.style.textDecoration='none'}
  if(a.parentElement!==host)host.appendChild(a);
  let b=security;
  if(!b){b=document.createElement('button');b.id='v49-security-tab';b.type='button';b.className='v45-admin-tab';b.innerHTML='<span>⌁</span><span>أمان الدخول</span>';b.onclick=openSecurity}
  if(!b.classList.contains('v45-admin-tab')){
    b.style.cssText='height:44px;border:1px solid #e7e5e4;border-radius:11px;background:#fff;color:#1c1917;padding:0 12px;font-weight:700;font-size:11px';
  }
  if(b.parentElement!==host)host.appendChild(b);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(add,100)});mo.observe(document.documentElement,{childList:true,subtree:true});
let tries=0;const timer=setInterval(()=>{add();if(++tries>=40&&document.getElementById('v49-security-tab'))clearInterval(timer)},250);
window.addEventListener('storage',e=>{if(['inventory_user_name_v2','inventory_admin_token_v2'].includes(e.key))add()});
window.addEventListener('load',()=>setTimeout(add,50));
window.__V46_ADMIN_NAV={version:VERSION,refresh:add,openSecurity};
})();
