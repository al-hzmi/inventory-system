(()=>{
'use strict';
const norm=s=>String(s??'').toLowerCase().replace(/[\u064B-\u065F\u0670]/g,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
const QA_RE=/(اختبار|تجربه|تجربة|test|qa|playwright|audit_employee|موظف اختبار|اختبار تقني)/i;
const showQa=new URLSearchParams(location.search).get('showQa')==='1';
function hideQaRows(){if(showQa)return;const candidates=document.querySelectorAll('tr,li,[data-row],.divide-y > div,.divide-y > article');for(const el of candidates){const text=norm(el.innerText||'');if(text.length>0&&text.length<700&&QA_RE.test(text)){el.style.display='none';el.dataset.v44QaHidden='1'}}}
function inject(){if(document.getElementById('v44-command-link'))return;const a=document.createElement('a');a.id='v44-command-link';a.href='./command-center.html';a.innerHTML='<span style="font-size:16px">⌁</span><span>مركز القيادة</span>';a.style.cssText='position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));z-index:9998;height:42px;padding:0 14px;border-radius:13px;background:#1c1917;color:#fff;text-decoration:none;display:flex;align-items:center;gap:7px;font:700 12px/1 system-ui;box-shadow:0 10px 30px rgba(28,25,23,.22);border:1px solid rgba(255,255,255,.12)';document.body.appendChild(a)}
function run(){hideQaRows();inject()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(run,80)});mo.observe(document.documentElement,{childList:true,subtree:true});
})();