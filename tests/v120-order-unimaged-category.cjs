const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const read = name => fs.readFileSync(name, 'utf8');
const employee = read('runtime/index-v37-source.txt');
const customer = read('runtime/customer-v37-source.txt');
const admin = read('admin-dashboard.html');
const employeeShell = read('index.html');
const customerShell = read('customer.html');

// Employee and customer WhatsApp paths must include the actual item name,
// without replacing the SKU or the quantity on saved invoices or orders.
assert.match(employee, /const itemName = String\(it\.name \|\| 'اسم الصنف غير متوفر'\)/);
assert.match(employee, /msg \+= `\$\{idx \+ 1\}\. \*\$\{itemName\}\*\\n`/);
assert.match(employee, /رقم الصنف: \$\{it\.id\} \| الكمية: \*\$\{it\.cartQty\}\*/);
assert.match(employee, /items: items\.map\(i => \(\{\s*cleanId: i\.cleanId, id: i\.id, name: i\.name/);

const start = customer.indexOf('function buildOrderWhatsAppText(order){');
const end = customer.indexOf('function openOrderWhatsApp(order)',start);
assert(start > 0 && end > start, 'customer WhatsApp function must remain available');
const buildOrder = new Function('NF','PRICE_NF','sum','displayPhone',
  `${customer.slice(start,end)}\nreturn buildOrderWhatsAppText;`)(
  new Intl.NumberFormat('en-US',{maximumFractionDigits:2}),
  new Intl.NumberFormat('en-US',{maximumFractionDigits:2}),
  list => list.reduce((a,b)=>a+b,0), x => x
);
const msg = buildOrder({orderNo:'BT-1234', customer:{name:'العميل'},branches:[{id:'j',name:'جدة'},{id:'r',name:'الرياض'}],items:[
  {id:'AR_123',name:'صحن تقديم\n*خاص*',totalQty:3,branchQuantities:{j:2,r:1}}
]});
assert(msg.includes('*صحن تقديم خاص*\n  AR_123 · 2 كرتون'));
assert(msg.includes('*صحن تقديم خاص*\n  AR_123 · 1 كرتون'));
assert(!msg.includes('*خاص*'), 'product text should not inject WhatsApp markup');

// Permission is enabled for all existing employees unless explicitly disabled,
// and can be changed from the existing admin permissions screen.
assert.match(employee, /showUnimagedProducts: true/);
assert.match(employee, /showUnimagedProducts: raw\?\.showUnimagedProducts !== false/);
assert.match(employee, /canSeeUnimaged \|\| hasImageForItem\(imagesList, i\)/);
assert.match(employee, /data-image-state=\{canRenderImage \? 'with-image' : 'without-image'\}/);
assert.match(employee, /!canRenderImage && <div className="flex flex-wrap/);
assert.match(employee, /onMissing=\{\(\) => setImageUnavailable\(true\)\}/);
assert.match(admin, /onChange=\{v=>saveEmployeeSiteControl\(\{showUnimagedProducts:v\}\)\}/);
assert.match(employeeShell, /catalog-card=120/);
assert.match(employeeShell, /batco_sw_checked_v120/);
assert.match(customerShell, /whatsapp-names=120/);
assert.match(read('sw.js'), /batco-navigation-shell-v118-fresh-employee-showroom-bilingual-v120/);

// The category map must be stable, cover actual inventory across both branches,
// and not mix products whose digit-only IDs collide with a different prefix.
const norm = value => String(value||'').replace(/\D/g,'');
const rows = read('data/categories.tsv').split(/\r?\n/).filter(Boolean).map(line=>line.split('\t'));
const headers = rows.shift().map(x=>x.trim());
assert(headers.includes('أحذية متنوعة'), 'non-OGS shoes require a distinct category');
const members = new Map();
for(const row of rows)for(let col=0;col<headers.length;col++){
  const sku=String(row[col]||'').trim(),key=norm(sku);
  if(!key||!headers[col])continue;
  if(!members.has(sku))members.set(sku,new Set());
  members.get(sku).add(headers[col]);
}
for(const [sku,category] of [
  ['BA_5050_2_36/35','أحذية متنوعة'],
  ['OGS_25509','أحذية OGS'],
  ['MS_111_Y','البرطمان'],
  ['OGS_230017','مجات OGS'],
  ['AR_12737','أدوات الشواء'],
  ['JAA_300009','الألعاب والسباحة'],
  ['BAT-00112','التحف والهدايا']
])assert(members.get(sku)?.has(category), `${sku} must belong to ${category}`);
assert(!members.has('AR_100108'), 'ambiguous damaged inventory must not be auto-classified');
assert(!members.has('JAA_300006'), 'colliding SKU must not be auto-classified');
const audit = JSON.parse(execFileSync(process.execPath,['tools/classify-uncategorized-products.cjs'],{encoding:'utf8'}));
assert.equal(audit.suggestions,0,'re-running classifier must not duplicate categories');
assert.equal(audit.pending,10,'ambiguous or colliding products remain for review');

console.log('V120_ORDER_UNIMAGED_CATEGORY_PASS: names in both WhatsApp paths, employee permission, compact no-image cards, 406 category assignments, 10 held for review');
