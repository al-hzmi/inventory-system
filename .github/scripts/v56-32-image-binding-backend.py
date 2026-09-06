#!/usr/bin/env python3
from pathlib import Path
import re

ALBUM=Path('image-distribution.html')
EMP=Path('runtime/index-v37-source.txt')
CUST=Path('runtime/customer-v37-source.txt')
TEST=Path('tests/v56-32-image-binding-backend.mjs')

a=ALBUM.read_text(encoding='utf-8')
e=EMP.read_text(encoding='utf-8')
c=CUST.read_text(encoding='utf-8')

# --- Admin album: use the configured server API as the single persistence path. ---
start="const IMAGE_BINDING_LEGACY_DOC='product_image_bindings',IMAGE_BINDING_STORE_DOC='permissions_v44',IMAGE_BINDING_STORE_FIELD='productImageBindings';"
end='\nfunction parseImages(raw)'
if "IMAGE_BINDING_BACKEND='api/image-admin'" not in a:
    i=a.find(start)
    j=a.find(end,i)
    if i<0 or j<0: raise SystemExit('V56.32 album binding helper anchors missing')
    backend=r"""const IMAGE_BINDING_BACKEND='api/image-admin';
const adminProof=()=>{try{return JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null')||{}}catch{return{}}};
const adminToken=()=>String(localStorage.getItem('inventory_admin_token_v2')||'');
async function imageBindingJson(response){const data=await response.json().catch(()=>({}));if(!response.ok){const err=Error(data?.error||'تعذر الاتصال بخادم ربط الصور.');err.status=response.status;throw err}return data}
async function loadImageBindings(){const r=await fetch('./api/image-admin?action=bindings',{cache:'no-store',headers:{'Cache-Control':'no-cache'}});const d=await imageBindingJson(r);return d.bindings||{}}
async function persistImageBinding(sku,imageKey){const request=fetch('./api/image-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'bind',sku,imageKey,updatedBy:'مهند',adminToken:adminToken(),adminProof:adminProof()})});const r=await Promise.race([request,new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(Error('SAVE_TIMEOUT'),{code:'SAVE_TIMEOUT'})),15000))]);const d=await imageBindingJson(r);const saved=norm(d.saved||d.bindings?.[sku]||'');if(saved!==imageKey)throw Error('VERIFY_FAILED');return d.bindings||{...state.bindings,[sku]:imageKey}}
"""
    a=a[:i]+backend+a[j:]

# Make failure messages expose server reason when available.
a=a.replace("const code=String(e?.code||e?.message||'').replace(/^firestore\\//,'');", "const code=String(e?.message||e?.code||'');")
a=a.replace("تأخر الحفظ أكثر من المعتاد. تحقق من الإنترنت وحاول مرة أخرى.", "تأخر خادم الحفظ أكثر من المعتاد. تحقق من الإنترنت وحاول مرة أخرى.")

# --- Employee runtime: all reads/writes go through the same backend. ---
rt_start="const IMAGE_BINDING_DOC = 'product_image_bindings'; // legacy read-only store"
rt_end="const parseCategories = (text) => {"
if "const IMAGE_BINDING_BACKEND = './api/image-admin';" not in e:
    i=e.find(rt_start)
    j=e.find(rt_end,i)
    if i<0 or j<0: raise SystemExit('V56.32 employee helper anchors missing')
    helpers=r"""const IMAGE_BINDING_BACKEND = './api/image-admin';
const loadImageBindingOverrides = async () => {
    try {
        const r = await fetch(IMAGE_BINDING_BACKEND + '?action=bindings', { cache:'no-store', headers:{'Cache-Control':'no-cache'} });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'IMAGE_BINDINGS_LOAD_FAILED');
        return data?.bindings || {};
    } catch (err) {
        console.warn('[V56.32 image bindings]', err);
        return {};
    }
};
const imageAdminProof = () => { try { return JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2') || 'null') || {}; } catch { return {}; } };
const imageAdminToken = () => { try { return String(localStorage.getItem('inventory_admin_token_v2') || ''); } catch { return ''; } };
const imageBindingMutation = async payload => {
    const r = await fetch(IMAGE_BINDING_BACKEND, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...payload,updatedBy:'مهند',adminToken:imageAdminToken(),adminProof:imageAdminProof()}) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || 'IMAGE_BINDING_SAVE_FAILED');
    return data;
};
const saveImageBindingOverride = async ({ sku, imageKey }) => {
    const exactSku=normalizeImageSku(sku),exactImage=normalizeImageSku(imageKey);
    if(!exactSku||!exactImage)throw new Error('INVALID_IMAGE_BINDING');
    const data=await imageBindingMutation({action:'bind',sku:exactSku,imageKey:exactImage});
    if(normalizeImageSku(data?.saved||data?.bindings?.[exactSku]||'')!==exactImage)throw new Error('VERIFY_FAILED');
    return data;
};
const removeImageBindingOverride = async ({ sku }) => {
    const exactSku=normalizeImageSku(sku);if(!exactSku)return;
    return imageBindingMutation({action:'unbind',sku:exactSku});
};

"""
    e=e[:i]+helpers+e[j:]

# Replace Firestore realtime binding listeners with backend polling so an admin fix
# propagates to already-open employee screens without a refresh.
sync_start='    // V56.31: مزامنة المصدر الجديد مع قراءة توافقية للمصدر القديم.'
sync_end='    // مزامنة التصنيفات اللحظية: أي تعديل من مهند يظهر لكل الأجهزة المفتوحة فوراً.'
if sync_start in e:
    i=e.find(sync_start)
    j=e.find(sync_end,i)
    if j<0: raise SystemExit('V56.32 employee sync end anchor missing')
    poll=r"""    // V56.32: روابط الصور تأتي من المخزن الخادمي الموحّد وتُحدّث دورياً.
    useEffect(() => {
        let alive = true;
        const refreshBindings = async () => {
            const next = await loadImageBindingOverrides();
            if (!alive) return;
            setImageBindingOverrides(next);
            setImagesList(buildResolvedImagesMap(rawImagesList, databases, next));
        };
        refreshBindings().catch(err => console.warn('[V56.32 image bindings poll]', err));
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') refreshBindings().catch(err => console.warn('[V56.32 image bindings poll]', err));
        }, 15000);
        return () => { alive = false; clearInterval(timer); };
    }, [rawImagesList, databases]);

"""
    e=e[:i]+poll+e[j:]

# --- Customer catalog: resolve manual bindings from the same backend. ---
old="""async function loadCustomerImageBindings(){
  try{const snap=await db.collection('system_controls').doc('product_image_bindings').get();return snap.exists?(snap.data()?.bindings||{}):{}}catch(e){console.warn('[V56.25 customer image bindings]',e);return{}}
}"""
new="""async function loadCustomerImageBindings(){
  try{const r=await fetch('./api/image-admin?action=bindings',{cache:'no-store',headers:{'Cache-Control':'no-cache'}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error||'IMAGE_BINDINGS_LOAD_FAILED');return data?.bindings||{}}catch(e){console.warn('[V56.32 customer image bindings]',e);return{}}
}"""
if old in c:
    c=c.replace(old,new,1)
elif new not in c:
    raise SystemExit('V56.32 customer binding load anchor missing')

ALBUM.write_text(a,encoding='utf-8')
EMP.write_text(e,encoding='utf-8')
CUST.write_text(c,encoding='utf-8')

TEST.write_text(r"""import fs from 'node:fs';
import assert from 'node:assert/strict';
const album=fs.readFileSync('image-distribution.html','utf8');
const emp=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const cust=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const api=fs.readFileSync('api/image-admin.js','utf8');
for(const m of ["IMAGE_BINDING_BACKEND='api/image-admin'","./api/image-admin?action=bindings","action:'bind'",'adminProof','adminToken','VERIFY_FAILED'])assert.ok(album.includes(m),`album ${m}`);
assert.ok(!album.includes("db.collection('system_controls').doc(IMAGE_BINDING_STORE_DOC)"),'album must not persist image bindings through Firestore');
for(const m of ["const IMAGE_BINDING_BACKEND = './api/image-admin';","action:'bind'","action:'unbind'",'loadImageBindingOverrides','15000'])assert.ok(emp.includes(m),`employee ${m}`);
assert.ok(!emp.includes("const IMAGE_BINDING_STORE_DOC = 'permissions_v44';"),'employee binding store must be backend canonical');
assert.ok(cust.includes("./api/image-admin?action=bindings"),'customer must read backend bindings');
for(const m of ["STATE_REF = 'image-bindings-state'",'bindingAdminOK','bindImage','unbindImage',"action === 'bindings'"])assert.ok(api.includes(m),`api ${m}`);
console.log('V56.32 server-backed image binding regression: PASS');
""",encoding='utf-8')
print('V56.32 backend image binding patch applied')
