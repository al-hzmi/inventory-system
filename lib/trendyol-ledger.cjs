'use strict';
const crypto=require('node:crypto');
const {get,put,BlobPreconditionFailedError,BlobNotFoundError}=require('@vercel/blob');
const PATH='batco-trendyol-ledger/v1/ledger.json';
const problem=(status,message)=>Object.assign(new Error(message),{status,safeLedgerError:true});
const validId=s=>typeof s==='string'&&/^[a-zA-Z0-9-]{16,80}$/.test(s);
function money(value){
 const s=String(value??'').trim();
 if(!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(s))throw problem(400,'أدخل مبلغًا صحيحًا بحد أقصى منزلتين عشريتين');
 const [whole,frac='']=s.split('.');const n=Number(whole)*100+Number((frac+'00').slice(0,2));
 if(!Number.isSafeInteger(n)||n<=0)throw problem(400,'يجب أن يكون المبلغ أكبر من صفر');return n;
}
function state(events){
 const deposits=new Map(),allocations=new Map(),historical=new Map();
 for(const e of events){
  if(e.type==='historical')historical.set(e.id,{...e,reversed:false});
  if(e.type==='historical_edit'){const h=historical.get(e.historicalId);if(!h)throw problem(500,'تعذر قراءة التعديل');h.quantity=e.quantity;}
  if(e.type==='deposit')deposits.set(e.id,{...e,allocated:0});
  if(e.type==='allocation'){const d=deposits.get(e.depositId);if(!d)throw problem(500,'تعذر قراءة سجل الدفعات');d.allocated+=e.amount;allocations.set(e.id,{...e,reversed:false});}
  if(e.type==='edit'){const a=allocations.get(e.allocationId);if(!a||a.reversed)throw problem(500,'تعذر قراءة سجل التعديل');const d=deposits.get(a.depositId);d.allocated+=e.amount-a.amount;a.quantity=e.quantity;a.amount=e.amount;}
  if(e.type==='reverse'){const a=allocations.get(e.allocationId);if(!a||a.reversed)throw problem(500,'تعذر قراءة سجل التخصيص');a.reversed=true;deposits.get(a.depositId).allocated-=a.amount;}
 }
 return {deposits:[...deposits.values()].map(d=>({...d,remaining:d.amount-d.allocated})),allocations:[...allocations.values()],historical:[...historical.values()],events};
}
function apply(events,input){
 if(!Array.isArray(events)||events.length>5000)throw problem(503,'السجل يحتاج إلى مراجعة قبل إضافة بيانات');
 if(!input||!validId(input.id))throw problem(400,'تعذر التحقق من العملية');
 const key=crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const prior=events.find(e=>e.id===input.id);
 if(prior){if(prior.requestHash!==key)throw problem(409,'معرّف العملية مستخدم ببيانات مختلفة');return {events,duplicate:true};}
 const s=state(events);let event={id:input.id,type:input.type,at:new Date().toISOString(),requestHash:key};
 if(input.type==='deposit'){
  const date=String(input.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw problem(400,'أدخل تاريخ الدفعة الصحيح');
  const note=String(input.note||'').trim();if(note.length>200)throw problem(400,'الملاحظة طويلة جدًا');
  event={...event,date,amount:money(input.amount),note};
 }else if(input.type==='historical'){
  const date=String(input.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw problem(400,'أدخل تاريخًا صحيحًا');
  const sku=String(input.sku||'').trim().toUpperCase(),quantity=Number(input.quantity);
  if(!/^(?:OGS_)?[A-Z0-9][A-Z0-9_-]{0,79}$/.test(sku)||!Number.isSafeInteger(quantity)||quantity<=0||quantity>1000000)throw problem(400,'أدخل رقم صنف وكمية صحيحة');
  event={...event,date,sku,quantity};
 }else if(input.type==='historical_edit'){
  const h=s.historical.find(x=>x.id===input.historicalId),quantity=Number(input.quantity);if(!h||!Number.isSafeInteger(quantity)||quantity<=0||quantity>1000000)throw problem(400,'أدخل عدد حبات صحيحًا');
  event={...event,historicalId:h.id,quantity};
 }else if(input.type==='allocation'){
  const d=s.deposits.find(x=>x.id===input.depositId);if(!d)throw problem(400,'اختر دفعة موجودة');
  const sku=String(input.sku||'').trim().toUpperCase();if(!/^(?:OGS_)?[A-Z0-9][A-Z0-9_-]{0,79}$/.test(sku))throw problem(400,'أدخل رقم صنف صحيحًا');
  const qty=Number(input.quantity);if(!Number.isSafeInteger(qty)||qty<=0||qty>1000000)throw problem(400,'أدخل عدد حبات صحيحًا');
  const amount=money(input.amount);if(amount>d.remaining)throw problem(400,'مبلغ التخصيص أكبر من المبلغ المتبقي في الدفعة');
  event={...event,depositId:d.id,sku,quantity:qty,amount};
 }else if(input.type==='edit'){
  const a=s.allocations.find(x=>x.id===input.allocationId);if(!a||a.reversed)throw problem(400,'التخصيص غير موجود أو تم إلغاؤه');
  const qty=Number(input.quantity);if(!Number.isSafeInteger(qty)||qty<=0||qty>1000000)throw problem(400,'أدخل عدد حبات صحيحًا');
  const amount=money(input.amount),d=s.deposits.find(x=>x.id===a.depositId);if(amount>d.remaining+a.amount)throw problem(400,'مبلغ التخصيص أكبر من المبلغ المتاح في الدفعة');
  event={...event,allocationId:a.id,quantity:qty,amount};
 }else if(input.type==='reverse'){
  const a=s.allocations.find(x=>x.id===input.allocationId);if(!a||a.reversed)throw problem(400,'التخصيص غير موجود أو تم إلغاؤه');
  event={...event,allocationId:a.id};
 }else throw problem(400,'العملية غير معروفة');
 return {events:[...events,event],duplicate:false};
}
function blobStorage(){
 if(!process.env.BLOB_READ_WRITE_TOKEN&&!process.env.BLOB_STORE_ID)throw problem(503,'حفظ الدفعات غير مهيأ بعد');
 return {
  async read(){try{const r=await get(PATH,{access:'private',useCache:false});if(!r)return {events:[],etag:null};if(r.statusCode!==200||!r.stream)throw problem(503,'تعذر قراءة سجل الدفعات');const raw=await new Response(r.stream).text();const doc=JSON.parse(raw);if(doc.version!==1||!Array.isArray(doc.events))throw problem(503,'صيغة سجل الدفعات غير صالحة');return {events:doc.events,etag:r.blob.etag};}catch(e){if(e instanceof BlobNotFoundError)return {events:[],etag:null};throw e;}},
  async save(events,etag){const data=JSON.stringify({version:1,events});await put(PATH,data,{access:'private',contentType:'application/json',addRandomSuffix:false,...(etag?{allowOverwrite:true,ifMatch:etag}:{allowOverwrite:false})});},
  async backup(events){if(!events.length)return;const data=JSON.stringify({version:1,events});const sha=crypto.createHash('sha256').update(data).digest('hex');try{await put('batco-trendyol-ledger/v1/backups/'+sha+'.json',data,{access:'private',contentType:'application/json',allowOverwrite:false,addRandomSuffix:false});}catch(e){if(!/already exists/i.test(String(e.message||'')))throw e;}},
  isConflict(e){return e instanceof BlobPreconditionFailedError||/already exists/i.test(String(e.message||''));}
 };
}
function service(storage=blobStorage()){
 return {async read(){return state((await storage.read()).events)},async write(input){for(let i=0;i<3;i++){const old=await storage.read();const next=apply(old.events,input);if(next.duplicate)return state(next.events);await storage.backup(old.events);try{await storage.save(next.events,old.etag);return state(next.events);}catch(e){if(!storage.isConflict(e))throw e;}}throw problem(409,'تغير السجل أثناء الحفظ، حاول مرة أخرى');}};
}
module.exports={service,apply,state,money};
