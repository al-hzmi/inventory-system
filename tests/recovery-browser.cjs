const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {database,client}=require('./support/recovery-firestore.cjs');
const root=path.resolve(__dirname,'..'),results=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 async function open(server,branch='jeddah',team=0){
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.exposeBinding('__db',(_,a)=>server.call(a));
  await ctx.addInitScript(()=>{localStorage.setItem('inventory_user_name_v2','مهند');localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');localStorage.setItem('inventory_employee_id_v2','admin_mohanad');localStorage.setItem('inventory_employee_auth_version_v2','2');window.confirm=()=>true});
  await ctx.route('**/*',route=>{const u=new URL(route.request().url());
   if(u.pathname.includes('firebase-app-compat'))return route.fulfill({body:'('+client.toString()+')()',contentType:'application/javascript'});
   if(u.hostname!=='localhost')return route.fulfill({body:'',contentType:'application/javascript'});
   const file=path.join(root,u.pathname);if(fs.existsSync(file)&&fs.statSync(file).isFile())return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'application/javascript'});
   return route.fulfill({status:404,body:''});
  });
  const page=await ctx.newPage();page.on('pageerror',e=>{results.push({pageError:e.message})});
  await page.goto('http://localhost/stocktake.html?branch='+branch);
  await page.waitForFunction(()=>state.itemsLoaded&&state.team);
  if(team)await page.evaluate(t=>pickTeam(t),branch+team);
  await page.locator('#startStocktake').click();return {page,ctx};
 }
 async function count(page,id,value=1){return page.evaluate(({id,value})=>writeCount(state.items.find(x=>x.id===id),value,'first_manual_count'),{id,value})}
 const db=database(105),{page,ctx}=await open(db);
 assert.equal(await count(page,'jeddah_0'),true);
 assert.equal(db.metrics.writes,2);assert.equal(await page.evaluate(()=>draftStore.list().length),0);
 results.push({test:'one count with receipt',passed:true,readsPerNewCount:5,writesPerNewCount:2});
 // No result refresh is required to prove immutable receipt-based replay.
 const receipt=[...db.rows].find(([p])=>p.startsWith('stocktake_audit/'));
 await page.evaluate(op=>draftStore.set('jeddah:jeddah0:jeddah_0:qty',{value:'1',operationId:op}),receipt[0].split('/')[1]);
 assert.equal(await count(page,'jeddah_0'),true);assert.equal(db.metrics.writes,2);
 results.push({test:'replay confirmed operation',passed:true});
 // Foreign actor / malformed number cannot clear a local draft.
 await page.evaluate(()=>draftStore.set('jeddah:jeddah0:jeddah_1:qty',{value:'2',operationId:'bad'}));
 db.put('stocktake_audit/bad',{campaignId:'jeddah',teamId:'jeddah0',itemId:'jeddah_1',action:'count_created',actorEmployeeId:'other',after:{teamActualQty:2}});
 assert.equal(await count(page,'jeddah_1',2),false);
 assert.ok(await page.evaluate(()=>draftStore.get('jeddah:jeddah0:jeddah_1:qty')));
 await page.evaluate(()=>showRecovery());assert.match(await page.locator('#draftRecovery').innerText(),/10001/);
 if(process.env.RECOVERY_SCREENSHOT)await page.screenshot({path:process.env.RECOVERY_SCREENSHOT,fullPage:true});
 const download=page.waitForEvent('download');await page.locator('#exportDrafts').click();const dl=await download;assert.match(dl.suggestedFilename(),/stocktake-drafts/);await page.locator('#closeRecovery').click();
 await page.reload();await page.waitForFunction(()=>state.itemsLoaded);assert.equal(await page.evaluate(()=>draftStore.list().length),1);
 results.push({test:'wrong receipt retained, recovery UI export and reload',passed:true});
 // Network unavailable and quota exhaustion never produce success.
 await page.evaluate(()=>__test.fail='resource-exhausted');assert.equal(await count(page,'jeddah_2'),false);
 const pending=await page.evaluate(()=>draftStore.get('jeddah:jeddah0:jeddah_2:qty'));
 await page.evaluate(()=>__test.fail='');assert.equal(await count(page,'jeddah_2'),true);
 assert.ok(db.rows.has('stocktake_audit/'+pending.operationId));results.push({test:'quota failure then same-id retry',passed:true});
 // Editing an unresolved quantity cannot drop the original operation ID.
 await page.evaluate(()=>__test.fail='unavailable');assert.equal(await count(page,'jeddah_3',3),false);
 assert.equal(await page.evaluate(()=>saveDraft('jeddah_3','4')),false);
 assert.equal(await page.evaluate(()=>draftStore.get('jeddah:jeddah0:jeddah_3:qty').value),'3');
 await page.evaluate(()=>__test.fail='');
 // Delayed acknowledgement after the real 18-second UI deadline.
 await page.evaluate(()=>__test.ackDelay=19000);
 assert.equal(await count(page,'jeddah_4'),false);
 assert.ok(await page.evaluate(()=>draftStore.get('jeddah:jeddah0:jeddah_4:qty')));
 await page.waitForFunction(()=>draftStore.get('jeddah:jeddah0:jeddah_4:qty')===null,{},{timeout:5000});
 await page.evaluate(()=>__test.ackDelay=0);results.push({test:'late commit after 18s reconciles without second write',passed:true});
 // A foreground reconciliation can finish while the acknowledged transaction is still returning.
 await page.evaluate(()=>{__test.ackDelay=500;window.__concurrentReceipt=writeCount(state.items.find(i=>i.id==='jeddah_7'),7,'first_manual_count')});
 await page.waitForFunction(()=>draftStore.get('jeddah:jeddah0:jeddah_7:qty')?.state==='saving');
 await page.waitForFunction(()=>__test.ackDelay===500);await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>verifyDraftReceipt('jeddah:jeddah0:jeddah_7:qty')),true);
 assert.equal(await page.evaluate(()=>window.__concurrentReceipt),true);
 await page.evaluate(()=>__test.ackDelay=0);results.push({test:'overlapping receipt checks acknowledge one committed operation',passed:true});
 // Notes use the selected group and reject closed campaigns transactionally.
 await page.evaluate(()=>{openNote('jeddah_5');document.querySelector('#noteText').value='ملاحظة اختبار'});assert.equal(await page.evaluate(()=>saveNote()),true);
 const note=[...db.rows.values()].find(r=>r.action==='note_updated');assert.equal(note.teamId,'jeddah0');
 db.put('stocktake_campaigns/jeddah',{...db.rows.get('stocktake_campaigns/jeddah'),status:'closed'});
 assert.equal(await count(page,'jeddah_6'),false);results.push({test:'note receipt and server-closed campaign',passed:true});
 await ctx.close();
 // Two browsers editing the same group's existing count: one wins, one retains a conflict.
 const concurrent=database(4),left=await open(concurrent),right=await open(concurrent);
 const pair=await Promise.all([count(left.page,'jeddah_0',2),count(right.page,'jeddah_0',3)]);
 assert.equal(pair.filter(Boolean).length,1);assert.equal(concurrent.metrics.writes,2);
 const loser=pair[0]?right:left;
 assert.equal(await loser.page.evaluate(()=>draftStore.get('jeddah:jeddah0:jeddah_0:qty').state),'conflict');
 results.push({test:'same group concurrent edits: one commit, one retained conflict',passed:true});
 await left.ctx.close();await right.ctx.close();
 // Different physical scopes may contribute; stale concurrent totals require review before retry.
 const scopes=database(4),first=await open(scopes,'jeddah',0),second=await open(scopes,'jeddah',1);
 assert.equal(await count(first.page,'jeddah_0',2),true);
 assert.equal(await count(second.page,'jeddah_0',3),false);
 assert.equal(await second.page.evaluate(()=>draftStore.get('jeddah:jeddah1:jeddah_0:qty').state),'conflict');
 await second.page.reload();await second.page.waitForFunction(()=>state.itemsLoaded);await second.page.evaluate(()=>pickTeam('jeddah1'));
 assert.equal(await count(second.page,'jeddah_0',3),true);
 const shared=scopes.rows.get('stocktake_items/jeddah_0');
 assert.deepEqual(Object.values(shared.teamCounts).map(x=>x.quantity).sort(),[2,3]);
 assert.equal(scopes.metrics.writes,4);
 results.push({test:'distinct scopes preserve both counts after stale view review',passed:true});
 await first.ctx.close();await second.ctx.close();
 // A lost reply / closed page keeps a durable intent that reconciles on reload.
 const lostDb=database(4),lost=await open(lostDb);
 await lost.page.evaluate(()=>{__test.ackDelay=2000;void writeCount(state.items.find(i=>i.id==='jeddah_0'),4,'first_manual_count')});
 await lost.page.waitForFunction(()=>draftStore.get('jeddah:jeddah0:jeddah_0:qty')?.operationId);
 await new Promise(resolve=>setTimeout(resolve,150));await lost.page.reload();await lost.page.waitForFunction(()=>state.itemsLoaded);
 await lost.page.waitForFunction(()=>draftStore.get('jeddah:jeddah0:jeddah_0:qty')===null);assert.equal(lostDb.metrics.writes,2);
 // Offline intents persist without a transaction or false success, then replay once.
 await lost.page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
 assert.equal(await count(lost.page,'jeddah_1',5),false);assert.equal(lostDb.metrics.writes,2);
 await lost.page.reload();await lost.page.waitForFunction(()=>state.itemsLoaded);assert.equal(await count(lost.page,'jeddah_1',5),true);assert.equal(lostDb.metrics.writes,4);
 // Committed transaction but failed receipt read is not falsely confirmed.
 await lost.page.evaluate(()=>__test.receiptFail=true);assert.equal(await count(lost.page,'jeddah_2',6),false);
 assert.ok(await lost.page.evaluate(()=>draftStore.get('jeddah:jeddah0:jeddah_2:qty')));
 await lost.page.evaluate(()=>{__test.receiptFail=false;__test.receiptCache=true});
 assert.equal(await count(lost.page,'jeddah_2',6),false);
 await lost.page.evaluate(()=>__test.receiptCache=false);assert.equal(await count(lost.page,'jeddah_2',6),true);assert.equal(lostDb.metrics.writes,6);
 results.push({test:'reload during save, offline reload replay, failed/cache-only receipt retained',passed:true});
 await lost.ctx.close();
 // 6 and 8 independent browser contexts, 1500 distinct SKUs over two campaigns.
 for(const devices of [6,8]){
  const server=database(750),clients=[];for(let i=0;i<devices;i++)clients.push(await open(server,i%2?'riyadh':'jeddah',Math.floor(i/2)));
  const start=performance.now(),before={...server.metrics};
  const counts=await Promise.all(clients.map(({page},d)=>page.evaluate(async({d,devices})=>{let ok=0;const slots=devices/2,slot=Math.floor(d/2);for(let i=slot;i<750;i+=slots){const item=state.items.find(x=>x.id===state.campaign.id+'_'+i);if(await writeCount(item,1,'first_manual_count'))ok++}return {ok,drafts:draftStore.list().length}},{d,devices})));
  assert.equal(counts.reduce((s,c)=>s+c.ok,0),1500);assert.ok(counts.every(c=>!c.drafts));
  assert.equal(server.metrics.writes-before.writes,3000);assert.equal(server.metrics.reads-before.reads,7500);
  assert.equal([...server.rows.values()].filter(x=>x.action==='count_created').length,1500);
  results.push({test:'load',devices,items:1500,success:1500,pending:0,transactionAndReceiptReads:server.metrics.reads-before.reads,writes:server.metrics.writes-before.writes,initialQueryReads:before.reads,elapsedMs:Math.round(performance.now()-start),model:'Chromium with deterministic in-memory Firestore double; excludes listener fanout and billing'});
  for(const c of clients)await c.ctx.close();
 }
 await browser.close();assert.ok(!results.some(r=>r.pageError),JSON.stringify(results));
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
