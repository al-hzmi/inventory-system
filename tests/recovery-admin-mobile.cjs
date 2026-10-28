'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [320,390,412]){
  const context=await browser.newContext({viewport:{width,height:800},serviceWorkers:'block'});
  await context.addInitScript(()=>{
   localStorage.setItem('inventory_user_name_v2','مهند');localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');
   window.__audit={subscriptions:0,reads:0,unsubs:0};const entries=Array.from({length:300},(_,i)=>({id:'op'+i,data:()=>({campaignId:'j',sku:String(i),action:'count_created',actorName:'test',createdAt:{seconds:i+1}})}));
   const campaign={name:'جرد تجريبي',warehouse:'جدة',warehouseKey:'jeddah',status:'active'};
   const data={stocktake_campaigns:[{id:'j',data:()=>campaign}],stocktake_items:[{id:'item',data:()=>({campaignId:'j',sku:'226',expectedQty:1,countStatus:'pending'}),metadata:{hasPendingWrites:false}}],stocktake_teams:[{id:'team',data:()=>({campaignId:'j',name:'team'})}],employee_accounts:[],stocktake_audit:entries};
   const snap=docs=>({docs,metadata:{fromCache:false,hasPendingWrites:false}});
   const q=(name)=>({limit:()=>q(name),onSnapshot:(...args)=>{const fn=args.find(x=>typeof x==='function');let active=true;if(name==='stocktake_audit'){__audit.subscriptions++;__audit.reads+=300;window.__emitAudit=()=>fn(snap([{id:'latest',data:()=>({campaignId:'j',sku:'999',action:'count_created',createdAt:{seconds:999}})}]))}setTimeout(()=>{if(active)fn(snap(data[name]||[]))},0);return()=>{active=false;if(name==='stocktake_audit')__audit.unsubs++}}});
   const db={enablePersistence:()=>Promise.resolve(),collection:name=>({doc:id=>({onSnapshot:fn=>{let active=true;setTimeout(()=>{if(active)fn({id,exists:true,data:()=>id==='stocktake_feature'?{enabled:true,activeCampaignId:'j'}:{}})},0);return()=>{active=false}}}),onSnapshot:q(name).onSnapshot,where:()=>q(name)})};
   const firestore=()=>db;firestore.FieldValue={serverTimestamp:()=>({seconds:1})};window.firebase={apps:[{}],initializeApp(){},firestore};
  });
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.fulfill({body:'',contentType:'application/javascript'});const f=path.join(root,u.pathname);if(!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});return route.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':'application/javascript'})});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost/admin-stocktake.html');await page.locator('[data-tab="audit"]').waitFor();
  assert.equal(await page.evaluate(()=>__audit.subscriptions),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow '+width);
  await page.locator('[data-tab="audit"]').click();await page.waitForFunction(()=>state.auditStatus==='ready');assert.equal(await page.evaluate(()=>state.audit.length),300);assert.deepEqual(await page.evaluate(()=>[__audit.subscriptions,__audit.reads]),[1,300]);await page.evaluate(()=>__emitAudit());assert.equal(await page.evaluate(()=>state.audit[0].id),'latest');
  await page.locator('[data-tab="all"]').click();await page.locator('[data-tab="audit"]').click();assert.equal(await page.evaluate(()=>__audit.subscriptions),1);assert.deepEqual(errors,[]);await context.close();
 }
 await browser.close();console.log('PASS: admin audit lazy/live subscription and mobile layout at 320/390/412px (Chromium mock)');
})().catch(e=>{console.error(e);process.exit(1)});
