const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const browserType=process.env.BROWSER==='webkit'?webkit:chromium;
(async()=>{
 const browser=await browserType.launch({headless:true,args:browserType===chromium?['--no-sandbox']:[]});
 const context=await browser.newContext({viewport:{width:390,height:850},acceptDownloads:true,serviceWorkers:'block'});
 const users=[
  {employeeId:'B5NLc3hSrt8yhZ0F8GLH',name:'نسيم الصلاحي'},
  {employeeId:'mCiblRUAvGnUZBlFC6Gi',name:'خالد الحزمي'}
 ];
 await context.addInitScript(({users})=>{
  localStorage.setItem('inventory_user_name_v2','مهند');
  localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');
  localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'admin',employeeId:'admin_mohanad',photoId:'admin-test'}));
  const accountRows=[
   {id:'CfX0ahrb1HCfoR0Y369N',canonicalName:'عزالدين الإدريسي',status:'active'},
   {id:'B5NLc3hSrt8yhZ0F8GLH',status:'active'},
   {id:'mCiblRUAvGnUZBlFC6Gi',status:'active'},
   {id:'uQIJog73eyBbJeXBvN68',aliases:['سالم'],status:'active'},
   {id:'rCI9MNZ3Uhjlanv04NSm',status:'active'}
  ];
  const control={enabled:false,sessionId:'',assignedEmployeeIds:[]},sessions={};
  const watchers={control:[],session:[]};
  const snapshot=(id,value)=>({id,exists:!!value,data:()=>value});
  const fire=()=>{
    for(const f of watchers.control)f(snapshot('branch_presence_feature',control));
    for(const f of watchers.session){const id=Object.keys(sessions)[0];if(id)f(snapshot(id,sessions[id]))}
  };
  let seq=0;
  const db={
   enablePersistence:async()=>{},
   collection(name){
    if(name==='system_controls')return {doc:()=>({onSnapshot(cb){watchers.control.push(cb);queueMicrotask(()=>cb(snapshot('branch_presence_feature',control)));return()=>{}},async set(data){Object.assign(control,data);fire()}})};
    if(name==='employee_accounts')return {onSnapshot(cb){queueMicrotask(()=>cb({docs:accountRows.map(r=>({id:r.id,data:()=>r}))}));return()=>{}}};
    if(name==='users')return {onSnapshot(cb){queueMicrotask(()=>cb({docs:users.map((r,i)=>({id:'profile'+i,data:()=>r}))}));return()=>{}}};
     if(name==='branch_presence_sessions')return {
       doc(id){
         const key=id||'session'+(++seq);
         return {
           id:key,
           onSnapshot(cb){watchers.session.push(cb);queueMicrotask(()=>cb(snapshot(key,sessions[key])));return()=>{}},
           collection(){return {onSnapshot(cb){queueMicrotask(()=>cb({docs:[]}));return()=>{}}};}
         };
       }
     };
    throw Error('unexpected collection '+name)
   },
   batch(){const actions=[];return{set(ref,data){actions.push({ref,data})},async commit(){for(const {ref,data} of actions){if(ref.id==='branch_presence_feature')Object.assign(control,data);else sessions[ref.id]={...(sessions[ref.id]||{}),...data}}fire()}}}
  };
  const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>({seconds:100})};
  window.firebase={apps:[{}],initializeApp:()=>{},firestore};
  window.__v81={control,sessions,accountRows};
 },{users});
 const fixture='رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\nARM_10004\tصنف4\tكرتون\t9\t60\nARM_10005\tصنف5\tكرتون\t0\t30\n';
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='www.gstatic.com')return route.fulfill({body:'',contentType:'application/javascript'});
  if(url.pathname==='/data/jeddah.tsv')return route.fulfill({body:fixture,contentType:'text/tab-separated-values'});
  if(url.hostname!=='localhost')return route.abort();
  const file=path.join(process.cwd(),decodeURI(url.pathname).replace(/^\//,''));
  if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();
  const ext=path.extname(file);
  return route.fulfill({body:fs.readFileSync(file),contentType:ext==='.html'?'text/html':ext==='.js'?'application/javascript':ext==='.css'?'text/css':'image/svg+xml'});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',dlg=>dlg.accept());
 await page.goto('http://localhost/admin-branch-presence.html');
 await page.locator('#bpBody').waitFor({state:'visible'});
 assert.equal(await page.locator('#bpExpand').isVisible(),false,'no extra expander on standalone page');
 assert.equal(await page.locator('h1').innerText(),'جرد فرع');
 const names=await page.locator('#bpEmployees').innerText();
 for(const expected of ['عزالدين الإدريسي','نسيم الصلاحي','خالد الحزمي','سالم'])assert.match(names,new RegExp(expected));
 for(const account of ['CfX0ahrb1HCfoR0Y369N','B5NLc3hSrt8yhZ0F8GLH','mCiblRUAvGnUZBlFC6Gi'])assert.ok(!names.includes(account),'employee ID must never appear as name');
 assert.match(names,/حساب بدون اسم/,'missing name should not be invented');
 assert.equal(await page.locator('input[value="rCI9MNZ3Uhjlanv04NSm"]').isDisabled(),true,'unresolved accounts cannot be assigned accidentally');
 await page.locator('#bpBranch').fill('معرض جدة');
 await page.locator('#bpEmployees input[value="B5NLc3hSrt8yhZ0F8GLH"]').check();
 await page.locator('#bpStart').click();
 await page.waitForFunction(()=>Object.keys(window.__v81.sessions).length===1);
 const assignment=await page.evaluate(()=>Object.values(window.__v81.sessions)[0].assignedEmployeeIds);
 assert.equal(assignment.join(','),'B5NLc3hSrt8yhZ0F8GLH','Firestore keeps employee IDs while UI shows human names');
 assert.deepEqual(errors,[],'no JS exceptions on dedicated settings page');
 const embedded=fs.readFileSync('admin-stocktake.html','utf8');
 assert.match(embedded,/<a id="newBranchPresence"[^>]+target="_top"[^>]*>جرد فرع<\/a>/);
 assert.equal((embedded.match(/id="newBranchPresence"/g)||[]).length,1);
 assert.ok(!embedded.includes('branchPresenceTop'),'no extra branch button in secondary header');
 assert.ok(!embedded.includes('branch-presence-admin.js'),'no inline branch form in warehouse list');
 const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');
 assert.ok(!shell.includes('openBranchFromShell'),'no duplicate shell button');
 console.log('PASS v81 '+(process.env.BROWSER||'chromium')+': standalone page, actual employee names/fallback, no IDs, single entry button and assignment IDs preserved');
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
