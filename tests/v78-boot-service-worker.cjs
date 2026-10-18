const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('sw.js','utf8');
async function suite(storageFails=false){
 const listeners={},stores=new Map(),calls=[];let offline=false,cdnFails=true;
 const caches={open:async name=>{if(storageFails)throw Error('quota');if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {match:async key=>map.get(typeof key==='string'?key:key.url)?.clone(),put:async(key,value)=>map.set(typeof key==='string'?key:key.url,value.clone())}},keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),match:async key=>{for(const map of stores.values())if(map.has(key))return map.get(key).clone()}};
 const fetch=async (input,opts)=>{const url=typeof input==='string'?input:input.url;calls.push({url,opts});if(offline||cdnFails&&url.startsWith('https://')&&!url.startsWith('https://batco.example'))throw Error('offline');return new Response(url.endsWith('.js')?'window.test=true':'<!doctype html><html><body>BATCO</body></html>',{headers:{'Content-Type':url.endsWith('.js')?'application/javascript':'text/html'}})};
 const self={location:{origin:'https://batco.example'},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
 vm.runInNewContext(source,{self,caches,fetch,URL,Response,Promise,setTimeout,clearTimeout,console});
 let install;listeners.install({waitUntil:p=>install=p});await install; // optional CDN failure cannot prevent upgrade
 async function request(url,mode='navigate'){let response,background=[];listeners.fetch({request:{url:'https://batco.example'+url,method:'GET',mode,destination:mode==='navigate'?'document':'script'},respondWith:p=>response=p,waitUntil:p=>background.push(p)});if(!response)return null;const result=await response;await Promise.allSettled(background);return result}
 assert.equal((await request('/index.html')).status,200,'network works even with CacheStorage failure');
 assert.equal(await request('/api/employees'),null,'private API never cached');
 assert.equal(await request('/data/jeddah.tsv'),null,'inventory never cached');
 if(!storageFails){
  const before=calls.length;await request('/index.html?batco-retry=123');assert.ok(calls.slice(before).some(x=>x.opts?.cache==='reload'),'retry bypasses stale shell');
  const oldHash='https://batco.example/assets/build/employee.01234567890123456789.js';
  stores.set('batco-static-resources-v76',new Map());stores.set('batco-static-resources-v77',new Map([[oldHash,new Response('oldTabCode')]]));
  let activation;listeners.activate({waitUntil:p=>activation=p});await activation;
  assert.ok(stores.has('batco-static-resources-v77'),'previous deployment scripts survive activation');
  offline=true;assert.equal(await (await request('/assets/build/employee.01234567890123456789.js','cors')).text(),'oldTabCode','open old tab can fetch its hashed code offline after upgrade');
  assert.equal((await request('/index.html')).status,200,'warm employee launch works offline');
  const response=await request('/admin-home.html');assert.equal(response.status,503);assert.match(await response.text(),/إعادة المحاولة/,'uncached offline page has recovery, not blank error');
 } else {offline=true;assert.equal((await request('/index.html')).status,503)}
}
(async()=>{await suite();await suite(true);console.log('PASS boot SW: CDN-independent install, unavailable storage, offline warm/cold, retry refresh, private data bypass')})().catch(e=>{console.error(e);process.exit(1)});
