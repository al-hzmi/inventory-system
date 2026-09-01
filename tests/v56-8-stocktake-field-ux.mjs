import fs from 'node:fs';
import assert from 'node:assert/strict';
const employee=fs.readFileSync('stocktake.html','utf8');
const admin=fs.readFileSync('admin-stocktake.html','utf8');
const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');
const has=(src,x,m)=>assert.ok(src.includes(x),m||`missing ${x}`);

has(employee,"filterScroll:0",'employee filter strip needs persistent scroll state');
has(employee,'function restoreFilterStrip()','employee filter strip must restore after rerender');
has(employee,"b.closest('.filters')",'employee filter click must capture strip position before rerender');
has(admin,"tabScroll:0",'admin tabs need persistent scroll state');
has(admin,'function restoreAdminTabs()','admin tabs must restore after rerender');
has(admin,"b.closest('.tabs')",'admin tab click must capture strip position before rerender');

has(employee,'function cleanDigits(value)','stocktake must normalize numeric barcode content');
has(employee,'function resolveStocktakeSearch(raw)','stocktake must resolve scanned barcodes to SKUs');
has(employee,'clean.includes(d)','barcode must support SKU embedded inside a long barcode');
has(employee,'cleanDigits(b.sku).length-cleanDigits(a.sku).length','embedded barcode resolution must prefer the longest SKU match');
has(employee,'const resolved=resolveStocktakeSearch(value)','camera scanner must use the same barcode resolver');
has(employee,'const resolved=resolveStocktakeSearch(e.target.value)','manual/pasted barcode search must use the same resolver');
has(employee,'fps:10','scanner must retain the proven inventory scanning cadence');
has(employee,'disableFlip:true','scanner must retain proven decode behavior');

has(employee,'id="v56-9-operator-ux"','employee stocktake must use the V56.9 operator UX');
has(employee,'class="searchWrap"','scanner/search control must mirror inventory search composition');
has(employee,'class="inventoryScanButton"','scanner must be an embedded icon button, not a separate oversized CTA');
has(employee,'المنجز حديثًا','completed items must be separated from the active count flow');
has(employee,'لن تظهر بقية الأصناف هنا','pending inventory must not be dumped below the search field');
has(employee,'function completedCardHtml','completed items must use compact operator rows');
has(employee,'let stocktakeAudioCtx=null','audio context must persist across asynchronous Firestore save');
has(employee,'function ensureFeedbackAudio()','audio must be unlocked from a user gesture');
has(employee,"window.addEventListener('pointerdown',ensureFeedbackAudio",'audio context must be primed before async save');
has(employee,'feedback(status,finishedAll)','save must trigger sound/haptic feedback after success');
has(employee,'العد الأول أعمى','blind-count control must remain intact');
has(employee,'كمية النظام تبقى مخفية حتى اعتماد العد الأول','expected quantity must remain hidden before first count');
assert.ok(!employee.includes('class="panel mission"'),'AI-like dark mission scoreboard must be removed from employee render');
has(admin,'id="v56-8-admin-polish"','admin stocktake should retain its proven responsive polish');
has(shell,'stocktake.html?v=56.9','employee stocktake cache key must be V56.9');
has(shell,'admin-stocktake.html?embedded=1&v=56.8','admin stocktake cache key remains V56.8');

console.log('V56.9 stocktake operator UX + barcode parity + feedback regression: OK');
