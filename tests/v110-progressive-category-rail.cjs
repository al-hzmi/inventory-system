'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Babel=require('@babel/standalone');

const source=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const start=source.indexOf('function ProgressiveCategoryRail(');
const end=source.indexOf('function CategoryPreviewCard(',start);
assert(start>0&&end>start,'progressive rail component missing');
const snippet=source.slice(start,end);
assert(source.includes('<ProgressiveCategoryRail section={section}'),'home must use progressive category rails');
assert(!source.includes('section.items.slice(0,7)'),'category previews must not truncate at seven products');
assert(snippet.includes('section.items.slice(0,visibleCount)'),'the rail should render only the requested batch');
assert(snippet.includes('rail.scrollWidth-rail.clientWidth-Math.abs(rail.scrollLeft)'),'RTL distance-to-end must handle negative scrollLeft');
assert(snippet.includes('current+12'),'subsequent products must be appended progressively');
assert(source.includes('onScroll={onScroll}'),'native scroll event must reach the batching logic');

function exercise(total){
 let count=10,missing='';
 const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};
 const context={React,ProductRail:'rail',CategoryPreviewCard:'card',
  useState:()=>[count,update=>{count=typeof update==='function'?update(count):update}]};
 vm.createContext(context);
 vm.runInContext(Babel.transform(snippet,{presets:['react']}).code+';renderRail=ProgressiveCategoryRail',context);
 const section={name:'الأواني المنزلية',items:Array.from({length:total},(_,i)=>({cleanId:'sku-'+i,id:'AR_'+i}))};
 function render(){
  const rail=context.renderRail({section,onAdd:()=>{},onZoom:()=>{},onImageMissing:id=>{missing=id}});
  assert.equal(rail.type,'rail');
  assert.equal(rail.props.label,'منتجات الأواني المنزلية');
  return {rail,cards:rail.props.children[0]};
 }
 let view=render();
 assert.equal(view.cards.length,Math.min(10,total),'initial DOM should stay bounded');
 if(total<10){assert.equal(count,10);return}
 // Near the rightmost RTL starting position, no new cards should be mounted.
 view.rail.props.onScroll({currentTarget:{scrollWidth:1800,clientWidth:350,scrollLeft:0}});
 assert.equal(count,10,'loading must wait until the user approaches the rail end');
 let attempts=0;
 while(count<total){
  view=render();
  const loaded=view.cards.length,width=loaded*180,clientWidth=350;
  view.rail.props.onScroll({currentTarget:{scrollWidth:width,clientWidth,scrollLeft:-(width-clientWidth-30)}});
  assert(++attempts<30,'infinite progressive loading loop');
 }
 view=render();
 assert.equal(view.cards.length,total,'every product must eventually be reachable');
 view.cards[total-1].props.onImageMissing();
 assert.equal(missing,'sku-'+(total-1),'image error must retain original item identity');
 view.rail.props.onScroll({currentTarget:{scrollWidth:total*180,clientWidth:350,scrollLeft:-(total*180-350)}});
 assert.equal(count,total,'loading must stop at the true category end');
 return attempts;
}

exercise(3);
assert(exercise(226)>10,'large categories must load through many scroll batches');
console.log('V110 all 226 category products reachable via bounded native RTL rail batches: PASS');
