import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('admin-home.html','utf8');
const nav = fs.readFileSync('v46-admin-nav.js','utf8');
const album = fs.readFileSync('image-distribution.html','utf8');

// Guard against accidentally replacing the executive admin home again.
assert.match(home,/اتجاه المبيعات · 30 يوم/);
assert.match(home,/أداء الفروع/);
assert.match(home,/ألبوم توزيع الصور/);
assert.match(home,/\.\/image-distribution\.html/);

// Existing admin shell must stay intact, with album added as one more destination.
for (const marker of ['الرئيسية','المبيعات','الموظفون','العملاء','الطلبات','الجرد','الصلاحيات','صحة النظام','أمان الدخول']) assert.ok(nav.includes(marker), `missing existing admin nav marker: ${marker}`);
assert.ok(nav.includes("['images','ألبوم الصور','./image-distribution.html']"));
assert.ok(nav.includes("const VERSION='55.5'"));

// Binding must never fail silently: visible busy state, bounded wait, error path, and read-after-write verification.
for (const marker of ["product_image_bindings",'Promise.race','SAVE_TIMEOUT','VERIFY_FAILED','جاري الحفظ','تعذر حفظ الربط']) assert.ok(album.includes(marker), `missing album save marker: ${marker}`);
assert.ok(album.includes("location.replace('./index.html?employee=1')"));
assert.ok(album.includes("location.href='./admin-home.html'"));
console.log('V56.30 image album integration regression: PASS');
