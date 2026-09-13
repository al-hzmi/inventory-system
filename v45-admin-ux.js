(()=>{
'use strict';
/* V56.53 — native scrolling only.
   Legacy V45 used to convert vertical wheel input into horizontal scrolling and
   installed window-level drag listeners plus a perpetual MutationObserver.
   That made admin surfaces feel sticky and caused vertical page scroll to stop
   while the pointer was over a horizontal strip. Modern browsers already give
   us the correct wheel/trackpad/touch behavior, so this shim now stays passive. */
const VERSION='56.53';
function installCss(){
  if(document.getElementById('v45-admin-css'))return;
  const s=document.createElement('style');s.id='v45-admin-css';s.textContent=`
.no-scrollbar{scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-inline:contain;scroll-behavior:auto!important;touch-action:pan-x pan-y}.no-scrollbar::-webkit-scrollbar{display:none}
.overflow-x-auto,.tablewrap,.tabs{overscroll-behavior-inline:contain;-webkit-overflow-scrolling:touch;scroll-behavior:auto!important;touch-action:pan-x pan-y}
@media(min-width:1000px){
  .no-scrollbar{scrollbar-width:thin!important}.no-scrollbar::-webkit-scrollbar{display:block!important;height:7px!important}.no-scrollbar::-webkit-scrollbar-thumb{background:#d6d3d1;border-radius:999px}.no-scrollbar::-webkit-scrollbar-track{background:#fafaf9}
  .overflow-x-auto{scrollbar-width:thin!important}.overflow-x-auto::-webkit-scrollbar{height:7px!important}.overflow-x-auto::-webkit-scrollbar-thumb{background:#d6d3d1;border-radius:999px}
  .tablewrap{scrollbar-width:thin!important}.tablewrap::-webkit-scrollbar{height:7px}.tablewrap::-webkit-scrollbar-thumb{background:#d6d3d1;border-radius:999px}
}`;document.head.appendChild(s);
}
function removeLegacyLaunchers(){['v45-command-tab','v45-messages-tab'].forEach(id=>document.getElementById(id)?.remove())}
function run(){installCss();removeLegacyLaunchers()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
window.__V45_ADMIN_UX={version:VERSION,refresh:run,legacyLaunchers:false,nativeScroll:true};
})();
