// V76 nav/offline regression: only static HTML shells are cached, never private traffic.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const read = p => fs.readFileSync(p,'utf8');
const sw = read('sw.js');
const nav = read('batco-fast-nav.js');
new vm.Script(sw,{filename:'sw.js'});
new vm.Script(nav,{filename:'batco-fast-nav.js'});
const html = read('admin-dashboard.html');
assert.match(html, /id="app-loader"[^>]*><img class="batco-splash-wordmark" src="\.\/assets\/batco-logo\.svg/);
assert.ok(!html.includes('<img src="./assets/batco-app-icon.svg" onerror='),'old square dashboard loading artwork must be absent');
assert.match(html, /width:min\(43vw,178px\)/);
assert.match(read('admin-home.html'),/batco-fast-nav\.js\?v=76\.0/);
assert.match(read('index.html'),/batco-fast-nav\.js\?v=76\.0/);
assert.match(read('customer.html'),/html=html\.replace\("customer-sw\.js\?v=35\.0","sw\.js\?v=76\.0"\)/);
assert.match(read('v56-39-site-identity.js'),/batco-fast-nav\.js\?v=76\.0/);
assert.match(nav,/controllerchange/);
const listeners = {};
const stores = new Map();
const deleted = [];
const fetches = [];
const c = {
 async open(key) {
  if (!stores.has(key)) stores.set(key,new Map());
  return { put:async (path,response)=>stores.get(key).set(typeof path==='string'?path:path.url,response),
    match:async path=>stores.get(key).get(typeof path==='string'?path:path.url)};
 },
 keys:async()=>['stocktake-shell-v75-1','unrelated-key',...stores.keys()],
 delete:async k=>{deleted.push(k);stores.delete(k);return true}
};
const mockFetch = async (input) => {
 const url = typeof input==='string'?input:input.url;
 fetches.push(url);
 if(mockFetch.offline) throw Error('offline');
 return new Response('<!doctype html><html></html>',{status:200,headers:{'Content-Type':'text/html'}});
};
const self = {
 location:{origin:'https://batco.example'},
 addEventListener:(key,fn)=>listeners[key]=fn,
 skipWaiting:async()=>{},
 clients:{claim:async()=>{}}
};
vm.runInNewContext(sw,{self,caches:c,fetch:mockFetch,URL,Response,Promise,setTimeout,console});
assert.equal(typeof listeners.fetch,'function');
let pending;
(async()=>{
 listeners.message({data:{type:'BATCO_PREFETCH_SHELL',paths:['/admin-home.html','/admin-dashboard.html','/api/secret','/data/jeddah.tsv']},waitUntil:p=>{pending=p}});
 await pending;
 const shells=stores.get([...stores.keys()].find(k=>k.startsWith('batco-navigation-shell-')));
 assert.ok(shells?.has('/admin-home.html'));
 assert.ok(shells?.has('/admin-dashboard.html'));
 assert.ok(!shells.has('/api/secret'));
 assert.ok(!shells.has('/data/jeddah.tsv'));
 assert.ok(!fetches.some(x=>x.includes('api/secret')||x.includes('jeddah.tsv')));
 mockFetch.offline=true;
 let response;
 listeners.fetch({request:{method:'GET',mode:'navigate',destination:'document',url:'https://batco.example/admin-home.html?tab=x'},respondWith:p=>response=p,waitUntil:()=>{}});
 const offline=await response;
 assert.equal(offline.status,200,'cached static HTML must remain available offline');
 response=null;
 listeners.fetch({request:{method:'GET',mode:'cors',url:'https://batco.example/api/secret'},respondWith:p=>response=p,waitUntil:()=>{}});
 assert.equal(response,null,'API traffic must bypass HTML cache');
 response=null;
 listeners.fetch({request:{method:'POST',mode:'cors',url:'https://batco.example/api/secret'},respondWith:p=>response=p,waitUntil:()=>{}});
 assert.equal(response,null,'writes must bypass cache');
})().then(()=>{
assert.ok(nav.includes('e.defaultPrevented'),'cancelled links may not display a false transition');
assert.ok(nav.includes('window.addEventListener(\'pageshow\', removeTransition)'),'restored tabs must remove transition');
console.log('PASS: unified horizontal BATCO splash, static shell prefetch, offline page load, no API/quantity caching, safe navigation handling');
}).catch(error=>{console.error(error);process.exitCode=1});
