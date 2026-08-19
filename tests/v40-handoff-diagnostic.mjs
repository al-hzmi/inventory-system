import { chromium } from 'playwright';
const base='http://127.0.0.1:4173';
const SKU='120005', CART='b2b_cart_اختبار موظف';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addInitScript(({sku})=>{
  localStorage.clear();sessionStorage.clear();
  localStorage.setItem('inventory_user_name_v2','اختبار موظف');
  localStorage.setItem('inventory_employee_id_v2','audit_employee');
  localStorage.setItem('inventory_employee_auth_version_v2','2');
  localStorage.setItem('customer_guest_branches_v1',JSON.stringify([{id:'b1',name:'الفرع الرئيسي'}]));
  localStorage.setItem('customer_guest_cart_v1',JSON.stringify({[sku]:{cleanId:sku,id:sku,name:'حصالات كبير L',imageFile:'',cartonPrice:0,pack:'36',branchQuantities:{b1:1}}}));
},{sku:SKU});
const page=await context.newPage();
const consoleRows=[];const dialogs=[];const pageErrors=[];
page.on('console',m=>consoleRows.push(`${m.type()}: ${m.text()}`));
page.on('pageerror',e=>pageErrors.push(String(e)));
page.on('dialog',async d=>{dialogs.push(d.message());await d.accept()});
await page.goto(base+'/customer.html?employeeView=1',{waitUntil:'domcontentloaded',timeout:45000});
await page.getByRole('button',{name:'السلة'}).last().click({timeout:20000});
await page.getByRole('button',{name:'نقل ومتابعة الاعتماد'}).click({timeout:15000});
await page.waitForURL(/index\.html\?employee=1/,{timeout:30000});
await page.waitForTimeout(5000);
const state=await page.evaluate(({sku,cartKey})=>{
  const keys=Object.keys(localStorage);
  const values={};
  for(const key of keys.filter(k=>/transfer|b2b_cart_|inventory_user_name|inventory_employee|customer_guest_cart/.test(k))){values[key]=localStorage.getItem(key)}
  let cart=null;try{cart=JSON.parse(localStorage.getItem(cartKey)||'null')}catch{}
  return {href:location.href,keys,values,cart,row:cart?.[sku]||null,body:document.body.innerText.slice(0,700)};
},{sku:SKU,cartKey:CART});
console.log('V40_DIAGNOSTIC_STATE',JSON.stringify(state));
console.log('V40_DIAGNOSTIC_DIALOGS',JSON.stringify(dialogs));
console.log('V40_DIAGNOSTIC_PAGE_ERRORS',JSON.stringify(pageErrors));
console.log('V40_DIAGNOSTIC_CONSOLE',JSON.stringify(consoleRows.slice(-30)));
await context.close();await browser.close();
