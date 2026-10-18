/* BATCO V79 branch inventory: pure comparison engine, no backend writes. */
(function (global) {
  'use strict';
  const digits='٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
  const normalizeDigits=value=>String(value??'').replace(/[٠-٩۰-۹]/g,d=>String(digits.indexOf(d)%10));
  function quantity(value) {
    const raw=normalizeDigits(value).trim().replace(/٫/g,'.');
    if (!/^(?:\d+|\d{1,3}(?:[,٬]\d{3})+)(?:\.\d+)?$/.test(raw)) return NaN;
    const number=Number(raw.replace(/[,٬]/g,''));
    return Number.isFinite(number)&&number>=0&&number<=Number.MAX_SAFE_INTEGER?number:NaN;
  }
  const sku=value=>normalizeDigits(value).trim().toUpperCase();
  const name=value=>String(value??'').trim().toLowerCase().replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/\s+/g,' ');
  function inventory(text) {
    const lines=String(text??'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
    if(lines.length<2)throw Error('EMPTY_WAREHOUSE');
    const h=lines.shift().split('\t').map(x=>x.trim());
    const col=(pattern,backup)=>{const i=h.findIndex(x=>pattern.test(x));return i>=0?i:backup};
    const skuCol=col(/رقم الصنف|sku|item/i,0),nameCol=col(/اسم الصنف|name/i,1),unitCol=col(/وحد|unit/i,2),
      qtyCol=col(/كمية|qty|quantity/i,3),packCol=col(/شد|pack/i,4);
    const seen=new Set(),result=[];
    for(const line of lines) {
      const c=line.split('\t'),id=sku(c[skuCol]);
      if(!id)continue;
      if(seen.has(id))throw Error('DUPLICATE_SKU:'+id);
      const available=quantity(c[qtyCol]);
      if(!Number.isFinite(available))throw Error('INVALID_WAREHOUSE_QTY:'+id);
      seen.add(id);
      result.push({sku:id,name:String(c[nameCol]||'').trim(),unit:String(c[unitCol]||'').trim(),warehouseQty:available,pack:String(c[packCol]||'').trim()});
    }
    if(!result.length)throw Error('EMPTY_WAREHOUSE');
    return result;
  }
  function status(item,entry) {
    if(!entry||!Object.hasOwn(entry,'qty'))return 'pending';
    const actual=quantity(entry.qty);
    if(!Number.isFinite(actual))return 'pending';
    if(actual>0)return 'present';
    return item.warehouseQty>0?'missing':'both-empty';
  }
  function report(products,entries) {
    const rows=products.map(item=>{const entry=entries?.[item.sku]||null;const state=status(item,entry);return {...item,branchQty:state==='pending'?null:quantity(entry.qty),status:state,checkedAt:entry?.at||''}});
    const counts={total:rows.length,pending:0,checked:0,missing:0,present:0,bothEmpty:0};
    for(const row of rows){if(row.status==='pending')counts.pending++;else counts.checked++;
      if(row.status==='missing')counts.missing++;
      if(row.status==='present')counts.present++;
      if(row.status==='both-empty')counts.bothEmpty++;
    }
    return {rows,counts,missing:rows.filter(row=>row.status==='missing')};
  }
  const safeCell=value=>{
    let str=String(value??'');
    if(/^[\s]*[=+@\-]/.test(str))str="'"+str;
    return '"'+str.replace(/"/g,'""')+'"';
  };
  function csv(rows,meta={}) {
    const label={pending:'لم يُجرد',present:'موجود في الفرع',missing:'متوفر بالمستودع وغير موجود بالفرع','both-empty':'غير موجود في الموقعين'};
    const head=['الفرع','المستودع المرجعي','رقم الصنف','اسم الصنف','الوحدة','الشد','كمية المستودع (مرجع)','كمية الفرع (جرد)','الحالة','تاريخ التحقق'];
    const lines=[head.map(safeCell).join(',')];
    for(const row of rows)lines.push([
      meta.branch||'',meta.warehouse||'',row.sku,row.name,row.unit,row.pack,
      row.warehouseQty,row.branchQty==null?'':row.branchQty,label[row.status]||'لم يُجرد',row.checkedAt||''
    ].map(safeCell).join(','));
    return '\uFEFF'+lines.join('\r\n')+'\r\n';
  }
  global.BatcoBranchCore=Object.freeze({quantity,sku,name,inventory,status,report,csv});
})(typeof window!=='undefined'?window:globalThis);
