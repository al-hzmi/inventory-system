/* V116 — branch-isolated pricing imports, including HTTP preview/save routing. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const source=fs.readFileSync('api/inventory-import.js','utf8');
const legacyUi=fs.readFileSync('inventory-import-ui.js','utf8');
const token=legacyUi.match(/inventory_admin_token_v2'\)!=='([^']+)'/)?.[1];
assert.ok(token,'test token from the existing admin UI must be available');
const original=[
 'مخزون جدة\t\t\t\t\tمخزون الرياض\t',
 'رقم الصنف\tسعر البيع\t\t\t\tرقم الصنف\tسعر البيع',
 'AAA_1\t200\t\t\t\tAAA_1\t300',
 'BBB_2\t400\t\t\t\tCCC_3\t500'
].join('\n')+'\n';
const calls=[];
const fakeFetch=async(url,opts={})=>{
 const target=new URL(url);
 const route=target.pathname.split('/repos/example/inventory-system/')[1];
 const method=opts.method||'GET';
 const body=opts.body?JSON.parse(opts.body):null;
 calls.push({route,method,body});
 let payload;
 if(method==='GET'&&route==='contents/data/pricing.tsv')payload={sha:'PRICE_SHA',content:Buffer.from(original).toString('base64')};
 else if(method==='GET'&&route==='git/ref/heads/main')payload={object:{sha:'HEAD_SHA'}};
 else if(method==='GET'&&route==='git/commits/HEAD_SHA')payload={tree:{sha:'TREE_SHA'}};
 else if(method==='POST'&&route==='git/trees')payload={sha:'NEW_TREE'};
 else if(method==='POST'&&route==='git/commits')payload={sha:'NEW_COMMIT'};
 else if(method==='PATCH'&&route==='git/refs/heads/main')payload={object:{sha:'NEW_COMMIT'}};
 else throw Error('Unexpected GitHub call: '+method+' '+route);
 return {ok:true,status:200,json:async()=>payload};
};
const moduleBox={exports:{}};
vm.runInNewContext(source,{
 require,module:moduleBox,process:{env:{GITHUB_TOKEN:'test',GITHUB_OWNER:'example',GITHUB_REPO:'inventory-system'}},
 Buffer,URL,Date,Intl,fetch:fakeFetch
});
const handler=moduleBox.exports;
async function request(action,kind,text,sha,fullSnapshot=false){
 const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;return this},
  status(n){this.code=n;return this},json(data){this.data=data;return this}};
 await handler({method:'POST',headers:{host:'localhost'},body:{
  action,kind,text,sha,fullSnapshot,adminToken:token,adminProof:{role:'admin',photoId:'test-photo'}
 }},res);
 return res;
}
(async()=>{
 let res=await request('preview','pricing_jeddah','رقم الصنف\tسعر البيع\nAAA_1\t240');
 assert.equal(res.code,200);
 assert.equal(res.data.summary.changed,1);
 assert.equal(res.data.summary.examples[0].before,'200');
 assert.equal(res.data.sha,'PRICE_SHA');
 res=await request('preview','pricing_riyadh','رقم الصنف\tسعر البيع\nAAA_1\t340');
 assert.equal(res.code,200);
 assert.equal(res.data.summary.examples[0].before,'300');
 for(const [kind,value,expected] of [
  ['pricing_jeddah',240,'AAA_1\t240\t\t\t\tAAA_1\t300'],
  ['pricing_riyadh',340,'AAA_1\t200\t\t\t\tAAA_1\t340']
 ]){
  calls.length=0;
  res=await request('save',kind,'رقم الصنف\tسعر البيع\nAAA_1\t'+value,'PRICE_SHA');
  assert.equal(res.code,200);
  const tree=calls.find(c=>c.route==='git/trees');
  assert.ok(tree,'save must create an atomic Git tree');
  assert.equal(tree.body.tree[0].path,'data/pricing.tsv');
  assert.ok(tree.body.tree[0].content.includes(expected));
  assert.ok(tree.body.tree[0].content.includes('BBB_2\t400\t\t\t\tCCC_3\t500'));
  assert.equal(tree.body.tree[1].path,'data/version.json');
 }
 calls.length=0;
 res=await request('save','pricing_jeddah','رقم الصنف\tسعر البيع\nAAA_1\t240','STALE_SHA');
 assert.equal(res.code,409);
 assert.ok(!calls.some(c=>c.method==='POST'||c.method==='PATCH'));
 res=await request('preview','pricing_jeddah',original);
 assert.equal(res.code,400);
 assert.match(res.data.error,/فرع واحد/);
 res=await request('preview','pricing','رقم الصنف\tسعر البيع\nAAA_1\t240');
 assert.equal(res.code,400,'old combined-price clients must not overwrite both branches');
 res=await request('preview','pricing_riyadh','رقم الصنف\tسعر البيع\nAAA_1\t340',null,true);
 assert.equal(res.code,400,'pricing must never run full-inventory reconciliation');
 const ui=fs.readFileSync('v59-admin-import-ui.js','utf8');
 assert.match(ui,/value="pricing_jeddah"/);
 assert.match(ui,/value="pricing_riyadh"/);
 assert.doesNotMatch(ui,/value="pricing"/);
 console.log('V116_BRANCH_PRICING_PASS: branch preview/save, original data isolation, stale SHA, legacy rejection, full snapshot guard, UI');
})().catch(e=>{console.error(e);process.exitCode=1});
