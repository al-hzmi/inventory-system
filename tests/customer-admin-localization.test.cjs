const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/standalone');

const html = fs.readFileSync('admin-dashboard.html', 'utf8');
const source = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/)?.[1];
assert.ok(source, 'Admin dashboard Babel source must be present');

const dictionaryText = source.match(/const CUSTOMER_UI_EN=(\{[^\n]*\});/)?.[1];
assert.ok(dictionaryText, 'Customer dictionary must be centralized');
const dictionary = JSON.parse(dictionaryText);

test('customer management source compiles through the production Babel preset', () => {
  assert.doesNotThrow(() => babel.transform(source, { presets: ['react'], sourceType: 'script' }));
});

test('business terminology has complete distinct English labels', () => {
  const expected = {
    'العملاء': 'Customers',
    'إدارة العميل': 'Manage Customer',
    'الطلبات': 'Orders',
    'المسودات': 'Drafts',
    'الجلسات والدخول': 'Sessions and Sign-ins',
    'إجمالي الكراتين': 'Total Cartons',
    'تعذر حفظ البيانات.': 'Unable to save changes.',
  };
  for (const [ar, en] of Object.entries(expected)) assert.equal(dictionary[ar], en);
});

test('language switching remains scoped, accessible and does not navigate', () => {
  assert.match(source, /useState\(readCustomerUiLocale\)/);
  assert.match(source, /setCustomerLanguage\('en'\)/);
  assert.match(source, /setCustomerLanguage\('ar'\)/);
  assert.match(source, /aria-pressed=\{customerLanguage==='en'\}/);
  assert.match(source, /data-customer-lang=\{area==='customers'/);
  assert.match(source, /lang=\{area==='customers'\?customerLanguage:'ar'\}/);
  assert.doesNotMatch(source.slice(source.indexOf('const CUSTOMER_UI_LOCALE_KEY'), source.indexOf('const useBodyScrollLock=')), /location\.reload\(/);
});

test('translation helper preserves Arabic default and formats currency labels without changing numbers', () => {
  const a = source.indexOf('const CUSTOMER_UI_LOCALE_KEY=');
  const b = source.indexOf('const useBodyScrollLock=', a);
  assert.ok(a >= 0 && b > a);
  const env = { localStorage: { getItem: () => null }, output: null };
  vm.runInNewContext(source.slice(a, b) + `
    output = {
      initial: readCustomerUiLocale(),
      arabic: cT('الطلبات'),
      english: (customerUiLang='en', cT('الطلبات')),
      amount: cT('1,234.5 ر.س'),
      fallback: cT('SKU-12345')
    };
  `, env);
  assert.equal(env.output.initial, 'ar');
  assert.equal(env.output.arabic, 'الطلبات');
  assert.equal(env.output.english, 'Orders');
  assert.equal(env.output.amount, '1,234.5 SAR');
  assert.equal(env.output.fallback, 'SKU-12345');
});

test('no customer-field or status code migration is tied to the chosen language', () => {
  for (const token of ["customerUid:'", "showNewArrivalsOverride", "status:'deleted'", "customer_orders", "customer_drafts"]) {
    assert.ok(source.includes(token), token);
  }
  assert.ok(!/collection\(\s*customerLanguage/.test(source));
});
