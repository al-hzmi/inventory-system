import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin = fs.readFileSync('admin-dashboard.html', 'utf8');
const customer = fs.readFileSync('runtime/customer-v37-source.txt', 'utf8');

for (const marker of [
  'data-new-arrivals-customer-control="1"',
  'عرض «جديدنا» للعملاء',
  'إعداد العرض العام لـ«جديدنا»',
  'onChange={v=>saveControl({showNewArrivals:v})}',
  "openArea('customers','accounts')",
  "openArea('customers','portal')",
  'البوابة وجديدنا',
  'الوصول والتسجيل وظهور جديدنا',
  'التحكم في ظهور القسم للعملاء.'
]) {
  assert(admin.includes(marker), `missing admin discoverability marker: ${marker}`);
}

for (const marker of [
  'resolveCustomerNewArrivals',
  "typeof profile?.showNewArrivalsOverride==='boolean'",
  'showNewArrivals=resolveCustomerNewArrivals(window.__customerPortalControl,safeProfile)',
  'showNewArrivals&&!loading&&newArrivalProducts.length>0'
]) {
  assert(customer.includes(marker), `missing customer visibility contract: ${marker}`);
}

const resolve = (control, profile) => typeof profile?.showNewArrivalsOverride === 'boolean'
  ? profile.showNewArrivalsOverride
  : control?.showNewArrivals !== false;

assert.equal(resolve({ showNewArrivals: true }, {}), true);
assert.equal(resolve({ showNewArrivals: false }, {}), false);
assert.equal(resolve({ showNewArrivals: false }, { showNewArrivalsOverride: true }), true);
assert.equal(resolve({ showNewArrivals: true }, { showNewArrivalsOverride: false }), false);

console.log('V56_67_NEW_ARRIVALS_CUSTOMER_CONTROLS_PASS');
