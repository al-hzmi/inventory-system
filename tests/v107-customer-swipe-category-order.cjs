'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const Babel=require('@babel/standalone');
const customer=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const admin=fs.readFileSync('admin-dashboard.html','utf8');
for(const [name,html] of [['customer',customer],['admin',admin]]){
 const marker='<script type="text/babel">',i=html.indexOf(marker);
 assert(i>=0,'missing JSX entry for '+name);
 const j=html.indexOf('</script>',i+marker.length);
 assert(j>i,'missing JSX end for '+name);
 const compiled=Babel.transform(html.slice(i+marker.length,j),{presets:['react'],ast:false,comments:false});
 assert(compiled.code.length>100,'Babel compilation failed '+name);
}
assert(customer.includes('function ProductRail({children,label='),'swipe rail component missing');
for(const term of ['onTouchStart={down}','onTouchMove={move}','onTouchEnd={finish}','onTouchCancel={finish}',
 'el.scrollLeft=g.start-dx','onClickCapture={e=>','blockClick.current','touch-action:pan-y',
 '-webkit-overflow-scrolling:touch','overscroll-behavior-x:contain','snap-x',
 '<ProductRail label="جديدنا">',"<ProductRail label={'منتجات '+section.name}>",
 'onClick={()=>scroll(-1)}','onClick={()=>scroll(1)}']){
 assert(customer.includes(term),'touch/rail behavior missing: '+term);
}
assert(customer.includes("window.__customerPortalControl?.categoryOrder"),'client must react to live ordering control');
assert(customer.includes("const aFirst=/^الأواني/.test(a)"),'default housewares first');
assert(customer.includes('categoryShowcases.map(section=>'),'customer sections missing');
assert(customer.includes('item.cartonPrice>0'),'product price lost');
assert(admin.includes('function ProductCategoryManager({onClose,control})'),'admin order unavailable');
for(const term of ["setDraftOrder(next);setOrderDirty(true)","onClick={()=>moveCategory(category,-1)}","onClick={()=>moveCategory(category,1)}",
 'onClick={()=>placeCategoryFirst(category)}','onClick={saveCategoryOrder}','categoryOrder:sorted',
 'db.collection(CONTROL_COLLECTION).doc(CONTROL_DOC).set({',
 'categoryOrderUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()',
 '},{merge:true})','control={control}',"'chevron-up':","'chevron-down':"]){
 assert(admin.includes(term),'admin ordering save/control missing: '+term);
}
assert(!admin.includes('await db.collection(PRODUCT_CATEGORY_META).doc(productCategoryDocId(clean)).delete('),'ordering must not delete any category');
console.log('V107 mobile touch rails, category order and guarded Firestore save: PASS');
