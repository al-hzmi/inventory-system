// Deterministic test double, NOT Firebase emulator or billable usage measurements.
const clone=x=>structuredClone(x);
function database(size=750){
 const rows=new Map(),versions=new Map(),metrics={reads:0,writes:0,attempts:0,conflicts:0};
 const put=(p,x)=>{rows.set(p,clone(x));versions.set(p,(versions.get(p)||0)+1)};
 put('system_controls/stocktake_feature',{enabled:true,accessMode:'all',activeCampaignId:'jeddah',activeCampaigns:{jeddah:{campaignId:'jeddah',accessMode:'all'},riyadh:{campaignId:'riyadh',accessMode:'all'}}});
 for(const branch of ['jeddah','riyadh']){
  put('stocktake_campaigns/'+branch,{name:branch,warehouse:branch==='jeddah'?'جدة':'الرياض',warehouseKey:branch,status:'active'});
  for(let t=0;t<4;t++)put('stocktake_teams/'+branch+t,{campaignId:branch,name:branch+t,scope:'zone'+t,memberEmployeeIds:['admin_mohanad']});
  for(let i=0;i<size;i++)put('stocktake_items/'+branch+'_'+i,{campaignId:branch,teamId:branch+'0',sku:String(10000+i),name:'صنف اختبار '+i,expectedQty:100,actualQty:null,countStatus:'pending',orderIndex:i});
 }
 const get=p=>{metrics.reads++;return {path:p,id:p.split('/').pop(),exists:rows.has(p),value:clone(rows.get(p)),version:versions.get(p)||0}};
 return {rows,metrics,put,async call(a){
  if(a.kind==='get')return get(a.path);
  if(a.kind==='query'){const found=[...rows].filter(([p,x])=>p.startsWith(a.collection+'/')&&(!a.field||x[a.field]===a.value));metrics.reads+=Math.max(1,found.length);return found.map(([p,x])=>({path:p,id:p.split('/').pop(),exists:true,value:clone(x)}))}
  if(a.kind==='commit'){
   metrics.attempts++;
   if(a.reads.some(r=>(versions.get(r.path)||0)!==r.version)){metrics.conflicts++;return {retry:true}}
   for(const o of a.ops){const x=o.update?clone(rows.get(o.path)||{}):{};for(const [key,value]of Object.entries(o.data)){const parts=key.split('.');let target=x;for(const part of parts.slice(0,-1))target=target[part]??={};const leaf=parts.at(-1);target[leaf]=value?.__increment!==undefined?(target[leaf]||0)+value.__increment:clone(value)}put(o.path,x);metrics.writes++}return {ok:true};
  }
  throw Error('unsupported test operation '+a.kind);
 }};
}
function client(){
 const listeners=[];window.__testListeners=listeners;window.__test={fail:'',ackDelay:0,receiptFail:false,receiptCache:false};
 const snap=r=>({...r,data:()=>r.value,metadata:{fromCache:__test.receiptCache,hasPendingWrites:false}});
 function ref(collection,id){const path=collection+'/'+id;return {id,path,get:async opts=>{if(__test.receiptFail)throw Error('unavailable');if(opts?.source!=='server')throw Error('test requires explicit server receipt');return snap(await __db({kind:'get',path}))},onSnapshot:cb=>listen({kind:'get',path},cb)}}
 function listen(query,cb){const l={query,cb,alive:true};listeners.push(l);__db(query).then(r=>{if(l.alive)cb(Array.isArray(r)?{docs:r.map(snap),metadata:{fromCache:false},docChanges:()=>r.map(d=>({type:'added',doc:snap(d)}))}:snap(r))});return()=>{l.alive=false}}
 function collection(c){return {doc:(id=crypto.randomUUID())=>ref(c,id),where:(field,op,value)=>({onSnapshot:(opt,cb)=>listen({kind:'query',collection:c,field,value},typeof opt==='function'?opt:cb)}),onSnapshot:cb=>listen({kind:'query',collection:c},cb)}}
 const db={collection,enablePersistence:async()=>{},runTransaction:async callback=>{
  if(__test.fail)throw Error(__test.fail);
  for(let tries=0;tries<8;tries++){
   const reads=[],ops=[];const result=await callback({get:async r=>{const data=await __db({kind:'get',path:r.path});reads.push({path:r.path,version:data.version});return snap(data)},update:(r,data)=>ops.push({path:r.path,data,update:true}),set:(r,data)=>ops.push({path:r.path,data})});
   if(__test.fail)throw Error(__test.fail);
   const response=await __db({kind:'commit',reads,ops});if(response.retry)continue;
   if(__test.ackDelay)await new Promise(r=>setTimeout(r,__test.ackDelay));return result;
  }throw Error('aborted');
 }};
 function firestore(){return db}firestore.FieldValue={increment:n=>({__increment:n}),serverTimestamp:()=>({seconds:1793190000})};
 window.firebase={apps:[{}],initializeApp(){},firestore};
}
module.exports={database,client};
