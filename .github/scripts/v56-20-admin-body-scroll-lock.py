from pathlib import Path

p=Path('admin-dashboard.html')
s=p.read_text(encoding='utf-8')
old='''    <DetailDrawer row={detail} onClose={()=>setDetail(null)} onCustomerMessage={target=>{setDetail(null);setCustomerMessageTarget(target)}}/>'''
new='''    {detail&&<DetailDrawer row={detail} onClose={()=>setDetail(null)} onCustomerMessage={target=>{setDetail(null);setCustomerMessageTarget(target)}}/>}'''
if old not in s:
    raise SystemExit('V56.20 anchor missing: DetailDrawer render')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

Path('tests/v56-20-admin-body-scroll-lock.mjs').write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const admin=fs.readFileSync('admin-dashboard.html','utf8');
assert.ok(admin.includes('{detail&&<DetailDrawer row={detail}'),'DetailDrawer must mount only while a detail row is open');
assert.ok(!admin.includes('\n    <DetailDrawer row={detail}'),'an idle DetailDrawer must never mount and lock the document body');
assert.ok(admin.includes('function DetailDrawer({row,onClose,onCustomerMessage}){\n  useBodyScrollLock();'),'the drawer must still isolate body scroll while actually open');
assert.ok(admin.includes('data-admin-scroll-root="1" className="flex-1 p-3 sm:p-4 bg-surface overflow-visible"'),'admin page must retain natural document scrolling');
console.log('V56.20 dormant DetailDrawer body-lock regression: OK');
''',encoding='utf-8')
