import { chromium } from 'playwright';
import { transformSync } from 'esbuild';

const base = process.env.V40_BASE_URL || 'http://127.0.0.1:4173';
const EMP = { inventory_user_name_v2:'اختبار موظف', inventory_employee_id_v2:'audit_employee', inventory_employee_auth_version_v2:'2' };
const TK = 'batco_employee_customer_cart_transfer_v1';
const TB = 'batco_employee_customer_cart_transfer_backup_v1';
const CART = 'b2b_cart_اختبار موظف';
const SKU = '120005';
const fail = message => { throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function seedContext(browser, values = {}) {
  const context = await browser.newContext();
  await context.addInitScript(({ values }) => {
    try {
      if (sessionStorage.getItem('__v40_seeded') === '1') return;
      localStorage.clear();
      sessionStorage.clear();
      for (const [key, value] of Object.entries(values)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
      sessionStorage.setItem('__v40_seeded', '1');
    } catch {}
  }, { values });
  return context;
}

function compileInlineScripts(html, label) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = re.exec(html))) {
    const attrs = match[1] || '';
    const code = match[2] || '';
    if (!code.trim()) continue;
    const loader = /text\/babel/i.test(attrs) ? 'jsx' : 'js';
    try {
      transformSync(code, { loader, target:'es2020' });
      count += 1;
    } catch (error) {
      fail(`${label} generated script compile failed: ${error.message}`);
    }
  }
  if (count < 2) fail(`${label} generated runtime missing scripts`);
  return count;
}

async function generatedRuntime(browser, path, store, label, needle) {
  const context = await seedContext(browser, store);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  await page.goto(base + path, { waitUntil:'domcontentloaded', timeout:45000 });
  await sleep(3500);
  const html = await page.content();
  if (!html.includes(needle)) fail(`${label} transformed marker missing`);
  const count = compileInlineScripts(html, label);
  console.log(label, 'generated scripts compiled', count, 'pageerrors', pageErrors.slice(0, 3));
  await context.close();
}

const browser = await chromium.launch({ headless:true });
try {
  // This first runtime test proves the stock guard is actually injected into the generated employee runtime and compiles.
  await generatedRuntime(browser, '/index.html?employee=1', EMP, 'employee', 'const stockConflicts = items.filter');
  await generatedRuntime(browser, '/customer.html?employeeView=1', EMP, 'customer', 'function handoffEmployeeCustomerCart');

  // Full customer-view -> employee-cart handoff.
  {
    const seed = {
      ...EMP,
      customer_guest_branches_v1:[{ id:'b1', name:'الفرع الرئيسي' }],
      customer_guest_cart_v1:{
        [SKU]:{ cleanId:SKU, id:SKU, name:'حصالات كبير L', imageFile:'', cartonPrice:0, pack:'36', branchQuantities:{ b1:1 } }
      }
    };
    const context = await seedContext(browser, seed);
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.accept());
    await page.goto(base + '/customer.html?employeeView=1', { waitUntil:'domcontentloaded', timeout:45000 });
    await page.getByRole('button', { name:'السلة' }).last().click({ timeout:20000 });
    const transferButton = page.getByRole('button', { name:'نقل ومتابعة الاعتماد' });
    await transferButton.waitFor({ state:'visible', timeout:15000 });
    await transferButton.click();
    await page.waitForURL(/index\.html\?employee=1/, { timeout:30000 });
    await page.waitForFunction(({ key, sku }) => {
      try {
        const cart = JSON.parse(localStorage.getItem(key) || '{}');
        return Number(cart?.[sku]?.cartQty) === 1;
      } catch { return false; }
    }, { key:CART, sku:SKU }, { timeout:20000 });
    const state = await page.evaluate(({ cartKey, sku, TK, TB }) => {
      const cart = JSON.parse(localStorage.getItem(cartKey) || '{}');
      return {
        item:cart[sku] || null,
        transfer:localStorage.getItem(TK),
        backup:localStorage.getItem(TB),
        guest:localStorage.getItem('customer_guest_cart_v1'),
        url:location.href,
        notes:[...document.querySelectorAll('textarea')].map(node => node.value).join('\n')
      };
    }, { cartKey:CART, sku:SKU, TK, TB });
    if (!state.item || Number(state.item.cartQty) !== 1) fail('handoff quantity mismatch');
    if (!['jeddah','riyadh'].includes(state.item.warehouseKey)) fail('handoff warehouse missing');
    if (state.transfer || state.backup || state.guest) fail('successful handoff did not clean source payload');
    if (/customerCartTransfer|appv=40/.test(state.url)) fail('transfer query parameters not cleared');
    await page.reload({ waitUntil:'domcontentloaded', timeout:45000 });
    await sleep(1800);
    const qty = await page.evaluate(({ cartKey, sku }) => Number((JSON.parse(localStorage.getItem(cartKey) || '{}')[sku] || {}).cartQty || 0), { cartKey:CART, sku:SKU });
    if (qty !== 1) fail('idempotency failed: reload duplicated quantity');
    console.log('E2E_HANDOFF_PASS', state.item.warehouseKey);
    await context.close();
  }

  // Existing employee cart must merge only after confirmation and refresh stock metadata from the current warehouse file.
  {
    const payload = { version:3, transferId:'merge_case', employeeName:'اختبار موظف', employeeId:'audit_employee', items:[{ cleanId:SKU, id:SKU, name:'حصالات كبير L', totalQty:.5, branchQuantities:{ b1:.5 } }], branches:[{ id:'b1', name:'الرئيسي' }] };
    const existing = { [SKU]:{ cleanId:SKU, id:SKU, name:'حصالات كبير L', warehouseKey:'jeddah', qty:0, cartQty:1 } };
    const context = await seedContext(browser, { ...EMP, [TK]:payload, [TB]:payload, [CART]:existing });
    const page = await context.newPage();
    let dialogs = 0;
    page.on('dialog', async dialog => { dialogs += 1; await dialog.accept(); });
    await page.goto(base + '/index.html?employee=1&customerCartTransfer=1&appv=40', { waitUntil:'domcontentloaded', timeout:45000 });
    await page.waitForFunction(({ key, sku }) => Number((JSON.parse(localStorage.getItem(key) || '{}')?.[sku] || {}).cartQty) === 1.5, { key:CART, sku:SKU }, { timeout:15000 });
    if (dialogs < 1) fail('existing-cart merge confirmation did not appear');
    const merged = await page.evaluate(({ cartKey, sku }) => JSON.parse(localStorage.getItem(cartKey) || '{}')[sku] || null, { cartKey:CART, sku:SKU });
    if (!merged || Number(merged.qty) <= 0) fail('merged cart retained stale stock metadata instead of current warehouse data');
    console.log('MERGE_CONFIRM_AND_REFRESH_PASS', merged.qty);
    await context.close();
  }

  // Cancelled merge preserves both existing employee cart and pending transfer.
  {
    const payload = { version:3, transferId:'cancel_case', employeeName:'اختبار موظف', employeeId:'audit_employee', items:[{ cleanId:SKU, id:SKU, totalQty:2, branchQuantities:{ b1:2 } }], branches:[{ id:'b1', name:'الرئيسي' }] };
    const existing = { [SKU]:{ cleanId:SKU, id:SKU, warehouseKey:'jeddah', qty:7.5, cartQty:1 } };
    const context = await seedContext(browser, { ...EMP, [TK]:payload, [TB]:payload, [CART]:existing });
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.dismiss());
    await page.goto(base + '/index.html?employee=1&customerCartTransfer=1', { waitUntil:'domcontentloaded', timeout:45000 });
    await sleep(1800);
    const state = await page.evaluate(({ cartKey, sku, TK }) => ({ qty:Number((JSON.parse(localStorage.getItem(cartKey) || '{}')[sku] || {}).cartQty || 0), transfer:!!localStorage.getItem(TK) }), { cartKey:CART, sku:SKU, TK });
    if (state.qty !== 1 || !state.transfer) fail('cancelled merge changed data or deleted pending transfer');
    console.log('MERGE_CANCEL_SAFE_PASS');
    await context.close();
  }

  // Payload belonging to a different employee must never leak into this cart.
  {
    const payload = { version:3, transferId:'wrong_employee', employeeName:'موظف آخر', employeeId:'other_id', items:[{ cleanId:SKU, id:SKU, totalQty:1, branchQuantities:{ b1:1 } }], branches:[] };
    const context = await seedContext(browser, { ...EMP, [TK]:payload, [TB]:payload });
    const page = await context.newPage();
    await page.goto(base + '/index.html?employee=1&customerCartTransfer=1', { waitUntil:'domcontentloaded', timeout:45000 });
    await sleep(1200);
    const state = await page.evaluate(({ cartKey, TK }) => ({ cart:localStorage.getItem(cartKey), transfer:localStorage.getItem(TK) }), { cartKey:CART, TK });
    if (state.cart) fail('wrong employee transfer leaked into current cart');
    if (!state.transfer) fail('wrong employee transfer was destroyed');
    console.log('EMPLOYEE_ISOLATION_PASS');
    await context.close();
  }

  // Malformed transfer data cannot take the employee application down.
  {
    const context = await seedContext(browser, { ...EMP, [TK]:'{broken-json' });
    const page = await context.newPage();
    await page.goto(base + '/index.html?employee=1&customerCartTransfer=1', { waitUntil:'domcontentloaded', timeout:45000 });
    await sleep(2500);
    const text = await page.locator('body').innerText();
    if (!text.trim() || text.includes('V40_')) fail('malformed payload broke bootstrap');
    console.log('MALFORMED_PAYLOAD_SAFE_PASS');
    await context.close();
  }

  // Create a real stock conflict. The generated-runtime test above independently verifies the hard submit guard is injected and compiles.
  {
    const payload = { version:3, transferId:'overstock_case', employeeName:'اختبار موظف', employeeId:'audit_employee', items:[{ cleanId:SKU, id:SKU, totalQty:999999, branchQuantities:{ b1:999999 } }], branches:[{ id:'b1', name:'الرئيسي' }] };
    const context = await seedContext(browser, { ...EMP, [TK]:payload, [TB]:payload });
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.accept());
    await page.goto(base + '/index.html?employee=1&customerCartTransfer=1', { waitUntil:'domcontentloaded', timeout:45000 });
    await page.waitForFunction(({ key, sku }) => Number((JSON.parse(localStorage.getItem(key) || '{}')?.[sku] || {}).cartQty) === 999999, { key:CART, sku:SKU }, { timeout:15000 });
    const item = await page.evaluate(({ cartKey, sku }) => JSON.parse(localStorage.getItem(cartKey) || '{}')[sku] || null, { cartKey:CART, sku:SKU });
    if (!item || !(Number(item.cartQty) > Number(item.qty))) fail('overstock test did not create a guarded conflict');
    console.log('OVERSTOCK_CONFLICT_WITH_COMPILED_GUARD_PASS', item.cartQty, item.qty);
    await context.close();
  }

  console.log('V40_ALL_TRANSFER_TESTS_PASS');
} finally {
  await browser.close();
}
