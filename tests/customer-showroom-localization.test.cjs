const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Babel=require('@babel/standalone');
const i18n=require('../customer-localization.js');

test('Arabic and English dictionaries cover essential ordering terminology',()=>{
  assert.equal(i18n.dictionaries.en['إضافة للسلة'],'Add to Cart');
  assert.equal(i18n.dictionaries.en['اعتماد وإرسال الطلب'],'Submit Order');
  assert.equal(i18n.dictionaries.en['لا توجد منتجات مطابقة'],'No Matching Products');
  assert.equal(i18n.dictionaries.ar['السلة'],'السلة');
  assert.equal(i18n.dictionaries.en['ملخص طلب الشراء'],'Order Summary');
});

test('first visit selects device language; manual selection takes priority',()=>{
  const saved=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)}});
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['en-US'],language:'en-US'}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{documentElement:{lang:'',dir:''},title:''}});
  assert.equal(i18n.initial(),'en');
  i18n.apply('ar',true);
  assert.equal(i18n.initial(),'ar');
  assert.equal(global.document.documentElement.dir,'rtl');
  saved.clear();
  global.navigator.languages=['fr-FR'];
  assert.equal(i18n.initial(),'ar');
  global.navigator.languages=['ar-SA'];
  assert.equal(i18n.initial(),'ar');
  global.navigator.languages=['en-GB'];
  assert.equal(i18n.initial(),'en');
  i18n.apply('en',true);
  assert.equal(global.document.documentElement.dir,'ltr');
  assert.equal(i18n.text('السلة'),'Cart');
  assert.equal(i18n.text('15 صنف في السلة'),'15 items in cart');
  assert.equal(i18n.text('ابحث داخل الأواني...'),'Search within الأواني...');
  assert.equal(i18n.text('غير مترجم'),'غير مترجم');
  i18n.apply('ar');
});

test('Babel translation is restricted to display nodes and leaves business identifiers intact',()=>{
  const sample="function Card({item}){const go=()=>create('الفرع الرئيسي');return <article><button onClick={go} aria-label=\"إضافة للسلة\">إضافة للسلة</button><b>{item.name}</b><p>{item.id}</p><span>{toast.message}</span><input placeholder=\"ابحث برقم الصنف أو اسمه في جميع الأقسام...\"/></article>}";
  const code=Babel.transform(sample,{presets:['react'],plugins:[i18n.babelPlugin],sourceType:'script'}).code;
  assert.match(code,/customerUiText\(["']إضافة للسلة["']\)/);
  assert.match(code,/customerUiText\(toast\.message\)/);
  assert.match(code,/item\.name/);
  assert.match(code,/item\.id/);
  assert.match(code,/create\(["']الفرع الرئيسي["']\)/);
  assert.doesNotMatch(code,/customerUiText\(item\.name\)/);
});

test('showroom runtime and build compiler use the same localization without touching employee pages',()=>{
  const shell=fs.readFileSync('customer.html','utf8');
  const build=fs.readFileSync('scripts/build-performance.cjs','utf8');
  const admin=fs.readFileSync('admin-dashboard.html','utf8');
  assert.match(shell,/CustomerLocalizedRoot/);
  assert.match(shell,/CustomerLanguageSwitch/);
  assert.match(shell,/customer-localization\.js/);
  assert.match(shell,/CUSTOMER_LOCALE_BABEL_ANCHOR/);
  assert.match(build,/label==='customer'\?\[customerLocale\.babelPlugin\]:\[\]/);
  assert.ok(admin.includes('CUSTOMER_UI_EN') || admin.includes('Customer'));
  assert.doesNotMatch(shell,/location\.reload\(\)/);
});
