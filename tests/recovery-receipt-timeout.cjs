'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('stocktake.html','utf8');
const start=html.indexOf('const receiptChecks=new Map();'),end=html.indexOf('let lastReceiptSweep=',start);
assert.ok(start>=0&&end>start);
let timer,resolveOld,reads=0,removed=0;
const draft={operationId:'op1',value:'2'}, rows=new Map([['campaign:team:item:qty',draft]]);
const context={Promise,Error,Map,Set,Boolean,Number,
 setTimeout:(fn,ms)=>{assert.equal(ms,18000);timer=fn;return 1},clearTimeout:()=>{},
 user:{employeeId:'worker'},ROOT_ID:'admin',state:{items:[]},draftKey:()=>'',paintSyncStatus:()=>{},
 draftStore:{get:k=>rows.get(k),removeIf:(k,expected)=>{if(rows.get(k)!==expected)return false;rows.delete(k);removed++;return true}},
 StocktakeCore:{receiptMatches:(key,d,receipt,actor)=>d.operationId===receipt.operationId&&actor==='worker'},
 db:{collection:()=>({doc:()=>({get:()=>{reads++;if(reads===1)return new Promise(r=>resolveOld=r);return Promise.resolve({exists:true,metadata:{fromCache:false,hasPendingWrites:false},data:()=>({operationId:'op1'})})}})})}};
vm.createContext(context);vm.runInContext(html.slice(start,end),context);
(async()=>{
 const first=context.verifyDraftReceipt('campaign:team:item:qty');timer();
 await assert.rejects(first,/STOCKTAKE_RECEIPT_TIMEOUT/);
 assert.equal(rows.get('campaign:team:item:qty'),draft,'timeout must preserve draft and operation ID');
 assert.equal(await context.verifyDraftReceipt('campaign:team:item:qty'),true,'a new server read can confirm the same operation');
 assert.equal(reads,2);assert.equal(removed,1);
 resolveOld({exists:true,metadata:{fromCache:false,hasPendingWrites:false},data:()=>({operationId:'op1'})});
 await Promise.resolve();assert.equal(removed,1,'late response cannot remove another draft or confirm twice');
 console.log('PASS: stalled receipt times out, retains draft, permits same-ID retry, ignores late response');
})().catch(e=>{console.error(e);process.exitCode=1});
