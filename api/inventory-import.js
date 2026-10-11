const crypto=require('crypto');
const HASH='f03cbd5064d744450fd61c889dabc2874a8acbb0005d06561db00159bfd3c0c7';
const paths={jeddah:'data/jeddah.tsv',riyadh:'data/riyadh.tsv',pricing:'data/pricing.tsv'};
const respond=(res,status,data)=>{res.setHeader('Cache-Control','no-store');return res.status(status).json(data)};
const config=()=>({token:process.env.GITHUB_TOKEN,owner:process.env.GITHUB_OWNER||process.env.VERCEL_GIT_REPO_OWNER,repo:process.env.GITHUB_REPO||process.env.VERCEL_GIT_REPO_SLUG||'inventory-system',branch:process.env.GITHUB_BRANCH||'main'});
async function remote(c,path,body){const url='https://api.github.com/repos/'+c.owner+'/'+c.repo+'/contents/'+path;const r=await fetch(url+(body?'':'?ref='+c.branch),{method:body?'PUT':'GET',headers:{Authorization:'Bearer '+c.token,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error('GitHub: '+data.message);return data}

const readLines=text=>String(text||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n').map((line,i)=>({line:i+1,cells:line.split('\t')})).filter(r=>r.cells.some(c=>c.trim()));
const skuOf=x=>String(x||'').trim().toUpperCase();
const numeric=(x,line,name,zero=true)=>{const s=String(x??'').trim().replace(/,/g,'');if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)||!Number.isFinite(Number(s))||Number(s)<0||(!zero&&Number(s)===0))throw Error('السطر '+line+': '+name+' غير صالح ('+s+')');return String(Number(s))};
function prepare(kind,input,current){
 const source=readLines(input);if(source.length<2)throw Error('الصق صف العناوين وصفًا واحدًا على الأقل');
 const inputLines=String(input||'').replace(/\r\n?/g,'\n').split('\n');if(inputLines.at(-1)==='')inputLines.pop();const blankRowsSkipped=inputLines.filter(l=>!l.trim()).length;
 const price=kind==='pricing',two=price&&source[0].cells[0].includes('مخزون جدة');
 const headers=source[two?1:0]?.cells.map(x=>x.trim().replace(/^\uFEFF/,''))||[];
 const col=(regex,start=0)=>headers.findIndex((x,i)=>i>=start&&regex.test(x));
 const id=col(/^(رقم الصنف|sku)$/i),v=col(price?/^(سعر البيع|السعر|price)$/i:/^(الكمية المتوفرة|الكمية|quantity|qty)$/i);
 if(id<0||v<0)throw Error('أعمدة الملف غير معروفة. يجب وجود رقم الصنف و'+(price?'سعر البيع':'الكمية المتوفرة'));
 const name=col(/^اسم الصنف$/),unit=col(/^الوحدة$/),pack=col(/^الشد$/),full=!price&&name>=0&&unit>=0&&pack>=0;
 const id2=two?col(/^(رقم الصنف|sku)$/i,id+1):-1,v2=two?col(/^(سعر البيع|السعر|price)$/i,v+1):-1;
 if(two&&(id2<0||v2<0))throw Error('تنسيق تسعيرة جدة والرياض غير مكتمل');
 const changes=[],values=new Map();
 const put=(row,idCol,valCol)=>{
  const id=skuOf(row.cells[idCol]);if(!id)return;
  if(!/^[A-Z0-9][A-Z0-9_.\/-]{0,79}$/.test(id))throw Error('السطر '+row.line+': رقم صنف غير صالح: '+id);
  const value=numeric(row.cells[valCol],row.line,price?'السعر':'الكمية');
  if(values.has(id)){const prev=values.get(id);if(price&&prev.value===value)return;throw Error('الصنف '+id+' مكرر في السطرين '+prev.line+' و'+row.line)}
  let meta=null;if(full){meta={name:String(row.cells[name]||''),unit:String(row.cells[unit]||''),pack:numeric(row.cells[pack],row.line,'الشد',false)};if(!meta.name.trim()||!meta.unit.trim())throw Error('السطر '+row.line+': اسم الصنف والوحدة مطلوبان')}
  values.set(id,{id,value,meta,line:row.line});
 };
 for(const row of source.slice(two?2:1)){put(row,id,v);if(two)put(row,id2,v2)}
 if(!values.size)throw Error('الملف لا يحتوي على أصناف صالحة');
 if(values.size>10000)throw Error('الحد الأعلى عشرة آلاف صنف');
 const ending=String(current).includes('\r\n')?'\r\n':'\n';
 const raw=String(current).split(/\r\n|\n|\r/);if(raw[raw.length-1]==='')raw.pop();
 const old=raw.map(r=>r.split('\t')),seen=new Set(),added=[],modified=new Set(),metadata=new Set();
 if(!old.length)throw Error('ملف المخزون الأصلي فارغ');
 if(price){
  if(old[1]?.[0]?.trim()!=='رقم الصنف')throw Error('تنسيق التسعيرة الأصلي غير متوافق');
  for(let i=2;i<old.length;i++)for(const k of [0,5]){const id=skuOf(old[i][k]),row=values.get(id);if(!row)continue;seen.add(id);if(old[i][k+1]!==row.value){changes.push({sku:id,field:'سعر البيع',before:old[i][k+1]||'',after:row.value});modified.add(id);old[i][k+1]=row.value}}
 }else{
  if(old[0][0]?.replace(/^\uFEFF/,'').trim()!=='رقم الصنف'||old[0][3]?.trim()!=='الكمية المتوفرة')throw Error('تنسيق ملف الفرع الأصلي غير متوافق');
  for(let i=1;i<old.length;i++){const id=skuOf(old[i][0]),row=values.get(id);if(!row)continue;if(seen.has(id))throw Error('الصنف '+id+' مكرر في مخزون GitHub');seen.add(id);
   const fields=[[3,row.value,'الكمية']];if(row.meta)fields.push([1,row.meta.name,'الاسم'],[2,row.meta.unit,'الوحدة'],[4,row.meta.pack,'الشد']);
   for(const [k,value,field] of fields)if(old[i][k]!==value){changes.push({sku:id,field,before:old[i][k]||'',after:value});modified.add(id);if(k!==3)metadata.add(id);old[i][k]=value}
  }
 }
 for(const row of values.values())if(!seen.has(row.id)){
  const cells=Array(Math.max(price?7:5,old[0].length)).fill('');
  if(price){cells[0]=row.id;cells[1]=row.value}else{if(!row.meta)throw Error('الصنف '+row.id+' جديد؛ الصق معه الاسم والوحدة والشد');[cells[0],cells[1],cells[2],cells[3],cells[4]]=[row.id,row.meta.name,row.meta.unit,row.value,row.meta.pack]}
  added.push(cells);changes.push({sku:row.id,field:'صنف جديد',before:'',after:row.value});
 }
 const summary={rows:values.size,changed:modified.size,added:added.length,unchanged:values.size-modified.size-added.length,blankRowsSkipped,detailChanges:metadata.size,examples:changes.slice(0,20)};
 return {summary,content:changes.length?[...old,...added].map(r=>r.join('\t')).join(ending)+ending:current};
}

module.exports=async(req,res)=>{if(req.method==='GET'){const c=config();return respond(res,200,{configured:!!(c.token&&c.owner&&c.repo),version:'v58-blank-rows',imports:['jeddah','riyadh','pricing']})}if(req.method!=='POST')return respond(res,405,{error:'Method not allowed'});const c=config(),b=req.body||{};if(!c.token||!c.owner||!c.repo)return respond(res,503,{error:'GitHub غير مهيأ'});if(crypto.createHash('sha256').update(String(b.adminToken||'')).digest('hex')!==HASH||b.adminProof?.role!=='admin'||!b.adminProof?.photoId)return respond(res,401,{error:'صلاحيات المدير مطلوبة'});if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)return respond(res,403,{error:'مصدر غير مسموح'})}catch{return respond(res,403,{error:'مصدر غير صالح'})}}if(!paths[b.kind]||!['preview','save'].includes(b.action)||typeof b.text!=='string'||b.text.length>2000000)return respond(res,400,{error:'طلب غير صالح'});try{const file=await remote(c,paths[b.kind]),current=Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8'),result=prepare(b.kind,b.text,current);if(b.action==='preview')return respond(res,200,{sha:file.sha,summary:result.summary});if(b.sha!==file.sha)return respond(res,409,{error:'تغيّرت البيانات. أعد المعاينة'});if(result.content===current)return respond(res,200,{ok:true,summary:result.summary});const saved=await remote(c,paths[b.kind],{message:'admin: import '+b.kind,content:Buffer.from(result.content).toString('base64'),sha:file.sha,branch:c.branch});return respond(res,200,{ok:true,summary:result.summary,commit:saved.commit.sha})}catch(e){return respond(res,400,{error:e.message})}};
