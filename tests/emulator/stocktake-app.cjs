'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{initializeApp,deleteApp}=require('firebase/app');
const {getFirestore,connectFirestoreEmulator,doc,writeBatch,getDoc,getDocs,collection}=require('firebase/firestore');
const root=path.resolve(__dirname,'../..'),firebaseRoot=path.resolve(path.dirname(require.resolve('firebase/app')),'../..');
(async()=>{
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8099');
 const app=initializeApp({projectId:'demo-inventory-reliability'},'seed-app'),db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8099);
 const batch=writeBatch(db),access={jeddah:[],riyadh:[]};
 for(let i=0;i<8;i++){const b=i%2?'riyadh':'jeddah',id='worker'+i;access[b].push(id);batch.set(doc(db,'stocktake_teams',b+Math.floor(i/2)),{campaignId:b,name:'مجموعة '+i,scope:'zone'+i,memberEmployeeIds:[id],memberEmployeeNames:['موظف '+i]})}
 for(const b of ['jeddah','riyadh']){batch.set(doc(db,'stocktake_campaigns',b),{name:b,warehouseKey:b,warehouse:b==='jeddah'?'جدة':'الرياض',status:'active'});for(let j=0;j<40;j++)batch.set(doc(db,'stocktake_items',b+'_'+j),{campaignId:b,sku:String(20000+j),name:'صنف اختبار',expectedQty:100,actualQty:null,countStatus:'pending',orderIndex:j})}
 batch.set(doc(db,'system_controls','stocktake_feature'),{enabled:true,activeCampaigns:{jeddah:{campaignId:'jeddah',allowedEmployeeIds:access.jeddah},riyadh:{campaignId:'riyadh',allowedEmployeeIds:access.riyadh}}});await batch.commit();
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),contexts=[],pages=[],errors=[];
 for(let i=0;i<8;i++){
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});contexts.push(ctx);
  await ctx.addInitScript(i=>{localStorage.setItem('inventory_user_name_v2','موظف '+i);localStorage.setItem('inventory_employee_id_v2','worker'+i);localStorage.setItem('inventory_employee_auth_version_v2','2');window.confirm=()=>true},i);
  await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'&&u.port==='8099')return route.continue();
   if(u.hostname==='www.gstatic.com'&&/firebase-(app|firestore)-compat\.js$/.test(u.pathname))return route.fulfill({body:fs.readFileSync(path.join(firebaseRoot,u.pathname.split('/').pop())),contentType:'application/javascript'});
   if(u.hostname!=='localhost')return route.abort();const f=path.join(root,u.pathname);if(!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});let body=fs.readFileSync(f);
   if(u.pathname==='/stocktake.html'){let html=body.toString();html=html.replace("projectId:'inventory-system-ca3dc'","projectId:'demo-inventory-reliability'").replace('const db=firebase.firestore();','const db=firebase.firestore();db.useEmulator(\'127.0.0.1\',8099);');body=Buffer.from(html)}
   return route.fulfill({body,contentType:f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'application/javascript'});
  });
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost/stocktake.html');await page.waitForFunction(()=>state.itemsLoaded&&state.team,{timeout:30000});await page.locator('#startStocktake').click();
  const b=i%2?'riyadh':'jeddah';assert.equal(await page.evaluate(()=>state.campaign.id),b);assert.equal(await page.evaluate(()=>state.team.id),b+Math.floor(i/2));pages.push(page);
 }
 const start=Date.now();const results=await Promise.all(pages.map((page,i)=>page.evaluate(async({i})=>{const branch=i%2?'riyadh':'jeddah',slot=Math.floor(i/2);let saved=0;for(let k=slot;k<40;k+=4){const item=state.items.find(x=>x.id===branch+'_'+k);if(await writeCount(item,1,'first_manual_count'))saved++}return saved},{i})));
 assert.equal(results.reduce((a,b)=>a+b,0),80);assert.deepEqual(results,[10,10,10,10,10,10,10,10]);assert.deepEqual(errors,[]);
 for(const b of ['jeddah','riyadh'])for(let i=0;i<40;i++){const data=(await getDoc(doc(db,'stocktake_items',b+'_'+i))).data();assert.equal(Object.values(data.teamCounts||{})[0]?.quantity,1)}
 const audits=await getDocs(collection(db,'stocktake_audit'));assert.equal(audits.size,80);
 const replays=await Promise.all(pages.map((page,i)=>{const receipt=audits.docs.find(d=>d.data().actorEmployeeId==='worker'+i);assert.ok(receipt);const row=receipt.data();return page.evaluate(async({row,op})=>{const key=row.campaignId+':'+row.teamId+':'+row.itemId+':qty';draftStore.set(key,{value:'1',operationId:op});return writeCount(state.items.find(x=>x.id===row.itemId),1,'first_manual_count')},{row,op:receipt.id})}));
 assert.ok(replays.every(Boolean));assert.equal((await getDocs(collection(db,'stocktake_audit'))).size,80,'replays must not add audit records');
 console.log(JSON.stringify({passed:true,scenario:'actual stocktake UI + real Firestore SDK/emulator',devices:8,items:80,confirmedReplays:8,results,elapsedMs:Date.now()-start,scope:'demo-only permissive test rules; not production authorization, billing, or mobile hardware'}));
 for(const ctx of contexts)await ctx.close();await browser.close();await deleteApp(app);
})().catch(e=>{console.error(e);process.exit(1)});
