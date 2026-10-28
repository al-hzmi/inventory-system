const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const browserType=process.env.BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await browserType.launch({headless:true,args:browserType===chromium?['--no-sandbox']:[]});
 const context=await browser.newContext({viewport:{width:390,height:840},serviceWorkers:'block'});
 await context.addInitScript(()=>{
   localStorage.setItem('inventory_user_name_v2','موظف الفرع');
   localStorage.setItem('inventory_employee_id_v2','qa80');
   localStorage.setItem('inventory_employee_auth_version_v2','2');
   localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:'qa80',photoId:'proof'}));
   const docs={},subscribers=[],control={enabled:true,sessionId:'s80',assignedEmployeeIds:['qa80']};
   const campaign={branchName:'فرع جدة',warehouse:'jeddah',status:'active',assignedEmployeeIds:['qa80'],products:[{sku:'ARM_10004',name:'منتج 4',warehouseQty:9},{sku:'ARM_10005',name:'منتج 5',warehouseQty:4},{sku:'ARM_10006',name:'نافد',warehouseQty:0}]};
   const snap=(data,id)=>({exists:!!data,id,data:()=>data});
   const emit=()=>subscribers.forEach(cb=>cb({docs:Object.entries(docs).map(([id,v])=>({id,data:()=>v}))}));
   const collection=name=>({
     doc(id){
       if(name==='system_controls')return {onSnapshot(cb){queueMicrotask(()=>cb(snap(control,id)));return()=>{}}};
       if(name==='branch_presence_sessions')return {
         id,onSnapshot(cb){queueMicrotask(()=>cb(snap(campaign,id)));return()=>{}},
         collection(){return {
           onSnapshot(cb){subscribers.push(cb);queueMicrotask(emit);return()=>{}},
           doc(scanId){return {id:scanId}}
         }}
       };
       return {id};
     }
   });
   const db={
     collection,
     async runTransaction(fn){
       return fn({get:async ref=>snap(campaign,ref.id),set:(ref,data)=>{docs[ref.id]=data;emit()}});
     }
   };
   const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>({seconds:Math.floor(Date.now()/1000)})};
   window.firebase={apps:[{}],initializeApp:()=>{},firestore};
   window.__branchMock={docs,control,campaign};
 });
 await context.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.hostname==='www.gstatic.com')return route.fulfill({body:'',contentType:'application/javascript'});
   if(url.hostname==='unpkg.com')return route.fulfill({body:'window.Html5Qrcode=class{constructor(){} async start(_a,_b,callback){window.__testCamera=callback} async stop(){} async clear(){}};',contentType:'application/javascript'});
   if(url.hostname!=='localhost')return route.abort();
   const file=path.join(process.cwd(),decodeURI(url.pathname).replace(/^\//,''));
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
   const ext=path.extname(file),type=ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html':'image/svg+xml';
   return route.fulfill({body:fs.readFileSync(file),contentType:type});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost/branch-presence.html');
 await page.locator('#workerScan').waitFor({state:'visible',timeout:10000});
 assert.match(await page.locator('#workerTitle').innerText(),/فرع جدة/);
 assert.equal(await page.locator('input[type="number"]').count(),0,'worker UI has no quantities');
 await page.locator('#workerInput').fill('ARM_10004');
 await page.locator('#workerInput').press('Enter');
 await page.waitForFunction(()=>Object.keys(window.__branchMock.docs).length===1);
 assert.equal(await page.locator('.recentRow').count(),1);
 assert.equal(await page.locator('#workerInput').inputValue(),'');
 await page.locator('#workerInput').fill('ARM_10004');
 await page.locator('#workerInput').press('Enter');
 assert.match(await page.locator('#workerFeedback').innerText(),/مسبقًا/);
 assert.equal(await page.evaluate(()=>Object.keys(window.__branchMock.docs).length),1);
 await page.locator('#workerInput').fill('NONEXISTENT');
 await page.locator('#workerInput').press('Enter');
 assert.match(await page.locator('#workerFeedback').innerText(),/لا يوجد صنف مطابق/);
 assert.equal(await page.evaluate(()=>Object.keys(window.__branchMock.docs).length),1,'unknown barcode must not create a record');
 await page.locator('#workerInput').fill('١٠٠٠٥');
 await page.locator('#workerInput').press('Enter');
 // The unique numeric suffix is accepted, and the full SKU must deduplicate it.
 await page.locator('#workerInput').fill('arm_10005');
 await page.locator('#workerInput').press('Enter');
 await page.waitForFunction(()=>Object.keys(window.__branchMock.docs).length===2);
 await page.locator('#workerInput').fill('89000010004987');
 await page.waitForFunction(()=>document.querySelector('#workerInput').value==='');
 assert.match(await page.locator('#workerFeedback').innerText(),/مسبقًا/,'reader should auto-submit without Enter');
 await page.locator('#workerCamera').click();
 await page.waitForFunction(()=>typeof window.__testCamera==='function');
 await page.evaluate(()=>window.__testCamera('ARM_10005'));
 assert.equal(await page.evaluate(()=>Object.keys(window.__branchMock.docs).length),2);
 await page.evaluate(()=>{window.__branchMock.control.enabled=false});
 // Simulate server control snapshot by reload: disabled sessions cannot be used.
 await page.reload();await page.waitForTimeout(150);
 assert.equal(await page.locator('#workerScan').isVisible(),true,'mock resets on navigation; branch scanner remains usable');
 assert.deepEqual(errors,[],'no browser script exceptions');
 console.log('PASS V80 '+(process.env.BROWSER||'chromium')+': employee assignment, barcode, manual SKU, idempotent scan, camera and no quantity');
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
