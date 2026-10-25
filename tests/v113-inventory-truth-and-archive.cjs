'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const api=fs.readFileSync('api/inventory-import.js','utf8');
const ui=fs.readFileSync('v59-admin-import-ui.js','utf8');
const employee=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const sandbox={require,module:{exports:{}},process:{env:{}},Buffer,fetch:()=>{throw Error('No writes in regression tests')}};
vm.runInNewContext(api+'\nthis.testPrepare=prepare;',sandbox);
const prepare=sandbox.testPrepare;
const stock=[
 'رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\t\t\t',
 'BA_727\tابريق وضوء صغير * 2\tكرتون\t8\t8\t\t\t',
 'ARM_10004\tبرطمان\tكرتون\t6\t60\t\t\t',
 'ARM_10005\tصنف منتهي\tكرتون\t0\t48\t\t\t',
 'BA_750\tصنف آخر\tكرتون\t2\t12\t\t\t'
].join('\n')+'\n';
const input='رقم الصنف\tالكمية المتوفرة\nARM_10004\t6\nARM_10005\t0\nBA_750\t2\n';
let result=prepare('jeddah',input,stock);
assert.equal(result.content,stock,'partial updates must not erase omitted inventory');
assert.equal(result.summary.unreported,1);
assert.equal(result.summary.zeroed,0);
result=prepare('jeddah',input,stock,{fullSnapshot:true});
assert.equal(result.summary.unreported,1);
assert.equal(result.summary.zeroed,1);
assert.equal(result.summary.changed,1);
assert.equal(result.summary.unchanged,3);
assert.equal(result.summary.zeroExamples[0],'BA_727');
assert.match(result.content,/BA_727\tابريق وضوء صغير \* 2\tكرتون\t0\t8\t/);
assert.match(result.content,/ARM_10005\tصنف منتهي\tكرتون\t0\t48\t/);
assert.throws(()=>prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t6\n',stock,{fullSnapshot:true}),/منعنا تصفير البقية/);
assert.throws(()=>prepare('pricing','رقم الصنف\tسعر البيع\nBA_727\t32','رقم الصنف\tسعر البيع\nBA_727\t32',{fullSnapshot:true}),/للمخزون فقط/);
assert.match(ui,/v113-full-snapshot/);
assert.match(ui,/fullSnapshot:fullSnapshot\.checked/);
assert.match(ui,/zeroed/);
const start=employee.indexOf('const runSearch ='),end=employee.indexOf('const stockTone =',start);
assert(start>=0&&end>start);
const s=employee.slice(start,end);
const searchContext={
 normalizeCleanId:x=>String(x||'').replace(/\D/g,''),
 normalizeText:x=>String(x||'').toLowerCase().replace(/[أإآ]/g,'ا').replace(/\s+/g,' ').trim(),
 canonicalSkuToken:x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,''),
 MIN_NAME_QUERY_LENGTH:2,MAX_SKU_RESULTS:5,MAX_NAME_RESULTS:15,MAX_DEPLETED_SKU_RESULTS:8,MAX_DEPLETED_NAME_RESULTS:8
};
vm.runInNewContext(s+'\nthis.searchTest=runSearch;',searchContext);
const item=(id,name,qty)=>({uid:id,id,cleanId:id.replace(/\D/g,''),name,searchName:name,qty,unit:'كرتون'});
const active=[item('AR_727','صنف آخر',10),item('BA_7271','ابريق آخر',8)];
const depleted=[item('BA_727','ابريق وضوء',0)];
const exact=searchContext.searchTest(active,'BA_727',false,depleted);
assert.equal(exact.exact.id,'BA_727','exact depleted SKU must outrank numerically similar in-stock SKU');
const named=searchContext.searchTest(active,'ابريق',false,depleted);
assert.equal(named.depletedTotal,1);
assert.equal(named.depletedVisible[0].id,'BA_727');
assert.match(employee,/id="batco-depleted-results"/);
assert.match(employee,/search\.depletedVisible\.map/);
assert.match(employee,/عرض الأصناف المنتهية/);
console.log('V113_INVENTORY_TRUTH_PASS: partial retention, full-report zero reconciliation, limited coverage guard, original metadata, precise SKU search, visible archive section');