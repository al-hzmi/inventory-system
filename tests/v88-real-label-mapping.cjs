const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const js=fs.readFileSync('branch-presence-core.js','utf8');
new vm.Script(js);
const root=vm.createContext({});
vm.runInContext(js,root);
const C=root.BranchPresenceCore;
const actualBarcode='5469835259789',differentValidPrefix='6469131259789';
const warehouse=fs.readFileSync('data/jeddah.tsv','utf8');
const products=C.inventory(warehouse);
assert.ok(products.some(p=>p.sku==='AR_25978'&&p.warehouseQty>0),'label SKU must actually exist in Jeddah warehouse');
assert.equal(C.checkEAN(actualBarcode),true);
assert.equal(C.checkEAN(differentValidPrefix),true,'test alternate apparently valid misread must not match supplier prefix');
const resolved=C.resolveScan(actualBarcode,products);
assert.equal(resolved.item.sku,'AR_25978');
assert.equal(resolved.reason,'verified-manufacturer-ean');
assert.equal(C.resolveScan(differentValidPrefix,products).reason,'unlinked-ean','unknown EAN prefix cannot borrow a matching suffix');
assert.equal(C.resolveScan(differentValidPrefix,products).item,null);
assert.equal(C.resolveScan('5469835259788',products).reason,'invalid-ean','invalid check digit cannot fall back to substring search');
assert.equal(C.resolveScan('5469835259788',products).item,null);
assert.equal(C.resolveScan(actualBarcode,[{sku:'ARM_25978',warehouseQty:2}]).reason,'unlinked-ean','only photographed AR brand label is supported');
assert.equal(C.resolveScan(actualBarcode,[{sku:'AR_25978',warehouseQty:1},{sku:'AR_25978',warehouseQty:2}]).reason,'ambiguous','duplicated record must not auto-register');
assert.equal(C.resolveScan('AR_25978',products).item.sku,'AR_25978','manual SKU still works');
assert.equal(C.resolveScan('25978',products).item.sku,'AR_25978','manual numeric SKU still works');
assert.equal(C.resolveScan('ARM_10004',products).item.sku,'ARM_10004','legacy SKU still works');
assert.equal(C.resolveScan('5469835001128',products).reason,'unlinked-ean','other label cannot resolve without SKU');
for(const [barcode,sku] of [['6864553215977','AR_21597'],['6864553217773','AR_21777']]){
 assert.equal(C.checkEAN(barcode),true,barcode+' is a real valid EAN-13');
 for(const warehouseFile of ['data/jeddah.tsv','data/riyadh.tsv']){
  const warehouseProducts=C.inventory(fs.readFileSync(warehouseFile,'utf8')).filter(p=>p.warehouseQty>0);
  assert.ok(warehouseProducts.some(p=>p.sku===sku),sku+' must be in '+warehouseFile);
  const found=C.resolveScan(barcode,warehouseProducts);
  assert.equal(found.item?.sku,sku,barcode+' must resolve to '+sku+' in '+warehouseFile);
  assert.equal(found.reason,'verified-manufacturer-ean');
 }
}
assert.equal(C.resolveScan('6864553215978',products).reason,'invalid-ean','bad checksum must be rejected');
assert.equal(C.resolveScan('6469131259789',products).reason,'unlinked-ean','unverified supplier prefix must still be rejected');
const html=fs.readFileSync('branch-presence.html','utf8'),css=fs.readFileSync('branch-presence.css','utf8'),audio=fs.readFileSync('branch-scan-audio.js','utf8');
assert.match(html,/branch-presence-core\.js\?v=114\.0/);
assert.match(html,/branch-scan-audio\.js\?v=88\.0/);
assert.match(css,/#cameraReader video,#cameraReader__scan_region video/);
assert.match(css,/object-fit:cover!important/);
assert.match(audio,/chirp\(ctx,1510/);
assert.match(audio,/chirp\(ctx,370/);
assert.match(fs.readFileSync('sw.js','utf8'),/stocktake-shell-v8[89]/);
console.log('PASS V88: photographed 5469835259789 maps verified AR_25978 in actual Jeddah inventory; misreads, bad checksum, missing prefix and duplicate candidates rejected');
