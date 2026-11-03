'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [320,390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
  await ctx.addInitScript(()=>{localStorage.setItem('inventory_user_name_v2','مهند');localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'admin',photoId:'test'}))});
  const calls=[];
  await ctx.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/admin-trendyol.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync('admin-trendyol.html')});if(u.pathname==='/api/trendyol'){
   const action=u.searchParams.get('action');calls.push(action);
   const data=action==='status'?{}:{days:7,finance:{available:true},totals:{sold:1,paid:1,unconfirmed:0,ambiguous:0},rows:[{sku:'230006',name:'صنف تجريبي',barcodes:['B-1'],quantity:1,paid:1,unconfirmed:0,ambiguous:0,value:20,details:[{orderNumber:'100',status:'DELIVERED',barcode:'B-1',quantity:1,payment:'confirmed',reason:'مطابق'}]}].concat(Array.from({length:30},(_,i)=>({sku:'SKU-'+i,name:'صنف '+i,barcodes:['BC-'+i],quantity:1,paid:0,unconfirmed:1,ambiguous:0,value:10,details:[]}))),orderData:{days:7,orders:[{number:'100',status:'DELIVERED',date:Date.now(),amount:20,currency:'SAR',lines:[]}].concat(Array.from({length:30},(_,i)=>({number:'ORDER-'+i,status:'CREATED',date:Date.now(),amount:10,currency:'SAR',lines:[]}))),ordersTotal:31,totals:{SAR:20},orderCount:1,pending:0,cancelled:0,top:[],byDay:[],fetchedAt:Date.now()}};
   return route.fulfill({json:data});}return route.fulfill({status:404,body:''})});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost/admin-trendyol.html');await page.locator('[data-tab=products]').click();await page.locator('#product-table [data-product]').first().waitFor();
  assert.equal(await page.locator('#inventory-match').count(),0);assert.ok(!calls.includes('stock'));
  await page.locator('#product-table [data-product]').first().click();assert.equal(await page.locator('#product-modal').isVisible(),true);assert.match(await page.locator('#product-dialog-body').innerText(),/تم التسليم/);
  await page.locator('#close-product').click();await page.locator('#product-search').fill('230006');assert.equal(await page.locator('#product-table [data-product]').count(),1);
  await page.locator('#product-search').fill('100');assert.equal(await page.locator('#product-table [data-product]').count(),1);
  const beforeTabs=calls.length;await page.locator('[data-tab=payments]').click();assert.match(await page.locator('#payment-notice').innerText(),/الحوالة|المبالغ|أمر دفع/);await page.locator('[data-tab=orders]').click();assert.equal(await page.locator('#orders-table tr').count(),25);await page.locator('#orders-paging [data-step=next]').click();assert.equal(await page.locator('#orders-table tr').count(),6);await page.locator('[data-tab=products]').click();await page.locator('#product-search').fill('');assert.equal(await page.locator('#product-table [data-product]').count(),25);await page.locator('#products-paging [data-step=next]').click();assert.equal(await page.locator('#product-table [data-product]').count(),6);assert.equal(calls.length,beforeTabs,'changing tabs must not refetch');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'viewport overflow '+width);assert.deepEqual(errors,[]);await ctx.close();
 }
 await browser.close();console.log('PASS: read-only product flow and mobile layout in mocked Chromium');
})().catch(e=>{console.error(e);process.exit(1)});
