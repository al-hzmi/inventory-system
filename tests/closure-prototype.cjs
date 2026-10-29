'use strict';
const assert=require('node:assert/strict');require('../stocktake-closure-prototype.js');
const P=global.StocktakeClosurePrototype;
for(const count of [6,8]){
 const ids=Array.from({length:count/2},(_,i)=>'team'+i);
 const campaign={id:'jeddah',status:'active',closePhase:'collecting',closeEpoch:'round1',closeRoster:ids};
 const teams=ids.map(id=>({id,campaignId:'jeddah',memberEmployeeIds:[id+'employee'],registeredDeviceId:'phone'}));
 for(const team of teams){
  assert.throws(()=>P.ackAllowed({campaign,team,campaignId:'jeddah',teamId:team.id,employeeId:team.id+'employee',deviceId:'phone',pendingCount:1,inFlightCount:0,storageVerified:true}),/PENDING/);
  assert.throws(()=>P.ackAllowed({campaign,team,campaignId:'jeddah',teamId:team.id,employeeId:team.id+'employee',deviceId:'phone',pendingCount:0,inFlightCount:1,storageVerified:true}),/PENDING/);
  assert.throws(()=>P.ackAllowed({campaign,team,campaignId:'jeddah',teamId:team.id,employeeId:team.id+'employee',deviceId:'phone',pendingCount:0,inFlightCount:0,storageVerified:false}),/UNVERIFIED/);
  assert(P.ackAllowed({campaign,team,campaignId:'jeddah',teamId:team.id,employeeId:team.id+'employee',deviceId:'phone',pendingCount:0,inFlightCount:0,storageVerified:true}));
  Object.assign(team,{closeEpoch:'round1',closeStatus:'acknowledged',closeActorId:team.id+'employee',closeDeviceId:'phone'});
  assert.throws(()=>P.countAllowed(campaign,team,'jeddah',team.id),/ACKNOWLEDGED/);
  assert.equal(P.ackAllowed({campaign,team,campaignId:'jeddah',teamId:team.id,employeeId:team.id+'employee',deviceId:'phone',pendingCount:0,inFlightCount:0,storageVerified:true}),'already');
 }
 const docs=teams.map(t=>({id:t.id,exists:true,data:()=>t}));assert(P.validateRoster(campaign,docs));
 assert.throws(()=>P.validateRoster(campaign,docs.slice(1)),/MISSING/);
 teams[0].closeEpoch='old';assert.throws(()=>P.validateRoster(campaign,docs),/ACK_MISSING/);
 assert(P.countAllowed({id:'riyadh',status:'active'}, {id:'r',campaignId:'riyadh'},'riyadh','r'));
}
console.log('PASS: isolated closure policy; offline/in-flight block, roster, epoch, late count and branch independence');
