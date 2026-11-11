'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const boot=fs.readFileSync('index.html','utf8');
assert.match(boot,/loginfix=120/,'new runtime must bypass older cached login code');
const start=source.indexOf('const LOGIN_LOOKUP_TIMEOUT_MS =');
const end=source.indexOf('const StandardLoginScreen =',start);
assert(start>0&&end>start,'login helpers not found');
const helper=source.slice(start,end)
  .replace('const LOGIN_ACCOUNT_VERIFY_TIMEOUT_MS = 16000;','const LOGIN_ACCOUNT_VERIFY_TIMEOUT_MS = 20;');
const ctx={setTimeout,clearTimeout,Promise,Error,Object,
  navigator:{onLine:true},EMPLOYEE_ACCOUNT_COLLECTION:'employee_accounts'};
vm.createContext(ctx);
vm.runInContext(helper+'\nthis.verifyAccount=freshEmployeeAccountDocument;this.retryable=loginRetryableTransportError;',ctx);
let reads=0;
const accountRef={
 get:async options=>{
   reads++;
   assert.equal(options.source,'server','cached accounts cannot authorize login');
   return {exists:true,id:'employee_1',data:()=>({status:'active',passwordHash:'server'})};
 }
};
const db={collection:name=>{assert.equal(name,'employee_accounts');return {doc:id=>{assert.equal(id,'employee_1');return accountRef}}}};
(async()=>{
 let doc=await ctx.verifyAccount(db,'employee_1');
 assert.equal(doc.data().passwordHash,'server');
 assert.equal(reads,1);
 reads=0;
 accountRef.get=async options=>{
   reads++;
   assert.equal(options.source,'server');
   if(reads===1)throw Object.assign(new Error('temporary network'),{code:'unavailable'});
   return {exists:true,id:'employee_1',data:()=>({status:'active'})};
 };
 doc=await ctx.verifyAccount(db,'employee_1');
 assert.equal(doc.exists,true);
 assert.equal(reads,2,'only one retry on network failure');
 reads=0;
 accountRef.get=async()=>{reads++;throw Object.assign(new Error('denied'),{code:'permission-denied'})};
 await assert.rejects(ctx.verifyAccount(db,'employee_1'),/denied/);
 assert.equal(reads,1,'permission errors are never retried');
 reads=0;
 accountRef.get=async()=>{reads++;throw Object.assign(new Error('quota'),{code:'resource-exhausted'})};
 await assert.rejects(ctx.verifyAccount(db,'employee_1'),/quota/);
 assert.equal(reads,1,'quota errors are never retried');
 reads=0;
 accountRef.get=()=>{reads++;return reads===1?new Promise(()=>{}):Promise.resolve({exists:true,id:'employee_1'})};
 doc=await ctx.verifyAccount(db,'employee_1');
 assert.equal(doc.exists,true);assert.equal(reads,2,'bounded hung-read recovery');
 ctx.navigator.onLine=false;
 reads=0;
 accountRef.get=async()=>{reads++;throw Object.assign(new Error('offline'),{code:'unavailable'})};
 await assert.rejects(ctx.verifyAccount(db,'employee_1'),/offline/);
 assert.equal(reads,1,'offline clients must not loop');
 // The photo challenge is required; retries always use one id and are never treated as completed before ack.
 const cstart=source.indexOf('    const createPhotoChallenge = async (account, alias, extra={}) => {');
 const cend=source.indexOf('    const resolveNameFlow =',cstart);
 assert(cstart>0&&cend>cstart);
 const challengeSnippet=source.slice(cstart,cend);
 const attemptIds=[],written=[],session={current:null},attempt={current:9};
 let failOnce=true;
 const challengeDb={collection:collection=>{
   assert.equal(collection,'employee_login_attempts');
   return {doc:id=>{
     const chosen=id||'challenge_'+(attemptIds.length+1);
     if(!id)attemptIds.push(chosen);
     return {id:chosen,set:async payload=>{
       written.push({id:chosen,payload});
       if(failOnce){failOnce=false;throw Object.assign(new Error('unavailable'),{code:'unavailable'})}
     }};
   }};
 }};
 const challengeCtx={getDb:async()=>challengeDb,photoChallengeRef:session,verifyAttemptRef:attempt,
   LOGIN_CHALLENGE_WRITE_TIMEOUT_MS:20,
   loginLookupTimeout:promise=>promise,loginRetryableTransportError:ctx.retryable,
   navigator:{onLine:true,userAgent:'test-phone'},firebase:{firestore:{FieldValue:{serverTimestamp:()=>({now:true})}}},
   setLoginAttemptId:id=>challengeCtx.ack=id,Promise,Object};
 vm.createContext(challengeCtx);
 vm.runInContext(challengeSnippet+'\nthis.challenge=createPhotoChallenge;',challengeCtx);
 await challengeCtx.challenge({id:'employee_1',canonicalName:'Employee'},'Employee');
 assert.equal(challengeCtx.ack,'challenge_1');
 assert.equal(attemptIds.length,1,'one challenge ID after automatic retry');
 assert.equal(written.length,2,'transient write retries idempotently');
 assert.equal(written[0].id,written[1].id);
 attempt.current=10;
 await challengeCtx.challenge({id:'employee_1',canonicalName:'Employee'},'Employee');
 assert.equal(attemptIds.length,2,'new independent login gets a new challenge');
 assert.equal(challengeCtx.ack,'challenge_2');
 console.log('V120_EMPLOYEE_LOGIN_RESILIENCE_PASS: fresh server, retry, offline/quota/permission guards, stable challenge, cache bust');
})().catch(e=>{console.error(e);process.exitCode=1});