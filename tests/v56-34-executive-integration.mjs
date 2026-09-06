import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const api=read('api/new-arrivals-admin.js');
const enhancements=read('v54-admin-enhancements.js');
const canvas=read('v54-1-desktop-canvas-fix.css');
const nav=read('v46-admin-nav.js');

// V56.35 keeps the V56.34 executive integration but upgrades New Arrivals
// identity handling and fully embeds the security command center in admin home.
assert.match(api,/RELEASE_VERSION = '56\.35'/);
assert.match(api,/resolveCanonicalSku/);
assert.match(api,/const digits=value=>String\(value\|\|''\)\.replace\(\/\\D\/g,''\)/);
assert.match(api,/if\(inventory\.includes\(requested\)\)return requested/);
assert.match(api,/inventory\.filter\(id=>digits\(id\)===shorthand\)/);
assert.match(api,/if\(matches\.length===1\)return matches\[0\]/);
assert.match(api,/options\.action==='remove'/);
assert.match(api,/active\.length===1/);
assert.match(api,/async function validateSku/);
assert.match(api,/const sku=await validateSku/);

assert.match(enhancements,/VERSION='56\.35'/);
assert.match(enhancements,/removeLegacySecurityLaunchers/);
for (const id of ['v51-security','v52-mobile-security','v52-sheet-security','v48-security-btn','v49-security-tab','v49-security-fallback']) {
  assert.ok(enhancements.includes(`'${id}'`), `legacy security launcher ${id} must be retired`);
}
assert.match(enhancements,/الموظفون والعملاء/);
assert.match(enhancements,/customerLinks\.forEach\(a=>a\.remove\(\)\)/);
assert.match(enhancements,/data-v56-security-center/);
assert.match(enhancements,/q\.get\('section'\)==='security'/);
assert.match(enhancements,/admin-home\.html#security-command-center/);
assert.match(enhancements,/id='v56-security-command-center'/);
assert.match(enhancements,/مركز القيادة والتحكم الأمني/);
assert.match(enhancements,/security-center\.html\?embed=executive&v=56\.35/);
assert.match(enhancements,/active\.scrollIntoView\(\{block:'nearest',inline:'center',behavior:'smooth'\}\)/);
assert.match(enhancements,/attributeFilter:\['data-active'\]/);
assert.match(enhancements,/__V56_35_EXECUTIVE_INTEGRATION/);
assert.match(nav,/v54-admin-enhancements\.js/);

// The desktop canvas layer remains the V56.34 foundation beneath V56.35.
assert.match(canvas,/V56\.34/);
assert.match(canvas,/background:var\(--admin-bg,#f5f7f6\)!important/);
assert.match(canvas,/body\.v51-admin-dashboard:not\(\.v56-security-embedded\) #root>div\.fixed\.inset-0>div/);
assert.match(canvas,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/);
assert.match(canvas,/\.v56-security-frame/);

console.log('V56.35 executive integration regression: PASS');
