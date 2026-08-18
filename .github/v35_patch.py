from pathlib import Path

def rep(s,a,b,name):
    if a not in s:
        raise SystemExit(name+' marker missing')
    return s.replace(a,b,1)

p=Path('index.html');s=p.read_text()
if 'const EMPLOYEE_DIRECT_SESSION' not in s:
    m='const EntryChooser = () => {'
    h="""const EMPLOYEE_DIRECT_SESSION = { nameKey:'inventory_user_name_v2', employeeIdKey:'inventory_employee_id_v2', authVersionKey:'inventory_employee_auth_version_v2', authVersion:'2' };
const hasRememberedEmployeeSession = () => { try { const name=String(localStorage.getItem(EMPLOYEE_DIRECT_SESSION.nameKey)||'').trim(); const employeeId=String(localStorage.getItem(EMPLOYEE_DIRECT_SESSION.employeeIdKey)||'').trim(); const authVersion=String(localStorage.getItem(EMPLOYEE_DIRECT_SESSION.authVersionKey)||''); return Boolean(name&&employeeId&&authVersion===EMPLOYEE_DIRECT_SESSION.authVersion); } catch { return false; } };

"""
    s=rep(s,m,h+m,'index chooser')
old="const __employeeMode = __entryParams.get('employee') === '1';"
new="const __employeeMode = __entryParams.get('employee') === '1' || (__entryParams.get('chooser') !== '1' && hasRememberedEmployeeSession());"
if old in s:s=s.replace(old,new,1)
elif new not in s:raise SystemExit('index route missing')
if "./customer.html?employeeView=1" not in s:
    m="                            {isAdmin ? (\n                                <button onClick={() => { window.location.href = './admin-stocktake.html'; }} title=\"إدارة الجرد\""
    b="""                            {!isAdmin && currentEmployeeId && (
                                <button onClick={() => { window.location.href = './customer.html?employeeView=1'; }} title="عرض بوابة العملاء" className="flex items-center justify-center gap-6 h-48 px-10 rounded-12 bg-bg border border-border text-secondary hover:border-accent/30 hover:text-accent transition-colors animate-flip">
                                    <Icon.Eye className="w-18 h-18" />
                                    <span className="hidden sm:inline text-[11px] font-bold whitespace-nowrap">واجهة العملاء</span>
                                </button>
                            )}
"""
    s=rep(s,m,b+m,'index toolbar')
p.write_text(s)

p=Path('customer.html');s=p.read_text().replace("customer-sw.js?v=33.0","customer-sw.js?v=35.0")
if 'const EMPLOYEE_CUSTOMER_VIEW' not in s:
    m="const CUSTOMER_VISITOR_KEY = 'batco_customer_visitor_id_v1';"
    h="""
const EMPLOYEE_CUSTOMER_ROUTE = new URLSearchParams(window.location.search);
const EMPLOYEE_CUSTOMER_SESSION = (() => { try { const name=String(localStorage.getItem('inventory_user_name_v2')||'').trim(); const employeeId=String(localStorage.getItem('inventory_employee_id_v2')||'').trim(); const authVersion=String(localStorage.getItem('inventory_employee_auth_version_v2')||''); return {valid:Boolean(name&&employeeId&&authVersion==='2'),name,employeeId}; } catch { return {valid:false,name:'',employeeId:''}; } })();
const EMPLOYEE_CUSTOMER_VIEW = EMPLOYEE_CUSTOMER_SESSION.valid && EMPLOYEE_CUSTOMER_ROUTE.get('employeeView')==='1';
const EMPLOYEE_CUSTOMER_AUTO_ROUTE = EMPLOYEE_CUSTOMER_SESSION.valid && !EMPLOYEE_CUSTOMER_VIEW;
window.__employeeCustomerView = EMPLOYEE_CUSTOMER_VIEW;
if(EMPLOYEE_CUSTOMER_AUTO_ROUTE) window.location.replace('./index.html?employee=1');
"""
    s=rep(s,m,m+h,'customer route')
a="async function logCustomerEvent(user,type,label='',data={}){\n  const identity=customerIdentity(user),device=customerDeviceInfo(),guestName=currentGuestName();"
b="async function logCustomerEvent(user,type,label='',data={}){\n  if(!user?.uid && window.__employeeCustomerView) return {activity:false,profile:false,skipped:'employee_view'};\n  const identity=customerIdentity(user),device=customerDeviceInfo(),guestName=currentGuestName();"
if a in s:s=s.replace(a,b,1)
a="async function touchCustomerSession(user,profile,event='active'){\n  const identity=customerIdentity(user),device=customerDeviceInfo();"
b="async function touchCustomerSession(user,profile,event='active'){\n  if(!user?.uid && window.__employeeCustomerView) return {skipped:'employee_view'};\n  const identity=customerIdentity(user),device=customerDeviceInfo();"
if a in s:s=s.replace(a,b,1)
a="function CustomerApp({user,profile,onProfileUpdate,guestMode=false,onRequireAuth}){\n  const safeProfile=profile||{name:'',company:'',phone:'',branches:[]};"
b="function CustomerApp({user,profile,onProfileUpdate,guestMode=false,onRequireAuth}){\n  const safeProfile=profile||{name:'',company:'',phone:'',branches:[]};\n  const employeeViewNotice='أنت تستعرض بوابة العملاء بحساب موظف. إنشاء الطلبات وحفظها يتم من نظام الموظفين.';"
if a in s:s=s.replace(a,b,1)
elif 'employeeViewNotice=' not in s:raise SystemExit('customer app missing')
a0=s.index('const pendingResumeRef=useRef(false);');pos=s.find('if(!guestMode)return;',a0,a0+1200)
if pos>=0:s=s[:pos]+'if(!guestMode||EMPLOYEE_CUSTOMER_VIEW)return;'+s[pos+len('if(!guestMode)return;'):]
a="const next=[branch];setGuestBranches(next);try{localStorage.setItem('customer_guest_branches_v1',JSON.stringify(next))}catch{}"
b="const next=[branch];setGuestBranches(next);if(!EMPLOYEE_CUSTOMER_VIEW){try{localStorage.setItem('customer_guest_branches_v1',JSON.stringify(next))}catch{}}"
if a in s:s=s.replace(a,b,1)
a="async function saveDraft(notes=''){\n    if(!cartItems.length)return;\n    if(guestMode){"
b="async function saveDraft(notes=''){\n    if(!cartItems.length)return;\n    if(guestMode){\n      if(EMPLOYEE_CUSTOMER_VIEW){setToast({type:'info',message:employeeViewNotice});return;}"
if a in s:s=s.replace(a,b,1)
a="if(!cartItems.length){setToast({type:'error',message:'السلة فارغة. لم يتم إنشاء أي طلب.'});return}\n    if(guestMode){"
b="if(!cartItems.length){setToast({type:'error',message:'السلة فارغة. لم يتم إنشاء أي طلب.'});return}\n    if(guestMode){\n      if(EMPLOYEE_CUSTOMER_VIEW){setToast({type:'info',message:employeeViewNotice});return;}"
if a in s:s=s.replace(a,b,1)
a="onCheckout={()=>setCheckout(true)} onSaveDraft={()=>saveDraft('')}"
b="onCheckout={()=>EMPLOYEE_CUSTOMER_VIEW?setToast({type:'info',message:employeeViewNotice}):setCheckout(true)} onSaveDraft={()=>saveDraft('')}"
if a in s:s=s.replace(a,b,1)
a="{guestMode?'تصفح مباشر':(safeProfile.name||'عميل')}"
b="{EMPLOYEE_CUSTOMER_VIEW?(EMPLOYEE_CUSTOMER_SESSION.name||'موظف'):(guestMode?'تصفح مباشر':(safeProfile.name||'عميل'))}"
if a in s:s=s.replace(a,b,1)
ret="{EMPLOYEE_CUSTOMER_VIEW&&<button onClick={()=>{window.location.href='./index.html?employee=1'}} title=\"العودة لنظام الموظفين\" className=\"h-9 px-3 rounded-10 border border-border bg-surface text-[10px] font-bold text-secondary hover:text-accent whitespace-nowrap\">الموظفين</button>}"
if ret not in s:
    m='<button onClick={()=>setPage(\'cart\')} className="relative w-11 h-11 rounded-12 border border-border bg-white flex items-center justify-center">'
    s=rep(s,m,ret+m,'customer return')
a="if(guestMode&&(id==='orders'||id==='account')){onRequireAuth?.(id);return;}"
b="if(EMPLOYEE_CUSTOMER_VIEW&&(id==='orders'||id==='account')){setToast({type:'info',message:employeeViewNotice});return;}if(guestMode&&(id==='orders'||id==='account')){onRequireAuth?.(id);return;}"
if a in s:s=s.replace(a,b,1)
a="{guestMode&&showGuestNamePrompt&&!guestName&&<GuestNamePromptModal onSave={saveGuestName}/>}"
b="{!EMPLOYEE_CUSTOMER_VIEW&&guestMode&&showGuestNamePrompt&&!guestName&&<GuestNamePromptModal onSave={saveGuestName}/>}"
if a in s:s=s.replace(a,b,1)
s=s.replace('<InstallNudge/>{allocItem&&<BranchAllocationModal','{!EMPLOYEE_CUSTOMER_VIEW&&<InstallNudge/>}{allocItem&&<BranchAllocationModal',1)
s=s.replace('if(control.__loading){','if(control.__loading&&!EMPLOYEE_CUSTOMER_VIEW){',1)
s=s.replace('if(!control.enabled&&!previewAllowed){','if(!control.enabled&&!previewAllowed&&!EMPLOYEE_CUSTOMER_VIEW){',1)
a='<Root registrationEnabled={effectiveRegistration} loginEnabled={effectiveLogin}/>'
b="{EMPLOYEE_CUSTOMER_VIEW?<CustomerApp user={null} profile={{name:EMPLOYEE_CUSTOMER_SESSION.name,company:'',phone:'',branches:[]}} guestMode={true} onProfileUpdate={()=>{}} onRequireAuth={()=>{}}/>:<Root registrationEnabled={effectiveRegistration} loginEnabled={effectiveLogin}/>}"
if a in s:s=s.replace(a,b,1)
elif b not in s:raise SystemExit('customer bootstrap missing')
for x in ['EMPLOYEE_CUSTOMER_AUTO_ROUTE',"skipped:'employee_view'",'employeeViewNotice','!EMPLOYEE_CUSTOMER_VIEW&&guestMode&&showGuestNamePrompt','العودة لنظام الموظفين']:
    if x not in s:raise SystemExit('missing '+x)
p.write_text(s)

p=Path('customer-sw.js');sw=p.read_text().replace('batco-customer-v33-0','batco-customer-v35-0')
if 'batco-customer-v35-0' not in sw:raise SystemExit('cache version missing')
p.write_text(sw)
print('V35_PATCH_OK')
