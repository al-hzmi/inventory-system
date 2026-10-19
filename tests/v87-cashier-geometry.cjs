const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const src=read('branch-scan-audio.js');
new vm.Script(src,{filename:'branch-scan-audio.js'});
const tones=[],levels=[],settings=new Map([['batco_branch_scan_sound_v86','off']]);
class AudioContextMock{
 constructor(){this.state='suspended';this.currentTime=0;this.destination={}}
 resume(){this.state='running';return Promise.resolve()}
 createGain(){return {gain:{value:1,setValueAtTime(){},linearRampToValueAtTime(level){levels.push(level)},exponentialRampToValueAtTime(){}},connect(){}}}
 createOscillator(){return{frequency:{setValueAtTime(hz){tones.push(hz)}},connect(){},start(){},stop(){},type:'sine'}}
 createDynamicsCompressor(){return {threshold:{value:0},knee:{value:0},ratio:{value:0},attack:{value:0},release:{value:0},connect(){}}}
}
const win={AudioContext:AudioContextMock,localStorage:{getItem:k=>settings.get(k)||null,setItem:(k,v)=>settings.set(k,v)},navigator:{audioSession:{type:'ambient'}}};
vm.runInNewContext(src,{window:win,Date,Promise});
const audio=win.BranchScanAudio;
assert.equal(audio.status().enabled,true,'old mute preferences must not silence the cashier beep');
assert.equal(typeof audio.setEnabled,'undefined','audio must have no mute API');
assert.equal(typeof audio.test,'undefined','audio must have no test button API');
assert.equal(audio.prepare(),true);
assert.equal(win.navigator.audioSession.type,'playback','iOS playback mode should be requested on trusted gesture');
assert.equal(audio.play('accepted'),true);
assert.deepEqual(tones.slice(0,3),[1510,1980,2390],'cashier beep combines two strong pulses and a crisp overtone');
assert.ok(levels.filter(x=>x>=.35).length>=2,'checkout beep uses prominent, bounded signal amplitude');
const known=tones.length;
assert.equal(audio.play('duplicate'),true);
assert.deepEqual(tones.slice(known),[590],'duplicate feedback is never the cashier accepted beep');
const bad=tones.length;
assert.equal(audio.play('error'),true);
assert.deepEqual(tones.slice(bad),[370,270],'unknown SKU must have a separate subtle error beep');
const html=read('branch-presence.html'),worker=read('branch-presence.js'),css=read('branch-presence.css');
for(const blocked of ['workerSoundToggle','workerSoundTest','workerSoundHint'])assert.ok(!html.includes(blocked),'remove '+blocked+' from interface');
assert.ok(!html.includes('class="cameraArea" hidden'),'camera should be sized before opening');
assert.match(html,/id="cameraArea" class="cameraArea idle"/);
assert.match(html,/class="barcodeGlyph" viewBox="0 0 32 32"/);
assert.match(html,/id="cameraStandby"/);
assert.match(html,/id="cameraDecoded"/);
assert.ok(html.indexOf('id="workerCamera"')<html.indexOf('id="workerForm"'));
assert.match(worker,/function setCameraLayout\(active\)/);
assert.match(worker,/function prepareFromGesture\(\)/);
assert.match(worker,/scanSound\?\.play\('accepted'\)/);
assert.match(worker,/if\(!persistQueue\(\)\)\{queue\.pop\(\);return\}/);
assert.doesNotMatch(worker,/workerSoundToggle|workerSoundTest/);
assert.match(css,/\.cameraViewport\{position:relative;display:block!important;height:clamp/);
assert.match(css,/\.cameraControls\{display:grid!important/);
assert.match(read('sw.js'),/stocktake-shell-v8[78]/);
console.log('PASS V87: mandatory cashier double beep, iOS gesture unlock, no sound controls, fixed camera geometry, SVG barcode');
