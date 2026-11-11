'use strict';
// V119 regression: Samsung/Android employee PIN must not fail after 6 seconds.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const index=fs.readFileSync('index.html','utf8');
const from=src.indexOf('const LOGIN_PIN_SERVER_READ_TIMEOUT_MS =');
const to=src.indexOf('const StandardLoginScreen =',from);
assert(from>0&&to>from,'PIN verification helpers must exist');
assert.match(src,/experimentalForceLongPolling: true/,'Android compatible Firestore transport is required');
assert.match(index,/loginfix=119/,'employee source must be revisioned after the fix');
assert.match(src,/Android\/i\.test\(navigator\.userAgent/,'transport change must apply only to Android');
assert.match(src,/await readEmployeeAccountForLogin\(db, employeeAccount\.id\)/);
assert.doesNotMatch(src,/doc\(employeeAccount\.id\)\.get\(\), 6000\)/,'6-second PIN timeout must be removed');
assert.match(src,/await loginLookupTimeout\(ref\.set\(/,'photo challenge must be acknowledged by server');
assert.match(src,/LOGIN_PHOTO_CHALLENGE_TIMEOUT_MS/);
const events=[];
const sandbox={
 Promise,setTimeout,clearTimeout,Date,
 EMPLOYEE_ACCOUNT_COLLECTION:'employee_accounts',navigator:{onLine:true},
 sessionStorage:{setItem:(k,v)=>events.push({k,v})}
};
vm.createContext(sandbox);
vm.runInContext(src.slice(src.indexOf('const LOGIN_LOOKUP_TIMEOUT_MS ='),src.indexOf('const StandardLoginScreen ='))+
'\nthis.verifyAccount=readEmployeeAccountForLogin;this.logError=noteEmployeeLoginFailure;',sandbox);
assert.match(src,/LOGIN_PIN_SERVER_READ_TIMEOUT_MS = 15000/);
let calls=0;
const value={exists:true,id:'employee',data:()=>({status:'active'})};
const db={collection:()=>({doc:()=>({get:async({source})=>{assert.equal(source,'server');calls++;if(calls===1)throw Object.assign(new Error('UNAVAILABLE'),{code:'unavailable'});return value}})})};
(async()=>{
 const account=await sandbox.verifyAccount(db,'employee');
 assert.equal(account,value,'retry must require a real server response');
 assert.equal(calls,2);
 calls=0;
 const denied={collection:()=>({doc:()=>({get:async()=>{calls++;throw Object.assign(new Error('PERMISSION_DENIED'),{code:'permission-denied'})}})})};
 await assert.rejects(()=>sandbox.verifyAccount(denied,'employee'),/PERMISSION_DENIED/);
 assert.equal(calls,1,'permission errors must never be retried');
 calls=0;
 const quota={collection:()=>({doc:()=>({get:async()=>{calls++;throw Object.assign(new Error('RESOURCE_EXHAUSTED'),{code:'resource-exhausted'})}})})};
 await assert.rejects(()=>sandbox.verifyAccount(quota,'employee'),/RESOURCE_EXHAUSTED/);
 assert.equal(calls,1,'quota errors must never be retried');
 sandbox.logError('pin_server_verification',{code:'unavailable'});
 assert.equal(events.length,1);
 assert.ok(!events[0].v.includes('password')&&!events[0].v.includes('employeeId'),'diagnostics must omit secrets');
 console.log('V119_ANDROID_EMPLOYEE_LOGIN_PASS: Android transport, server-only PIN, transient retry, fail-closed security, acknowledged photo challenge');
})().catch(error=>{console.error(error);process.exitCode=1});
