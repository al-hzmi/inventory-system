import fs from 'node:fs';
import { chromium } from 'playwright';

const base=process.env.V42_BASE_URL||'http://127.0.0.1:4173';
const NAME='عميل اختبار V42';
const COMPANY='__V42_QA__ شركة اختبار';
const VISITOR='cv_v42_qa_'+Date.now().toString(36);
const toEnglishDigits=value=>String(value||'').replace(/[٠-٩۰-۹]/g,d=>{const a='٠١٢٣٤٥٦٧٨٩',e='۰۱۲۳۴۵۶۷۸۹';const i=a.indexOf(d);return i>=0?String(i):String(e.indexOf(d))});
const cleanId=value=>toEnglishDigits(value).replace(/\D/g,'');
const LIVE_PRODUCT=(()=>{
  const lines=fs.readFileSync('data/jeddah.tsv','utf8').replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/);
  const headers=(lines.shift()||'').split('\t').map(x=>x.trim());
  const idIdx=headers.findIndex(h=>/رقم|كود|sku|item/i.test(h));
  const nameIdx=headers.findIndex(h=>/اسم|وصف|description|name/i.test(h));
  const qtyIdx=headers.findIndex(h=>/كمية|رصيد|متوفر|qty|quantity/i.test(h));
  const current=new Map();
  for(const line of lines){
    const cols=line.split('\t').map(x=>x.trim());
    const id=cleanId(cols[idIdx]);
    const qty=parseFloat(toEnglishDigits(cols[qtyIdx]).replace(/,/g,''));
    if(id)current.set(id,{cleanId:id,id:String(cols[idIdx]||id),name:String(cols[nameIdx]||id),qty:Number.isFinite(qty)?qty:0});
  }
  return [...current.values()].find(row=>row.qty>1);
})();
if(!LIVE_PRODUCT)throw new Error('V42_TEST_FIXTURE_MISSING_LIVE_JEDDAH_PRODUCT');
const SKU=LIVE_PRODUCT.cleanId;
const fail=m=>{throw new Error(m)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function seed(browser){
  const context=await browser.newContext();
  await context.addInitScript(({NAME,VISITOR,LIVE_PRODUCT})=>{
    try{
      if(sessionStorage.getItem('__v42_seeded')==='1')return;
      localStorage.clear();sessionStorage.clear();
      localStorage.setItem('customer_guest_name_v1',NAME);
      localStorage.setItem('batco_customer_visitor_id_v1',VISITOR);
      localStorage.setItem('customer_guest_branches_v1',JSON.stringify([{id:'b1',name:'الفرع الرئيسي'}]));
      localStorage.setItem('customer_guest_cart_v1',JSON.stringify({[LIVE_PRODUCT.cleanId]:{cleanId:LIVE_PRODUCT.cleanId,id:LIVE_PRODUCT.id,name:LIVE_PRODUCT.name,imageFile:'',cartonPrice:0,pack:'',branchQuantities:{b1:.5}}}));
      sessionStorage.setItem('__v42_seeded','1');
    }catch{}
  },{NAME,VISITOR,LIVE_PRODUCT});
  return context;
}

async function cleanup(page,knownOrderId=''){
  return await page.evaluate(async({knownOrderId})=>{
    const withTimeout=(promise,ms=8000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT')),ms))]);
    const u=firebase.auth().currentUser;if(!u)return {ok:true,none:true};
    const uid=u.uid,errors=[];
    if(knownOrderId){try{await withTimeout(firebase.firestore().collection('customer_orders').doc(knownOrderId).delete())}catch(e){errors.push('order:'+(e?.code||e?.message||e))}}
    for(const col of ['customer_drafts','customer_sessions','customer_activity_logs','customer_login_logs','customer_devices','customer_security_photos']){
      try{const q=await withTimeout(firebase.firestore().collection(col).where('customerUid','==',uid).get());for(const d of q.docs)await withTimeout(d.ref.delete())}catch(e){errors.push(col+':'+(e?.code||e?.message||e))}
    }
    try{await withTimeout(firebase.firestore().collection('customers').doc(uid).delete())}catch(e){errors.push('customers:'+(e?.code||e?.message||e))}
    try{await withTimeout(u.delete())}catch(e){errors.push('auth:'+(e?.code||e?.message||e))}
    try{localStorage.removeItem('batco_quick_customer_profile_v1')}catch{}
    return {ok:errors.length===0,uid,errors};
  },{knownOrderId});
}

const browser=await chromium.launch({headless:true});
let context,page,cleanupResult=null,knownOrderId='';
try{
  context=await seed(browser);page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  await page.goto(base+'/customer.html',{waitUntil:'domcontentloaded',timeout:45000});
  await sleep(3500);
  let body=await page.locator('body').innerText();
  for(const forbidden of ['أنشئ رمز دخول','تأكيد الحضور','رقم الجوال','لدي حساب','إنشاء حساب جديد'])if(body.includes(forbidden))fail('legacy auth UI visible before checkout: '+forbidden);
  if(body.includes('حسابي'))fail('guest navigation exposes account settings');

  await page.getByRole('button',{name:'السلة'}).last().click({timeout:20000});
  await page.getByRole('button',{name:'متابعة الاعتماد'}).waitFor({state:'visible',timeout:15000});
  await page.getByRole('button',{name:'متابعة الاعتماد'}).click();
  const company=page.getByPlaceholder('اكتب اسم الشركة أو المؤسسة');
  await company.waitFor({state:'visible',timeout:10000});
  body=await page.locator('body').innerText();
  if(!body.includes('هذه المعلومة الوحيدة المطلوبة'))fail('company-only checkout explanation missing');
  if(!body.includes('ملاحظة')||!body.includes('اختياري'))fail('notes are not optional');
  for(const forbidden of ['رمز دخول','رقم الجوال','الكاميرا','الوجه ظاهر','إنشاء حساب جديد','لدي حساب'])if(body.includes(forbidden))fail('legacy authentication requirement visible: '+forbidden);
  const submit=page.getByRole('button',{name:'اعتماد وإرسال الطلب'});
  if(await submit.isEnabled())fail('submit enabled before company name');
  await company.fill(COMPANY);
  if(!(await submit.isEnabled()))fail('submit did not enable after company name');
  await submit.click();
  await page.getByText('تم حفظ الطلب بنجاح',{exact:true}).waitFor({state:'visible',timeout:45000});

  const state=await page.evaluate(async({COMPANY,NAME})=>{
    const quick=JSON.parse(localStorage.getItem('batco_quick_customer_profile_v1')||'null');
    const u=firebase.auth().currentUser;
    const profile=u?await firebase.firestore().collection('customers').doc(u.uid).get():null;
    const orders=u?await firebase.firestore().collection('customer_orders').where('customerUid','==',u.uid).get():null;
    const rows=orders?orders.docs.map(d=>({id:d.id,...d.data()})):[];
    return {quick,uid:u?.uid||'',profile:profile?.exists?profile.data():null,orders:rows,cart:localStorage.getItem('customer_guest_cart_v1'),name:NAME,company:COMPANY};
  },{COMPANY,NAME});
  if(!state.uid)fail('secure invisible Firebase session was not created');
  if(!state.quick||state.quick.uid!==state.uid||state.quick.company!==COMPANY||state.quick.name!==NAME)fail('saved customer data mismatch');
  if(!state.profile||state.profile.company!==COMPANY||state.profile.name!==NAME||state.profile.passwordless!==true||state.profile.phone!=='')fail('simplified customer record invalid');
  if(state.orders.length!==1)fail('order was not saved exactly once');
  const order=state.orders[0];knownOrderId=order.id;
  if(order.customer?.company!==COMPANY||order.customer?.name!==NAME||order.customer?.phone!==''||order.checkoutVersion!==7||String(order.notes||'')!=='')fail('order payload does not match simplified checkout');
  const orderedIds=(order.items||[]).map(x=>cleanId(x.cleanId||x.id));
  if(!orderedIds.includes(SKU))fail('order did not preserve the live test SKU');
  if(state.cart&&state.cart!=='{}')fail('cart was not cleared after successful order');
  if(pageErrors.length)fail('runtime page errors: '+pageErrors.join(' | '));
  console.log('V42_COMPANY_ONLY_CHECKOUT_PASS',state.uid,SKU,LIVE_PRODUCT.name);

  cleanupResult=await cleanup(page,knownOrderId);
  if(!cleanupResult.ok)fail('QA cleanup failed: '+cleanupResult.errors.join(' | '));
  console.log('V42_LIVE_FIRESTORE_CLEANUP_PASS');
  console.log('V42_ALL_PASSWORDLESS_TESTS_PASS');
} finally {
  if(page&&!cleanupResult?.ok){try{const r=await cleanup(page,knownOrderId);console.log('V42_FINALLY_CLEANUP',JSON.stringify(r))}catch(e){console.error('V42_FINALLY_CLEANUP_FAILED',e)}}
  if(context)await context.close();await browser.close();
}
