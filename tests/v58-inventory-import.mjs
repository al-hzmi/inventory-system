import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const api=fs.readFileSync('api/inventory-import.js','utf8');
const ctx={require,module:{exports:{}},process:{env:{}},Buffer,fetch:()=>{throw Error('Unexpected HTTP')}};
vm.runInNewContext(api+'\nthis._prepare=prepare;',ctx);
const prepare=ctx._prepare;
const jed=fs.readFileSync('data/jeddah.tsv','utf8');
const riy=fs.readFileSync('data/riyadh.tsv','utf8');
const pricing=fs.readFileSync('data/pricing.tsv','utf8');
let checked=0;
function check(name,callback){callback();checked++;console.log('PASS '+name)}
check('Actual Jeddah TSV with empty separator rows and 8 columns',()=>{
 const result=prepare('jeddah',jed,jed);
 assert.equal(result.content,jed);
 assert.ok(result.summary.blankRowsSkipped>=15);
 assert.ok(result.summary.rows>800);
 assert.equal(result.summary.changed,0);
 assert.equal(result.summary.added,0);
});
check('Actual Riyadh TSV unchanged',()=>{
 const result=prepare('riyadh',riy,riy);
 assert.equal(result.content,riy);
 assert.ok(result.summary.rows>100);
 assert.equal(result.summary.changed,0);
});
check('Actual two-column warehouse pricing file unchanged',()=>{
 const result=prepare('pricing',pricing,pricing);
 assert.equal(result.content,pricing);
 assert.ok(result.summary.rows>800);
 assert.equal(result.summary.changed,0);
});
check('User copy/paste with original 22 blank separator rows and decimal quantities',()=>{
 const changed=jed
 .replace(/(ARM_10015\t[^\n]*?\t)50(\t32)/,'$146.875$2')
 .replace(/(BA_1033\t[^\n]*?\t)45\.5(\t60)/,'$146.5$2');
 assert.notEqual(changed,jed);
 const result=prepare('jeddah',changed,jed);
 assert.equal(result.summary.changed,2);
 assert.equal(result.summary.added,0);
 assert.ok(result.content.includes('ARM_10015\tبرطمان 4000 مل دائري  - غطاء اصفر\tكرتون\t46.875\t32\t\t\t'));
 assert.ok(result.content.includes('BA_1033\tحاجز باب 90\tكرتون\t46.5\t60\t\t\t'));
 assert.ok(result.content.includes('AR_23653\t ملعقة تقليب سمك\tكرتون\t'));
 assert.equal(result.content.split('\n').filter(x=>!x.trim()).length,jed.split('\n').filter(x=>!x.trim()).length);
});
check('Quantity-only paste preserves product identity and pack',()=>{
 const input='رقم الصنف\tالكمية المتوفرة\nARM_10015\t46.875\n';
 const result=prepare('jeddah',input,jed);
 assert.equal(result.summary.changed,1);
 assert.ok(result.content.includes('ARM_10015\tبرطمان 4000 مل دائري  - غطاء اصفر\tكرتون\t46.875\t32'));
});
check('Insert new full product without deleting existing SKUs',()=>{
 const input='رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\t\t\t\nTEST_9981\tصنف اختبار\tكرتون\t0.5\t24\t\t\t\n';
 const result=prepare('jeddah',input,jed);
 assert.equal(result.summary.added,1);
 assert.ok(result.content.includes('TEST_9981\tصنف اختبار\tكرتون\t0.5\t24\t\t\t'));
 assert.ok(result.content.includes('ARM_10004\t'));
});
check('Reject new product without name/unit/pack',()=>{
 assert.throws(()=>prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nTEST_9981\t1',jed),/الاسم والوحدة والشد/);
});
check('Ignore blank rows in price importer',()=>{
 const source='رقم الصنف\tسعر البيع\n\n\t\t\t\nARM_10004\t245\n';
 const out=prepare('pricing',source,pricing);
 assert.equal(out.summary.changed,1);
 assert.equal(out.summary.blankRowsSkipped,2);
 assert.ok(out.content.includes('ARM_10004\t245'));
});
check('Pricing updates same SKU in both branch columns',()=>{
 const out=prepare('pricing','رقم الصنف\tسعر البيع\nARM_10004\t245',pricing);
 assert.equal(out.summary.changed,1);
 assert.equal(out.summary.added,0);
 assert.ok(out.summary.examples.length>=2);
});
check('Duplicate conflicting SKU is rejected',()=>{
 assert.throws(()=>prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t3\nARM_10004\t4',jed),/مكرر/);
});
check('Duplicate price with same value is allowed',()=>{
 const out=prepare('pricing','رقم الصنف\tسعر البيع\nARM_10004\t240\nARM_10004\t240',pricing);
 assert.equal(out.summary.rows,1);
 assert.equal(out.summary.changed,0);
});
check('Negative, missing and non-numeric quantities rejected',()=>{
 for(const v of ['-1','','abc','Infinity','NaN'])assert.throws(()=>prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t'+v,jed));
});
check('Decimal and zero are accepted',()=>{
 const out=prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t0.00003',jed);
 assert.equal(out.summary.changed,1);
});
check('CRLF and BOM pastes are accepted',()=>{
 const input='\uFEFFرقم الصنف\tالكمية المتوفرة\r\n\r\nARM_10004\t20\r\n';
 const out=prepare('jeddah',input,jed);
 assert.equal(out.summary.changed,1);
});
check('Original trailing empty TSV columns survive write',()=>{
 const out=prepare('jeddah','رقم الصنف\tالكمية المتوفرة\nARM_10004\t20',jed);
 assert.ok(out.content.includes('ARM_10004\tبرطمان 150 مل دائري - غطاء اصفر\tكرتون\t20\t60\t\t\t'));
});
console.log('IMPORT_V58_PASS '+checked+' scenarios');