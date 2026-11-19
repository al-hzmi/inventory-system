'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('runtime/customer-v37-source.txt', 'utf8');
const shell = fs.readFileSync('customer.html', 'utf8');
const categoriesTsv = fs.readFileSync('data/categories.tsv', 'utf8');

// Customer-only visibility: hide the discounted category on the home showcase
// and category picker, without modifying employee catalog or catalog data.
assert.match(source, /const HIDDEN_CUSTOMER_CATEGORY_KEYS = new Set\(\['المخفضه'\]\)/);
assert.match(source, /const all=Object\.keys\(categories\)\.filter\(name=>name&&!isHiddenCustomerCategory\(name\)\)/);
assert.match(source, /\[\.\.\.categoryNames,SPECIAL_UNCATEGORIZED\]\.filter\(name=>groups\.has\(name\)\)/);
assert.match(shell, /hide-discount-category=124/);
assert(categoriesTsv.split(/\r?\n/)[0].split('\t').some(name => name.trim() === 'المخفضة'),
  'the discount category should remain available for staff');

// Run the actual category selection code with realistic category metadata.
// It must ignore a discounted category even when admin orders it first.
const textStart = source.indexOf('const normalizeText = s =>');
const hookStart = source.indexOf('  const categoryNames=useMemo(()=>{');
const hookEnd = source.indexOf('\n\n  const catalogCategory=', hookStart);
assert(textStart >= 0 && hookStart >= 0 && hookEnd > hookStart);
const selector = new Function('categories', 'window', 'useMemo', 'toEnglishDigits',
  source.slice(textStart, source.indexOf('const clamp =', textStart)) +
  source.slice(hookStart, hookEnd) + '\nreturn categoryNames;');
const data = {
  'المخفضة': ['AR_13798'],
  'المُخفّضة': ['AR_14351'],
  'المخفضة ': ['AR_14352'],
  'الألعاب والسباحة': ['JAA_300006'],
  'الأواني المنزلية': ['AR_289']
};
const visible = selector(data, {__customerPortalControl: {
  categoryOrder: ['المخفضة', 'الألعاب والسباحة']
}}, fn => fn(), String);
assert.deepEqual(Array.from(visible), ['الألعاب والسباحة', 'الأواني المنزلية']);
console.log('V124_CUSTOMER_HIDE_DISCOUNT_CATEGORY_PASS');
