const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,args:engine===chromium?['--no-sandbox']:[]});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true});
 await context.addInitScript(()=>{
  localStorage.setItem('inventory_user_name_v2','موظف التجربة');
  localStorage.setItem('inventory_employee_id_v2','qa83');
  localStorage.setItem('inventory_employee_auth_version_v2','2');
  localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:'qa83',photoId:'proof'}));
  const scans={},listeners=[],control={enabled:true,sessionId:'demo83',assignedEmployeeIds:['qa83']},
    session={branchName:'معرض جدة',warehouse:'jeddah',status:'active',assignedEmployeeIds:['qa83'],products:[{sku:'ARM_10004',name:'منتج 4',warehouseQty:10},{sku:'ARM_10005',name:'منتج 5',warehouseQty:6}]};
  const snap=(id,data)=>({id,exists:!!data,data:()=>data});
  const emit=()=>listeners.forEach(fn=>fn({docs:Object.entries(scans).map(([id,data])=>({id,data:()=>data}))}));
  const db={
   collection(type){return{doc(id){
    if(type==='system_controls')return {onSnapshot(fn){queueMicrotask(()=>fn(snap(id,control)));return()=>{}}};
    if(type==='branch_presence_sessions')return {id,onSnapshot(fn){queueMicrotask(()=>fn(snap(id,session)));return()=>{}},collection(){return{
      onSnapshot(fn){listeners.push(fn);queueMicrotask(emit);return()=>{}},
      doc(key){return {id:key}}
    }}};
    return{id}
   }}},
   async runTransaction(fn){
    if(!window.__v83.ready){const error=new Error('Cloud Firestore: Missing or insufficient permissions.');error.code='permission-denied';throw error}
    return fn({get:async ref=>snap(ref.id,session),set:(ref,data)=>{scans[ref.id]=data;emit()}});
   }
  };
  const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>({seconds:Math.floor(Date.now()/1000)})};
  window.firebase={apps:[{}],initializeApp:()=>{},firestore};
  window.__v83={ready:false,scans,control,session};
 });
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='www.gstatic.com')return route.fulfill({body:'',contentType:'application/javascript'});
  if(url.hostname==='unpkg.com'){
   const code='window.Html5QrcodeSupportedFormats={CODE_128:5,CODE_39:6,CODE_93:7,EAN_13:8,EAN_8:9,UPC_A:10,UPC_E:11,ITF:12,CODABAR:13,QR_CODE:14,DATA_MATRIX:15};'
     +'window.Html5Qrcode=class{constructor(_id,config){window.__cameraConstructor=config}async start(camera,options,callback){window.__cameraOptions=options;window.__cameraCb=callback;}async stop(){}async clear(){}};';
   return route.fulfill({body:code,contentType:'application/javascript'});
  }
  if(url.hostname!=='localhost')return route.abort();
  const file=path.join(process.cwd(),decodeURI(url.pathname).replace(/^\//,''));
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
  const ext=path.extname(file),type=ext==='.js'?'application/javascript':ext==='.html'?'text/html':ext==='.css'?'text/css':'image/svg+xml';
  return route.fulfill({body:fs.readFileSync(file),contentType:type});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost/branch-presence.html');
 await page.locator('#workerScan').waitFor({state:'visible'});
 await page.locator('#workerInput').fill('ARM_10004');
 await page.locator('#workerInput').press('Enter');
 await page.locator('#workerSyncHelp').waitFor({state:'visible'});
 assert.match(await page.locator('#workerSyncHelp').innerText(),/صلاحيات قاعدة البيانات/);
 assert.match(await page.locator('#workerSync').innerText(),/لم تكتمل المزامنة/);
 assert.equal(await page.evaluate(()=>Object.keys(window.__v83.scans).length),0,'rejected writes cannot be reported as server confirmed');
 const raw=await page.evaluate(()=>localStorage.getItem('batco_branch_presence_queue_v80_qa83_demo83'));
 assert.match(raw,/ARM_10004/,'failed scan is retained locally');
 const pending=page.waitForEvent('download');await page.locator('#workerExport').click();const dl=await pending;
 const csv=fs.readFileSync(await dl.path(),'utf8');
 assert.match(csv,/ARM_10004/);
 assert.match(csv,/^\uFEFF/,'report is UTF-8 for Excel');
 await page.evaluate(()=>window.__v83.ready=true);
 await page.locator('#workerRetry').click();
 await page.waitForFunction(()=>Object.keys(window.__v83.scans).length===1);
 await page.waitForFunction(()=>document.querySelector('#workerSync')?.textContent.includes('محفوظ على الخادم'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('batco_branch_presence_queue_v80_qa83_demo83')).length),0);
 await page.locator('#workerCamera').click();
 await page.waitForFunction(()=>typeof window.__cameraCb==='function');
 const options=await page.evaluate(()=>({
    fps:window.__cameraOptions.fps,
    rect:window.__cameraOptions.qrbox(390,300),
    formatCount:window.__cameraConstructor.formatsToSupport.length,
    native:window.__cameraConstructor.useBarCodeDetectorIfSupported
 }));
 assert.equal(options.fps>=14,true);
 assert.equal(options.rect.width>=350,true,'camera should scan most of iPhone width');
 assert.equal(options.formatCount>=8,true,'major one-dimensional barcode symbologies supported');
 assert.equal(options.native,true);
 await page.evaluate(()=>window.__cameraCb('ARM_10005'));
 await page.waitForFunction(()=>Object.keys(window.__v83.scans).length===2);
 await page.evaluate(()=>window.__cameraCb('ARM_10005'));
 assert.equal(await page.evaluate(()=>Object.keys(window.__v83.scans).length),2,'duplicate camera scans should not double count');
 assert.deepEqual(errors,[]);
 console.log('PASS V83 '+(process.env.BROWSER||'chromium')+': rejected server writes, honest status, retry, pending backup and widened 1D scanner');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
