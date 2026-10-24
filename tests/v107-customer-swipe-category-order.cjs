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
assert(customer.includes('function ProductRail({children,label='),'native carousel component missing');
const style=customer.slice(customer.indexOf('<style>'),customer.indexOf('</style>'));
assert(/\.customer-product-rail\{[^}]*overflow-x:auto;/.test(style),'native horizontal overflow missing');
assert(/\.customer-product-rail\{[^}]*touch-action:auto;/.test(style),'Safari must own both horizontal and vertical touch panning');
assert(/\.customer-product-rail\{[^}]*-webkit-overflow-scrolling:touch;/.test(style),'Safari inertia is disabled');
assert(/\.customer-product-rail>\*\{flex:0 0 auto;/.test(style),'product cards might shrink to fit with no scroll overflow');
assert(!style.includes('touch-action:pan-y'),'pan-y blocks Safari native horizontal gestures');
assert(customer.includes('<ProductRail label="جديدنا">'),'new arrivals carousel missing');
assert(customer.includes("<ProductRail label={'منتجات '+section.name}>"),'category carousel missing');
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

const railStart=customer.indexOf('function ProductRail({children,label=');
const railEnd=customer.indexOf('function CategoryPreviewCard(',railStart);
assert(railStart>=0&&railEnd>railStart);
const railSource=customer.slice(railStart,railEnd);
for(const obsolete of ['onTouchStart','onTouchMove','onTouchEnd','onTouchCancel','onMouseDown','onMouseMove','onClickCapture','scrollBy(','blockClick.current'])
  assert(!railSource.includes(obsolete),'custom scrolling must not interfere with iOS: '+obsolete);
assert(!railSource.includes('عرض المنتجات التالية')&&!railSource.includes('عرض المنتجات السابقة'),'arrows must be removed');
const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};
const vm=require('node:vm');const context={React};vm.createContext(context);
vm.runInContext(Babel.transform(railSource,{presets:['react']}).code+';testRail=ProductRail',context);
const tree=context.testRail({children:['one','two','three'],label:'منتجات الأحذية'});
assert.equal(tree.type,'div');
const rail=tree.props.children[0];
assert.equal(rail.type,'div');
assert.equal(rail.props.dir,'rtl');
assert.equal(rail.props.role,'region');
assert.equal(rail.props['aria-label'],'منتجات الأحذية');
assert.equal(rail.props.children.length,1);
assert.equal(rail.props.children[0].length,3);
console.log('V108 Safari-native horizontal carousel and category order PASS');
