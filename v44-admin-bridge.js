(()=>{
'use strict';
/* V51 keeps only the QA-row isolation responsibility from the old admin bridge.
   The floating Command Center launcher is retired; global navigation belongs
   exclusively to the unified administration shell. */
const VERSION='51.0';
const norm=s=>String(s??'').toLowerCase().replace(/[\u064B-\u065F\u0670]/g,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
const QA_RE=/(اختبار|تجربه|تجربة|test|qa|playwright|audit_employee|موظف اختبار|اختبار تقني)/i;
const showQa=new URLSearchParams(location.search).get('showQa')==='1';
function hideQaRows(){if(showQa)return;const candidates=document.querySelectorAll('tr,li,[data-row],.divide-y > div,.divide-y > article');for(const el of candidates){const text=norm(el.innerText||'');if(text.length>0&&text.length<700&&QA_RE.test(text)){el.style.display='none';el.dataset.v44QaHidden='1'}}}
function removeLegacy(){document.getElementById('v44-command-link')?.remove()}
function run(){removeLegacy();hideQaRows()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(run,100)});mo.observe(document.documentElement,{childList:true,subtree:true});
window.__V44_ADMIN_BRIDGE={version:VERSION,refresh:run,commandLauncher:false};
})();