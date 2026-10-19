const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
for(const file of ['branch-presence.js','branch-presence-core.js','sw.js','batco-brand-footer.js']){
 new vm.Script(read(file),{filename:file});
}
const page=read('branch-presence.html'),worker=read('branch-presence.js'),stocktake=read('stocktake.html'),
  customer=read('customer.html'),css=read('branch-presence.css');
assert.match(customer,/const customerHeaderBrand='<div className="batco-customer-header-brand" aria-label=/);
assert.doesNotMatch(customer,/const customerHeaderBrand=.*\+customerHeaderLabel/,'logo header should not reintroduce the redundant label');
assert.match(read('batco-brand-footer.js'),/width:clamp\(122px,32vw,164px\)/);
assert.match(stocktake,/function saveActual\(id\)\{ensureFeedbackAudio/);
assert.match(stocktake,/feedback\(status,finishedAll\)/);
assert.match(stocktake,/feedbackTone\(status==='shortage'\?735/);
assert.match(stocktake,/window.addEventListener\('keydown',ensureFeedbackAudio/);
assert.match(stocktake,/window.addEventListener\('touchstart',ensureFeedbackAudio/);
assert.match(worker,/formatsToSupport:formats/);
assert.match(worker,/useBarCodeDetectorIfSupported/);
assert.match(worker,/window\.BranchCameraPro\.options\(true\)/);
assert.match(worker,/code.includes\('permission-denied'\)/);
assert.match(worker,/code.includes\('resource-exhausted'\)/);
assert.match(worker,/retryTimer=setTimeout/);
assert.match(worker,/workerExport/);
assert.match(worker,/if\(!scanner\)el\('workerInput'\).focus/);
assert.match(page,/id="workerRetry"/);
assert.match(page,/id="workerExport"/);
assert.match(page,/id="workerSyncHelp"/);
assert.match(css,/cameraHint/);
assert.match(read('sw.js'),/stocktake-shell-v83/);
console.log('PASS V83 customer header, barcode tuning, audio on accepted manual counts, Firestore diagnostics and pending scan backup');
