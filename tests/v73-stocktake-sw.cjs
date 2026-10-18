const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const events={},files=new Map(),deleted=[];let offline=false;
const self={location:{origin:'https://inventory.test'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
const caches={open:async()=>({put:async(k,r)=>files.set(k,r),match:async k=>files.get(k)}),keys:async()=>['customer-v1','stocktake-shell-v72'],delete:async k=>deleted.push(k)};
vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{self,caches,URL,Promise,setTimeout,fetch:async input=>{if(offline)throw new Error('offline');return new Response('cached shell '+(input.url||input),{status:200})}});
(async()=>{
 let pending;events.install({waitUntil:p=>pending=p});await pending;
 assert.ok(files.has('/stocktake.html'));assert.ok(files.has('/stocktake-core.js'));
 events.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['stocktake-shell-v72']);
 offline=true;
 let response;events.fetch({request:{method:'GET',url:'https://inventory.test/stocktake.html?v=56.12'},respondWith:p=>response=p,waitUntil:()=>{}});assert.match(await (await response).text(),/cached shell/);
 for(const url of ['https://inventory.test/api/inventory-import','https://firestore.googleapis.com/data','https://inventory.test/index.html']){let intercepted=false;events.fetch({request:{method:'GET',url},respondWith:()=>intercepted=true});assert.equal(intercepted,false)}
 console.log('PASS: offline cached navigation, revisioned URLs, vendor shell cache, unrelated cache retention, API and Firestore exclusions');
})().catch(e=>{console.error(e);process.exitCode=1});
