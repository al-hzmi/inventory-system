const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,args:engine===chromium?['--no-sandbox']:[]});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.addInitScript(()=>{
  localStorage.setItem('inventory_user_name_v2','موظف الفرع');
  localStorage.setItem('inventory_employee_id_v2','qa84');
  localStorage.setItem('inventory_employee_auth_version_v2','2');
  localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:'qa84',photoId:'proof'}));
  const control={enabled:true,sessionId:'s84',assignedEmployeeIds:['qa84']};
  const session={branchName:'معرض جدة',warehouse:'jeddah',status:'active',assignedEmployeeIds:['qa84'],products:[{sku:'ARM_10004',name:'منتج 4',warehouseQty:9},{sku:'ARM_10005',name:'منتج 5',warehouseQty:8}]};
  const saved={},subs=[],snap=(id,data)=>({id,exists:!!data,data:()=>data});
  const changed=()=>subs.forEach(fn=>fn({docs:Object.entries(saved).map(([id,data])=>({id,data:()=>data}))}));
  const firestore=()=>({
   collection(type){return{doc(id){
    if(type==='system_controls')return{onSnapshot(fn){queueMicrotask(()=>fn(snap(id,control)));return()=>{}}};
    if(type==='branch_presence_sessions')return{id,onSnapshot(fn){queueMicrotask(()=>fn(snap(id,session)));return()=>{}},collection(){return{onSnapshot(fn){subs.push(fn);queueMicrotask(changed);return()=>{}},doc(id){return{id}}}}};
    return{id}
   }}},
   async runTransaction(fn){return fn({get:async ref=>snap(ref.id,session),set:(ref,data)=>{saved[ref.id]=data;changed()}})}
  });
  firestore.FieldValue={serverTimestamp:()=>({seconds:Math.floor(Date.now()/1000)})};
  window.firebase={apps:[{}],initializeApp:()=>{},firestore};
  window.__cam84={failHD:false,zoom:true,torch:true,attempts:[],actualZoom:1,torchOn:false,stops:0,saved};
 });
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='www.gstatic.com')return route.fulfill({body:'',contentType:'application/javascript'});
  if(url.hostname==='unpkg.com'){
   const stub='window.Html5QrcodeSupportedFormats={CODE_128:1,CODE_39:2,CODE_93:3,EAN_13:4,EAN_8:5,UPC_A:6,UPC_E:7,ITF:8,CODABAR:9,QR_CODE:10,DATA_MATRIX:11};'
    +'window.Html5Qrcode=class{'
    +'constructor(_,config){window.__cam84.formats=config.formatsToSupport||[]}'
    +'async start(camera,options,callback){window.__cam84.attempts.push({videoConstraints:options.videoConstraints||null,fps:options.fps,roi:options.qrbox(390,300)});if(window.__cam84.failHD&&options.videoConstraints)throw Error("OverconstrainedError");window.__cam84.decode=callback;}'
    +'getRunningTrackCameraCapabilities(){return{'
    +'zoomFeature:()=>({isSupported:()=>window.__cam84.zoom,min:()=>1,max:()=>5,step:()=>.1,value:()=>window.__cam84.actualZoom,apply:async value=>{window.__cam84.actualZoom=value}}),'
    +'torchFeature:()=>({isSupported:()=>window.__cam84.torch,apply:async on=>{window.__cam84.torchOn=on}})'
    +'}}'
    +'async stop(){window.__cam84.stops++}async clear(){}'
    +'};';
   return route.fulfill({body:stub,contentType:'application/javascript'});
  }
  if(url.hostname!=='localhost')return route.abort();
  const file=path.join(process.cwd(),decodeURI(url.pathname).replace(/^\//,''));
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
  const ext=path.extname(file);
  return route.fulfill({body:fs.readFileSync(file),contentType:ext==='.js'?'application/javascript':ext==='.html'?'text/html':ext==='.css'?'text/css':'image/svg+xml'});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost/branch-presence.html');
 await page.locator('#workerScan').waitFor({state:'visible'});
 assert.match(await page.title(),/^جرد الفرع/);
 await page.locator('#workerCamera').click();
 await page.locator('#workerZoomControl').waitFor({state:'visible'});
 await page.locator('#workerTorch').waitFor({state:'visible'});
 let state=await page.evaluate(()=>window.__cam84);
 assert.equal(state.attempts[0].videoConstraints.width.ideal,1920,'HD camera desired');
 assert.equal(state.attempts[0].videoConstraints.height.ideal,1080);
 assert.ok(state.attempts[0].roi.width>=375,'wide area supports off-centre angles');
 assert.ok(state.formats.length>=9,'common barcode formats enabled');
 await page.locator('#workerZoom').evaluate(el=>{el.value='2.5';el.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.waitForFunction(()=>window.__cam84.actualZoom===2.5);
 assert.match(await page.locator('#workerZoomLabel').innerText(),/2.5/);
 await page.locator('#workerTorch').click();
 await page.waitForFunction(()=>window.__cam84.torchOn===true);
 await page.evaluate(()=>window.__cam84.decode('ARM_10004'));
 await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>Object.keys(window.__cam84.saved).length),0,'one frame must not register an unverified code');
 await page.evaluate(()=>window.__cam84.decode('ARM_10004'));
 await page.waitForFunction(()=>Object.keys(window.__cam84.saved).length===1);
 await page.locator('#workerCloseCamera').click();
 await page.waitForFunction(()=>window.__cam84.stops>=1);
 assert.equal(await page.locator('#cameraArea').evaluate(el=>el.classList.contains('idle')),true);
 assert.equal(await page.locator('#workerCloseCamera').isVisible(),false);
 assert.equal(await page.locator('#workerZoomControl').isVisible(),false,'camera controls release on close');
 await page.evaluate(()=>{window.__cam84.failHD=true;window.__cam84.zoom=false;window.__cam84.torch=false});
 await page.locator('#workerCamera').click();
 await page.waitForFunction(()=>window.__cam84.attempts.length>=3);
 await page.locator('#cameraArea').waitFor({state:'visible'});
 assert.equal(await page.locator('#workerZoomControl').isVisible(),false,'unsupported zoom must not be shown');
 assert.equal(await page.locator('#workerTorch').isVisible(),false,'unsupported torch must not be shown');
 state=await page.evaluate(()=>window.__cam84.attempts);
 assert.ok(state[1].videoConstraints,'HD attempted first');
 assert.equal(state[2].videoConstraints,null,'scanner falls back when device rejects HD');
 await page.evaluate(()=>window.__cam84.decode('ARM_10005'));
 await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>Object.keys(window.__cam84.saved).length),1,'one frame must not register a second code');
 await page.evaluate(()=>window.__cam84.decode('ARM_10005'));
 await page.waitForFunction(()=>Object.keys(window.__cam84.saved).length===2);
 await page.locator('#workerCloseCamera').click();
 assert.deepEqual(errors,[],'no fatal camera errors across both engines');
 console.log('PASS V84 '+(process.env.BROWSER||'chromium')+': HD & wide scan, real zoom/torch, scan count and low-end fallback');
 await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});
