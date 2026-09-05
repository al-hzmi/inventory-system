#!/usr/bin/env python3
from pathlib import Path
import re

p=Path('runtime/customer-v37-source.txt')
s=p.read_text(encoding='utf-8')
wrapper=Path('customer.html')
w=wrapper.read_text(encoding='utf-8')

# One canonical image-SKU normalizer. Keep numeric cleanId untouched for prices/categories/cart.
if 'const normalizeImageSku = raw =>' not in s:
    anchor='function parseInventory(raw){\n'
    if anchor not in s: raise SystemExit('CUSTOMER_PARSE_ANCHOR_MISSING')
    s=s.replace(anchor,"const normalizeImageSku = raw => toEnglishDigits(String(raw||'')).trim().toUpperCase().replace(/\\s+/g,'').replace(/[^A-Z0-9_-]/g,'');\n\n"+anchor,1)

# parseInventory must preserve distinct SKUs such as BA_209 and AR_M209 instead of collapsing to 209.
patterns=[
("map.set(cleanId,{cleanId,id,name:nameIdx>=0?(c[nameIdx]||''):'',qty:Number.isFinite(q)?q:0,unit:unitIdx>=0?(c[unitIdx]||''):'',pack:packIdx>=0?(c[packIdx]||''):''});",
 "const imageSku=normalizeImageSku(id); if(!imageSku) continue;\n    map.set(imageSku,{cleanId,imageSku,id,name:nameIdx>=0?(c[nameIdx]||''):'',qty:Number.isFinite(q)?q:0,unit:unitIdx>=0?(c[unitIdx]||''):'',pack:packIdx>=0?(c[packIdx]||''):''});"),
("map.set(cleanId,{cleanId,skuKey:normalizeSkuKey(id),id,name:nameIdx>=0?(c[nameIdx]||''):'',qty:Number.isFinite(q)?q:0,unit:unitIdx>=0?(c[unitIdx]||''):'',pack:packIdx>=0?(c[packIdx]||''):''});",
 "const imageSku=normalizeImageSku(id); if(!imageSku) continue;\n    map.set(imageSku,{cleanId,imageSku,id,name:nameIdx>=0?(c[nameIdx]||''):'',qty:Number.isFinite(q)?q:0,unit:unitIdx>=0?(c[unitIdx]||''):'',pack:packIdx>=0?(c[packIdx]||''):''});")
]
if 'map.set(imageSku,{cleanId,imageSku,id,' not in s:
    for old,new in patterns:
        if old in s:
            s=s.replace(old,new,1);break
    else: raise SystemExit('CUSTOMER_ITEM_ANCHOR_MISSING')

old_merge="const prev=map.get(item.cleanId);\n    if(!prev) map.set(item.cleanId,{...item,mergedQty:Math.max(0,item.qty||0)});\n    else map.set(item.cleanId,{...prev,id:prev.id||item.id,name:prev.name||item.name,unit:prev.unit||item.unit,pack:prev.pack||item.pack,mergedQty:Math.max(0,prev.mergedQty||0)+Math.max(0,item.qty||0)});"
new_merge="const skuKey=normalizeImageSku(item.imageSku||item.id)||item.cleanId;\n    const prev=map.get(skuKey);\n    if(!prev) map.set(skuKey,{...item,imageSku:skuKey,mergedQty:Math.max(0,item.qty||0)});\n    else map.set(skuKey,{...prev,id:prev.id||item.id,imageSku:skuKey,name:prev.name||item.name,unit:prev.unit||item.unit,pack:prev.pack||item.pack,mergedQty:Math.max(0,prev.mergedQty||0)+Math.max(0,item.qty||0)});"
if 'const skuKey=normalizeImageSku(item.imageSku||item.id)||item.cleanId;' not in s:
    if old_merge not in s: raise SystemExit('CUSTOMER_MERGE_ANCHOR_MISSING')
    s=s.replace(old_merge,new_merge,1)

# Replace any older/partial image map with the canonical collision-safe resolver.
start=s.find('function buildImagesMap(text){')
end=s.find('function parseCategories(text){',start)
if start<0 or end<0: raise SystemExit('CUSTOMER_IMAGES_MAP_ANCHOR_MISSING')
image_block=r'''// V56.25 customer image identity — exact SKU first; numeric fallback only when unique.
function buildImagesMap(text){
  const exact=new Map(),legacy=new Map();
  String(text||'').split(/\r?\n/).forEach(line=>{
    const raw=line.trim();if(!raw||raw.startsWith('#'))return;
    const parts=raw.split(/\t/);let declared='',file='';
    if(parts.length>=2){declared=parts[0].trim();file=parts.slice(1).join('\t').trim()}
    else{file=raw;declared=file.split('/').pop().split('?')[0].replace(/\.[^.]+$/,'')}
    if(!declared||!file)return;
    const sku=normalizeImageSku(declared),clean=normalizeCleanId(declared);
    if(sku)exact.set(sku,file);
    if(clean){if(!legacy.has(clean))legacy.set(clean,[]);legacy.get(clean).push({sku,file})}
  });
  return {exact,legacy};
}
function buildCustomerImageCollisionIndex(items){
  const out=new Map();
  (items||[]).forEach(item=>{if(!item?.cleanId)return;const sku=normalizeImageSku(item.imageSku||item.id);if(!sku)return;if(!out.has(item.cleanId))out.set(item.cleanId,new Set());out.get(item.cleanId).add(sku)});
  return out;
}
async function loadCustomerImageBindings(){
  try{const snap=await db.collection('system_controls').doc('product_image_bindings').get();return snap.exists?(snap.data()?.bindings||{}):{}}catch(e){console.warn('[V56.25 customer image bindings]',e);return{}}
}
function resolveCustomerImage(images,item,collisions,bindings={}){
  if(!images||!item)return'';
  const sku=normalizeImageSku(item.imageSku||item.id),override=normalizeImageSku(bindings?.[sku]||'');
  if(override&&images.exact.has(override))return images.exact.get(override)||'';
  if(sku&&images.exact.has(sku))return images.exact.get(sku)||'';
  const candidates=images.legacy.get(item.cleanId)||[],owners=collisions.get(item.cleanId)||new Set();
  if(owners.size!==1)return'';
  return candidates[0]?.file||'';
}
'''
s=s[:start]+image_block+s[end:]

# Patch catalogue load from any known V56.25 intermediate form.
load_re=re.compile(r"Promise\.all\(\[fetchText\(DATA_PATH\+'jeddah\.tsv'\).*?setLoading\(false\)\}\)\}\);",re.S)
m=load_re.search(s)
if not m: raise SystemExit('CUSTOMER_LOAD_ANCHOR_MISSING')
new_load="Promise.all([fetchText(DATA_PATH+'jeddah.tsv'),fetchText(DATA_PATH+'riyadh.tsv'),fetchText(DATA_PATH+'images_list.txt'),fetchText(DATA_PATH+'categories.tsv'),fetchText(DATA_PATH+'pricing.tsv'),fetchJson(DATA_PATH+'new-arrivals.json'),loadCustomerImageBindings()]).then(([j,r,imgs,cats,pricingText,arrivals,bindings])=>{if(!alive)return;const images=buildImagesMap(imgs);const pricing=parsePricingMap(pricingText);const inventory=mergeInventories(parseInventory(j),parseInventory(r));const collisions=buildCustomerImageCollisionIndex(inventory);const merged=inventory.filter(x=>x.allowedMax>=CART_STEP).map(x=>{const imageFile=resolveCustomerImage(images,x,collisions,bindings);const cartonPrice=Number(pricing[x.cleanId]||0);const packNum=parseFloat(toEnglishDigits(x.pack||'').replace(/[^0-9.]/g,''));return {...x,imageFile,cartonPrice,approxPrice:cartonPrice>0&&Number.isFinite(packNum)&&packNum>0?cartonPrice/packNum:0}}).filter(x=>Boolean(x.imageFile));setProducts(merged);setNewArrivalsMeta(arrivals&&Array.isArray(arrivals.items)?arrivals:{items:[]});setBaseCategories(parseCategories(cats));setLoading(false)}).catch(err=>{console.error(err);if(alive){setLoading(false);setToast({type:'error',message:'تعذر تحميل بيانات المعرض.'})}});"
s=s[:m.start()]+new_load+s[m.end():]
p.write_text(s,encoding='utf-8')

# Wrapper cache bust.
w,n=re.subn(r"\./runtime/customer-v37-source\.txt\?v=[0-9.]+","./runtime/customer-v37-source.txt?v=56.25",w,count=1)
if n==0 and "./runtime/customer-v37-source.txt?v=56.25" not in w: raise SystemExit('CUSTOMER_WRAPPER_CACHE_ANCHOR_MISSING')
wrapper.write_text(w,encoding='utf-8')

print('V56.25 customer collision-safe image identity applied')