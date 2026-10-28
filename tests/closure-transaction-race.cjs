'use strict';
const assert=require('node:assert/strict');require('../stocktake-closure-prototype.js');const P=global.StocktakeClosurePrototype;
class Db{
 constructor(rows){this.data=structuredClone(rows);this.rev={};this.retries=0}
 async tx(fn){for(let attempt=0;attempt<12;attempt++){
  const read={},writes={};const tx={get:async key=>{read[key]=this.rev[key]||0;return structuredClone(this.data[key])},set:(key,value)=>writes[key]=structuredClone(value)};
  let result;try{result=await fn(tx)}catch(e){if(Object.entries(read).some(([k,v])=>(this.rev[k]||0)!==v)){this.retries++;continue}throw e}
  await new Promise(r=>setImmediate(r));if(Object.entries(read).some(([k,v])=>(this.rev[k]||0)!==v)){this.retries++;continue}
  for(const [k,v]of Object.entries(writes)){this.data[k]=v;this.rev[k]=(this.rev[k]||0)+1}return result
 }throw Error('RETRIES_EXHAUSTED')}
}
(async()=>{
 for(let i=0;i<30;i++){
  const campaign={id:'j',status:'active',closePhase:'collecting',closeEpoch:'one',closeRoster:['t']};
  const team={id:'t',campaignId:'j',memberEmployeeIds:['e'],registeredDeviceId:'d'},db=new Db({campaign,team,item:{qty:0},receipt:null});
  const ack=()=>db.tx(async tx=>{const cp=await tx.get('campaign'),t=await tx.get('team');P.ackAllowed({campaign:cp,team:t,campaignId:'j',teamId:'t',employeeId:'e',deviceId:'d',pendingCount:0,inFlightCount:0,storageVerified:true});tx.set('team',{...t,closeEpoch:'one',closeStatus:'acknowledged',closeActorId:'e',closeDeviceId:'d'})});
  const count=()=>db.tx(async tx=>{const cp=await tx.get('campaign'),t=await tx.get('team'),item=await tx.get('item'),receipt=await tx.get('receipt');if(receipt)return;P.countAllowed(cp,t,'j','t');tx.set('item',{qty:item.qty+1});tx.set('receipt',{id:'fixed'})});
  const result=await Promise.allSettled(i%2?[ack(),count()]:[count(),ack()]);
  assert.equal(db.data.item.qty,db.data.receipt?1:0);assert.equal(db.data.team.closeStatus,'acknowledged');
  assert.ok(result.some(x=>x.status==='fulfilled'));if(db.data.item.qty===0)assert.ok(result.some(x=>x.status==='rejected'));
  if(db.data.receipt)await count();else await assert.rejects(count(),/ACKNOWLEDGED/);
  assert.equal(db.data.item.qty,db.data.receipt?1:0);
 }
 console.log('PASS: 30 optimistic ack/count races, fixed receipt, no late unacknowledged count');
})().catch(e=>{console.error(e);process.exit(1)});
