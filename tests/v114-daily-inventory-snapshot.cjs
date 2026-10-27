'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const api=fs.readFileSync('api/inventory-import.js','utf8');
const ui=fs.readFileSync('v59-admin-import-ui.js','utf8');
const html=fs.readFileSync('admin-inventory-import.html','utf8');
const ctx={require,module:{exports:{}},process:{env:{}},Buffer,fetch:()=>{throw Error('Import test must never write')}};
vm.runInNewContext(api+'\nthis.testPrepare=prepare;',ctx);
const prepare=ctx.testPrepare;
const inventory=branch=>fs.readFileSync('data/'+branch+'.tsv','utf8');
const rows=text=>text.trimEnd().split(/\r?\n/).slice(1).map(line=>line.split('\t')).filter(c=>c[0]);
const report=products=>'رقم الصنف\tالكمية المتوفرة\n'+products.map(c=>c[0]+'\t'+c[3]).join('\n')+'\n';
for(const branch of ['jeddah','riyadh']){
 const old=inventory(branch);
 const other=inventory(branch==='jeddah'?'riyadh':'jeddah');
 const products=rows(old),otherProducts=rows(other);
 const active=products.filter(c=>Number(c[3])>0);
 const priorMeta=new Map(products.map(c=>[c[0],c.slice(1,3).concat(c[4])]));
 const exact=prepare(branch,report(active),old,{fullSnapshot:true,referenceInventory:other});
 assert.equal(exact.content,old,branch+': ERP report with active SKUs must be idempotent');
 assert.equal(exact.summary.zeroed,0,branch+': yesterday zero-stock items stay zero');
 assert.equal(exact.summary.metadataNeeded,0);
 const missing=active.filter((c,i)=>i%20===0);
 const remaining=active.filter((c,i)=>i%20!==0);
 const updated=prepare(branch,report(remaining),old,{fullSnapshot:true,referenceInventory:other});
 assert.equal(updated.summary.zeroed,missing.length,branch+': omitted active SKUs become zero');
 for(const id of missing.map(c=>c[0])){
  const after=rows(updated.content).find(c=>c[0]===id);
  assert.equal(after[3],'0');
  assert.deepEqual(after.slice(1,3).concat(after[4]),priorMeta.get(id),'Metadata must be preserved');
 }
 const repeated=prepare(branch,report(remaining),updated.content,{fullSnapshot:true,referenceInventory:other});
 assert.equal(repeated.content,updated.content,branch+': repeated daily update must never accumulate');
 assert.equal(repeated.summary.zeroed,0);
 const tooShort=active.filter((c,i)=>i%3!==0);
 assert.throws(()=>prepare(branch,report(tooShort),old,{fullSnapshot:true,referenceInventory:other}),/منعنا تصفير/,'Incomplete import must be blocked');
 const partial=prepare(branch,report(remaining),old,{fullSnapshot:false});
 assert.equal(partial.summary.zeroed,0,'Explicit partial imports may preserve omitted SKUs');
 const fromOther=otherProducts.find(c=>!priorMeta.has(c[0])&&c[1]?.trim()&&c[2]?.trim()&&Number(c[4])>0);
 if(fromOther){
  const imported=prepare(branch,report([...active,fromOther]),old,{fullSnapshot:true,referenceInventory:other});
  assert.equal(imported.summary.added,1,'New-to-branch SKU must import');
  assert.equal(imported.summary.metadataNeeded,0,'Metadata must be borrowed only by exact SKU from other branch');
  assert.ok(imported.content.includes(fromOther[0]+'\t'+fromOther[1]+'\t'+fromOther[2]+'\t'+fromOther[3]+'\t'+fromOther[4]));
 }
 console.log('V114_'+branch.toUpperCase()+'_PASS: '+products.length+' SKUs, '+active.length+' active, '+missing.length+' zeroed safely');
}
const jed=inventory('jeddah'),active=rows(jed).filter(c=>Number(c[3])>0);
const newSku=['VTEST_999980','VTEST_999981'];
const newInput=report([...active,[newSku[0],'','','7',''],[newSku[1],'','','5','']]);
const preview=prepare('jeddah',newInput,jed,{fullSnapshot:true,referenceInventory:inventory('riyadh')});
assert.equal(preview.summary.metadataNeeded,2);
assert.equal(preview.summary.added,2);
assert.equal(preview.summary.pendingNew.join(','),newSku.join(','));
const saved=prepare('jeddah',newInput,jed,{fullSnapshot:true,metadataOverrides:{
 [newSku[0]]:{name:'صنف تجريبي',unit:'كرتون',pack:'8'},
 [newSku[1]]:{name:'صنف تجريبي ثان',unit:'حبة',pack:'1'}
}});
assert.equal(saved.summary.metadataNeeded,0);
assert.equal(saved.summary.added,2);
assert.ok(saved.content.includes('VTEST_999980\tصنف تجريبي\tكرتون\t7\t8'));
assert.ok(saved.content.includes('VTEST_999981\tصنف تجريبي ثان\tحبة\t5\t1'));
assert.throws(()=>prepare('jeddah',newInput,jed,{fullSnapshot:true,metadataOverrides:{VTEST_999980:{name:'',unit:'كرتون',pack:8}}}),/مطلوبان/);
assert.match(ui,/id="v113-full-snapshot" checked/,'Daily authoritative import must be the default');
assert.match(ui,/metadataOverrides:action==='save'/,'New SKU details must reach the API only on save');
assert.match(ui,/isMetadataReady/,'Save must be blocked until all new SKU details are complete');
assert.match(html,/v59-admin-import-ui\.js\?v=114\.0/);
assert.match(html,/v59-admin-import\.css\?v=114\.0/);
assert.match(api,/typeof b\.fullSnapshot!=='boolean'/,'Old clients must not silently keep stale stock');
assert.match(api,/if\(result\.summary\.metadataNeeded\)/,'Backend must reject saving incomplete new SKUs');
console.log('V114_AUTHORITATIVE_DAILY_IMPORT_PASS: no carry-over, partial safety, cross-branch SKU details, manual details, no accidental partial snapshot');
