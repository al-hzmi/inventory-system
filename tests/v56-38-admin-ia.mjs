import fs from 'node:fs';
import assert from 'node:assert/strict';

const dashboard=fs.readFileSync('admin-dashboard.html','utf8');
const nav=fs.readFileSync('v46-admin-nav.js','utf8');
const enh=fs.readFileSync('v54-admin-enhancements.js','utf8');
const css=fs.readFileSync('v54-1-desktop-canvas-fix.css','utf8');

assert.ok(dashboard.includes("requestedSection==='products'||productModules.has(requestedModule)?'products'"),'legacy/current product routes must normalize to products area');
assert.ok(dashboard.includes('const productTabs=['),'products need their own tab model');
const employeeBlock=dashboard.match(/const employeeTabs=\[([\s\S]*?)\];\n  const customerTabs=/)?.[1]||'';
for(const forbidden of ["'product_management'","'images'","'new_arrivals'","'categories'"]) assert.ok(!employeeBlock.includes(forbidden),`employee tabs leaked ${forbidden}`);
const customerBlock=dashboard.match(/const customerTabs=\[([\s\S]*?)\];\n  const productTabs=/)?.[1]||'';
assert.ok(!customerBlock.includes("'images'"),'customer tabs must not carry product image management');
for(const required of ["['product_management','box','الرئيسية'","['images','image','مكتبة الصور'","['new_arrivals','box','جديدنا'","['categories','history','سجل التصنيفات'"]) assert.ok(dashboard.includes(required),`product tabs missing ${required}`);
assert.ok(dashboard.includes("area==='products'?'مركز إدارة المنتجات والأقسام'"),'products need their own header identity');
assert.ok(dashboard.includes("{area!=='products'&&<div className=\"px-4 py-3"),'people switch must not render inside product workspace');
assert.ok(dashboard.includes("area==='products'?productTabs:area==='employees'?employeeTabs:customerTabs"),'tabs must be domain-scoped');
assert.ok(dashboard.includes("if(area==='products'){switch(module)"),'product content must have a first-class domain branch');
assert.ok(dashboard.includes('./v46-admin-nav.js?v=56.38'),'dashboard must bust admin nav cache');

assert.ok(nav.includes("const VERSION='56.38'"),'nav version must be 56.38');
assert.ok(nav.includes("['products','المنتجات والأقسام','./admin-dashboard.html?section=products&module=product_management']"),'product nav must use section=products');
assert.ok(nav.includes("['home','sales','employees','products']"),'mobile bottom nav must expose products beside people');
assert.ok(!nav.includes("links.filter(x=>['products','orders'"),'products must not be duplicated inside More');
assert.ok(nav.includes("raw==='products'?'products':'employees'"),'route activation must understand products');

assert.ok(enh.includes("const VERSION='56.38'"),'enhancements must be 56.38');
assert.ok(enh.includes("section!=='products'"),'people active marker must not leak into products');
assert.ok(enh.includes('v54-1-desktop-canvas-fix.css?v=56.38'),'responsive CSS must be cache-busted');
assert.ok(css.includes('repeat(5,minmax(0,1fr))'),'mobile executive nav must use five columns');
assert.ok(!css.includes('data-v56-unified-people="true"]{grid-template-columns:repeat(4'),'stale four-column override must be gone');

for(const [name,text] of [['dashboard',dashboard],['nav',nav],['enh',enh],['css',css]]){
  assert.ok(!text.includes('<<<<<<<')&&!text.includes('>>>>>>>'),`${name} has merge markers`);
}
console.log('V56.38 admin information architecture regression: PASS');
