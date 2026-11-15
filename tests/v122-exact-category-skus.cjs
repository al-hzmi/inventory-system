const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = path => fs.readFileSync(path, 'utf8');

const employee = read('runtime/index-v37-source.txt');
const customer = read('runtime/customer-v37-source.txt');
const categoriesText = read('data/categories.tsv');
const knownExact = new Set(['AR_285', 'AR_296', 'BA_301', 'JAA_300006', 'JAA_300008']);
const digits = value => String(value || '').replace(/\D/g, '');
const sku = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

function extract(text, before, after) {
  const start = text.indexOf(before), end = text.indexOf(after, start);
  assert(start >= 0 && end > start, `Missing category source markers: ${before}`);
  return text.slice(start, end);
}

function makeEmployee() {
  const code = extract(employee, 'const parseCategories =', 'const categoryDocId =');
  return new Function('normalizeCleanId', 'normalizeImageSku', 'EXACT_CATEGORY_SKUS', 'CATEGORY_UNASSIGNED',
    `${code}\nreturn {parseCategories,buildEffectiveCategories,buildCategoryLookup,categoryForItem,categoryKeyForItem};`
  )(digits, sku, knownExact, '__UNCATEGORIZED__');
}

function makeCustomer() {
  const identity = extract(customer, 'const normalizeCategoryKey =', 'const normalizeText =');
  const categories = extract(customer, 'function parseCategories(text)', 'function imageUrl(file)');
  return new Function('normalizeCleanId', 'normalizeSkuKey', 'EXACT_CATEGORY_SKUS', 'CATEGORY_UNASSIGNED',
    `${identity}\n${categories}\nreturn {parseCategories,effectiveCategories,categoryLookup,categoryForItem};`
  )(digits, sku, knownExact, '__UNCATEGORIZED__');
}

const scenarios = [
  ['AR_285', 'البلاستيك', 'BA_285'],
  ['AR_296', 'البلاستيك', 'BA_296'],
  ['BA_301', 'البلاستيك', 'MS_301_C'],
  ['JAA_300006', 'الألعاب والسباحة', 'QBU_300006'],
  ['JAA_300008', 'الألعاب والسباحة', 'QBU_300008']
];
for (const [name, api] of [['employee', makeEmployee()], ['customer', makeCustomer()]]) {
  const base = api.parseCategories(categoriesText);
  const effective = name === 'employee' ? api.buildEffectiveCategories : api.effectiveCategories;
  const lookup = name === 'employee' ? api.buildCategoryLookup : api.categoryLookup;
  const bySku = lookup(effective(base, {}, {}));
  for (const [id, expected, otherSku] of scenarios) {
    const item = { id, cleanId:digits(id), imageSku:id };
    assert.equal(api.categoryForItem(item, bySku), expected, `${name}: ${id} correctly classified`);
    assert.equal(api.categoryForItem({id:otherSku,cleanId:digits(otherSku),imageSku:otherSku},bySku),null,
      `${name}: ${id} must not move the unrelated ${otherSku}`);
  }
  const oldNumeric = lookup(effective(base, {'285':{cleanId:'285',category:'العُدد'}}, {}));
  assert.equal(api.categoryForItem({id:'AR_285',cleanId:'285'}, oldNumeric),'البلاستيك',
    `${name}: legacy numeric override must not hijack the exact AR_285 category`);
  assert.equal(api.categoryForItem({id:'BA_285',cleanId:'285'}, oldNumeric),'العُدد',
    `${name}: legacy BA_285 category must remain intact`);

  const moved = lookup(effective(base, {'sku:AR_285':{categoryKey:'sku:AR_285',cleanId:'285',category:'الألعاب والسباحة'}}, {}));
  assert.equal(api.categoryForItem({id:'AR_285',cleanId:'285'},moved),'الألعاب والسباحة',
    `${name}: admin can move an exact-SKU item`);
  assert.equal(api.categoryForItem({id:'BA_285',cleanId:'285'},moved),null,
    `${name}: admin moving AR_285 must not move BA_285`);
  const unassigned = lookup(effective(base, {'sku:AR_285':{categoryKey:'sku:AR_285',cleanId:'285',category:'__UNCATEGORIZED__'}}, {}));
  assert.equal(api.categoryForItem({id:'AR_285',cleanId:'285'},unassigned),null,
    `${name}: admin can unassign an exact-SKU item`);
}

assert.match(employee, /const cleanId = normalizeCategoryKey\(row.categoryKey \|\| doc.id \|\| row.cleanId\)/);
assert.match(customer, /normalizeCategoryKey\(value.categoryKey\|\|doc.id\|\|value.cleanId\)/);
assert.match(employee, /return pool.filter\(i => categoryForItem\(i, currentCategoryById\) === activeCategory/);
assert.match(read('index.html'), /exact-categories=122/);
assert.match(read('customer.html'), /exact-categories=122/);
assert.match(read('sw.js'), /batco-navigation-shell-v118-fresh-employee-showroom-bilingual-v122/);
console.log('V122_EXACT_CATEGORY_SKUS_PASS: five full-SKU assignments, collision isolation, legacy overrides, admin move and undo semantics, revised employee/customer shells');
