/* BATCO V89 — shared barcode verification for branch, stocktake & employee search.
   Run consistent decoding BEFORE any accept/success cue. A verified read never implies cloud sync. */
(function(root){
'use strict';
const formatKeys=['CODE_128','CODE_39','CODE_93','EAN_13','EAN_8','UPC_A','UPC_E','ITF','CODABAR','QR_CODE','DATA_MATRIX'];
const digits=s=>String(s??'').trim().replace(/[٠-٩۰-۹]/g,d=>String(('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(d))%10));
function checksum(code){
 const s=digits(code);
 if(!/^(?:\d{8}|\d{12}|\d{13})$/.test(s))return false;
 let sum=0;for(let i=s.length-2,m=0;i>=0;i--,m++)sum+=Number(s[i])*(m%2?1:3);
 return (10-sum%10)%10===Number(s[s.length-1]);
}
function normalize(raw){return digits(raw).toUpperCase()}
function formats(F={}){
 return formatKeys.map(k=>F[k]).filter(n=>typeof n==='number'&&Number.isFinite(n));
}
function cameraOptions(high=true){
 const cfg={
  fps:16,
  aspectRatio:4/3,
  disableFlip:true,
  qrbox:(w,h)=>({width:Math.max(80,Math.min(Math.floor(Number(w)*.97),Number(w))),height:Math.max(80,Math.min(Math.floor(Number(h)*.78),Number(h)))})
 };
 if(high)cfg.videoConstraints={facingMode:'environment',width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30}};
 return cfg;
}
/* Trust two independent confirmations for linear retail codes, three when both
   reads come from the same engine. Reject invalid EAN at source, not later. */
function createVerifier({onConfirm,now=()=>Date.now(),windowMs=1300,minGapMs=55}={}){
 const candidates=new Map();
 let lastConfirmed='',confirmedAt=-Infinity;
 function push(raw,engine='zxing'){
  const code=normalize(raw),time=now(),kind=String(engine||'zxing');
  if(!code||code.length>128||/[\x00-\x1f]/.test(code))return {accepted:false,reason:'invalid'};
  if(/^\d{8}$|^\d{12}$|^\d{13}$/.test(code)&&!checksum(code))return {accepted:false,reason:'checksum'};
  if(code===lastConfirmed&&time-confirmedAt<1900)return {accepted:false,reason:'duplicate-frame'};
  for(const [k,v] of candidates)if(time-v.at>windowMs)candidates.delete(k);
  const record=candidates.get(code)||{count:0,engines:new Set(),at:time,lastAt:-Infinity};
  if(time-record.at>windowMs){record.count=0;record.engines.clear();record.at=time;record.lastAt=-Infinity}
  if(time-record.lastAt>=minGapMs){record.count++;record.lastAt=time;record.engines.add(kind)}
  candidates.set(code,record);
  const numeric=/^\d{8,13}$/.test(code);
  const required=numeric?(record.engines.size>1?2:3):2;
  if(record.count<required)return {accepted:false,reason:'confirming',count:record.count,required};
  candidates.clear();lastConfirmed=code;confirmedAt=time;
  try{onConfirm?.(code)}catch{}
  return {accepted:true,code};
 }
 return {push,reset(){candidates.clear();lastConfirmed='';confirmedAt=-Infinity}};
}
/* Manufacturer label observed on actual BATCO ARAB RIVER products.
   Use ONLY verified five digits and an EAN checksum, never random substring.
   For codes not recognized, return original text for manual review. */
function skuFromBarcode(raw){
 const value=normalize(raw);
 if(/^5469835\d{6}$/.test(value)&&checksum(value))
   return 'AR_'+String(Number(value.slice(7,12)));
 return value;
}
function lookup(raw,items,getSku=item=>item.sku||item.id){
 const id=skuFromBarcode(raw),list=Array.isArray(items)?items:[];
 const hits=list.filter(it=>normalize(getSku(it))===id);
 return hits.length===1?{item:hits[0],query:id,matched:true}: {item:null,query:id,matched:false,ambiguous:hits.length>1};
}
root.BatcoScanPro=Object.freeze({checksum,normalize,formats,cameraOptions,createVerifier,skuFromBarcode,lookup});
})(typeof window!=='undefined'?window:globalThis);
