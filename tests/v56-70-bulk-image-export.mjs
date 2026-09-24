import { chromium } from 'playwright';
import fs from 'node:fs';

const rows=fs.readFileSync('data/images_list.txt','utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,2).map(line=>line.split('\t')[0].trim());
if(rows.length<2)throw new Error('Need at least two mapped images for V56.70 test');
const [skuA,skuB]=rows;
const missing='ZZ_TEST_NO_IMAGE_999999';
const toArabicDigits=value=>String(value).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);

const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addInitScript(()=>{
  localStorage.setItem('inventory_user_name_v2','مهند');
  localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');
});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:4173/admin-image-export.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForSelector('#extractBtn:not([disabled])',{timeout:15000});
await page.fill('#skuInput',[toArabicDigits(skuA),skuB,skuA,missing].join('\n'));
await page.click('#extractBtn');
await page.waitForFunction(()=>document.querySelector('#stats')?.hidden===false);

const values=await page.evaluate(()=>({
  requested:document.querySelector('#requestedCount')?.textContent?.trim(),
  found:document.querySelector('#foundCount')?.textContent?.trim(),
  missing:document.querySelector('#missingCount')?.textContent?.trim(),
  duplicates:document.querySelector('#duplicateCount')?.textContent?.trim(),
  cards:document.querySelectorAll('#resultGrid .bulk-image-card').length,
  missingText:document.querySelector('#missingList')?.textContent||'',
  zipDisabled:document.querySelector('#downloadZipBtn')?.disabled,
  albumLink:Boolean(document.querySelector('a[href="./image-distribution.html"]'))
}));
if(values.requested!=='3')throw new Error('Expected 3 unique requested items: '+JSON.stringify(values));
if(values.found!=='2'||values.cards!==2)throw new Error('Expected two mapped images: '+JSON.stringify(values));
if(values.missing!=='1'||!values.missingText.includes(missing))throw new Error('Missing SKU contract failed: '+JSON.stringify(values));
if(values.duplicates!=='1')throw new Error('Duplicate suppression failed: '+JSON.stringify(values));
if(values.zipDisabled)throw new Error('ZIP action should be enabled when images exist');
if(!values.albumLink)throw new Error('Image album return link missing');

const overflowRows=Array.from({length:501},(_,i)=>'QA_NO_IMAGE_'+String(100000+i));
await page.fill('#skuInput',overflowRows.join('\n'));
const counter=await page.locator('#inputCounter').innerText();
if(!counter.includes('500 / 500')||!counter.includes('+1'))throw new Error('500 item input cap not exposed correctly: '+counter);
await page.click('#extractBtn');
await page.waitForFunction(()=>document.querySelector('#requestedCount')?.textContent?.trim()==='500');
const capValues=await page.evaluate(()=>({
  requested:document.querySelector('#requestedCount')?.textContent?.trim(),
  missing:document.querySelector('#missingCount')?.textContent?.trim()
}));
if(capValues.requested!=='500'||capValues.missing!=='500')throw new Error('500 item cap failed: '+JSON.stringify(capValues));

if(errors.length)throw new Error('Page errors: '+errors.join(' | '));

console.log('V56.70_BULK_IMAGE_EXPORT_PASS',values);
await browser.close();