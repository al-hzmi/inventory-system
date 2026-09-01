import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin=fs.readFileSync('admin-dashboard.html','utf8');
const auth=fs.readFileSync('v48-auth-security.js','utf8');
const adminAuth=fs.readFileSync('v48-admin-security.js','utf8');
const boot=fs.readFileSync('index.html','utf8');
const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');
const stock=fs.readFileSync('stocktake.html','utf8');

// iOS bottom sheets must own the gesture while the background page is frozen.
assert.ok(admin.includes('const useBodyScrollLock=()=>{useEffect(()=>{'),'body scroll lock hook missing');
assert.ok(admin.includes("body.style.position='fixed'"),'body must be fixed while a message sheet is open');
assert.ok(admin.includes("html.style.overflow='hidden'"),'document scrolling must be disabled while message sheet is open');
assert.ok(admin.includes('requestAnimationFrame(()=>window.scrollTo(0,y))'),'closing a sheet must restore the exact original scroll position');
assert.ok(admin.includes("function EmployeeMessageModal({target,notifications,onClose}){\n  useBodyScrollLock();"),'employee message modal must lock background scrolling');
assert.ok(admin.includes("function CustomerMessageModal({target,onClose}){\n  useBodyScrollLock();"),'customer/guest message modal must lock background scrolling');
assert.ok(admin.includes('.admin-message-scroll{-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;touch-action:pan-y;min-height:0}'),'sheet content must remain independently scrollable on iOS');

// Fresh login proof must satisfy only the stale request it is newer than; future admin reauth still works.
assert.ok(auth.includes("const VERSION='55.1'"),'V48 auth fix version missing');
assert.ok(auth.includes('const proofStateFor='),'local verified photo proof helper missing');
assert.ok(auth.includes('const resetProofSatisfied='),'password-reset proof reconciliation missing');
assert.ok(auth.includes('proofState.verifiedAt>=epoch'),'initial watcher must accept a proof newer than the force epoch');
assert.ok(auth.includes('proofState.verifiedAt>=e'),'snapshot watcher must accept a proof newer than the force epoch');
assert.ok(auth.includes('forceReauthCompletedEpoch:epoch'),'completed force epoch must be persisted');
assert.ok(auth.includes('forceReauthCompletedEpoch:e'),'snapshot completion must be persisted');
assert.ok(auth.includes("if(d==='force')softLogout"),'genuine future forced reauth must remain enforced');
assert.ok(adminAuth.includes('forceReauthEpoch:epoch'),'admin must retain the ability to request a genuine new reauth');
assert.ok(boot.includes('./v48-auth-security.js?v=55.1'),'employee bootstrap must cache-bust the fixed auth layer');

// Stocktake V56.9 must be the surface linked by admin and employee shells.
assert.ok(shell.includes('admin-stocktake.html?embedded=1&v=56.9'),'admin stocktake shell must load V56.9');
assert.ok(shell.includes('stocktake.html?v=56.9'),'employee stocktake link must load V56.9');
assert.ok(stock.includes('المنجز حديثًا') || stock.includes('recentComplete') || stock.includes('v56-9-operator'),'V56.9 operator workflow missing');

console.log('V56.10 critical UX regression: OK');