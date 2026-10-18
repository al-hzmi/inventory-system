const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(process.argv[2]||'.');
const fake=`(()=>{const snap={docs:[],exists:true,size:0,empty:true,metadata:{},data:()=>({enabled:true}),forEach:()=>{}};const q={where(){return this},orderBy(){return this},limit(){return this},doc(){return this},get:async()=>snap,onSnapshot(fn){setTimeout(()=>fn(snap),0);return()=>{}},set:async()=>{},update:async()=>{},add:async()=>({id:'test'})};const db={collection:()=>q,enablePersistence:async()=>{}};function firestore(){return db}firestore.FieldValue={serverTimestamp:()=>({seconds:1}),arrayUnion:(...x)=>x};function auth(){return {currentUser:null,setPersistence:async()=>{},onAuthStateChanged(fn){setTimeout(()=>fn(null),0);return()=>{}}}}auth.Auth={Persistence:{LOCAL:'local'}};window.firebase={apps:[{}],firestore,auth};})();`;
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
for(const route of ['index.html','index.html?employee=1','customer.html']){
 const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async r=>{const u=new URL(r.request().url());
  if(u.href.includes('firebase-app-compat'))return r.fulfill({body:fake,contentType:'application/javascript'});
  if(u.hostname==='cdn.tailwindcss.com')return r.fulfill({body:'window.tailwind={};',contentType:'application/javascript'});
  if(u.hostname==='localhost'){
   if(u.pathname.startsWith('/data/')||u.pathname.startsWith('/api/'))return r.fulfill({body:u.pathname.endsWith('.tsv')?'sku\tname\tqty\n':'{}',contentType:'application/json'});
   const file=path.join(root,u.pathname);if(fs.existsSync(file)&&fs.statSync(file).isFile()&&(/\.(html|js)$/.test(file))&&(u.pathname.includes('/assets/build/')||/\/(index|customer)\.html$/.test(u.pathname)))return r.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':'application/javascript'});
  }
  return r.fulfill({body:'',contentType:'application/javascript'});
 });
 await page.goto('http://localhost/'+route);await page.waitForFunction(()=>document.querySelector('#root')?.textContent.trim().length>10,{},{timeout:15000});await page.waitForTimeout(250);
 assert.deepEqual(errors,[],route);assert.equal(await page.locator('script[type="text/babel"]').count(),0);console.log('ENTRY_PASS',route,(await page.locator('#root').innerText()).replace(/\s+/g,' ').slice(0,100));await context.close();
}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
