'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit,devices}=require('playwright');

const source=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const shell=fs.readFileSync('customer.html','utf8');
const worker=fs.readFileSync('sw.js','utf8');
const styles=source.slice(source.indexOf('<style>')+7,source.indexOf('</style>'));

assert(styles.includes('.customer-showcase-grid{grid-template-columns:minmax(0,1fr);'),'single-column grid must not grow to rail min-content width');
assert(styles.includes('.customer-showcase-section{min-width:0;max-width:100%}'),'sections must shrink within the viewport');
assert(source.includes('className="grid gap-4 customer-showcase-grid"'),'customer home must use constrained grid');
assert(source.includes('className="customer-showcase-section bg-white'),'category section must allow shrinking');
assert(styles.includes('touch-action:auto;'),'native touch gestures must remain enabled');
assert(shell.includes('all-category-products=111'),'live customer bootstrap must request refreshed rail source');
assert(worker.includes('batco-navigation-shell-v111-progressive-batch-guard'),'navigation cache must refresh for the fix');

function fixture(){
 const cards=Array.from({length:7},(_,i)=>`<article style="flex:0 0 168px;min-width:168px;height:270px;border:1px solid #ddd;background:#fff"><button style="width:100%;height:160px">صورة ${i}</button><div>سعر الكرتون ${i+1}</div></article>`).join('');
 return `<!doctype html><html lang="ar" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>
  ${styles}
  body{margin:0}.test-main{max-width:1100px;margin-inline:auto;padding:16px}
  .grid{display:grid}.gap-4{gap:16px}.gap-3{gap:12px}
  .min-w-0{min-width:0}.w-full{width:100%}.max-w-full{max-width:100%}
  .overflow-hidden{overflow:hidden}.p-3{padding:12px}
  </style></head><body><main class="test-main"><div class="grid gap-4 customer-showcase-grid">
  <section class="customer-showcase-section p-3" style="border:1px solid #ddd">
  <h2>الأواني المنزلية</h2><div class="min-w-0 w-full max-w-full overflow-hidden">
  <div class="customer-product-rail gap-3" dir="rtl" role="region" aria-label="منتجات الأواني المنزلية">${cards}</div>
  </div></section></div><div style="height:1100px">محتوى الصفحة السفلي</div></main></body></html>`;
}

async function verify(type,deviceName){
 const browser=await type.launch({headless:true});
 try{
  const context=await browser.newContext({...devices[deviceName]});
  const page=await context.newPage();
  await page.setContent(fixture());
  const state=await page.locator('.customer-product-rail').evaluate(el=>{
   const section=el.closest('section'),grid=section.parentElement;
   const outer=grid.getBoundingClientRect(),inner=el.getBoundingClientRect();
   return {viewport:document.documentElement.clientWidth,gridWidth:outer.width,sectionWidth:section.getBoundingClientRect().width,railWidth:inner.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:getComputedStyle(el).overflowX,touchAction:getComputedStyle(el).touchAction};
  });
  assert(state.gridWidth<=state.viewport,`${deviceName}: grid escaped viewport: ${JSON.stringify(state)}`);
  assert(state.sectionWidth<=state.gridWidth+1,`${deviceName}: category section expanded beyond the grid`);
  assert(state.railWidth<=state.gridWidth,`${deviceName}: rail is wider than its grid`);
  assert(state.scrollWidth-state.clientWidth>250,`${deviceName}: no horizontal scroll range: ${JSON.stringify(state)}`);
  assert.equal(state.overflowX,'auto');
  assert.equal(state.touchAction,'auto');
  await page.locator('.customer-product-rail').evaluate(el=>{el.scrollLeft=-160});
  const moved=await page.locator('.customer-product-rail').evaluate(el=>el.scrollLeft);
  assert(moved<-100,`${deviceName}: RTL rail cannot scroll left`);

  if(type===chromium){
   await page.locator('.customer-product-rail').evaluate(el=>{el.scrollLeft=0});
   const box=await page.locator('.customer-product-rail').boundingBox();
   const session=await context.newCDPSession(page);
   // RTL starts at its right edge (scrollLeft=0). Dragging the finger to the
   // right reveals cards on the left and must make scrollLeft negative.
   const x1=box.x+55,x2=box.x+box.width-35,y=box.y+80;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y,id:1}]});
   for(let i=1;i<=12;i++){
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*i/12,y,id:1}]});
    await new Promise(resolve=>setTimeout(resolve,12));
   }
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(250);
   const afterFinger=await page.locator('.customer-product-rail').evaluate(el=>el.scrollLeft);
   assert(afterFinger<-40,`${deviceName}: real touch movement did not scroll RTL rail (${afterFinger})`);
   console.log(`${deviceName}: finger swipe PASS (scrollLeft=${afterFinger})`);
  }
  console.log(`${deviceName}: constrained grid + native RTL scroll PASS ${JSON.stringify(state)}`);
 }finally{await browser.close()}
}

(async()=>{
 await verify(chromium,'Pixel 7');
 await verify(webkit,'iPhone 13');
})().catch(error=>{console.error(error);process.exitCode=1});
