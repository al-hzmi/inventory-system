import fs from 'fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const indexSource=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const authSource=fs.readFileSync('v48-auth-security.js','utf8');
const adminHtml=fs.readFileSync('admin-dashboard.html','utf8');
const adminHash=adminHtml.match(/const ADMIN_HASH='([^']+)'/)?.[1];
const toEnglishDigits=value=>String(value||'').replace(/[٠-٩۰-۹]/g,d=>{const a='٠١٢٣٤٥٦٧٨٩',e='۰۱۲۳۴۵۶۷۸۹';const i=a.indexOf(d);return i>=0?String(i):String(e.indexOf(d))});
const cleanId=value=>toEnglishDigits(value).replace(/\D/g,'');
const imageSku=value=>toEnglishDigits(String(value||'')).trim().toUpperCase().replace(/\s+/g,'').replace(/[^A-Z0-9_-]/g,'');
function parseInventory(raw){
  const lines=String(raw||'').replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);const headers=(lines.shift()||'').split('\t').map(x=>x.trim());
  const idIdx=headers.findIndex(h=>/رقم|كود|sku|item/i.test(h)),nameIdx=headers.findIndex(h=>/اسم|وصف|description|name/i.test(h)),qtyIdx=headers.findIndex(h=>/كمية|رصيد|متوفر|qty|quantity/i.test(h));
  return lines.map(line=>{const c=line.split('\t').map(x=>x.trim()),id=c[idIdx]||'',clean=cleanId(id),sku=imageSku(id),qty=parseFloat(toEnglishDigits(c[qtyIdx]||'0').replace(/,/g,''));return{cleanId:clean,imageSku:sku,id,name:c[nameIdx]||id,qty:Number.isFinite(qty)?qty:0}}).filter(x=>x.cleanId&&x.imageSku);
}
function buildImageFixture(){
  const imagesText=fs.readFileSync('data/images_list.txt','utf8'),j=parseInventory(fs.readFileSync('data/jeddah.tsv','utf8')),r=parseInventory(fs.readFileSync('data/riyadh.tsv','utf8'));
  const exact=new Map(),legacy=new Map();
  for(const line of imagesText.split(/\r?\n/)){const raw=line.trim();if(!raw||raw.startsWith('#'))continue;const parts=raw.split('\t');const declared=(parts.length>=2?parts[0]:raw.split('/').pop().split('?')[0].replace(/\.[^.]+$/,'')).trim(),file=(parts.length>=2?parts.slice(1).join('\t'):raw).trim(),sku=imageSku(declared),clean=cleanId(declared);if(sku)exact.set(sku,file);if(clean){if(!legacy.has(clean))legacy.set(clean,[]);legacy.get(clean).push({sku,file})}}
  const owners=new Map();for(const row of [...j,...r]){if(!owners.has(row.cleanId))owners.set(row.cleanId,new Set());owners.get(row.cleanId).add(row.imageSku)}
  const resolve=row=>exact.get(row.imageSku)||((owners.get(row.cleanId)?.size===1)?legacy.get(row.cleanId)?.[0]?.file:'')||'';
  const seen=new Set(),rows=[];for(const row of j){if(row.qty<1||seen.has(row.cleanId))continue;const file=resolve(row);if(!file)continue;seen.add(row.cleanId);rows.push({...row,imageFile:file});if(rows.length>=12)break}
  if(!rows.length)throw new Error('V55_TEST_FIXTURE_MISSING_IMAGE_BACKED_JEDDAH_PRODUCT');
  return rows;
}
const NEW_ARRIVAL_FIXTURES=buildImageFixture();
const CUSTOMER_ARRIVALS={items:NEW_ARRIVAL_FIXTURES.map((x,i)=>({sku:x.id,name:x.name,firstSeenAt:'2026-09-17T00:00:00.000Z',daysRemaining:30-i%5}))};
const ADMIN_MISSING_ARRIVALS={items:[{sku:'QA_MISSING_998877',name:'صنف اختبار نواقص جديدنا',firstSeenAt:'2026-09-17T00:00:00.000Z',daysRemaining:30}]};
const localAssets={react:fs.readFileSync('node_modules/react/umd/react.production.min.js','utf8'),reactDom:fs.readFileSync('node_modules/react-dom/umd/react-dom.production.min.js','utf8'),babel:fs.readFileSync('node_modules/@babel/standalone/babel.min.js','utf8'),firebaseApp:fs.readFileSync('node_modules/firebase/firebase-app-compat.js','utf8'),firebaseAuth:fs.readFileSync('node_modules/firebase/firebase-auth-compat.js','utf8'),firebaseFirestore:fs.readFileSync('node_modules/firebase/firebase-firestore-compat.js','utf8'),tailwind:fs.readFileSync('/tmp/v55-tailwind.css','utf8')};
async function installLocalCdn(ctx){
  await ctx.route('https://cdn.tailwindcss.com/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:`window.tailwind=window.tailwind||{config:{}};document.head.insertAdjacentHTML('beforeend','<style>'+${JSON.stringify(localAssets.tailwind)}+'</style>');`}));
  await ctx.route('https://unpkg.com/react@18/umd/react.production.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:localAssets.react}));
  await ctx.route('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:localAssets.reactDom}));
  await ctx.route('https://unpkg.com/@babel/standalone/babel.min.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:localAssets.babel}));
  await ctx.route('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:localAssets.firebaseApp}));
  await ctx.route('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:localAssets.firebaseAuth}));
  await ctx.route('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',r=>r.fulfill({status:200,contentType:'application/javascript',body:localAssets.firebaseFirestore}));
  await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:''}));
}
async function installCustomerNewArrivalFixture(page){
  await page.route('**/data/new-arrivals.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(CUSTOMER_ARRIVALS)}));
  await page.route('**/api/new-arrivals-admin**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({include:[],exclude:[]})}));
}
assert(adminHash,'admin session marker');
for(const marker of ['new-arrivals.json','SPECIAL_CATEGORIES.NEW_ARRIVALS','loginAttemptId','LOGIN_PHOTO_PROOF','photoCaptured:true','passwordResetRequiresPhoto: false'])assert(indexSource.includes(marker),marker);
assert(authSource.includes("softLogout(s.id,Date.now(),s.name)"),'reset flag must force photo re-entry');
assert(!authSource.includes('passwordResetRequiresPhoto:false,passwordResetPhotoCompletedAt:serverTs(),lastReauthDeviceHash'),'V48 must not infer photo completion from session');
assert(adminHtml.includes("proof?.role==='admin'")&&adminHtml.includes('inventory_login_photo_proof_v2'),'production admin session requires photo proof');

const browser=await chromium.launch({headless:true});
let failed=false;
const report=(name,data)=>console.log(name,JSON.stringify(data));
try{
  for(const [w,h] of [[390,844],[1440,900]]){
    const ctx=await browser.newContext({viewport:{width:w,height:h}});await installLocalCdn(ctx);await ctx.addInitScript(()=>{localStorage.setItem('batco_customer_portal_preview_v2','admin-preview');localStorage.setItem('inventory_user_name_v2','QA Employee');localStorage.setItem('inventory_employee_id_v2','qa_employee');localStorage.setItem('inventory_employee_auth_version_v2','2')});const p=await ctx.newPage(),errors=[];await installCustomerNewArrivalFixture(p);
    p.on('pageerror',e=>errors.push(String(e)));
    await p.goto(`${base}/customer.html?employeeView=1&qa=1`,{waitUntil:'domcontentloaded',timeout:60000});
    await p.locator('#new-arrivals-title').waitFor({state:'visible',timeout:60000});await p.waitForTimeout(500);
    const g=await p.evaluate(()=>{const title=document.querySelector('#new-arrivals-title'),sec=title?.closest('section'),search=document.querySelector('input[placeholder*="ابحث برقم"]'),strip=sec?.querySelector('.overflow-x-auto'),cards=strip?.querySelectorAll('article')||[],sr=sec?.getBoundingClientRect(),qr=search?.getBoundingClientRect(),overflowX=strip?getComputedStyle(strip).overflowX:'';return{title:!!title,count:cards.length,above:sr&&qr?sr.bottom<=qr.top+2:false,horizontal:['auto','scroll'].includes(overflowX),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}});
    report(`CUSTOMER_${w}`,{...g,fixtureCount:NEW_ARRIVAL_FIXTURES.length,errors});if(!g.title||g.count<1||!g.above||!g.horizontal||g.overflow>3||errors.length)failed=true;await ctx.close();
  }
  {
    const ctx=await browser.newContext({viewport:{width:390,height:844}});await installLocalCdn(ctx);await ctx.addInitScript(()=>{localStorage.setItem('inventory_user_name_v2','QA Employee');localStorage.setItem('inventory_employee_id_v2','qa_employee');localStorage.setItem('inventory_employee_auth_version_v2','2');localStorage.removeItem('inventory_login_photo_proof_v2')});const p=await ctx.newPage();await p.goto(`${base}/index.html?employee=1&qa=1`,{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>document.body?.innerText?.includes('دخول الموظفين'),null,{timeout:60000});const g=await p.evaluate(()=>({login:document.body.innerText.includes('دخول الموظفين'),hasNameInput:!!document.querySelector('input[autocomplete="username"]')}));report('PHOTO_BYPASS_BLOCKED',g);if(!g.login||!g.hasNameInput)failed=true;await ctx.close();
  }
  {
    const ctx=await browser.newContext({viewport:{width:430,height:932}});await installLocalCdn(ctx);await ctx.addInitScript(()=>{localStorage.setItem('inventory_user_name_v2','QA Employee');localStorage.setItem('inventory_employee_id_v2','qa_employee');localStorage.setItem('inventory_employee_auth_version_v2','2');localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:'qa_employee',photoId:'qa_photo'}))});const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(`${base}/index.html?employee=1&qa=1`,{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>document.body?.innerText?.includes('المعرض الرقمي')&&document.body?.innerText?.includes('جديدنا'),null,{timeout:60000});await p.getByRole('button',{name:'مخزون جدة'}).click();await p.getByRole('button',{name:'جديدنا',exact:true}).first().click();await p.waitForTimeout(500);const g=await p.evaluate(()=>({newButton:[...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='جديدنا'),resultText:document.body.innerText.includes('جديدنا —'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));report('EMPLOYEE_NEW_ARRIVALS',{...g,errors});if(!g.newButton||!g.resultText||g.overflow>3||errors.length)failed=true;await ctx.close();
  }
  {
    const ctx=await browser.newContext({viewport:{width:1440,height:900}});await installLocalCdn(ctx);await ctx.addInitScript(hash=>{localStorage.setItem('inventory_user_name_v2','مهند');localStorage.setItem('inventory_admin_token_v2',hash);localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'admin',employeeId:'admin_mohanad',photoId:'qa_admin_photo'}))},adminHash);const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.route('**/data/new-arrivals.json*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(ADMIN_MISSING_ARRIVALS)}));await p.goto(`${base}/admin-dashboard.html?section=products&module=new_arrivals&qa=1`,{waitUntil:'domcontentloaded',timeout:60000});await p.getByRole('heading',{name:'جاهزية أصناف «جديدنا»',exact:true}).waitFor({state:'visible',timeout:60000});const g=await p.evaluate(()=>({heading:document.body.innerText.includes('جاهزية أصناف «جديدنا»'),control:!!document.querySelector('[data-new-arrivals-customer-control="1"]'),missing:document.body.innerText.includes('بدون صورة')&&document.body.innerText.includes('بدون سعر')&&document.body.innerText.includes('بدون قسم'),skip:document.body.innerText.includes('تخطي المتابعة'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));report('ADMIN_NEW_ARRIVALS',{...g,errors});if(!g.heading||!g.control||!g.missing||!g.skip||g.overflow>3||errors.length)failed=true;await ctx.close();
  }
}finally{await browser.close()}
if(failed)process.exit(1);
