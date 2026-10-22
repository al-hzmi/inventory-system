'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const admin=fs.readFileSync('admin-dashboard.html','utf8');
const tracker=fs.readFileSync('v44-observability.js','utf8');
const employee=fs.readFileSync('runtime/index-v37-source.txt','utf8');
for(const marker of [
  "data-incident-audit=\"v91\"",
  "useState('Mohammed Dalal')",
  "get({source:'server'})",
  "['orders',['repName','employeeName','customerName']]",
  "['login_logs',['name','enteredAlias']]",
  "['site_sessions',['name']]",
  "['v44_presence',['actorName']]",
  "['v44_activity_logs',['actorName']]",
  "['customer_orders',['customer.name']]",
  "inspection.errors.length>0",
  "case'incident':return",
  "'مزامنة ناقصة'",
]) assert(admin.includes(marker),'missing live incident audit guarantee: '+marker);
const realtime=admin.match(/const REALTIME_KEYS=new Set\(\[([^\]]+)\]\)/)?.[1]||'';
for(const key of ['employeeLogins','employeeLoginAttempts','employeeOrders','customerLogins','customerActivity','search'])assert(realtime.includes("'"+key+"'"),'critical event must be real-time: '+key);
assert(admin.includes("const records=[...recordMap.values()]"),'must deduplicate overlapping Firestore queries');
assert(admin.includes("metadata?.fromCache"),'must reject cached snapshots in incident audit');
for(const marker of ["presenceFailures>=2","presenceWarning(true)","cartSyncInFlight","lastCartHash=sig;await log","finally{cartSyncInFlight=false}"])assert(tracker.includes(marker),'telemetry recovery missing: '+marker);
for(const marker of ["copyLocalReceipt","لا يثبت وصولها إلى الخادم","محفوظة على هذا الجهاز ولم يُعثر على تطابق في الخادم","await loginBatch.commit();","await Promise.race([","orderRef.set(payload)"])assert(employee.includes(marker),'local reconciliation or invoice guarantee missing: '+marker);
const engine=fs.readFileSync('employee-session-v103.js','utf8');
assert(engine.includes("db.collection('login_logs').doc(p.loginLogId).get({source:'server'})"),'employee presence must be server verified');
assert(engine.includes("db.collection('site_sessions').doc('employee_login_'+p.loginLogId).set(payload,{merge:true})"),'employee presence writes canonical session');
assert(!employee.includes("getDb().then(db => {\n            db.collection('orders').add"),'legacy fire-and-forget invoice restored');
new vm.Script(tracker,{filename:'v44-observability.js'});
console.log('V91 Mohammed Dalal live audit / telemetry / local receipt: PASS');
