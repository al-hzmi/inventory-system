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
 const indices={sku:col(/رقم الصنف|sku/i,0),name:col(/اسم الصنف|name/i,1),quantity:col(/الكمية المتوفرة|كمية|quantity/i,3)};
 const rows=[],used=new Set();
 for(const line of lines){
  const t=line.split('\t'),sku=key(t[indices.sku]),qty=Number(ascii(t[indices.quantity]).replace(/[,٬]/g,''));
  if(!sku)continue;
  if(used.has(sku))throw Error('DUPLICATE_SKU '+sku);
  if(!Number.isFinite(qty)||qty<0)throw Error('INVALID_QUANTITY '+sku);
  used.add(sku);rows.push({sku,name:String(t[indices.name]||'').trim(),warehouseQty:qty});
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
global.BranchPresenceCore=Object.freeze({key,compact,inventory,resolve,summary,csv});
})(typeof window!=='undefined'?window:globalThis);
