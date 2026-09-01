import fs from 'node:fs';
import assert from 'node:assert/strict';

const adm=fs.readFileSync('admin-dashboard.html','utf8');
const idx=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const cust=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const boot=fs.readFileSync('index.html','utf8');
const custBoot=fs.readFileSync('customer.html','utf8');

assert.match(idx,/where\('employeeId','==',employeeId\)\.limit\(50\)/,'employee messages must query recipient directly');
assert.match(idx,/where\('targetKey','==',targetKeys\[0\]\)\.limit\(50\)/,'employee alias fallback must be targeted');
assert.ok(!idx.includes("collection(EMPLOYEE_NOTIFICATION_COLLECTION).limit(150).onSnapshot"),'legacy global 150 listener must be removed');
assert.ok(idx.includes('setNotification(candidate);markShown(candidate)'),'employee UI must display before the best-effort receipt call');

assert.ok(adm.includes("db.collection('customer_notifications').add"),'admin must be able to create customer messages');
assert.ok(adm.includes('CustomerMessageModal'),'customer message modal missing');
assert.ok(adm.includes("setCustomerMessageTarget({kind:'guest'"),'named guest message action missing');
assert.ok(adm.includes("setCustomerMessageTarget({kind:'customer'"),'registered customer message action missing');
assert.ok(adm.includes('.admin-message-sheet'),'Android admin message sheet CSS missing');

assert.ok(cust.includes("const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications'"),'customer notification collection missing');
assert.ok(cust.includes('CustomerAdminNotificationHost'),'customer notification host missing');
assert.match(cust,/where\(field,'==',value\)\.limit\(50\)/,'customer notifications must use targeted equality query');
assert.ok(cust.includes('visitorId===customerVisitorId'),'guest visitor identity targeting missing');
assert.ok(cust.includes('setNotification(candidate);markShown(candidate)'),'customer UI must display before best-effort receipt write');
assert.ok(cust.includes('.customer-admin-message-card'),'Android customer message card CSS missing');
assert.ok(cust.includes('<CustomerPortalBootstrap/><CustomerAdminNotificationHost/>'),'customer notification host must be mounted');

assert.ok(boot.includes("index-v37-source.txt?v=56.4"),'employee cache bust missing');
assert.ok(custBoot.includes("customer-v37-source.txt?v=56.4"),'customer cache bust missing');
assert.ok(boot.includes('maxHeight:\'min(72dvh, 560px)\''),'employee Android dynamic viewport card missing');

console.log('V56.4 messaging regression: OK');
