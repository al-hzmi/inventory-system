'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=path=>fs.readFileSync(path,'utf8');
const app=read('runtime/index-v37-source.txt');
const admin=read('admin-dashboard.html');
const tracker=read('v44-observability.js');
const crossPage=read('employee-attendance.js');
const sw=read('sw.js');
assert.match(app,/proof\?\.loginAttemptId&&proof\?\.loginLogId/,'remembered sessions require complete server proof');
assert.match(app,/const sessionId = activeSessionProof/,'session id follows login changes without reload');
assert.doesNotMatch(app,/const \[sessionId\] = useState/,'session must not remain frozen after sign-in');
assert.match(app,/lastLoginAt: firebase\.firestore\.FieldValue\.serverTimestamp\(\)/,'employee summary preserved');
assert(app.indexOf('db.collection(EMPLOYEE_ACCOUNT_COLLECTION).doc(employeeAccount.id).set({')<app.indexOf("const userRef = db.collection('users').doc(toSafeDocId(canonicalName));"),'employee account summary independent of legacy users writes');
assert.match(tracker,/p\.photoId&&p\.loginAttemptId&&p\.loginLogId/,'telemetry excludes legacy unverified sessions');
assert.match(admin,/\.doc\(id\)\.get\(\{source:'server'\}\)/,'active session fetches exact server login proof');
assert.match(admin,/recoveredVerifiedLogins\.filter/,'exact proof can supplement capped feed');
assert.match(admin,/key==='employeeLogins'\|\|key==='employeeSessions'/,'never fallback to an unordered partial attendance sample');
assert.match(admin,/row\.userRecords\.map\(u=>u\.lastLogin\)/,'historic staff with old log visible from saved profile');
assert.match(sw,/batco-navigation-shell-v102-attendance/,'cached dashboard refreshed');
for(const p of ['stocktake.html','branch-presence.html'])assert(read(p).includes('employee-attendance.js?v=102.0'),p+' receives silent attendance');
assert(!crossPage.includes('appendChild')&&!crossPage.includes('innerHTML'),'attendance adds no visible UI');
new vm.Script(crossPage,{filename:'employee-attendance.js'});
async function exercise(authenticated,visible='visible'){
 const id='staff-123',logId='verified-log-123';
 const photo=authenticated===true?{role:'employee',employeeId:id,photoId:'photo-123',loginAttemptId:'attempt-123',loginLogId:logId}:
             authenticated==='legacy'?{role:'employee',employeeId:id,photoId:'photo-123'}:null;
 const store={inventory_employee_id_v2:id,inventory_user_name_v2:'موظف اختبار',inventory_employee_auth_version_v2:'2',inventory_login_photo_proof_v2:JSON.stringify(photo)};
 const writes=[],listeners={},timers=[];
 const firestore=()=>({collection:name=>({doc:docId=>({set:(payload,options)=>{writes.push({name,docId,payload,options});return Promise.resolve()}})})});
 firestore.FieldValue={serverTimestamp:()=>({server:true})};
 const firebase={apps:[{}],firestore};
 vm.runInNewContext(crossPage,{
   window:{firebase,addEventListener:(name,cb)=>{listeners[name]=cb}},
   firebase,localStorage:{getItem:key=>store[key]||null},
   navigator:{userAgent:'test-device',onLine:true},
   document:{visibilityState:visible,addEventListener:(name,cb)=>{listeners[name]=cb}},
   location:{pathname:'/stocktake.html'},
   setInterval:(fn,ms)=>{timers.push({fn,ms});return timers.length},
   clearInterval:()=>{},console
 });
 await Promise.resolve();
 return {writes,listeners,timers};
}
(async()=>{
 const ok=await exercise(true);
 assert.equal(ok.writes.length,1,'valid employee heartbeat immediately recorded');
 assert.equal(ok.writes[0].name,'site_sessions');
 assert.equal(ok.writes[0].docId,'employee_login_verified-log-123');
 assert.equal(ok.writes[0].payload.loginAttemptId,'attempt-123');
 assert.equal(ok.writes[0].payload.securityPhotoId,'photo-123');
 assert.equal(ok.writes[0].payload.state,'online');
 assert.deepEqual(JSON.parse(JSON.stringify(ok.writes[0].options)),{merge:true});
 assert.equal((await exercise('legacy')).writes.length,0,'legacy local photo is not a server-verified session');
 assert.equal((await exercise(false)).writes.length,0,'unauthenticated visitor is never tracked as employee');
 assert.equal((await exercise(true,'hidden')).writes.length,0,'background tab must not masquerade as online');
 console.log('V102 silent verified employee attendance regression PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
