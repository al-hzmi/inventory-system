const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
for(const file of ['stocktake.html','branch-presence.html','index.html']){
 const html=read(file),scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
 if(file!=='branch-presence.html')assert.ok(scripts.length>=1,file+' must contain executable inline source');
 for(let i=0;i<scripts.length;i++)new vm.Script(scripts[i],{filename:file+'#script'+i});
}
const stock=read('stocktake.html'),src=read('runtime/index-v37-source.txt'),index=read('index.html');
assert.match(stock,/batco-scan-pro\.js\?v=114\.0/);
assert.match(stock,/BranchBarcodeFallback\.create/);
assert.match(stock,/window\.BranchScanAudio\?\.play\(resolved\.item\?'accepted':'error'\)/);
assert.match(stock,/const fmts=Pro\?\.formats/);
assert.match(stock,/fmts\.length\?/);
assert.match(stock,/if\(window\.BranchScanAudio\)\{window\.BranchScanAudio\.play\('accepted'\);return\}/);
assert.match(src,/const BarcodeScannerModal = memo\(\(\{ onClose, onScan, items=\[\] \}\)/);
assert.match(src,/Audio\?\.play\('accepted'\)/);
assert.match(src,/Audio\?\.play\('error'\)/);
assert.match(src,/const fmts=Pro\?\.formats/);
assert.match(src,/window\.BranchBarcodeFallback\.create/);
assert.match(src,/Pro\.lookup\(code,items,item=>item\.id\|\|item\.sku\)/);
assert.match(index,/batco-scan-pro\.js\?v=114\.0/);
assert.match(index,/branch-barcode-fallback\.js\?v=85\.0/);
console.log('PASS V89: stocktake inline JavaScript parses; employee and warehouse share HD scanner and sound with legacy format fallback');
