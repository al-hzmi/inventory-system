'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {webkit,devices}=require('playwright');
(async()=>{
 const src=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
 const css=src.slice(src.indexOf('<style>')+7,src.indexOf('</style>'));
 let browser;
 try{
   browser=await webkit.launch({headless:true});
   const page=await browser.newPage({...devices['iPhone 13']});
   const html='<meta name="viewport" content="width=device-width,initial-scale=1">'+
     '<style>'+css+'</style>'+
     '<div style="width:100%;max-width:100%;overflow:hidden">'+
     '<div class="customer-product-rail" dir="rtl" style="gap:12px">'+
     Array.from({length:8},(_,i)=>'<article style="width:168px;min-width:168px;height:240px;background:#fff;border:1px solid #ddd">Product '+i+'</article>').join('')+
     '</div></div>';
   await page.setContent(html);
   const state=await page.evaluate(()=>{
     const scroller=document.querySelector('.customer-product-rail'),style=getComputedStyle(scroller);
     const initial=scroller.scrollLeft;
     scroller.scrollLeft=-220;
     return {cssOverflow:style.overflowX,touchAction:style.touchAction,scrollWidth:scroller.scrollWidth,clientWidth:scroller.clientWidth,initial,after:scroller.scrollLeft,cardWidth:scroller.firstElementChild.getBoundingClientRect().width};
   });
   assert.equal(state.cssOverflow,'auto','WebKit did not enable native horizontal overflow');
   assert.equal(state.touchAction,'auto','WebKit did not permit horizontal touch panning');
   assert(state.scrollWidth>state.clientWidth*2,'Mobile cards are not horizontally scrollable');
   assert(state.after<-20,'RTL horizontal scrolling did not move inside WebKit');
   assert.equal(state.cardWidth,168,'cards changed width and lost visible overflow');
   console.log('V108 mobile WebKit RTL native horizontal scroller PASS '+JSON.stringify(state));
 }finally{if(browser)await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});
