#!/usr/bin/env python3
from pathlib import Path

RUNTIME = Path('runtime/index-v37-source.txt')
INDEX = Path('index.html')

runtime = RUNTIME.read_text(encoding='utf-8')
index = INDEX.read_text(encoding='utf-8')

old_build = r'''const buildImagesMap = (imagesText) => {
    const map = new Map();
    String(imagesText || '').split(/\r?\n/).forEach((line) => {
        const raw = line.trim();
        if (!raw || raw.startsWith('#')) return;
        const parts = raw.split(/\t/);
        let clean = '', fileName = '';
        if (parts.length >= 2) {
            clean = normalizeCleanId(parts[0]);
            fileName = parts.slice(1).join('\t').trim();
        } else {
            fileName = raw;
            const base = fileName.split('/').pop().split('?')[0];
            clean = normalizeCleanId(base.replace(/\.[^.]+$/, ''));
        }
        if (clean && fileName) map.set(clean, fileName);
    });
    return map;
};'''

new_build = r'''// V56.25 — image identity is intentionally stricter than product search identity.
// Product search may collapse BA_209 / AR_M209 / 209 to the same numeric cleanId,
// but image ownership must never do that silently.
const normalizeImageSku = raw => toEnglishDigits(String(raw || ''))
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9_-]/g, '');

const imageStem = raw => {
    const file = String(raw || '').split('/').pop().split('?')[0];
    return file.replace(/\.[^.]+$/, '');
};

const buildImagesMap = (imagesText) => {
    const map = new Map();
    const exact = new Map();
    const legacy = new Map();
    String(imagesText || '').split(/\r?\n/).forEach((line) => {
        const raw = line.trim();
        if (!raw || raw.startsWith('#')) return;
        const parts = raw.split(/\t/);
        let declared = '', fileName = '';
        if (parts.length >= 2) {
            declared = parts[0].trim();
            fileName = parts.slice(1).join('\t').trim();
        } else {
            fileName = raw;
            declared = imageStem(fileName);
        }
        if (!fileName) return;
        const exactKey = normalizeImageSku(declared);
        const stemKey = normalizeImageSku(imageStem(fileName));
        const clean = normalizeCleanId(declared || imageStem(fileName));
        if (exactKey) exact.set(exactKey, fileName);
        if (stemKey && !exact.has(stemKey)) exact.set(stemKey, fileName);
        if (clean) {
            if (!legacy.has(clean)) legacy.set(clean, []);
            legacy.get(clean).push({ declared: exactKey, fileName });
        }
    });
    map.exact = exact;
    map.legacy = legacy;
    return map;
};

const buildImageCollisionIndex = databases => {
    const byClean = new Map();
    Object.values(databases || {}).flat().forEach(item => {
        if (!item?.cleanId) return;
        const sku = normalizeImageSku(item.id);
        if (!sku) return;
        if (!byClean.has(item.cleanId)) byClean.set(item.cleanId, new Set());
        byClean.get(item.cleanId).add(sku);
    });
    return byClean;
};

const resolveImageForItem = (imagesMap, item, collisionIndex, overrides = {}) => {
    if (!imagesMap || !item) return '';
    const sku = normalizeImageSku(item.id);
    const overrideKey = normalizeImageSku(overrides?.[sku] || '');
    if (overrideKey) {
        const explicit = imagesMap.exact?.get(overrideKey);
        if (explicit) return explicit;
    }
    const exact = imagesMap.exact?.get(sku);
    if (exact) return exact;
    const candidates = imagesMap.legacy?.get(item.cleanId) || [];
    if (!candidates.length) return '';
    const owners = collisionIndex?.get(item.cleanId) || new Set();
    // Legacy numeric image names are safe only when exactly one full SKU owns that numeric cleanId.
    if (owners.size !== 1) return '';
    return candidates[0]?.fileName || '';
};

const buildResolvedImagesMap = (imagesMap, databases, overrides = {}) => {
    const resolved = new Map();
    const collisions = buildImageCollisionIndex(databases);
    Object.values(databases || {}).flat().forEach(item => {
        const fileName = resolveImageForItem(imagesMap, item, collisions, overrides);
        if (fileName) resolved.set(item.uid, fileName);
    });
    resolved.collisions = collisions;
    resolved.raw = imagesMap;
    return resolved;
};

const imageForItem = (resolvedImages, item) => item?.uid ? (resolvedImages?.get(item.uid) || '') : '';
const hasImageForItem = (resolvedImages, item) => Boolean(imageForItem(resolvedImages, item));

const IMAGE_BINDING_DOC = 'product_image_bindings';
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
    await db.collection('system_controls').doc(IMAGE_BINDING_DOC).set({
        bindings: { [exactSku]: exactImage },
        updatedBy,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
};

const removeImageBindingOverride = async ({ sku, updatedBy = 'مهند' }) => {
    const exactSku = normalizeImageSku(sku);
    if (!exactSku) return;
    const db = await getDb();
    await db.collection('system_controls').doc(IMAGE_BINDING_DOC).update({
        [`bindings.${exactSku}`]: firebase.firestore.FieldValue.delete(),
        updatedBy,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
};'''

if old_build not in runtime:
    raise SystemExit('V56.25 anchor buildImagesMap not found')
runtime = runtime.replace(old_build, new_build, 1)

# Keep exact SKU on each item; cleanId remains unchanged for search/category compatibility.
old_item = "uid: `${warehouseKey}:${searchId}`, warehouseKey, id: rawId, searchId, cleanId: cleanId,"
new_item = "uid: `${warehouseKey}:${searchId}`, warehouseKey, id: rawId, searchId, cleanId: cleanId, imageSku: normalizeImageSku(rawId),"
if old_item not in runtime:
    raise SystemExit('V56.25 item anchor not found')
runtime = runtime.replace(old_item, new_item, 1)

# State: preserve raw image manifest separately, resolved images are keyed by item.uid.
old_state = "const [imagesList, setImagesList] = useState(new Map());"
new_state = "const [imagesList, setImagesList] = useState(new Map());\n    const [rawImagesList, setRawImagesList] = useState(new Map());\n    const [imageBindingOverrides, setImageBindingOverrides] = useState({});"
if old_state not in runtime:
    raise SystemExit('V56.25 images state anchor not found')
runtime = runtime.replace(old_state, new_state, 1)

# Initial data load: build raw manifest, load admin overrides, resolve only after both warehouse catalogs are known.
old_load = "const imgMap = buildImagesMap(imagesText);\n                setImagesList(imgMap);"
new_load = "const rawImgMap = buildImagesMap(imagesText);\n                setRawImagesList(rawImgMap);\n                const bindingOverrides = await loadImageBindingOverrides();\n                setImageBindingOverrides(bindingOverrides);\n                setImagesList(buildResolvedImagesMap(rawImgMap, { jeddah: jeddahData, riyadh: riyadhData }, bindingOverrides));"
if old_load not in runtime:
    raise SystemExit('V56.25 image load anchor not found')
runtime = runtime.replace(old_load, new_load, 1)

# All product image reads must be item-identity based, never cleanId based.
runtime = runtime.replace('imagesList.has(i.cleanId)', 'hasImageForItem(imagesList, i)')
runtime = runtime.replace('imagesList.get(item.cleanId)', 'imageForItem(imagesList, item)')
runtime = runtime.replace('imagesList.get(quickItem.cleanId)', 'imageForItem(imagesList, quickItem)')
runtime = runtime.replace('imagesList.get(row.cleanId)', 'imageForItem(imagesList, row)')

# Add an admin image-binding manager alongside the existing product category manager.
manager_anchor = "// ============================================================\n// مدير تصنيف المنتجات — خاص بمهند\n// ============================================================"
if manager_anchor not in runtime:
    raise SystemExit('V56.25 manager anchor not found')
manager = r'''// ============================================================
// V56.25 مدير ربط صور المنتجات — خاص بمهند
// ============================================================
const ProductImageBindingManager = memo(({ catalogItems, imagesList, rawImagesList, imageBindingOverrides, onBindingsChanged }) => {
    const [search, setSearch] = useState('');
    const [busySku, setBusySku] = useState('');
    const [notice, setNotice] = useState('');
    const collisionIndex = useMemo(() => buildImageCollisionIndex({ catalog: catalogItems }), [catalogItems]);
    const conflictCleanIds = useMemo(() => new Set([...collisionIndex.entries()].filter(([, owners]) => owners.size > 1).map(([clean]) => clean)), [collisionIndex]);
    const rows = useMemo(() => {
        const q = normalizeText(search);
        return catalogItems.filter(item => {
            if (!conflictCleanIds.has(item.cleanId) && !imageBindingOverrides?.[normalizeImageSku(item.id)]) return false;
            if (!q) return true;
            return normalizeText(`${item.id} ${item.name || ''}`).includes(q);
        }).sort((a,b) => String(a.cleanId).localeCompare(String(b.cleanId), 'en', { numeric:true }));
    }, [catalogItems, conflictCleanIds, imageBindingOverrides, search]);

    const availableImageKeys = useMemo(() => {
        const keys = new Set();
        rawImagesList?.exact?.forEach((_, key) => keys.add(key));
        return [...keys].sort((a,b) => a.localeCompare(b, 'en', { numeric:true }));
    }, [rawImagesList]);

    const bind = async item => {
        if (!item || busySku) return;
        const sku = normalizeImageSku(item.id);
        const current = imageBindingOverrides?.[sku] || '';
        const suggestion = current || (rawImagesList?.legacy?.get(item.cleanId)?.[0]?.declared || item.cleanId || '');
        const imageKey = window.prompt(`ربط صورة الصنف ${item.id}\nاكتب مفتاح الصورة/اسمها بدون الامتداد (مثال: 209).`, suggestion);
        if (!imageKey) return;
        const normalized = normalizeImageSku(imageKey);
        if (!rawImagesList?.exact?.has(normalized)) {
            const near = availableImageKeys.filter(k => k.includes(normalized) || normalized.includes(k)).slice(0,6);
            return alert(`لم أجد صورة بهذا المفتاح في images_list.${near.length ? `\nاقتراحات: ${near.join('، ')}` : ''}`);
        }
        setBusySku(sku);
        try {
            await saveImageBindingOverride({ sku, imageKey: normalized });
            const next = { ...(imageBindingOverrides || {}), [sku]: normalized };
            onBindingsChanged(next);
            setNotice(`تم ربط ${item.id} بالصورة ${normalized} ✓`);
            setTimeout(() => setNotice(''), 2200);
        } catch (err) {
            console.error('[V56.25 save image binding]', err);
            alert('تعذر حفظ ربط الصورة. تحقق من الاتصال وحاول مرة أخرى.');
        } finally { setBusySku(''); }
    };

    const clear = async item => {
        const sku = normalizeImageSku(item.id);
        if (!imageBindingOverrides?.[sku] || busySku) return;
        if (!window.confirm(`إزالة الربط اليدوي للصنف ${item.id}؟`)) return;
        setBusySku(sku);
        try {
            await removeImageBindingOverride({ sku });
            const next = { ...(imageBindingOverrides || {}) };
            delete next[sku];
            onBindingsChanged(next);
            setNotice('تمت إزالة الربط اليدوي ✓');
            setTimeout(() => setNotice(''), 1800);
        } catch (err) { console.error(err); alert('تعذر إزالة الربط.'); }
        finally { setBusySku(''); }
    };

    return <div className="flex flex-col gap-14">
        {notice && <div className="bg-success text-white text-[12px] font-bold px-14 py-10 rounded-10 text-center">{notice}</div>}
        <div className="bg-warnSoft border border-warn/20 rounded-12 p-12 text-[12px] leading-7 text-primary">
            <b>تعارضات الصور</b><br/>لن يربط النظام صورة رقمية مختصرة تلقائياً إذا كان الرقم يعود لأكثر من SKU. اختر الصنف الصحيح واربطه يدوياً؛ الربط اليدوي له الأولوية دائماً.
        </div>
        <div className="relative"><Icon.Search className="w-16 h-16 absolute right-12 top-1/2 -translate-y-1/2 text-muted"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث برقم الصنف أو الاسم..." className="w-full h-42 pr-36 pl-12 rounded-10 border border-border bg-bg text-[13px] outline-none focus:border-accent"/></div>
        <div className="text-[11px] text-muted">{rows.length} صنف يحتاج مراجعة أو لديه ربط يدوي</div>
        <div className="flex flex-col gap-10">
            {rows.map(item => {
                const sku = normalizeImageSku(item.id);
                const manual = imageBindingOverrides?.[sku] || '';
                const image = imageForItem(imagesList, item);
                const owners = [...(collisionIndex.get(item.cleanId) || [])];
                return <div key={item.uid} className="bg-bg border border-border rounded-14 p-12 flex gap-12 items-center">
                    <div className="w-72 h-72 rounded-10 bg-surface border border-border overflow-hidden flex-shrink-0">{image ? <img src={`${BASE_URL}images/${image}`} className="w-full h-full object-contain"/> : <div className="h-full grid place-items-center text-muted"><Icon.ImageOff className="w-20 h-20"/></div>}</div>
                    <div className="min-w-0 flex-1"><div className="font-bold text-[13px] bidi-isolate">{item.id}</div><div className="text-[11px] text-muted truncate mt-1">{item.name}</div><div className="text-[10px] text-warn mt-2">الرقم المشترك: {item.cleanId} · {owners.join(' / ')}</div>{manual && <div className="text-[10px] text-success mt-1">ربط يدوي: {manual}</div>}</div>
                    <div className="flex flex-col gap-6"><button disabled={busySku===sku} onClick={()=>bind(item)} className="h-34 px-10 rounded-8 bg-primary text-white text-[11px] font-bold disabled:opacity-50">{manual?'تعديل':'ربط الصورة'}</button>{manual && <button disabled={busySku===sku} onClick={()=>clear(item)} className="h-30 px-8 rounded-8 border border-border text-[10px] text-secondary">إزالة</button>}</div>
                </div>;
            })}
            {!rows.length && <StateBlock icon={<Icon.CheckCircle className="w-20 h-20"/>} title="لا توجد تعارضات" note="جميع روابط الصور الحالية آمنة."/>}
        </div>
    </div>;
});

'''
runtime = runtime.replace(manager_anchor, manager + manager_anchor, 1)

# Admin tab and body integration.
tab_anchor = "{ id: 'product_categories', label: 'تصنيف المنتجات', icon: Icon.Grid },"
if tab_anchor not in runtime:
    raise SystemExit('V56.25 admin tab anchor not found')
runtime = runtime.replace(tab_anchor, tab_anchor + "\n                        { id: 'product_images', label: 'ربط الصور', icon: Icon.Image },", 1)

body_anchor = "{activeTab === 'product_categories' ? (\n                        <ProductClassificationManager"
if body_anchor not in runtime:
    raise SystemExit('V56.25 admin body anchor not found')
runtime = runtime.replace(body_anchor, "{activeTab === 'product_images' ? (\n                        <ProductImageBindingManager catalogItems={catalogItems} imagesList={imagesList} rawImagesList={rawImagesList} imageBindingOverrides={imageBindingOverrides} onBindingsChanged={(next)=>{ setImageBindingOverrides(next); setImagesList(buildResolvedImagesMap(rawImagesList, databases, next)); }} />\n                    ) : activeTab === 'product_categories' ? (\n                        <ProductClassificationManager", 1)

# Product manager invocation is inside App and now needs access to new state only for image tab; no other product behavior changes.

# Guard against any leftover unsafe direct cleanId image read.
unsafe = ['imagesList.has(i.cleanId)', 'imagesList.get(item.cleanId)', 'imagesList.get(quickItem.cleanId)', 'imagesList.get(row.cleanId)']
for token in unsafe:
    if token in runtime:
        raise SystemExit(f'unsafe image lookup remains: {token}')

# Cache bust only; no unrelated runtime changes.
if "./runtime/index-v37-source.txt?v=56.17" not in index:
    raise SystemExit('V56.25 index cache anchor not found')
index = index.replace('./runtime/index-v37-source.txt?v=56.17', './runtime/index-v37-source.txt?v=56.25', 1)

RUNTIME.write_text(runtime, encoding='utf-8')
INDEX.write_text(index, encoding='utf-8')
print('V56.25 image-binding patch applied')
