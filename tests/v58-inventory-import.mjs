import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const api=fs.readFileSync('api/inventory-import.js','utf8');
const ctx={require,module:{exports:{}},process:{env:{}},Buffer,fetch:()=>{throw Error('Unexpected network call')}};
vm.runInNewContext(api+'\nthis._prepare=prepare;',ctx);
const prepare=ctx._prepare;
const jed=fs.readFileSync('data/jeddah.tsv','utf8');
const riy=fs.readFileSync('data/riyadh.tsv','utf8');
const pricing=fs.readFileSync('data/pricing.tsv','utf8');
// Stable synthetic fixtures. Never depend on real on-hand quantities or prices.
const stockFixture=[
 'رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\t\t\t',
 'ARM_10004\tبرطمان 150 مل دائري - غطاء اصفر\tكرتون\t19\t60\t\t\t',
 'ARM_10015\tبرطمان 4000 مل دائري  - غطاء اصفر\tكرتون\t50\t32\t\t\t',
 '\t\t\t\t\t\t\t',
 'BA_1033\tحاجز باب 90\tكرتون\t46.5\t60\t\t\t',
 'AR_23653\t ملعقة تقليب سمك\tكرتون\t5.5\t72\t\t\t'
].join('\n')+'\n';
const priceFixture=[
 'مخزون جدة\t\t\t\t\tمخزون الرياض\t',
 'رقم الصنف\tسعر البيع\t\t\t\tرقم الصنف\tسعر البيع',
 'ARM_10004\t240\t\t\t\tARM_10004\t240'
].join('\n')+'\n';
let checked=0;
function check(name,fn){fn();checked++;console.log('PASS '+name)}
check('Jeddah current live stock unchanged',()=>{
 const x=prepare('jeddah',jed,jed);
 assert.equal(x.content,jed);
 assert.ok(x.summary.rows>800);
 assert.equal(x.summary.changed,0);
});
check('Riyadh current live stock unchanged',()=>{
 const x=prepare('riyadh',riy,riy);
 assert.equal(x.content,riy);
 assert.ok(x.summary.rows>100);
 assert.equal(x.summary.changed,0);
});
check('Current live two-branch pricing unchanged',()=>{
 const x=prepare('pricing',pricing,pricing);
 assert.equal(x.content,pricing);
 assert.ok(x.summary.rows>800);
 assert.equal(x.summary.changed,0);
});
check('Five-column TSV, blank separator rows and fractional stock',()=>{
 const data=stockFixture.replace('\t50\t32','\t46.875\t32').replace('\t46.5\t60','\t45.5\t60');
 const x=prepare('jeddah',data,stockFixture);
 assert.equal(x.summary.changed,2);
 assert.equal(x.summary.blankRowsSkipped,1);
 assert.ok(x.content.includes('ARM_10015\tبرطمان 4000 مل دائري  - غطاء اصفر\tكرتون\t46.875\t32\t\t\t'));
 assert.ok(x.content.includes('BA_1033\tحاجز باب 90\tكرتون\t45.5\t60\t\t\t'));
 assert.equal(x.content.split('\n').filter(v=>!v.trim()).length,stockFixture.split('\n').filter(v=>!v.trim()).length);
});
check('Quantity-only paste preserves name, unit and pack',()=>{
 const x=prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10015\t46.875\n',stockFixture);
 assert.equal(x.summary.changed,1);
 assert.ok(x.content.includes('ARM_10015\tبرطمان 4000 مل دائري  - غطاء اصفر\tكرتون\t46.875\t32'));
});
check('Add new full product and keep all existing rows',()=>{
 const input='رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\t\t\t\nTEST_9981\tصنف اختبار\tكرتون\t0.5\t24\t\t\t\n';
 const x=prepare('jeddah',input,stockFixture);
 assert.equal(x.summary.added,1);
 assert.ok(x.content.includes('TEST_9981\tصنف اختبار\tكرتون\t0.5\t24\t\t\t'));
 assert.ok(x.content.includes('ARM_10004\t'));
});
check('Reject incomplete new item',()=>{
 assert.throws(()=>prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nTEST_9981\t1',stockFixture),/الاسم والوحدة والشد/);
});
check('Ignore true blank rows in pricing paste',()=>{
 const x=prepare('pricing','رقم الصنف\tسعر البيع\n\n\t\t\t\nARM_10004\t245\n',priceFixture);
 assert.equal(x.summary.changed,1);
 assert.equal(x.summary.blankRowsSkipped,2);
});
check('One price update changes both branch entries',()=>{
 const x=prepare('pricing','رقم الصنف\tسعر البيع\nARM_10004\t245',priceFixture);
 assert.equal(x.summary.changed,1);
 assert.equal(x.summary.added,0);
 assert.equal(x.summary.examples.length,2);
});
check('Reject conflicting duplicate SKU',()=>{
 assert.throws(()=>prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t3\nARM_10004\t4',stockFixture),/مكرر/);
});
check('Allow same-price duplicate in input',()=>{
 const x=prepare('pricing','رقم الصنف\tسعر البيع\nARM_10004\t240\nARM_10004\t240',priceFixture);
 assert.equal(x.summary.rows,1);
 assert.equal(x.summary.changed,0);
});
check('Reject invalid and negative quantities',()=>{
 for(const n of ['-1','','abc','Infinity','NaN'])assert.throws(()=>prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t'+n,stockFixture));
});
check('Decimal and zero quantities are accepted',()=>{
 assert.equal(prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t0.00003',stockFixture).summary.changed,1);
 assert.equal(prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t0',stockFixture).summary.changed,1);
});
check('BOM and CRLF header paste',()=>{
 assert.equal(prepare('jeddah','\uFEFFرقم الصنف\tالكمية المتوفرة\r\n\r\nARM_10004\t20\r\n',stockFixture).summary.changed,1);
});
check('Keep trailing columns and original leading spaces intact',()=>{
 const x=prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t20',stockFixture);
 assert.ok(x.content.includes('ARM_10004\tبرطمان 150 مل دائري - غطاء اصفر\tكرتون\t20\t60\t\t\t'));
 assert.ok(x.content.includes('AR_23653\t ملعقة تقليب سمك'));
});
console.log('IMPORT_V58_PASS '+checked+' scenarios');
