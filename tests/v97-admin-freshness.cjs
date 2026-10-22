'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('sw.js','utf8');
assert.match(source,/const NAV_CACHE='batco-navigation-shell-v103-employee-session'/);
assert.match(source,/NAV_PAGES\.has\(navPath\(url\)\)/);
assert.doesNotMatch(source,/cache:'no-store',signal:controller\.signal/);
assert.match(source,/\['\/admin-branch-presence\.html'/);
async function verify(cached,offline){
 const handlers={},waits=[],requests=[],cacheWrites=[];
 const cache={match:async()=>cached?new Response('<html>cached admin shell</html>',{headers:{'content-type':'text/html'}}):null,put:async(key)=>cacheWrites.push(key)};
 const fake={self:{location:{origin:'https://inventory-system-coral-nu.vercel.app'},addEventListener:(key,fn)=>handlers[key]=fn},
   caches:{open:async()=>cache,match:async()=>null,keys:async()=>[]},
   fetch:async(req)=>{requests.push(req);if(offline)throw new Error('offline');return new Response('<html>updated admin shell</html>',{headers:{'content-type':'text/html'}})},
   URL,Response,AbortController,Promise,setTimeout,clearTimeout,console};
 vm.runInNewContext(source,fake);
 let answer;
 handlers.fetch({request:{url:'https://inventory-system-coral-nu.vercel.app/admin-dashboard.html',method:'GET',mode:'navigate',destination:'document'},
  respondWith:p=>answer=p,waitUntil:p=>waits.push(p)});
 const result=await answer;
 assert.equal(result.status,cached||!offline?200:503);
 const html=await result.text();
 if(cached)assert.match(html,/cached admin shell/);
 else if(offline)assert.match(html,/تعذر الاتصال بالنظام/);
 else assert.match(html,/updated admin shell/);
 await Promise.allSettled(waits);
 if(!cached&&!offline)assert(cacheWrites.includes('/admin-dashboard.html'));
}
(async()=>{await verify(true,false);await verify(true,true);await verify(false,false);await verify(false,true);console.log('V98 instant cached navigation and online refresh PASS')})().catch(e=>{console.error(e);process.exitCode=1});
