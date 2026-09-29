import fs from 'node:fs';

const fail = msg => { throw new Error(msg); };
const src = fs.readFileSync('runtime/index-v37-source.txt','utf8');
const index = fs.readFileSync('index.html','utf8');
const customer = fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const archiveText = fs.readFileSync('data/depleted_inventory.tsv','utf8');

for (const marker of [
  'MAX_DEPLETED_SKU_RESULTS = 8',
  'const parseDepletedArchive',
  'depleted_inventory.tsv',
  'setDepletedCatalog(depleted)',
  'availableVisible.concat(depletedVisible)',
  'المتوفر يظهر أولاً دائمًا',
  'نفد من المخزون',
  'حفظ في الصور / مشاركة',
  "item?.imageFile ||"
]) if (!src.includes(marker)) fail('Missing V56.79 marker: '+marker);

if (!src.includes('hideOutOfStockInSearchWithImage : false')) fail('Image search still hides depleted products');
if (!index.includes("rev=56.79")) fail('Employee runtime cache revision was not bumped');
if (customer.includes('depleted_inventory.tsv')) fail('Depleted archive must stay out of customer sales portal');

const productStart = src.indexOf('const ProductImage =');
const productEnd = src.indexOf('const Lightbox =', productStart);
if (productStart < 0 || productEnd < 0) fail('ProductImage block missing');
const product = src.slice(productStart, productEnd);
if (!product.includes('onClick={openActions}')) fail('A normal image tap must open save/share actions');
if (!product.includes('navigator.share')) fail('Native iOS share path missing');
if (!product.includes('new File([')) fail('Native share must receive an actual image File');
if (!product.includes('حفظ في الصور / مشاركة')) fail('iPhone save/share primary action missing');
if (!product.includes('فتح الصورة الأصلية')) fail('Original-image fallback missing');
if (product.includes("WebkitTouchCallout: 'none'")) fail('Native iOS image interaction must not be disabled');
if (product.includes('onPointerDown={startHold}')) fail('Saving must not require long press anymore');

const runStart = src.indexOf('const runSearch =');
const runEnd = src.indexOf('const stockTone =', runStart);
if (runStart < 0 || runEnd < 0) fail('runSearch block missing');
const runCode = src.slice(runStart, runEnd);
const getRunSearch = new Function(
  'normalizeCleanId','normalizeText','MIN_NAME_QUERY_LENGTH','MAX_SKU_RESULTS','MAX_NAME_RESULTS','MAX_DEPLETED_SKU_RESULTS','MAX_DEPLETED_NAME_RESULTS',
  runCode+'\nreturn runSearch;'
);
const normalizeCleanId = value => String(value||'').replace(/\D/g,'');
const normalizeText = value => String(value||'').toLowerCase().trim().replace(/\s+/g,' ');
const runSearch = getRunSearch(normalizeCleanId,normalizeText,2,5,15,8,8);

const availableSimilar = {uid:'j:1234',id:'BA_1234',cleanId:'1234',searchName:'طاولة كبيرة',qty:8};
const depletedExact = {uid:'d:123',id:'BA_123',cleanId:'123',searchName:'طاولة قديمة',qty:0,isDepletedArchive:true,imageFile:'123.webp'};
let r = runSearch([availableSimilar],'123',false,[depletedExact]);
if (r.visible[0]?.id !== 'BA_1234') fail('Available similar SKU must stay ahead of depleted exact SKU');
if (!r.visible.some(x=>x.id==='BA_123')) fail('Depleted exact SKU must remain searchable after available results');
if (r.exact) fail('Depleted exact must not jump ahead while an available match exists');

const availableExact = {uid:'j:123',id:'AR_123',cleanId:'123',searchName:'طاولة متوفرة',qty:2};
r = runSearch([availableExact,availableSimilar],'123',false,[depletedExact]);
if (r.exact?.id !== 'AR_123') fail('Available exact SKU must be the exact result');
if (r.visible[0]?.id !== 'AR_123') fail('Available exact SKU must be first');

r = runSearch([],'123',false,[depletedExact]);
if (r.exact?.id !== 'BA_123') fail('Depleted exact SKU should become exact only when no available match exists');

const availableName = {uid:'j:n',id:'BA_900',cleanId:'900',searchName:'سطل دعسة كبير',qty:3};
const depletedName = {uid:'d:n',id:'BA_901',cleanId:'901',searchName:'سطل دعسة قديم',qty:0,isDepletedArchive:true};
r = runSearch([availableName],'سطل دعسة',false,[depletedName]);
if (r.visible[0]?.id !== 'BA_900') fail('Available name match must precede depleted name match');

const lines = archiveText.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
const headers = lines[0].split('\t');
for (const h of ['SKU','Name','ImageFile','LastSeen','SourceCommit']) if (!headers.includes(h)) fail('Archive missing header '+h);
const rows = lines.slice(1).map(line => {
  const c=line.split('\t'),o={};headers.forEach((h,i)=>o[h]=c[i]||'');return o;
});
if (rows.length < 400) fail('Depleted archive unexpectedly small: '+rows.length);
if (rows.filter(x=>x.Name.trim()).length < 100) fail('Too few historical names recovered');
if (rows.some(x=>!x.SKU.trim()||!x.ImageFile.trim())) fail('Archive contains row without SKU or image');
const pairs = new Set(rows.map(x=>x.SKU+'\t'+x.ImageFile));
if (pairs.size !== rows.length) fail('Duplicate depleted SKU/image pairs detected');

if (!src.includes("item.qty <= 0 ? <span") || !src.includes('نفد من المخزون')) fail('Zero-stock search cards must not expose order controls');
if (!src.includes("selectedSearchItem.isDepletedArchive ? 'أرشيف سابق'")) fail('Archived full result must be labelled as archive');
if (!src.includes("search.exact.isDepletedArchive ? 'أرشيف سابق'")) fail('Archived exact result must be labelled as archive');

console.log('V56.79_DEPLETED_SEARCH_IOS_IMAGE_PASS', {
  archiveRows: rows.length,
  namedArchiveRows: rows.filter(x=>x.Name.trim()).length,
  availableFirst: true,
  iPhoneTapToSave: true
});
