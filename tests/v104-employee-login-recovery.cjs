'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const s=fs.readFileSync('runtime/index-v37-source.txt','utf8');
function slice(a,b){const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,a+' not found');return s.slice(i,j)}
const messages=slice('const LOGIN_LOOKUP_TIMEOUT_MS =','const StandardLoginScreen =');
const ctx={Promise,setTimeout,clearTimeout};vm.createContext(ctx);
vm.runInContext(messages+'\nresult={error:loginErrorMessage,timeout:LOGIN_LOOKUP_TIMEOUT_MS,total:LOGIN_TOTAL_DEADLINE_MS}',ctx);
const x=ctx.result;
assert(x.timeout>=10000&&x.total>=2*x.timeout,'identity deadline insufficient for legacy lookup');
assert(/حد القراءات المجانية/.test(x.error({code:'resource-exhausted'})),'quota must be explicit');
assert(/الصلاحيات/.test(x.error({code:'permission-denied'})),'security failure must not be reported as a slow connection');
assert(/تأخر رد قاعدة البيانات/.test(x.error({code:'LOGIN_LOOKUP_TIMEOUT'})),'lookup timeout not surfaced');
assert(/الشبكة/.test(x.error({code:'unavailable'})),'network failure not surfaced');
const lookup=slice('const employeeAccountLookupsInFlight=new Map();','// العثور على سجل موظف قديم');
assert(lookup.includes('for(const key of variants)'),'single alias should cost one document read');
assert(!lookup.includes('Promise.all(variants.map'),'must not read all alias variants by default');
assert(lookup.includes("if(!/failed-precondition|invalid-argument|unimplemented/.test"),'quota error must not be retried by unrelated legacy fallback');
const calls=[];
const db={collection(name){return {doc(key){return {get:async()=>{calls.push(name+':'+key);if(name==='employee_aliases')return key==='primary'?{exists:true,data:()=>({employeeId:'worker-id'})}:{exists:false};return {exists:true,id:key,data:()=>({canonicalName:'Test Employee',status:'active'})}}}};}}};
const lookupCtx={
  getDb:async()=>db,employeeAliasVariants:()=>['primary','secondary'],
  EMPLOYEE_ALIAS_COLLECTION:'employee_aliases',EMPLOYEE_ACCOUNT_COLLECTION:'employee_accounts',
  employeeAliasDocId:x=>x,cacheEmployeeAccount:x=>x,Promise
};
vm.createContext(lookupCtx);
vm.runInContext(lookup+'\nfindAccount=resolveEmployeeAccount',lookupCtx);
(async()=>{
 const [account,second]=await Promise.all([lookupCtx.findAccount('any'),lookupCtx.findAccount('any')]);
 assert.equal(account.id,'worker-id');assert.equal(second.id,'worker-id');
 assert.deepEqual(calls,['employee_aliases:primary','employee_accounts:worker-id']);
 assert(s.includes("loginLookupTimeout(db.collection(EMPLOYEE_ACCOUNT_COLLECTION).doc(employeeAccount.id).get(), 6000)"),'PIN verification must still retrieve account from Firestore');
 assert(s.includes("await loginLookupTimeout(createPhotoChallenge(freshAccount, enteredAlias), 6000)"),'photo challenge required');
 assert(s.includes("db.collection('login_logs').add({"),'server verified attendance remains');
 console.log('V104 mobile login quota classification, sequential lookup and reauth PASS');
})().catch(e=>{console.error(e);process.exitCode=1});
