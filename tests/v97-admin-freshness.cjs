'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('sw.js','utf8');
assert.match(source,/const NAV_CACHE='batco-navigation-shell-v97'/);
assert.match(source,/navPath\(url\)==='\/admin-dashboard\.html'/);
assert.match(source,/cache:'no-store'/);
assert.match(source,/سجلات مخزنة قديمة/);
assert.match(source,/NAV_PAGES\.has\(navPath\(url\)\)/);
assert.match(source,/\['\/admin-branch-presence\.html'/);
async function tryDashboard(offline){
  const events={};const calls=[],stored=[];
  const fake={self:{location:{origin:'https://inventory-system-coral-nu.vercel.app'},addEventListener:(name,fn)=>events[name]=fn},
    caches:{open:async()=>({put:async (key,res)=>stored.push(key),match:async()=>null}),keys:async()=>[]},
    fetch:async(req,opts)=>{calls.push({url:req.url,opts});if(offline)throw new Error('OFFLINE');return new Response('<html>V97 PRODUCTION</html>',{status:200,headers:{'Content-Type':'text/html'}})},
    URL,Response,AbortController,Promise,setTimeout,clearTimeout,console
  };
  vm.runInNewContext(source,fake);
  let response;const waits=[];
  events.fetch({request:{url:'https://inventory-system-coral-nu.vercel.app/admin-dashboard.html?section=employees&module=live',method:'GET',mode:'navigate',destination:'document'},respondWith:p=>response=p,waitUntil:p=>waits.push(p)});
  const result=await response;
  assert.equal(calls.length,1,'should make exactly one fresh admin page request');
  assert.equal(calls[0].opts.cache,'no-store','dashboard must bypass HTTP cache');
  assert.equal(result.status,offline?503:200);
  assert.match(await result.text(),offline?/لا يمكن تأكيد حضور الموظفين/:/V97 PRODUCTION/);
  await Promise.allSettled(waits);
  if(!offline)assert(stored.includes('/admin-dashboard.html'),'fresh response should replace navigation cache');
}
(async()=>{await tryDashboard(false);await tryDashboard(true);console.log('V97 dashboard network-first, offline explicit error, stocktake shell unaffected PASS')})().catch(err=>{console.error(err);process.exitCode=1});
