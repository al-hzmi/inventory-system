/* V80: branch presence only; physical stocktake remains unchanged. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
for(const path of ['branch-presence-core.js','branch-presence.js','branch-presence-admin.js','branch-presence-entry.js','branch-presence-main-launcher.js','sw.js','batco-fast-nav.js']){
 new vm.Script(read(path),{filename:path});
}
const context=vm.createContext({});
vm.runInContext(read('branch-presence-core.js'),context);
const C=context.BranchPresenceCore;
assert.equal(C.key('١٢٣abc'),'123ABC');
const sample='رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\nARM_10004\tكوب\tكرتون\t9\t60\nARM_10005\tطبق\tكرتون\t2\t40\nARM_10006\tصنف نافد\tكرتون\t0\t36\n';
const p=C.inventory(sample);
assert.equal(p.length,3);
assert.equal(C.resolve('arm_10004',p).item.sku,'ARM_10004');
assert.equal(C.resolve('ARM10004',p).item.sku,'ARM_10004');
assert.equal(C.resolve('89000010004987',p).item.sku,'ARM_10004');
assert.equal(C.resolve('89000010005987',p).item.sku,'ARM_10005');
assert.equal(C.resolve('invalid',p).reason,'unknown');
assert.equal(C.resolve('some-10004-10005-long-code',p).reason,'ambiguous');
assert.equal(C.summary(p,new Set(),false).notObserved,2,'unscanned are not a confirmed shortage before close');
assert.equal(C.summary(p,new Set(['ARM_10004']),true).notObserved,1);
assert.equal(C.summary(p,new Set(['ARM_10004','ARM_10004']),true).observed,1);
assert.equal(C.summary(p,new Set(['ARM_10006']),true).observed,0,'out-of-stock warehouse item is not a branch shortage');
assert.throws(()=>C.inventory(sample+'ARM_10004\tمكرر\tكرتون\t1\t40\n'),/DUPLICATE_SKU/);
const csv=C.csv([{sku:'=3+4',name:'@risk',warehouseQty:3}],{branch:'فرع','warehouse':'جدة'});
assert.match(csv,/^\uFEFF/);assert.match(csv,/'=3\+4/);assert.match(csv,/'@risk/);
assert.equal(C.inventory(read('data/jeddah.tsv')).length>500,true);
const admin=read('admin-stocktake.html'),shell=read('admin-stocktake-shell.html'),field=read('stocktake.html'),home=read('index.html');
assert.match(admin,/id="newBranchPresence"/);assert.match(admin,/branch-presence-admin\.js/);
assert.match(admin,/branch-presence-admin\.css/);assert.match(shell,/openBranchFromShell/);
assert.match(field,/branch-presence-entry\.js/);assert.match(home,/branch-presence-main-launcher\.js/);
const page=read('branch-presence.html'),script=read('branch-presence.js');
assert.match(page,/workerForm/);assert.match(page,/workerCamera/);
assert.doesNotMatch(page,/quantity|كمية الفرع|الكمية الفعلية/);
assert.match(script,/runTransaction/);assert.match(script,/seen\.has/);assert.match(script,/queueKey/);
const sw=read('sw.js');assert.match(sw,/branch-presence\.html/);
assert.match(sw,/branch-presence-core\.js/);assert.doesNotMatch(sw,/['"]\/data\/jeddah\.tsv['"]/);
console.log('PASS v80 presence: barcode normalization, no quantities, duplicate protection, shortage semantics, CSV, entry points and JS syntax');
