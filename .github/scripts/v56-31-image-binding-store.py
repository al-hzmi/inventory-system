#!/usr/bin/env python3
from pathlib import Path
import re

ALBUM = Path('image-distribution.html')
RUNTIME = Path('runtime/index-v37-source.txt')
SMOKE = Path('.github/workflows/v56-12-production-smoke.yml')
TEST = Path('tests/v56-31-image-binding-store.mjs')

album = ALBUM.read_text(encoding='utf-8')
runtime = RUNTIME.read_text(encoding='utf-8')
smoke = SMOKE.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'V56.31 anchor not found: {label}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# Album: stop creating/updating a new system_controls document from the browser.
# Store manual bindings as a namespaced field inside the already-established,
# admin-controlled permissions_v44 document. Keep the old dedicated document as
# a read-only legacy source so existing bindings continue to resolve.
# -----------------------------------------------------------------------------
if "IMAGE_BINDING_STORE_DOC='permissions_v44'" not in album:
    init_anchor = "if(!firebase.apps.length)firebase.initializeApp(cfg);const db=firebase.firestore();const text=async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw Error(p);return r.text()};"
    init_new = init_anchor + "\n" + r"""const IMAGE_BINDING_LEGACY_DOC='product_image_bindings',IMAGE_BINDING_STORE_DOC='permissions_v44',IMAGE_BINDING_STORE_FIELD='productImageBindings';
async function loadImageBindings(){const [legacySnap,storeSnap]=await Promise.all([db.collection('system_controls').doc(IMAGE_BINDING_LEGACY_DOC).get().catch(()=>null),db.collection('system_controls').doc(IMAGE_BINDING_STORE_DOC).get().catch(()=>null)]);const legacy=legacySnap?.exists?(legacySnap.data()?.bindings||{}):{},primary=storeSnap?.exists?(storeSnap.data()?.[IMAGE_BINDING_STORE_FIELD]||{}):{};return{...legacy,...primary}}
async function persistImageBinding(sku,imageKey){const ref=db.collection('system_controls').doc(IMAGE_BINDING_STORE_DOC),leaf=new firebase.firestore.FieldPath(IMAGE_BINDING_STORE_FIELD,sku),payload={[IMAGE_BINDING_STORE_FIELD]:{[sku]:imageKey},imageBindingsUpdatedAt:firebase.firestore.FieldValue.serverTimestamp(),imageBindingsUpdatedBy:'مهند',imageBindingsVersion:'56.31'};await Promise.race([ref.set(payload,{mergeFields:[leaf,'imageBindingsUpdatedAt','imageBindingsUpdatedBy','imageBindingsVersion']}),new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(Error('SAVE_TIMEOUT'),{code:'SAVE_TIMEOUT'})),12000))]);const verify=await ref.get(),primary=verify.exists?(verify.data()?.[IMAGE_BINDING_STORE_FIELD]||{}):{},saved=norm(primary?.[sku]||'');if(saved!==imageKey)throw Error('VERIFY_FAILED');return{...state.bindings,...primary}}
"""
    album = replace_once(album, init_anchor, init_new, 'album firebase init')

    album, count = re.subn(
        r"async function bind\(item,button\)\{.*?\}\nfunction toast",
        r"""async function bind(item,button){if(!state.selected||state.busy)return;const sku=norm(item.id),imageKey=state.selected.key;if(!confirm(`ربط الصورة ${imageKey} بالصنف ${item.id}؟`))return;state.busy=true;button.disabled=true;const old=button.innerHTML;button.textContent='جاري الحفظ…';sheetHint.textContent='جاري حفظ الربط، لا تغلق الصفحة…';try{state.bindings=await persistImageBinding(sku,imageKey);state.busy=false;closeSheet();toast(`تم ربط ${imageKey} بالصنف ${item.id} ✓`);refresh()}catch(e){console.error('[V56.31 image album bind]',e);state.busy=false;button.disabled=false;button.innerHTML=old;const code=String(e?.code||e?.message||'').replace(/^firestore\//,'');sheetHint.textContent='تعذر الحفظ. يمكنك المحاولة مرة أخرى دون تحديث الصفحة.';toast(e?.code==='SAVE_TIMEOUT'?'تأخر الحفظ أكثر من المعتاد. تحقق من الإنترنت وحاول مرة أخرى.':`تعذر حفظ الربط${code?` (${code})`:''}. لم يتم إغلاق النافذة حتى تتمكن من المحاولة مرة أخرى.`,true)}}
function toast""",
        album,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise SystemExit('V56.31 anchor not found: album bind function')

    old_boot = "(async()=>{try{const [imgs,j,r,snap]=await Promise.all([text('./data/images_list.txt'),text('./data/jeddah.tsv'),text('./data/riyadh.tsv'),db.collection('system_controls').doc('product_image_bindings').get()]);state.images=parseImages(imgs);state.items=uniqueItems([...parseInv(j),...parseInv(r)]).sort((a,b)=>a.id.localeCompare(b.id,'ar',{numeric:true}));state.bindings=snap.exists?(snap.data().bindings||{}):{};refresh()}catch(e){console.error(e);grid.innerHTML='<div class=\"card empty\">تعذر تحميل بيانات الصور أو الأصناف. أعد المحاولة.</div>'}})();"
    new_boot = "(async()=>{try{const [imgs,j,r,bindings]=await Promise.all([text('./data/images_list.txt'),text('./data/jeddah.tsv'),text('./data/riyadh.tsv'),loadImageBindings()]);state.images=parseImages(imgs);state.items=uniqueItems([...parseInv(j),...parseInv(r)]).sort((a,b)=>a.id.localeCompare(b.id,'ar',{numeric:true}));state.bindings=bindings;refresh()}catch(e){console.error(e);grid.innerHTML='<div class=\"card empty\">تعذر تحميل بيانات الصور أو الأصناف. أعد المحاولة.</div>'}})();"
    album = replace_once(album, old_boot, new_boot, 'album boot bindings')

# -----------------------------------------------------------------------------
# Employee runtime: same canonical store + legacy read compatibility.
# Atomic leaf writes avoid read/modify/write transactions and lost updates.
# -----------------------------------------------------------------------------
if "const IMAGE_BINDING_STORE_DOC = 'permissions_v44';" not in runtime:
    old_helpers = r"""const IMAGE_BINDING_DOC = 'product_image_bindings';
const loadImageBindingOverrides = async () => {
    try {
        const db = await getDb();
        const snap = await db.collection('system_controls').doc(IMAGE_BINDING_DOC).get();
        return snap.exists ? (snap.data()?.bindings || {}) : {};
    } catch (err) {
        console.warn('[V56.25 image bindings]', err);
        return {};
    }
};

const saveImageBindingOverride = async ({ sku, imageKey, updatedBy = 'مهند' }) => {
    const exactSku = normalizeImageSku(sku);
    const exactImage = normalizeImageSku(imageKey);
    if (!exactSku || !exactImage) throw new Error('INVALID_IMAGE_BINDING');
    const db = await getDb();
    const ref = db.collection('system_controls').doc(IMAGE_BINDING_DOC);
    await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const current = snap.exists ? (snap.data()?.bindings || {}) : {};
        tx.set(ref, { bindings: { ...current, [exactSku]: exactImage }, updatedBy, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
};

const removeImageBindingOverride = async ({ sku, updatedBy = 'مهند' }) => {
    const exactSku = normalizeImageSku(sku);
    if (!exactSku) return;
    const db = await getDb();
    const ref = db.collection('system_controls').doc(IMAGE_BINDING_DOC);
    await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const current = snap.exists ? { ...(snap.data()?.bindings || {}) } : {};
        delete current[exactSku];
        tx.set(ref, { bindings: current, updatedBy, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
};"""
    new_helpers = r"""const IMAGE_BINDING_DOC = 'product_image_bindings'; // legacy read-only store
const IMAGE_BINDING_STORE_DOC = 'permissions_v44';
const IMAGE_BINDING_STORE_FIELD = 'productImageBindings';
const readImageBindingStores = async db => {
    const [legacySnap, primarySnap] = await Promise.all([
        db.collection('system_controls').doc(IMAGE_BINDING_DOC).get().catch(() => null),
        db.collection('system_controls').doc(IMAGE_BINDING_STORE_DOC).get().catch(() => null)
    ]);
    const legacy = legacySnap?.exists ? (legacySnap.data()?.bindings || {}) : {};
    const primary = primarySnap?.exists ? (primarySnap.data()?.[IMAGE_BINDING_STORE_FIELD] || {}) : {};
    return { legacy, primary, merged: { ...legacy, ...primary } };
};
const loadImageBindingOverrides = async () => {
    try {
        const db = await getDb();
        return (await readImageBindingStores(db)).merged;
    } catch (err) {
        console.warn('[V56.31 image bindings]', err);
        return {};
    }
};

const writeImageBindingLeaf = async ({ exactSku, value, updatedBy }) => {
    const db = await getDb();
    const ref = db.collection('system_controls').doc(IMAGE_BINDING_STORE_DOC);
    const leaf = new firebase.firestore.FieldPath(IMAGE_BINDING_STORE_FIELD, exactSku);
    const payload = {
        [IMAGE_BINDING_STORE_FIELD]: { [exactSku]: value },
        imageBindingsUpdatedBy: updatedBy,
        imageBindingsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        imageBindingsVersion: '56.31'
    };
    await ref.set(payload, { mergeFields: [leaf, 'imageBindingsUpdatedBy', 'imageBindingsUpdatedAt', 'imageBindingsVersion'] });
    const verify = await ref.get();
    const primary = verify.exists ? (verify.data()?.[IMAGE_BINDING_STORE_FIELD] || {}) : {};
    return primary;
};

const saveImageBindingOverride = async ({ sku, imageKey, updatedBy = 'مهند' }) => {
    const exactSku = normalizeImageSku(sku);
    const exactImage = normalizeImageSku(imageKey);
    if (!exactSku || !exactImage) throw new Error('INVALID_IMAGE_BINDING');
    const primary = await writeImageBindingLeaf({ exactSku, value: exactImage, updatedBy });
    if (normalizeImageSku(primary?.[exactSku] || '') !== exactImage) throw new Error('VERIFY_FAILED');
};

const removeImageBindingOverride = async ({ sku, updatedBy = 'مهند' }) => {
    const exactSku = normalizeImageSku(sku);
    if (!exactSku) return;
    // Null is an intentional tombstone: it prevents a stale legacy binding from resurfacing.
    const primary = await writeImageBindingLeaf({ exactSku, value: null, updatedBy });
    if (!Object.prototype.hasOwnProperty.call(primary, exactSku) || primary[exactSku] !== null) throw new Error('VERIFY_FAILED');
};"""
    runtime = replace_once(runtime, old_helpers, new_helpers, 'runtime image binding helpers')

    old_sync = r"""    // V56.25: مزامنة روابط الصور اليدوية فورياً على كل الأجهزة المفتوحة.
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
    new_sync = r"""    // V56.31: مزامنة المصدر الجديد مع قراءة توافقية للمصدر القديم.
    useEffect(() => {
        let unsubs = [];
        let alive = true;
        let legacy = {}, primary = {};
        const emit = () => {
            if (!alive) return;
            const next = { ...legacy, ...primary };
            setImageBindingOverrides(next);
            setImagesList(buildResolvedImagesMap(rawImagesList, databases, next));
        };
        getDb().then(db => {
            if (!alive) return;
            const legacyUnsub = db.collection('system_controls').doc(IMAGE_BINDING_DOC).onSnapshot(snap => {
                legacy = snap.exists ? (snap.data()?.bindings || {}) : {};
                emit();
            }, err => console.warn('[V56.31 legacy image bindings sync]', err));
            const primaryUnsub = db.collection('system_controls').doc(IMAGE_BINDING_STORE_DOC).onSnapshot(snap => {
                primary = snap.exists ? (snap.data()?.[IMAGE_BINDING_STORE_FIELD] || {}) : {};
                emit();
            }, err => console.warn('[V56.31 image bindings sync]', err));
            unsubs = [legacyUnsub, primaryUnsub];
        }).catch(err => console.warn('[V56.31 image bindings sync]', err));
        return () => { alive = false; unsubs.forEach(unsub => { try { unsub?.(); } catch {} }); };
    }, [rawImagesList, databases]);
"""
    runtime = replace_once(runtime, old_sync, new_sync, 'runtime image binding sync')

# -----------------------------------------------------------------------------
# Production smoke must validate the actual album too (V56.30 did not).
# -----------------------------------------------------------------------------
if '/image-distribution.html?verify=$nonce' not in smoke:
    smoke = replace_once(
        smoke,
        "          curl -fsSL --retry 3 --retry-delay 2 -H 'Cache-Control: no-cache' \"$PROD/admin-stocktake.html?verify=$nonce\" -o /tmp/admin.html\n",
        "          curl -fsSL --retry 3 --retry-delay 2 -H 'Cache-Control: no-cache' \"$PROD/admin-stocktake.html?verify=$nonce\" -o /tmp/admin.html\n          curl -fsSL --retry 3 --retry-delay 2 -H 'Cache-Control: no-cache' \"$PROD/image-distribution.html?verify=$nonce\" -o /tmp/image-distribution.html\n",
        'production smoke album fetch',
    )
    smoke = replace_once(
        smoke,
        "          cmp -s admin-stocktake.html /tmp/admin.html || {\n            echo \"::error::Production admin-stocktake.html differs from current main.\"; exit 1;\n          }\n",
        "          cmp -s admin-stocktake.html /tmp/admin.html || {\n            echo \"::error::Production admin-stocktake.html differs from current main.\"; exit 1;\n          }\n          cmp -s image-distribution.html /tmp/image-distribution.html || {\n            echo \"::error::Production image-distribution.html differs from current main.\"; exit 1;\n          }\n",
        'production smoke album compare',
    )
    smoke = replace_once(
        smoke,
        "          grep -Fq \"stocktake_accountant_access\" /tmp/admin.html\n",
        "          grep -Fq \"stocktake_accountant_access\" /tmp/admin.html\n          grep -Fq \"IMAGE_BINDING_STORE_DOC='permissions_v44'\" /tmp/image-distribution.html\n          grep -Fq \"productImageBindings\" /tmp/image-distribution.html\n",
        'production smoke album contract',
    )

ALBUM.write_text(album, encoding='utf-8')
RUNTIME.write_text(runtime, encoding='utf-8')
SMOKE.write_text(smoke, encoding='utf-8')

TEST.write_text(r"""import fs from 'node:fs';
import assert from 'node:assert/strict';

const album = fs.readFileSync('image-distribution.html','utf8');
const runtime = fs.readFileSync('runtime/index-v37-source.txt','utf8');
const smoke = fs.readFileSync('.github/workflows/v56-12-production-smoke.yml','utf8');

for (const marker of ["IMAGE_BINDING_STORE_DOC='permissions_v44'","IMAGE_BINDING_STORE_FIELD='productImageBindings'",'mergeFields','persistImageBinding','VERIFY_FAILED','Promise.race']) assert.ok(album.includes(marker), `album missing ${marker}`);
assert.ok(album.includes("IMAGE_BINDING_LEGACY_DOC='product_image_bindings'"));
assert.ok(album.includes('loadImageBindings()'));
assert.ok(!album.includes("db.runTransaction(async tx=>{const snap=await tx.get(ref)"), 'album must not use the failing read/modify/write transaction');

for (const marker of ["const IMAGE_BINDING_STORE_DOC = 'permissions_v44';","const IMAGE_BINDING_STORE_FIELD = 'productImageBindings';",'writeImageBindingLeaf','mergeFields','imageBindingsVersion','56.31','legacy = snap.exists','primary = snap.exists']) assert.ok(runtime.includes(marker), `runtime missing ${marker}`);
assert.ok(runtime.includes("const IMAGE_BINDING_DOC = 'product_image_bindings'; // legacy read-only store"));
assert.ok(runtime.includes('value: null'), 'clear must write a tombstone so legacy bindings cannot reappear');

assert.ok(smoke.includes('$PROD/image-distribution.html?verify=$nonce'));
assert.ok(smoke.includes('cmp -s image-distribution.html /tmp/image-distribution.html'));
assert.ok(smoke.includes("IMAGE_BINDING_STORE_DOC='permissions_v44'"));
console.log('V56.31 image binding canonical store regression: PASS');
""", encoding='utf-8')

print('V56.31 patch applied')
