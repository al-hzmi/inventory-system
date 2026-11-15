// Conservative, repeatable name-based suggestions for BATCO's base categories.
// Does not write inventory, stock, prices, or Firestore. `--patch` outputs a
// reviewable patch that only appends new SKU membership rows to categories.tsv.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const cleanId = value => String(value || '').replace(/[^0-9\u0660-\u0669\u06f0-\u06f9]/g, '').replace(/[\u0660-\u0669\u06f0-\u06f9]/g, d => {
  const n = '٠١٢٣٤٥٦٧٨٩'.indexOf(d);
  return String(n >= 0 ? n : '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
});
const nameKey = value => String(value || '').toLowerCase().replace(/[\u064b-\u065f\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/[ىئ]/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
const readTsv = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean).map(row => row.split('\t'));
const inventories = new Map();
for (const warehouse of ['jeddah', 'riyadh']) {
  for (const row of readTsv(`data/${warehouse}.tsv`).slice(1)) {
    const sku = String(row[0] || '').trim(), key = cleanId(sku);
    if (!key) continue;
    const record = inventories.get(key) || { key, sku, name: String(row[1] || '').trim(), skuAliases: new Set() };
    record.skuAliases.add(sku);
    if (!record.name) record.name = String(row[1] || '').trim();
    inventories.set(key, record);
  }
}
const rows = readTsv('data/categories.tsv'), headers = rows[0].map(x => x.trim());
const alreadyAssigned = new Set();
for (const row of rows.slice(1)) row.forEach((value, col) => {
  const id = cleanId(value);
  if (id && headers[col]) alreadyAssigned.add(id);
});

function recommend(item) {
  const name = nameKey(item.name), sku = item.sku.toUpperCase();
  if (!name || /توالف|اصناف متنوعه/.test(name)) return null;
  if (/^BAT-004(09|10|11|12)$/.test(sku)) return null; // "مظلات" has no reliably matching existing section.
  // Do not mislabel other brands' shoes as "OGS".
  if (/احذي|حذاء/.test(name)) return /^(OGS|OSG)/.test(sku) ? 'أحذية OGS' : 'أحذية متنوعة';
  if (/برطمان|مرطمان/.test(name)) return 'البرطمان';
  if (/^OGS/.test(sku) && /مج|كاسه سفر|مطارات رياضيه|ماسك مجات|قش مع غطاء/.test(name)) return 'مجات OGS';
  if (/شوي|شواء|مشاوي|اسياخ/.test(name)) return 'أدوات الشواء';
  if (/^AR_259/.test(sku) && /العاب تعليمي/.test(name)) return 'القرطاسية'; // Neighboring 259xx educational SKUs already belong here.
  if (/بالونات ارقام|ادوات اعياد الميلاد/.test(name)) return 'التحف والهدايا';
  if (/بدكير|عنايه|شنط|مناشف|اغطيه سرير|كمامات|مشط شعر|عطر|فواحه|زيوت عطريه|مناديل اسطح معقم|بوكس اكسسوارات/.test(name)) return 'العناية والشنط';
  if (/مفاتيح سداسيه|زرادي|قفل|عدد كهربا|لصق كهربا|شريط لاصق|مسامير|مفك|دريل|شطرطون|كماشه|حبل خيش/.test(name) || (/^IBQ/.test(sku) && /^لصق$/.test(name))) return 'العُدد';
  if (/قرطاسيه|دفتر|اقلام|قلم رصاص|قلم حبر|دبابيس|سبوره|مقلميه/.test(name)) return 'القرطاسية';
  if (/العاب|كره قدم|مضرب تنس|تنس طاوله|بينج بونج|سباحه|واقي ركبه/.test(name)) return 'الألعاب والسباحة';
  if (/تحف|هدايا|زينة|زينه|صدف|ساعه رمليه|ساعات جداريه|مرايات|مراكن|قوار|اباجور|ابجور|اشجار|فازات|لوحات جداريه|برواز|مركن شجر|ديكور|بالونات حفلات/.test(name)) return 'التحف والهدايا';
  if (/حافظه|علبه مونه|علبه سكر|علبه بلاستيك|حافظات|سطل|سله|رفوف|رف حديد|رف حمام|رف صحون|رف خضار|رف بيضاوي|مشك صحون|صحن|صحون|صواني|ملاعق|معالق|مصفاه|صفايه|صفايات|سكاكين|كاس|كوب|اكواب|فنجان|براد|قدور|كسرولا|مطبخ|مغسله|مجلى|مناشف مطبخ|مناديل مطبخ|مناديل ارضيات|سلال تخزين|سلال|غاز|تنظيف|قالب|فراده|فراد عجين|حفار محشي|ابريق|سفر طاوله|مقادير|لوح تقطيع|الواح تقطيع|سكريه|علب عصير|جاك عصير|حوض|طقم تقديم|صحن تقديم|صحن بوفيه|مغرفه|قهوه|شاهي|علبه|مونه|سله غسيل|كرت فواحه|تخزين|حمايه اثاث|فرشه دولاب|رول فرشه|لبادات|ملابس|دعاسات|غطاء المايكرويف|غطاء اسطوانه|كرسي|طاوله|مناديل|اكياس حفظ|اكياس نفايات|اكياس كريمه|خضاض|مضرب|سكر|رف تعليق|مقشره|استاند دولاب|ورق مطبخ|مايكرويف|قدر|كاب كيك|شوكه|ملعقه|مفارش|قاعدة كراسي|قاعده كراسي|حاجز باب|مقبض|مسكات باب|مطارات|زمزميات|سرير اطفال|عربيه نظافه|رول تنشيف|فرشات قماش|جالون|شاف|علاقه الهنا|حمايه الاطفال/.test(name)) return 'الأواني المنزلية';
  return null;
}

const suggestions = [], pending = [];
for (const item of inventories.values()) {
  if (alreadyAssigned.has(item.key)) continue;
  if (item.skuAliases.size > 1) { pending.push({ ...item, reason:'numeric SKU collision' }); continue; }
  const category = recommend(item);
  if (!category || (!headers.includes(category) && category !== 'أحذية متنوعة')) pending.push({ ...item, reason:'uncertain category' });
  else suggestions.push({ sku:item.sku, name:item.name, key:item.key, category });
}
suggestions.sort((a,b) => a.category.localeCompare(b.category, 'ar') || a.sku.localeCompare(b.sku,'en',{numeric:true}));

if (process.argv.includes('--patch')) {
  const header = rows[0].join('\t'), outHeaders = [...headers];
  // Column zero is an intentionally empty spacer in the original TSV; using
  // it for "أحذية متنوعة" does not alter existing category memberships.
  if (outHeaders[0] && outHeaders[0] !== 'أحذية متنوعة') throw new Error('RESERVED_CATEGORY_COLUMN_ALREADY_USED');
  outHeaders[0] = 'أحذية متنوعة';
  const eligible = suggestions.filter(x => outHeaders.includes(x.category));
  console.log('*** Begin Patch');
  console.log('*** Update File: '+path.join(root, 'data/categories.tsv'));
  console.log('@@');
  if (!headers[0]) {
    console.log('-'+header);
    console.log('+'+['أحذية متنوعة',...rows[0].slice(1)].join('\t'));
  } else console.log(' '+header);
  for (const entry of eligible) {
    const cells = new Array(outHeaders.length).fill('');
    cells[outHeaders.indexOf(entry.category)] = entry.sku;
    console.log('+'+cells.join('\t').replace(/\t+$/,''));
  }
  console.log('*** End Patch');
} else {
  const counts = Object.fromEntries([...new Set(suggestions.map(x => x.category))].map(cat => [cat,suggestions.filter(x => x.category === cat).length]));
  console.log(JSON.stringify({stockedSkus:inventories.size,alreadyAssigned:alreadyAssigned.size,suggestions:suggestions.length,pending:pending.length,byCategory:counts,pendingItems:pending.map(x=>({sku:x.sku,name:x.name,reason:x.reason}))},null,2));
}
