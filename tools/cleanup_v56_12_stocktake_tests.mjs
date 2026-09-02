const PROJECT_ID='inventory-system-ca3dc';
const API_KEY='AIzaSyCCvNlnZDxL5P4cPQrHYkOh3C8wJ6yl4Bw';
const DB='(default)';
const BASE=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DB)}/documents`;

const scalar=value=>{
  if(!value||typeof value!=='object') return undefined;
  if('stringValue' in value) return value.stringValue;
  if('integerValue' in value) return Number(value.integerValue);
  if('doubleValue' in value) return Number(value.doubleValue);
  if('booleanValue' in value) return Boolean(value.booleanValue);
  if('timestampValue' in value) return value.timestampValue;
  if('nullValue' in value) return null;
  return undefined;
};
const field=(doc,key)=>scalar(doc?.fields?.[key]);
const idOf=doc=>String(doc?.name||'').split('/').pop();

async function request(url,options={}){
  const res=await fetch(url,options);
  const text=await res.text();
  let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}};
  if(!res.ok){const err=new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data).slice(0,1400)}`);err.status=res.status;throw err}
  return data;
}
async function listAll(collection){
  const docs=[];let token='';
  do{
    const u=new URL(`${BASE}/${collection}`);u.searchParams.set('pageSize','300');u.searchParams.set('key',API_KEY);if(token)u.searchParams.set('pageToken',token);
    const data=await request(u);docs.push(...(Array.isArray(data.documents)?data.documents:[]));token=String(data.nextPageToken||'');
  }while(token);
  return docs;
}
async function del(doc){const name=String(doc?.name||'');if(!name)return;const u=new URL(`https://firestore.googleapis.com/v1/${name}`);u.searchParams.set('key',API_KEY);await request(u,{method:'DELETE'})}

const campaigns=await listAll('stocktake_campaigns');
const tests=campaigns.filter(d=>field(d,'isTest')===true||field(d,'testMode')===true);
const ids=new Set(tests.map(idOf));
console.log(`legacy test campaigns found=${tests.length}`);
if(!tests.length){console.log('Nothing to clean');process.exit(0)}

let itemsDeleted=0,teamsDeleted=0,auditDeleted=0;
for(const [collection,label] of [['stocktake_items','items'],['stocktake_teams','teams'],['stocktake_audit','audit']]){
  const docs=await listAll(collection);
  const matches=docs.filter(d=>ids.has(String(field(d,'campaignId')||'')));
  for(const d of matches){await del(d)}
  if(label==='items')itemsDeleted=matches.length;
  if(label==='teams')teamsDeleted=matches.length;
  if(label==='audit')auditDeleted=matches.length;
  console.log(`${collection}: deleted=${matches.length}`);
}

for(const d of tests)await del(d);

// If an old test was active, clear only the stocktake-feature active pointer.
try{
  const control=await request(new URL(`${BASE}/system_controls/stocktake_feature?key=${API_KEY}`));
  const active=String(field(control,'activeCampaignId')||'');
  if(ids.has(active)){
    const now=new Date().toISOString(),u=new URL(`${BASE}/system_controls/stocktake_feature`);u.searchParams.set('key',API_KEY);
    for(const k of ['enabled','accessMode','activeCampaignId','updatedAt','updatedBy'])u.searchParams.append('updateMask.fieldPaths',k);
    await request(u,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({fields:{enabled:{booleanValue:false},accessMode:{stringValue:'none'},activeCampaignId:{stringValue:''},updatedAt:{timestampValue:now},updatedBy:{stringValue:'admin_mohanad'}}})});
  }
}catch(e){console.warn('control cleanup warning:',e.message)}

console.log(`V56.12 stocktake test cleanup complete: campaigns=${tests.length} items=${itemsDeleted} teams=${teamsDeleted} audit=${auditDeleted}`);
