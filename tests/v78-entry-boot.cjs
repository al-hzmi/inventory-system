process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=path.resolve(process.argv[2]||'.'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(!html.includes('document.write('));assert.ok(!html.includes('const CORE='));assert.ok(!html.includes('https://cdn.tailwindcss.com'));assert.ok(!html.includes('type="text/babel"'));assert.match(html,/data:image\/svg\+xml;base64/);
const fake=`(()=>{const snap={docs:[],exists:true,size:0,empty:true,metadata:{},data:()=>({enabled:true}),forEach:()=>{}};const q={where(){return this},orderBy(){return this},limit(){return this},doc(){return this},get:async()=>snap,onSnapshot(fn){if(!window.__NO_POLICY)setTimeout(()=>fn(snap),0);return()=>{}},set:async()=>{},update:async()=>{},add:async()=>({id:'test'})};const db={collection:()=>q,enablePersistence:async()=>{}};function firestore(){return db}firestore.FieldValue={serverTimestamp:()=>({seconds:1}),arrayUnion:(...x)=>x};window.firebase={apps:[{}],firestore};})();`;
(async()=>{
 const browser=await (process.env.BROWSER==='webkit'?webkit:chromium).launch({headless:true,...(process.env.BROWSER==='webkit'?{}:{args:['--no-sandbox']})});
 const output=process.env.SCREENSHOT_DIR||path.join(root,'qa-v78');fs.mkdirSync(output,{recursive:true});
 async function scenario(name,{delayApp=false,failApp=false,employee=false,noPolicy=false,closed=false,remembered=false}={}){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block'}),page=await context.newPage(),errors=[];let resume,requests=[];
  const held=new Promise(r=>resume=r);page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(({noPolicy,closed,remembered})=>{window.__NO_POLICY=noPolicy;if(remembered){localStorage.setItem('inventory_user_name_v2','موظف الاختبار');localStorage.setItem('inventory_employee_id_v2','qa-employee');localStorage.setItem('inventory_employee_auth_version_v2','2');localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:'qa-employee',photoId:'qa-proof'}));localStorage.setItem('batco_default_branch_v78_qa-employee','riyadh');}if(closed){localStorage.setItem('inventory_user_name_v2','اختبار');localStorage.setItem('batco_employee_site_access_v1',JSON.stringify({mode:'closed',maintenanceMessage:'النظام متوقف مؤقتًا من الإدارة.'}))}},{noPolicy,closed,remembered});
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());requests.push(u.href);
   if(u.hostname==='localhost'){
    const file=path.join(root,u.pathname==='/'?'index.html':u.pathname);
    if(/\/assets\/build\/employee\.[a-f0-9]+\.js$/.test(u.pathname)){if(failApp)return route.abort();if(delayApp)await held;}
    if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'application/javascript'});
    return route.fulfill({body:u.pathname.endsWith('.tsv')?'sku\tname\tqty\n':'{}'});
   }
   if(u.href.includes('firebase-app-compat'))return route.fulfill({body:fake,contentType:'application/javascript'});
   if(u.href.includes('firebase-firestore-compat'))return route.fulfill({body:'',contentType:'application/javascript'});
   // Every other CDN fails: optional resources cannot hold employee startup hostage.
   return route.abort();
  });
  await page.goto('http://localhost/index.html'+(employee?'?employee=1':''),{waitUntil:'commit'});
  if(delayApp||failApp){await page.waitForTimeout(450);assert.equal(await page.locator('#app-loader').evaluate(e=>getComputedStyle(e).visibility),'visible');assert.equal(await page.locator('#root').evaluate(e=>e.childElementCount),0);await page.screenshot({path:path.join(output,name+'-splash.png')});if(delayApp)resume();}
  if(failApp){await page.getByRole('button',{name:'إعادة المحاولة',exact:true}).waitFor({timeout:12000});assert.equal(await page.locator('#app-loader').evaluate(e=>getComputedStyle(e).visibility),'visible');}
  else {
   await page.waitForFunction(()=>document.querySelector('#root')?.childElementCount>0,{},{timeout:8000});
   await page.waitForFunction(()=>window.__BATCO_APP_MOUNTED===true);
   if(noPolicy){if(closed)await page.getByText('النظام متوقف مؤقتًا من الإدارة.',{exact:true}).waitFor({timeout:9000});else await page.getByText('تعذر التحقق من اتصال النظام الآن. أعد المحاولة بعد قليل.',{exact:true}).waitFor({timeout:9000});}
   else if(employee&&!remembered)await page.getByPlaceholder('اكتب اسم الدخول').waitFor();
   else if(remembered)await page.getByPlaceholder(/رقم الصنف|ابحث/).first().waitFor();
   else await page.waitForFunction(()=>document.querySelector('#root')?.textContent.trim().length>10);
   await page.waitForFunction(()=>getComputedStyle(document.getElementById('app-loader')).visibility==='hidden');
   await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
   assert.deepEqual(errors,[],name);
  }
  assert.ok(!requests.some(u=>/face_mesh|html5-qrcode|qrcodejs/.test(u)),'camera vendors must load on demand only');
  console.log('PASS',name);await context.close();
 }
 await scenario('delayed-app',{delayApp:true});
 await scenario('employee-login',{employee:true});
 await scenario('employee-remembered',{employee:true,remembered:true});
 await scenario('employee-quota-recovery',{employee:true,noPolicy:true});
 await scenario('employee-cached-closed',{employee:true,noPolicy:true,closed:true});
 await scenario('missing-script',{failApp:true});
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
