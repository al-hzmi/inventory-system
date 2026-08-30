import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const login = fs.readFileSync('runtime/index-v37-source.txt', 'utf8');
const customer = fs.readFileSync('runtime/customer-v37-source.txt', 'utf8');
const customerBoot = fs.readFileSync('customer.html', 'utf8');
const admin = fs.readFileSync('admin-dashboard.html', 'utf8');
const adminNav = fs.readFileSync('v46-admin-nav.js', 'utf8');
const control = fs.readFileSync('control-center.html', 'utf8');

for (const marker of [
  'readRemoteApproverIdentity',
  'remoteApproverIdentityError',
  'approverEmployeeId',
  'approverRole',
  'approverPhotoProofId',
  "db.collection(EMPLOYEE_SECURITY_PHOTO_COLLECTION).doc(row.approverPhotoProofId).get()",
  'الحساب لا يطابق الطلب',
]) assert(login.includes(marker), `missing QR identity marker: ${marker}`);

const identityBody = login.match(/const remoteApproverIdentityError = ([\s\S]*?)\n};\nconst readRemoteLoginToken/)?.[1];
assert(identityBody, 'identity matcher must be extractable');
const context = {};
vm.createContext(context);
vm.runInContext(`const remoteApproverIdentityError = ${identityBody}\n}; this.matchIdentity = remoteApproverIdentityError;`, context);

assert.equal(context.matchIdentity(
  { employeeId:'admin_mohanad', canonicalName:'مهند', isAdmin:true },
  { valid:true, employeeId:'employee_2', name:'خالد', role:'employee' },
).includes('لا يمكن اعتماد دخول شخص من حساب شخص آخر'), true, 'employee must not approve admin');
assert.equal(context.matchIdentity(
  { employeeId:'employee_1', canonicalName:'محمد', isAdmin:false },
  { valid:true, employeeId:'employee_2', name:'خالد', role:'employee' },
).includes('لا يمكن اعتماد دخول شخص من حساب شخص آخر'), true, 'employee must not approve another employee');
assert.equal(context.matchIdentity(
  { employeeId:'employee_1', canonicalName:'محمد', isAdmin:false },
  { valid:true, employeeId:'employee_1', name:'محمد', role:'employee' },
), '', 'same employee identity should pass');
assert.equal(context.matchIdentity(
  { employeeId:'admin_mohanad', canonicalName:'مهند', isAdmin:true },
  { valid:true, employeeId:'admin_mohanad', name:'مهند', role:'admin' },
), '', 'same admin identity should pass');
assert.match(context.matchIdentity(
  { employeeId:'employee_1', canonicalName:'محمد', isAdmin:false },
  { valid:false, employeeId:'', name:'', role:'' },
), /الدخول بحساب صاحب الطلب أولًا/, 'untrusted phones must be blocked');

assert(customer.includes('showNewArrivals:true'), 'customer control must default new arrivals to visible');
assert(customer.includes('showNewArrivals&&!loading&&newArrivalProducts.length>0'), 'customer UI must honor the global new arrivals switch');
assert(customer.includes('window.__customerPortalControl=control'), 'live portal control must reach the catalog UI');
assert(customerBoot.includes('runtime/customer-v37-source.txt?v=55.4'), 'customer boot must bust stale cache');

assert(admin.includes("params.get('section')==='customers'?'customers':'employees'"), 'admin area must initialize from the URL');
assert(admin.includes('data-admin-area="customers"'), 'customer area must have a deterministic route target');
assert(admin.includes('data-admin-module={id}'), 'customer modules must have deterministic route targets');
assert(admin.includes('label="عرض قسم «جديدنا»"'), 'admin must expose the new arrivals switch');
assert(admin.includes("window.open('./customer.html?employeeView=1','_blank')"), 'admin preview must explicitly open customer view');
assert(admin.includes("./control-center.html?tab=permissions&scope=customers"), 'customer permissions must be directly reachable');
assert(admin.includes('كل نشاط العملاء'), 'customer live view must link to full activity');
assert(admin.includes('const lastAction=recentCustomerActivity.find'), 'customer live rows must expose the latest action');
assert(adminNav.includes('data-admin-area=\\"${sec}\\"') || adminNav.includes('data-admin-area="${sec}"'), 'admin nav must target area by data attribute, not text');
assert(control.includes("CONTROL_ROUTE.get('scope')==='customers'?'customer':'employee'"), 'control center must open customer permissions from its URL');

console.log('V55_4_IDENTITY_CUSTOMERS_CONTROL_PASS');
