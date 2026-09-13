import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = p => fs.readFileSync(p, 'utf8');
const nav = read('v46-admin-nav.js');
const enhancements = read('v54-admin-enhancements.js');
const api = read('api/new-arrivals-admin.js');
const quick = read('v56-35-new-arrivals-quick-delete.js');
const runtime = read('runtime/index-v37-source.txt');

assert.match(nav,/const VERSION='56\.(?:35|3[6-9]|[4-9]\d)'/,'admin nav must remain V56.35+ compatible');
assert.match(nav, /section'\)==='security'.*admin-home\.html#security-command-center/s, 'legacy security route must redirect to executive home');
assert.ok(!nav.includes("href=\"./admin-dashboard.html?section=security\""), 'standalone security launcher must not remain');
assert.ok(nav.includes("['employees','الموظفون والعملاء'"), 'people navigation must remain unified');

assert.match(enhancements, /id='v56-security-command-center'|id=\"v56-security-command-center\"/, 'security center must be embedded in executive home');
assert.match(enhancements,/\.\/security-center\.html\?embed=executive&v=56\.(?:35|3[6-9]|[4-9]\d)/,'embedded security source must remain V56.35+ compatible');
assert.ok(enhancements.includes("doc.querySelector('header')?.remove()"), 'embedded security must retire its standalone header');
assert.ok(enhancements.includes('a[href*="security-center.html"]'), 'legacy direct security links must be removed');
assert.ok(enhancements.includes('a[href*="section=security"]'), 'legacy security dashboard links must be removed');
assert.ok(enhancements.includes("q.get('section')==='security'"), 'legacy security route guard must exist');
assert.ok(enhancements.includes('if(!clipped)return'), 'active module should move only when its horizontal tab is actually clipped');
assert.ok(enhancements.includes("active.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'})"), 'active employee module must recover visibility without smooth centering');
assert.ok(!enhancements.includes("inline:'center',behavior:'smooth'"), 'active tab must never snap back by smooth-centering');
assert.ok(!enhancements.includes('lastActiveNode')&&!enhancements.includes('nodeChanged=active!==lastActiveNode'), 'render recreation must not force recentering');
assert.ok(enhancements.includes('clipped=a.left<box.left+6||a.right>box.right-6'), 'active tab must recover only when the horizontal strip clips it');
assert.ok(enhancements.includes('observer.observe(home,{childList:true})')&&enhancements.includes('setTimeout(()=>observer.disconnect(),8000)'), 'only the bounded admin-home observer may remain');

assert.ok(runtime.includes('.map(normalizeImageSku).filter(Boolean)'), 'New Arrivals overrides must preserve canonical SKU');
assert.ok(runtime.includes("const cleanSku = normalizeImageSku(sku);"), 'New Arrivals mutations must send canonical SKU');
assert.ok(runtime.includes("new Set((newArrivalsMeta.items || []).map(row => normalizeImageSku(row.sku))"), 'New Arrivals metadata identity must be canonical');
assert.ok(runtime.includes("const sku = normalizeImageSku(item?.id || item?.cleanId || item);"), 'manual New Arrivals change must use exact SKU');
assert.ok(runtime.includes("newArrivalIds.has(normalizeImageSku(i.id))"), 'New Arrivals gallery filtering must use exact SKU');
assert.ok(runtime.includes('./v56-35-new-arrivals-quick-delete.js?v=56.35'), 'quick delete runtime must be loaded');

assert.ok(quick.includes("e.target.closest('.tap-card')"), 'quick delete must operate on product cards');
assert.ok(quick.includes('حذف من جديدنا'), 'quick delete must expose an explicit delete button');
assert.ok(quick.includes("action:'remove'"), 'quick delete must call remove API');
assert.ok(quick.includes("const candidates=text.match"), 'quick delete must extract the visible canonical SKU');
assert.ok(!quick.includes('location.reload'), 'quick delete must never reload the page');
assert.ok(quick.includes('captureScroll(card)'), 'quick delete must preserve the current scroll position');
assert.ok(quick.includes('card.remove()'), 'quick delete must remove the deleted card in place');
assert.ok(quick.includes("batco:new-arrivals-updated"), 'quick delete must emit an in-page update event');
assert.ok(quick.includes('removedSkus.add(sku)'), 'deleted items must remain suppressed during later in-page rerenders');

assert.match(api, /RELEASE_VERSION = '56\.35'/, 'API must be V56.35');
assert.ok(api.includes('inventory.includes(requested)'), 'exact SKU must win before shorthand matching');
assert.ok(api.includes('if(matches.length===1)return matches[0]'), 'a genuinely unique shorthand may resolve directly');
assert.ok(api.includes("options.action==='remove'"), 'ambiguous shorthand resolution must be restricted to removal');
assert.ok(api.includes('active.length===1'), 'ambiguous shorthand may resolve only when exactly one active New Arrivals SKU matches');
assert.ok(!/matches\.length>1[\s\S]{0,420}return matches\[0\]/.test(api), 'ambiguous SKU branch must never blindly pick its first match');

console.log('V56.35 navigation + New Arrivals regression: PASS');
