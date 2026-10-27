/* V112 — synthetic rows based on the supplied PDF stock-report layout. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {parseTextPages} = require('../pdf-inventory-import.js');
const item = (str,x,y) => ({str,transform:[1,0,0,1,x,y],width:String(str).length*6,height:11});
function page(rows,opts={}){
  const items=[item('شركة بيت الأواني الطيبة',700,700),item('بيانات المخزون',550,680),
    item('رقم الصنف',875,620),item('اسم الصنف',660,620),item('الشد',250,620),
    item('الوحدة',192,620),item('الكمية المتوفرة',110,620)];
  rows.forEach(([sku,qty,pack],i)=>{
    const y=590-i*22;
    items.push(item(sku,872,y),item('برطمان 150 مل دائري - غطاء أصفر',570,y),item(String(pack),260,y),
      item('كرتون',192,y));
    if(qty!==null)items.push(item(String(qty),125,y));
  });
  return {width:1050,items:opts.reverse?items.reverse():items};
}
const actual = [
  ['ARM_10004','8','60'],['ARM_10005','25','48'],['ARM_10007','30','63'],
  ['ARM_10008','26','36'],['ARM_10015','46.875','32'],['ARM_10017','25','18']
];
let parsed=parseTextPages([page(actual,{reverse:true})]);
assert.equal(parsed.rows,6);
assert.equal(parsed.pages,1);
assert.ok(parsed.text.startsWith('رقم الصنف\tالكمية المتوفرة\n'));
assert.ok(parsed.text.includes('ARM_10004\t8\n'));
assert.ok(parsed.text.includes('ARM_10015\t46.875\n'));
assert.ok(!parsed.text.includes('برطمان'));
assert.ok(!parsed.text.includes('\t60\n'),'pack value must never become inventory quantity');
parsed=parseTextPages([page(actual.slice(0,3)),page(actual.slice(3))]);
assert.equal(parsed.rows,6,'all pages must be read');
parsed=parseTextPages([page([['ARM_10004','٨','٦٠'],['ARM_10005','٢٥','٤٨'],['ARM_10015','٤٦٫٨٧٥','٣٢']])]);
assert.ok(parsed.text.includes('ARM_10015\t46.875'),'Arabic decimals must be normalized');
assert.throws(()=>parseTextPages([page([['ARM_10004',null,'60'],...actual.slice(1)])]),/غير واضحة/,'missing stock must not import pack size');
assert.throws(()=>parseTextPages([page([actual[0],actual[0],...actual.slice(1)])]),/مكرر/,'duplicate products must not pass silently');
assert.throws(()=>parseTextPages([{width:1050,items:[]}]),/لا تحتوي نصًا/,'scanned PDF must fail safely');
assert.throws(()=>parseTextPages([page([['ARM_10004','8','60']]),page([['ARM_10004','9','60']])]),/مكرر/);
const ui=fs.readFileSync('v59-admin-import-ui.js','utf8');
const html=fs.readFileSync('admin-inventory-import.html','utf8');
assert.match(ui,/ext==='pdf'&&kind.value==='pricing'/);
assert.match(ui,/BatcoPdfInventory\.readFile/);
assert.match(ui,/\.pdf,\.xlsx/);
assert.match(html,/pdf-inventory-import\.js\?v=114\.0/);
const suspiciousMiddle=page([]);
for(let i=0;i<30;i++)suspiciousMiddle.items.push(item('تفاصيل إضافية '+i,400,590-i*12));
assert.throws(()=>parseTextPages([page(actual.slice(0,3)),suspiciousMiddle,page(actual.slice(3))]),/تقرير ناقص/,'middle page with abundant unread text must not silently become missing inventory');
console.log('V112_PDF_IMPORT_PASS: exact stock report geometry, RTL layout, decimals, page merge, duplicate/missing/scanned safety, review-only import');