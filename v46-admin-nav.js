(()=>{
'use strict';
const VERSION='50.1';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
const allowed=['admin-dashboard.html','command-center.html','control-center.html'].includes(path);
const isAdmin=()=>String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')==='1jh297-spgf2z';
if(!allowed)return;

function installCss(){
  if(document.getElementById('v50-admin-nav-css'))return;
  const s=document.createElement('style');s.id='v50-admin-nav-css';
  s.textContent=`#v49-security-tab,#v50-inventory-tab{cursor:pointer}#v50-admin-dock{position:fixed;z-index:99990;left:max(12px,env(safe-area-inset-left));bottom:max(14px,calc(env(safe-area-inset-bottom) + 10px));display:none;gap:6px;align-items:center;padding:6px;border:1px solid #d6d3d1;border-radius:15px;background:rgba(255,255,255,.97);box-shadow:0 12px 34px rgba(28,25,23,.2);backdrop-filter:blur(12px)}#v50-admin-dock.on{display:flex}#v50-admin-dock>.v45-admin-tab{height:40px!important;min-width:auto!important;width:auto!important;padding:0 10px!important;border:1px solid #e7e5e4!important;border-radius:10px!important;background:#fff!important;color:#1c1917!important;font:700 10px/1.2 "IBM Plex Sans Arabic",system-ui!important;white-space:nowrap!important}#v50-admin-dock>#v49-security-tab{background:#1c1917!important;color:#fff!important;border-color:#1c1917!important}@media(max-width:520px){#v50-admin-dock{right:12px;left:12px;justify-content:stretch}#v50-admin-dock>.v45-admin-tab{flex:1!important;padding:0 6px!important;font-size:9px!important}}`;
  document.head.appendChild(s);
}
function preferredHost(){
  if(path==='control-center.html')return document.querySelector('.tabs')||document.querySelector('.topin');
  if(path==='command-center.html')return document.querySelector('.tabs')||document.querySelector('.topin');
  const command=document.getElementById('v45-command-tab');
  if(command?.parentElement)return command.parentElement;
  const tabs=document.querySelector('.v45-desktop-tabs');
  if(tabs)return tabs;
  return [...document.querySelectorAll('div.flex.overflow-x-auto.no-scrollbar')].find(el=>/مركز القيادة|الآن|الحسابات|الأرقام/.test(el.innerText||''))||null;
}
function securityApi(){return window.__V48_ADMIN_SECURITY&&typeof window.__V48_ADMIN_SECURITY.open==='function'?window.__V48_ADMIN_SECURITY:null}
function openSecurity(){
  if(!isAdmin())return;
  const api=securityApi();if(api){api.open();return}
  document.getElementById('v49-security-loader')?.remove();
  const script=document.createElement('script');script.id='v49-security-loader';script.src='./v48-admin-security.js?v=50.1-'+Date.now();script.async=true;
  script.onload=()=>setTimeout(()=>{const ready=securityApi();if(ready)ready.open();else alert('تعذر تشغيل أمان الدخول. حدّث الصفحة وحاول مرة أخرى.')},80);
  script.onerror=()=>alert('تعذر تحميل أمان الدخول. تحقق من الاتصال ثم حاول مرة أخرى.');document.head.appendChild(script);
}
function ensureDock(){let d=document.getElementById('v50-admin-dock');if(!d){d=document.createElement('div');d.id='v50-admin-dock';d.setAttribute('aria-label','أدوات الإدارة');document.body.appendChild(d)}return d}
function makeLink(id,href,icon,label){let a=document.getElementById(id);if(!a){a=document.createElement('a');a.id=id;a.href=href;a.className='v45-admin-tab';a.innerHTML=`<span>${icon}</span><span>${label}</span>`;a.style.textDecoration='none'}return a}
function makeSecurity(){let b=document.getElementById('v49-security-tab');if(!b){b=document.createElement('button');b.id='v49-security-tab';b.type='button';b.className='v45-admin-tab';b.innerHTML='<span>⌁</span><span>أمان الدخول</span>';b.onclick=openSecurity}return b}
function add(){
  installCss();const dock=ensureDock();
  let control=document.getElementById('v46-control-tab'),inventory=document.getElementById('v50-inventory-tab'),security=document.getElementById('v49-security-tab');
  if(!isAdmin()){[control,inventory,security].forEach(x=>x?.remove());dock.classList.remove('on');return}
  control=control||makeLink('v46-control-tab','./control-center.html','⚙','مركز التحكم');
  inventory=inventory||makeLink('v50-inventory-tab','./inventory-analytics.html','↕','حركة المخزون');
  security=security||makeSecurity();
  const host=preferredHost();
  if(host){dock.classList.remove('on');for(const el of [control,inventory,security])if(el.parentElement!==host)host.appendChild(el)}
  else{dock.classList.add('on');for(const el of [control,inventory,security])if(el.parentElement!==dock)dock.appendChild(el)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(add,100)});mo.observe(document.documentElement,{childList:true,subtree:true});
let tries=0;const timer=setInterval(()=>{add();if(++tries>=50&&document.getElementById('v50-inventory-tab')&&document.getElementById('v49-security-tab')&&document.getElementById('v46-control-tab'))clearInterval(timer)},250);
window.addEventListener('storage',e=>{if(['inventory_user_name_v2','inventory_admin_token_v2'].includes(e.key))add()});window.addEventListener('load',()=>setTimeout(add,50));
window.__V46_ADMIN_NAV={version:VERSION,refresh:add,openSecurity};
})();
