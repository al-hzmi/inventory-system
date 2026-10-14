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
assert.equal(api.version,'61.1');
const gate=(v,id)=>api.allowlisted(v,id);
assert.equal(gate(undefined,'1001'),false,'No config is disabled');
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
assert.ok(pilot.includes('العودة للواجهة الكلاسيكية')&&pilot.includes('إظهار مساحة العمل التجريبية'),'Return and reenter controls must both exist');
assert.ok(pilotCss.includes('@media(max-width:760px)')&&pilotCss.includes('@media(max-width:390px)'),'Mobile-responsive panels missing');
assert.ok(!pilot.includes('firebase.firestore().collection(\'orders\')'),'Pilot must never write orders');
assert.ok(html.includes('v61-employee-pilot.js?v=61.1')&&html.includes('v61-employee-pilot.css?v=61.1'),'User-facing loader not configured');
assert.ok(admin.includes("doc(DOC).set(")&&admin.includes("enabled:next.enabled,allowedEmployeeIds:next.ids"),'Admin must control one targeted allowlist document');
assert.ok(admin.includes("await db.collection('employee_accounts').limit(800).get()"),'Selector must originate from real employee accounts');
assert.ok(admin.includes("new MutationObserver(refreshShortcut)")&&admin.includes("observer.observe(app,{childList:true})"),'Realtime re-render must not remove launch button');
assert.ok(admin.includes("if(typeof isAdmin!=='function'||!isAdmin()"),'Admin controls must respect existing admin gate');
assert.ok(admin.includes('if(enabled&&!selected.size)'),'Do not enable pilot with an empty allowlist');
assert.ok(adminCss.includes('@media(max-width:550px)'),'Admin needs mobile mode');
assert.ok(center.includes('v61-employee-pilot-admin.js?v=61.1')&&center.includes('v61-employee-pilot-admin.css?v=61.1'),'Admin scripts not mounted');
assert.ok(home.includes('./control-center.html?pilot=1'),'Direct access from admin home missing');

const fakeDoc={events:[],readyState:'loading',addEventListener(name,callback){this.events.push(name)}};
const noAdmin={document:fakeDoc,window:{location:{search:''}},location:{search:''},URLSearchParams,console,isAdmin:()=>false,db:{}};
vm.runInNewContext(admin,noAdmin,{filename:'v61-employee-pilot-admin.js'});
assert.equal(fakeDoc.events.length,0,'Unauthorized page must not install rollout UI');

console.log('V61_PILOT_PASS: default-off, exact allowlist, revocation, IDs, live TSV parser, precise changes, responsive panels, existing search, admin gating and rollback');
