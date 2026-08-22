import { chromium } from 'playwright';

const base=process.env.V43_BASE_URL||'http://127.0.0.1:4173';
const fail=m=>{throw new Error(m)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const browser=await chromium.launch({headless:true});

try {
  // 1) First-visit sequencing: name prompt must win; install nudge may appear only after name is saved.
  {
    const context=await browser.newContext({
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      viewport:{width:390,height:844}
    });
    await context.addInitScript(()=>{localStorage.clear();sessionStorage.clear()});
    const page=await context.newPage();
    const errs=[];page.on('pageerror',e=>errs.push(String(e)));
    await page.goto(base+'/customer.html',{waitUntil:'domcontentloaded',timeout:45000});
    await sleep(5600);
    const nameInput=page.getByPlaceholder('اكتب اسمك الكريم');
    await nameInput.waitFor({state:'visible',timeout:10000});
    if(await page.locator('.install-nudge').count())fail('install nudge overlapped the required name prompt');
    await nameInput.fill('عميل اختبار واجهة');
    await page.getByRole('button',{name:'حفظ ومتابعة'}).click();
    await nameInput.waitFor({state:'hidden',timeout:10000});
    await sleep(5000);
    if(!(await page.locator('.install-nudge').count()))fail('install nudge did not defer until after name capture on iOS');
    if(errs.length)fail('first-visit page errors: '+errs.join(' | '));
    await context.close();
  }

  // 2) Guest navigation and cart: balanced 3-column bar, full item identity, opt-in image gallery.
  {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    await context.addInitScript(()=>{
      localStorage.clear();sessionStorage.clear();
      localStorage.setItem('customer_guest_name_v1','عميل اختبار واجهة');
      localStorage.setItem('batco_customer_visitor_id_v1','cv_v43_ui_test');
      localStorage.setItem('customer_guest_branches_v1',JSON.stringify([{id:'b1',name:'الفرع الرئيسي'}]));
      localStorage.setItem('customer_guest_cart_v1',JSON.stringify({
        '24811':{cleanId:'24811',id:'24811',name:'صنف اختبار أول',imageFile:'24811.webp',cartonPrice:128,pack:'12',branchQuantities:{b1:1}},
        '24812':{cleanId:'24812',id:'24812',name:'صنف اختبار ثاني',imageFile:'24812.webp',cartonPrice:90,pack:'6',branchQuantities:{b1:.5}}
      }));
    });
    const page=await context.newPage();
    const errs=[];page.on('pageerror',e=>errs.push(String(e)));
    await page.goto(base+'/customer.html',{waitUntil:'domcontentloaded',timeout:45000});
    await sleep(3500);
    const navClass=await page.locator('nav.fixed.bottom-0 > div').getAttribute('class');
    if(!String(navClass||'').includes('grid-cols-3'))fail('guest bottom nav is not balanced as 3 columns: '+navClass);
    const navButtons=page.locator('nav.fixed.bottom-0 button');
    if(await navButtons.count()!==3)fail('guest bottom nav must expose exactly 3 balanced actions');
    await page.getByRole('button',{name:/السلة/}).last().click();
    await page.getByText('صنف اختبار أول',{exact:true}).waitFor({state:'visible',timeout:10000});
    await page.getByText('صنف اختبار ثاني',{exact:true}).waitFor({state:'visible',timeout:10000});
    const imageToggle=page.getByRole('button',{name:'عرض صور الأصناف'});
    await imageToggle.waitFor({state:'visible',timeout:10000});
    await imageToggle.click();
    const gallery=page.locator('[data-testid="cart-image-gallery"]');
    await gallery.waitFor({state:'visible',timeout:10000});
    if(await gallery.locator('img').count()<2)fail('cart image gallery did not render product images');
    if(!(await page.getByRole('button',{name:'إخفاء صور الأصناف'}).isVisible()))fail('cart image gallery toggle state did not update');
    if(errs.length)fail('cart/nav page errors: '+errs.join(' | '));
    await context.close();
  }

  console.log('V43_CUSTOMER_UX_PASS');
} finally {
  await browser.close();
}
