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
async function jeddah(){
  const token=process.env.GITHUB_TOKEN,owner=process.env.GITHUB_OWNER||'al-hzmi',repo=process.env.GITHUB_REPO||'inventory-system';
  const path='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo)+'/contents/data/jeddah.tsv?ref=main';
  const r=await fetch(path,{headers:{Accept:'application/vnd.github+json',...(token?{Authorization:'Bearer '+token}:{})},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok)throw statusError(502,'تعذرت قراءة دليل أسماء الأصناف');
  const body=await r.json();
  const content=Buffer.from(String(body.content||'').replace(/\s/g,''),'base64').toString('utf8');
  const lines=content.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
  const cols=(lines.shift()||'').split('\t').map(x=>x.trim());
  const idx=['رقم الصنف','اسم الصنف'].map(x=>cols.indexOf(x));
  if(idx.some(x=>x<0))throw statusError(502,'أعمدة ملف جدة غير متوافقة');
  const rows=new Map();
  for(const line of lines){
    const c=line.split('\t'),[sku,name]=idx.map(x=>(c[x]||'').trim());
    if(sku)rows.set(normal(sku),{sku:normal(sku),name});
  }
  return {rows,sha:body.sha||null};
}
async function orderWindow(start,end){
  const result=[]; let limited=false;
  for(let page=0;page<20;page++){
    const data=await api('order/sellers/{sellerId}/v2/orders',{startDate:start,endDate:end,page,size:200,orderByField:'PackageLastModifiedDate',orderByDirection:'DESC'});
    const batch=Array.isArray(data.content)?data.content:[];
    result.push(...batch);
    if(!Array.isArray(data.content))return {result,limited:true};
    const pages=data.totalPages==null?NaN:Number(data.totalPages);
    if(Number.isInteger(pages)&&pages>=0){if(pages===0&&batch.length)return {result,limited:true};if(page+1>=pages)return {result,limited:false};if(batch.length===0)return {result,limited:true};}
    else if(batch.length<200)return {result,limited:false};
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
  for(const x of all){const id=String(x.shipmentPackageId||x.id||'');if(!id){limited=true;continue;}const prev=unique.get(id);if(!prev||number(x.lastModifiedDate)>=number(prev.lastModifiedDate))unique.set(id,x);}
  const raw=[...unique.values()].filter(x=>!x.orderCountryCode||normal(x.orderCountryCode)==='SA');
  const mapped=raw.map(o=>({id:String(o.shipmentPackageId||o.id),number:String(o.orderNumber||''),date:number(o.orderDate),status:normal(o.shipmentPackageStatus||o.status),currency:String(o.currencyCode||'SAR'),gross:number(o.packageGrossAmount),discount:number(o.packageTotalDiscount),amount:number(o.packageGrossAmount)-number(o.packageTotalDiscount),lines:(Array.isArray(o.lines)?o.lines:[]).map((l,i)=>({id:String(l.id||l.orderLineItemId||i),sourceId:l.id||l.orderLineItemId?String(l.id||l.orderLineItemId):null,barcode:normal(l.barcode),sku:normal(l.stockCode),name:String(l.productName||''),quantity:number(l.quantity),gross:number(l.lineGrossAmount),discount:number(l.lineTotalDiscount)}))})).sort((a,b)=>b.date-a.date);
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

// Sales-to-payout reconciliation is deliberately conservative: an order status is never a proof of payment.
async function financeWindow(kind,type,start,end){
  const path='finance/che/sellers/{sellerId}/'+(kind==='payment'?'otherfinancials':'settlements');
  const records=[];let limited=false;
  for(let page=0;page<8;page++){
    const data=await api(path,{startDate:start,endDate:end,transactionType:type,page,size:500});
    const part=Array.isArray(data.content)?data.content:[];
    records.push(...part);
    if(!Array.isArray(data.content))return {records,limited:true};
    const pages=data.totalPages==null?NaN:Number(data.totalPages);
    if(Number.isInteger(pages)&&pages>=0){if(pages===0&&part.length)return {records,limited:true};if(page+1>=pages)return {records,limited:false};if(part.length===0)return {records,limited:true};}
    else if(part.length<500)return {records,limited:false};
    limited=true;
  }
  return {records,limited};
}
async function financialRecords(days){
  const now=Date.now(),from=now-days*86400000,jobs=[];
  for(let fromMs=from;fromMs<now;fromMs+=12*86400000){
    const until=Math.min(now,fromMs+12*86400000);
    for(const [kind,type] of [['sale','Sale'],['return','Return'],['payment','PaymentOrder']])jobs.push({kind,type,fromMs,until});
  }
  const chunks=[];let cursor=0;
  // Limit parallel external calls to avoid rate-limit spikes.
  await Promise.all(Array.from({length:Math.min(3,jobs.length)},async()=>{
    while(cursor<jobs.length){const job=jobs[cursor++];const result=await financeWindow(job.kind,job.type,job.fromMs,job.until);chunks.push({kind:job.kind,...result});}
  }));
  const byType={sale:new Map(),return:new Map(),payment:new Map()};let limited=false;
  for(const chunk of chunks){
    limited=limited||chunk.limited;
    for(const row of chunk.records){
      // A composite fallback cannot prove that two equal transactions are the same.
      // Preserve the partial result but withhold financial reconciliation.
      if(!row.id)limited=true;
      const key=String(row.id||'')||[row.orderNumber,row.barcode,row.transactionDate,row.paymentOrderId,row.credit,row.debt].join('|');
      byType[chunk.kind].set(key,row);
    }
  }
  return {sale:[...byType.sale.values()],returns:[...byType.return.values()],payment:[...byType.payment.values()],limited};
}
function productSales(ordersData,financeData,warehouse){
  const excluded=new Set(['CANCELLED','RETURNED','UNSUPPLIED','UNPACKED','UNDELIVERED','AWAITING','VERIFIED']);
  const byBarcode=new Map(),bySku=new Map();
  const candidates=raw=>{
    const bare=raw.startsWith('OGS_')?raw.slice(4):raw, prefixed='OGS_'+bare;
    if(warehouse?.rows.has(bare)&&warehouse?.rows.has(prefixed))return [bare,prefixed];
    if(warehouse?.rows.has(raw))return [raw];
    if(warehouse?.rows.has(prefixed))return [prefixed];
    if(warehouse?.rows.has(bare))return [bare];
    return [raw];
  };
  for(const entry of stockMap){
    const barcode=normal(entry.barcode),raw=normal(entry.sku);
    if(!byBarcode.has(barcode))byBarcode.set(barcode,new Set());
    for(const sku of candidates(raw)){
      byBarcode.get(barcode).add(sku);
      if(!bySku.has(sku))bySku.set(sku,new Set());
      bySku.get(sku).add(barcode);
    }
  }
  const payments=new Map(),sales=new Map(),returns=new Set();
  if(financeData){
    for(const row of financeData.payment){
      const id=String(row.paymentOrderId??'');
      if(id)payments.set(id,row);
    }
    for(const row of financeData.sale){
      const k=normal(row.orderNumber)+'|'+normal(row.barcode);
      if(!sales.has(k))sales.set(k,[]);
      sales.get(k).push(row);
    }
    for(const row of financeData.returns)returns.add(normal(row.orderNumber)+'|'+normal(row.barcode));
  }
  const mapped=new Map(),seenOrderLines=new Set();
  const duplicateCandidates=new Map(),sourceOccurrences=new Map();
  for(const o of ordersData.orders)for(const l of o.lines){
    const k=normal(o.number)+'|'+normal(l.barcode);
    duplicateCandidates.set(k,(duplicateCandidates.get(k)||0)+1);
    if(l.sourceId){const source=normal(o.number)+'|'+normal(l.sourceId);sourceOccurrences.set(source,(sourceOccurrences.get(source)||0)+1);}
  }
  let salesUnits=0,paidUnits=0,unconfirmedUnits=0,excludedUnits=0,ambiguousUnits=0,possibleDuplicateUnits=0;
  const toCents=v=>Math.round(number(v)*100);
  for(const order of ordersData.orders){
    const skip=normal(order.status)!=='DELIVERED';
    for(const line of order.lines){
      const barcode=normal(line.barcode),rawSku=normal(line.sku),possible=byBarcode.get(barcode);
      const sku=possible?.size===1?[...possible][0]:'غير مرتبط: '+(barcode||rawSku||'غير معروف');
      const key=sku||barcode||line.name;
      const quantity=number(line.quantity);
      if(quantity<=0)continue;
      const gross=number(line.gross)-number(line.discount);
      // A line identifier repeated across packages may describe either a split or a duplicate.
      // Exclude all such occurrences from totals until the source semantics are verified.
      const repeatedSource=Boolean(line.sourceId&&(sourceOccurrences.get(normal(order.number)+'|'+normal(line.sourceId))||0)>1);
      const lineKey='package:'+ [order.id,line.sourceId||line.id||'',barcode,rawSku,quantity,toCents(gross)].join('|');
      if(seenOrderLines.has(lineKey))continue;
      seenOrderLines.add(lineKey);
      if(!mapped.has(key))mapped.set(key,{sku:key,name:warehouse?.rows.get(key)?.name||line.name||'',barcodes:new Set(),requested:0,cancelled:0,returned:0,returnReview:false,quantity:0,paid:0,unconfirmed:0,ambiguous:0,excluded:0,possibleDuplicateUnits:0,value:0,details:[],stock:warehouse?.rows.get(key)||null});
      const item=mapped.get(key);
      if(barcode)item.barcodes.add(barcode);
      if(repeatedSource){
        possibleDuplicateUnits+=quantity;item.possibleDuplicateUnits+=quantity;
        item.details.push({orderNumber:order.number,date:order.date,status:order.status,barcode,quantity,value:gross,payment:'ambiguous',reason:'معرّف السطر مكرر؛ لا يمكن تحديد الكمية دون مراجعة'});
        continue;
      }
      item.requested+=quantity;
      if(normal(order.status)==='CANCELLED')item.cancelled+=quantity;
      if(normal(order.status)==='RETURNED')item.returned+=quantity;
      if(!skip&&returns.has(normal(order.number)+'|'+barcode))item.returnReview=true;
      let payment='unavailable',reason='بيانات السداد غير متاحة';
      if(skip){payment='excluded';reason='الطلب لم يثبت تسليمه ضمن هذه الفترة';}
      else if(financeData){
        const financialKey=normal(order.number)+'|'+barcode;
        const allRecords=sales.get(financialKey)||[];
        const packageRecords=allRecords.filter(r=>String(r.shipmentPackageId||'')===String(order.id));
        const records=packageRecords.length?packageRecords:allRecords;
        // Even within a package, one order/barcode finance record must not pay several lines.
        const multiplePackages=(duplicateCandidates.get(financialKey)||0)>1;
        const pids=[...new Set(records.map(r=>String(r.paymentOrderId??'')).filter(Boolean))];
        const confirmed=records.length>0&&pids.length===1&&records.every(r=>String(r.paymentOrderId??'')===pids[0])&&payments.has(pids[0]);
        const amountsKnown=records.every(r=>r.credit!==null&&r.credit!==undefined&&String(r.credit).trim()!==''&&Number.isFinite(Number(r.credit)))&&gross>0;
        const recordGross=records.reduce((sum,r)=>sum+number(r.credit),0);
        const amountMatches=amountsKnown&&toCents(recordGross)===toCents(gross);
        const hasReturn=returns.has(normal(order.number)+'|'+barcode);
        if(!normal(order.number)||!barcode){payment='ambiguous';reason='رقم الطلب أو الباركود غير متاح للمطابقة';}
        else if(confirmed&&amountMatches&&!hasReturn&&!multiplePackages){payment='confirmed';reason='مطابق لسجل البيع وأمر الدفع والقيمة';}
        else if(hasReturn||multiplePackages){payment='ambiguous';reason=multiplePackages?'باركود مكرر في الطلب؛ يلزم ربط مالي موثوق بكل سطر':'توجد حركة إرجاع مالية؛ يلزم التدقيق';}
        else if(records.length&&(!amountMatches||pids.length>1)){payment='ambiguous';reason='سجل مالي موجود لكن مبلغ السطر أو أمر الدفع غير مطابق';}
        else {payment='unconfirmed';reason=records.length?'لم يظهر أمر دفع مؤكد':'لم تظهر تسوية مؤكدة لهذا السطر';}
      }
      item.details.push({orderNumber:order.number,date:order.date,status:order.status,barcode,quantity,value:gross,payment,reason});
      if(skip){item.excluded+=quantity;excludedUnits+=quantity;continue;}
      if((duplicateCandidates.get(normal(order.number)+'|'+barcode)||0)>1&&!line.sourceId){possibleDuplicateUnits+=quantity;item.possibleDuplicateUnits+=quantity;}
      salesUnits+=quantity;item.quantity+=quantity;item.value+=gross;
      if(payment==='confirmed'){item.paid+=quantity;paidUnits+=quantity;}
      else if(payment==='ambiguous'){item.ambiguous+=quantity;ambiguousUnits+=quantity;}
      else if(payment==='unconfirmed'){item.unconfirmed+=quantity;unconfirmedUnits+=quantity;}
    }
  }
  for(const entry of stockMap){
    const barcode=normal(entry.barcode),raw=normal(entry.sku),matches=candidates(raw);
    if(matches.length!==1)continue;
    const sku=matches[0];
    if(!mapped.has(sku))mapped.set(sku,{sku,name:warehouse?.rows.get(sku)?.name||'',barcodes:new Set(),requested:0,cancelled:0,returned:0,returnReview:false,quantity:0,paid:0,unconfirmed:0,ambiguous:0,excluded:0,possibleDuplicateUnits:0,value:0,details:[],stock:warehouse?.rows.get(sku)||null});
    mapped.get(sku).barcodes.add(barcode);
  }
  const rows=[...mapped.values()].map(item=>{
    const {stock,...rest}=item;
    return {...rest,barcodes:[...item.barcodes],details:item.details.sort((a,b)=>b.date-a.date)};
  }).sort((a,b)=>b.quantity-a.quantity);
  return {days:ordersData.days,rows,totals:{sold:salesUnits,paid:financeData?paidUnits:null,unconfirmed:financeData?unconfirmedUnits:null,ambiguous:financeData?ambiguousUnits:null,excluded:excludedUnits,possibleDuplicateUnits,amount:rows.reduce((sum,x)=>sum+x.value,0)},finance:{available:Boolean(financeData),complete:Boolean(financeData&&!financeData.limited),paymentOrders:financeData?.payment.length??null,saleRecords:financeData?.sale.length??null},ordersLimited:ordersData.limited,fetchedAt:Date.now(),note:'السداد المؤكد يعني مطابقة السطر المالي وأمر دفع من ترنديول، وليس تأكيد وصول الحوالة إلى الحساب البنكي. غير المؤكد لا يعني متأخر السداد.'};
}
async function comprehensiveSales(days){
  const [orderData,financeResult,warehouseResult]=await Promise.all([
    orders(days),
    financialRecords(days).then(value=>({value})).catch(e=>({error:String(e.message||'').slice(0,120)})),
    jeddah().then(value=>({value})).catch(e=>({error:String(e.message||'').slice(0,120)}))
  ]);
  const result=productSales(orderData,financeResult.value&&!financeResult.value.limited&&!orderData.limited?financeResult.value:null,warehouseResult.value||null);
  result.orderData={...orderData,orders:orderData.orders.slice(0,75),ordersTotal:orderData.orders.length};
  result.finance.error=financeResult.error?'تعذر قراءة سجلات التسوية من ترنديول.':(financeResult.value?.limited?'بيانات التسويات تجاوزت حد القراءة':'');
  result.warehouseAvailable=Boolean(warehouseResult.value);
  result.warehouseError=warehouseResult.error||'';
  return result;
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
    if(action==='status')return http(res,200,{sellerId:SELLER(),region:'SA',configured:Boolean(SELLER()&&process.env.TRENDYOL_API_KEY&&process.env.TRENDYOL_API_SECRET),stockWritesEnabled:false,fetchedAt:Date.now()});
    if(action==='orders')return http(res,200,await orders(req.query?.days==='30'?30:7));
    if(action==='product-sales')return http(res,200,await comprehensiveSales(req.query?.days==='30'?30:7));
    return http(res,404,{error:'الوظيفة غير موجودة'});
  }catch(err){console.error('Trendyol dashboard operation failed',String(err.message||'unknown').replace(/[\r\n]/g,' ').slice(0,180));return http(res,err.status||502,{error:err.status===503?err.message:'تعذر جلب بيانات ترنديول. حاول مرة أخرى أو افحص إعدادات الاتصال.'});}
};
