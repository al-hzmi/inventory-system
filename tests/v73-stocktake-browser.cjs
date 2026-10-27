const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'qa-v73');fs.mkdirSync(out,{recursive:true});
function fixture(){
 const cp={id:'campaign1',name:'جرد مستودع جدة — أكتوبر 2026',warehouse:'جدة',stocktakeDate:'2026-10-18',status:'active',sourceMode:'current_inventory',inventorySnapshotStatus:'ready'};
 const team={id:'team1',campaignId:cp.id,name:'فريق الجرد الرئيسي',scope:'المستودع الرئيسي · القسم الأول',memberEmployeeIds:['admin_mohanad'],memberEmployeeNames:['مهند'],extraMemberNames:['محمد أحمد']};
 const items=Array.from({length:18},(_,j)=>({id:'item'+j,campaignId:cp.id,teamId:team.id,sku:String(10200+j),name:['طقم أكواب زجاجية شفاف','حافظة طعام مستطيلة','صحن تقديم بورسلان'][j%3],pack:'12',expectedQty:12.5,actualQty:j<10?j%3===0?10.25:j%3===1?12.5:15.75:null,countStatus:j>=10?'pending':j%3===0?'shortage':j%3===1?'matched':'surplus',difference:j>=10?null:j%3===0?-2.25:j%3===1?0:3.25,revision:j<10?1:0,orderIndex:j,note:j===1?'تمت مراجعة العبوة المفتوحة':'',updatedByName:'مهند'}));
 return {cp,team,items};
}
const fakeFirebase=String.raw`
(()=>{
window.__listeners=[];window.__writes=[];window.__deferred=[];window.__reject=false;window.__cache=false;window.__offline=false;
const f=window.__fixture,store={stocktake_campaigns:{[f.cp.id]:f.cp},stocktake_teams:{[f.team.id]:f.team},stocktake_items:Object.fromEntries(f.items.map(i=>[i.id,i])),employee_accounts:{admin_mohanad:{canonicalName:'مهند'},e1:{canonicalName:'محمد أحمد'}},system_controls:{stocktake_accounting:{enabled:true,accessMode:'all',campaignId:f.cp.id},stocktake_feature:{enabled:true,accessMode:'all',activeCampaignId:f.cp.id},stocktake_accountant_access:{enabled:true,accessMode:'all',campaignId:f.cp.id}},stocktake_audit:{}};
let serial=0;
function doc(c,id){return {id,collection:c,data:()=>store[c]?.[id],exists:!!store[c]?.[id],metadata:{hasPendingWrites:!!store[c]?.[id]?._pending,fromCache:window.__cache},ref:ref(c,id)}}
function ref(c,id){return {id,collection:c,get:async()=>doc(c,id),set:async(data)=>{store[c]??={};store[c][id]={...store[c][id],...data};emit()},delete:async()=>{delete store[c][id];__writes.push({delete:id});emit()},onSnapshot:(opt,cb)=>listen({c,id},typeof opt==='function'?opt:cb)}}
function snap(q){if(q.id)return doc(q.c,q.id);const docs=Object.keys(store[q.c]||{}).filter(id=>!q.field||store[q.c][id][q.field]===q.value).map(id=>doc(q.c,id));return {docs,size:docs.length,docChanges:()=>docs.map(d=>({type:'modified',doc:d})),metadata:{hasPendingWrites:docs.some(d=>d.metadata.hasPendingWrites),fromCache:window.__cache}}}
function listen(q,cb){const l={q,cb};__listeners.push(l);setTimeout(()=>{if(__listeners.includes(l))cb(snap(q))},0);return ()=>{window.__listeners=__listeners.filter(x=>x!==l)}}
function emit(){for(const l of [...__listeners])if(__listeners.includes(l))l.cb(snap(l.q))}
window.__emit=emit;window.__store=store;
function query(c,field,value){return {doc:id=>ref(c,id||'op'+(++serial)),where:(field,op,value)=>query(c,field,value),limit:()=>query(c,field,value),onSnapshot:(opt,cb)=>listen({c,field,value},typeof opt==='function'?opt:cb),get:async()=>snap({c,field,value}),add:async data=>{const r=ref(c,'op'+(++serial));await r.set(data);return r}}}
const db={enablePersistence:()=>Promise.resolve(),collection:c=>query(c),batch:()=>{const ops=[];return {set:(ref,data)=>ops.push({ref,data}),update:(ref,data)=>ops.push({ref,data,update:true}),delete:ref=>ops.push({ref,remove:true}),commit:()=>{__writes.push(ops);if(__reject)return Promise.reject(new Error('permission-denied'));for(const o of ops){const c=o.ref.collection,id=o.ref.id;store[c]??={};if(o.remove){delete store[c][id];continue}const previous=store[c][id]||{},data={...o.data};for(const k in data)if(data[k]?.increment)data[k]=(Number(previous[k])||0)+data[k].increment;for(const key of Object.keys(data))if(key.includes('.')){const [parent,child]=key.split('.');data[parent]={...(previous[parent]||{}),...(data[parent]||{}),[child]:data[key]};delete data[key]}store[c][id]={...previous,...data,_pending:true}}setTimeout(emit,0);return new Promise(resolve=>{const finish=()=>{for(const o of ops)if(store[o.ref.collection]?.[o.ref.id])store[o.ref.collection][o.ref.id]._pending=false;emit();resolve()};if(__offline)__deferred.push(finish);else setTimeout(finish,30)})}}}};
function firestore(){return db}firestore.FieldValue={serverTimestamp:()=>({seconds:1792280000}),increment:n=>({increment:n})};window.firebase={apps:[{}],initializeApp(){},firestore};
})();
`;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 async function pageFor(file,width=390){
  const ctx=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});
  await ctx.addInitScript(f=>{window.__fixture=f;localStorage.setItem('inventory_user_name_v2','مهند');localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');localStorage.setItem('inventory_employee_id_v2','admin_mohanad');localStorage.setItem('inventory_employee_auth_version_v2','2')},fixture());
  await ctx.route('**/*',async route=>{const url=new URL(route.request().url());if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.continue();if(url.hostname==='localhost'){const p=path.join(root,url.pathname);if(fs.existsSync(p)&&fs.statSync(p).isFile())return route.fulfill({body:fs.readFileSync(p),contentType:p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':'application/javascript'});return route.fulfill({status:404,body:''})}if(url.pathname.includes('firebase-app-compat'))return route.fulfill({body:fakeFirebase,contentType:'application/javascript'});return route.fulfill({body:'',contentType:'application/javascript'})});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost/'+file);await page.waitForTimeout(350);if(errors.length){await page.screenshot({path:path.join(out,'error-'+file+'.png'),fullPage:true});throw new Error(file+': '+errors.join('; '))}return {page,ctx,errors};
 }
 const {page,ctx,errors}=await pageFor('stocktake.html');
 assert.equal(await page.locator('#search').count(),0);
 assert.match(await page.locator('.welcomeRoster').innerText(),/مهند/);
 assert.match(await page.locator('.welcomeRoster').innerText(),/محمد أحمد/);
 assert.equal(await page.locator('.welcomeRoster dt').first().innerText(),'عضو اللجنة');
 assert.equal(await page.locator('.welcomeRoster dt').nth(1).innerText(),'المساعد');
 assert.equal(await page.locator('.welcomeBrand img').getAttribute('src'),'./assets/batco-logo.svg');
 assert.equal(await page.locator('.welcomeBrand img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.screenshot({path:path.join(out,'welcome-mobile.png'),fullPage:true});
 await page.locator('#startStocktake').click();assert.equal(await page.evaluate(()=>__writes.length),0);
 await page.locator('#search').fill('١٠٢');assert.equal(await page.locator('.skuSuggestion').count(),18);
 await page.screenshot({path:path.join(out,'suggestions-mobile.png'),fullPage:true});
 await page.locator('[data-open="item10"]').click();assert.equal(await page.locator('#actual_item10').count(),1);
 await page.locator('#backBtn').click();assert.equal(await page.locator('#startStocktake').count(),1);await page.locator('#startStocktake').click();
 await page.locator('#search').fill('99999');assert.match(await page.locator('.searchEmpty').innerText(),/لا توجد نتائج/);

 await page.locator('#search').fill('10210');await page.waitForTimeout(100);
 assert.equal(await page.locator('.activeResult .qtygrid').count(),0);
 assert.equal(await page.locator('#actual_item10').getAttribute('placeholder'),'كمية هذا الصنف');
 const hintSize=await page.locator('#actual_item10').evaluate(el=>parseFloat(getComputedStyle(el,'::placeholder').fontSize));
 assert.ok(hintSize<=18,'count field placeholder must fit cleanly on iPhone');
 await page.locator('#actual_item10').fill('١٢٫٧٥');
 await page.evaluate(()=>__emit());assert.equal(await page.locator('#actual_item10').inputValue(),'١٢٫٧٥');
 await page.locator('#actual_item10').fill('');await page.locator('[data-save="item10"]').click();assert.equal(await page.evaluate(()=>__writes.length),0);
 await page.locator('#actual_item10').fill('١٢٫٧٥');await page.screenshot({path:path.join(out,'floor-mobile.png'),fullPage:true});
 await page.evaluate(()=>{__offline=true;Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});window.dispatchEvent(new Event('offline'))});
 const beforeSurplus=await page.evaluate(()=>__writes.length);
 await page.locator('[data-save="item10"]').click();
 await page.locator('#surplusModal.open').waitFor();
 assert.match(await page.locator('#surplusDifference').innerText(),/0.25/);
 assert.equal(await page.evaluate(()=>__writes.length),beforeSurplus,'surplus must not write before approval');
 await page.locator('#surplusCancel').click();
 assert.equal(await page.evaluate(()=>__writes.length),beforeSurplus,'cancel must not write');
 assert.equal(await page.locator('#actual_item10').inputValue(),'١٢٫٧٥','cancel must retain quantity');
 await page.locator('[data-save="item10"]').click();
 await page.locator('#surplusConfirm').click();
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>state.activeEditId),'');assert.equal(await page.evaluate(()=>state.items.find(x=>x.id==='item10').actualQty),12.75);assert.equal(await page.evaluate(()=>__writes.length),1);assert.equal(await page.evaluate(()=>__writes[0].length),2);
 assert.match(await page.locator('.syncStatus').innerText(),/بانتظار المزامنة/);
 await page.evaluate(()=>{__offline=false;Object.defineProperty(navigator,'onLine',{get:()=>true,configurable:true});__deferred.splice(0).forEach(fn=>fn())});
 await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>draftStore.get('campaign1:team1:item10:qty')),null);
 // A new team sees all items without assignment; its contribution adds to, never replaces, team1.
 await page.evaluate(()=>{__store.stocktake_teams.team2={id:'team2',campaignId:'campaign1',name:'الجهة الثانية',scope:'يسار',memberEmployeeIds:['admin_mohanad'],memberEmployeeNames:['مهند']};__emit();pickTeam('team2')});await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>state.items.length),18);await page.locator('#startStocktake').click();await page.locator('#search').fill('10210');await page.waitForTimeout(80);
 assert.equal(await page.locator('#actual_item10').inputValue(),'');await page.locator('#actual_item10').fill('2.25');await page.locator('[data-save="item10"]').click();await page.locator('#surplusModal.open').waitFor();assert.match(await page.locator('#surplusTotal').innerText(),/15/);await page.locator('#surplusConfirm').click();await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>state.items.find(i=>i.id==='item10').actualQty),15);
 await page.locator('#search').fill('10210');await page.waitForTimeout(80);assert.equal(await page.locator('#actual_item10').inputValue(),'2.25');await page.locator('#actual_item10').fill('3.25');await page.locator('[data-save="item10"]').click();await page.locator('#surplusModal.open').waitFor();await page.locator('#surplusConfirm').click();await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>state.items.find(i=>i.id==='item10').actualQty),16);
 await page.locator('#search').fill('10210');await page.waitForTimeout(80);await page.locator('[data-found="item10"]').click();await page.locator('#foundQty').fill('1.5');assert.match(await page.locator('#foundPreview').innerText(),/17.5/);await page.locator('#foundSave').click();await page.locator('#surplusModal.open').waitFor();assert.match(await page.locator('#surplusTotal').innerText(),/17.5/);await page.locator('#surplusConfirm').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>state.items.find(i=>i.id==='item10').actualQty),17.5);
 await page.evaluate(()=>pickTeam('team1'));await page.waitForTimeout(80);await page.locator('#startStocktake').click();
 // Explicit server rejection retains recovery draft and never reports completion.
 await page.locator('#search').fill('10211');await page.waitForTimeout(80);await page.locator('#actual_item11').fill('5.5');await page.evaluate(()=>__reject=true);await page.locator('[data-save="item11"]').click();await page.waitForTimeout(80);assert.equal(await page.locator('#surplusModal.open').count(),0,'shortage must not show a surplus confirmation');assert.equal(await page.evaluate(()=>draftStore.get('campaign1:team1:item11:qty').value),'5.5');assert.equal(await page.evaluate(()=>state.items.find(i=>i.id==='item11').countStatus),'pending');
 await page.evaluate(()=>{state.campaign.status='closed';render()});assert.equal(await page.locator('[data-save="item11"]').isDisabled(),true);assert.equal(await page.evaluate(()=>canEditItem(state.items[0])),false);assert.equal(await page.evaluate(()=>{const item=state.items[0];state.campaign=null;return canEditItem(item)}),false);
 await page.evaluate(()=>{state.campaign=__store.stocktake_campaigns.campaign1;state.enteredScope='';state.items=[];state.itemsLoaded=true;itemCacheOnly=false;render()});assert.equal(await page.locator('#startStocktake').isDisabled(),true);assert.match(await page.locator('.welcomeReadiness').innerText(),/لقطة مخزون الحملة/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await ctx.close();
 for(const file of ['stocktake.html','admin-stocktake.html','stocktake-accountant.html','accountant-stocktake.html'])for(const width of [390,1440]){
  const {page:p,ctx:c,errors:e}=await pageFor(file,width);if(file==='stocktake.html'){if(width===1440){const box=await p.locator('.stocktakeWelcome').boundingBox();assert.ok(box.width>650);assert.ok(Math.abs(box.x+box.width/2-width/2)<2)}await p.screenshot({path:path.join(out,'welcome-'+width+'.png'),fullPage:true});await p.locator('#startStocktake').click();await p.locator('#search').fill('10203');await p.waitForTimeout(70)}
  if(file==='admin-stocktake.html'){
   await p.locator('#followupAccess summary').click();await p.locator('[data-accountant-member="e1"]').check();await p.evaluate(()=>__emit());assert.equal(await p.locator('[data-accountant-member="e1"]').isChecked(),true);assert.equal(await p.locator('#followupAccess').getAttribute('open'),'');await p.locator('#followupAccess summary').click();
   await p.evaluate(()=>{state.campaign.status='draft';__store.stocktake_campaigns.campaign1.status='draft';window.prompt=()=>state.teams[0].name});const before=await p.evaluate(()=>__writes.length);await p.evaluate(()=>deleteTeam('team1'));assert.equal(await p.evaluate(()=>__writes.length),before);assert.match(await p.locator('#toast').innerText(),/الحذف مرفوض/);
  }
  if(file==='accountant-stocktake.html')assert.notEqual(await p.locator('.campaignName').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)','campaign title must contrast with the light panel');assert.ok(await p.locator(file==='admin-stocktake.html'?'#reviewSearch':'#search').count(),file+' must render its data view');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,file+' '+width+' overflow');assert.deepEqual(e,[],file+' errors');await p.screenshot({path:path.join(out,file.replace('.html','')+'-'+width+'.png'),fullPage:true});await c.close();
 }
 await browser.close();console.log('PASS: Arabic/decimal draft preservation, blank rejection, offline enqueue and server acknowledgment, rejected-write recovery, closed read-only, protected deletion, live access controls, 8 responsive views.');
})().catch(e=>{console.error(e);process.exit(1)});

