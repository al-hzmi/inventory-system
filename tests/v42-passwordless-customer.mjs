import { chromium } from 'playwright';

const base=process.env.V42_BASE_URL||'http://127.0.0.1:4173';
const NAME='عميل اختبار V42';
const COMPANY='__V42_QA__ شركة اختبار';
const VISITOR='cv_v42_qa_'+Date.now().toString(36);
const SKU='120005';
const fail=m=>{throw new Error(m)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function seed(browser){
  const context=await browser.newContext();
  await context.addInitScript(({NAME,VISITOR,SKU})=>{
    try{
      if(sessionStorage.getItem('__v42_seeded')==='1')return;
      localStorage.clear();sessionStorage.clear();
      localStorage.setItem('customer_guest_name_v1',NAME);
      localStorage.setItem('batco_customer_visitor_id_v1',VISITOR);
      localStorage.setItem('customer_guest_branches_v1',JSON.stringify([{id:'b1',name:'الفرع الرئيسي'}]));
      localStorage.setItem('customer_guest_cart_v1',JSON.stringify({[SKU]:{cleanId:SKU,id:SKU,name:'منتج اختبار',imageFile:'',cartonPrice:0,pack:'',branchQuantities:{b1:.5}}}));
      sessionStorage.setItem('__v42_seeded','1');
    }catch{}
  },{NAME,VISITOR,SKU});
  return context;
}

async function cleanup(page){
  return await page.evaluate(async()=>{
    const withTimeout=(promise,ms=8000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('TIMEOUT')),ms))]);
    const u=firebase.auth().currentUser;if(!u)return {ok:true,none:true};
    const uid=u.uid,errors=[];
    for(const col of ['customer_orders','customer_drafts','customer_sessions','customer_activity_logs','customer_login_logs','customer_devices','customer_security_photos']){
      try{const q=await withTimeout(firebase.firestore().collection(col).where('customerUid','==',uid).get());for(const d of q.docs)await withTimeout(d.ref.delete())}catch(e){errors.push(col+':'+(e?.code||e?.message||e))}
    }
    try{await withTimeout(firebase.firestore().collection('customers').doc(uid).delete())}catch(e){errors.push('customers:'+(e?.code||e?.message||e))}
    try{await withTimeout(u.delete())}catch(e){errors.push('auth:'+(e?.code||e?.message||e))}
    try{localStorage.removeItem('batco_quick_customer_profile_v1')}catch{}
    return {ok:errors.length===0,uid,errors};
  });
}

const browser=await chromium.launch({headless:true});
let context,page,cleanupResult=null;
try{
  context=await seed(browser);page=await context.newPage();
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  await page.goto(base+'/customer.html',{waitUntil:'domcontentloaded',timeout:45000});
  await sleep(3500);
  let body=await page.locator('body').innerText();
  for(const forbidden of ['أنشئ رمز دخول','تأكيد الحضور','رقم الجوال','لدي حساب'])if(body.includes(forbidden))fail('legacy auth UI visible before checkout: '+forbidden);
  if(body.includes('حسابي')||body.includes('طلباتي'))fail('guest navigation still exposes account/login concepts');

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
    return {quick,uid:u?.uid||'',email:u?.email||'',profile:profile?.exists?profile.data():null,orders:rows,cart:localStorage.getItem('customer_guest_cart_v1'),name:NAME,company:COMPANY};
  },{COMPANY,NAME});
  if(!state.uid)fail('Firebase session was not created invisibly');
  if(!state.quick||state.quick.uid!==state.uid||state.quick.company!==COMPANY||state.quick.name!==NAME)fail('device-bound quick profile mismatch');
  if(!state.profile||state.profile.company!==COMPANY||state.profile.name!==NAME||state.profile.passwordless!==true||state.profile.accountType!=='passwordless_device'||state.profile.phone!=='')fail('passwordless customer profile invalid');
  if(state.orders.length!==1)fail('order was not saved exactly once');
  const order=state.orders[0];
  if(order.customer?.company!==COMPANY||order.customer?.name!==NAME||order.customer?.phone!==''||order.checkoutVersion!==7||String(order.notes||'')!=='')fail('order payload does not match simplified checkout');
  if(state.cart&&state.cart!=='{}')fail('cart was not cleared after successful order');
  if(pageErrors.length)fail('runtime page errors: '+pageErrors.join(' | '));
  console.log('V42_FIRST_CHECKOUT_PASS',state.uid);

  await page.reload({waitUntil:'domcontentloaded',timeout:45000});
  await page.getByText('طلباتي',{exact:true}).waitFor({state:'visible',timeout:30000});
  body=await page.locator('body').innerText();
  if(body.includes('أنشئ رمز دخول')||body.includes('تأكيد الحضور')||body.includes('رقم الجوال')||body.includes('إنشاء حساب جديد')||body.includes('لدي حساب'))fail('legacy auth returned after passwordless account reload');
  if(body.includes('حسابي'))fail('passwordless customer should not see password/account-settings tab');
  const authUid=await page.evaluate(()=>firebase.auth().currentUser?.uid||'');
  if(authUid!==state.uid)fail('Firebase persisted session was not restored');
  console.log('V42_RETURNING_SESSION_PASS');

  cleanupResult=await cleanup(page);
  if(!cleanupResult.ok)fail('QA cleanup failed: '+cleanupResult.errors.join(' | '));
  console.log('V42_LIVE_FIRESTORE_CLEANUP_PASS');
  console.log('V42_ALL_PASSWORDLESS_TESTS_PASS');
} finally {
  if(page&&!cleanupResult?.ok){try{const r=await cleanup(page);console.log('V42_FINALLY_CLEANUP',JSON.stringify(r))}catch(e){console.error('V42_FINALLY_CLEANUP_FAILED',e)}}
  if(context)await context.close();await browser.close();
}
