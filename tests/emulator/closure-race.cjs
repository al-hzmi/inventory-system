'use strict';
const assert=require('node:assert/strict');const {initializeApp,deleteApp}=require('firebase/app');
const {getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,runTransaction}=require('firebase/firestore');require('../../stocktake-closure-prototype.js');const P=global.StocktakeClosurePrototype;
(async()=>{
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8099');const app=initializeApp({projectId:'demo-inventory-reliability'},'closure-race'),db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8099);
 for(let i=0;i<10;i++){
  const suffix=String(i),campaignId='close-j-'+suffix,teamIds=['a'+suffix,'b'+suffix],cp=doc(db,'proto-campaigns',campaignId),other=doc(db,'proto-campaigns','close-r-'+suffix),teams=teamIds.map(id=>doc(db,'proto-teams',id)),item=doc(db,'proto-items',suffix),op=doc(db,'proto-ops',suffix),late=doc(db,'proto-ops','late'+suffix);
  await Promise.all([setDoc(cp,{id:campaignId,status:'active',closePhase:'collecting',closeEpoch:'epoch',closeRoster:teamIds}),setDoc(other,{id:'r',status:'active'}),...teams.map((t,j)=>setDoc(t,{id:teamIds[j],campaignId,memberEmployeeIds:['worker'+j],registeredDeviceId:'device'+j})),setDoc(item,{qty:0})]);
  const ack=(j,pending=0)=>runTransaction(db,async tx=>{const [cs,ts]=await Promise.all([tx.get(cp),tx.get(teams[j])]);const c=cs.data(),t=ts.data();const result=P.ackAllowed({campaign:c,team:t,campaignId,teamId:teamIds[j],employeeId:'worker'+j,deviceId:'device'+j,pendingCount:pending,inFlightCount:0,storageVerified:true});if(result==='already')return result;tx.update(teams[j],{closeEpoch:'epoch',closeStatus:'acknowledged',closeActorId:'worker'+j,closeDeviceId:'device'+j});return 'saved'},{maxAttempts:15});
  const count=(opRef)=>runTransaction(db,async tx=>{const [cs,ts,is,os]=await Promise.all([tx.get(cp),tx.get(teams[1]),tx.get(item),tx.get(opRef)]);if(os.exists())return 'already';P.countAllowed(cs.data(),ts.data(),campaignId,teamIds[1]);tx.update(item,{qty:is.data().qty+1});tx.set(opRef,{op:'fixed'});return 'saved'},{maxAttempts:15});
  const close=()=>runTransaction(db,async tx=>{const [cs,...ts]=await Promise.all([tx.get(cp),...teams.map(t=>tx.get(t))]);P.validateRoster(cs.data(),ts.map(t=>({id:t.id,exists:t.exists(),data:()=>t.data()})));tx.update(cp,{status:'closed'});return 'closed'},{maxAttempts:15});
  await assert.rejects(close(),/CLOSE_ACK_MISSING/);await assert.rejects(ack(0,1),/ACK_PENDING/);assert.equal(await ack(0),'saved');assert.equal(await ack(0),'already');
  const [countResult,ackResult]=await Promise.allSettled([count(op),ack(1)]);assert.equal(ackResult.status,'fulfilled');if(countResult.status==='rejected')assert.match(String(countResult.reason),/COUNT_TEAM_ACKNOWLEDGED/);
  const qty=(await getDoc(item)).data().qty;assert.ok(qty===0||qty===1);if(qty===1)assert.equal(await count(op),'already');else await assert.rejects(count(op),/ACKNOWLEDGED/);
  assert.equal(await close(),'closed');await assert.rejects(count(late),/COUNT_CAMPAIGN_CLOSED/);assert.equal((await getDoc(other)).data().status,'active');
 }
 console.log(JSON.stringify({passed:true,scenario:'prototype policy + real Firestore emulator transactions',races:10,coverage:['pending blocks ack','same ack retry','ack/count race','late count blocked','other branch remains active'],limits:'prototype only; synthetic permissive rules, not wired to current app or production'}));await deleteApp(app);
})().catch(e=>{console.error(e);process.exit(1)});
