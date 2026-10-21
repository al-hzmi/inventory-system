'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const stock=fs.readFileSync('stocktake.html','utf8');
const start=stock.indexOf('function syncHtml(){'),end=stock.indexOf('\nconst destroy=',start);
assert(start>=0&&end>start,'stocktake sync indicator should be present');
const extract=stock.slice(start,end);
assert.match(extract,/draftPendingIds\.size/);
for(const [drafts,online,pending,want] of [
 [0,true,0,'تمت المزامنة مع الخادم'],
 [1,true,0,'مسودة محلية لم يتأكد اعتمادها'],
 [2,false,0,'2 صنف به مسودة محلية'],
 [0,true,1,'بانتظار المزامنة']
]){
 const ctx={state:{items:Array.from({length:pending},()=>({_pending:true}))},draftPendingIds:new Set(Array.from({length:drafts},(_,i)=>i)),durableCache:true,itemCacheOnly:false,navigator:{onLine:online}};
 const html=vm.runInNewContext(extract+'\nsyncHtml()',ctx);
 assert(html.includes(want),'unexpected sync state: '+html);
 assert(drafts===0||html.includes('class="syncStatus error"'),'draft must be a warning');
}
for(const marker of ['function trackPendingDraft(id)','function paintSyncStatus()','draftPendingIds=new Set();for(const i of state.items)','trackPendingDraft(item.id);paintSyncStatus();'])
 assert(stock.includes(marker),'lost local draft reconciliation hook: '+marker);
console.log('Stocktake local drafts never reported as server-confirmed: PASS');
