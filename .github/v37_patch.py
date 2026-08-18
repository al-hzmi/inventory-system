from pathlib import Path
import re

idxp=Path('index.html'); idx=idxp.read_text()
cp=Path('customer.html'); cust=cp.read_text()
swp=Path('customer-sw.js'); sw=swp.read_text()
gp=Path('.github/workflows/site-quality-gate.yml'); gate=gp.read_text()

# Returning employee: inventory_user_name_v2 is an employee-only persisted identity.
a=idx.index('const EMPLOYEE_DIRECT_SESSION =')
b=idx.index('const EntryChooser =',a)
idx=idx[:a]+"""const EMPLOYEE_DIRECT_SESSION = { nameKey:'inventory_user_name_v2', employeeIdKey:'inventory_employee_id_v2', authVersionKey:'inventory_employee_auth_version_v2', tokenKey:'inventory_admin_token_v2', authVersion:'2' };
const getRememberedEmployeeIdentity = () => { try { const name=String(localStorage.getItem(EMPLOYEE_DIRECT_SESSION.nameKey)||'').trim(); const employeeId=String(localStorage.getItem(EMPLOYEE_DIRECT_SESSION.employeeIdKey)||'').trim(); const authVersion=String(localStorage.getItem(EMPLOYEE_DIRECT_SESSION.authVersionKey)||''); const token=String(localStorage.getItem(EMPLOYEE_DIRECT_SESSION.tokenKey)||''); return {valid:Boolean(name),name,employeeId,authVersion,token,modern:Boolean(name&&employeeId&&authVersion===EMPLOYEE_DIRECT_SESSION.authVersion)}; } catch { return {valid:false,name:'',employeeId:'',authVersion:'',token:'',modern:false}; } };
const hasRememberedEmployeeSession = () => getRememberedEmployeeIdentity().valid;

"""+idx[b:]
idx,n=re.subn(r"const __employeeMode = .*?;", "const __employeeMode = hasRememberedEmployeeSession() || __entryParams.get('employee') === '1';", idx, count=1)
if n!=1: raise SystemExit('employee mode patch failed')

# Force an existing root-scoped customer worker to check for its corrected V37 version.
if 'navigator.serviceWorker.getRegistrations()' not in idx:
    idx=idx.replace('</head>',"""<script>
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(reg => reg.update().catch(() => {}))).catch(() => {}); }); }
</script>
</head>""",1)

# Blocking management message -> small non-blocking top notification.
a=idx.index('const EmployeeAdminMessageScreen =') if 'const EmployeeAdminMessageScreen =' in idx else idx.index('const EmployeeAdminNotification =')
b=idx.index('const useEmployeeAdminMessages =',a)
idx=idx[:a]+"""const EmployeeAdminNotification = ({notification,onClose}) => {
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; }, [onClose]);
    useEffect(() => {
        if (!notification?.id) return;
        const timer = setTimeout(() => closeRef.current?.(), 10000);
        return () => clearTimeout(timer);
    }, [notification?.id]);
    return (
        <div className="fixed inset-x-0 top-0 z-[80] pointer-events-none px-12 pt-10 font-sans" style={{paddingTop:'max(10px, env(safe-area-inset-top))'}} aria-live="polite">
            <div role="status" className="pointer-events-auto mx-auto w-full max-w-[440px] bg-white/95 backdrop-blur border border-border rounded-16 shadow-lift px-12 py-11 flex items-start gap-10 animate-card">
                <div className="w-40 h-40 rounded-12 bg-successSoft text-success flex items-center justify-center flex-shrink-0" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-20 h-20"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-6 text-[10px] text-muted"><span className="font-bold text-success">الإدارة</span><span>الآن</span></div>
                    <div className="text-[13px] font-bold text-primary mt-1 truncate">{notification?.title || 'رسالة من الإدارة'}</div>
                    <div className="text-[11px] text-secondary leading-5 mt-2 whitespace-pre-wrap overflow-hidden" style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{notification?.message || ''}</div>
                </div>
                <button type="button" onClick={onClose} aria-label="إغلاق الإشعار" title="إغلاق" className="w-32 h-32 rounded-10 flex items-center justify-center text-muted hover:text-primary hover:bg-surface flex-shrink-0">×</button>
            </div>
        </div>
    );
};

"""+idx[b:]
idx,n=re.subn(r"\n\s*if \(employeeAdminMessage\) \{\s*return <EmployeeAdmin(?:MessageScreen|Notification)[^;]+;\s*\}\s*\n", '\n', idx, count=1, flags=re.S)
if n!=1 and 'if (employeeAdminMessage)' in idx: raise SystemExit('blocking notification removal failed')
app=idx.index('const App = () => {')
root=idx.index('<div className="min-h-screen font-sans">',app)
rootstr='<div className="min-h-screen font-sans">'
if 'employeeAdminMessage && <EmployeeAdminNotification' not in idx[root:root+650]:
    idx=idx[:root]+idx[root:].replace(rootstr,rootstr+"\n            {employeeAdminMessage && <EmployeeAdminNotification notification={employeeAdminMessage} onClose={dismissEmployeeAdminMessage} />}",1)

# Compact visible manual switch on mobile and desktop.
pattern=re.compile(r"\{!isAdmin && currentEmployeeId && \(\s*<button onClick=\{\(\) => \{ window\.location\.href = '\./customer\.html\?employeeView=1'; \}\}[^>]*>\s*<Icon\.Eye[^>]*/>\s*<span[^>]*>.*?</span>\s*</button>\s*\)\}",re.S)
repl="""{!isAdmin && currentEmployeeId && (
                                <button onClick={() => { window.location.href = './customer.html?employeeView=1'; }} title="التبديل إلى واجهة العملاء" aria-label="التبديل إلى واجهة العملاء" className="flex items-center justify-center gap-5 h-40 px-9 rounded-10 bg-bg border border-border text-secondary hover:border-accent/30 hover:text-accent transition-colors animate-flip">
                                    <Icon.Eye className="w-16 h-16" />
                                    <span className="text-[10px] font-bold whitespace-nowrap">عملاء</span>
                                </button>
                            )}"""
idx,n=pattern.subn(repl,idx,count=1)
if n!=1 and '>عملاء</span>' not in idx: raise SystemExit('customer switch patch failed')
idxp.write_text(idx)

# customer.html: redirect any remembered employee before customer app boots, unless the manual employee view flag is present.
early="""<script>
(function(){
  try {
    const params=new URLSearchParams(window.location.search);
    const employeeName=String(localStorage.getItem('inventory_user_name_v2')||'').trim();
    if(employeeName && params.get('employeeView')!=='1') window.location.replace('./index.html?employee=1');
  } catch (_) {}
})();
</script>
"""
if "employeeName && params.get('employeeView')!=='1'" not in cust:
    needle='<script src="https://cdn.tailwindcss.com"></script>'
    if needle not in cust: raise SystemExit('customer early redirect anchor missing')
    cust=cust.replace(needle,early+needle,1)
a=cust.index('const EMPLOYEE_CUSTOMER_SESSION = (() =>')
b=cust.index('const EMPLOYEE_CUSTOMER_VIEW =',a)
cust=cust[:a]+"""const EMPLOYEE_CUSTOMER_SESSION = (() => { try { const name=String(localStorage.getItem('inventory_user_name_v2')||'').trim(); const employeeId=String(localStorage.getItem('inventory_employee_id_v2')||'').trim(); const authVersion=String(localStorage.getItem('inventory_employee_auth_version_v2')||''); const token=String(localStorage.getItem('inventory_admin_token_v2')||''); const modern=Boolean(name&&employeeId&&authVersion==='2'); const remembered=Boolean(name); return {valid:remembered,name,employeeId,authVersion,token,modern}; } catch { return {valid:false,name:'',employeeId:'',authVersion:'',token:'',modern:false}; } })();
"""+cust[b:]
cust=cust.replace('customer-sw.js?v=35.0','customer-sw.js?v=37.0')
cp.write_text(cust)

# Restrict customer PWA worker document handling to customer.html only.
sw=sw.replace("const CACHE = 'batco-customer-v35-0';","const CACHE = 'batco-customer-v37-0';")
if 'isCustomerDocument' not in sw:
    needle="  if (url.origin !== self.location.origin) return;\n  if (req.mode === 'navigate' || req.destination === 'document') {"
    repl="  if (url.origin !== self.location.origin) return;\n  const isDocument = req.mode === 'navigate' || req.destination === 'document';\n  const isCustomerDocument = /\\/customer\\.html$/.test(url.pathname);\n  if (isDocument && !isCustomerDocument) return;\n  if (isDocument) {"
    if needle not in sw: raise SystemExit('service worker scope anchor missing')
    sw=sw.replace(needle,repl,1)
swp.write_text(sw)

# Align permanent CI expectations.
gate=gate.replace("'index: employee auto route': \"__entryParams.get('chooser') !== '1' && hasRememberedEmployeeSession()\" in idx,","'index: employee auto route': \"const __employeeMode = hasRememberedEmployeeSession() || __entryParams.get('employee') === '1';\" in idx,")
gate=gate.replace("'index: manual customer-view switch': \"./customer.html?employeeView=1\" in idx and 'واجهة العملاء' in idx,","'index: manual customer-view switch': \"./customer.html?employeeView=1\" in idx and '>عملاء</span>' in idx,")
gate=gate.replace("'customer: service worker v35': 'customer-sw.js?v=35.0' in cust and 'batco-customer-v35-0' in sw,","'customer: service worker v37': 'customer-sw.js?v=37.0' in cust and 'batco-customer-v37-0' in sw,")
anchor="'index: remembered employee detection': 'hasRememberedEmployeeSession' in idx and \"inventory_employee_auth_version_v2\" in idx,"
if anchor in gate and 'employee notification overlay' not in gate:
    gate=gate.replace(anchor,anchor+"\n            'index: employee notification overlay': 'EmployeeAdminNotification' in idx and 'employeeAdminMessage && <EmployeeAdminNotification' in idx and 'EmployeeAdminMessageScreen' not in idx,")
gp.write_text(gate)

print('PATCH_OK')
