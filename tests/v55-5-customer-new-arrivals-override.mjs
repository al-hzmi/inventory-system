import fs from 'node:fs';
import assert from 'node:assert/strict';
const customer=fs.readFileSync('runtime/customer-v37-source.txt','utf8');const boot=fs.readFileSync('customer.html','utf8');const admin=fs.readFileSync('admin-dashboard.html','utf8');
assert(customer.includes('resolveCustomerNewArrivals'));assert(customer.includes("typeof profile?.showNewArrivalsOverride==='boolean'"));assert(customer.includes('showNewArrivals=resolveCustomerNewArrivals(window.__customerPortalControl,safeProfile)'));assert(customer.includes("navigator.serviceWorker.register('./customer-sw.js?v=55.5'"));assert(boot.includes("runtime/customer-v37-source.txt?v=55.5"));
const resolve=(control,profile)=>typeof profile?.showNewArrivalsOverride==='boolean'?profile.showNewArrivalsOverride:control?.showNewArrivals!==false;
assert.equal(resolve({showNewArrivals:true},{}),true);assert.equal(resolve({showNewArrivals:false},{}),false);assert.equal(resolve({showNewArrivals:false},{showNewArrivalsOverride:true}),true);assert.equal(resolve({showNewArrivals:true},{showNewArrivalsOverride:false}),false);assert.equal(resolve({showNewArrivals:false},{showNewArrivalsOverride:null}),false);
for(const marker of ['setCustomerNewArrivals','customer_new_arrivals_override_changed','قسم «جديدنا» لهذا العميل','onNewArrivals={setCustomerNewArrivals}','يتبع العام'])assert(admin.includes(marker),`missing ${marker}`);
console.log('V55_5_CUSTOMER_NEW_ARRIVALS_OVERRIDE_PASS');
