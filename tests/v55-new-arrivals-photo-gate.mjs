import fs from 'fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const indexSource=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const authSource=fs.readFileSync('v48-auth-security.js','utf8');
const adminHtml=fs.readFileSync('admin-dashboard.html','utf8');
const adminHash=adminHtml.match(/const ADMIN_HASH='([^']+)'/)?.[1];
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
    const ctx=await browser.newContext({viewport:{width:w,height:h}});await installLocalCdn(ctx);await ctx.addInitScript(()=>localStorage.setItem('batco_customer_portal_preview_v2','admin-preview'));const p=await ctx.newPage(),errors=[];
    p.on('pageerror',e=>errors.push(String(e)));
    await p.goto(`${base}/customer.html?qa=1`,{waitUntil:'domcontentloaded',timeout:60000});
    await p.waitForFunction(()=>document.body?.innerText?.includes('جديدنا'),null,{timeout:60000});await p.waitForTimeout(800);
    const g=await p.evaluate(()=>{const title=[...document.querySelectorAll('h2')].find(x=>x.textContent.trim()==='جديدنا'),sec=title?.closest('section'),search=document.querySelector('input[placeholder*="ابحث برقم"]'),strip=sec?.querySelector('.overflow-x-auto'),cards=strip?.querySelectorAll('article')||[],sr=sec?.getBoundingClientRect(),qr=search?.getBoundingClientRect();return{title:!!title,count:cards.length,above:sr&&qr?sr.bottom<=qr.top+2:false,horizontal:strip?strip.scrollWidth>strip.clientWidth:false,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}});
    report(`CUSTOMER_${w}`,{...g,errors});if(!g.title||g.count<1||!g.above||!g.horizontal||g.overflow>3||errors.length)failed=true;await ctx.close();
  }
  {
    const ctx=await browser.newContext({viewport:{width:390,height:844}});await installLocalCdn(ctx);await ctx.addInitScript(()=>{localStorage.setItem('inventory_user_name_v2','QA Employee');localStorage.setItem('inventory_employee_id_v2','qa_employee');localStorage.setItem('inventory_employee_auth_version_v2','2');localStorage.removeItem('inventory_login_photo_proof_v2')});const p=await ctx.newPage();await p.goto(`${base}/index.html?employee=1&qa=1`,{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>document.body?.innerText?.includes('دخول الموظفين'),null,{timeout:60000});const g=await p.evaluate(()=>({login:document.body.innerText.includes('دخول الموظفين'),hasNameInput:!!document.querySelector('input[autocomplete="username"]')}));report('PHOTO_BYPASS_BLOCKED',g);if(!g.login||!g.hasNameInput)failed=true;await ctx.close();
  }
  {
    const ctx=await browser.newContext({viewport:{width:430,height:932}});await installLocalCdn(ctx);await ctx.addInitScript(()=>{localStorage.setItem('inventory_user_name_v2','QA Employee');localStorage.setItem('inventory_employee_id_v2','qa_employee');localStorage.setItem('inventory_employee_auth_version_v2','2');localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'employee',employeeId:'qa_employee',photoId:'qa_photo'}))});const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(`${base}/index.html?employee=1&qa=1`,{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>document.body?.innerText?.includes('المعرض الرقمي')&&document.body?.innerText?.includes('جديدنا'),null,{timeout:60000});await p.getByRole('button',{name:'مخزون جدة'}).click();await p.getByRole('button',{name:'جديدنا',exact:true}).first().click();await p.waitForTimeout(500);const g=await p.evaluate(()=>({newButton:[...document.querySelectorAll('button')].some(x=>x.textContent.trim()==='جديدنا'),resultText:document.body.innerText.includes('جديدنا —'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));report('EMPLOYEE_NEW_ARRIVALS',{...g,errors});if(!g.newButton||!g.resultText||g.overflow>3||errors.length)failed=true;await ctx.close();
  }
  {
    const ctx=await browser.newContext({viewport:{width:1440,height:900}});await installLocalCdn(ctx);await ctx.addInitScript(hash=>{localStorage.setItem('inventory_user_name_v2','مهند');localStorage.setItem('inventory_admin_token_v2',hash);localStorage.setItem('inventory_login_photo_proof_v2',JSON.stringify({role:'admin',employeeId:'admin_mohanad',photoId:'qa_admin_photo'}))},adminHash);const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(`${base}/admin-dashboard.html?section=employees&module=live&qa=1`,{waitUntil:'domcontentloaded',timeout:60000});await p.waitForFunction(()=>document.body?.innerText?.includes('جديدنا'),null,{timeout:60000});await p.getByRole('button',{name:/جديدنا/}).click();await p.waitForFunction(()=>document.body?.innerText?.includes('جاهزية أصناف'),null,{timeout:30000});const g=await p.evaluate(()=>({heading:document.body.innerText.includes('جاهزية أصناف «جديدنا»'),missing:document.body.innerText.includes('بدون صورة')||document.body.innerText.includes('بدون سعر')||document.body.innerText.includes('بدون قسم'),skip:document.body.innerText.includes('تخطي المتابعة'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));report('ADMIN_NEW_ARRIVALS',{...g,errors});if(!g.heading||!g.missing||!g.skip||g.overflow>3||errors.length)failed=true;await ctx.close();
  }
}finally{await browser.close()}
if(failed)process.exit(1);
