'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const engine=read('employee-session-v103.js'),app=read('runtime/index-v37-source.txt'),admin=read('admin-dashboard.html'),obs=read('v44-observability.js');
new vm.Script(engine);
assert.match(app,/loginBatch\.set\(verifiedLoginRef,/,'login log is committed with attendance');
assert.match(app,/loginBatch\.set\(db\.collection\('site_sessions'\)\.doc\('employee_login_'\+verifiedLoginRef\.id\)/,'initial attendance shares atomic batch');
assert.match(app,/await loginBatch\.commit\(\)/,'no locally acknowledged or half-saved login');
assert(app.indexOf('await loginBatch.commit();')<app.indexOf('onLogin(canonicalName, false);'),'employee enters only after server commit');
assert.match(app,/window\.dispatchEvent\(new Event\('batco:employee-login'\)\)/,'new login wakes the engine without a reload');
assert.match(obs,/if\(me\.type==='employee'\)return;/,'old telemetry does not overwrite employee presence');
assert.match(admin,/const \[liveNow,setLiveNow\]=useState\(Date\.now\(\)\)/,'presence expires when the browser disappears');
assert.match(admin,/canonicalLoginIds\.has\(String\(p\.loginLogId\|\|''\)\)/,'legacy presence cannot override canonical session');
assert(!engine.includes('appendChild')&&!engine.includes('innerHTML'),'no visual elements introduced');
assert(!engine.includes("state:'left'")&&!engine.includes('beforeunload'),'no forced logout or unreliable unload event');
for(const page of ['index.html','stocktake.html','branch-presence.html'])assert(read(page).includes('employee-session-v103.js?v=103.0'),page+' uses the same engine');

const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function harness({authenticated=true,visible='visible',online=true,loginExists=true,accountStatus='active',loginStatus='verified',deny=false}={}){
 const listeners={},timers=[],writes=[],reads=[];
 const stored={
   inventory_employee_id_v2:'EMP1',
   inventory_user_name_v2:'اسم الموظف',
   inventory_employee_auth_version_v2:'2',
   inventory_login_photo_proof_v2:JSON.stringify(authenticated?
     {role:'employee',employeeId:'EMP1',photoId:'PHOTO1',loginAttemptId:'ATTEMPT1',loginLogId:'LOG1'}:
     {role:'employee',employeeId:'EMP1',photoId:'PHOTO1'})
 };
 const db={collection:name=>({doc:id=>({
   get:async options=>{
     reads.push({name,id,options});
     if(name==='login_logs')return {exists:loginExists,data:()=>({faceVerified:true,isAdmin:false,employeeId:'EMP1',securityPhotoId:'PHOTO1',loginAttemptId:'ATTEMPT1',loginStatus,time:{seconds:101}})};
     if(name==='employee_accounts')return {exists:true,data:()=>({status:accountStatus})};
     throw Error('unexpected get '+name);
   },
   set:async(payload,options)=>{if(deny)throw Error('backend denied');writes.push({name,id,payload,options})}
 })})};
 const firestore=()=>db;
 firestore.FieldValue={serverTimestamp:()=>({server:true})};
 const fakeFirebase={apps:[{}],firestore};
 const fakeDocument={visibilityState:visible,addEventListener:(name,fn)=>{(listeners['d:'+name]??=[]).push(fn)}};
 const fakeNavigator={onLine:online,userAgent:'test-iphone'};
 const fakeWindow={firebase:fakeFirebase,addEventListener:(name,fn)=>{(listeners['w:'+name]??=[]).push(fn)}};
 vm.runInNewContext(engine,{
  window:fakeWindow,document:fakeDocument,navigator:fakeNavigator,
  localStorage:{getItem:k=>stored[k]||null},location:{pathname:'/stocktake.html'},
  firebase:fakeFirebase,setInterval:(fn,ms)=>{timers.push({fn,ms});return timers.length},
  clearInterval:()=>{},console,Date,Math,JSON,Error,String,Promise
 });
 return {stored,writes,reads,timers,document:fakeDocument,navigator:fakeNavigator,window:fakeWindow,
   fire:(name,side='w')=>(listeners[side+':'+name]||[]).forEach(fn=>fn({key:'inventory_login_photo_proof_v2'}))};
}
(async()=>{
 const ok=harness();
 await pause();
 assert.equal(ok.writes.length,1,'valid verified employee immediately becomes visible to server');
 assert.equal(ok.writes[0].name,'site_sessions');
 assert.equal(ok.writes[0].id,'employee_login_LOG1');
 assert.equal(ok.writes[0].payload.sessionProtocol,103);
 assert.equal(ok.writes[0].payload.identitySource,'verified_login_server_v103');
 assert.equal(ok.writes[0].payload.state,'online');
 assert.equal(ok.writes[0].payload.activePage,'/stocktake.html');
 assert.deepEqual(JSON.parse(JSON.stringify(ok.writes[0].options)),{merge:true});
 assert.equal(ok.reads[0].name,'login_logs');
 assert.equal(ok.reads[0].options.source,'server','must validate login against server, never cache');
 assert.equal(ok.reads[1].name,'employee_accounts');
 ok.fire('pageshow');await pause();
 assert.equal(ok.writes.length,2,'foreground refresh does not require sign-out or password');
 ok.document.visibilityState='hidden';ok.fire('visibilitychange','d');await pause();
 assert.equal(ok.writes.length,2,'hidden tab does not extend online state');
 ok.document.visibilityState='visible';ok.fire('visibilitychange','d');await pause();
 assert.equal(ok.writes.length,3,'returning from background renews same login session');
 const a=harness({authenticated:false});await pause();
 assert.equal(a.writes.length,0,'legacy photo proof never becomes online');
 const b=harness({loginExists:false});await pause();
 assert.equal(b.writes.length,0,'missing server log cannot become online');
 const c=harness({loginStatus:'rejected'});await pause();
 assert.equal(c.writes.length,0,'rejected login cannot become online');
 const d=harness({accountStatus:'suspended'});await pause();
 assert.equal(d.writes.length,0,'suspended account cannot update presence');
 const e=harness({online:false});await pause();
 assert.equal(e.writes.length,0,'offline cache cannot claim an online employee');
 const f=harness({visible:'hidden'});await pause();
 assert.equal(f.writes.length,0,'background startup is not activity');
 const g=harness({deny:true});await pause();
 assert.equal(g.writes.length,0,'backend rejection cannot fake online success');
 console.log('V103 server-verified, logout-free single-source employee sessions PASS');
})().catch(e=>{console.error(e);process.exitCode=1});