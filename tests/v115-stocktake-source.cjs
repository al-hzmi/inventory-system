'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const api=fs.readFileSync('api/inventory-import.js','utf8');
const stocktake=fs.readFileSync('admin-stocktake.html','utf8');
const importer=fs.readFileSync('v59-admin-import-ui.js','utf8');
const html=fs.readFileSync('admin-inventory-import.html','utf8');
const header='رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\t\t\n';
const original=header+[
 'ARM_10004\tA\tكرتون\t8\t12\t\t',
 'ARM_10005\tB\tكرتون\t6\t12\t\t',
 'ARM_10006\tC\tكرتون\t4\t12\t\t',
 'ARM_10007\tD\tكرتون\t2\t12\t\t',
 'ARM_10008\tE\tكرتون\t0\t12\t\t'
].join('\n')+'\n';
const other=header+'AR_NEW\tNew from Riyadh\tكرتون\t5\t36\t\t\n';
let latestSha='SHA_JED',writes=0;
const fakeFetch=async(url,opts={})=>{
 if((opts.method||'GET')!=='GET'){writes++;throw Error('STOCKTAKE_TEST_FORBIDS_WRITES')}
 const u=new URL(url),which=u.pathname.endsWith('/data/riyadh.tsv')?'riyadh':'jeddah';
 return{ok:true,status:200,json:async()=>({
  sha:which==='riyadh'?'SHA_RIY':latestSha,
  content:Buffer.from(which==='riyadh'?other:original).toString('base64')
 })};
};
const sandbox={
 require,module:{exports:{}},process:{env:{GITHUB_TOKEN:'TEST',GITHUB_OWNER:'example',GITHUB_REPO:'inventory-system',GITHUB_BRANCH:'main'}},
 Buffer,fetch:fakeFetch,URL,Intl,Date
};
vm.runInNewContext(api,sandbox);
const handler=sandbox.module.exports;
const adminToken=(stocktake.match(/const ADMIN_HASH='([^']+)'/)||[])[1];
assert.ok(adminToken,'Original dashboard admin proof must remain configured');
async function request(action,fields={}){
 let status=0,result=null;
 const res={setHeader(){},status(value){status=value;return this},json(value){result=value;return value}};
 const req={method:'POST',headers:{host:'inventory-system-coral-nu.vercel.app'},body:{
  action,kind:'jeddah',fullSnapshot:true,
  adminToken,adminProof:{role:'admin',photoId:'test'},
  ...fields
 }};
 await handler(req,res);
 return{status,result};
}
(async()=>{
 const latest=await request('stocktake_source');
 assert.equal(latest.status,200);
 assert.equal(latest.result.content,original);
 assert.equal(latest.result.sha,'SHA_JED');
 assert.equal(latest.result.contentHash,crypto.createHash('sha256').update(original).digest('hex'));
 const report='رقم الصنف\tالكمية المتوفرة\nARM_10004\t12\nARM_10005\t4\nARM_10006\t4\nAR_NEW\t7\n';
 const preview=await request('stocktake_preview',{text:report});
 assert.equal(preview.status,200);
 assert.equal(preview.result.summary.zeroed,1,'An omitted active SKU becomes zero only in the stocktake snapshot');
 assert.equal(preview.result.summary.added,1,'New SKU in other branch gets complete metadata');
 const prepared=await request('stocktake_prepare',{text:report,sha:preview.result.sha});
 assert.equal(prepared.status,200);
 assert.ok(prepared.result.content.includes('ARM_10007\tD\tكرتون\t0\t12'));
 assert.ok(prepared.result.content.includes('AR_NEW\tNew from Riyadh\tكرتون\t7\t36'));
 assert.equal(prepared.result.contentHash,crypto.createHash('sha256').update(prepared.result.content).digest('hex'));
 assert.equal(writes,0,'Stocktake import must never write to GitHub');
 assert.equal(original.includes('ARM_10007\tD\tكرتون\t2\t12'),true,'Original public stock remains unchanged');
 const unknown='رقم الصنف\tالكمية المتوفرة\nARM_10004\t8\nARM_10005\t6\nARM_10006\t4\nV115_NEW\t9\n';
 const withoutMeta=await request('stocktake_preview',{text:unknown});
 assert.equal(withoutMeta.result.summary.metadataNeeded,1);
 const denied=await request('stocktake_prepare',{text:unknown,sha:withoutMeta.result.sha});
 assert.equal(denied.status,400,'Missing new-item details block stocktake creation');
 const completed=await request('stocktake_prepare',{text:unknown,sha:withoutMeta.result.sha,
  metadataOverrides:{V115_NEW:{name:'new SKU',unit:'كرتون',pack:8}}});
 assert.equal(completed.status,200);
 assert.ok(completed.result.content.includes('V115_NEW\tnew SKU\tكرتون\t9\t8'));
 latestSha='SHA_CHANGED';
 const stale=await request('stocktake_prepare',{text:report,sha:'SHA_JED'});
 assert.equal(stale.status,409,'A stale preview can never silently become the reference');
 const badMode=await request('stocktake_preview',{text:report,fullSnapshot:false});
 assert.equal(badMode.status,400,'Stocktake imports must always be full-report snapshots');
 assert.equal(writes,0);
 const start=stocktake.indexOf('<script>\nconst firebaseConfig'),end=stocktake.indexOf('</script><script defer src="./batco-brand-footer',start);
 assert(start>0&&end>start);
 assert.doesNotThrow(()=>new Function(stocktake.slice(start+8,end)),'Stocktake dashboard inline script must compile');
 const p=stocktake.indexOf('function strictStocktakeRows('),q=stocktake.indexOf('function stableStocktakeRows(',p);
 assert(p>0&&q>p);
 const ctx={StocktakeCore:{quantity:x=>Number(x)},norm:x=>String(x||'').toLowerCase().trim()};
 vm.runInNewContext(stocktake.slice(p,q)+'\nthis.strictRows=strictStocktakeRows;',ctx);
 assert.ok(ctx.strictRows(fs.readFileSync('data/jeddah.tsv','utf8')).length>800,'Production full inventory rows validate strictly');
 assert.throws(()=>ctx.strictRows(header+'ARM_10004\tA\tكرتون\t8\t12\nARM_10004\tB\tكرتون\t5\t12\n'),/مكرر/);
 assert.match(importer,/stocktake_prepare/);
 assert.match(importer,/stocktake_preview/);
 assert.match(importer,/batco-stocktake-source-v115/);
 assert.match(importer,/stocktakeMode/);
 assert.match(stocktake,/inventoryItemsHash/);
 assert.match(stocktake,/inventorySourceSha/);
 assert.match(stocktake,/تغيّر مخزون الفرع بعد إنشاء الجرد/);
 assert.match(html,/v59-admin-import-ui\.js\?v=115\.0/);
 console.log('V115_STOCKTAKE_SOURCE_PASS: identical PDF/Excel importer, pure reference prepare, zeroing, new SKUs, immutable SHA, no public-stock writes');
})().catch(e=>{console.error(e);process.exitCode=1});
