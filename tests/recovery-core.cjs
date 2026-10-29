const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const data=new Map();let reject=false;
const storage={get length(){return data.size},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(reject)throw Error('quota');data.set(k,v)},removeItem:k=>data.delete(k)};
const context={localStorage:storage};vm.runInNewContext(fs.readFileSync('stocktake-core.js','utf8'),context);
const core=context.StocktakeCore,store=core.drafts('worker'),key='campaign:team:item:qty',draft={value:'3',operationId:'op'};
assert.equal(store.set(key,draft),true);assert.equal(store.list().length,1);
assert.equal(store.removeIf(key,{...draft,value:'4'}),false);
const receipt={campaignId:'campaign',teamId:'team',itemId:'item',actorEmployeeId:'worker',action:'count_created',after:{teamActualQty:3}};
assert.equal(core.receiptMatches(key,draft,receipt,'worker'),true);
for(const field of ['campaignId','teamId','itemId','actorEmployeeId'])assert.equal(core.receiptMatches(key,draft,{...receipt,[field]:'different'},'worker'),false);
for(const qty of [undefined,null,'',NaN,'NaN',-1])assert.equal(core.receiptMatches(key,draft,{...receipt,after:{teamActualQty:qty}},'worker'),false);
reject=true;assert.equal(store.set(key,{value:'4'}),false);assert.equal(store.get(key).operationId,'op');reject=false;
data.set('stocktake.draft.v73:worker:broken','{broken');assert.equal(store.list().length,2);assert.equal(store.set('broken',{value:'9'}),false);assert.equal(store.list().find(x=>x.key==='broken').raw,'{broken');
assert.equal(store.removeIf(key,store.get(key)),true);assert.equal(store.list().length,1);
async function attendance(source){
 let now=100000000,writes=0;const events={},timers=[];
 const proof={role:'employee',employeeId:'e',photoId:'p',loginAttemptId:'a',loginLogId:'l'},ls={inventory_employee_id_v2:'e',inventory_user_name_v2:'worker',inventory_employee_auth_version_v2:'2',inventory_login_photo_proof_v2:JSON.stringify(proof)};
 const firestore=()=>({collection:()=>({doc:()=>({set:async()=>{writes++}})})});firestore.FieldValue={serverTimestamp:()=>0};const firebase={apps:[{}],firestore};
 const sandbox={Date:{now:()=>now},document:{visibilityState:'visible',addEventListener:(k,f)=>events[k]=f},navigator:{onLine:true,userAgent:'test'},localStorage:{getItem:k=>ls[k]},location:{pathname:'/stocktake.html'},firebase,console,setInterval:(f,ms)=>{timers.push({f,ms,next:now+ms});return timers.length},clearInterval:()=>{},window:{firebase,addEventListener:(k,f)=>events[k]=f}};
 vm.runInNewContext(source,sandbox);await new Promise(resolve=>setImmediate(resolve));
 const start=now;while(now<start+3600000-1){now+=500;for(const t of timers)if(t.ms>500&&now>=t.next){t.next+=t.ms;await t.f()}}
 const steady=writes-1;
 for(let i=0;i<20;i++)await events.pageshow();
 return {steadyHourlyWrites:steady,eventBurstExtraWrites:writes-1-steady};
}
(async()=>{
 const before=await attendance(cp.execFileSync('git',['show','a588357c88fc6c094017eefce6b46a18f88fd58a:employee-attendance.js'],{encoding:'utf8'})),after=await attendance(fs.readFileSync('employee-attendance.js','utf8'));
 assert.equal(before.steadyHourlyWrites,80);assert.equal(after.steadyHourlyWrites,40);assert.equal(after.eventBurstExtraWrites,0);
 console.log(JSON.stringify({test:'receipt matching, corrupt records, quota failure, compare-before-remove',passed:true,attendance:{before,after,model:'virtual clock; source code executed, no Firestore calls'}},null,2));
})();
