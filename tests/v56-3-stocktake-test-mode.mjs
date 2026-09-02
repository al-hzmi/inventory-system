import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync('admin-stocktake.html','utf8');
const jed=fs.readFileSync('data/jeddah.tsv','utf8');
const ruh=fs.readFileSync('data/riyadh.tsv','utf8');
const has=(s,x,msg)=>assert.ok(s.includes(x),msg||`missing ${x}`);

has(admin,'id="testCampaign"','stocktake admin must expose a test button');
has(admin,'🧪 تجربة الجرد','test mode must be visibly labelled');
has(admin,'id="testModal"','test setup must have an explicit modal');
has(admin,"jeddah:{label:'جدة',url:'./data/jeddah.tsv'}",'test must read the current Jeddah inventory source');
has(admin,"riyadh:{label:'الرياض',url:'./data/riyadh.tsv'}",'test must read the current Riyadh inventory source');
has(admin,"testSource:'current_inventory_full'",'test records must identify the full current-inventory source');
has(admin,'memberEmployeeIds:[ROOT_ID]','root admin must be assigned to the generated test team');
has(admin,'expectedQty:Number(r.qty)','test must freeze current inventory quantity into the normal stocktake item schema');
has(admin,"sourceMode:'current_inventory'",'test items must remain distinguishable from Excel imports');
has(admin,'function pickTestInventoryRows(rows){const dedup=new Map()','test must deduplicate and keep the complete inventory instead of sampling it');
assert.ok(!admin.includes('Math.min(30,Math.max(1'),'test mode must no longer cap training inventory at 30 items');
assert.ok(!admin.includes('id="testCount"'),'test setup must not ask for a sample size');
has(admin,'for(let x=0;x<rows.length;x+=350)','full test snapshot must use Firestore-safe chunked batches');
has(admin,'لا يغيّر المخزون الحقيقي','test UI must state that inventory is not mutated');
has(admin,"if(cp.isTest)return '<div",'test campaigns must bypass Excel upload');
has(admin,"test_campaign_created:'إنشاء تجربة جرد'",'test creation must be auditable');
has(admin,'activeStocktakeCampaign','test mode must detect an already-active real stocktake');
has(admin,"state.campaign.isTest&&otherActive&&otherActive.id!==state.campaign.id",'test activation must not replace another active stocktake');
has(admin,"cp.isTest?'إنهاء التجربة'",'test campaign close action must not look like accountant settlement');

const fn=admin.match(/async function createTestCampaign\(\)\{[\s\S]*?\nfunction openCampaignModal\(\)\{/);
assert.ok(fn,'createTestCampaign function must exist');
assert.ok(!fn[0].includes('XLSX.read'),'test creation must not depend on Excel parsing');
assert.ok(!fn[0].includes('state.import.rows'),'test creation must not depend on uploaded rows');
assert.ok(fn[0].includes("fetch(`${source.url}?test=${Date.now()}`,{cache:'no-store'})"),'test must bypass stale browser cache when reading current inventory');
assert.ok(fn[0].includes('pickTestInventoryRows(parseTestInventoryTsv(await response.text()))'),'test must load the full deduplicated warehouse source');

for(const [name,text] of [['jeddah',jed],['riyadh',ruh]]){
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  assert.ok(lines.length>1,`${name} inventory must contain rows`);
  const headers=lines[0].split('\t');
  assert.ok(headers.includes('رقم الصنف'),`${name} must expose SKU header`);
  assert.ok(headers.includes('الكمية المتوفرة'),`${name} must expose current quantity header`);
}

console.log('V56.12 full-inventory stocktake test regression: OK');
