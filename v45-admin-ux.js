(()=>{
'use strict';
/* V51 compatibility shim.
   V45 previously injected extra global launchers (Command Center + sent messages)
   into the dashboard. V51 deliberately retires those launchers so administration
   has one navigation shell only. This file now keeps only harmless horizontal
   scrolling ergonomics for legacy/local tab rows. */
const VERSION='51.0';
function installCss(){
  if(document.getElementById('v45-admin-css'))return;
  const s=document.createElement('style');s.id='v45-admin-css';s.textContent=`
.no-scrollbar{scrollbar-width:none}.no-scrollbar::-webkit-scrollbar{display:none}
@media(min-width:1000px){
  .no-scrollbar{scrollbar-width:thin!important}.no-scrollbar::-webkit-scrollbar{display:block!important;height:7px!important}.no-scrollbar::-webkit-scrollbar-thumb{background:#d6d3d1;border-radius:999px}.no-scrollbar::-webkit-scrollbar-track{background:#fafaf9}
  .overflow-x-auto{scrollbar-width:thin!important}.overflow-x-auto::-webkit-scrollbar{height:7px!important}.overflow-x-auto::-webkit-scrollbar-thumb{background:#d6d3d1;border-radius:999px}
  .tablewrap{scrollbar-width:thin!important}.tablewrap::-webkit-scrollbar{height:7px}.tablewrap::-webkit-scrollbar-thumb{background:#d6d3d1;border-radius:999px}
}`;document.head.appendChild(s);
}
function enableDesktopHorizontal(el){
  if(!el||el.dataset.v45DesktopScroll)return;el.dataset.v45DesktopScroll='1';let down=false,startX=0,startScroll=0;
  el.addEventListener('mousedown',e=>{if(innerWidth<900||e.button!==0||e.target.closest('button,a,input,select,textarea')||el.scrollWidth<=el.clientWidth+2)return;down=true;startX=e.clientX;startScroll=el.scrollLeft;el.style.cursor='grabbing';e.preventDefault()});
  window.addEventListener('mousemove',e=>{if(!down)return;el.scrollLeft=startScroll-(e.clientX-startX)});
  window.addEventListener('mouseup',()=>{if(!down)return;down=false;el.style.cursor=''});
  el.addEventListener('wheel',e=>{if(innerWidth<900||el.scrollWidth<=el.clientWidth+2)return;if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return;if(e.shiftKey||Math.abs(e.deltaY)>20){el.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});
}
function enhance(){document.querySelectorAll('.overflow-x-auto,.no-scrollbar,.tablewrap,.tabs').forEach(enableDesktopHorizontal)}
function removeLegacyLaunchers(){['v45-command-tab','v45-messages-tab'].forEach(id=>document.getElementById(id)?.remove())}
function run(){installCss();removeLegacyLaunchers();enhance()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(run,120)});mo.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('resize',()=>setTimeout(enhance,60));
window.__V45_ADMIN_UX={version:VERSION,refresh:run,legacyLaunchers:false};
})();