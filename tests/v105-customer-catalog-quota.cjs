'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Babel=require('@babel/standalone');
const s=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const start=s.indexOf('<script type="text/babel">'),end=s.lastIndexOf('</script>');
assert(start>=0&&end>start,'customer script cannot be parsed');
const compiled=Babel.transform(s.slice(start+'<script type="text/babel">'.length,end),{presets:['react'],ast:false,comments:false});
assert(compiled.code.length>0,'customer JSX did not compile');
for(const term of [
 'function CategoryPreviewCard(', 'categoryShowcases.map(section=>',
 'section.items.slice(0,7)', 'setCategoryBrowse(section.name)',
 'function ProductMeta(', 'item.cartonPrice>0', 'item.approxPrice>0',
 'const categoryCards=useMemo(()=>categoryShowcases.map', 'page===\'categories\'',
 'const cartItems=useMemo(', 'async function submitOrder(', 'async function saveDraft(',
 'function OrdersView(', "db.collection(ORDER_COLLECTION).where('customerUid'"
 ])assert(s.includes(term),'essential interface or commerce capability missing: '+term);
assert(!s.includes("setActiveCategory('الكل')"),'old all-products shortcut remains');
assert(!s.includes('جميع المنتجات'), 'home still renders every product by default');
assert(s.includes('query.trim()?<section'), 'global search must remain available on demand');
assert(s.includes("if(page!=='orders')return;"),'customer order streams must be scoped to order history');
assert(s.includes('const CUSTOMER_EVENT_THROTTLE_MS='),'nonessential telemetry not throttled');
assert(s.includes('const customerSessionTouchAt=new Map()'),'visitor heartbeats not throttled');
assert(s.includes('setInterval(refresh,300000)'),'new-arrivals API still polled too frequently');
assert(s.includes('CATEGORY_RULES_CACHE'),'catalog category configuration not cached');
assert(s.includes("db.collection(CATEGORY_OVERRIDES).get({source:'server'})"),'category server refresh not present');
assert(!s.includes('db.collection(CATEGORY_OVERRIDES).onSnapshot('),'full category collection listener still active');
assert(!s.includes('db.collection(CATEGORY_META).onSnapshot('),'full category meta collection listener still active');
const telemetry=s.slice(s.indexOf('async function logCustomerEvent('),s.indexOf('async function touchCustomerSession('));
assert(telemetry.includes('CUSTOMER_EVENT_THROTTLE_MS[type]||0'),'only low-priority event types should be throttled');
assert(s.includes("logCustomerEvent(user,'order_submitted'"),'confirmed orders must still be audited');
assert(worker.includes("batco-navigation-shell-v105-customer-sections"),'old navigation shell cache may hide new customer layout');
console.log('V105 customer category-first homepage, product prices, order integrity, and quota controls: PASS');
