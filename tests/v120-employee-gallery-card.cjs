const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Babel=require('@babel/standalone');
const source=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const start=source.indexOf('const GalleryCard = memo('),end=source.indexOf('const SkeletonGrid =',start);
assert(start>0&&end>start,'gallery component exists');
const code=Babel.transform(source.slice(start,end),{presets:['react']}).code;
const slots=[];let index=0;
const context={
  React:{Fragment:'Fragment',createElement:(type,props,...children)=>({type,props:{...props,children}})},
  memo:x=>x,useState:initial=>{const slot=index++;if(!(slot in slots))slots[slot]=initial;return [slots[slot],next=>{slots[slot]=typeof next==='function'?next(slots[slot]):next}]},useEffect:()=>{},
  CARD_VIEW:{IMAGE:0,QUANTITY:1,DETAILS:2},
  PilotFavoriteButton:'Favorite',ProductImage:'ProductImage',OrderQuantityControl:'OrderControl',Quantity:'Quantity',
  Icon:{Expand:'Expand',Grid:'Grid'},
  NUMBER_FORMATTER:new Intl.NumberFormat('en-US'),
  stockTone:()=>({bg:'neutral'}),quantityInCartons:()=>({cartons:2})
};
const GalleryCard=vm.runInNewContext(code+'\nGalleryCard;',context);
const product={uid:'j:123',id:'AR_123',name:'صحن تقديم عربي',qty:2,unit:'كرتون',pack:'12',price:48,approxPrice:4};
const props={item:product,imageFileName:'AR_123.webp',showImage:false,view:0,isGrid:true,warehouse:'jeddah',warehouseName:'جدة',cart:{},setCart:()=>{},onTap:()=>{},onCycle:()=>{},onZoom:()=>{},onImageTaps:()=>{},isAdmin:false,currentCategory:'الأواني المنزلية'};
const flatten=(node,out=[])=>{if(node===null||node===undefined)return out;if(Array.isArray(node)){node.forEach(x=>flatten(x,out));return out}out.push(node);if(node?.props?.children)flatten(node.props.children,out);return out};
const render=more=>{index=0;return GalleryCard({...props,...more})};
let card=render();let nodes=flatten(card);
assert.equal(card.props['data-image-state'],'without-image');
assert(card.props.className.includes('self-start'),'no-image card must not stretch to square image height');
assert(!nodes.some(x=>x?.type==='ProductImage'),'no-image card must not render a blank media area');
assert(nodes.some(x=>x?.type==='OrderControl'),'ordering must remain available');
for(const label of ['AR_123','صحن تقديم عربي','المتوفر:','الشد:','السعر:'])
  assert(nodes.some(x=>typeof x==='string'&&x.includes(label)),label+' visible in no-image card');

card=render({showImage:true});nodes=flatten(card);
assert.equal(card.props['data-image-state'],'with-image');
const image=nodes.find(x=>x?.type==='ProductImage');
assert(image,'product with image retains gallery layout');
image.props.onMissing();
card=render({showImage:true});nodes=flatten(card);
assert.equal(card.props['data-image-state'],'without-image','broken image changes to compact card');
assert(!nodes.some(x=>x?.type==='ProductImage'),'broken image must no longer occupy the media area');
console.log('V120_GALLERY_CARD_PASS: compact image-less card, details and ordering, broken image fallback');
