import { chromium } from 'playwright';

const base = process.env.V41_BASE_URL || 'http://127.0.0.1:4173';
const fail = message => { throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function freshContext(browser, values = {}) {
  const context = await browser.newContext();
  await context.addInitScript(({ values }) => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, String(value));
    } catch {}
  }, { values });
  return context;
}

const browser = await chromium.launch({ headless:true });
try {
  // Anonymous customer gets exactly five seconds of browsing before the required name prompt.
  {
    const context = await freshContext(browser);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(base + '/customer.html', { waitUntil:'domcontentloaded', timeout:45000 });
    await sleep(2500);
    const early = await page.locator('body').innerText();
    if (early.includes('سجل اسمك للمتابعة')) fail('guest prompt appeared before five-second grace period');
    await page.getByText('سجل اسمك للمتابعة', { exact:true }).waitFor({ state:'visible', timeout:5500 });
    if (errors.length) fail('page errors before guest prompt: ' + errors.join(' | '));

    const input = page.getByPlaceholder('اكتب اسمك الكريم');
    await input.fill('زائر اختبار');
    await page.getByRole('button', { name:'حفظ ومتابعة' }).click();
    await page.getByText('سجل اسمك للمتابعة', { exact:true }).waitFor({ state:'detached', timeout:5000 });
    const stored = await page.evaluate(() => localStorage.getItem('customer_guest_name_v1'));
    if (stored !== 'زائر اختبار') fail('guest name was not persisted');
    await sleep(5500);
    if (await page.getByText('سجل اسمك للمتابعة', { exact:true }).count()) fail('guest prompt repeated after name was stored');
    console.log('V41_GUEST_NAME_FLOW_PASS');
    await context.close();
  }

  // Returning named customer should never be prompted again.
  {
    const context = await freshContext(browser, { customer_guest_name_v1:'عميل محفوظ' });
    const page = await context.newPage();
    await page.goto(base + '/customer.html', { waitUntil:'domcontentloaded', timeout:45000 });
    await sleep(6200);
    if (await page.getByText('سجل اسمك للمتابعة', { exact:true }).count()) fail('returning named customer was prompted again');
    console.log('V41_RETURNING_GUEST_PASS');
    await context.close();
  }

  // Employee browsing the customer portal remains excluded from the guest-name prompt.
  {
    const context = await freshContext(browser, {
      inventory_user_name_v2:'اختبار موظف',
      inventory_employee_id_v2:'audit_employee',
      inventory_employee_auth_version_v2:'2'
    });
    const page = await context.newPage();
    await page.goto(base + '/customer.html?employeeView=1', { waitUntil:'domcontentloaded', timeout:45000 });
    await sleep(6200);
    if (await page.getByText('سجل اسمك للمتابعة', { exact:true }).count()) fail('employee customer view received guest prompt');
    const body = await page.locator('body').innerText();
    if (!body.includes('اختبار موظف')) fail('employee identity missing from customer view');
    console.log('V41_EMPLOYEE_EXCLUSION_PASS');
    await context.close();
  }

  console.log('V41_ALL_GUEST_NAME_TESTS_PASS');
} finally {
  await browser.close();
}
