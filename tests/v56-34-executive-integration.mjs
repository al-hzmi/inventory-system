import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const api=read('api/new-arrivals-admin.js');
const enhancements=read('v54-admin-enhancements.js');
const canvas=read('v54-1-desktop-canvas-fix.css');
const nav=read('v46-admin-nav.js');

assert.match(api,/RELEASE_VERSION = '56\.34'/);
assert.match(api,/resolveCanonicalSku/);
assert.match(api,/const digits=value=>String\(value\|\|''\)\.replace\(\/\\D\/g,''\)/);
assert.match(api,/if\(inventory\.includes\(requested\)\)return requested/);
assert.match(api,/inventory\.filter\(id=>digits\(id\)===shorthand\)/);
assert.match(api,/if\(matches\.length===1\)return matches\[0\]/);
assert.match(api,/async function validateSku/);
assert.match(api,/const sku=await validateSku/);

assert.match(enhancements,/VERSION='56\.34'/);
assert.match(enhancements,/removeLegacySecurityLaunchers/);
assert.match(enhancements,/\['v51-security','v52-mobile-security','v52-sheet-security'\]/);
assert.match(enhancements,/الموظفون والعملاء/);
assert.match(enhancements,/customerLinks\.forEach\(a=>a\.remove\(\)\)/);
assert.match(enhancements,/data-v56-security-center/);
assert.match(enhancements,/admin-dashboard\.html\?section=security/);
assert.match(enhancements,/مركز القيادة والتحكم الأمني/);
assert.match(enhancements,/security-center\.html\?embed=executive&v=56\.34/);
assert.match(enhancements,/root\.style\.setProperty\('display','none','important'\)/);
assert.match(enhancements,/__V56_34_EXECUTIVE_INTEGRATION/);
assert.match(nav,/v54-admin-enhancements\.js/);

assert.match(canvas,/V56\.34/);
assert.match(canvas,/background:var\(--admin-bg,#f5f7f6\)!important/);
assert.match(canvas,/body\.v51-admin-dashboard:not\(\.v56-security-embedded\) #root>div\.fixed\.inset-0>div/);
assert.match(canvas,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
assert.match(canvas,/\.v56-security-frame/);

console.log('V56.34 executive integration regression: PASS');
