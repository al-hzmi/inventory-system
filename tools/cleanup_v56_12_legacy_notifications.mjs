const PROJECT_ID='inventory-system-ca3dc';
const API_KEY='AIzaSyCCvNlnZDxL5P4cPQrHYkOh3C8wJ6yl4Bw';
const DB='(default)';
const BASE=`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DB)}/documents`;
const collections=['employee_notifications','customer_notifications'];

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
const isLegacyOnce=doc=>{
  const status=String(field(doc,'status')??'');
  const max=Math.max(1,Number(field(doc,'maxShows')??1)||1);
  const policy=Math.max(0,Number(field(doc,'receiptPolicyVersion')??0)||0);
  return status==='active'&&max===1&&policy<2;
};

async function request(url,options={}){
  const res=await fetch(url,options);
  const text=await res.text();
  let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}};
  if(!res.ok){
    const err=new Error(`${res.status} ${res.statusText}: ${JSON.stringify(data).slice(0,1200)}`);
    err.status=res.status;throw err;
  }
  return data;
}

async function listAll(collection){
  const docs=[];let token='';
  do{
    const u=new URL(`${BASE}/${collection}`);
    u.searchParams.set('pageSize','300');u.searchParams.set('key',API_KEY);
    if(token)u.searchParams.set('pageToken',token);
    const data=await request(u);
    docs.push(...(Array.isArray(data.documents)?data.documents:[]));
    token=String(data.nextPageToken||'');
  }while(token);
  return docs;
}

async function retire(doc,collection){
  const name=String(doc.name||'');
  if(!name)throw new Error(`Missing document name in ${collection}`);
  const now=new Date().toISOString();
  const u=new URL(`https://firestore.googleapis.com/v1/${name}`);
  u.searchParams.set('key',API_KEY);
  for(const key of ['status','legacyReceiptSuppressed','legacyReceiptSuppressedAt','updatedAt'])u.searchParams.append('updateMask.fieldPaths',key);
  const body={fields:{
    status:{stringValue:'completed'},
    legacyReceiptSuppressed:{booleanValue:true},
    legacyReceiptSuppressedAt:{timestampValue:now},
    updatedAt:{timestampValue:now}
  }};
  await request(u,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  return name.split('/').pop();
}

let totalScanned=0,totalRetired=0;
for(const collection of collections){
  const docs=await listAll(collection);totalScanned+=docs.length;
  const legacy=docs.filter(isLegacyOnce);
  console.log(`${collection}: scanned=${docs.length} legacy_active_once=${legacy.length}`);
  for(const doc of legacy){
    const id=await retire(doc,collection);totalRetired+=1;console.log(`${collection}: retired ${id}`);
  }
}
console.log(`V56.12 legacy notification cleanup complete: scanned=${totalScanned} retired=${totalRetired}`);
