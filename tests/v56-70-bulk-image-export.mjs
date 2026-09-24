import { chromium } from 'playwright';
import fs from 'node:fs';

const allRows=[...new Set(fs.readFileSync('data/images_list.txt','utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>line.split('\t')[0].trim()))];
if(allRows.length<30)throw new Error('Need at least 30 mapped images for V56.71 test');
const [skuA,skuB]=allRows;
const missing='ZZ_TEST_NO_IMAGE_999999';
const toArabicDigits=value=>String(value).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);

const browser=await chromium.launch({headless:true});
const context=await browser.newContext();
await context.addInitScript(()=>{
  localStorage.setItem('inventory_user_name_v2','مهند');
  localStorage.setItem('inventory_admin_token_v2','1jh297-spgf2z');
  Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>Array.isArray(data?.files)&&data.files.length>0});
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{
    window.__shareCalls=window.__shareCalls||[];
    window.__shareCalls.push({
      count:data.files?.length||0,
      names:(data.files||[]).map(f=>f.name),
      types:(data.files||[]).map(f=>f.type),
      bytes:(data.files||[]).reduce((n,f)=>n+(f.size||0),0)
    });
  }});
});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));

await page.route('**/api/image-admin?action=bindings',async route=>{
  await new Promise(r=>setTimeout(r,7000));
  try{await route.fulfill({status:200,contentType:'application/json',body:'{"bindings":{}}'})}catch{}
});

const bootStarted=Date.now();
await page.goto('http://127.0.0.1:4173/admin-image-export.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForSelector('#extractBtn:not([disabled])',{timeout:6000});
const bootMs=Date.now()-bootStarted;
if(bootMs>6000)throw new Error('Static image data boot was blocked by bindings API: '+bootMs+'ms');

const eagerZip=await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>/jszip/i.test(r.name)));
if(eagerZip)throw new Error('JSZip must not block initial page load');

await page.fill('#skuInput',[toArabicDigits(skuA),skuB,skuA,missing].join('\n'));
await page.click('#extractBtn');
await page.waitForFunction(()=>document.querySelector('#stats')?.hidden===false);
await page.waitForFunction(()=>{
  const images=[...document.querySelectorAll('#resultGrid img')];
  return images.length===2&&images.every(img=>img.complete&&img.naturalWidth>0);
},{timeout:15000});

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

await page.fill('#skuInput','AR_289\u200EAR_287\nBA_296\u200FBA_7303\nBA_');
const unicodeCounter=await page.locator('#inputCounter').innerText();
if(!unicodeCounter.startsWith('4 / 500'))throw new Error('Hidden Unicode separators merged SKU input: '+unicodeCounter);
await page.click('#extractBtn');
await page.waitForFunction(()=>document.querySelector('#requestedCount')?.textContent?.trim()==='4');
const unicodeValues=await page.evaluate(()=>({
  requested:document.querySelector('#requestedCount')?.textContent?.trim(),
  found:document.querySelector('#foundCount')?.textContent?.trim(),
  missing:document.querySelector('#missingCount')?.textContent?.trim(),
  missingText:document.querySelector('#missingList')?.textContent||'',
  hint:document.querySelector('#missingHint')?.textContent||''
}));
if(unicodeValues.requested!=='4')throw new Error('Unicode/merged SKU token count failed: '+JSON.stringify(unicodeValues));
if(/AR_289AR_287|BA_296BA_7303|BA_\b/.test(unicodeValues.missingText))throw new Error('Malformed merged SKU leaked into review list: '+JSON.stringify(unicodeValues));
const unicodeAllowed=new Set(['AR_289','AR_287','BA_296','BA_7303']);
const unicodeForeign=unicodeValues.missingText.split(/\s+/).filter(Boolean).filter(x=>!unicodeAllowed.has(x));
if(unicodeForeign.length)throw new Error('Unicode parser generated foreign fragments: '+JSON.stringify(unicodeForeign));
if(!unicodeValues.hint.includes('1 مدخل غير صالح'))throw new Error('Invalid fragment should be ignored and disclosed: '+JSON.stringify(unicodeValues));

const userOriginalRaw="AR_27124\nAR_278\nAR_279\nAR_281\nAR_28219\nAR_283\nAR_28347\nAR_28366\nAR_285\nAR_28520\nAR_28527\nAR_28528\nAR_286\nAR_28626\nAR_28627\nAR_287\nAR_289\nAR_28919\nAR_28920\nAR_28921\nAR_28922\nAR_28923\nAR_295\nAR_296\nAR_297\nBA_018\nBA_045\nBA_063\nBA_070\nBA_093\nBA_100\nBA_1033\nBA_1034\nBA_1035\nBA_1036\nBA_116\nBA_124\nBA_131\nBA_148\nBA_155\nBA_162\nBA_167\nBA_195\nBA_215\nBA_225\nBA_232\nBA_249\nBA_285\nBA_296\nBA_298\nBA_342\nBA_352\nBA_371\nBA_386\nBA_444\nBA_461\nBA_495\nBA_560\nBA_564\nBA_571\nBA_649\nBA_7275\nBA_7283\nBA_7289\nBA_7290\nBA_7291\nBA_7292\nBA_7301\nBA_7302\nBA_7303\nBA_734\nBA_789\nBA_796\nBA_806\nBA_830\nBA_837\nBA_843\nBA_846\nBA_956\nEAK_300005\nEAK_300007\nEAQ_200004\nEAR_200001\nIBQ_200007\nIBQ_200008\nIBQ_200016\nOGS_00004\nOGS_00005\nBA_615\nBA_622\nBA_591\nBA_106_11\nBA_822\nBA_301\nBA_052\nBA_069\nBA_423\nBA_515\nBA_585\nBA_229\nBA_406\nBA_973\nBA_997\nBA_829\nBA_727\nBA_143\nBA_326\nBA_319\nBA_234\nBA_357\nBA_166\nBA_608";
const userOriginal=userOriginalRaw.split('\n').filter(Boolean);
const corruptedUserOriginal=userOriginal.map(x=>{
  if(x==='AR_278')return 'AR_2\u200E78';
  if(x==='AR_283')return 'AR_2\u200F83';
  if(x==='AR_28921')return 'AR_289\u200E21';
  if(x==='BA_195')return 'BA_1\u200E95';
  if(x==='BA_301')return 'BA_30\u200F1';
  if(x==='EAK_300007')return 'EAK_300\u200E007';
  if(x==='BA_100')return 'BA_BA_100';
  return x;
}).join('\n');
await page.fill('#skuInput',corruptedUserOriginal);
const userCounter=await page.locator('#inputCounter').innerText();
if(!userCounter.startsWith(userOriginal.length+' / 500'))throw new Error('User original list token count changed: '+userCounter+' expected '+userOriginal.length);
await page.click('#extractBtn');
await page.waitForFunction(expected=>document.querySelector('#requestedCount')?.textContent?.trim()===String(expected),userOriginal.length);
const userListValues=await page.evaluate(()=>({
  requested:document.querySelector('#requestedCount')?.textContent?.trim(),
  found:document.querySelector('#foundCount')?.textContent?.trim(),
  missing:document.querySelector('#missingCount')?.textContent?.trim(),
  duplicates:document.querySelector('#duplicateCount')?.textContent?.trim(),
  review:[...document.querySelectorAll('#missingList .bulk-missing-chip')].map(x=>x.textContent.trim()),
  visibleSkus:[...document.querySelectorAll('#resultGrid .bulk-sku')].map(x=>x.textContent.trim())
}));
if(userOriginal.length!==112)throw new Error('Locked user source list must contain exactly 112 SKUs, got '+userOriginal.length);
if(userListValues.requested!=='112')throw new Error('User source list must remain exactly 112 requested SKUs: '+JSON.stringify(userListValues));
if(userListValues.duplicates!=='0')throw new Error('User source list has no duplicates; parser invented duplicates: '+JSON.stringify(userListValues));
const originalSet=new Set(userOriginal);
const foreignReview=userListValues.review.filter(x=>!originalSet.has(x));
if(foreignReview.length)throw new Error('Review list contains generated fragments not present in user source: '+JSON.stringify(foreignReview));
const knownBad=['9','AR_2','183','AR_28','528528','21','31','BA_5','1148','0','664','EAK_300','007','BA_30','BA_BA_100'];
const leaked=userListValues.review.filter(x=>knownBad.includes(x));
if(leaked.length)throw new Error('Known corruption fragments leaked into review: '+JSON.stringify(leaked));
if(userListValues.visibleSkus.includes('BA_BA_100'))throw new Error('Repeated prefix was not canonicalized');
if(Number(userListValues.found)+Number(userListValues.missing)!==userOriginal.length)throw new Error('Found + missing does not reconcile to source list: '+JSON.stringify(userListValues));

const pagedRows=allRows.slice(0,30);
await page.fill('#skuInput',pagedRows.join('\n'));
await page.click('#extractBtn');
await page.waitForFunction(()=>document.querySelector('#foundCount')?.textContent?.trim()==='30');
let pageValues=await page.evaluate(()=>({
  cards:document.querySelectorAll('#resultGrid .bulk-image-card').length,
  pager:document.querySelector('#resultPager')?.textContent||''
}));
if(pageValues.cards!==24||!pageValues.pager.includes('1 / 2'))throw new Error('First result page should render only 24 images: '+JSON.stringify(pageValues));
await page.click('#pageNext');
await page.waitForFunction(()=>document.querySelectorAll('#resultGrid .bulk-image-card').length===6);
pageValues=await page.evaluate(()=>({cards:document.querySelectorAll('#resultGrid .bulk-image-card').length,pager:document.querySelector('#resultPager')?.textContent||''}));
if(pageValues.cards!==6||!pageValues.pager.includes('2 / 2'))throw new Error('Second result page failed: '+JSON.stringify(pageValues));

const shareBefore=await page.locator('#shareImagesBtn').innerText();
if(!shareBefore.includes('1–20')||!shareBefore.includes('30'))throw new Error('Native share first batch label is wrong: '+shareBefore);
await page.click('#shareImagesBtn');
await page.waitForFunction(()=>document.querySelector('#shareImagesBtn')?.textContent?.includes('فتح المشاركة'));
const preparedLabel=await page.locator('#shareImagesBtn').innerText();
await page.click('#shareImagesBtn');
await page.waitForFunction(()=>Array.isArray(window.__shareCalls)&&window.__shareCalls.length===1);
const shareValues=await page.evaluate(()=>({
  meta:window.__shareCalls[0],
  nextLabel:document.querySelector('#shareImagesBtn')?.textContent||''
}));
if(shareValues.meta.count<1||shareValues.meta.count>20)throw new Error('Native share batch size is unsafe: '+JSON.stringify(shareValues));
if(!shareValues.meta.names.every(n=>/\.(webp|png|jpe?g)$/i.test(n)))throw new Error('Native share must contain actual image files: '+JSON.stringify(shareValues));
if(shareValues.nextLabel.includes('1–20'))throw new Error('Native share did not advance to the next batch: '+JSON.stringify(shareValues));

const overflowRows=Array.from({length:501},(_,i)=>'QA_NO_IMAGE_'+String(100000+i));
await page.fill('#skuInput',overflowRows.join('\n'));
const counter=await page.locator('#inputCounter').innerText();
if(!counter.includes('500 / 500')||!counter.includes('+1'))throw new Error('500 item input cap not exposed correctly: '+counter);
await page.click('#extractBtn');
await page.waitForFunction(()=>document.querySelector('#requestedCount')?.textContent?.trim()==='500');
const capValues=await page.evaluate(()=>({
  requested:document.querySelector('#requestedCount')?.textContent?.trim(),
  missing:document.querySelector('#missingCount')?.textContent?.trim(),
  imageNodes:document.querySelectorAll('#resultGrid img').length
}));
if(capValues.requested!=='500'||capValues.missing!=='500'||capValues.imageNodes!==0)throw new Error('500 item cap failed: '+JSON.stringify(capValues));
if(errors.length)throw new Error('Page errors: '+errors.join(' | '));

console.log('V56.74_CANONICAL_SKU_TOKENIZER_PASS',{bootMs,...values,unicodeValues,userListValues,pageValues,preparedLabel,shareValues,capValues});
await browser.close();
