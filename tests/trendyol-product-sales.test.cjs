'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','api','trendyol.js'),'utf8');
const start=source.indexOf('function productSales('),end=source.indexOf('async function comprehensiveSales(',start);
assert.ok(start>0&&end>start,'productSales source is available');
const map=[{sku:'230006',barcode:'B-A'},{sku:'230006',barcode:'B-B'},{sku:'230007',barcode:'C'}];
const normal=v=>String(v??'').trim().toUpperCase();
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const summarizeRaw=new Function('stockMap','normal','number',source.slice(start,end)+'\nreturn productSales;')(map,normal,number);
const catalog={rows:new Map([['230006',{name:'صنف'}],['230007',{name:'صنف آخر'}]])};
const summarize=(orders,finance,warehouse)=>summarizeRaw(orders,finance,warehouse||catalog);
const makeLine=(id,qty,gross,barcode='B-A')=>({id,barcode,sku:'230006',name:'منتج تجريبي',quantity:qty,gross,discount:0});
const makeOrder=(id,status,lines)=>({id,number:id,date:Date.now(),status,lines});
const base=()=>({days:7,limited:false,orders:[makeOrder('A','DELIVERED',[makeLine('A1',5,100)]),makeOrder('B','DELIVERED',[makeLine('B1',3,60)])]});
const finance=()=>({sale:[{id:'S-A',orderNumber:'A',barcode:'B-A',shipmentPackageId:'A',credit:100,paymentOrderId:99}],payment:[{id:'P99',paymentOrderId:99,debt:90}],returns:[],limited:false});
test('matches paid order units by financial transaction and payout order, not order status',()=>{
  const result=summarize(base(),finance(),null);
  assert.deepEqual({sold:result.totals.sold,paid:result.totals.paid,unconfirmed:result.totals.unconfirmed},{sold:8,paid:5,unconfirmed:3});
});
test('withholds paid claims when finance API is unavailable',()=>{
  const result=summarize(base(),null,null);
  assert.equal(result.totals.sold,8);
  assert.equal(result.totals.paid,null);
  assert.equal(result.totals.unconfirmed,null);
});
test('payout order missing means payment is not confirmed',()=>{
  const fin=finance();fin.payment=[];
  const result=summarize(base(),fin,null);
  assert.equal(result.totals.paid,0);
  assert.equal(result.totals.unconfirmed,8);
});
test('mismatched amount is held for review even if payout order exists',()=>{
  const fin=finance();fin.sale[0].credit=90;
  const result=summarize(base(),fin,null);
  assert.equal(result.totals.paid,0);
  assert.equal(result.totals.ambiguous,5);
});
test('returned and cancelled orders do not count as sold units',()=>{
  const data=base();data.orders.push(makeOrder('C','CANCELLED',[makeLine('C1',12,240)]));data.orders.push(makeOrder('D','RETURNED',[makeLine('D1',3,60)]));
  const result=summarize(data,finance(),null);
  assert.equal(result.totals.sold,8);
  assert.equal(result.totals.excluded,15);
});
test('repeated barcode across packages is not falsely marked paid',()=>{
  const data=base();data.orders=[makeOrder('P1','DELIVERED',[makeLine('1',5,100)]),makeOrder('P2','DELIVERED',[makeLine('2',5,100)])];
  data.orders[0].number='SAME';data.orders[1].number='SAME';
  const fin={sale:[{orderNumber:'SAME',barcode:'B-A',credit:100,paymentOrderId:99}],payment:[{paymentOrderId:99}],returns:[]};
  const result=summarize(data,fin,null);
  assert.equal(result.totals.paid,0);
  assert.equal(result.totals.ambiguous,10);
});
test('includes mapped catalog products with zero sales and combines barcode aliases',()=>{
  const data=base();data.orders[0].lines.push(makeLine('A2',2,50,'B-B'));
  const result=summarize(data,finance(),null);
  const row=result.rows.find(x=>x.sku==='230006');
  assert.equal(row.quantity,10);
  assert.ok(row.barcodes.includes('B-A')&&row.barcodes.includes('B-B'));
  assert.ok(result.rows.some(x=>x.sku==='230007'&&x.quantity===0));
});

test('excludes repeated source identifiers across packages pending verification',()=>{
  const first=makeOrder('P1','DELIVERED',[{...makeLine('LINE-9',4,80),sourceId:'LINE-9'}]);
  const second=makeOrder('P2','DELIVERED',[{...makeLine('LINE-9',4,80),sourceId:'LINE-9'}]);
  first.number='ORDER-9';second.number='ORDER-9';
  const result=summarize({days:7,limited:false,orders:[first,second]},null,null);
  assert.equal(result.totals.sold,0);
  assert.equal(result.totals.possibleDuplicateUnits,8);
  assert.equal(result.rows.find(x=>x.sku==='230006').details.length,2);
});
test('unfulfilled and unknown statuses are never counted as delivered or paid',()=>{
 const data=base();data.orders.push(makeOrder('C','CREATED',[makeLine('C1',4,80)]),makeOrder('E','SHIPPED',[makeLine('E1',3,60)]),makeOrder('F','FUTURE_STATUS',[makeLine('F1',2,40)]));
 const result=summarize(data,finance(),null);
 assert.equal(result.totals.sold,8);assert.equal(result.totals.paid,5);assert.equal(result.totals.excluded,9);
});
test('nearby amounts are not treated as an exact payout match',()=>{
 const fin=finance();fin.sale[0].credit=99.5;
 const result=summarize(base(),fin,null);
 assert.equal(result.totals.paid,0);assert.equal(result.totals.ambiguous,5);
});
test('unmapped barcode cannot silently inherit a supplied internal SKU',()=>{
 const data=base();data.orders=[makeOrder('A','DELIVERED',[makeLine('A1',1,20,'UNKNOWN')])];
 const result=summarize(data,finance(),null);
 assert.equal(result.rows.find(x=>x.sku==='230006').quantity,0);
 assert.equal(result.rows.find(x=>x.sku==='غير مرتبط: UNKNOWN').quantity,1);
});
test('financial report does not expose inventory quantities',()=>{
 const warehouse={rows:new Map([['230006',{sku:'230006',name:'test',unit:'حبة',quantity:999,pack:12}]])};
 const result=summarize(base(),finance(),warehouse);
 assert.equal(Object.hasOwn(result.rows[0],'stock'),false);
 assert.equal(JSON.stringify(result).includes('999'),false);
});
test('conflicting prefixed and unprefixed internal IDs require review',()=>{
 const warehouse={rows:new Map([['230006',{name:'A'}],['OGS_230006',{name:'B'}]])};
 const result=summarize(base(),finance(),warehouse);
 const unresolved=result.rows.find(x=>x.sku==='غير مرتبط: B-A');
 assert.ok(unresolved);assert.equal(unresolved.quantity,8);
 assert.ok(!result.rows.some(x=>x.sku==='230006'&&x.quantity>0));
});
test('separates requested, cancelled and returned packages while flagging a financial return',()=>{
 const data=base();data.orders.push(makeOrder('C','CANCELLED',[makeLine('C1',2,40)]),makeOrder('D','RETURNED',[makeLine('D1',1,20)]));
 const fin=finance();fin.returns.push({orderNumber:'A',barcode:'B-A'});
 const row=summarize(data,fin,null).rows.find(x=>x.sku==='230006');
 assert.equal(row.requested,11);assert.equal(row.cancelled,2);assert.equal(row.returned,1);
 assert.equal(row.quantity,8);assert.equal(row.returnReview,true);assert.equal(row.paid,0);assert.equal(row.ambiguous,5);
});
test('missing order number cannot establish a payment match',()=>{
 const data=base();data.orders=[makeOrder('A','DELIVERED',[makeLine('A1',5,100)])];data.orders[0].number='';
 const fin={sale:[{orderNumber:'',barcode:'B-A',credit:100,paymentOrderId:99}],payment:[{paymentOrderId:99}],returns:[]};
 const result=summarize(data,fin,null);assert.equal(result.totals.paid,0);assert.equal(result.totals.ambiguous,5);
});

test('a single financial record cannot be allocated twice to repeated lines in one package',()=>{
 const data=base(); data.orders=[makeOrder('A','DELIVERED',[makeLine('L1',5,100),makeLine('L2',5,100)])];
 const result=summarize(data,finance(),null);
 assert.equal(result.totals.paid,0);assert.equal(result.totals.ambiguous,10);
});

test('catalog failure leaves barcode unlinked instead of guessing an internal product',()=>{
 const result=summarizeRaw(base(),finance(),null);
 assert.ok(result.rows.some(x=>x.sku==='غير مرتبط: B-A'&&x.quantity===8));
 assert.ok(!result.rows.some(x=>x.sku==='230006'));
});
