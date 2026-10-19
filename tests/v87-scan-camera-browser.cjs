const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,args:engine===chromium?['--no-sandbox']:[]});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.addInitScript(()=>{
  window.__v86Audio={frequencies:[],resumed:0};
  class MockAudioContext {
   constructor(){this.state='suspended';this.currentTime=0;this.destination={}}
   resume(){this.state='running';window.__v86Audio.resumed++;return Promise.resolve()}
   createOscillator(){return {
    frequency:{setValueAtTime(hz){window.__v86Audio.frequencies.push(hz)}},
    connect(){},start(){},stop(){},type:'sine'
   }}
   createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}
  }
  window.AudioContext=MockAudioContext;
 });
 await context.addInitScript(()=>{
  localStorage.setItem('inventory_user_name_v2','موظف اختبار');
  localStorage.setItem('inventory_employee_id_v2','qa85');
  localStorage.setItem('inventory_employee_auth_version_v2','2');
  localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:'qa85',photoId:'proof'}));
  const ctrl={enabled:true,sessionId:'s85',assignedEmployeeIds:['qa85']};
  const sess={branchName:'فرع جدة',warehouse:'jeddah',status:'active',assignedEmployeeIds:['qa85'],products:[{sku:'ARM_10004',name:'صنف اختبار',warehouseQty:10},{sku:'ARM_10005',name:'صنف إضافي',warehouseQty:7}]};
  const records={},listeners=[],snap=(id,v)=>({id,exists:!!v,data:()=>v});
  const notify=()=>listeners.forEach(fn=>fn({docs:Object.entries(records).map(([id,data])=>({id,data:()=>data}))}));
  const db={
   collection(name){return{doc(id){
     if(name==='system_controls')return{onSnapshot(fn){queueMicrotask(()=>fn(snap(id,ctrl)));return()=>{}}};
     if(name==='branch_presence_sessions')return{id,onSnapshot(fn){queueMicrotask(()=>fn(snap(id,sess)));return()=>{}},collection(){return{onSnapshot(fn){listeners.push(fn);queueMicrotask(notify);return()=>{}},doc(id){return{id}}}}};
     return{id}
   }}},
   async runTransaction(fn){return fn({get:async ref=>snap(ref.id,sess),set:(ref,data)=>{records[ref.id]=data;notify()}})}
  };
  const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>({seconds:1})};
  window.firebase={apps:[{}],initializeApp:()=>{},firestore};
  window.__v85={records,sess,secondaryCount:0};
  HTMLCanvasElement.prototype.getContext=function(){return{save(){},restore(){},translate(){},rotate(){},drawImage(){}}};
  HTMLCanvasElement.prototype.toDataURL=function(){return 'data:image/jpeg;base64,AAAA'};
 });
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='www.gstatic.com')return route.fulfill({body:'',contentType:'application/javascript'});
  if(url.hostname==='unpkg.com'){
   const js='window.Html5QrcodeSupportedFormats={CODE_128:1,EAN_13:2,UPC_A:3};'
    +'window.Html5Qrcode=class{constructor(id){this.id=id}async start(device,options,callback){'
    +'window.__v85.zxing=callback;const el=document.createElement("video");'
    +'Object.defineProperties(el,{readyState:{value:4},videoWidth:{value:640},videoHeight:{value:480}});'
    +'document.getElementById("cameraReader").appendChild(el);}'
    +'async stop(){}async clear(){}'
    +'};';
   return route.fulfill({body:js,contentType:'application/javascript'});
  }
  if(url.hostname==='cdn.jsdelivr.net'){
   const js='window.Quagga={decodeSingle:function(opts,cb){window.__v85.secondaryCount++;'
    +'cb({codeResult:{code:"5469835001128",format:"ean_13"}});}};';
   return route.fulfill({body:js,contentType:'application/javascript'});
  }
  if(url.hostname!=='localhost')return route.abort();
  const target=path.join(process.cwd(),decodeURI(url.pathname).replace(/^\//,''));
  if(!fs.existsSync(target)||!fs.statSync(target).isFile())return route.abort();
  const ext=path.extname(target),type=ext==='.js'?'application/javascript':ext==='.html'?'text/html':ext==='.css'?'text/css':'image/svg+xml';
  return route.fulfill({body:fs.readFileSync(target),contentType:type});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost/branch-presence.html');
 await page.locator('#workerScan').waitFor({state:'visible'});
 const cameraBoxBefore=await page.locator('.cameraViewport').boundingBox();
 const controlsBoxBefore=await page.locator('.cameraControls').boundingBox();
 assert.ok(cameraBoxBefore.height>=225,'camera preview must reserve size before starting');
 assert.ok(controlsBoxBefore.height>=100,'hardware controls must have pre-reserved size');
 assert.equal(await page.locator('#cameraStandby').isVisible(),true);
 assert.equal(await page.locator('button#workerSoundTest').count(),0);
 assert.equal(await page.locator('button#workerSoundToggle').count(),0);
 assert.equal(await page.locator('#workerCamera svg.barcodeGlyph').count(),1,'real barcode SVG icon replaces square glyph');
 await page.locator('#workerCamera').click();
 await page.waitForFunction(()=>window.__v86Audio.resumed>0);
 await page.locator('#cameraStandby').waitFor({state:'hidden'});
 const cameraBoxOpen=await page.locator('.cameraViewport').boundingBox();
 const controlsBoxOpen=await page.locator('.cameraControls').boundingBox();
 assert.ok(Math.abs(cameraBoxOpen.height-cameraBoxBefore.height)<2,'camera must never resize on opening');
 assert.ok(Math.abs(controlsBoxOpen.height-controlsBoxBefore.height)<2,'camera controls must not push page on open');
 assert.ok((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=3,'mobile scanner must not overflow horizontally');
 const acceptedBefore=await page.evaluate(()=>window.__v86Audio.frequencies.filter(x=>x===1175).length);

 await page.waitForFunction(()=>window.__v85.secondaryCount>0,{timeout:12000});
 await page.locator('#cameraDecoded').waitFor({state:'visible'});
 assert.match(await page.locator('#cameraDecoded').innerText(),/5469835001128/);
 assert.match(await page.locator('#workerFeedback').innerText(),/غير مرتبط بصنف/);
 assert.equal(await page.evaluate(()=>Object.keys(window.__v85.records).length),0,'Do not count an unrelated EAN as warehouse SKU');
 assert.equal(await page.evaluate(()=>window.__v86Audio.frequencies.filter(x=>x===1175).length),acceptedBefore,'unlinked EAN must not beep success');

 await page.evaluate(()=>window.__v85.zxing('ARM_10004'));
 await page.waitForFunction(()=>Object.keys(window.__v85.records).length===1);
 await page.waitForFunction(target=>window.__v86Audio.frequencies.filter(x=>x===1175).length===target,acceptedBefore+1);
 assert.match(await page.locator('#cameraFlash').innerText(),/تم اعتماد الصنف/);

 assert.equal(await page.locator('#workerDone').innerText(),'١','one valid SKU registered');

 await page.locator('#workerInput').fill('ARM_10004');
 await page.locator('#workerInput').press('Enter');
 await page.waitForFunction(()=>window.__v86Audio.frequencies.includes(490));
 assert.equal(await page.evaluate(()=>window.__v86Audio.frequencies.filter(x=>x===1175).length),acceptedBefore+1,'duplicate must not play acceptance');
 await page.locator('#workerCloseCamera').click();
 await page.locator('#workerInput').fill('ARM_10005');
 await page.locator('#workerInput').press('Enter');
 await page.waitForFunction(()=>Object.keys(window.__v85.records).length===2);
 await page.waitForFunction(target=>window.__v86Audio.frequencies.filter(x=>x===1175).length===target,acceptedBefore+2);
 assert.match(await page.locator('#workerFeedback').innerText(),/تم مسح/);

 const cameraBoxAfter=await page.locator('.cameraViewport').boundingBox();
 assert.ok(Math.abs(cameraBoxAfter.height-cameraBoxBefore.height)<2,'closing must restore same viewport geometry');
 const before=await page.evaluate(()=>window.__v85.secondaryCount);
 await page.waitForTimeout(1100);
 assert.equal(await page.evaluate(()=>window.__v85.secondaryCount),before,'secondary decoder must stop with camera');
 assert.deepEqual(errors,[]);
 console.log('PASS V87 '+(process.env.BROWSER||'chromium')+': independent EAN decoder, explicit raw detection, safe unmapped barcode, register real SKU, stop on camera close');
 await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});
