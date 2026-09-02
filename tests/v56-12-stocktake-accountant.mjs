import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync('admin-stocktake.html','utf8');
const accountant=fs.readFileSync('stocktake-accountant.html','utf8');
const runtime=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const index=fs.readFileSync('index.html','utf8');
const has=(s,x,m)=>assert.ok(s.includes(x),m||`missing ${x}`);

// Full training inventory, never a 10/20/30 sample.
has(admin,"testSource:'current_inventory_full'",'test campaign must be a full current-inventory snapshot');
has(admin,'function pickTestInventoryRows(rows){const dedup=new Map()','full test must deduplicate the complete warehouse source');
assert.ok(!admin.includes('id="testCount"'),'test UI must not expose sample-size control');
assert.ok(!admin.includes('Math.min(30,Math.max(1'),'test mode must not cap training inventory');
has(admin,'for(let x=0;x<rows.length;x+=350)','full test writes must be chunked below Firestore batch limits');

// Historical test cleanup was executed once from CI; normal admin use must never auto-delete future tests.
assert.ok(!admin.includes('bindSelected();cleanupLegacyTestsOnce()'),'opening admin must not auto-delete newly created test campaigns');

// Accountant control and admin preview.
has(admin,'stocktake_accountant_access','admin must own accountant visibility control');
has(admin,'data-accountant-member','accountant access must be assignable per employee');
has(admin,'saveAccountantAccess','admin must be able to grant/remove access');
has(admin,'stocktake-accountant.html?preview=1&v=56.12','root admin must be able to preview accountant perspective');

// Accountant page is a dedicated read-only surface.
has(accountant,'منظور المحاسب · قراءة فقط','accountant surface must clearly be read-only');
has(accountant,'stocktake_accountant_access','accountant page must enforce visibility control');
has(accountant,"db.collection('stocktake_items').where('campaignId','==',id)",'accountant must read stocktake item details');
assert.ok(!accountant.includes("db.collection('stocktake_items').doc("),'accountant page must not write item documents');
assert.ok(!accountant.includes('data-save'),'accountant page must not expose save actions');
assert.ok(!accountant.includes('تعديل الكمية'),'accountant page must not expose quantity editing');
has(accountant,"tab('pending','المتبقي')",'accountant must see remaining items');
has(accountant,"tab('shortage','النواقص')",'accountant must see shortages');
has(accountant,"tab('surplus','الزيادات')",'accountant must see surpluses');
has(accountant,"tab('notes','الملاحظات')",'accountant must see notes');
has(accountant,'@media(min-width:720px)','accountant page must have a desktop-specific layout');
has(accountant,'grid-template-columns:repeat(2,minmax(0,1fr))','mobile stats must be two-column and fit narrow screens');
has(accountant,'.tablewrap{display:none}','wide table must be hidden by default on mobile');

// Visibility appears in employee UI only when control allows it.
has(runtime,'useStocktakeAccountantControl','employee runtime must subscribe to accountant access control');
has(runtime,'currentStocktakeAccountantAccessAllowed','employee runtime must calculate accountant visibility per account');
has(runtime,"stocktake-accountant.html?v=56.12",'authorized employees must have accountant entry point');
has(index,"index-v37-source.txt?v=56.16",'runtime cache must be busted for V56.12');

console.log('V56.12 stocktake accountant/full-test regression: OK');
