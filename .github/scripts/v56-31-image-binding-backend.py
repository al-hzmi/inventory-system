#!/usr/bin/env python3
from pathlib import Path

ALBUM = Path('image-distribution.html')
EMP = Path('runtime/index-v37-source.txt')
CUST = Path('runtime/customer-v37-source.txt')
INDEX = Path('index.html')
CUSTOMER_LOADER = Path('customer.html')
LEGACY_TEST = Path('tests/v56-27-image-binding-wiring.mjs')
NEW_TEST = Path('tests/v56-31-image-binding-backend.mjs')


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'V56.31 anchor missing: {label}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# 1) Standalone image album: all persistence goes through the configured
#    Vercel server API. The browser no longer writes the Firestore control doc.
# -----------------------------------------------------------------------------
a = ALBUM.read_text(encoding='utf-8')
init_anchor = "if(!firebase.apps.length)firebase.initializeApp(cfg);const db=firebase.firestore();const text=async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw Error(p);return r.text()};"
api_helpers = """const imageAdminProof=()=>{try{return JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null')||{}}catch{return{}}};
const imageAdminToken=()=>{try{return String(localStorage.getItem('inventory_admin_token_v2')||'')}catch{return''}};
const loadServerBindings=async()=>{const r=await fetch('./api/image-admin?action=bindings',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'BINDINGS_LOAD_FAILED');return d.bindings||{}};
"""
if 'const loadServerBindings=async()=>' not in a:
    if init_anchor not in a:
        raise SystemExit('V56.31 anchor missing: album firebase init')
    a = a.replace(init_anchor, init_anchor + '\n' + api_helpers, 1)

bind_start = 'async function bind(item,button){'
toast_start = '\nfunction toast('
bi = a.find(bind_start)
bj = a.find(toast_start, bi)
if bi < 0 or bj < 0:
    raise SystemExit('V56.31 anchor missing: album bind function')
new_bind = """async function bind(item,button){if(!state.selected||state.busy)return;const sku=norm(item.id),imageKey=state.selected.key;if(!confirm(`ربط الصورة ${imageKey} بالصنف ${item.id}؟`))return;state.busy=true;button.disabled=true;const old=button.innerHTML;button.textContent='جاري الحفظ…';sheetHint.textContent='جاري حفظ الربط على الخادم، لا تغلق الصفحة…';try{const r=await Promise.race([fetch('./api/image-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'bind',sku,imageKey,updatedBy:'مهند',adminToken:imageAdminToken(),adminProof:imageAdminProof()})}),new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(Error('SAVE_TIMEOUT'),{code:'SAVE_TIMEOUT'})),15000))]);const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d.error||'BIND_FAILED'),{status:r.status});const saved=norm(d.saved||d.bindings?.[sku]||'');if(saved!==imageKey)throw Error('VERIFY_FAILED');state.bindings=d.bindings||{...state.bindings,[sku]:imageKey};state.busy=false;closeSheet();toast(`تم ربط ${imageKey} بالصنف ${item.id} ✓`);refresh()}catch(e){console.error('[V56.31 image album bind]',e);state.busy=false;button.disabled=false;button.innerHTML=old;sheetHint.textContent='تعذر الحفظ. يمكنك المحاولة مرة أخرى دون تحديث الصفحة.';const msg=String(e?.message||'');toast(e?.code==='SAVE_TIMEOUT'?'تأخر الخادم أكثر من المعتاد. تحقق من الإنترنت وحاول مرة أخرى.':(/جلسة|الصنف|الصورة|مهيأة/.test(msg)?msg:'تعذر حفظ الربط على الخادم. لم يتم إغلاق النافذة حتى تتمكن من المحاولة مرة أخرى.'),true)}}"""
a = a[:bi] + new_bind + a[bj:]

old_boot = "(async()=>{try{const [imgs,j,r,snap]=await Promise.all([text('./data/images_list.txt'),text('./data/jeddah.tsv'),text('./data/riyadh.tsv'),db.collection('system_controls').doc('product_image_bindings').get()]);state.images=parseImages(imgs);state.items=uniqueItems([...parseInv(j),...parseInv(r)]).sort((a,b)=>a.id.localeCompare(b.id,'ar',{numeric:true}));state.bindings=snap.exists?(snap.data().bindings||{}):{};refresh()}catch(e){console.error(e);grid.innerHTML='<div class=\"card empty\">تعذر تحميل بيانات الصور أو الأصناف. أعد المحاولة.</div>'}})();"
new_boot = "(async()=>{try{const [imgs,j,r,bindings]=await Promise.all([text('./data/images_list.txt'),text('./data/jeddah.tsv'),text('./data/riyadh.tsv'),loadServerBindings()]);state.images=parseImages(imgs);state.items=uniqueItems([...parseInv(j),...parseInv(r)]).sort((a,b)=>a.id.localeCompare(b.id,'ar',{numeric:true}));state.bindings=bindings||{};refresh()}catch(e){console.error(e);grid.innerHTML='<div class=\"card empty\">تعذر تحميل بيانات الصور أو الأصناف. أعد المحاولة.</div>'}})();"
a = replace_once(a, old_boot, new_boot, 'album boot bindings')
ALBUM.write_text(a, encoding='utf-8')

# -----------------------------------------------------------------------------
# 2) Employee runtime: server API is the single source for manual image
#    bindings. Replace direct Firestore writes AND the old Firestore listener.
# -----------------------------------------------------------------------------
s = EMP.read_text(encoding='utf-8')
old_load = """const loadImageBindingOverrides = async () => {
    try {
        const db = await getDb();
        const snap = await db.collection('system_controls').doc(IMAGE_BINDING_DOC).get();
        return snap.exists ? (snap.data()?.bindings || {}) : {};
    } catch (err) {
        console.warn('[V56.25 image bindings]', err);
        return {};
    }
};"""
new_load = """const loadImageBindingOverrides = async () => {
    try {
        const r = await fetch('./api/image-admin?action=bindings', { cache: 'no-store' });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'IMAGE_BINDINGS_LOAD_FAILED');
        return data?.bindings || {};
    } catch (err) {
        console.warn('[V56.31 image bindings]', err);
        return {};
    }
};"""
s = replace_once(s, old_load, new_load, 'employee binding load')

save_marker = "const saveImageBindingOverride = async ({ sku, imageKey, updatedBy = 'مهند' }) => {"
remove_marker = "const removeImageBindingOverride = async ({ sku, updatedBy = 'مهند' }) => {"
parse_marker = 'const parseCategories = (text) => {'
if "const imageAdminProof = () =>" not in s:
    i = s.find(save_marker); j = s.find(remove_marker, i); k = s.find(parse_marker, j)
    if min(i,j,k) < 0:
        raise SystemExit('V56.31 anchor missing: employee image mutators')
    mutators = """const imageAdminProof = () => { try { return JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2') || 'null') || {}; } catch { return {}; } };
const imageAdminToken = () => { try { return String(localStorage.getItem('inventory_admin_token_v2') || ''); } catch { return ''; } };
const saveImageBindingOverride = async ({ sku, imageKey, updatedBy = 'مهند' }) => {
    const exactSku = normalizeImageSku(sku), exactImage = normalizeImageSku(imageKey);
    if (!exactSku || !exactImage) throw new Error('INVALID_IMAGE_BINDING');
    const r = await fetch('./api/image-admin', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'bind',sku:exactSku,imageKey:exactImage,updatedBy,adminToken:imageAdminToken(),adminProof:imageAdminProof()}) });
    const data = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error(data?.error || 'IMAGE_BINDING_SAVE_FAILED');
    if(normalizeImageSku(data?.saved || data?.bindings?.[exactSku] || '') !== exactImage) throw new Error('VERIFY_FAILED');
    return data;
};
const removeImageBindingOverride = async ({ sku, updatedBy = 'مهند' }) => {
    const exactSku = normalizeImageSku(sku);
    if(!exactSku) throw new Error('INVALID_IMAGE_BINDING');
    const r = await fetch('./api/image-admin', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'unbind',sku:exactSku,updatedBy,adminToken:imageAdminToken(),adminProof:imageAdminProof()}) });
    const data = await r.json().catch(() => ({}));
    if(!r.ok) throw new Error(data?.error || 'IMAGE_BINDING_REMOVE_FAILED');
    if(Object.prototype.hasOwnProperty.call(data?.bindings || {}, exactSku)) throw new Error('VERIFY_FAILED');
    return data;
};

"""
    s = s[:i] + mutators + s[k:]

old_sync = """    // V56.25: مزامنة روابط الصور اليدوية فورياً على كل الأجهزة المفتوحة.
    useEffect(() => {
        let unsub = null;
        let alive = true;
        getDb().then(db => {
            if (!alive) return;
            unsub = db.collection('system_controls').doc(IMAGE_BINDING_DOC).onSnapshot(snap => {
                const next = snap.exists ? (snap.data()?.bindings || {}) : {};
                setImageBindingOverrides(next);
                setImagesList(buildResolvedImagesMap(rawImagesList, databases, next));
            }, err => console.warn('[V56.25 image bindings sync]', err));
        }).catch(err => console.warn('[V56.25 image bindings sync]', err));
        return () => { alive = false; if (unsub) unsub(); };
    }, [rawImagesList, databases]);
"""
new_sync = """    // V56.31: مزامنة روابط الصور من مخزن الخادم، بدون الرجوع إلى وثيقة Firestore القديمة.
    useEffect(() => {
        let alive = true;
        const refreshBindings = async () => {
            try {
                const next = await loadImageBindingOverrides();
                if (!alive) return;
                setImageBindingOverrides(next);
                setImagesList(buildResolvedImagesMap(rawImagesList, databases, next));
            } catch (err) { console.warn('[V56.31 image bindings sync]', err); }
        };
        refreshBindings();
        const timer = setInterval(() => { if (document.visibilityState === 'visible') refreshBindings(); }, 15000);
        const onFocus = () => refreshBindings();
        window.addEventListener('focus', onFocus);
        return () => { alive = false; clearInterval(timer); window.removeEventListener('focus', onFocus); };
    }, [rawImagesList, databases]);
"""
s = replace_once(s, old_sync, new_sync, 'employee binding sync')
EMP.write_text(s, encoding='utf-8')

# -----------------------------------------------------------------------------
# 3) Customer runtime: same server-side source so corrected mappings are visible
#    to customers after reload, rather than reading the obsolete Firestore doc.
# -----------------------------------------------------------------------------
c = CUST.read_text(encoding='utf-8')
old_c = """async function loadCustomerImageBindings(){
  try{const snap=await db.collection('system_controls').doc('product_image_bindings').get();return snap.exists?(snap.data()?.bindings||{}):{}}catch(e){console.warn('[V56.25 customer image bindings]',e);return{}}
}"""
new_c = """async function loadCustomerImageBindings(){
  try{const r=await fetch('./api/image-admin?action=bindings',{cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error||'IMAGE_BINDINGS_LOAD_FAILED');return data?.bindings||{}}catch(e){console.warn('[V56.31 customer image bindings]',e);return{}}
}"""
c = replace_once(c, old_c, new_c, 'customer binding load')
CUST.write_text(c, encoding='utf-8')

# -----------------------------------------------------------------------------
# 4) Cache bust both runtime loaders so phones do not keep the pre-fix cores.
# -----------------------------------------------------------------------------
idx = INDEX.read_text(encoding='utf-8')
old_core = "const CORE='./runtime/index-v37-source.txt?v=56.16&rev=56.27';"
new_core = "const CORE='./runtime/index-v37-source.txt?v=56.31&rev=image-binding-backend';"
idx = replace_once(idx, old_core, new_core, 'employee runtime cache bust')
INDEX.write_text(idx, encoding='utf-8')

cl = CUSTOMER_LOADER.read_text(encoding='utf-8')
old_customer_core = "const CORE='./runtime/customer-v37-source.txt?v=56.25';"
new_customer_core = "const CORE='./runtime/customer-v37-source.txt?v=56.31';"
cl = replace_once(cl, old_customer_core, new_customer_core, 'customer runtime cache bust')
CUSTOMER_LOADER.write_text(cl, encoding='utf-8')

# Keep the existing exact-SKU regression current with the new loader revision.
lt = LEGACY_TEST.read_text(encoding='utf-8')
lt = lt.replace("assert.ok(index.includes('index-v37-source.txt?v=56.16&rev=56.27'), 'V56.27 cache bust missing');", "assert.ok(index.includes('index-v37-source.txt?v=56.31&rev=image-binding-backend'), 'current image-binding cache bust missing');")
LEGACY_TEST.write_text(lt, encoding='utf-8')

NEW_TEST.write_text("""import fs from 'node:fs';
import assert from 'node:assert/strict';
const api=fs.readFileSync('api/image-admin.js','utf8');
const album=fs.readFileSync('image-distribution.html','utf8');
const emp=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const cust=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const index=fs.readFileSync('index.html','utf8');
const customer=fs.readFileSync('customer.html','utf8');
for(const x of ['image-bindings-state','writeBinding','bindImage',\"action === 'bindings'\",\"action === 'bind'\"]) assert.ok(api.includes(x),`api missing ${x}`);
for(const x of [\"./api/image-admin?action=bindings\",\"action:'bind'\",'imageAdminToken()','imageAdminProof()','VERIFY_FAILED']) assert.ok(album.includes(x),`album missing ${x}`);
assert.ok(!album.includes("doc('product_image_bindings').get()"),'album must not read legacy Firestore bindings');
assert.ok(!album.includes('db.runTransaction'),'album must not write Firestore transactions');
for(const x of [\"./api/image-admin?action=bindings\",\"action:'bind'\",\"action:'unbind'\",'setInterval(() =>','15000']) assert.ok(emp.includes(x),`employee runtime missing ${x}`);
assert.ok(!emp.includes("doc(IMAGE_BINDING_DOC).onSnapshot"),'old Firestore image binding listener must be removed');
assert.ok(cust.includes(\"./api/image-admin?action=bindings\"),'customer runtime must read server bindings');
assert.ok(!cust.includes("doc('product_image_bindings').get()"),'customer must not read legacy Firestore binding doc');
assert.ok(index.includes('index-v37-source.txt?v=56.31&rev=image-binding-backend'));
assert.ok(customer.includes('customer-v37-source.txt?v=56.31'));
console.log('V56.31 server-backed image binding regression: PASS');
""", encoding='utf-8')

print('V56.31 backend frontend patch applied')
