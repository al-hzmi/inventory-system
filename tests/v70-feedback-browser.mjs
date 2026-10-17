import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const load=p=>fs.readFileSync(p,'utf8');
const base='https://v70-feedback-ui.test';
const js=load('v70-employee-feedback.js').replace(
 'const INITIAL_DELAY=4000,RETRY_DELAY=800,MAX_BUSY_WAIT=60000,IDLE_THRESHOLD=1800;',
 'const INITIAL_DELAY=50,RETRY_DELAY=50,MAX_BUSY_WAIT=1000,IDLE_THRESHOLD=25;'
);
const css=load('v70-employee-feedback.css');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
function fixture(){
 return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<link rel="stylesheet" href="./v70-employee-feedback.css"></head><body style="margin:0;background:#f5f5f4;font-family:system-ui">'+
 '<main style="max-width:850px;padding:22px;margin:auto"><h1>شركة بيت الأواني الطيبة</h1><input id="searchInput" style="width:100%;height:46px" placeholder="بحث الأصناف"></main>'+
 '<script>localStorage.setItem("inventory_user_name_v2","موظف مختبر");'+
 'localStorage.setItem("inventory_employee_id_v2","employee-ui");'+
 'localStorage.setItem("inventory_employee_auth_version_v2","2");'+
 'localStorage.setItem("inventory_login_photo_proof_v2",JSON.stringify({role:"employee",employeeId:"employee-ui",photoId:"proof"}));'+
 'window.__writes=[];const ff=()=>({collection:()=>({doc:()=>({get:async()=>({exists:false}),set:async data=>{window.__writes.push(data)}})})});'+
 'ff.FieldValue={serverTimestamp:()=>({seconds:1760000000})};window.firebase={apps:[{}],firestore:ff};'+
 '</script><script src="./v70-employee-feedback.js"></script></body></html>';
}
async function route(page){
 await page.route(base+'/**',async action=>{
  const pathname=new URL(action.request().url()).pathname;
  if(pathname==='/index.html')return action.fulfill({status:200,contentType:'text/html',body:fixture()});
  if(pathname==='/v70-employee-feedback.css')return action.fulfill({status:200,contentType:'text/css',body:css});
  if(pathname==='/v70-employee-feedback.js')return action.fulfill({status:200,contentType:'application/javascript',body:js});
  return action.fulfill({status:404,body:'missing'});
 });
}
for(const [width,height] of [[320,640],[390,844],[820,1050],[1440,900]]){
 const ctx=await browser.newContext({viewport:{width,height},locale:'ar-SA',hasTouch:width<600});
 const page=await ctx.newPage();const errors=[];page.on('pageerror',err=>errors.push(err.message));
 try{
  await route(page);
  await page.goto(base+'/index.html',{waitUntil:'load'});
  await page.locator('#batco70-feedback-dialog').waitFor({state:'visible',timeout:5000});
  const box=await page.locator('#batco70-feedback-dialog').boundingBox();
  assert.ok(box,'Modal must be displayed');
  assert.ok(box.x>=7&&box.x+box.width<=width-7,'Modal must fit width '+width+': '+JSON.stringify(box));
  assert.ok(box.y>=0&&box.y+box.height<=height+1,'Modal must fit height '+height+': '+JSON.stringify(box));
  assert.ok(Math.abs(box.x+box.width/2-width/2)<=4,'Modal must be horizontally centered');
  assert.equal(await page.locator('.b70-star').count(),5);
  assert.equal(await page.locator('.b70-send').isEnabled(),false);
  const scrollWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(scrollWidth<=width+5,'No horizontal overflow '+width+': '+scrollWidth);
  await page.locator('.b70-later').click();
  assert.equal(await page.locator('#batco70-feedback-dialog').count(),0,'Later closes immediately');
  await page.reload({waitUntil:'load'});
  await page.locator('#batco70-feedback-dialog').waitFor({state:'visible',timeout:5000});
  await page.locator('[data-rating="5"]').click();
  await page.locator('.b70-send').click();
  await page.waitForFunction(()=>window.__writes.length===1,{timeout:5000});
  assert.equal(await page.evaluate(()=>window.__writes[0].stars),5);
  await page.waitForTimeout(1000);
  await page.reload({waitUntil:'load'});
  await page.waitForTimeout(210);
  assert.equal(await page.locator('#batco70-feedback-dialog').count(),0,'Submitted rating must not prompt again on next visit');
  assert.deepEqual(errors,[],'Browser exceptions: '+errors.join(' | '));
  console.log('V70_FEEDBACK_VIEWPORT_PASS '+width+'x'+height);
 }finally{await ctx.close()}
}
await browser.close();
console.log('V70_FEEDBACK_BROWSER_PASS');
