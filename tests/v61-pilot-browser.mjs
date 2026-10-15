import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const src=file=>fs.readFileSync(file,'utf8');
const origin='https://inventory-pilot-e2e.test';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const warehouseJeddah=src('data/jeddah.tsv');
const warehouseRiyadh=src('data/riyadh.tsv');
const allowConfig={mode:'open',employeeHomePilot:{enabled:true,allowedEmployeeIds:['employee-real-001']}};

function employeeFixture(){
return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<link rel="stylesheet" href="./v61-employee-pilot.css"></head><body style="margin:0;background:#f5f8f6">'+
 '<div id="application"><header class="sticky" style="position:sticky;top:0;z-index:5;background:white;padding:12px 16px;border-bottom:1px solid #ddd">'+
 '<div role="group" aria-label="اختيار المستودع"><button aria-pressed="true">جدة</button><button aria-pressed="false">الرياض</button></div>'+
 '<div style="max-width:1024px;margin:auto"><input id="searchInput" type="text" placeholder="ابحث عن الصنف" style="width:100%;box-sizing:border-box;padding:12px"></div></header>'+
 '<section id="legacy-results" style="max-width:1024px;margin:18px auto;padding:12px">البحث الحالي يعمل دون تغيير</section></div>'+
 '<script>localStorage.setItem("inventory_user_name_v2","موظف تجريبي معتمد");'+
 'localStorage.setItem("inventory_employee_id_v2","employee-real-001");'+
 'localStorage.setItem("inventory_employee_auth_version_v2","2");'+
 'localStorage.setItem("inventory_login_photo_proof_v2",JSON.stringify({role:"employee",employeeId:"employee-real-001",photoId:"test-proof"}));'+
 'window.__pilotConfig='+JSON.stringify(allowConfig)+';'+
 'window.firebase={apps:[{}],firestore:()=>({collection:()=>({doc:()=>({onSnapshot(fn){window.__pilotNotify=fn;fn({exists:true,data:()=>window.__pilotConfig});return ()=>{};}})})})};'+
 '</script><script src="./v61-employee-pilot.js"></script></body></html>';
}
function adminFixture(){
return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<link rel="stylesheet" href="./v61-employee-pilot-admin.css"></head><body style="margin:0">'+
 '<div class="app"><header><div class="topin">لوحة التحكم الأصلية</div></header></div>'+
 '<script>window.isAdmin=()=>true;window.__saves=[];'+
 'window.firebase={firestore:{FieldValue:{increment:()=>1,serverTimestamp:()=>({seconds:123})}}};'+
 'window.db={collection(name){'+
 'if(name==="employee_accounts")return{limit(){return{get:async()=>({docs:[{id:"employee-real-001",data:()=>({canonicalName:"موظف حقيقي",employeeId:"wrong-legacy-id"})}]})}}};'+
 'if(name==="system_controls")return{doc(id){return{get:async()=>id==="employee_site_access"&&window.__saves.length?{exists:true,data:()=>window.__saves.at(-1)}:{exists:false},set:async data=>window.__saves.push(data)}}};'+
 'if(name==="security_admin_logs")return{add:async()=>({id:"log"})};throw Error("Unexpected Firestore collection "+name)}};'+
 'window.confirm=()=>true;</script><script src="./v61-employee-pilot-admin.js"></script></body></html>';
}

function adminHomeFixture(){
 return adminFixture()
  .replace('<div class="app"><header><div class="topin">لوحة التحكم الأصلية</div></header></div>','<div class="v62-pilot-entry"><button type="button" data-b61a-open>إدارة وتفعيل التجربة</button></div>')
  .replace('window.isAdmin=()=>true;window.__saves=[];', 'window.__saves=[];const ADMIN_HASH="verified-admin-test-token";localStorage.setItem("inventory_user_name_v2","مهند");localStorage.setItem("inventory_admin_token_v2",ADMIN_HASH);localStorage.setItem("inventory_login_photo_proof_v2",JSON.stringify({role:"admin",employeeId:"admin_mohanad",photoId:"proof"}));');
}
async function routeFiles(page){
 await page.route(origin+'/**',async route=>{
  const url=new URL(route.request().url());
  const path=url.pathname;
  let body,contentType='text/html';
  if(path==='/index.html')body=employeeFixture();
  else if(path==='/control-center.html')body=adminFixture();
   else if(path==='/admin-home.html')body=adminHomeFixture();
  else if(path==='/v61-employee-pilot.js'){body=src('v61-employee-pilot.js');contentType='application/javascript'}
  else if(path==='/v61-employee-pilot.css'){body=src('v61-employee-pilot.css');contentType='text/css'}
  else if(path==='/v61-employee-pilot-admin.js'){body=src('v61-employee-pilot-admin.js');contentType='application/javascript'}
  else if(path==='/v61-employee-pilot-admin.css'){body=src('v61-employee-pilot-admin.css');contentType='text/css'}
  else if(path==='/data/jeddah.tsv'){body=warehouseJeddah;contentType='text/tab-separated-values'}
  else if(path==='/data/riyadh.tsv'){body=warehouseRiyadh;contentType='text/tab-separated-values'}
  else return route.fulfill({status:404,body:'Not found'});
  return route.fulfill({status:200,contentType,body});
 });
}
async function checkViewport(width,height){
 const context=await browser.newContext({viewport:{width,height},locale:'ar-SA',hasTouch:width<600});
 const page=await context.newPage();
 try{
  await routeFiles(page);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/index.html',{waitUntil:'load'});
  await page.locator('#batco61-pilot').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#batco61-pilot [data-tab]').count(),3,'Expected three workspace tabs');
  assert.equal(await page.locator('#legacy-results').count(),1,'Original search must remain');
  await page.locator('#searchInput').fill('ARM_10015');
  assert.equal(await page.locator('#batco61-pilot').isVisible(),false,'Typing a product code must uncover the search results');
  assert.equal(await page.locator('#legacy-results').isVisible(),true,'Search results must remain accessible');
  await page.locator('#searchInput').fill('');
  assert.equal(await page.locator('#batco61-pilot').isVisible(),true,'Clearing search must restore the personal tiles');
  const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  if(scrollWidth>width+5){const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:String(e.className||'').slice(0,100),right:Math.round(e.getBoundingClientRect().right),scroll:e.scrollWidth})).filter(e=>e.right>innerWidth+5).slice(0,12));console.log('Overflow diagnostics',JSON.stringify(offenders))}
  assert.ok(scrollWidth<=width+5,'Viewport '+width+' overflows horizontally: '+scrollWidth);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('batco61:product-open',{detail:{sku:'ARM_10015',warehouse:'jeddah'}})));
  await page.locator('.b61-product').first().waitFor({state:'visible',timeout:3000});
  await page.locator('.b61-star').click();
  await page.locator('[data-tab="favorite"]').click();
  assert.ok((await page.locator('.b61-list').innerText()).includes('ARM_10015'));
  await page.locator('[data-tab="changes"]').click();
  assert.ok((await page.locator('.b61-list').innerText()).includes('أول زيارة'));
  await page.locator('.b61-classic').click();
  assert.equal(await page.locator('#batco61-pilot').count(),0);
  await page.locator('#b61-return').click();
  await page.locator('#batco61-pilot').waitFor();
  await page.evaluate(()=>{window.__pilotConfig={mode:'open',employeeHomePilot:{enabled:false,allowedEmployeeIds:['employee-real-001']}};window.__pilotNotify({exists:true,data:()=>window.__pilotConfig})});
  assert.equal(await page.locator('#batco61-pilot').count(),0,'Kill switch must remove workspace');
  assert.equal(await page.locator('#b61-return').count(),0,'Kill switch must remove reentry');
  assert.deepEqual(errors,[],'Browser exceptions: '+errors.join(' | '));
  console.log('V61_EMPLOYEE_VIEWPORT_PASS '+width+'x'+height);
 }finally{await context.close()}
}
async function checkAdmin(){
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ar-SA',hasTouch:true});
 const page=await ctx.newPage();
 try{
  await routeFiles(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/control-center.html?pilot=1',{waitUntil:'load'});
  await page.locator('#b61-admin-panel').waitFor({state:'visible'});
  assert.equal(await page.locator('.app').isVisible(),false,'Old admin must be hidden');
  const sw=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(sw<=395,'Admin mobile horizontal overflow '+sw);
  await page.locator('.b61a-account input').last().check();
  await page.locator('#b61a-master').check();
  await page.locator('#b61a-save').click();
  await page.waitForFunction(()=>window.__saves?.length===1);
  const saved=await page.evaluate(()=>window.__saves[0]);
  assert.equal(saved.employeeHomePilot.enabled,true);
  assert.deepEqual(saved.employeeHomePilot.allowedEmployeeIds,['employee-real-001']);
  await page.locator('#b61a-master').uncheck();
  await page.locator('#b61a-save').click();
  await page.waitForFunction(()=>window.__saves?.length===2);
  assert.equal(await page.evaluate(()=>window.__saves[1].employeeHomePilot.enabled),false,'Off must revoke everyone');
  assert.deepEqual(errors,[],'Admin exceptions: '+errors.join(' | '));
  console.log('V61_ADMIN_MOBILE_PASS: exact employee, rollout and emergency stop');
 }finally{await ctx.close()}
}
async function checkAdminHome(){
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ar-SA',hasTouch:true});
 const page=await ctx.newPage();
 try{
  await routeFiles(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/admin-home.html',{waitUntil:'load'});
  assert.equal(await page.locator('#b61-admin-panel').count(),0,'The admin panel should not auto-open');
  await page.locator('[data-b61a-open]').click();
  await page.locator('#b61-admin-panel').waitFor({state:'visible'});
  assert.equal(new URL(page.url()).pathname,'/admin-home.html','In-page controls must not navigate to control center');
  await page.locator('#b61a-master').waitFor({state:'visible'});
  assert.equal(await page.locator('#b61a-master').isEnabled(),true,'Firestore settings and employees loaded');
  assert.equal(await page.locator('.b61a-account').count(),2,'Manager and real employee should be selectable');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+5),'Manager overlay must not overflow mobile viewport');
  await page.locator('#b61a-close').click();
  assert.equal(await page.locator('#b61-admin-panel').count(),0);
  await page.locator('[data-b61a-open]').click();
  await page.locator('#b61-admin-panel').waitFor();
  assert.deepEqual(errors,[],'In-page admin browser errors: '+errors.join(' | '));
  console.log('V63_ADMIN_HOME_PASS: direct guarded control, re-entry and mobile viewport');
 }finally{await ctx.close()}
}
try{
 for(const [w,h] of [[390,844],[820,1050],[1440,900]])await checkViewport(w,h);
 await checkAdmin();
 await checkAdminHome();
 console.log('V63_BROWSER_E2E_PASS');
}finally{await browser.close()}
