import fs from 'node:fs';
import assert from 'node:assert/strict';

const adm=fs.readFileSync('admin-dashboard.html','utf8');
const idx=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const cust=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const boot=fs.readFileSync('index.html','utf8');
const custBoot=fs.readFileSync('customer.html','utf8');

assert.match(idx,/where\('employeeId','==',employeeId\)\.limit\(20\)/,'employee messages must query recipient directly');
assert.match(idx,/where\('targetKey','==',targetKeys\[0\]\)\.limit\(20\)/,'employee alias fallback must be targeted');
assert.ok(!idx.includes("collection(EMPLOYEE_NOTIFICATION_COLLECTION).limit(150).onSnapshot"),'legacy global 150 listener must be removed');
assert.ok(idx.includes('rememberShow(candidate);setNotification(candidate);markShown(candidate)'),'employee local receipt must be persisted before display and Firestore sync');
assert.ok(idx.includes('EMPLOYEE_NOTIFICATION_RECEIPT_GLOBAL_KEY'),'employee receipt must survive identity-key changes');
assert.ok(idx.includes('legacyReceiptSuppressed:true'),'legacy employee one-time messages must be retired server-side when quota permits');
assert.ok(idx.includes('receiptPolicyVersion')&&idx.includes('LEGACY_ONCE_CUTOFF_MS')&&idx.includes('policy<2||(created>0&&created<LEGACY_ONCE_CUTOFF_MS)'),'employee legacy detection must cover receipt policy and pre-V56.12 creation cutoff');
assert.ok(idx.includes("if(row.status!=='active'||!legacyOnce(row))return;"),'employee legacy retirement must share the cutoff classifier');

assert.ok(adm.includes("db.collection('customer_notifications').add"),'admin must be able to create customer messages');
assert.ok(adm.includes('CustomerMessageModal'),'customer message modal missing');
assert.ok(adm.includes("const guestMessageTarget=row.__collection==='customer_guest_presence'&&row.visitorId?")&&adm.includes('onCustomerMessage?.(guestMessageTarget)')&&adm.includes('>إرسال رسالة</button>'),'named guest detail must expose a separate message action');
assert.ok(adm.includes("setCustomerMessageTarget({kind:'customer'"),'registered customer message action missing');
assert.ok(adm.includes("c.id?setCustomerManager(c):setDetail({...s,__collection:'customer_guest_presence'"),'named guest row must open details first');
assert.ok(adm.includes('onCustomerMessage={target=>')&&adm.includes('setCustomerMessageTarget(target)'),'guest detail message action must reach the message modal');
assert.ok(adm.includes('.admin-message-sheet'),'Android admin message sheet CSS missing');
assert.ok(adm.includes('receiptPolicyVersion:2'),'new messages must carry durable receipt policy version');

assert.ok(cust.includes("const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications'"),'customer notification collection missing');
assert.ok(cust.includes('CustomerAdminNotificationHost'),'customer notification host missing');
assert.match(cust,/where\(field,'==',value\)\.limit\(20\)/,'customer notifications must use targeted equality query');
assert.ok(cust.includes('visitorId===customerVisitorId'),'guest visitor identity targeting missing');
assert.ok(cust.includes('rememberShow(candidate);setNotification(candidate);markShown(candidate)'),'customer local receipt must be persisted before display and Firestore sync');
assert.ok(cust.includes('CUSTOMER_NOTIFICATION_RECEIPT_GLOBAL_KEY'),'customer receipt must survive identity-key changes');
assert.ok(cust.includes('legacyReceiptSuppressed:true'),'legacy customer one-time messages must be retired server-side when quota permits');
assert.ok(cust.includes('receiptPolicyVersion')&&cust.includes('LEGACY_ONCE_CUTOFF_MS')&&cust.includes('policy<2||(created>0&&created<LEGACY_ONCE_CUTOFF_MS)'),'customer legacy detection must cover receipt policy and pre-V56.12 creation cutoff');
assert.ok(cust.includes("if(row.status!=='active'||!legacyOnce(row))return;"),'customer legacy retirement must share the cutoff classifier');
assert.ok(cust.includes('.customer-admin-message-card'),'Android customer message card CSS missing');
assert.ok(cust.includes('<CustomerPortalBootstrap/><CustomerAdminNotificationHost/>'),'customer notification host must be mounted');
assert.ok(cust.indexOf('function CustomerPortalBootstrap(){') < cust.indexOf("const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications';") && cust.indexOf("const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications';") < cust.indexOf("ReactDOM.createRoot(document.getElementById('root')).render"),'customer notification host must live after the V42 bootstrap replacement boundary');

assert.ok(boot.includes("index-v37-source.txt?v=56.17"),'employee current cache bust missing');
assert.ok(custBoot.includes("customer-v37-source.txt?v=56.18"),'customer current cache bust missing');
assert.ok(boot.includes('maxHeight:\'min(72dvh, 560px)\''),'employee Android dynamic viewport card missing');

console.log('V56.17 messaging + quota regression: OK');
