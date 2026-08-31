from pathlib import Path

ROOT=Path('.')

def replace_once(path,old,new,label):
    p=ROOT/path; text=p.read_text(encoding='utf-8')
    if new in text:return
    if old not in text:raise SystemExit(f'{label}: expected marker missing in {path}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')

replace_once('runtime/customer-v37-source.txt',
"function CustomerApp({user,profile,onProfileUpdate,guestMode=false,onRequireAuth}){\n  const safeProfile=profile||{name:'',company:'',phone:'',branches:[]};\n  const employeeViewNotice='أنت تستعرض بوابة العملاء بحساب موظف. إنشاء الطلبات وحفظها يتم من نظام الموظفين.';\n  const showNewArrivals=window.__customerPortalControl?.showNewArrivals!==false;",
"const resolveCustomerNewArrivals=(control,profile)=>typeof profile?.showNewArrivalsOverride==='boolean'?profile.showNewArrivalsOverride:control?.showNewArrivals!==false;\n\nfunction CustomerApp({user,profile,onProfileUpdate,guestMode=false,onRequireAuth}){\n  const safeProfile=profile||{name:'',company:'',phone:'',branches:[]};\n  const employeeViewNotice='أنت تستعرض بوابة العملاء بحساب موظف. إنشاء الطلبات وحفظها يتم من نظام الموظفين.';\n  const showNewArrivals=resolveCustomerNewArrivals(window.__customerPortalControl,safeProfile);",'customer resolver')

replace_once('customer.html',"const CORE='./runtime/customer-v37-source.txt?v=55.4';","const CORE='./runtime/customer-v37-source.txt?v=55.5';",'customer bootstrap')

runtime=ROOT/'runtime/customer-v37-source.txt'; r=runtime.read_text(encoding='utf-8')
r=r.replace("navigator.serviceWorker.register('./customer-sw.js?v=35.0'","navigator.serviceWorker.register('./customer-sw.js?v=55.5'",1)
runtime.write_text(r,encoding='utf-8')

replace_once('admin-dashboard.html',
"function CustomerManagerModal({customer,devices=[],busy=false,onClose,onSave,onStatus,onDelete,onRestore,onDeviceStatus,onDeviceDelete}){",
"function CustomerManagerModal({customer,devices=[],busy=false,onClose,onSave,onNewArrivals,onStatus,onDelete,onRestore,onDeviceStatus,onDeviceDelete}){",'manager signature')

admin=ROOT/'admin-dashboard.html'; text=admin.read_text(encoding='utf-8')
marker="  const deleteCustomerAccount=async c=>{"
handler="""  const setCustomerNewArrivals=async(c,value)=>{if(!c?.id)return;setBusy(true);try{const override=typeof value==='boolean'?value:null;const patch={showNewArrivalsOverride:typeof value==='boolean'?value:firebase.firestore.FieldValue.delete(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:'مهند'};await db.collection('customers').doc(c.id).set(patch,{merge:true});await adminAudit('customer_new_arrivals_override_changed',{customerId:c.id,mode:override===null?'inherit':override?'show':'hide'});setData(d=>({...d,customers:d.customers.map(x=>x.id===c.id?{...x,showNewArrivalsOverride:override}:x)}));setCustomerManager(m=>m&&m.id===c.id?{...m,showNewArrivalsOverride:override}:m)}catch(e){console.error(e);alert('تعذر تحديث ظهور «جديدنا» لهذا العميل.')}finally{setBusy(false)}};\n"""
if 'const setCustomerNewArrivals=async' not in text:
    if marker not in text:raise SystemExit('handler marker missing')
    text=text.replace(marker,handler+marker,1)

pmark='<section className="bg-white border border-danger/20 rounded-2xl p-4 shadow-card"><b className="text-sm text-danger">حذف الحساب من الاستخدام</b>'
section="""<section className=\"bg-white border border-border rounded-2xl p-4 shadow-card\"><div className=\"flex items-start justify-between gap-3\"><div><b className=\"text-sm\">قسم «جديدنا» لهذا العميل</b><div className=\"text-[10px] text-muted mt-1 leading-5\">استثناء فردي فوق الإعداد العام. «يتبع العام» يعيد العميل لإعداد البوابة الرئيسي.</div></div><Pill tone={customer.showNewArrivalsOverride===true?'ok':customer.showNewArrivalsOverride===false?'bad':'neutral'}>{customer.showNewArrivalsOverride===true?'ظاهر':customer.showNewArrivalsOverride===false?'مخفي':'يتبع العام'}</Pill></div><div className=\"grid grid-cols-3 gap-2 mt-4\"><button disabled={busy} onClick={()=>onNewArrivals(customer,null)} className={`h-10 rounded-xl border text-[10px] font-bold ${typeof customer.showNewArrivalsOverride!=='boolean'?'bg-primary text-white border-primary':'bg-white border-border text-secondary'}`}>يتبع العام</button><button disabled={busy} onClick={()=>onNewArrivals(customer,true)} className={`h-10 rounded-xl border text-[10px] font-bold ${customer.showNewArrivalsOverride===true?'bg-success text-white border-success':'bg-successSoft text-success border-success/20'}`}>إظهار</button><button disabled={busy} onClick={()=>onNewArrivals(customer,false)} className={`h-10 rounded-xl border text-[10px] font-bold ${customer.showNewArrivalsOverride===false?'bg-danger text-white border-danger':'bg-dangerSoft text-danger border-danger/20'}`}>إخفاء</button></div></section>"""
if 'قسم «جديدنا» لهذا العميل' not in text:
    if pmark not in text:raise SystemExit('actions marker missing')
    text=text.replace(pmark,section+pmark,1)

old='onSave={saveCustomerProfile} onStatus={updateCustomerStatus}'
new='onSave={saveCustomerProfile} onNewArrivals={setCustomerNewArrivals} onStatus={updateCustomerStatus}'
if new not in text:
    if old not in text:raise SystemExit('modal props marker missing')
    text=text.replace(old,new,1)
text='\n'.join(line.rstrip() for line in text.splitlines())+'\n'; admin.write_text(text,encoding='utf-8')

test=ROOT/'tests/v55-5-customer-new-arrivals-override.mjs'
test.write_text("""import fs from 'node:fs';\nimport assert from 'node:assert/strict';\nconst customer=fs.readFileSync('runtime/customer-v37-source.txt','utf8');const boot=fs.readFileSync('customer.html','utf8');const admin=fs.readFileSync('admin-dashboard.html','utf8');\nassert(customer.includes('resolveCustomerNewArrivals'));assert(customer.includes(\"typeof profile?.showNewArrivalsOverride==='boolean'\"));assert(customer.includes('showNewArrivals=resolveCustomerNewArrivals(window.__customerPortalControl,safeProfile)'));assert(customer.includes(\"navigator.serviceWorker.register('./customer-sw.js?v=55.5'\"));assert(boot.includes(\"runtime/customer-v37-source.txt?v=55.5\"));\nconst resolve=(control,profile)=>typeof profile?.showNewArrivalsOverride==='boolean'?profile.showNewArrivalsOverride:control?.showNewArrivals!==false;\nassert.equal(resolve({showNewArrivals:true},{}),true);assert.equal(resolve({showNewArrivals:false},{}),false);assert.equal(resolve({showNewArrivals:false},{showNewArrivalsOverride:true}),true);assert.equal(resolve({showNewArrivals:true},{showNewArrivalsOverride:false}),false);assert.equal(resolve({showNewArrivals:false},{showNewArrivalsOverride:null}),false);\nfor(const marker of ['setCustomerNewArrivals','customer_new_arrivals_override_changed','قسم «جديدنا» لهذا العميل','onNewArrivals={setCustomerNewArrivals}','يتبع العام'])assert(admin.includes(marker),`missing ${marker}`);\nconsole.log('V55_5_CUSTOMER_NEW_ARRIVALS_OVERRIDE_PASS');\n""",encoding='utf-8')

# Remove only the patch runner. The workflow is converted to the permanent PR gate afterwards.
Path('tools/apply_v55_5.py').unlink()
print('V55_5_PATCH_APPLIED')
