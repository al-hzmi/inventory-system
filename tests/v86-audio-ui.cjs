const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('branch-scan-audio.js','utf8');
new vm.Script(script,{filename:'branch-scan-audio.js'});
const notes=[],storage={},session={type:'ambient'};
class FakeAudioContext{
 constructor(){this.state='suspended';this.currentTime=0;this.destination={}}
 resume(){this.state='running';return Promise.resolve()}
 createOscillator(){return {
  type:'sine',frequency:{setValueAtTime(value){notes.push(value)}},
  connect(){},start(){},stop(){}
 }}
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}
}
const localStorage={getItem:key=>storage[key]??null,setItem:(key,v)=>storage[key]=v};
const window={localStorage,AudioContext:FakeAudioContext,navigator:{audioSession:session}};
vm.runInNewContext(script,{window,Date,Promise});
const sound=window.BranchScanAudio;
assert.equal(sound.status().enabled,true,'acceptance alerts on by default');
assert.equal(sound.status().ready,false,'iOS requires trusted user activation');
sound.prepare();
assert.equal(sound.status().ready,true,'simulated Safari touch should unlock AudioContext');
assert.equal(session.type,'playback');
const start=notes.length;
assert.equal(sound.play('accepted'),true);
assert.deepEqual(notes.slice(start),[830,1170],'accepted new SKU has a loud distinct two-note cue');
const accepted=notes.length;
sound.play('duplicate');
assert.deepEqual(notes.slice(accepted),[380],'duplicate differs acoustically');
const beforeError=notes.length;
sound.play('error');
assert.deepEqual(notes.slice(beforeError),[280],'unknown barcode has a separate error cue');
sound.setEnabled(false);
const beforeMute=notes.length;
assert.equal(sound.play('accepted'),false);
assert.equal(notes.length,beforeMute,'muted setting suppresses sound');
assert.equal(storage.batco_branch_scan_sound_v86,'off');
sound.setEnabled(true);
assert.equal(storage.batco_branch_scan_sound_v86,'on');
assert.equal(sound.test(),true);
assert.deepEqual(notes.slice(-2),[830,1170],'test button plays real accepted sound');
const page=fs.readFileSync('branch-presence.html','utf8');
assert.ok(page.indexOf('id="workerCamera"')<page.indexOf('id="workerForm"'),'camera must precede manual form');
for(const id of ['workerCamera','workerSoundToggle','workerSoundTest','workerSoundHint','cameraFlash','cameraDecoded','workerFeedback','workerInput','workerZoom','workerTorch'])assert.ok(page.includes('id="'+id+'"'),id);
assert.doesNotMatch(page,/\sautofocus(?=[\s>])/i,'PWA page must not force mobile keyboard');
const worker=fs.readFileSync('branch-presence.js','utf8');
assert.match(worker,/document\.addEventListener\('touchstart',prepareFromGesture/);
assert.match(worker,/document\.addEventListener\('pointerdown',prepareFromGesture/);
assert.match(worker,/scanSound\?\.play\('accepted'\)/);
assert.match(worker,/if\(!persistQueue\(\)\)\{queue\.pop\(\);return\}/);
assert.match(worker,/feedback\('تم مسح '.*'good'\)/);
assert.match(fs.readFileSync('sw.js','utf8'),/stocktake-shell-v86/);
console.log('PASS V86: iOS gesture unlock, playback category, new SKU two-tone, test button, separate errors, mute and modern scan-first layout');
