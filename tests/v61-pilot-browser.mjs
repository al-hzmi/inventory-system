import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const read=p=>fs.readFileSync(p,'utf8');
const origin='https://batco-official-ui.test';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
function employeeFixture(){
 return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<link rel="stylesheet" href="./v61-employee-pilot.css">'+
 '<style>*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:system-ui}.sticky{position:sticky;top:0;z-index:5;background:#fff;padding:12px 16px}.bg-accentSoft{background:#fef3c7;color:#b45309}.bg-bg{background:#fff}</style></head>'+
 '<body><header class="sticky"><div role="group" aria-label="اختيار المستودع"><button aria-pressed="true">جدة</button><button aria-pressed="false">الرياض</button></div>'+
 '<div class="batco-search-card"><div class="batco-search-card-head"><strong>حيّاك الله، موظف</strong><span>مساحة العمل</span></div>'+
 '<div class="batco-search-row"><input id="searchInput" placeholder="رقم الصنف" style="width:100%;box-sizing:border-box;min-height:46px"></div>'+
 '<div role="status" class="batco-image-warehouse-toast">اختر المستودع أولًا</div><div id="batco-pilot-search-slot"></div></div></header>'+
 '<main style="padding:15px;max-width:1024px;margin:auto"><section id="legacy-results">نتائج البحث الأصلية</section>'+
 '<div class="batco-result-actions" style="max-width:380px;border:1px solid #eee;padding:10px;border-radius:12px"><div class="batco-admin-action-row"><button>تغيير القسم</button></div>'+
 '<div class="batco-shopping-action-row"><button class="batco-direct-favorite"><svg viewBox="0 0 24 24"><polygon points="12 2 20 20"/></svg><b>حفظ</b></button><div class="batco-cart-action"><button>إضافة للفاتورة</button></div></div></div>'+
 '<div id="gallery-section" style="margin-top:22px"><div class="flex flex-wrap gap-8"><button id="new-arrivals" class="font-bold bg-accentSoft" aria-pressed="false">جديدنا</button><button id="missing-images" class="font-medium bg-accentSoft text-accent" aria-pressed="false">نواقص الصور</button></div>'+
 '<div class="tap-card" style="position:relative;margin:16px auto 0;width:210px;height:250px;border:1px solid #ddd;overflow:hidden;border-radius:16px">'+
 '<div class="brand-logo" style="position:absolute;left:10px;top:10px;width:57px;height:32px;background:#e7e5e4">الشعار</div>'+
 '<button class="zoom-control" style="position:absolute;right:8px;top:8px;width:36px;height:36px">تكبير</button>'+
 '<div class="batco-gallery-favorite-anchor below-zoom"><button class="batco-direct-favorite is-compact is-icon-only" aria-label="إضافة للمفضلة"><svg viewBox="0 0 24 24"><polygon points="12 2 20 20"/></svg></button></div></div></div></main>'+
 '<script>localStorage.setItem("inventory_user_name_v2","موظف حقيقي");localStorage.setItem("inventory_employee_id_v2","employee-unlisted");'+
 'localStorage.setItem("inventory_employee_auth_version_v2","2");'+
 'localStorage.setItem("inventory_login_photo_proof_v2",JSON.stringify({role:"employee",employeeId:"employee-unlisted",photoId:"proof"}));'+
 'localStorage.setItem("batco_pilot61_employee-unlisted_classic",JSON.stringify({hidden:true}));'+
 'window.firebase={apps:[{}],firestore:()=>{throw Error("Official release must not check pilot settings")}};'+
 '</script><script src="./v61-employee-pilot.js"></script></body></html>';
}
function adminFixture(){
 return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<link rel="stylesheet" href="./v61-employee-pilot-admin.css"></head><body><div class="app">الإدارة</div>'+
 '<script>window.isAdmin=()=>true;</script><script src="./v61-employee-pilot-admin.js"></script></body></html>';
}
async function routeFiles(page){
 await page.route(origin+'/**',async route=>{
  const p=new URL(route.request().url()).pathname;
  const map={'/index.html':[employeeFixture(),'text/html'],'/control-center.html':[adminFixture(),'text/html'],
  '/v61-employee-pilot.js':[read('v61-employee-pilot.js'),'application/javascript'],
  '/v61-employee-pilot.css':[read('v61-employee-pilot.css'),'text/css'],
  '/v61-employee-pilot-admin.js':[read('v61-employee-pilot-admin.js'),'application/javascript'],
  '/v61-employee-pilot-admin.css':[read('v61-employee-pilot-admin.css'),'text/css'],
  '/data/jeddah.tsv':[read('data/jeddah.tsv'),'text/tab-separated-values'],
  '/data/riyadh.tsv':[read('data/riyadh.tsv'),'text/tab-separated-values']};
  const data=map[p];if(!data)return route.fulfill({status:404,body:'Missing fixture'});
  return route.fulfill({status:200,body:data[0],contentType:data[1]});
 });
}
async function checkViewport(width,height){
 const context=await browser.newContext({viewport:{width,height},locale:'ar-SA',hasTouch:width<600});
 const page=await context.newPage();
 try{
  await routeFiles(page);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/index.html',{waitUntil:'load'});
  await page.locator('#batco61-pilot').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.evaluate(()=>window.BatcoPilot.official),true);
  assert.equal(await page.locator('.b65-actions button').count(),3);
  assert.equal(await page.locator('.b61-classic').count(),0);
  assert.ok(await page.locator('.batco-search-card').evaluate(n=>getComputedStyle(n).borderTopWidth==='1px'));
  const gallery=await page.evaluate(()=>{
   const get=q=>document.querySelector(q).getBoundingClientRect();
   const star=get('.batco-gallery-favorite-anchor'),zoom=get('.zoom-control'),logo=get('.brand-logo');
   return{star:{x:star.x,y:star.y,w:star.width,h:star.height,right:star.right},
    zoom:{right:zoom.right,bottom:zoom.bottom},logo:{right:logo.right,bottom:logo.bottom}};
  });
  assert.equal(Math.round(gallery.star.w),38,'Gallery star must be 38px square');
  assert.equal(Math.round(gallery.star.h),38,'Gallery star must be 38px square');
  assert.ok(gallery.star.y>=gallery.zoom.bottom+3,'Star should appear beneath zoom with a gap');
  assert.ok(Math.abs(gallery.star.right-gallery.zoom.right)<=3,'Star aligns with zoom on the right');
  assert.ok(gallery.star.x>gallery.logo.right,'Star cannot cover the upper-left brand logo');
  const rows=await page.evaluate(()=>{const admin=document.querySelector('.batco-admin-action-row').getBoundingClientRect(),actions=document.querySelector('.batco-shopping-action-row').getBoundingClientRect();return{adminBottom:admin.bottom,actionTop:actions.top}});
  assert.ok(rows.adminBottom<=rows.actionTop+2,'Admin category edit must occupy its own row');
  const tip=await page.evaluate(()=>{const hint=document.querySelector('.batco-image-warehouse-toast').getBoundingClientRect(),tools=document.querySelector('.b65-actions').getBoundingClientRect();return{bottom:hint.bottom,toolsTop:tools.top}});
  assert.ok(tip.bottom<=tip.toolsTop,'Warehouse hint must not overlap the shortcuts');
  assert.ok(await page.locator('#legacy-results').isVisible());
  await page.locator('#searchInput').fill('2300');
  assert.equal(await page.locator('#batco61-pilot').isVisible(),false,'Search results must take priority');
  await page.locator('#searchInput').fill('');
  assert.equal(await page.locator('#batco61-pilot').isVisible(),true,'Clearing search restores shortcuts');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('batco61:favorite-toggle',{detail:{sku:'GALLERY-1',warehouse:'jeddah',name:'Gallery'}})));
  assert.equal(await page.evaluate(()=>window.BatcoPilot.isFavorite('GALLERY-1','jeddah')),true);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('batco61:favorite-toggle',{detail:{sku:'GALLERY-1',warehouse:'jeddah'}})));
  assert.equal(await page.evaluate(()=>window.BatcoPilot.isFavorite('GALLERY-1','jeddah')),false);
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert.ok(horizontal<=width+5,'Horizontal overflow at '+width+': '+horizontal);
  assert.deepEqual(errors,[],'Browser errors: '+errors.join(' | '));
  console.log('V69_VIEWPORT_PASS '+width+'x'+height);
 }finally{await context.close()}
}
async function checkAdmin(){
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ar-SA'});
 const page=await context.newPage();
 try{
  await routeFiles(page);
  await page.goto(origin+'/control-center.html?pilot=1',{waitUntil:'load'});
  await page.locator('#b61-admin-panel').waitFor({state:'visible'});
  assert.ok((await page.locator('#b61-admin-panel').innerText()).includes('مساحة العمل الرسمية'));
  assert.equal(await page.locator('#b61a-master').count(),0,'Old rollout toggles retired');
  assert.equal(await page.locator('#b61a-save').count(),0,'Old rollout save cannot modify official deployment');
  await page.locator('#b61a-close').click();
  assert.equal(await page.locator('#b61-admin-panel').count(),0);
  console.log('V69_ADMIN_OFFICIAL_PASS');
 }finally{await context.close()}
}
try{
 for(const [w,h] of [[320,720],[390,844],[820,1050],[1440,900]])await checkViewport(w,h);
 await checkAdmin();
 console.log('V69_BROWSER_E2E_PASS');
}finally{await browser.close()}
