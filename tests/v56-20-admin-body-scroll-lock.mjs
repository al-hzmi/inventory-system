import fs from 'node:fs';
import assert from 'node:assert/strict';
const admin=fs.readFileSync('admin-dashboard.html','utf8');
assert.ok(admin.includes('{detail&&<DetailDrawer row={detail}'),'DetailDrawer must mount only while a detail row is open');
assert.ok(!admin.includes('\n    <DetailDrawer row={detail}'),'an idle DetailDrawer must never mount and lock the document body');
assert.ok(admin.includes('function DetailDrawer({row,onClose,onCustomerMessage}){\n  useBodyScrollLock();'),'the drawer must still isolate body scroll while actually open');
assert.ok(admin.includes('data-admin-scroll-root="1" className="flex-1 p-3 sm:p-4 bg-surface overflow-visible"'),'admin page must retain natural document scrolling');
console.log('V56.20 dormant DetailDrawer body-lock regression: OK');
