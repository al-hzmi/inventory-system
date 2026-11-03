'use strict';
const crypto = require('crypto');
const stockMap = require('../data/trendyol-map.json');
const SELLER = () => String(process.env.TRENDYOL_SELLER_ID || '');
const http = (res, status, body) => {
  res.setHeader('Cache-Control','no-store, private, max-age=0');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  return res.status(status).json(body);
};
const safeEqual=(a,b)=>{
  const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
};
const signed=(payload)=>crypto.createHmac('sha256',process.env.TRENDYOL_SESSION_SECRET||'unconfigured').update(payload).digest('base64url');
const makeSession=()=>{
  const payload=Buffer.from(JSON.stringify({expires:Date.now()+6*3600000,nonce:crypto.randomBytes(16).toString('hex')})).toString('base64url');
  return payload+'.'+signed(payload);
};
const validSession=(req)=>{
  if(!process.env.TRENDYOL_SESSION_SECRET)return false;
  const cookies=String(req.headers.cookie||'').split(';').map(s=>s.trim());
  const value=(cookies.find(x=>x.startsWith('batco_trendyol='))||'').split('=').slice(1).join('=');
  const [payload,sig,extra]=value.split('.');
  if(!payload||!sig||extra||!safeEqual(signed(payload),sig))return false;
  try{const x=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));return Number(x.expires)>Date.now()&&Number(x.expires)<Date.now()+7*3600000;}catch{return false;}
};
const secureRequest=req=>{
  const origin=String(req.headers.origin||'');
  if(origin){try{if(new URL(origin).host!==req.headers.host)return false;}catch{return false;}}
  const site=String(req.headers['sec-fetch-site']||'');
  return !site||['same-origin','none'].includes(site);
};
const normal=v=>String(v??'').trim().toUpperCase();
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const statusError=(status,msg)=>Object.assign(new Error(msg),{status});
async function api(path,params={}) {
  const id=SELLER(),key=process.env.TRENDYOL_API_KEY,secret=process.env.TRENDYOL_API_SECRET;
  if(!/^\d{4,12}$/.test(id)||!key||!secret)throw statusError(503,'بيانات اتصال ترنديول غير مكتملة في إعدادات الخادم');
  const url=new URL('https://apigw.trendyol.com/integration/'+path.replaceAll('{sellerId}',id));
  for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
  const response=await fetch(url,{headers:{Authorization:'Basic '+Buffer.from(key+':'+secret).toString('base64'), 'User-Agent':id+' - SelfIntegration',storeFrontCode:'SA',Accept:'application/json','Accept-Language':'ar'},signal:AbortSignal.timeout(16000),cache:'no-store'});
  if(!response.ok)throw statusError(502,'تعذّر الاتصال بترنديول (HTTP '+response.status+'). تأكد من صلاحية بيانات التكامل.');
  return response.json();
}
async function products(){
  const items=[];let more=false;
  for(let page=0;page<45;page++){
    const data=await api('product/sellers/{sellerId}/products/approved/inventory-and-price',{page,size:100});
    const current=Array.isArray(data.content)?data.content:[];
    for(const p of current)for(const v of (Array.isArray(p.variants)?p.variants:[p]))items.push({barcode:normal(v.barcode||p.barcode),stockCode:normal(v.stockCode||p.stockCode),quantity:number(v.quantity),salePrice:number(v.salePrice),listPrice:number(v.listPrice),modified:v.stockLastModifiedDate||null});
    if(current.length<100 || (Number.isFinite(Number(data.totalPages)) && page+1>=Number(data.totalPages)))return {items,more:false};
    more=true;
  }
  return {items,more};
}
async function jeddah(){
  const token=process.env.GITHUB_TOKEN,owner=process.env.GITHUB_OWNER||'al-hzmi',repo=process.env.GITHUB_REPO||'inventory-system';
  const path='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/contents/data/jeddah.tsv?ref=main';
  const r=await fetch(path,{headers:{Accept:'application/vnd.github+json',...(token?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok)throw statusError(502,'تعذرت قراءة ملف مخزون جدة الحالي');
  const body=await r.json();
  const content=Buffer.from(String(body.content||'').replace(/\s/g,''),'base64').toString('utf8');
  const lines=content.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  const cols=(lines.shift()||'').split('\t').map(x=>x.trim());
  const idx=['رقم الصنف','اسم الصنف','الوحدة','الكمية المتوفرة','الشد'].map(x=>cols.indexOf(x));
  if(idx.some(x=>x<0))throw statusError(502,'أعمدة ملف جدة غير متوافقة');
  const rows=new Map();
  for(const line of lines){
    const c=line.split('\t'),[sku,name,unit,quantity,pack]=idx.map(x=>(c[x]||'').trim());
    if(sku)rows.set(normal(sku),{sku:normal(sku),name,unit,quantity:number(quantity),pack:number(pack)});
  }
  return {rows,sha:body.sha||null};
}
function mappingRows(warehouse,productList){
  const barcodeProduct=new Map(),skuCount=new Map(),barcodeCount=new Map();
  for(const p of productList){
    if(!barcodeProduct.has(p.barcode))barcodeProduct.set(p.barcode,[]);
    barcodeProduct.get(p.barcode).push(p);
  }
  for(const raw of stockMap){const s=normal(raw.sku);skuCount.set(s,(skuCount.get(s)||0)+1);const b=normal(raw.barcode);barcodeCount.set(b,(barcodeCount.get(b)||0)+1);}
  const mappings=stockMap.map((entry,i)=>{
    const supplied=normal(entry.sku), barcode=normal(entry.barcode);
    const sku=warehouse.rows.has(supplied)?supplied:warehouse.rows.has('OGS_'+supplied)?'OGS_'+supplied:supplied;
    const row=warehouse.rows.get(sku);
    const productMatches=barcodeProduct.get(barcode)||[];
    const errors=[];
    if(/^\d+\.\d+E\+\d+$/i.test(barcode))errors.push('باركود بصيغة علمية');
    if(supplied.includes('-'))errors.push('رقم صنف مركب');
    if((skuCount.get(supplied)||0)>1)errors.push('عدة باركودات للصنف نفسه');
    if((barcodeCount.get(barcode)||0)>1)errors.push('باركود مكرر');
    if(!row)errors.push('الصنف غير موجود بجدة');
    if(productMatches.length!==1)errors.push(productMatches.length?'باركود مكرر في ترنديول':'الصنف غير معتمد أو غير موجود في ترنديول');
    const exact=row?(row.unit==='حبة'?row.quantity:row.unit==='كرتون'&&row.pack>0?row.quantity*row.pack:NaN):NaN;
    const expected=Number.isFinite(exact)&&Math.abs(exact-Math.round(exact))<0.025?Math.max(0,Math.round(exact)):null;
    if(row&&expected===null)errors.push('تحويل الشد يحتاج مراجعة');
    const product=productMatches[0];
    return {index:i+1,barcode,sku,displaySku:supplied,capacity:entry.capacity,name:row?.name||'',unit:row?.unit||'',pack:row?.pack??null,warehouseQuantity:row?.quantity??null,expectedPieces:expected,trendyolQuantity:product?.quantity??null,salePrice:product?.salePrice??null,delta:product&&expected!==null?expected-product.quantity:null,issues:errors,eligible:errors.length===0};
  });
  return mappings;
}
async function orderWindow(start,end){
  const result=[]; let limited=false;
  for(let page=0;page<20;page++){
    const data=await api('order/sellers/{sellerId}/v2/orders',{startDate:start,endDate:end,page,size:200,orderByField:'PackageLastModifiedDate',orderByDirection:'DESC'});
    const batch=Array.isArray(data.content)?data.content:[];
    result.push(...batch);
    if(batch.length<200||(Number.isFinite(Number(data.totalPages))&&page+1>=Number(data.totalPages)))return {result,limited:false};
    limited=true;
  }
  return {result,limited};
}
async function orders(days){
  const now=Date.now(), start=now-days*86400000, all=[];let limited=false;
  for(let left=start;left<now;left+=12*86400000){
    const right=Math.min(now,left+12*86400000);
    const chunk=await orderWindow(left,right);
    all.push(...chunk.result);limited=limited||chunk.limited;
  }
  const unique=new Map();
  for(const x of all){const id=String(x.shipmentPackageId||x.id||'');if(!id)continue;const prev=unique.get(id);if(!prev||number(x.lastModifiedDate)>=number(prev.lastModifiedDate))unique.set(id,x);}
  const raw=[...unique.values()].filter(x=>!x.orderCountryCode||normal(x.orderCountryCode)==='SA');
  const mapped=raw.map(o=>({id:String(o.shipmentPackageId||o.id),number:String(o.orderNumber||''),date:number(o.orderDate),status:normal(o.shipmentPackageStatus||o.status),currency:String(o.currencyCode||'SAR'),gross:number(o.packageGrossAmount),discount:number(o.packageTotalDiscount),amount:number(o.packageGrossAmount)-number(o.packageTotalDiscount),lines:(Array.isArray(o.lines)?o.lines:[]).map(l=>({barcode:normal(l.barcode),sku:normal(l.stockCode),name:String(l.productName||''),quantity:number(l.quantity),gross:number(l.lineGrossAmount),discount:number(l.lineTotalDiscount)}))})).sort((a,b)=>b.date-a.date);
  const excluded=new Set(['CANCELLED','RETURNED','UNSUPPLIED','UNPACKED','UNDELIVERED','AWAITING','VERIFIED']);
  const approved=mapped.filter(x=>!excluded.has(x.status));
  const totals={},byDay={},top={};let pending=0,cancelled=0;
  for(const o of mapped){if(['CREATED','PICKING','INVOICED'].includes(o.status))pending++;if(excluded.has(o.status))cancelled++;}
  for(const o of approved){
    const cur=o.currency||'SAR';totals[cur]=(totals[cur]||0)+o.amount;
    const date=new Date(o.date).toISOString().slice(0,10),key=date+'-'+cur;
    byDay[key]=(byDay[key]||0)+o.amount;
    for(const line of o.lines){const k=line.barcode||line.sku||line.name;if(!top[k])top[k]={barcode:line.barcode,name:line.name,quantity:0,amount:0};top[k].quantity+=line.quantity;top[k].amount+=line.gross-line.discount;}
  }
  return {days,orders:mapped,totals,orderCount:approved.length,pending,cancelled,byDay:Object.entries(byDay).map(([key,amount])=>({date:key.slice(0,10),currency:key.slice(11),amount})).sort((a,b)=>a.date.localeCompare(b.date)),top:Object.values(top).sort((a,b)=>b.quantity-a.quantity).slice(0,15),limited,fetchedAt:Date.now(),note:'مؤشرات الطلبات وفق حالاتها، وليست صافي التسويات البنكية أو الأرباح.'};
}
module.exports=async function handler(req,res){
  if(!secureRequest(req))return http(res,403,{error:'طلب من مصدر غير موثوق'});
  if(req.method==='POST'){
    const action=req.body?.action;
    if(action==='login'){
      const pass=process.env.TRENDYOL_DASHBOARD_PASS;
      if(!pass||!process.env.TRENDYOL_SESSION_SECRET)return http(res,503,{error:'حماية لوحة ترنديول لم تُضبط بعد'});
      if(!safeEqual(req.body?.password,pass))return http(res,401,{error:'رمز دخول ترنديول غير صحيح'});
      res.setHeader('Set-Cookie','batco_trendyol='+makeSession()+'; HttpOnly; Secure; SameSite=Strict; Path=/api/trendyol; Max-Age=21600');
      return http(res,200,{ok:true});
    }
    if(!validSession(req))return http(res,401,{error:'انتهت جلسة ترنديول، سجّل الدخول'});
    if(action==='logout'){res.setHeader('Set-Cookie','batco_trendyol=; HttpOnly; Secure; SameSite=Strict; Path=/api/trendyol; Max-Age=0');return http(res,200,{ok:true});}
    return http(res,405,{error:'لا يُسمح بتعديل بيانات ترنديول قبل اعتماد المطابقة والوحدات'});
  }
  if(req.method!=='GET')return http(res,405,{error:'طريقة غير مدعومة'});
  if(!validSession(req))return http(res,401,{error:'الدخول إلى ترنديول يتطلب جلسة محمية'});
  try{
    const action=String(req.query?.action||'status');
    if(action==='status')return http(res,200,{sellerId:SELLER(),region:'SA',warehouse:'jeddah',configured:Boolean(SELLER()&&process.env.TRENDYOL_API_KEY&&process.env.TRENDYOL_API_SECRET),stockWritesEnabled:false,fetchedAt:Date.now()});
    if(action==='orders')return http(res,200,await orders(req.query?.days==='30'?30:7));
    if(action==='stock'){
      const [warehouse,productList]=await Promise.all([jeddah(),products()]);
      const rows=mappingRows(warehouse,productList.items);
      return http(res,200,{rows,summary:{total:rows.length,ready:rows.filter(x=>x.eligible).length,blocked:rows.filter(x=>!x.eligible).length,withDiscrepancy:rows.filter(x=>x.eligible&&x.delta!==0).length,unmatchedProducts:productList.items.filter(x=>!stockMap.some(m=>normal(m.barcode)===x.barcode)).length,productListIncomplete:productList.more},jeddahSnapshotSha:warehouse.sha,warehouse:'jeddah',fetchedAt:Date.now()});
    }
    return http(res,404,{error:'الوظيفة غير موجودة'});
  }catch(err){console.error('Trendyol dashboard operation failed',String(err.message||'unknown').replace(/[\r\n]/g,' ').slice(0,180));return http(res,err.status||502,{error:err.status===503?err.message:'تعذر جلب بيانات ترنديول أو مخزون جدة. حاول مرة أخرى أو افحص إعدادات API.'});}
};