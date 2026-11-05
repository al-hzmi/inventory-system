'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {apply,state,service,money}=require('../lib/trendyol-ledger.cjs');
const deposit={id:'deposit-1111111111',type:'deposit',date:'2026-08-05',amount:'1500.00',note:'حوالة'};
const first={id:'allocation-1111111',type:'allocation',depositId:deposit.id,sku:'OGS_230104',quantity:6,amount:'600.00'};
const second={id:'allocation-2222222',type:'allocation',depositId:deposit.id,sku:'OGS_230025',quantity:9,amount:'900.00'};
test('allocate a 1500 riyal deposit and reverse a mistaken entry without deleting history',()=>{
 let list=apply([],deposit).events;list=apply(list,first).events;assert.equal(state(list).deposits[0].remaining,90000);
 list=apply(list,second).events;assert.equal(state(list).deposits[0].remaining,0);
 assert.throws(()=>apply(list,{...first,id:'allocation-3333333',amount:'0.01'}),/أكبر من المبلغ/);
 list=apply(list,{id:'reversal-111111111',type:'reverse',allocationId:first.id}).events;
 assert.equal(state(list).deposits[0].remaining,60000);assert.equal(state(list).allocations[0].reversed,true);assert.equal(list.length,4);
});
test('same request is idempotent and cannot be reused for different data',()=>{
 let list=apply([],deposit).events;let repeated=apply(list,deposit);assert.equal(repeated.duplicate,true);assert.equal(repeated.events.length,1);
 assert.throws(()=>apply(list,{...deposit,amount:'100'}),/بيانات مختلفة/);
});
test('money validation rejects rounding, negative and non-finite values',()=>{
 assert.equal(money('0.10'),10);assert.equal(money('12.5'),1250);
 for(const v of ['0','-1','2.001','Infinity','1e3'])assert.throws(()=>money(v));
});
test('conflicting concurrent edits retry against latest state and do not lose records',async()=>{
 let events=[],revision=0,reads=0;const snapshots=[];
 const storage={async read(){reads++;return {events:[...events],etag:revision?String(revision):null}},async backup(e){snapshots.push([...e])},async save(next,etag){if((etag||null)!==(revision?String(revision):null))throw Error('conflict');events=next;revision++},isConflict:e=>e.message==='conflict'};
 const a=service(storage),b=service(storage);await Promise.all([a.write(deposit),b.write({id:'deposit-2222222222',type:'deposit',date:'2026-08-06',amount:'20'})]);
 assert.equal((await a.read()).deposits.length,2);assert.ok(reads>=3);assert.ok(snapshots.length>=2);
});
test('ledger API requires the server session and fails closed without private storage',async()=>{
 const handler=require('../api/trendyol.js'),crypto=require('node:crypto');
 process.env.TRENDYOL_SESSION_SECRET='test-only-secret';delete process.env.BLOB_READ_WRITE_TOKEN;
 const response=()=>({setHeader(){},status(n){this.code=n;return this},json(body){this.body=body;return this}});
 let res=response();await handler({method:'GET',headers:{host:'localhost'},query:{action:'manual-ledger'}},res);assert.equal(res.code,401);
 res=response();await handler({method:'POST',headers:{host:'localhost'},body:{action:'manual-ledger',entry:deposit}},res);assert.equal(res.code,401);
 const payload=Buffer.from(JSON.stringify({expires:Date.now()+60000})).toString('base64url');const sig=crypto.createHmac('sha256',process.env.TRENDYOL_SESSION_SECRET).update(payload).digest('base64url');
 const headers={host:'localhost',cookie:'batco_trendyol='+payload+'.'+sig};res=response();await handler({method:'POST',headers,body:{action:'manual-ledger',entry:deposit}},res);assert.equal(res.code,503);
});

test('editing allocation updates remaining balance while retaining audit history',()=>{
 let events=apply([],deposit).events;events=apply(events,first).events;events=apply(events,{id:'edit-allocation-111',type:'edit',allocationId:first.id,quantity:3,amount:'200.00'}).events;
 assert.equal(state(events).deposits[0].remaining,130000);assert.equal(state(events).allocations[0].quantity,3);assert.equal(events.length,3);
 assert.throws(()=>apply(events,{id:'edit-allocation-222',type:'edit',allocationId:first.id,quantity:3,amount:'1600'}),/أكبر من المبلغ/);
});

test('historical paid quantities are saved without inventing a payment amount',()=>{
 const entry={id:'historic-230118-20260909',type:'historical',date:'2026-09-09',sku:'OGS_230118',quantity:1};const saved=apply([],entry).events;
 assert.equal(state(saved).historical[0].quantity,1);assert.equal(Object.hasOwn(saved[0],'amount'),false);assert.equal(apply(saved,entry).duplicate,true);
});

test('import history atomically and idempotently without amounts',async()=>{
 let events=[],writes=0;const storage={async read(){return {events,etag:events.length?'etag':null}},async backup(){},async save(next){events=next;writes++},isConflict(){return false}};const l=service(storage);const entries=[{id:'historic-230118-20260909',type:'historical',date:'2026-09-09',sku:'OGS_230118',quantity:1},{id:'historic-230104-20261021',type:'historical',date:'2026-10-21',sku:'OGS_230104',quantity:1}];
 await l.seedHistory(entries);await l.seedHistory(entries);assert.equal(writes,1);assert.equal((await l.read()).historical.length,2);
});

test('plus and minus update manual count across OGS aliases without changing deposits',()=>{
 let events=apply([],deposit).events;events=apply(events,first).events;events=apply(events,{id:'adjustment-11111111',type:'manual_adjust',sku:'230104',delta:1}).events;
 let result=state(events);assert.equal(result.adjustments[0].delta,1);assert.equal(result.deposits[0].remaining,90000);
 for(let i=0;i<7;i++)events=apply(events,{id:'adjustment-minus-'+String(i).padStart(8,'0'),type:'manual_adjust',sku:'230104',delta:-1}).events;
 assert.throws(()=>apply(events,{id:'adjustment-too-low-001',type:'manual_adjust',sku:'230104',delta:-1}),/أقل من صفر/);
});
