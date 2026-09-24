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

const pricingLines=fs.readFileSync('data/pricing.tsv','utf8').split(/\r?\n/);
const priceMap=new Map();
for(const line of pricingLines.slice(2)){
  const c=line.split('\t');
  if(c[0]?.trim()&&c[1]?.trim())priceMap.set(c[0].trim(),Number(c[1].trim()));
  if(c[5]?.trim()&&c[6]?.trim())priceMap.set(c[5].trim(),Number(c[6].trim()));
}
const packMap=new Map();
for(const file of ['data/jeddah.tsv','data/riyadh.tsv']){
  const rows=fs.readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean);
  const headers=rows[0].split('\t').map(x=>x.trim()),si=headers.findIndex(x=>/رقم|كود|sku|item/i.test(x)),pi=headers.findIndex(x=>/شد|pack|bundle|case/i.test(x));
  for(const row of rows.slice(1)){const c=row.split('\t'),sku=String(c[si]||'').trim(),pack=Number(String(c[pi]||'').trim());if(sku&&pack>0&&!packMap.has(sku))packMap.set(sku,pack)}
}
const imageText=fs.readFileSync('data/images_list.txt','utf8');
const pricedSku=[...priceMap.keys()].find(sku=>{
  const d=sku.replace(/\D/g,'');
  return packMap.has(sku)&&d&&imageText.split(/\r?\n/).filter(line=>(line.split('\t')[0]||'').replace(/\D/g,'')===d).length===1;
});
if(!pricedSku)throw new Error('No SKU with sale price, pack, and unique image mapping found');
const expectedUnit=Number((priceMap.get(pricedSku)/packMap.get(pricedSku)).toFixed(2)).toString()+' ⃁';
if(priceMap.get('AR_278')!==120||packMap.get('AR_278')!==30||Number((priceMap.get('AR_278')/packMap.get('AR_278')).toFixed(2))!==4)throw new Error('AR_278 unit-price contract must remain 120 / 30 = 4');
await page.fill('#skuInput',pricedSku);
await page.click('#extractBtn');
await page.waitForFunction(()=>document.querySelector('#foundCount')?.textContent?.trim()==='1');
if(await page.locator('.bulk-price-preview').count())throw new Error('Price preview must be off by default');
await page.locator('#priceStampToggle').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))});
await page.waitForFunction(()=>document.querySelector('.bulk-price-preview'));
const pricePreview=await page.locator('.bulk-price-preview').innerText();
if(pricePreview!==expectedUnit||pricePreview.includes('ر.س'))throw new Error('Unit price with new Saudi riyal sign was not shown correctly: '+pricePreview+' expected '+expectedUnit);
await page.evaluate(()=>{window.__shareCalls=[]});
await page.click('#shareImagesBtn');
await page.waitForFunction(()=>document.querySelector('#shareImagesBtn')?.textContent?.includes('فتح المشاركة'));
await page.click('#shareImagesBtn');
await page.waitForFunction(()=>window.__shareCalls?.length===1);
const pricedShare=await page.evaluate(()=>window.__shareCalls[0]);
if(pricedShare.count!==1||!pricedShare.names[0].includes('-unit-price.'))throw new Error('Unit-price-stamped image was not passed to native share: '+JSON.stringify(pricedShare));
await page.locator('#priceStampToggle').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}))});
await page.evaluate(()=>{window.__shareCalls=[]});

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
if(unicodeValues.requested!=='4'||unicodeValues.found!=='4'||unicodeValues.missing!=='0')throw new Error('Unicode/merged SKU recovery failed: '+JSON.stringify(unicodeValues));
if(/AR_289AR_287|BA_296BA_7303|BA_\b/.test(unicodeValues.missingText))throw new Error('Malformed merged SKU leaked into review list: '+JSON.stringify(unicodeValues));
if(!unicodeValues.hint.includes('1 مدخل غير صالح'))throw new Error('Invalid fragment should be ignored and disclosed: '+JSON.stringify(unicodeValues));

const exactOriginal=["AR_27124","AR_278","AR_279","AR_281","AR_28219","AR_283","AR_28347","AR_28366","AR_285","AR_28520","AR_28527","AR_28528","AR_286","AR_28626","AR_28627","AR_287","AR_289","AR_28919","AR_28920","AR_28921","AR_28922","AR_28923","AR_295","AR_296","AR_297","BA_018","BA_045","BA_063","BA_070","BA_093","BA_100","BA_1033","BA_1034","BA_1035","BA_1036","BA_116","BA_124","BA_131","BA_148","BA_155","BA_162","BA_167","BA_195","BA_215","BA_225","BA_232","BA_249","BA_285","BA_296","BA_298","BA_342","BA_352","BA_371","BA_386","BA_444","BA_461","BA_495","BA_560","BA_564","BA_571","BA_649","BA_7275","BA_7283","BA_7289","BA_7290","BA_7291","BA_7292","BA_7301","BA_7302","BA_7303","BA_734","BA_789","BA_796","BA_806","BA_830","BA_837","BA_843","BA_846","BA_956","EAK_300005","EAK_300007","EAQ_200004","EAR_200001","IBQ_200007","IBQ_200008","IBQ_200016","OGS_00004","OGS_00005","BA_615","BA_622","BA_591","BA_106_11","BA_822","BA_301","BA_052","BA_069","BA_423","BA_515","BA_585","BA_229","BA_406","BA_973","BA_997","BA_829","BA_727","BA_143","BA_326","BA_319","BA_234","BA_357","BA_166","BA_608"];
const exactMissing=["AR_278","AR_279","AR_281","AR_283","AR_28347","AR_28527","AR_28528","AR_295","AR_297","BA_093","BA_1033","BA_1034","BA_1035","BA_1036","BA_7289","BA_7290","BA_7291","EAQ_200004","IBQ_200007","IBQ_200008","OGS_00004","OGS_00005","BA_106_11","BA_052","BA_069","BA_229","BA_829"];
const exactCorrupted=exactOriginal.map(sku=>{let value=sku.replace('_','_\u200E');if(sku==='BA_100')value='BA_BA_100';return value;});
const exactPieces=[];
for(let i=0;i<exactCorrupted.length;i++){if(i%13===0&&i+1<exactCorrupted.length){exactPieces.push(exactCorrupted[i]+'\u200F'+exactCorrupted[i+1]);i++;}else exactPieces.push(exactCorrupted[i]);}
await page.fill('#skuInput',exactPieces.join('\n'));
const exactCounter=await page.locator('#inputCounter').innerText();
if(!exactCounter.startsWith('112 / 500'))throw new Error('Exact 112-SKU list was corrupted before extraction: '+exactCounter);
await page.click('#extractBtn');
await page.waitForFunction(()=>document.querySelector('#requestedCount')?.textContent?.trim()==='112');
const exactValues=await page.evaluate(()=>({requested:document.querySelector('#requestedCount')?.textContent?.trim(),found:document.querySelector('#foundCount')?.textContent?.trim(),missing:document.querySelector('#missingCount')?.textContent?.trim(),duplicates:document.querySelector('#duplicateCount')?.textContent?.trim(),hint:document.querySelector('#missingHint')?.textContent||'',missingItems:[...document.querySelectorAll('#missingList .bulk-missing-chip')].map(x=>x.textContent.trim())}));
if(exactValues.requested!=='112'||exactValues.found!=='85'||exactValues.missing!=='27')throw new Error('Exact source list totals changed: '+JSON.stringify(exactValues));
if(exactValues.duplicates!=='0'||/تم تجاهل/.test(exactValues.hint))throw new Error('Exact source list must not create duplicates/invalid fragments: '+JSON.stringify(exactValues));
if(JSON.stringify(exactValues.missingItems)!==JSON.stringify(exactMissing))throw new Error('Review list is not the exact unresolved subset of source SKUs: '+JSON.stringify(exactValues));
const forbidden=['9','AR_2','183','AR_28','528528','21','31','BA_5','0','1148','664','007','EAK_300','BA_30','A1','BA_BA_100'];
if(exactValues.missingItems.some(x=>forbidden.includes(x)))throw new Error('Invented SKU fragment leaked into review list: '+JSON.stringify(exactValues));
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

const exportCss=fs.readFileSync('v56-70-bulk-image-export.css','utf8');
if(!exportCss.includes('font-size:6.5px')||!exportCss.includes('padding:2px 4px'))throw new Error('Micro price preview styling regressed');
const exportJs=fs.readFileSync('v56-70-bulk-image-export.js','utf8');
if(exportJs.includes('const batches=[]'))throw new Error('ZIP export still uses multiple batches');
if(!exportJs.includes("تم تجهيز '+S.results.length+' صورة في ملف ZIP واحد"))throw new Error('Single ZIP completion contract missing');

console.log('V56.76_UNIT_PRICE_MICRO_STAMP_PASS',{bootMs,...values,pricedSku,expectedUnit,pricePreview,pricedShare,unicodeValues,exactValues,pageValues,preparedLabel,shareValues,capValues});
await browser.close();
