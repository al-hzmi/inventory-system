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
assert(card.props.className.includes('w-full min-w-0'),'no-image card must occupy its whole row without squeezing product text');
assert(card.props.className.includes('col-span-full'),'no-image card must span the grid row instead of remaining half width');
assert(!card.props.className.includes('self-start'),'self-start caused text-only cards to shrink to their intrinsic width');
assert(!nodes.some(x=>x?.type==='ProductImage'),'no-image card must not render a blank media area');
assert(nodes.some(x=>x?.type==='OrderControl'),'ordering must remain available');
for(const label of ['AR_123','صحن تقديم عربي','المتوفر:','الشد:','السعر:'])
  assert(nodes.some(x=>typeof x==='string'&&x.includes(label)),label+' visible in no-image card');

card=render({isGrid:false});
assert(card.props.className.includes('w-full min-w-0'),'list-view text card fills the same row as image cards');
assert(!card.props.className.includes('col-span-full'),'grid-specific layout is not applied in list view');

card=render({showImage:true});nodes=flatten(card);
assert.equal(card.props['data-image-state'],'with-image');
assert(!card.props.className.includes('col-span-full'),'image card must retain its normal grid column');
const image=nodes.find(x=>x?.type==='ProductImage');
assert(image,'product with image retains gallery layout');
image.props.onMissing();
card=render({showImage:true});nodes=flatten(card);
assert.equal(card.props['data-image-state'],'without-image','broken image changes to compact card');
assert(!nodes.some(x=>x?.type==='ProductImage'),'broken image must no longer occupy the media area');
console.log('V123_GALLERY_CARD_PASS: full-width compact image-less card, original image layout, details and ordering, broken image fallback');
