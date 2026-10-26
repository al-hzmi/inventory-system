/* V80: barcode presence and warehouse-only unobserved inventory. Pure, no writes. */
(function(global){
'use strict';
const digits='٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
const ascii=s=>String(s??'').replace(/[٠-٩۰-۹]/g,d=>String(digits.indexOf(d)%10));
const key=s=>ascii(s).trim().toUpperCase();
const compact=s=>key(s).replace(/[^A-Z0-9]/g,'');
const csvCell=v=>{const s=String(v??'').replace(/^\s*([=+@\-])/,"'$1");return '"'+s.replace(/"/g,'""')+'"';};
function inventory(text){
 const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
 const head=(lines.shift()||'').split('\t'),col=(re,fallback)=>{const n=head.findIndex(h=>re.test(h));return n<0?fallback:n};
 const indices={sku:col(/رقم الصنف|sku/i,0),name:col(/اسم الصنف|name/i,1),quantity:col(/الكمية المتوفرة|كمية|quantity/i,3),barcode:col(/رقم الباركود|باركود|barcode|ean|upc/i,-1)};
 const rows=[],used=new Set();
 for(const line of lines){
  const t=line.split('\t'),sku=key(t[indices.sku]),qty=Number(ascii(t[indices.quantity]).replace(/[,٬]/g,''));
  if(!sku)continue;
  if(used.has(sku))throw Error('DUPLICATE_SKU '+sku);
  if(!Number.isFinite(qty)||qty<0)throw Error('INVALID_QUANTITY '+sku);
  const barcodes=indices.barcode<0?[]:String(t[indices.barcode]||'').split(/[|;,]/).map(x=>key(x)).filter(Boolean);
  used.add(sku);rows.push({sku,name:String(t[indices.name]||'').trim(),warehouseQty:qty,barcodes});
 }
 if(!rows.length)throw Error('EMPTY_WAREHOUSE');
 return rows;
}
function resolve(input,products){
 const q=key(input);if(!q)return {item:null,reason:'empty'};
 const exact=products.filter(p=>key(p.sku)===q);
 if(exact.length===1)return {item:exact[0],reason:'exact'};
 if(exact.length>1)return {item:null,reason:'ambiguous'};
 const normalized=compact(q);
 const compactMatches=products.filter(p=>compact(p.sku)===normalized);
 if(compactMatches.length===1)return {item:compactMatches[0],reason:'normalized'};
 if(compactMatches.length>1)return {item:null,reason:'ambiguous'};
 // Scan guns often emit EAN digits wrapping the product code. Only accept an unambiguous full SKU digit suffix.
 const digitsOnly=ascii(q).replace(/\D/g,'');
 if(/^\d{4,}$/.test(q)){
  const suffix=products.filter(p=>String(p.sku||'').replace(/\D/g,'')===digitsOnly);
  if(suffix.length===1)return {item:suffix[0],reason:'unique-number'};
  if(suffix.length>1)return {item:null,reason:'ambiguous'};
 }
 if(digitsOnly.length>=8){
  const matches=products.filter(p=>{
   const itemDigits=String(p.sku||'').replace(/\D/g,'');
   return itemDigits.length>=4 && digitsOnly.includes(itemDigits);
  });
  if(matches.length===1)return {item:matches[0],reason:'embedded'};
  if(matches.length>1)return {item:null,reason:'ambiguous',candidates:matches.slice(0,6)};
 }
 return {item:null,reason:'unknown'};
}
function checkEAN(value){
 const digits=String(value||'');
 if(!/^\d{8}$|^\d{12}$|^\d{13}$/.test(digits))return false;
 let sum=0;
 for(let i=digits.length-2,m=0;i>=0;i--,m++)sum+=Number(digits[i])*(m%2===0?3:1);
 return (10-sum%10)%10===Number(digits[digits.length-1]);
}
/* BARCODE-TO-SKU: manufacturer-verified label pattern, never arbitrary substring.
   A real ARAB RIVER product label photographed in Jeddah shows:
   AR: 25978 => EAN 5469835|25978|9. Verify EAN check digit first.
   AR: 21597 => EAN 6864553|21597|7; AR: 21777 => EAN 6864553|21777|3.
   Only these observed fixed 7-digit manufacturer prefixes are trusted. */
const trustedArabRiverPrefixes=new Set(['5469835','6864553']);
function manufacturerEAN(raw,products){
 const q=key(raw);
 if(!/^\d{13}$/.test(q)||!trustedArabRiverPrefixes.has(q.slice(0,7))||!checkEAN(q))return {item:null,reason:'unlinked-ean'};
 const itemDigits=q.slice(7,12);
 const candidates=products.filter(p=>{
   const sku=key(p.sku);
   const match=/^AR[_\s-]?(\d{1,5})$/.exec(sku);
   return match&&match[1].padStart(5,'0')===itemDigits;
 });
 if(candidates.length===1)return {item:candidates[0],reason:'verified-manufacturer-ean'};
 if(candidates.length>1)return {item:null,reason:'ambiguous'};
 return {item:null,reason:'unlinked-ean'};
}
/* A decoded retail EAN is not a partial SKU; no fuzzy substring matching. */
function resolveScan(raw,products){
 const q=key(raw);
 if(!q)return {item:null,reason:'empty'};
 const exact=products.filter(p=>key(p.sku)===q||[p.barcode,...(Array.isArray(p.barcodes)?p.barcodes:[])].filter(Boolean).some(v=>key(v)===q));
 if(exact.length===1)return {item:exact[0],reason:'linked-barcode'};
 if(exact.length>1)return {item:null,reason:'ambiguous'};
 if(checkEAN(q))return {...manufacturerEAN(q,products),raw:q};
 // A checksum-invalid retail-length number is never a fuzzy SKU match.
 if(/^\d{8}$|^\d{12}$|^\d{13}$/.test(q))return {item:null,reason:'invalid-ean',raw:q};
 return resolve(q,products);
}
function summary(products,seen,closed){
 const recorded=seen instanceof Set?seen:new Set(seen||[]);
 const available=products.filter(p=>p.warehouseQty>0);
 const observed=available.filter(p=>recorded.has(p.sku));
 const notObserved=available.filter(p=>!recorded.has(p.sku));
 return {total:available.length,observed:observed.length,notObserved:notObserved.length,notObservedItems:notObserved,complete:Boolean(closed)};
}
function csv(rows,meta={}){
 const titles=['الفرع','المستودع المرجعي','رقم الصنف','اسم الصنف','كمية المستودع المرجعية','حالة الرصد'];
 const lines=[titles.map(csvCell).join(',')];
 for(const p of rows)lines.push([meta.branch||'',meta.warehouse||'',p.sku,p.name,p.warehouseQty,meta.status||'لم يُرصد خلال الجرد'].map(csvCell).join(','));
 return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
global.BranchPresenceCore=Object.freeze({key,compact,inventory,resolve,resolveScan,manufacturerEAN,checkEAN,summary,csv});
})(typeof window!=='undefined'?window:globalThis);
