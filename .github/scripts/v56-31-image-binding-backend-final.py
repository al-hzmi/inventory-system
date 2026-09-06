#!/usr/bin/env python3
from pathlib import Path
import re

ALBUM=Path('image-distribution.html')
EMP=Path('runtime/index-v37-source.txt')
CUST=Path('runtime/customer-v37-source.txt')
INDEX=Path('index.html')
CUSTOMER=Path('customer.html')
LEGACY_TEST=Path('tests/v56-27-image-binding-wiring.mjs')
NEW_TEST=Path('tests/v56-31-image-binding-backend.mjs')


def must_sub(pattern,repl,text,label,flags=0,count=1):
    new,n=re.subn(pattern,repl,text,count=count,flags=flags)
    if n!=1:
        raise SystemExit(f'V56.31 expected exactly one {label}, got {n}')
    return new

# ---- Album: server API is authoritative; no browser Firestore writes. ----
a=ALBUM.read_text(encoding='utf-8')
helpers="""const imageAdminProof=()=>{try{return JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null')||{}}catch{return{}}};
const imageAdminToken=()=>{try{return String(localStorage.getItem('inventory_admin_token_v2')||'')}catch{return''}};
const loadServerBindings=async()=>{const r=await fetch('./api/image-admin?action=bindings',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'BINDINGS_LOAD_FAILED');return d.bindings||{}};
"""
if 'const loadServerBindings=async()=>' not in a:
    # Current main may contain the temporary Firestore fallback block.
    fallback_pattern=r"const IMAGE_BINDING_LEGACY_DOC=.*?\n\n(?=function parseImages)"
    if re.search(fallback_pattern,a,re.S):
        a=must_sub(fallback_pattern,helpers+'\n',a,'album fallback helper block',re.S)
    else:
        anchor="if(!firebase.apps.length)firebase.initializeApp(cfg);const db=firebase.firestore();const text=async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw Error(p);return r.text()};"
        if anchor not in a: raise SystemExit('V56.31 album firebase init anchor missing')
        a=a.replace(anchor,anchor+'\n'+helpers,1)

start=a.find('async function bind(item,button){')
end=a.find('\nfunction toast(',start)
if start<0 or end<0: raise SystemExit('V56.31 album bind markers missing')
new_bind="""async function bind(item,button){if(!state.selected||state.busy)return;const sku=norm(item.id),imageKey=state.selected.key;if(!confirm(`ربط الصورة ${imageKey} بالصنف ${item.id}؟`))return;state.busy=true;button.disabled=true;const old=button.innerHTML;button.textContent='جاري الحفظ…';sheetHint.textContent='جاري حفظ الربط على الخادم، لا تغلق الصفحة…';try{const r=await Promise.race([fetch('./api/image-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'bind',sku,imageKey,updatedBy:'مهند',adminToken:imageAdminToken(),adminProof:imageAdminProof()})}),new Promise((_,rej)=>setTimeout(()=>rej(Object.assign(Error('SAVE_TIMEOUT'),{code:'SAVE_TIMEOUT'})),15000))]);const d=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(d.error||'BIND_FAILED'),{status:r.status});const saved=norm(d.saved||d.bindings?.[sku]||'');if(saved!==imageKey)throw Error('VERIFY_FAILED');state.bindings=d.bindings||{...state.bindings,[sku]:imageKey};state.busy=false;closeSheet();toast(`تم ربط ${imageKey} بالصنف ${item.id} ✓`);refresh()}catch(e){console.error('[V56.31 image album bind]',e);state.busy=false;button.disabled=false;button.innerHTML=old;sheetHint.textContent='تعذر الحفظ. يمكنك المحاولة مرة أخرى دون تحديث الصفحة.';const msg=String(e?.message||'');toast(e?.code==='SAVE_TIMEOUT'?'تأخر الخادم أكثر من المعتاد. تحقق من الإنترنت وحاول مرة أخرى.':(/جلسة|الصنف|الصورة|مهيأة/.test(msg)?msg:'تعذر حفظ الربط على الخادم. لم يتم إغلاق النافذة حتى تتمكن من المحاولة مرة أخرى.'),true)}}"""
a=a[:start]+new_bind+a[end:]
# Support both pre-fallback and temporary-fallback boot forms.
if 'loadImageBindings()' in a:
    a=a.replace('loadImageBindings()','loadServerBindings()',1)
elif "doc('product_image_bindings').get()" in a:
    a=must_sub(r",db\.collection\('system_controls'\)\.doc\('product_image_bindings'\)\.get\(\)\]",",loadServerBindings()]",a,'album legacy boot read')
    a=a.replace("state.bindings=snap.exists?(snap.data().bindings||{}):{}","state.bindings=bindings||{}",1).replace("[imgs,j,r,snap]","[imgs,j,r,bindings]",1)
if 'loadServerBindings()' not in a: raise SystemExit('V56.31 album boot not wired to server')
ALBUM.write_text(a,encoding='utf-8')

# ---- Employee runtime: replace entire image-binding persistence section. ----
s=EMP.read_text(encoding='utf-8')
server_helpers="""const IMAGE_BINDING_DOC = 'product_image_bindings'; // legacy identifier retained only for compatibility comments/tests
const loadImageBindingOverrides = async () => {
    try {
        const r = await fetch('./api/image-admin?action=bindings', { cache: 'no-store' });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'IMAGE_BINDINGS_LOAD_FAILED');
        return data?.bindings || {};
    } catch (err) {
        console.warn('[V56.31 image bindings]', err);
        return {};
    }
};
const imageAdminProof = () => { try { return JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2') || 'null') || {}; } catch { return {}; } };
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
section_pattern=r"const IMAGE_BINDING_DOC = 'product_image_bindings';.*?(?=const parseCategories = \(text\) => \{)"
if re.search(section_pattern,s,re.S):
    s=must_sub(section_pattern,server_helpers,s,'employee image binding helper section',re.S)
elif "const loadImageBindingOverrides = async () =>" not in s:
    raise SystemExit('V56.31 employee image binding helper section missing')

polling="""    // V56.31: server-backed binding sync. Refresh on focus and while the page is visible.
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
# Match either V56.25 old listener or V56.31 temporary fallback listener.
sync_pattern=r"    // V56\.(?:25|31): .*?مزامنة روابط الصور.*?\n    useEffect\(\(\) => \{.*?\n    \}, \[rawImagesList, databases\]\);\n"
if re.search(sync_pattern,s,re.S):
    s=must_sub(sync_pattern,polling,s,'employee image binding sync',re.S)
elif "doc(IMAGE_BINDING_DOC).onSnapshot" in s:
    raise SystemExit('V56.31 employee old Firestore listener still present but sync block was not matched')
EMP.write_text(s,encoding='utf-8')

# ---- Customer runtime: read the same server state. ----
c=CUST.read_text(encoding='utf-8')
customer_fn="""async function loadCustomerImageBindings(){
  try{const r=await fetch('./api/image-admin?action=bindings',{cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error||'IMAGE_BINDINGS_LOAD_FAILED');return data?.bindings||{}}catch(e){console.warn('[V56.31 customer image bindings]',e);return{}}
}"""
if "./api/image-admin?action=bindings" not in c:
    c=must_sub(r"async function loadCustomerImageBindings\(\)\{.*?\n\}",customer_fn,c,'customer image binding loader',re.S)
CUST.write_text(c,encoding='utf-8')

# ---- Cache bust both runtime wrappers. ----
i=INDEX.read_text(encoding='utf-8')
i=must_sub(r"const CORE='\./runtime/index-v37-source\.txt\?v=[^']+';","const CORE='./runtime/index-v37-source.txt?v=56.31&rev=image-binding-backend';",i,'employee core URL') if "v=56.31&rev=image-binding-backend" not in i else i
INDEX.write_text(i,encoding='utf-8')

cu=CUSTOMER.read_text(encoding='utf-8')
cu=must_sub(r"const CORE='\./runtime/customer-v37-source\.txt\?v=[^']+';","const CORE='./runtime/customer-v37-source.txt?v=56.31';",cu,'customer core URL') if "customer-v37-source.txt?v=56.31" not in cu else cu
CUSTOMER.write_text(cu,encoding='utf-8')

# Existing exact-SKU test should accept the new cache revision.
lt=LEGACY_TEST.read_text(encoding='utf-8')
lt=re.sub(r"assert\.ok\(index\.includes\('index-v37-source\.txt\?v=[^']+'\), '[^']*cache bust missing'\);","assert.ok(index.includes('index-v37-source.txt?v=56.31&rev=image-binding-backend'), 'current image-binding cache bust missing');",lt,count=1)
LEGACY_TEST.write_text(lt,encoding='utf-8')

NEW_TEST.write_text("""import fs from 'node:fs';
import assert from 'node:assert/strict';
const api=fs.readFileSync('api/image-admin.js','utf8');
const album=fs.readFileSync('image-distribution.html','utf8');
const emp=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const cust=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const index=fs.readFileSync('index.html','utf8');
const customer=fs.readFileSync('customer.html','utf8');
for(const x of ['image-bindings-state','persistBindings','bindImage',\"action === 'bindings'\",\"action === 'bind'\"]) assert.ok(api.includes(x),`api missing ${x}`);
for(const x of [\"./api/image-admin?action=bindings\",\"action:'bind'\",'imageAdminToken()','imageAdminProof()','VERIFY_FAILED']) assert.ok(album.includes(x),`album missing ${x}`);
assert.ok(!album.includes('persistImageBinding('),'album must not write Firestore image bindings');
assert.ok(!album.includes('db.runTransaction'),'album must not write Firestore transactions');
for(const x of [\"./api/image-admin?action=bindings\",\"action:'bind'\",\"action:'unbind'\",'setInterval(() =>','15000']) assert.ok(emp.includes(x),`employee runtime missing ${x}`);
assert.ok(!emp.includes('doc(IMAGE_BINDING_DOC).onSnapshot'),'old Firestore image binding listener must be removed');
assert.ok(!emp.includes('IMAGE_BINDING_STORE_DOC'),'temporary Firestore binding store must be removed');
assert.ok(cust.includes(\"./api/image-admin?action=bindings\"),'customer runtime must read server bindings');
assert.ok(!cust.includes("doc('product_image_bindings').get()"),'customer must not read legacy Firestore binding doc');
assert.ok(index.includes('index-v37-source.txt?v=56.31&rev=image-binding-backend'));
assert.ok(customer.includes('customer-v37-source.txt?v=56.31'));
console.log('V56.31 server-backed image binding regression: PASS');
""",encoding='utf-8')

print('V56.31 final server-backed image binding migration applied')
