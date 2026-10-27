const crypto=require('crypto');
const HASH='f03cbd5064d744450fd61c889dabc2874a8acbb0005d06561db00159bfd3c0c7';
const paths={jeddah:'data/jeddah.tsv',riyadh:'data/riyadh.tsv',pricing:'data/pricing.tsv'};
const respond=(res,status,data)=>{res.setHeader('Cache-Control','no-store');return res.status(status).json(data)};
const config=()=>({token:process.env.GITHUB_TOKEN,owner:process.env.GITHUB_OWNER||process.env.VERCEL_GIT_REPO_OWNER,repo:process.env.GITHUB_REPO||process.env.VERCEL_GIT_REPO_SLUG||'inventory-system',branch:process.env.GITHUB_BRANCH||'main'});
async function remote(c,path,body,ref){const url='https://api.github.com/repos/'+c.owner+'/'+c.repo+'/contents/'+path;const r=await fetch(url+(body?'':'?ref='+encodeURIComponent(ref||c.branch)),{method:body?'PUT':'GET',headers:{Authorization:'Bearer '+c.token,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error('GitHub: '+data.message);return data}

const readLines=text=>String(text||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n').map((line,i)=>({line:i+1,cells:line.split('\t')})).filter(r=>r.cells.some(c=>c.trim()));
const skuOf=x=>String(x||'').trim().toUpperCase();
const numeric=(x,line,name,zero=true)=>{const s=String(x??'').trim().replace(/,/g,'');if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)||!Number.isFinite(Number(s))||Number(s)<0||(!zero&&Number(s)===0))throw Error('السطر '+line+': '+name+' غير صالح ('+s+')');return String(Number(s))};
function prepare(kind,input,current,options={}) {
 const fullSnapshot=options.fullSnapshot===true;
 if(fullSnapshot&&kind==='pricing')throw Error('مطابقة الكشف الكامل متاحة للمخزون فقط، وليست للتسعيرة');
 const source=readLines(input);
 if(source.length<2)throw Error('الصق صف العناوين وصفًا واحدًا على الأقل');
 const inputLines=String(input||'').replace(/\r\n?/g,'\n').split('\n');
 if(inputLines.at(-1)==='')inputLines.pop();
 const blankRowsSkipped=inputLines.filter(l=>!l.trim()).length;
 const price=kind==='pricing',two=price&&source[0].cells[0].includes('مخزون جدة');
 const headers=source[two?1:0]?.cells.map(x=>x.trim().replace(/^\uFEFF/,''))||[];
 const col=(regex,start=0)=>headers.findIndex((x,i)=>i>=start&&regex.test(x));
 const id=col(/^(رقم الصنف|sku)$/i),v=col(price?/^(سعر البيع|السعر|price)$/i:/^(الكمية المتوفرة|الكمية|quantity|qty)$/i);
 if(id<0||v<0)throw Error('أعمدة الملف غير معروفة. يجب وجود رقم الصنف و'+(price?'سعر البيع':'الكمية المتوفرة'));
 const name=col(/^اسم الصنف$/),unit=col(/^الوحدة$/),pack=col(/^الشد$/),full=!price&&name>=0&&unit>=0&&pack>=0;
 const id2=two?col(/^(رقم الصنف|sku)$/i,id+1):-1,v2=two?col(/^(سعر البيع|السعر|price)$/i,v+1):-1;
 if(two&&(id2<0||v2<0))throw Error('تنسيق تسعيرة جدة والرياض غير مكتمل');
 const values=new Map(),changes=[];
 const put=(row,idCol,valCol)=>{
  const key=skuOf(row.cells[idCol]);
  if(!key){
   if(String(row.cells[valCol]||'').trim()&&!/^(الإجمالي|المجموع|total)$/i.test(String(row.cells[idCol]||'').trim()))
    throw Error('السطر '+row.line+': توجد كمية دون رقم صنف؛ راجع الملف الكامل.');
   return;
  }
  if(!/^[A-Z0-9][A-Z0-9_.\/-]{0,79}$/.test(key))throw Error('السطر '+row.line+': رقم صنف غير صالح: '+key);
  const value=numeric(row.cells[valCol],row.line,price?'السعر':'الكمية');
  if(values.has(key)){
   const prev=values.get(key);
   if(price&&prev.value===value)return;
   throw Error('الصنف '+key+' مكرر في السطرين '+prev.line+' و'+row.line);
  }
  let meta=null;
  if(full){
   meta={name:String(row.cells[name]||'').trim(),unit:String(row.cells[unit]||'').trim(),pack:numeric(row.cells[pack],row.line,'الشد',false)};
   if(!meta.name||!meta.unit)throw Error('السطر '+row.line+': اسم الصنف والوحدة مطلوبان');
  }
  values.set(key,{id:key,value,meta,line:row.line});
 };
 for(const row of source.slice(two?2:1)){put(row,id,v);if(two)put(row,id2,v2)}
 if(!values.size)throw Error('الملف لا يحتوي على أصناف صالحة');
 if(values.size>10000)throw Error('الحد الأعلى عشرة آلاف صنف');
 const ending=String(current).includes('\r\n')?'\r\n':'\n';
 const raw=String(current).split(/\r\n|\n|\r/);
 if(raw[raw.length-1]==='')raw.pop();
 const old=raw.map(r=>r.split('\t')),seen=new Set(),existingIds=new Set(),added=[],pendingNew=[],modified=new Set(),metadata=new Set();
 if(!old.length)throw Error('ملف المخزون الأصلي فارغ');
 if(price){
  if(old[1]?.[0]?.trim()!=='رقم الصنف')throw Error('تنسيق التسعيرة الأصلي غير متوافق');
  for(let i=2;i<old.length;i++)for(const k of [0,5]){
   const key=skuOf(old[i][k]),row=values.get(key);
   if(!row)continue;
   seen.add(key);
   if(old[i][k+1]!==row.value){
    changes.push({sku:key,field:'سعر البيع',before:old[i][k+1]||'',after:row.value});
    modified.add(key);old[i][k+1]=row.value;
   }
  }
 }else{
  if(old[0][0]?.replace(/^\uFEFF/,'').trim()!=='رقم الصنف'||old[0][3]?.trim()!=='الكمية المتوفرة')
   throw Error('تنسيق ملف الفرع الأصلي غير متوافق');
  for(let i=1;i<old.length;i++){
   const key=skuOf(old[i][0]);
   if(!key)continue;
   if(existingIds.has(key))throw Error('الصنف '+key+' مكرر في مخزون GitHub');
   existingIds.add(key);
   const row=values.get(key);
   if(!row)continue;
   seen.add(key);
   const fields=[[3,row.value,'الكمية']];
   if(row.meta)fields.push([1,row.meta.name,'الاسم'],[2,row.meta.unit,'الوحدة'],[4,row.meta.pack,'الشد']);
   for(const [k,value,field] of fields)if(old[i][k]!==value){
    changes.push({sku:key,field,before:old[i][k]||'',after:value});
    modified.add(key);
    if(k!==3)metadata.add(key);
    old[i][k]=value;
   }
  }
 }
 let unreported=0,zeroed=0,matched=0,inventoryRows=0,activeRows=0,matchedActive=0;
 const zeroExamples=[];
 if(!price){
  const existing=old.slice(1).filter(c=>skuOf(c[0]));
  inventoryRows=existing.length;
  const missing=existing.filter(c=>!values.has(skuOf(c[0])));
  unreported=missing.length;
  matched=inventoryRows-unreported;
  const oldQty=c=>{
   const before=String(c[3]||'').trim();
   const qty=Number(before.replace(/,/g,''));
   if(!Number.isFinite(qty)||qty<0)throw Error('الكمية السابقة للصنف '+skuOf(c[0])+' غير صالحة؛ تعذرت مطابقة الكشف.');
   return qty;
  };
  if(fullSnapshot){
   // Reports may omit items that already have zero stock. Measure coverage against ACTIVE prior SKUs.
   activeRows=existing.filter(c=>oldQty(c)>0).length;
   const missingActive=missing.filter(c=>oldQty(c)>0);
   matchedActive=activeRows-missingActive.length;
   const threshold=activeRows>=20?.8:.5;
   if(activeRows>=3&&matchedActive<Math.ceil(activeRows*threshold))
    throw Error('الكشف يغطي '+matchedActive+' من '+activeRows+' صنف ذي رصيد موجب ('+Math.round(matchedActive/activeRows*100)+'٪). منعنا تصفير البقية: تحقق من الفرع واكتمال جميع صفحات التقرير، ثم أعد الرفع.');
   for(const cells of missingActive){
    const key=skuOf(cells[0]),before=String(cells[3]||'').trim();
    cells[3]='0';
    zeroed++;modified.add(key);
    changes.push({sku:key,field:'الكمية (غير وارد بالكشف الكامل)',before,after:'0'});
    if(zeroExamples.length<8)zeroExamples.push(key);
   }
  }
 }
 const overrides=options.metadataOverrides&&typeof options.metadataOverrides==='object'&&!Array.isArray(options.metadataOverrides)?options.metadataOverrides:{};
 const reference=new Map();
 if(!price&&options.referenceInventory){
  const ref=readLines(options.referenceInventory);
  if(ref[0]?.cells[0]?.trim()==='رقم الصنف'){
   for(const row of ref.slice(1)){
    const cells=row.cells,key=skuOf(cells[0]);
    if(key&&!reference.has(key)&&String(cells[1]||'').trim()&&String(cells[2]||'').trim()&&Number(cells[4])>0)
     reference.set(key,{name:String(cells[1]).trim(),unit:String(cells[2]).trim(),pack:String(cells[4]).trim()});
   }
  }
 }
 const getOverride=(key)=>{
  if(!Object.prototype.hasOwnProperty.call(overrides,key))return null;
  const override=overrides[key];
  if(!override||typeof override!=='object'||Array.isArray(override))throw Error('بيانات الصنف '+key+' غير صالحة');
  const name=String(override.name||'').trim(),unit=String(override.unit||'').trim();
  if(!name||!unit||name.length>240||unit.length>60||/[\t\r\n]/.test(name+unit))
   throw Error('اسم الصنف ووحدته مطلوبان للصنف '+key+' (دون أسطر جديدة)');
  return {name,unit,pack:numeric(override.pack,0,'شد الصنف '+key,false)};
 };
 for(const row of values.values())if(!seen.has(row.id)){
  const cells=Array(Math.max(price?7:5,old[0].length)).fill('');
  if(price){cells[0]=row.id;cells[1]=row.value}
  else{
   const meta=row.meta||getOverride(row.id)||reference.get(row.id);
   if(!meta){
    pendingNew.push(row.id);
    changes.push({sku:row.id,field:'صنف جديد (بيانات مطلوبة)',before:'—',after:row.value});
    continue;
   }
   [cells[0],cells[1],cells[2],cells[3],cells[4]]=[row.id,meta.name,meta.unit,row.value,meta.pack];
  }
  added.push(cells);
  changes.push({sku:row.id,field:'صنف جديد',before:'',after:row.value});
 }
 const changesFromInput=modified.size-zeroed;
 const samples=fullSnapshot&&zeroed?[
  ...changes.filter(c=>c.field!=='الكمية (غير وارد بالكشف الكامل)').slice(0,14),
  ...changes.filter(c=>c.field==='الكمية (غير وارد بالكشف الكامل)').slice(0,6)
 ]:changes.slice(0,20);
 const summary={
  rows:values.size,changed:modified.size,added:added.length+pendingNew.length,
  unchanged:values.size-changesFromInput-added.length-pendingNew.length,
  blankRowsSkipped,detailChanges:metadata.size,unreported,matched,inventoryRows,activeRows,matchedActive,
  zeroed,zeroExamples,fullSnapshot,metadataNeeded:pendingNew.length,pendingNew,examples:samples
 };
 return {summary,content:changes.length?[...old,...added].map(r=>r.join('\t')).join(ending)+ending:current};
}

async function gitData(c,route,method='GET',payload){
 const url='https://api.github.com/repos/'+encodeURIComponent(c.owner)+'/'+encodeURIComponent(c.repo)+'/'+route;
 const r=await fetch(url,{method,headers:{Authorization:'Bearer '+c.token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:payload===undefined?undefined:JSON.stringify(payload)});
 let data={};try{data=await r.json()}catch{}
 if(!r.ok){const e=new Error('GitHub: '+String(data.message||('HTTP '+r.status)));e.status=r.status;throw e}
 return data;
}
function riyadhDate(now=new Date()){
 const formatter=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const parts=Object.fromEntries(formatter.formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day+' '+parts.hour+':'+parts.minute;
}
async function saveInventoryWithVersion(c,headSha,dataPath,text){
 const parent=await gitData(c,'git/commits/'+encodeURIComponent(headSha));
 if(!parent.tree?.sha)throw Error('تعذر قراءة نسخة المستودع الحالية');
 const lastUpdate=riyadhDate();
 const tree=await gitData(c,'git/trees','POST',{base_tree:parent.tree.sha,tree:[
  {path:dataPath,mode:'100644',type:'blob',content:text},
  {path:'data/version.json',mode:'100644',type:'blob',content:JSON.stringify({lastUpdate})+'\n'}
 ]});
 if(!tree.sha)throw Error('تعذر تجهيز ملفات التحديث');
 const commit=await gitData(c,'git/commits','POST',{message:'admin: import '+dataPath+' and update inventory timestamp',tree:tree.sha,parents:[headSha]});
 if(!commit.sha)throw Error('تعذر إنشاء نسخة حفظ التحديث');
 try{await gitData(c,'git/refs/heads/'+c.branch,'PATCH',{sha:commit.sha,force:false})}
 catch(e){if(e.status===409||e.status===422){const conflict=new Error('تغيّر المستودع أثناء الاعتماد. أعد المعاينة ثم حاول مجددًا.');conflict.status=409;throw conflict}throw e}
 return {sha:commit.sha,lastUpdate};
}

module.exports=async(req,res)=>{
 if(req.method==='GET'){
  const c=config();
  return respond(res,200,{configured:!!(c.token&&c.owner&&c.repo),version:'v114-authoritative-daily-snapshot',imports:['jeddah','riyadh','pricing']});
 }
 if(req.method!=='POST')return respond(res,405,{error:'Method not allowed'});
 const c=config(),b=req.body||{};
 if(!c.token||!c.owner||!c.repo)return respond(res,503,{error:'GitHub غير مهيأ'});
 if(crypto.createHash('sha256').update(String(b.adminToken||'')).digest('hex')!==HASH||b.adminProof?.role!=='admin'||!b.adminProof?.photoId)
  return respond(res,401,{error:'صلاحيات المدير مطلوبة'});
 if(req.headers.origin){
  try{if(new URL(req.headers.origin).host!==req.headers.host)return respond(res,403,{error:'مصدر غير مسموح'})}
  catch{return respond(res,403,{error:'مصدر غير صالح'})}
 }
 if(!paths[b.kind]||!['preview','save'].includes(b.action)||typeof b.text!=='string'||b.text.length>2000000)
  return respond(res,400,{error:'طلب غير صالح'});
 // Legacy cached clients must refresh, rather than accidentally retaining yesterday's quantities.
 if(b.kind!=='pricing'&&typeof b.fullSnapshot!=='boolean')
  return respond(res,400,{error:'حدّث صفحة الاستيراد لاختيار التحديث اليومي الكامل أو الجزئي صراحةً.'});
 try{
  const head=b.action==='save'?await gitData(c,'git/ref/heads/'+c.branch):null;
  const other=b.kind==='jeddah'?'riyadh':b.kind==='riyadh'?'jeddah':null;
  const [file,referenceFile]=await Promise.all([
   remote(c,paths[b.kind],undefined,head?.object?.sha),
   other?remote(c,paths[other],undefined,head?.object?.sha):Promise.resolve(null)
  ]);
  const current=Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8');
  const referenceInventory=referenceFile?Buffer.from(referenceFile.content.replace(/\s/g,''),'base64').toString('utf8'):null;
  const result=prepare(b.kind,b.text,current,{
   fullSnapshot:b.fullSnapshot===true,
   referenceInventory,
   metadataOverrides:b.action==='save'?b.metadataOverrides:null
  });
  if(b.action==='preview')return respond(res,200,{sha:file.sha,summary:result.summary});
  if(b.sha!==file.sha)return respond(res,409,{error:'تغيّرت بيانات الفرع منذ المعاينة؛ أعد المعاينة'});
  if(result.summary.metadataNeeded)
   throw Error('هناك '+result.summary.metadataNeeded+' صنف جديد يحتاج الاسم والوحدة والشد. أكملها في المعاينة قبل الاعتماد.');
  if(result.content===current)return respond(res,200,{ok:true,summary:result.summary});
  const saved=await saveInventoryWithVersion(c,head.object.sha,paths[b.kind],result.content);
  return respond(res,200,{ok:true,summary:result.summary,commit:saved.sha,lastUpdate:saved.lastUpdate,versionUpdated:true});
 }catch(e){
  return respond(res,e.status===409?409:400,{error:e.message});
 }
};
