#!/usr/bin/env python3
from pathlib import Path

p=Path('runtime/customer-v37-source.txt')
s=p.read_text(encoding='utf-8')
wrapper=Path('customer.html')
w=wrapper.read_text(encoding='utf-8')

if "const normalizeSkuKey = s =>" in s:
    print('V56.25 customer image identity already present')
else:
    old="const normalizeCleanId = s => toEnglishDigits(s).replace(/\\D/g,'');"
    new=old+"\nconst normalizeSkuKey = s => toEnglishDigits(String(s??'')).trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'');"
    if old not in s: raise SystemExit('CUSTOMER_NORMALIZE_ANCHOR_MISSING')
    s=s.replace(old,new,1)

    old_item="map.set(cleanId,{cleanId,id,name:nameIdx>=0?(c[nameIdx]||''):'',qty:Number.isFinite(q)?q:0,unit:unitIdx>=0?(c[unitIdx]||''):'',pack:packIdx>=0?(c[packIdx]||''):''});"
    new_item="map.set(cleanId,{cleanId,skuKey:normalizeSkuKey(id),id,name:nameIdx>=0?(c[nameIdx]||''):'',qty:Number.isFinite(q)?q:0,unit:unitIdx>=0?(c[unitIdx]||''):'',pack:packIdx>=0?(c[packIdx]||''):''});"
    if old_item not in s: raise SystemExit('CUSTOMER_ITEM_ANCHOR_MISSING')
    s=s.replace(old_item,new_item,1)

    start=s.find('function buildImagesMap(text){')
    end=s.find('\nfunction parseCategories',start)
    if start<0 or end<0: raise SystemExit('CUSTOMER_IMAGES_MAP_ANCHOR_MISSING')
    repl=r'''function buildImagesMap(text){
  const exact=new Map(),numeric=new Map();
  String(text||'').split(/\r?\n/).forEach(line=>{
    const raw=line.trim();if(!raw||raw.startsWith('#'))return;
    const parts=raw.split(/\t/);let sourceKey='',file='';
    if(parts.length>=2){sourceKey=parts[0].trim();file=parts.slice(1).join('\t').trim()}
    else{file=raw;const base=file.split('/').pop().split('?')[0];sourceKey=base.replace(/\.[^.]+$/,'')}
    if(!sourceKey||!file)return;
    const sku=normalizeSkuKey(sourceKey),num=normalizeCleanId(sourceKey);
    if(/[A-Za-z]/.test(sourceKey)&&sku)exact.set(sku,file);
    else if(num)numeric.set(num,file);
  });
  return {exact,numeric};
}
function getImageForItem(images,item){
  if(!images||!item)return'';
  const sku=normalizeSkuKey(item.skuKey||item.id||'');
  if(sku&&images.exact?.has(sku))return images.exact.get(sku)||'';
  const num=normalizeCleanId(item.cleanId||item.id||'');
  return num?(images.numeric?.get(num)||''):'';
}
'''
    s=s[:start]+repl+s[end:]

    old_load="const merged=mergeInventories(parseInventory(j),parseInventory(r)).filter(x=>x.allowedMax>=CART_STEP&&images.has(x.cleanId)).map(x=>{const cartonPrice=Number(pricing[x.cleanId]||0);const packNum=parseFloat(toEnglishDigits(x.pack||'').replace(/[^0-9.]/g,''));return {...x,imageFile:images.get(x.cleanId)||'',cartonPrice,approxPrice:cartonPrice>0&&Number.isFinite(packNum)&&packNum>0?cartonPrice/packNum:0}});"
    new_load="const merged=mergeInventories(parseInventory(j),parseInventory(r)).filter(x=>x.allowedMax>=CART_STEP&&getImageForItem(images,x)).map(x=>{const cartonPrice=Number(pricing[x.cleanId]||0);const packNum=parseFloat(toEnglishDigits(x.pack||'').replace(/[^0-9.]/g,''));return {...x,imageFile:getImageForItem(images,x),cartonPrice,approxPrice:cartonPrice>0&&Number.isFinite(packNum)&&packNum>0?cartonPrice/packNum:0}});"
    if old_load not in s: raise SystemExit('CUSTOMER_LOAD_ANCHOR_MISSING')
    s=s.replace(old_load,new_load,1)
    p.write_text(s,encoding='utf-8')

if "./runtime/customer-v37-source.txt?v=56.25" not in w:
    import re
    w,n=re.subn(r"\./runtime/customer-v37-source\.txt\?v=[0-9.]+","./runtime/customer-v37-source.txt?v=56.25",w,count=1)
    if n!=1: raise SystemExit('CUSTOMER_WRAPPER_CACHE_ANCHOR_MISSING')
    wrapper.write_text(w,encoding='utf-8')

print('V56.25 customer exact image identity applied')
