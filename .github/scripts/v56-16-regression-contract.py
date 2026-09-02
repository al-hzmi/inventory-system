from pathlib import Path

p=Path('tests/v56-11-ops-fixes.mjs')
s=p.read_text()
old="assert.ok(shell.includes('stocktake.html?v=56.11')&&shell.includes('admin-stocktake.html?embedded=1&v=56.11'),'stocktake cache keys must be V56.11');"
new="""const versionAtLeast=(value,min)=>{const a=String(value||'').split('.').map(Number),b=String(min).split('.').map(Number);return (a[0]||0)>(b[0]||0)||((a[0]||0)===(b[0]||0)&&(a[1]||0)>=(b[1]||0));};
const stocktakeShellVersion=shell.match(/stocktake\\.html\\?v=(\\d+\\.\\d+)/)?.[1];
const adminStocktakeShellVersion=shell.match(/admin-stocktake\\.html\\?embedded=1&v=(\\d+\\.\\d+)/)?.[1];
assert.ok(versionAtLeast(stocktakeShellVersion,'56.11')&&versionAtLeast(adminStocktakeShellVersion,'56.11'),'stocktake shell cache keys must not regress below V56.11');"""
if old not in s: raise SystemExit('stale stocktake cache assertion anchor missing')
s=s.replace(old,new,1)
for old_line,new_line in [
    ("assert.ok(boot.includes('index-v37-source.txt?v=56.16'),'employee runtime cache bust missing');", "const employeeCoreVersion=boot.match(/index-v37-source\\.txt\\?v=(\\d+\\.\\d+)/)?.[1];\nassert.ok(versionAtLeast(employeeCoreVersion,'56.12'),'employee runtime cache generation must not regress below V56.12');"),
    ("assert.ok(custBoot.includes('customer-v37-source.txt?v=56.15'),'customer runtime cache bust missing');", "const customerCoreVersion=custBoot.match(/customer-v37-source\\.txt\\?v=(\\d+\\.\\d+)/)?.[1];\nassert.ok(versionAtLeast(customerCoreVersion,'56.12'),'customer runtime cache generation must not regress below V56.12');")
]:
    if old_line not in s: raise SystemExit(f'runtime cache assertion anchor missing: {old_line}')
    s=s.replace(old_line,new_line,1)
p.write_text(s)

# Permanent V56.16 regression: verifies the package without relying on mutable Firestore data.
Path('tests/v56-16-stocktake-accounting.mjs').write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const accountant=fs.readFileSync('accountant-stocktake.html','utf8');
const admin=fs.readFileSync('admin-stocktake.html','utf8');
const runtime=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const boot=fs.readFileSync('index.html','utf8');
const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');

// Accountant view is a dedicated, read-only, mobile-first surface.
assert.ok(accountant.includes("CONTROL_DOC='stocktake_accounting'"),'accountant access control missing');
assert.ok(accountant.includes('قراءة فقط'),'read-only accountant marker missing');
assert.ok(accountant.includes('overflow-x:hidden'),'accountant mobile horizontal-overflow guard missing');
assert.ok(accountant.includes('@media(min-width:820px)'),'accountant responsive desktop breakpoint missing');
assert.ok(accountant.includes("db.collection('stocktake_items').where('campaignId','==',id).onSnapshot"),'accountant item live-read missing');
assert.ok(accountant.includes("db.collection('stocktake_teams').where('campaignId','==',id).onSnapshot"),'accountant team live-read missing');
assert.ok(!/db\.collection\([^\n]+\)\.(?:set|update|delete|add)\s*\(/.test(accountant),'accountant page must not contain Firestore write routes');
assert.ok(!accountant.includes('data-save=')&&!accountant.includes('saveItem('),'accountant page must not expose count-edit controls');

// Test stocktake must be the full selected warehouse snapshot, not a sample.
assert.ok(!admin.includes('id="testCount"'),'test sample-count control must be removed');
assert.ok(admin.includes('const rows=[...dedup.values()]'),'test stocktake must use all de-duplicated inventory rows');
assert.ok(admin.includes('for(let x=0;x<rows.length;x+=350)'),'full test snapshot must write in safe chunks');
assert.ok(admin.includes('inventorySnapshotCount:rows.length'),'full test snapshot count must reflect all rows');
assert.ok(admin.includes("sourceMode:'current_inventory'")&&admin.includes('fullInventory:true'),'test campaign must be explicitly isolated/current-inventory/full');

// Root controls exactly who can see the accounting view and can revoke it.
for (const marker of ['saveAccountingAccess','disableAccountingAccess','previewAccounting','purgeTestCampaigns']) {
  assert.ok(admin.includes(marker),`${marker} missing from admin stocktake`);
}
assert.ok(admin.includes("doc('stocktake_accounting').set({enabled:true,accessMode:'selected'"),'selected-account access write missing');
assert.ok(admin.includes("doc('stocktake_accounting').set({enabled:false,accessMode:'none'"),'accountant access revoke write missing');
assert.ok(admin.includes('./accountant-stocktake.html?preview=1&campaign='),'root accountant-perspective preview missing');

// Employee navigation is permission-gated and versioned.
assert.ok(runtime.includes('useStocktakeAccountingControl'),'accounting control hook missing from employee runtime');
assert.ok(runtime.includes('stocktakeAccountingAccessAllowed'),'accounting access resolver missing from employee runtime');
assert.ok(runtime.includes('currentStocktakeAccountingAccessAllowed'),'accounting permission gate missing from employee runtime');
assert.ok(runtime.includes("window.location.href = './accountant-stocktake.html?v=56.16'"),'accountant employee route missing');
assert.ok(boot.includes("index-v37-source.txt?v=56.16"),'employee runtime cache not bumped to V56.16');
assert.ok(shell.includes('./stocktake.html?v=56.16')&&shell.includes('./admin-stocktake.html?embedded=1&v=56.16'),'stocktake shell cache not bumped to V56.16');
console.log('V56.16 full-test inventory + read-only accountant stocktake regression: OK');
''')

Path('.github/workflows/v56-16-stocktake-accounting-regression.yml').write_text(r'''name: V56.16 Stocktake Accounting Regression

on:
  push:
    branches: [main]
    paths:
      - 'accountant-stocktake.html'
      - 'admin-stocktake.html'
      - 'admin-stocktake-shell.html'
      - 'runtime/index-v37-source.txt'
      - 'index.html'
      - 'tests/v56-16-stocktake-accounting.mjs'
      - '.github/workflows/v56-16-stocktake-accounting-regression.yml'
  pull_request:
    paths:
      - 'accountant-stocktake.html'
      - 'admin-stocktake.html'
      - 'admin-stocktake-shell.html'
      - 'runtime/index-v37-source.txt'
      - 'index.html'
      - 'tests/v56-16-stocktake-accounting.mjs'

permissions:
  contents: read

jobs:
  regression:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: node tests/v56-16-stocktake-accounting.mjs
''')
print('V56.16 regression contract repaired and permanent gate generated')
