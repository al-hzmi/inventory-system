from pathlib import Path

ROOT=Path('.')


def replace_once(path, old, new, label):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'{label}: expected marker missing in {path}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

# Customer runtime + deployed customer page: global control with per-customer override.
for rel in ['runtime/customer-v37-source.txt','customer.html']:
    replace_once(
        rel,
        "function CustomerApp({user,profile,onProfileUpdate,guestMode=false,onRequireAuth}){\n  const safeProfile=profile||{name:'',company:'',phone:'',branches:[]};\n  const employeeViewNotice='أنت تستعرض بوابة العملاء بحساب موظف. إنشاء الطلبات وحفظها يتم من نظام الموظفين.';\n  const showNewArrivals=window.__customerPortalControl?.showNewArrivals!==false;",
        "const resolveCustomerNewArrivals=(control,profile)=>typeof profile?.showNewArrivalsOverride==='boolean'?profile.showNewArrivalsOverride:control?.showNewArrivals!==false;\n\nfunction CustomerApp({user,profile,onProfileUpdate,guestMode=false,onRequireAuth}){\n  const safeProfile=profile||{name:'',company:'',phone:'',branches:[]};\n  const employeeViewNotice='أنت تستعرض بوابة العملاء بحساب موظف. إنشاء الطلبات وحفظها يتم من نظام الموظفين.';\n  const showNewArrivals=resolveCustomerNewArrivals(window.__customerPortalControl,safeProfile);",
        'customer new-arrivals resolver',
    )

# Admin customer manager: expose tri-state per-customer control.
replace_once(
    'admin-dashboard.html',
    "function CustomerManagerModal({customer,devices=[],busy=false,onClose,onSave,onStatus,onDelete,onRestore,onDeviceStatus,onDeviceDelete}){",
    "function CustomerManagerModal({customer,devices=[],busy=false,onClose,onSave,onNewArrivals,onStatus,onDelete,onRestore,onDeviceStatus,onDeviceDelete}){",
    'CustomerManagerModal signature',
)

admin=ROOT/'admin-dashboard.html'
text=admin.read_text(encoding='utf-8')
handler_marker="  const deleteCustomerAccount=async c=>{"
handler_code="""  const setCustomerNewArrivals=async(c,value)=>{if(!c?.id)return;setBusy(true);try{const override=typeof value==='boolean'?value:null;const patch={showNewArrivalsOverride:typeof value==='boolean'?value:firebase.firestore.FieldValue.delete(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:'مهند'};await db.collection('customers').doc(c.id).set(patch,{merge:true});await adminAudit('customer_new_arrivals_override_changed',{customerId:c.id,mode:override===null?'inherit':override?'show':'hide'});setData(d=>({...d,customers:d.customers.map(x=>x.id===c.id?{...x,showNewArrivalsOverride:override}:x)}));setCustomerManager(m=>m&&m.id===c.id?{...m,showNewArrivalsOverride:override}:m)}catch(e){console.error(e);alert('تعذر تحديث ظهور «جديدنا» لهذا العميل.')}finally{setBusy(false)}};\n"""
if 'const setCustomerNewArrivals=async' not in text:
    if handler_marker not in text:
        raise SystemExit('setCustomerNewArrivals insertion marker missing')
    text=text.replace(handler_marker,handler_code+handler_marker,1)

permissions_marker='<section className="bg-white border border-danger/20 rounded-2xl p-4 shadow-card"><b className="text-sm text-danger">حذف الحساب من الاستخدام</b>'
permissions_section="""<section className=\"bg-white border border-border rounded-2xl p-4 shadow-card\"><div className=\"flex items-start justify-between gap-3\"><div><b className=\"text-sm\">قسم «جديدنا» لهذا العميل</b><div className=\"text-[10px] text-muted mt-1 leading-5\">استثناء فردي فوق الإعداد العام. «يتبع العام» يعيد العميل لإعداد البوابة الرئيسي.</div></div><Pill tone={customer.showNewArrivalsOverride===true?'ok':customer.showNewArrivalsOverride===false?'bad':'neutral'}>{customer.showNewArrivalsOverride===true?'ظاهر':customer.showNewArrivalsOverride===false?'مخفي':'يتبع العام'}</Pill></div><div className=\"grid grid-cols-3 gap-2 mt-4\"><button disabled={busy} onClick={()=>onNewArrivals(customer,null)} className={`h-10 rounded-xl border text-[10px] font-bold ${typeof customer.showNewArrivalsOverride!=='boolean'?'bg-primary text-white border-primary':'bg-white border-border text-secondary'}`}>يتبع العام</button><button disabled={busy} onClick={()=>onNewArrivals(customer,true)} className={`h-10 rounded-xl border text-[10px] font-bold ${customer.showNewArrivalsOverride===true?'bg-success text-white border-success':'bg-successSoft text-success border-success/20'}`}>إظهار</button><button disabled={busy} onClick={()=>onNewArrivals(customer,false)} className={`h-10 rounded-xl border text-[10px] font-bold ${customer.showNewArrivalsOverride===false?'bg-danger text-white border-danger':'bg-dangerSoft text-danger border-danger/20'}`}>إخفاء</button></div></section>"""
if 'قسم «جديدنا» لهذا العميل' not in text:
    if permissions_marker not in text:
        raise SystemExit('customer actions marker missing')
    text=text.replace(permissions_marker,permissions_section+permissions_marker,1)

old_prop='onSave={saveCustomerProfile} onStatus={updateCustomerStatus}'
new_prop='onSave={saveCustomerProfile} onNewArrivals={setCustomerNewArrivals} onStatus={updateCustomerStatus}'
if new_prop not in text:
    if old_prop not in text:
        raise SystemExit('CustomerManagerModal props marker missing')
    text=text.replace(old_prop,new_prop,1)
admin.write_text(text,encoding='utf-8')

# Cache/service worker version bump so customer devices receive the deployed update promptly.
for rel in ['customer.html','runtime/customer-v37-source.txt']:
    p=ROOT/rel
    text=p.read_text(encoding='utf-8')
    text=text.replace("customer-sw.js?v=35.0","customer-sw.js?v=55.5")
    p.write_text(text,encoding='utf-8')

# New regression test.
test=ROOT/'tests/v55-5-customer-new-arrivals-override.mjs'
test.write_text("""import fs from 'node:fs';\nimport assert from 'node:assert/strict';\n\nconst customer=fs.readFileSync('runtime/customer-v37-source.txt','utf8');\nconst liveCustomer=fs.readFileSync('customer.html','utf8');\nconst admin=fs.readFileSync('admin-dashboard.html','utf8');\n\nfor(const src of [customer,liveCustomer]){\n  assert(src.includes('resolveCustomerNewArrivals'), 'resolver missing');\n  assert(src.includes(\"typeof profile?.showNewArrivalsOverride==='boolean'\"), 'per-customer override missing');\n  assert(src.includes('showNewArrivals=resolveCustomerNewArrivals(window.__customerPortalControl,safeProfile)'), 'UI must use resolver');\n  assert(src.includes('customer-sw.js?v=55.5'), 'customer cache bust missing');\n}\n\nconst resolve=(control,profile)=>typeof profile?.showNewArrivalsOverride==='boolean'?profile.showNewArrivalsOverride:control?.showNewArrivals!==false;\nassert.equal(resolve({showNewArrivals:true},{}),true);\nassert.equal(resolve({showNewArrivals:false},{}),false);\nassert.equal(resolve({showNewArrivals:false},{showNewArrivalsOverride:true}),true,'individual allow must beat global hide');\nassert.equal(resolve({showNewArrivals:true},{showNewArrivalsOverride:false}),false,'individual hide must beat global allow');\nassert.equal(resolve({showNewArrivals:false},{showNewArrivalsOverride:null}),false,'inherit must use global');\n\nfor(const marker of ['setCustomerNewArrivals','customer_new_arrivals_override_changed','قسم «جديدنا» لهذا العميل','onNewArrivals={setCustomerNewArrivals}','يتبع العام']) assert(admin.includes(marker),`admin marker missing: ${marker}`);\nconsole.log('V55_5_CUSTOMER_NEW_ARRIVALS_OVERRIDE_PASS');\n""",encoding='utf-8')

# Dedicated PR gate.
gate=ROOT/'.github/workflows/v55-5-customer-new-arrivals-override-gate.yml'
gate.write_text("""name: V55.5 Customer New Arrivals Override Gate\n\non:\n  pull_request:\n    paths:\n      - 'customer.html'\n      - 'runtime/customer-v37-source.txt'\n      - 'admin-dashboard.html'\n      - 'tests/v55-5-customer-new-arrivals-override.mjs'\n      - '.github/workflows/v55-5-customer-new-arrivals-override-gate.yml'\n  workflow_dispatch:\n\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Verify per-customer new-arrivals control\n        run: node tests/v55-5-customer-new-arrivals-override.mjs\n      - name: Parse JSX\n        run: |\n          npm install --no-save --no-package-lock esbuild@0.25.9 >/dev/null 2>&1\n          node --input-type=module <<'NODE'\n          import fs from 'node:fs';\n          import { transformSync } from 'esbuild';\n          for (const file of ['runtime/customer-v37-source.txt','customer.html','admin-dashboard.html']) {\n            const html=fs.readFileSync(file,'utf8');\n            const blocks=[...html.matchAll(/<script[^>]*type=\"text\\/babel\"[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(x=>x[1]);\n            if(!blocks.length) throw new Error(`No JSX in ${file}`);\n            blocks.forEach(code=>transformSync(code,{loader:'jsx',target:'es2020'}));\n          }\n          console.log('V55_5_JSX_PASS');\n          NODE\n""",encoding='utf-8')

# Remove temporary bootstrap files from final diff.
for rel in ['tools/apply_v55_5.py','.github/workflows/v55-5-apply.yml']:
    p=ROOT/rel
    if p.exists(): p.unlink()

print('V55_5_PATCH_APPLIED')
