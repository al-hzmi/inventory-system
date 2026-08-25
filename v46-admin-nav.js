(()=>{
'use strict';
const VERSION='51.1';
const path=(location.pathname.split('/').pop()||'').toLowerCase();
const ADMIN_PAGES=new Set(['admin-dashboard.html','command-center.html','control-center.html','inventory-analytics.html','admin-stocktake-shell.html']);
const isAdmin=()=>String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')==='1jh297-spgf2z';
if(!ADMIN_PAGES.has(path)||!isAdmin())return;

if(path==='command-center.html'){
  location.replace('./admin-dashboard.html?section=employees&module=overview&from=legacy-command');
  return;
}

const icon={home:'⌂',employees:'♙',customers:'▣',sales:'↘',stocktake:'✓',permissions:'⚙',security:'⌁',exit:'×'};
const links=[
  ['home','الرئيسية','./admin-dashboard.html?section=employees&module=overview'],
  ['employees','الموظفون','./admin-dashboard.html?section=employees&module=live'],
  ['customers','العملاء','./admin-dashboard.html?section=customers&module=live'],
  ['sales','المبيعات','./inventory-analytics.html'],
  ['stocktake','الجرد','./admin-stocktake-shell.html'],
  ['permissions','الصلاحيات','./control-center.html']
];

function currentKey(){
  if(path==='inventory-analytics.html')return'sales';
  if(path==='admin-stocktake-shell.html')return'stocktake';
  if(path==='control-center.html')return'permissions';
  if(path==='admin-dashboard.html'){
    const q=new URLSearchParams(location.search),s=q.get('section');
    if(s==='customers')return'customers';
    if(s==='employees'&&q.get('module')==='overview')return'home';
    if(s==='employees')return'employees';
    return'home';
  }
  return'home';
}

function css(){
  if(document.getElementById('v51-admin-shell-css'))return;
  const s=document.createElement('style');s.id='v51-admin-shell-css';s.textContent=`
:root{--v51-shell-h:64px;--v51-border:#e7e5e4;--v51-bg:#fafaf9;--v51-text:#1c1917;--v51-muted:#78716c;--v51-accent:#b45309}
#v51-admin-shell{position:relative;z-index:100500;background:rgba(255,255,255,.98);border-bottom:1px solid var(--v51-border);font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;color:var(--v51-text)}
#v51-admin-shell *{box-sizing:border-box}.v51-shell-row{height:var(--v51-shell-h);max-width:1460px;margin:auto;display:flex;align-items:center;gap:10px;padding:8px 14px}.v51-brand{min-width:135px;text-decoration:none;color:var(--v51-text);display:flex;align-items:center;gap:10px}.v51-brand-mark{width:35px;height:35px;border-radius:11px;background:#1c1917;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800}.v51-brand-copy b{font-size:14px;display:block}.v51-brand-copy span{font-size:9px;color:var(--v51-muted);display:block;margin-top:1px}.v51-nav{flex:1;display:flex;align-items:center;gap:4px;overflow-x:auto;scrollbar-width:none}.v51-nav::-webkit-scrollbar{display:none}.v51-item{height:42px;min-width:max-content;padding:0 11px;border:1px solid transparent;border-radius:11px;background:transparent;color:#57534e;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:10px;font-weight:700;white-space:nowrap;cursor:pointer}.v51-item:hover{background:#fafaf9;color:#1c1917}.v51-item.on{background:#fef3c7;color:#92400e;border-color:#fde68a}.v51-icon{font-size:13px;line-height:1}.v51-security{border-color:var(--v51-border);background:#fff}.v51-exit{width:40px;min-width:40px;padding:0;border-color:var(--v51-border);background:#fff;font-size:17px}.v51-exit:hover{background:#fef2f2;color:#b91c1c;border-color:#fecaca}
#v45-command-tab,#v45-messages-tab,#v46-control-tab,#v49-security-tab,#v49-security-fallback,#v50-inventory-tab,#v51-legacy-dock{display:none!important}
body.v51-admin-dashboard{background:#fafaf9!important;overflow:auto!important}body.v51-admin-dashboard #root>div.fixed.inset-0{position:relative!important;inset:auto!important;min-height:calc(100dvh - var(--v51-shell-h))!important;background:#fafaf9!important;padding:0!important;display:block!important}body.v51-admin-dashboard #root>div.fixed.inset-0>div:first-child{width:100%!important;max-width:none!important;height:calc(100dvh - var(--v51-shell-h))!important;min-height:620px!important;border-radius:0!important;box-shadow:none!important;margin:0!important}body.v51-admin-dashboard #root>div.fixed.inset-0>div:first-child>div:nth-child(1),body.v51-admin-dashboard #root>div.fixed.inset-0>div:first-child>div:nth-child(2){display:none!important}
body.v51-control-center .top .topin,body.v51-inventory-analytics .top .topin{display:none!important}body.v51-control-center .top,body.v51-inventory-analytics .top{top:0!important;position:sticky!important}body.v51-control-center .app,body.v51-inventory-analytics .app{max-width:1460px!important}
@media(max-width:780px){:root{--v51-shell-h:108px}.v51-shell-row{height:108px;display:grid;grid-template-columns:1fr auto;gap:7px;padding:8px 10px}.v51-brand{min-width:0}.v51-nav{grid-column:1/-1;width:100%;order:3}.v51-item{height:38px;padding:0 10px;font-size:10px}.v51-security{margin-inline-start:auto}.v51-exit{grid-column:2;grid-row:1}.v51-brand-copy span{display:none}body.v51-admin-dashboard #root>div.fixed.inset-0>div:first-child{height:calc(100dvh - var(--v51-shell-h))!important;min-height:560px!important}}
`;
  document.head.appendChild(s);
}

function securityApi(){return window.__V48_ADMIN_SECURITY&&typeof window.__V48_ADMIN_SECURITY.open==='function'?window.__V48_ADMIN_SECURITY:null}
function openSecurity(){
  const ready=securityApi();if(ready){ready.open();return}
  let sc=document.getElementById('v51-security-loader');if(sc)sc.remove();
  sc=document.createElement('script');sc.id='v51-security-loader';sc.src='./v48-admin-security.js?v=51.1-'+Date.now();sc.async=true;
  sc.onload=()=>setTimeout(()=>{const api=securityApi();if(api)api.open();else alert('تعذر تشغيل أمان الدخول. حدّث الصفحة وحاول مرة أخرى.')},80);
  sc.onerror=()=>alert('تعذر تحميل أمان الدخول. تحقق من الاتصال ثم حاول مرة أخرى.');document.head.appendChild(sc);
}

function makeShell(){
  if(document.getElementById('v51-admin-shell'))return;
  const active=currentKey(),h=document.createElement('header');h.id='v51-admin-shell';h.setAttribute('aria-label','الإدارة');
  h.innerHTML=`<div class="v51-shell-row"><a class="v51-brand" href="./admin-dashboard.html?section=employees&module=overview"><span class="v51-brand-mark">إ</span><span class="v51-brand-copy"><b>الإدارة</b><span>بيت الأواني الطيبة</span></span></a><nav class="v51-nav" aria-label="أقسام الإدارة">${links.map(([key,label,href])=>`<a class="v51-item ${active===key?'on':''}" data-v51-key="${key}" href="${href}"><span class="v51-icon">${icon[key]}</span><span>${label}</span></a>`).join('')}<button class="v51-item v51-security" id="v51-security" type="button"><span class="v51-icon">${icon.security}</span><span>الأمان</span></button></nav><a class="v51-item v51-exit" href="./index.html?employee=1" title="الخروج من الإدارة" aria-label="الخروج من الإدارة">${icon.exit}</a></div>`;
  document.body.insertBefore(h,document.body.firstChild);
  document.getElementById('v51-security').onclick=openSecurity;
  h.querySelectorAll('[data-v51-key="employees"],[data-v51-key="customers"],[data-v51-key="home"]').forEach(a=>a.addEventListener('click',e=>{
    if(path!=='admin-dashboard.html')return;
    e.preventDefault();const key=a.dataset.v51Key;
    if(key==='customers')activateDashboard('customers','live');else if(key==='employees')activateDashboard('employees','live');else activateDashboard('employees','overview');
    history.replaceState(null,'',a.getAttribute('href'));markActive(key);
  }));
}
function markActive(key){document.querySelectorAll('#v51-admin-shell [data-v51-key]').forEach(x=>x.classList.toggle('on',x.dataset.v51Key===key))}
function nativeButtons(){return [...document.querySelectorAll('#root button')].filter(b=>!b.closest('#v51-admin-shell'))}
function findButton(label){const n=String(label).trim();return nativeButtons().find(b=>String(b.innerText||'').trim().split('\n')[0].trim()===n)||nativeButtons().find(b=>String(b.innerText||'').includes(n))||null}
function activateDashboard(section,module){
  if(path!=='admin-dashboard.html')return;
  const areaLabel=section==='customers'?'العملاء':'الموظفون';
  const areaBtn=findButton(areaLabel);if(areaBtn)areaBtn.click();
  const labels={live:'الآن',overview:'الأرقام',accounts:section==='customers'?'العملاء':'حسابات الموظفين',orders:'الطلبات',images:'إدارة الصور',site_access:'صلاحيات الموقع',portal:'تشغيل البوابة'};
  const target=labels[module]||labels.live;
  let tries=0;const t=setInterval(()=>{const b=findButton(target);if(b){b.click();clearInterval(t)}else if(++tries>20)clearInterval(t)},80);
}
function applyRequestedView(){if(path!=='admin-dashboard.html')return;const q=new URLSearchParams(location.search),section=q.get('section'),module=q.get('module');if(section==='customers'||section==='employees')setTimeout(()=>activateDashboard(section,module||'live'),150)}
function interceptLegacyStocktake(){
  if(path!=='admin-dashboard.html'||document.documentElement.dataset.v51StocktakeIntercept)return;
  document.documentElement.dataset.v51StocktakeIntercept='1';
  document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;const txt=String(b.innerText||'');if(/إدارة الجرد|فتح مركز الجرد/.test(txt)){e.preventDefault();e.stopImmediatePropagation();location.href='./admin-stocktake-shell.html'}},true);
}
function cleanupLegacy(){['v45-command-tab','v45-messages-tab','v46-control-tab','v49-security-tab','v49-security-fallback','v50-inventory-tab'].forEach(id=>document.getElementById(id)?.remove())}
function normalize(){
  document.body.classList.toggle('v51-admin-dashboard',path==='admin-dashboard.html');
  document.body.classList.toggle('v51-control-center',path==='control-center.html');
  document.body.classList.toggle('v51-inventory-analytics',path==='inventory-analytics.html');
  cleanupLegacy();interceptLegacyStocktake();
}
function run(){css();normalize();makeShell();applyRequestedView()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(()=>{normalize();makeShell()},80)});mo.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(run,40));
window.__V51_ADMIN_SHELL={version:VERSION,openSecurity,activateDashboard,refresh:run};
})();