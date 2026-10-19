const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('branch-camera-pro.js','utf8');
new vm.Script(code,{filename:'branch-camera-pro.js'});
const box=vm.createContext({});
vm.runInContext(code,box);
const P=box.BranchCameraPro;
assert.equal(P.formats({CODE_128:5,UPC_A:8,QR_CODE:1}).length,3);
assert.equal(P.formats({CODE_128:5,UPC_A:5}).length,2);
const roi=P.region(390,300);
assert.ok(roi.width>=375,'almost full iPhone viewfinder width must be decoded');
assert.ok(roi.height>=230,'large barcode scan region handles off-centre skew');
const high=P.options(true),safe=P.options(false);
assert.equal(high.fps,17);
assert.equal(high.videoConstraints.width.ideal,1920);
assert.equal(high.videoConstraints.height.ideal,1080);
assert.equal(high.videoConstraints.facingMode,'environment');
assert.equal(safe.videoConstraints,undefined,'camera fallback must omit advanced 1080p constraints');
(async()=>{
 const calls=[];
 const track={
  getCapabilities:()=>({zoom:{min:1,max:4,step:0.2},torch:true,focusMode:['manual','continuous']}),
  getSettings:()=>({width:1920,height:1080,zoom:1}),
  async applyConstraints(value){calls.push(value)}
 };
 const video={srcObject:{getVideoTracks:()=>[track]}};
 const hw=P.getHardware({},video);
 assert.equal(hw.zoomSupported,true);assert.equal(hw.torchSupported,true);
 assert.equal(hw.width,1920);assert.equal(hw.height,1080);
 assert.equal(await hw.setZoom(10),4,'zoom clamps to device max');
 assert.equal(await hw.setZoom(0.5),1,'zoom clamps to device min');
 assert.equal(await hw.setTorch(true),true);
 assert.equal(await hw.focus(),true);
 assert.equal(calls.length,4);
 assert.equal(calls[0].advanced[0].zoom,4);
 assert.equal(calls[2].advanced[0].torch,true);
 assert.equal(calls[3].advanced[0].focusMode,'continuous');
 let z=0,torch=null;
 const wrappers={zoomFeature:()=>({isSupported:()=>true,min:()=>1,max:()=>3,step:()=>.1,value:()=>1,apply:async val=>{z=val}}),
 torchFeature:()=>({isSupported:()=>true,apply:async val=>{torch=val}})};
 const ws=P.getHardware({getRunningTrackCameraCapabilities:()=>wrappers},null);
 assert.equal(ws.zoomSupported,true);assert.equal(ws.torchSupported,true);
 await ws.setZoom(2.7);await ws.setTorch(true);
 assert.equal(z,2.7);assert.equal(torch,true);
 const empty=P.getHardware({},null);
 assert.equal(empty.zoomSupported,false);assert.equal(empty.torchSupported,false);
 assert.equal(await empty.focus(),false);
 await assert.rejects(()=>empty.setZoom(2),/ZOOM_UNSUPPORTED/);
 assert.match(fs.readFileSync('branch-presence-entry.js','utf8'),/textContent='جرد الفرع'/);
 assert.match(fs.readFileSync('branch-presence-main-launcher.js','utf8'),/textContent='جرد الفرع'/);
 assert.doesNotMatch(fs.readFileSync('branch-presence-entry.js','utf8'),/جرد الفرع · باركود/);
 assert.doesNotMatch(fs.readFileSync('branch-presence-main-launcher.js','utf8'),/جرد الفرع · باركود/);
 const html=fs.readFileSync('branch-presence.html','utf8');
 assert.match(html,/<title>جرد الفرع \| BATCO<\/title>/);
 assert.match(html,/branch-camera-pro\.js/);
 assert.match(html,/id="workerTorch"/);assert.match(html,/id="workerZoom"/);
 const sw=fs.readFileSync('sw.js','utf8');
 assert.match(sw,/branch-camera-pro\.js/);
 assert.match(sw,/stocktake-shell-v8[45]/);
 console.log('PASS V84: high-res camera fallback, wide angled capture, real zoom/torch/focus and simplified branch entry');
})().catch(err=>{console.error(err);process.exit(1)});
