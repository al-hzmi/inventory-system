const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),built=fs.mkdtempSync(path.join(os.tmpdir(),'batco-build-')),out=path.join(root,'qa-v77');fs.mkdirSync(out,{recursive:true});
fs.cpSync(root,built,{recursive:true,filter:p=>!['node_modules','.git','qa-v77','qa-v73'].includes(path.basename(p))});fs.symlinkSync(path.join(root,'node_modules'),path.join(built,'node_modules'),'dir');
cp.execFileSync(process.execPath,[path.join(built,'scripts/build-performance.cjs')],{cwd:built,stdio:'inherit'});
const report=JSON.parse(fs.readFileSync(path.join(built,'assets/build/report.json')));
assert.ok(report.some(x=>x.page==='employee'));assert.ok(report.some(x=>x.page==='customer'));assert.ok(report.some(x=>x.page==='admin-dashboard'));
for(const f of fs.readdirSync(path.join(built,'assets/build')).filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(built,'assets/build',f),'utf8'),{filename:f});
for(const f of ['index.html','customer.html']){const html=fs.readFileSync(path.join(built,f),'utf8');for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);assert.match(html,/const CORE='\.\/assets\/build\/.*\.html'/)}
const read=p=>fs.readFileSync(p,'utf8');
cp.execFileSync(process.execPath,[path.join(root,'tests/v77-entry-smoke.cjs'),built],{cwd:root,stdio:'inherit'});
let baseline=read(path.join(root,'admin-dashboard.html'));
if(process.env.BASELINE_ADMIN)baseline=read(process.env.BASELINE_ADMIN);
else { // Reconstruct only the prior module boundary for a controlled same-data comparison.
 baseline=baseline.replace(/<AdminView key="[^"]+" render=\{(\w+)\}\/>/g,'<$1/>');
}
const fake=`(()=>{const rows=Array.from({length:160},(_,i)=>({id:'s'+i,name:'موظف '+i,rawQuery:'10'+i,resultsCount:2,time:{seconds:1792300000}}));const listeners=[];window.__emit=()=>listeners.forEach(x=>x());const snap=c=>({docs:(c==='search_logs'?rows:[]).map(d=>({id:d.id,data:()=>d})),exists:false,data:()=>({})});const query=c=>({where(){return this},orderBy(){return this},limit(){return this},doc(){return this},get:async()=>snap(c),onSnapshot(fn){const run=()=>fn(snap(c));listeners.push(run);setTimeout(run,0);return()=>{}},add:async()=>({id:'audit'}),set:async()=>{},update:async()=>{}});const db={collection:query};function firestore(){return db}firestore.FieldValue={serverTimestamp:()=>({seconds:1792300000})};window.firebase={apps:[{}],firestore};})();`;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results={};
 for(const kind of ['before','after']){
  const runs=[];
  for(let run=0;run<3;run++){
   const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(()=>{localStorage.setItem('inventory_user_name_v2','مهند');localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');new MutationObserver(()=>{if(!window.__paint&&document.querySelector('[data-admin-module]'))window.__paint=performance.now()}).observe(document,{childList:true,subtree:true})});
   await context.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname.endsWith('/admin-dashboard.html'))return r.fulfill({body:kind==='before'?baseline:read(path.join(built,'admin-dashboard.html')),contentType:'text/html'});
    if(u.hostname==='localhost'&&u.pathname.startsWith('/assets/build/'))return r.fulfill({body:read(path.join(built,u.pathname)),contentType:'application/javascript'});
    if(u.href.includes('firebase-app-compat'))return r.fulfill({body:fake,contentType:'application/javascript'});
    if(u.href.includes('@babel/standalone'))return r.fulfill({body:read(require.resolve('@babel/standalone')),contentType:'application/javascript'});
    if(u.href.includes('react-dom@18'))return r.fulfill({body:read(require.resolve('react-dom/package.json').replace('package.json','umd/react-dom.production.min.js')),contentType:'application/javascript'});
    if(u.href.includes('react@18'))return r.fulfill({body:read(require.resolve('react/package.json').replace('package.json','umd/react.production.min.js')),contentType:'application/javascript'});
    if(u.hostname==='cdn.tailwindcss.com')return r.fulfill({body:'window.tailwind={};',contentType:'application/javascript'});
    if(u.pathname.startsWith('/data/'))return r.fulfill({body:u.pathname.endsWith('.json')?'{}':'',contentType:'application/json'});
    return r.fulfill({body:'',contentType:'application/javascript'});
   });
   const session=await context.newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.goto('http://localhost/admin-dashboard.html?section=employees&module=searches');await page.locator('[data-admin-module="searches"]').waitFor();await page.waitForTimeout(350);
   assert.deepEqual(errors,[]);const ready=await page.evaluate(()=>window.__paint);const text=await page.locator('#root').innerText();const markup=await page.locator('#root').innerHTML();
   const input=page.locator('input[placeholder="بحث ذكي عن أي شيء..."]');await input.evaluate(el=>window.__originalInput=el);await input.fill('10');await page.waitForTimeout(100);const preserved=await input.evaluate(el=>el===window.__originalInput);
   if(kind==='after'){assert.equal(preserved,true,'typing must not remount search input');await page.evaluate(()=>__emit());await page.waitForTimeout(80);assert.equal(await input.evaluate(el=>el===window.__originalInput),true,'snapshot must preserve active input')}
   runs.push({readyMs:Math.round(ready),preserved,text,markup});await context.close();
  }
  results[kind]={medianReadyMs:runs.map(x=>x.readyMs).sort((a,b)=>a-b)[1],inputPreserved:runs[0].preserved,text:runs[0].text,markup:runs[0].markup};
 }
 assert.equal(results.before.text,results.after.text,'same visible content and features with fixed data');assert.equal(results.before.markup,results.after.markup,'unchanged rendered DOM, classes and styles');delete results.before.markup;delete results.after.markup;delete results.before.text;delete results.after.text;
 results.report=report;fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
