import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const read=file=>fs.readFileSync(file,'utf8');
const pilot=read('v61-employee-pilot.js');
const pilotCss=read('v61-employee-pilot.css');
const admin=read('v61-employee-pilot-admin.js');
const adminCss=read('v61-employee-pilot-admin.css');
const html=read('index.html');
const center=read('control-center.html');
const home=read('v57-admin-workspace.js');
const runtime=read('runtime/index-v37-source.txt');
for(const [name,src] of [['employee pilot',pilot],['admin rollout',admin]])new vm.Script(src,{filename:name+'.js'});

const listeners={};
const ctx={
 window:{},document:{readyState:'loading',addEventListener:(name,fn)=>listeners[name]=fn},
 localStorage:{getItem:()=>null,setItem:()=>{}},
 sessionStorage:{getItem:()=>null,setItem:()=>{}},
 Intl,Number,Date,Set,JSON,Promise,console,clearTimeout,setTimeout
};
ctx.window.addEventListener=(event,callback)=>{listeners['window:'+event]=callback};
vm.runInNewContext(pilot,ctx,{filename:'v61-employee-pilot.js'});
const api=ctx.window.BatcoPilot;
assert.equal(api.version,'67.0');
const gate=(v,id)=>api.allowlisted(v,id);
assert.equal(gate(undefined,'1001'),false,'No config is disabled');
assert.equal(gate({mode:'open',employeeHomePilot:{enabled:true,allowedEmployeeIds:['1001']}},'1001'),true,'Existing employee-site control includes scoped pilot allowlist');
assert.equal(gate({mode:'open',employeeHomePilot:{enabled:false,allowedEmployeeIds:['1001']}},'1001'),false,'Shared site settings honor the pilot kill switch');
assert.equal(gate({enabled:false,allowedEmployeeIds:['1001']},'1001'),false,'Master kill switch must win');
assert.equal(gate({enabled:true,allowedEmployeeIds:[]},'1001'),false,'Empty allowlist must exclude everyone');
assert.equal(gate({enabled:true,allowedEmployeeIds:['1002']},'1001'),false,'Unselected employee must be excluded');
assert.equal(gate({enabled:true,allowedEmployeeIds:[1001]},'1001'),true,'Numeric account ID must normalize');
assert.equal(gate({enabled:true,allowedEmployeeIds:['1001']},'10010'),false,'IDs must match exactly');
assert.equal(gate({enabled:true,allowedEmployeeIds:['admin_mohanad']},'admin_mohanad'),true,'Allow root self-test by explicit opt-in');

const actual=read('data/jeddah.tsv'),decoded=api.decode(actual);
assert.ok(Object.keys(decoded).length>800,'Real Jeddah data should parse all SKUs');
assert.equal(decoded.ARM_10015?.sku,'ARM_10015');
assert.ok(Number.isFinite(decoded.ARM_10015?.qty));
assert.equal(decoded.ARM_10015?.unit,'كرتون');
const initial={ARM_10015:{qty:50,name:'برطمان'},BA_1006:{qty:0,name:'حاجز باب'}};
const current={ARM_10015:{qty:46.875,name:'برطمان'},BA_1006:{qty:2,name:'حاجز باب'},BA_9999:{qty:3,name:'جديد'}};
const d=Array.from(api.delta(initial,current,'jeddah'));
assert.equal(d.length,3);
assert.ok(d.some(x=>x.sku==='ARM_10015'&&x.kind==='down'&&x.after===46.875));
assert.ok(d.some(x=>x.sku==='BA_1006'&&x.kind==='back'));
assert.ok(d.some(x=>x.sku==='BA_9999'&&x.kind==='new'));
assert.equal(api.delta(null,current,'jeddah'),null,'First visit establishes baseline');
assert.equal(api.delta(current,current,'jeddah').length,0,'Same stock should not cause fake updates');

assert.ok(pilot.includes("input.closest('.sticky')"),'Pilot must appear below sticky search, never inside it');
assert.ok(pilot.includes("localStorage.getItem('inventory_employee_id_v2')"),'Opt in must use logged-in employee ID');
assert.ok(pilot.includes("String(p.employeeId||'')===id"),'Employee face proof must match the selected ID');
assert.ok(pilot.includes("sessionStorage.setItem(cache,JSON.stringify(diff))"),'Do not lose changes on simple refresh');
assert.ok(pilot.includes('if(!active||currentId!==id)return'),'Discard late results after revocation');
assert.ok(pilot.includes("batco61:product-open"),'Explicit search result clicks need to populate recent items');
assert.ok(runtime.includes("window.dispatchEvent(new CustomEvent('batco61:product-open'"),'Existing search should emit only a read-only product-open signal');
assert.ok(pilot.includes("document.getElementById('searchInput')"),'Do not replace the existing search engine');
assert.ok(pilot.includes('data-tab="favorite"')&&pilot.includes('data-tab="changes"'),'Missing pilot panels');
assert.ok(!pilot.includes('class="b61-classic"')&&pilot.includes('↶ اختصارات البحث'),'No destructive X in active employee workspace; preserve legacy reentry');
assert.ok(pilotCss.includes('@media(max-width:760px)')&&pilotCss.includes('@media(max-width:360px)'),'Mobile-responsive panels missing');
assert.ok(!pilot.includes('firebase.firestore().collection(\'orders\')'),'Pilot must never write orders');
assert.ok(html.includes('v61-employee-pilot.js?v=67.0')&&html.includes('v61-employee-pilot.css?v=67.0'),'User-facing loader not configured');
assert.ok(admin.includes("const ref=db.collection(COL).doc(DOC)")&&admin.includes("[CONFIG_FIELD]:{")&&admin.includes("enabled:next.enabled,allowedEmployeeIds:next.ids"),'Admin must control one targeted allowlist document');
assert.ok(admin.includes("db.collection('employee_accounts').limit(800).get()"),'Selector must originate from real employee accounts');
assert.ok(admin.includes("new MutationObserver(refreshShortcut)")&&admin.includes("observer.observe(app,{childList:true})"),'Realtime re-render must not remove launch button');
assert.ok(admin.includes('pilotAdminAuthorized()'),'Admin controls must respect existing admin gate');
assert.ok(admin.includes('if(enabled&&(!peopleReady||!selected.size))'),'Do not enable pilot with an empty allowlist');
assert.ok(adminCss.includes('@media(max-width:550px)'),'Admin needs mobile mode');
assert.ok(center.includes('v61-employee-pilot-admin.js?v=63.0')&&center.includes('v61-employee-pilot-admin.css?v=63.0'),'Admin scripts not mounted');
assert.ok(home.includes('./admin-home.html?pilot=1'),'Direct access from admin home missing');
assert.ok(read('admin-home.html').includes('v62-pilot-entry'),'Persistent pilot launch must remain on executive admin homepage even during async reload');
assert.ok(read('admin-home.html').includes('pilotPreview=1'),'Manager must be able to preview without staff rollout');
assert.ok(pilot.includes("DOC='employee_site_access'"),'Pilot reads existing Firestore document instead of unreadable new config');
assert.ok(admin.includes("DOC='employee_site_access'"),'Pilot admin writes to same existing employee-site document');
assert.ok(pilot.includes('if(isAdminPreview())'),'Manager self-preview must bypass employee allowlist');
assert.ok(pilot.includes("if(!active&&safeRead(key(id)+'_classic',{}).hidden)showReturnButton();else paint()"),'Late-mounted search must restore classic-mode pilot link');
assert.ok(pilot.includes('b61-preview-status'),'Manager preview must explain a delayed or unavailable UI');
assert.ok(pilot.includes("panel?.classList.toggle('b61-search-suppressed',searching)")&&pilot.includes('syncSearchVisibility();'),'Any entered search must hide the workspace immediately');
assert.ok(pilotCss.includes('#batco61-pilot.b61-search-suppressed'),'Search results must take priority without changing the original search component');
assert.ok(pilot.includes("document.body?.classList.add('batco-pilot-visual')")&&pilot.includes("document.body?.classList.remove('batco-pilot-visual')"),'Gallery polish must only apply to an active, allowlisted workspace');
assert.ok(pilotCss.includes('body.batco-pilot-visual #gallery-section')&&pilotCss.includes('#batco61-pilot .b65-tool-row'),'Workspace and gallery should share one scoped black-white visual language');
assert.ok(pilotCss.includes('button:not([class*="accent"])')&&pilotCss.includes('button.font-bold'),'Only ordinary category chips and New Arrivals may receive monochrome overrides');
assert.ok(!pilotCss.includes('button.font-medium[aria-pressed]'),'The admin-only missing image button must not be restyled');
assert.ok(pilotCss.includes('#gallery-section+footer')&&pilotCss.includes('#gallery-section>div[class*="max-w-"]'),'Gallery empty state and footer alignment need continuity');
assert.ok(runtime.includes('>بيت الأواني الطيبة</h1>')&&!runtime.includes('نظام الاستعلام والمبيعات الرقمي'),'Header must only show company name, without the redundant subtitle');
assert.ok(pilot.includes('class="b65-tool-row"')&&pilot.includes('class="b65-popover"')&&pilot.includes('aria-expanded="false"'),'Quick tools must integrate into search with accessible on-demand menu');
assert.ok(runtime.includes('className="batco-search-card"')&&runtime.includes('id="batco-pilot-search-slot"'),'Native React search must contain an explicit safe tools slot inside the unified card');
assert.ok(pilot.includes('searchSlot.replaceChildren(panel)'),'Quick tools must mount inside the React-declared search card rather than below sticky navigation');
assert.ok(pilotCss.includes('body.batco-pilot-visual .batco-search-card{')&&pilotCss.includes('body.batco-pilot-visual .batco-search-card #searchInput'),'The premium unified card must style the original React input');
assert.ok(runtime.includes('>شركة بيت الأواني الطيبة</h1>'),'Company name should include the prefix شركة');
assert.ok(!runtime.includes('نظام الاستعلام والمبيعات الرقمي'),'Redundant long subtitle must remain absent');
assert.ok(pilot.includes('if(!expanded)return')&&pilot.includes('if(searching&&expanded)'),'Quick menu must be collapsed by default and auto-close when searching');
assert.ok(pilotCss.includes('.b65-popover[hidden]')&&pilotCss.includes('position:absolute'),'Popover should overlay instead of pushing results down');
assert.ok(!pilot.includes('class="b61-head"')&&!pilot.includes('class="b61-tiles"'),'Old oversized dashboard should be removed');
assert.ok(pilot.includes('آخر الأصناف</b>')&&pilot.includes('المفضلة</b>')&&pilot.includes('التغيّرات</b>'),'Large labeled shortcuts must avoid ambiguous icon-only controls');
assert.ok(pilotCss.includes('min-height:70px')&&pilotCss.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Main actions require appropriately sized touch targets');
assert.ok(pilot.includes('class="b65-dismiss"')&&pilot.includes('>إغلاق</button>'),'Details should close explicitly without an X symbol');
assert.ok(runtime.includes('حيّاك الله، {String(sessionName||\'\').trim().split(/\\s+/)[0]}'),'Greeting uses verified application session rather than guessing employee identity');
assert.ok(!runtime.includes('أصنافك في متناولك'),'Remove unnecessary header filler');
assert.ok(runtime.includes('صور الأصناف</span>')&&runtime.includes('تظهر مع النتائج')&&runtime.includes('اضغط لإظهارها'),'Image option clearly names the feature and its state');
assert.ok(runtime.includes('aria-label="إظهار صور الأصناف في نتائج البحث"')&&runtime.includes('onChange={(e) => setShowImageInSearch(e.target.checked)}'),'Image switch remains accessible and updates native React state');
assert.ok(pilotCss.includes('.batco-image-toggle:focus-within')&&pilotCss.includes('.batco-image-toggle:has(input:checked)'),'Image toggle must provide focus and enabled feedback');

assert.ok(html.includes('rev=67.0'),'Bootloader must invalidate cached header template');

assert.ok(admin.includes('withDeadline(')&&admin.includes('Promise.allSettled('),'Firestore reads must be bounded and independently diagnosed');
assert.ok(admin.includes('data-b61a-open')&&admin.includes('window.BatcoPilotAdmin={open}'),'Admin home must open pilot in-page instead of redirecting to the heavy control center');
assert.ok(read('admin-home.html').includes('data-b61a-open')&&read('admin-home.html').includes('v61-employee-pilot-admin.js?v=63.0'),'Executive dashboard must mount the admin pilot directly');
assert.ok(adminCss.includes('position:fixed!important'),'Manager panel must overlay existing dashboard rather than depend on control-center rendering');


const fakeDoc={events:[],readyState:'loading',addEventListener(name,callback){this.events.push(name)}};
const noAdmin={document:fakeDoc,window:{location:{search:''}},location:{search:''},URLSearchParams,console,isAdmin:()=>false,db:{}};
vm.runInNewContext(admin,noAdmin,{filename:'v61-employee-pilot-admin.js'});
assert.equal(fakeDoc.events.length,0,'Unauthorized page must not install rollout UI');

console.log('V61_PILOT_PASS: default-off, exact allowlist, revocation, IDs, live TSV parser, precise changes, responsive panels, existing search, admin gating and rollback');
