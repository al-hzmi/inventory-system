'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');const {chromium}=require('playwright'),{initializeApp,deleteApp}=require('firebase/app');
const {getFirestore,connectFirestoreEmulator,doc,writeBatch,getDoc}=require('firebase/firestore');
const root=path.resolve(__dirname,'../..'),firebaseRoot=path.resolve(path.dirname(require.resolve('firebase/app')),'../..');
(async()=>{
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8099');const app=initializeApp({projectId:'demo-inventory-reliability'},'closure-ui-seed'),db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8099);
 const batch=writeBatch(db);const put=(c,id,v)=>batch.set(doc(db,c,id),v);
 put('system_controls','stocktake_feature',{enabled:true,activeCampaignId:'jclosure',activeCampaigns:{jeddah:{campaignId:'jclosure',allowedEmployeeIds:['employee0','employee1']},riyadh:{campaignId:'rclosure',allowedEmployeeIds:['employee2']}}});
 put('system_controls','stocktake_accountant_access',{enabled:false});
 for(const [id,branch] of [['jclosure','jeddah'],['rclosure','riyadh']])put('stocktake_campaigns',id,{name:id,warehouseKey:branch,warehouse:branch==='jeddah'?'جدة':'الرياض',status:'active',inventorySnapshotCount:2});
 for(let i=0;i<3;i++)put('stocktake_teams','team'+i,{campaignId:i<2?'jclosure':'rclosure',name:'فريق '+i,scope:'area'+i,memberEmployeeIds:['employee'+i],memberEmployeeNames:['موظف '+i]});
 for(const cp of ['jclosure','rclosure'])for(let i=0;i<2;i++)put('stocktake_items',cp+'_'+i,{campaignId:cp,sku:String(20100+i),name:'صنف',expectedQty:10,actualQty:null,countStatus:'pending',orderIndex:i});
 await batch.commit();const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),contexts=[],errors=[];
 async function pageFor(file,employee){
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});contexts.push(ctx);await ctx.addInitScript(employee=>{if(employee===null){localStorage.setItem('inventory_user_name_v2','مهند');localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z')}else{localStorage.setItem('inventory_user_name_v2','موظف '+employee);localStorage.setItem('inventory_employee_id_v2','employee'+employee);localStorage.setItem('inventory_employee_auth_version_v2','2')}window.confirm=()=>true},employee);
  await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname==='127.0.0.1'&&u.port==='8099')return route.continue();if(u.hostname==='www.gstatic.com'&&/firebase-(app|firestore)-compat\.js$/.test(u.pathname))return route.fulfill({body:fs.readFileSync(path.join(firebaseRoot,u.pathname.split('/').pop())),contentType:'application/javascript'});if(u.hostname!=='localhost')return route.abort();const f=path.join(root,u.pathname);if(!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});let body=fs.readFileSync(f);if(/\/(?:admin-)?stocktake\.html$/.test(u.pathname)){let html=body.toString().replace("projectId:'inventory-system-ca3dc'","projectId:'demo-inventory-reliability'").replace('const db=firebase.firestore();',"const db=firebase.firestore();db.useEmulator('127.0.0.1',8099);");body=Buffer.from(html)}return route.fulfill({body,contentType:f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'application/javascript'});
  });const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost/'+file);return page;
 }
 const admin=await pageFor('admin-stocktake.html',null);await admin.waitForFunction(()=>state.campaign?.id==='jclosure'&&itemsLoaded&&!itemsFromCache,null,{timeout:60000});
 const workers=[];for(let i=0;i<2;i++){const p=await pageFor('stocktake.html',i);await p.waitForFunction(()=>state.itemsLoaded&&state.team&&!itemCacheOnly&&controlServerConfirmed&&campaignServerConfirmed&&teamsServerConfirmed,null,{timeout:60000});await p.locator('#startStocktake').click();workers.push(p)}
 await admin.evaluate(()=>closeCampaign());await admin.waitForFunction(()=>state.campaign.closePhase==='collecting');for(const p of workers)await p.waitForFunction(()=>state.campaign.closePhase==='collecting');
 await workers[0].evaluate(()=>saveDraft('jclosure_0','3'));await workers[0].evaluate(()=>acknowledgeTeam());assert.notEqual((await getDoc(doc(db,'stocktake_teams','team0'))).data().closeStatus,'acknowledged');
 await workers[1].evaluate(()=>acknowledgeTeam());assert.equal((await getDoc(doc(db,'stocktake_teams','team1'))).data().closeStatus,'acknowledged');
 await admin.evaluate(()=>closeCampaign());assert.equal((await getDoc(doc(db,'stocktake_campaigns','jclosure'))).data().status,'active');assert.equal((await getDoc(doc(db,'stocktake_campaigns','rclosure'))).data().status,'active');
 await workers[0].evaluate(()=>{draftStore.remove('jclosure:team0:jclosure_0:qty')});await workers[0].evaluate(()=>acknowledgeTeam());assert.equal((await getDoc(doc(db,'stocktake_teams','team0'))).data().closeStatus,'acknowledged');
 const late=await workers[0].evaluate(()=>writeCount(state.items.find(x=>x.id==='jclosure_0'),3,'first_manual_count'));assert.equal(late,false);
 await admin.evaluate(()=>closeCampaign());assert.equal((await getDoc(doc(db,'stocktake_campaigns','jclosure'))).data().status,'closed');assert.equal((await getDoc(doc(db,'stocktake_campaigns','rclosure'))).data().status,'active');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,scenario:'actual admin and employee closure UI + Firestore emulator',checks:['pending draft blocks acknowledgement','missing acknowledgement blocks closure','late count blocked','other branch active'],limits:'synthetic permissive rules; does not protect old clients or prove production security'}));
 for(const ctx of contexts)await ctx.close();await browser.close();await deleteApp(app);
})().catch(e=>{console.error(e);process.exit(1)});
