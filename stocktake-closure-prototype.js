/* Isolated protocol prototype. NOT wired to production; requires server-enforced rules. */
(function(root){
'use strict';
function validateRoster(campaign,teamDocs){
 const ids=campaign?.closeRoster;
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'||!x))throw Error('CLOSE_ROSTER_INVALID');
 if(!campaign.closeEpoch||campaign.status!=='active'||campaign.closePhase!=='collecting')throw Error('CLOSE_NOT_COLLECTING');
 if(teamDocs.length!==ids.length)throw Error('CLOSE_TEAM_MISSING');
 for(let i=0;i<ids.length;i++){
  const doc=teamDocs[i],d=doc?.data();
  if(!doc?.exists||doc.id!==ids[i]||d.campaignId!==campaign.id||d.closeEpoch!==campaign.closeEpoch||d.closeStatus!=='acknowledged'||!Array.isArray(d.memberEmployeeIds)||!d.memberEmployeeIds.includes(d.closeActorId)||!d.registeredDeviceId||d.closeDeviceId!==d.registeredDeviceId)throw Error('CLOSE_ACK_MISSING');
 }
 return true;
}
function countAllowed(campaign,team,campaignId,teamId){
 if(!campaign||campaign.status!=='active'||campaign.id!==campaignId)throw Error('COUNT_CAMPAIGN_CLOSED');
 if(!team||team.id!==teamId||team.campaignId!==campaignId)throw Error('COUNT_TEAM_INVALID');
 if(campaign.closePhase==='collecting'&&(!Array.isArray(campaign.closeRoster)||!campaign.closeRoster.includes(teamId)))throw Error('COUNT_ROSTER_INVALID');
 if(campaign.closePhase==='collecting'&&team.closeEpoch===campaign.closeEpoch&&team.closeStatus==='acknowledged')throw Error('COUNT_TEAM_ACKNOWLEDGED');
 return true;
}
function ackAllowed({campaign,team,campaignId,teamId,employeeId,deviceId,pendingCount,inFlightCount,storageVerified}){
 if(!campaign||campaign.id!==campaignId||campaign.status!=='active'||campaign.closePhase!=='collecting'||!campaign.closeEpoch)throw Error('CLOSE_NOT_COLLECTING');
 if(!team||team.id!==teamId||team.campaignId!==campaignId||!Array.isArray(campaign.closeRoster)||!campaign.closeRoster.includes(teamId))throw Error('ACK_TEAM_INVALID');
 if(!employeeId||!deviceId||team.registeredDeviceId!==deviceId||!Array.isArray(team.memberEmployeeIds)||!team.memberEmployeeIds.includes(employeeId))throw Error('ACK_IDENTITY_INVALID');
 if(storageVerified!==true||pendingCount!==0||inFlightCount!==0)throw Error('ACK_PENDING_OR_UNVERIFIED');
 if(team.closeEpoch===campaign.closeEpoch&&team.closeStatus==='acknowledged'){
  if(team.closeActorId!==employeeId||team.closeDeviceId!==deviceId)throw Error('ACK_IDENTITY_INVALID');
  return 'already';
 }
 countAllowed(campaign,team,campaignId,teamId);return true;
}

root.StocktakeClosurePrototype={validateRoster,countAllowed,ackAllowed};
})(typeof globalThis!=='undefined'?globalThis:window);
