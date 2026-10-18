const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const engine=process.env.BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await engine.launch({headless:true,args:engine===chromium?['--no-sandbox']:[]});
 const context=await browser.newContext({viewport:{width:390,height:820},acceptDownloads:true,serviceWorkers:'block'});
 const fixture='رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\nARM_10004\tصنف4\tكرتون\t9\t60\nARM_10005\tصنف5\tكرتون\t7\t35\nARM_10006\tصنف6\tكرتون\t0\t12\n';
 await context.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/test-v80-admin')return route.fulfill({body:'<!doctype html><html dir="rtl"><head><meta charset="utf-8"></head><body><div class="wrap"><div class="top">إدارة الجرد</div><div id="root"></div></div></body></html>',contentType:'text/html'});
   if(u.pathname==='/data/jeddah.tsv')return route.fulfill({body:fixture,contentType:'text/tab-separated-values'});
   if(u.hostname!=='localhost')return route.abort();
   const name=path.join(process.cwd(),decodeURI(u.pathname).replace(/^\//,''));
   if(!fs.existsSync(name)||!fs.statSync(name).isFile())return route.abort();
   return route.fulfill({body:fs.readFileSync(name),contentType:name.endsWith('.js')?'application/javascript':'text/css'});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost/test-v80-admin');
 await page.addScriptTag({path:'branch-presence-core.js'});
 await page.addStyleTag({path:'branch-presence-admin.css'});
 await page.evaluate(()=>{
   window.confirm=()=>true;
   const control={enabled:false,sessionId:'',assignedEmployeeIds:[]},sessions={},seen={};
   let counter=0;const controlCallbacks=[],sessionCallbacks={},seenCallbacks={};
   const snap=(data,id)=>({id,exists:!!data,data:()=>data});
   const notify=()=>{controlCallbacks.forEach(fn=>fn(snap(control,'branch_presence_feature')));for(const [id,subs] of Object.entries(sessionCallbacks))subs.forEach(fn=>fn(snap(sessions[id],id)));for(const [id,subs] of Object.entries(seenCallbacks))subs.forEach(fn=>fn({docs:Object.entries(seen[id]||{}).map(([key,record])=>({id:key,data:()=>record}))}))};
   const mkDoc=(type,id)=>{
     const ref={id};
     ref.onSnapshot=cb=>{
       const callbacks=type==='control'?controlCallbacks:sessionCallbacks[id]||(sessionCallbacks[id]=[]);
       callbacks.push(cb);queueMicrotask(()=>cb(snap(type==='control'?control:sessions[id],id)));
       return ()=>{};
     };
     ref.collection=name=>({onSnapshot(cb){(seenCallbacks[id]||(seenCallbacks[id]=[])).push(cb);queueMicrotask(()=>cb({docs:[]}));return()=>{}}});
     ref.set=async(data)=>{if(type==='control')Object.assign(control,data);else sessions[id]={...(sessions[id]||{}),...data};notify()};
     return ref;
   };
   const db={
     collection(name){
       if(name==='system_controls')return {doc:()=>mkDoc('control','branch_presence_feature')};
       if(name==='branch_presence_sessions')return {doc:id=>mkDoc('session',id||'session_'+(++counter))};
       if(name==='employee_accounts')return {onSnapshot(cb){queueMicrotask(()=>cb({docs:[{id:'qa80',data:()=>({name:'موظف الاختبار',status:'active'})},{id:'qa81',data:()=>({name:'موظف آخر',status:'active'})}]}));return()=>{}}};
       throw Error('unexpected collection '+name);
     },
     batch(){const changes=[];return {
       set(ref,data){changes.push({ref,data})},
       async commit(){for(const {ref,data} of changes){if(ref.id==='branch_presence_feature')Object.assign(control,data);else sessions[ref.id]={...(sessions[ref.id]||{}),...data}}notify()}
     }}
   };
   window.db=db;window.firebase={firestore:{FieldValue:{serverTimestamp:()=>({seconds:Math.floor(Date.now()/1000)})}}};
   window.__mockAdmin={control,sessions,seen};
 });
 await page.addScriptTag({path:'branch-presence-admin.js'});
 await page.locator('#bpExpand').click();
 await page.locator('#bpBranch').fill('معرض جدة');
 await page.locator('#bpEmployees input[value="qa80"]').check();
 await page.locator('#bpStart').click();
 await page.waitForFunction(()=>Object.keys(window.__mockAdmin.sessions).length===1,{timeout:5000});
 assert.equal(await page.evaluate(()=>window.__mockAdmin.control.assignedEmployeeIds[0]),'qa80');
 assert.equal(await page.evaluate(()=>Object.values(window.__mockAdmin.sessions)[0].products.length),2,'warehouse zero excluded');
 await page.locator('#bpPause').waitFor({state:'visible'});
 await page.locator('#bpPause').click();
 await page.waitForFunction(()=>window.__mockAdmin.control.enabled===false);
 await page.locator('#bpResume').click();
 await page.waitForFunction(()=>window.__mockAdmin.control.enabled===true);
 await page.locator('#bpFinish').click();
 await page.waitForFunction(()=>Object.values(window.__mockAdmin.sessions)[0].status==='closed');
 await page.locator('#bpExport').waitFor({state:'visible'});
 const promise=page.waitForEvent('download');
 await page.locator('#bpExport').click();
 const file=await promise,body=fs.readFileSync(await file.path(),'utf8');
 assert.match(body,/ARM_10004/);assert.match(body,/ARM_10005/);
 assert.ok(!body.includes('ARM_10006'));
 assert.deepEqual(errors,[],'admin panel must run without JS exceptions');
 console.log('PASS v80 '+(process.env.BROWSER||'chromium')+': visible admin control, employee assignment, activation, pause/resume, finish and Excel CSV');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
