from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor missing')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# Shared interaction CSS: native touch/wheel behavior, no smooth auto-jumps.
# ---------------------------------------------------------------------------
write('v56-53-admin-interaction.css', r'''/* V56.53 — admin interaction stability + native scrolling */
:root{scroll-behavior:auto}
.v52-tabs,.sales-tabs,.period-tabs,.templatebar,.tabs,.overflow-x-auto,.tablewrap,.v52-table-wrap,.movement-table-wrap{
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-inline:contain;
  scroll-behavior:auto!important;
  touch-action:pan-x pan-y;
  min-width:0;
}
.v52-table-wrap,.movement-table-wrap,.drawerbody,[class*="overflow-y-auto"]{
  overscroll-behavior-block:contain;
  -webkit-overflow-scrolling:touch;
}
button,a,[role="button"]{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
''')

# ---------------------------------------------------------------------------
# Admin shell: no perpetual whole-document observer. Bounded settling only.
# ---------------------------------------------------------------------------
p=Path('v46-admin-nav.js'); s=read(p)
s=s.replace("const VERSION='56.39'", "const VERSION='56.53'", 1)
s=replace_once(
    s,
    "function loadCss(){loadStyle('v52-admin-css','./v52-admin.css?v=54.0');loadStyle('v53-admin-polish','./v53-admin-polish.css?v=54.0');loadStyle('v54-admin-overhaul','./v54-admin-overhaul.css?v=54.0');if(!document.getElementById('v52-var-aliases')){",
    "function loadCss(){loadStyle('v52-admin-css','./v52-admin.css?v=54.0');loadStyle('v53-admin-polish','./v53-admin-polish.css?v=54.0');loadStyle('v54-admin-overhaul','./v54-admin-overhaul.css?v=54.0');loadStyle('v56-53-admin-interaction','./v56-53-admin-interaction.css?v=56.53');if(!document.getElementById('v52-var-aliases')){",
    'v46 interaction stylesheet'
)
s=s.replace("s.src='./v54-admin-enhancements.js?v=56.38'", "s.src='./v54-admin-enhancements.js?v=56.53'", 1)
old_end="""function run(){loadCss();loadIdentity();cleanup();make();polishHome();activateRequested();loadEnhancements()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(()=>{cleanup();make();polishHome()},100)});mo.observe(document.documentElement,{childList:true,subtree:true});window.__V51_ADMIN_SHELL={version:VERSION,refresh:run};window.__V52_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V54_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V56_37_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V56_38_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V56_39_ADMIN_SHELL=window.__V51_ADMIN_SHELL;
})();
"""
new_end="""let requestedActivated=false;
function run(){loadCss();loadIdentity();cleanup();make();polishHome();if(!requestedActivated){requestedActivated=true;activateRequested()}loadEnhancements()}
function settle(){cleanup();make();polishHome();loadEnhancements()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
// Bounded late passes catch scripts that render immediately after DOMContentLoaded without
// keeping an expensive observer over the entire administration DOM forever.
setTimeout(settle,180);setTimeout(settle,850);
window.__V51_ADMIN_SHELL={version:VERSION,refresh:run};window.__V52_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V54_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V56_37_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V56_38_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V56_39_ADMIN_SHELL=window.__V51_ADMIN_SHELL;window.__V56_53_ADMIN_SHELL=window.__V51_ADMIN_SHELL;
})();
"""
s=replace_once(s,old_end,new_end,'v46 observer retirement')
write(p,s)

# ---------------------------------------------------------------------------
# Enhancements: move active tab only when actually clipped; no smooth centering.
# Replace global DOM observer with bounded/scoped hooks.
# ---------------------------------------------------------------------------
p=Path('v54-admin-enhancements.js'); s=read(p)
s=s.replace("const VERSION='56.38'", "const VERSION='56.53'", 1)
old_fn=r'''let lastActiveModule='',lastActiveNode=null;
function keepActiveModuleVisible(){
 if(path!=='admin-dashboard.html')return;
 const active=document.querySelector('#root [data-admin-module][data-active="true"]');if(!active)return;
 const key=active.getAttribute('data-admin-module')||active.textContent||'';
 let scroller=active.parentElement;
 while(scroller&&scroller!==document.body&&scroller.scrollWidth<=scroller.clientWidth+2)scroller=scroller.parentElement;
 if(!scroller||scroller===document.body){lastActiveModule=key;lastActiveNode=active;return}
 const a=active.getBoundingClientRect(),s=scroller.getBoundingClientRect();
 const nodeChanged=active!==lastActiveNode,moduleChanged=key!==lastActiveModule,clipped=a.left<s.left+6||a.right>s.right-6;
 lastActiveModule=key;lastActiveNode=active;
 if(!nodeChanged&&!moduleChanged&&!clipped)return;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(!document.contains(active))return;
  active.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
 }));
}
'''
new_fn=r'''let lastActiveModule='';
function keepActiveModuleVisible(){
 if(path!=='admin-dashboard.html')return;
 const active=document.querySelector('#root [data-admin-module][data-active="true"]');if(!active)return;
 const key=active.getAttribute('data-admin-module')||active.textContent||'';
 let scroller=active.parentElement;
 while(scroller&&scroller!==document.body&&scroller.scrollWidth<=scroller.clientWidth+2)scroller=scroller.parentElement;
 lastActiveModule=key;
 if(!scroller||scroller===document.body)return;
 const a=active.getBoundingClientRect(),box=scroller.getBoundingClientRect();
 const clipped=a.left<box.left+6||a.right>box.right-6;
 if(!clipped)return;
 requestAnimationFrame(()=>{
  if(!document.contains(active))return;
  active.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});
 });
}
'''
s=replace_once(s,old_fn,new_fn,'v54 active module stability')
old_tail="""function run(){loadCanvasFix();extendControlCenter();labels();permissionSummary();loadSalesClarity();executiveIntegration()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0));else setTimeout(run,0);
const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(()=>{loadCanvasFix();labels();permissionSummary();loadSalesClarity();executiveIntegration()},100)});mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-active']});
window.__V54_ADMIN_ENHANCEMENTS={version:VERSION,employeeExtra,customerExtra,refresh:run};window.__V56_35_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;window.__V56_37_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;window.__V56_38_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;
})();
"""
new_tail="""function run(){loadCanvasFix();extendControlCenter();labels();permissionSummary();loadSalesClarity();executiveIntegration()}
function watchHomeUntilReady(){
 if(path!=='admin-home.html')return;const home=document.getElementById('home');if(!home)return;
 const observer=new MutationObserver(()=>{renderExecutiveSecurityCenter();if(document.getElementById('v56-security-command-center'))observer.disconnect()});
 observer.observe(home,{childList:true});setTimeout(()=>observer.disconnect(),8000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{run();watchHomeUntilReady()},{once:true});else{run();watchHomeUntilReady()}
// A few bounded passes cover async first paints without rescanning every DOM mutation.
setTimeout(run,240);setTimeout(run,1100);setTimeout(run,2600);
document.addEventListener('click',e=>{if(path!=='admin-dashboard.html'||!e.target.closest('[data-admin-module]'))return;setTimeout(keepActiveModuleVisible,0)},true);
window.__V54_ADMIN_ENHANCEMENTS={version:VERSION,employeeExtra,customerExtra,refresh:run};window.__V56_35_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;window.__V56_37_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;window.__V56_38_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;window.__V56_53_EXECUTIVE_INTEGRATION=window.__V54_ADMIN_ENHANCEMENTS;
})();
"""
s=replace_once(s,old_tail,new_tail,'v54 observer retirement')
write(p,s)

# ---------------------------------------------------------------------------
# Admin dashboard: coalesce Firestore snapshots into at most one React update/frame.
# ---------------------------------------------------------------------------
p=Path('admin-dashboard.html'); s=read(p)
old="""    let stopped=false;const unsubs=[];const waiting=new Set(Object.keys(COLLECTIONS));
    const markReady=key=>{waiting.delete(key);if(!waiting.size&&!stopped)setSyncing(false)};
    const apply=(key,name,snap)=>{if(stopped)return;const rows=snap.docs.map(d=>({id:d.id,...d.data(),__collection:name}));setData(prev=>({...prev,[key]:rows}));markReady(key)};
"""
new="""    let stopped=false;const unsubs=[];const waiting=new Set(Object.keys(COLLECTIONS));let pendingData={},dataFrame=0;
    const markReady=key=>{waiting.delete(key);if(!waiting.size&&!stopped)setSyncing(false)};
    const flushData=()=>{dataFrame=0;if(stopped)return;const patch=pendingData;pendingData={};if(Object.keys(patch).length)setData(prev=>({...prev,...patch}))};
    const apply=(key,name,snap)=>{if(stopped)return;const rows=snap.docs.map(d=>({id:d.id,...d.data(),__collection:name}));pendingData[key]=rows;if(!dataFrame)dataFrame=requestAnimationFrame(flushData);markReady(key)};
"""
s=replace_once(s,old,new,'dashboard snapshot batching')
s=replace_once(s,"return()=>{stopped=true;clearTimeout(settle);unsubs.forEach(fn=>fn())}","return()=>{stopped=true;clearTimeout(settle);if(dataFrame)cancelAnimationFrame(dataFrame);unsubs.forEach(fn=>fn())}",'dashboard frame cleanup')
write(p,s)

# ---------------------------------------------------------------------------
# Movement page: preserve horizontal/window/focus state and cap DOM row volume.
# ---------------------------------------------------------------------------
p=Path('inventory-analytics.html'); s=read(p)
s=replace_once(s,"const S={data:null,period:'today',branch:'all',kind:'decrease',q:'',error:''};","const PAGE_SIZE=300;const S={data:null,period:'today',branch:'all',kind:'decrease',q:'',error:'',limit:PAGE_SIZE};",'movement page size')
needle="function skuSummaries(rowsNow){const map=new Map();for(const c of rowsNow){const key=String(c.sku),x=map.get(key)||{sku:key,name:c.name||'',events:0,net:0,last:c.timestamp,branch:new Set()};x.events++;x.net+=Number(c.delta||0);x.branch.add(c.branchLabel||c.branch);if(new Date(c.timestamp)>new Date(x.last))x.last=c.timestamp;map.set(key,x)}return[...map.values()].sort((a,b)=>new Date(b.last)-new Date(a.last))}\n"
addition=needle+"function captureView(){const tabs=$('.period-tabs'),active=document.activeElement;return{y:window.scrollY||0,tabsLeft:tabs?.scrollLeft||0,focus:active?.id||'',caret:active?.id==='q'?active.selectionStart:null}}\nfunction restoreView(v){requestAnimationFrame(()=>{const tabs=$('.period-tabs');if(tabs)tabs.scrollLeft=v.tabsLeft||0;window.scrollTo({top:v.y||0,behavior:'auto'});if(v.focus==='q'){const q=$('#q');if(q){q.focus({preventScroll:true});try{const p=Math.min(v.caret??q.value.length,q.value.length);q.setSelectionRange(p,p)}catch{}}}})}\n"
s=replace_once(s,needle,addition,'movement view preservation helpers')
s=replace_once(s,"function render(){if(!S.data){","function render(){const view=captureView();if(!S.data){",'movement render capture')
s=s.replace('r.slice(0,3000)', 'r.slice(0,S.limit)')
s=s.replace('r.slice(0,1000)', 'r.slice(0,S.limit)')
# Add load-more control before footer metadata.
anchor='''</div></section>
<div class="movement-meta" style="margin:10px 2px 20px">'''
insert='''</div></section>${r.length>S.limit?`<div style="display:flex;justify-content:center;margin-top:10px"><button id="moreRows" class="v52-btn">عرض ${num(Math.min(PAGE_SIZE,r.length-S.limit))} حركة إضافية</button></div>`:''}
<div class="movement-meta" style="margin:10px 2px 20px">'''
s=replace_once(s,anchor,insert,'movement load more')
s=replace_once(s,"<span>المصدر: تاريخ تحديثات المخزون</span></div>`;bind()}","<span>المصدر: تاريخ تحديثات المخزون</span></div>`;bind();restoreView(view)}",'movement restore after render')
old_bind="""function bind(){$$('[data-period]').forEach(b=>b.onclick=()=>{S.period=b.dataset.period;render()});$$('[data-goto]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.goto;render()});"""
# inventory page does not contain data-goto; guard in case prior text differs.
if old_bind in s:
    raise SystemExit('movement unexpected control-center bind anchor collision')
old_bind="""function bind(){$$('[data-period]').forEach(b=>b.onclick=()=>{S.period=b.dataset.period;render()});$('#branch')?.addEventListener('change',e=>{S.branch=e.target.value;render()});$('#kind')?.addEventListener('change',e=>{S.kind=e.target.value;render()});let timer;$('#q')?.addEventListener('input',e=>{S.q=e.target.value;const caret=e.target.selectionStart;clearTimeout(timer);timer=setTimeout(()=>{render();const q=$('#q');if(q){q.focus({preventScroll:true});try{const pos=Math.min(caret??q.value.length,q.value.length);q.setSelectionRange(pos,pos)}catch{}}},220)})}
"""
new_bind="""let movementSearchTimer;
function bind(){$$('[data-period]').forEach(b=>b.onclick=()=>{S.period=b.dataset.period;S.limit=PAGE_SIZE;render()});$('#branch')?.addEventListener('change',e=>{S.branch=e.target.value;S.limit=PAGE_SIZE;render()});$('#kind')?.addEventListener('change',e=>{S.kind=e.target.value;S.limit=PAGE_SIZE;render()});$('#moreRows')?.addEventListener('click',()=>{S.limit+=PAGE_SIZE;render()});$('#q')?.addEventListener('input',e=>{S.q=e.target.value;S.limit=PAGE_SIZE;clearTimeout(movementSearchTimer);movementSearchTimer=setTimeout(render,180)})}
"""
s=replace_once(s,old_bind,new_bind,'movement stable bindings')
s=s.replace("fetch('./data/inventory-analytics.json?v='+Date.now(),{cache:'no-store'})","fetch('./data/inventory-analytics.json?v=56.53',{cache:'no-cache'})",1)
write(p,s)

# ---------------------------------------------------------------------------
# Control center: coalesce 15 realtime snapshots and preserve tab/search state.
# ---------------------------------------------------------------------------
p=Path('control-center.html'); s=read(p)
anchor="const CONTROL_ROUTE=new URLSearchParams(location.search);const S={tab:['overview','permissions','profiles','features','audit'].includes(CONTROL_ROUTE.get('tab'))?CONTROL_ROUTE.get('tab'):'overview',scope:CONTROL_ROUTE.get('scope')==='customers'?'customer':'employee',q:'',employees:[],customers:[],activity:[],carts:[],employeeSessions:[],customerSessions:[],customerDevices:[],messages:[],customerOrders:[],employeeOrders:[],permissions:{employeeDefaults:{...DEFAULTS.employee},customerDefaults:{...DEFAULTS.customer},employeeOverrides:{},customerOverrides:{}},employeeSite:{mode:'open'},customerPortal:{enabled:true},stocktake:{enabled:false},audit:[],selected:null,errors:[]};const unsubs=[];\n"
if anchor not in s: raise SystemExit('control state anchor missing')
s=s.replace(anchor,anchor+"let renderFrame=0,searchTimer=0;function scheduleRender(){if(renderFrame)return;renderFrame=requestAnimationFrame(()=>{renderFrame=0;render()})}\nfunction controlView(){const tabs=$('.tabs'),active=document.activeElement;return{y:window.scrollY||0,tabsLeft:tabs?.scrollLeft||0,focus:active?.id||'',caret:active?.id==='pq'?active.selectionStart:null}}\nfunction restoreControlView(v){requestAnimationFrame(()=>{const tabs=$('.tabs');if(tabs)tabs.scrollLeft=v.tabsLeft||0;window.scrollTo({top:v.y||0,behavior:'auto'});if(v.focus==='pq'){const q=$('#pq');if(q){q.focus({preventScroll:true});try{const p=Math.min(v.caret??q.value.length,q.value.length);q.setSelectionRange(p,p)}catch{}}}})}\n",1)
old_listen="function listen(label,q,cb){try{const u=q.onSnapshot(s=>{cb(s.docs.map(d=>({id:d.id,...d.data()})));render()},e=>{S.errors.push(label+': '+e.message);render()});unsubs.push(u)}catch(e){S.errors.push(label+': '+e.message)}}\nfunction docListen(label,ref,cb){try{const u=ref.onSnapshot(d=>{cb(d.exists?{id:d.id,...d.data()}:{});render()},e=>{S.errors.push(label+': '+e.message);render()});unsubs.push(u)}catch(e){S.errors.push(label+': '+e.message)}}"
new_listen="function listen(label,q,cb){try{const u=q.onSnapshot(s=>{cb(s.docs.map(d=>({id:d.id,...d.data()})));scheduleRender()},e=>{S.errors.push(label+': '+e.message);scheduleRender()});unsubs.push(u)}catch(e){S.errors.push(label+': '+e.message)}}\nfunction docListen(label,ref,cb){try{const u=ref.onSnapshot(d=>{cb(d.exists?{id:d.id,...d.data()}:{});scheduleRender()},e=>{S.errors.push(label+': '+e.message);scheduleRender()});unsubs.push(u)}catch(e){S.errors.push(label+': '+e.message)}}"
s=replace_once(s,old_listen,new_listen,'control snapshot coalescing')
s=replace_once(s,"function render(){const tabs=","function render(){const view=controlView();const tabs=",'control render capture')
s=replace_once(s,"</section></main>`;bind()}","</section></main>`;bind();restoreControlView(view)}",'control restore after render')
old_bind="function bind(){$$('[data-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;S.q='';render()});$$('[data-goto]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.goto;render()});$('#scope')?.addEventListener('change',e=>{S.scope=e.target.value;S.q='';render()});$('#pq')?.addEventListener('input',e=>{S.q=e.target.value;render()});"
new_bind="function bind(){$$('[data-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;S.q='';render()});$$('[data-goto]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.goto;render()});$('#scope')?.addEventListener('change',e=>{S.scope=e.target.value;S.q='';render()});$('#pq')?.addEventListener('input',e=>{S.q=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(render,140)});"
s=replace_once(s,old_bind,new_bind,'control debounced search')
s=s.replace("window.addEventListener('beforeunload',()=>unsubs.forEach(u=>{try{u()}catch{}}));boot();","window.addEventListener('beforeunload',()=>{if(renderFrame)cancelAnimationFrame(renderFrame);clearTimeout(searchTimer);unsubs.forEach(u=>{try{u()}catch{}})});boot();",1)
write(p,s)

# ---------------------------------------------------------------------------
# Admin home: start all data work concurrently, paint analytics first, then
# progressively add core and secondary Firestore data without jumping viewport.
# ---------------------------------------------------------------------------
p=Path('admin-home.html'); s=read(p)
old_boot="""async function boot(){try{const r=await fetch('./data/inventory-analytics.json?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('analytics');S.analytics=await r.json()}catch(e){S.errors.push('analytics')}const res=await Promise.all([get('employee_accounts',500),get('customers',800),get('site_sessions',600,'lastActive'),get('customer_sessions',600,'lastActive'),get('orders',700,'timestamp'),get('customer_orders',700,'createdAt'),get('v44_live_carts',700),get('search_logs',700,'time'),get('v44_activity_logs',300,'createdAt'),get('employee_notifications',300,'createdAt')]);[S.employees,S.customers,S.es,S.cs,S.orders,S.customerOrders,S.carts,S.search,S.activity,S.messages]=res;render()}boot();
"""
new_boot="""function stableRender(){const y=window.scrollY||0;render();requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'auto'}));window.__V54_ADMIN_ENHANCEMENTS?.refresh?.()}
async function boot(){
 const analyticsP=(async()=>{try{const r=await fetch('./data/inventory-analytics.json?v=56.53',{cache:'no-cache'});if(!r.ok)throw new Error('analytics');S.analytics=await r.json()}catch(e){S.errors.push('analytics')}})();
 const coreP=Promise.all([get('employee_accounts',500),get('customers',800),get('site_sessions',600,'lastActive'),get('customer_sessions',600,'lastActive'),get('orders',700,'timestamp'),get('customer_orders',700,'createdAt')]);
 const secondaryP=Promise.all([get('v44_live_carts',500),get('search_logs',400,'time'),get('v44_activity_logs',240,'createdAt'),get('employee_notifications',240,'createdAt')]);
 await analyticsP;stableRender();
 const core=await coreP;[S.employees,S.customers,S.es,S.cs,S.orders,S.customerOrders]=core;stableRender();
 const secondary=await secondaryP;[S.carts,S.search,S.activity,S.messages]=secondary;stableRender();
}boot();
"""
s=replace_once(s,old_boot,new_boot,'admin home progressive boot')
write(p,s)

# ---------------------------------------------------------------------------
# Cache-bust updated admin interaction scripts everywhere they are referenced.
# ---------------------------------------------------------------------------
for p in Path('.').glob('*.html'):
    t=read(p)
    t=t.replace('v46-admin-nav.js?v=56.39','v46-admin-nav.js?v=56.53')
    t=t.replace('v45-admin-ux.js?v=45.0','v45-admin-ux.js?v=56.53')
    write(p,t)

# Update historical regression expectations to the current shell revision.
for name in ['tests/v56-38-admin-ia.mjs','tests/v56-39-identities.mjs']:
    p=Path(name); t=read(p); t=t.replace('v46-admin-nav.js?v=56.39','v46-admin-nav.js?v=56.53'); t=t.replace("const VERSION='56.39'","const VERSION='56.53'"); t=t.replace("const VERSION='56.38'","const VERSION='56.53'"); write(p,t)
# V56.38 test specifically checks enhancement cache-bust/version.
p=Path('tests/v56-38-admin-ia.mjs'); t=read(p); t=t.replace("enh.includes(\"const VERSION='56.38'\")","enh.includes(\"const VERSION='56.53'\")"); write(p,t)

# ---------------------------------------------------------------------------
# Regression gate for the problems fixed in this change.
# ---------------------------------------------------------------------------
write('tests/v56-53-admin-interaction-performance.mjs', r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const ux=read('v45-admin-ux.js'),nav=read('v46-admin-nav.js'),enh=read('v54-admin-enhancements.js');
const dashboard=read('admin-dashboard.html'),movement=read('inventory-analytics.html'),control=read('control-center.html'),home=read('admin-home.html'),css=read('v56-53-admin-interaction.css');

assert.ok(!ux.includes("addEventListener('wheel'")&&!ux.includes('new MutationObserver'),'legacy wheel hijacking and global rescans must stay retired');
assert.ok(ux.includes('nativeScroll:true'),'native scroll contract missing');
assert.ok(!nav.includes('mo.observe(document.documentElement')&&!nav.includes('new MutationObserver'),'admin shell must not observe the whole document forever');
assert.ok(nav.includes('v56-53-admin-interaction.css?v=56.53'),'shared interaction CSS must be loaded');
assert.ok(!enh.includes("inline:'center',behavior:'smooth'"),'active module must never be forcibly smooth-centered');
assert.ok(enh.includes("if(!clipped)return")&&enh.includes("inline:'nearest',behavior:'auto'"),'active module should move only when clipped');
assert.ok(!enh.includes('mo.observe(document.documentElement'),'enhancements must not observe the entire document');
assert.ok(dashboard.includes('let pendingData={},dataFrame=0')&&dashboard.includes('requestAnimationFrame(flushData)'),'dashboard Firestore snapshots must be render-batched');
assert.ok(movement.includes('const PAGE_SIZE=300')&&movement.includes('id="moreRows"'),'movement table must cap DOM rows and support incremental reveal');
assert.ok(movement.includes('captureView()')&&movement.includes('restoreView(view)'),'movement filters must preserve scroll/focus state');
assert.ok(movement.includes("inventory-analytics.json?v=56.53',{cache:'no-cache'}"),'movement analytics must use revalidation instead of a unique uncached URL each visit');
assert.ok(control.includes('function scheduleRender()')&&control.includes('scheduleRender()}'),'control-center realtime snapshots must coalesce renders');
assert.ok(control.includes('restoreControlView(view)')&&control.includes('searchTimer=setTimeout(render,140)'),'control center must preserve view state and debounce search');
assert.ok(home.includes('function stableRender()')&&home.includes('const coreP=Promise.all')&&home.includes('const secondaryP=Promise.all'),'admin home must progressively paint concurrent data groups');
assert.ok(css.includes('touch-action:pan-x pan-y')&&css.includes('scroll-behavior:auto!important'),'native two-axis interaction CSS missing');
assert.ok(dashboard.includes('./v45-admin-ux.js?v=56.53')&&dashboard.includes('./v46-admin-nav.js?v=56.53'),'dashboard cache bust must deliver the fix');
console.log('V56.53 admin interaction + performance regression: PASS');
''')

print('V56.53 admin interaction/performance patch applied')
