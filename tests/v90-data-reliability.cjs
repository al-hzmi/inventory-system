'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('runtime/index-v37-source.txt', 'utf8');
const admin = fs.readFileSync('admin-dashboard.html', 'utf8');
const tracker = fs.readFileSync('v44-observability.js', 'utf8');
const boot = fs.readFileSync('index.html', 'utf8');
const i = src.indexOf('const OrderInvoiceModal = memo(');
const j = src.indexOf('const saveAsDraft = () => {', i);
assert(i !== -1 && j > i, 'invoice component missing');
const invoice = src.slice(i, j);
for (const marker of [
  'const handleSubmit = async () => {',
  'if (submitLock.current || !items.length) return;',
  'const invoiceSignature = JSON.stringify(',
  "const pendingKey = 'batco_pending_employee_invoice_v90_'",
  'pendingInvoiceSignature.current === invoiceSignature',
  'await Promise.race([',
  'orderRef.set(payload)',
  'timestamp: savedAt, createdAt: savedAt',
  "console.error('[Invoice save failed]'",
  "disabled={items.length === 0 || submitting}",
  "{submitting ? 'جاري تأكيد الحفظ...' : 'اعتماد (واتساب)'}"
]) assert(invoice.includes(marker), 'missing invoice guarantee: ' + marker);
assert(!invoice.includes("getDb().then(db => {"), 'fire-and-forget invoice');
assert(invoice.indexOf('await Promise.race([') < invoice.indexOf('setCart({});'), 'clearing cart before ack');
assert(invoice.indexOf('setCart({});') < invoice.indexOf('whatsappWindow.location.replace(waUrl)'), 'WhatsApp before save');
assert(invoice.indexOf('} catch (error) {') > invoice.indexOf('setCart({});'), 'failure handler misplaced');
for (const marker of [
  "employeeOrders:'timestamp'",
  "livePresence:'v44_presence'",
  "liveActivity:'v44_activity_logs'",
  "employeeOrders:300",
  'presenceEmployees',
  'presenceCustomers',
  'collectionErrors',
  "data.customerSessions||[]",
  "data.employeeSessions||[]"
]) assert(admin.includes(marker), 'missing dashboard guarantee: ' + marker);
assert(tracker.includes('function beginWhenIdentified()'), 'SPA login is not observed');
assert(tracker.includes("typeof window.getDb==='function'"), 'lazy Firestore never started');
assert(!tracker.includes("if(me.type==='system'||isQa()||isQaIdentity(me.name))"), 'stale identity guard');
new vm.Script(tracker, { filename:'v44-observability.js' });
assert(boot.includes('const submitMarker='), 'stock validation patch hook lost');
console.log('V90 data reliability static regressions: PASS');
