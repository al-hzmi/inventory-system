const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Babel = require('@babel/standalone');

const src = fs.readFileSync('runtime/index-v37-source.txt', 'utf8');
const entry = fs.readFileSync('index.html', 'utf8');
const from = src.indexOf('const quantityInCartons =');
const to = src.indexOf('const Quantity =', from);
assert.ok(from > 0 && to > from, 'the pure conversion helper must exist');

const toEnglishDigits = value => String(value).replace(/[٠-٩۰-۹]/g, char => {
  const arabic = '٠١٢٣٤٥٦٧٨٩', persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabicIndex = arabic.indexOf(char);
  return String(arabicIndex >= 0 ? arabicIndex : persian.indexOf(char));
});
const convert = vm.runInNewContext(src.slice(from, to) + '\nquantityInCartons;', { toEnglishDigits, Intl, Number, String });

assert.equal(convert(375, 'حبة', '60').cartons, 6.25);
assert.equal(convert(315, 'حبة', '60').cartons, 5.25);
assert.equal(convert(1386, 'حبة', '72').cartons, 19.25);
assert.equal(convert(0, 'حبة', '24').cartons, 0);
assert.equal(convert(5, 'حبة', '٢٤').cartons, 5 / 24);
assert.equal(convert(8, 'حبة', '1').cartons, 8);
for (const [qty, unit, pack] of [[375, 'كرتون', '60'], [30, 'حبة', '0'], [30, 'حبة', ''], [30, 'حبة', 'غير معلوم'], [-5, 'حبة', '12'], [Infinity, 'حبة', '12']]) {
  assert.equal(convert(qty, unit, pack), null, `unconvertible: ${qty}, ${unit}, ${pack}`);
}

let checked = 0;
for (const branch of ['jeddah', 'riyadh']) {
  const rows = fs.readFileSync(`data/${branch}.tsv`, 'utf8').trim().split(/\r?\n/).map(row => row.split('\t'));
  const headers = rows[0];
  const unitIndex = headers.findIndex(header => /الوحدة/.test(header));
  const qtyIndex = headers.findIndex(header => /الكمية المتوفرة/.test(header));
  const packIndex = headers.findIndex(header => /الشد/.test(header));
  assert.ok(unitIndex >= 0 && qtyIndex >= 0 && packIndex >= 0);
  const pieces = rows.slice(1).filter(cols => cols[unitIndex] === 'حبة');
  assert.ok(pieces.length > 0, `missing piece-unit catalog in ${branch}`);
  for (const row of pieces) {
    const converted = convert(Number(row[qtyIndex]), row[unitIndex], row[packIndex]);
    assert.ok(converted && Number.isFinite(converted.cartons), `invalid carton quantity: ${branch}, ${row[0]}`);
    assert.equal(converted.cartons * converted.perCarton, converted.pieces, `${branch}, ${row[0]}`);
    checked++;
  }
}

assert.equal((src.match(/<Quantity qty=\{item\.qty\} unit=\{item\.unit\} pack=\{item\.pack\}/g) || []).length, 4, 'search, compact search, detail and double-tap must display cartons');
assert.match(src, /original-piece-quantity/);
assert.match(src, /if \(taps >= 3\) next = CARD_VIEW\.DETAILS/);
assert.match(src, /search\.exact && <FullResultCard/);
assert.match(src, /const maxQty = item\.qty \|\| 0/, 'order quantity must continue to use unchanged source inventory');
assert.match(entry, /carton-display=117/, 'cache key must refresh on existing iPhone installations');

const jsx = src.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
assert.ok(jsx, 'employee React app must have its Babel source');
assert.ok(Babel.transform(jsx[1], { presets: ['react'] }).code.includes('quantityInCartons'), 'entire React employee app must compile');

console.log(`PASS V117: ${checked} piece-unit rows convert to cartons, both units display in search and gallery; original inventory/order values preserved`);
