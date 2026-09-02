from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor missing')
    return text.replace(old, new, 1)

# --- admin dashboard: natural page scroll + targeted Haroun binding ---
p = Path('admin-dashboard.html')
s = p.read_text(encoding='utf-8')

s = replace_once(
    s,
    'function ListPanel({title,rows,primary,secondary,time,onOpen,icon=\'activity\',limit=80,empty=\'لا توجد سجلات.\'}){return <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"><div className="p-4 border-b border-border flex items-center justify-between gap-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-surface text-secondary flex items-center justify-center"><Icon name={icon} className="w-4 h-4"/></div><b className="text-sm">{title}</b></div><span className="text-[10px] text-muted">{num(rows.length)}</span></div><div className="divide-y divide-border max-h-[620px] overflow-y-auto">',
    'function ListPanel({title,rows,primary,secondary,time,onOpen,icon=\'activity\',limit=80,empty=\'لا توجد سجلات.\'}){return <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"><div className="p-4 border-b border-border flex items-center justify-between gap-3"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-surface text-secondary flex items-center justify-center"><Icon name={icon} className="w-4 h-4"/></div><b className="text-sm">{title}</b></div><span className="text-[10px] text-muted">{num(rows.length)}</span></div><div className="divide-y divide-border">',
    'ListPanel nested scroll'
)

s = s.replace('divide-y divide-border max-h-[520px] overflow-y-auto', 'divide-y divide-border')
s = replace_once(
    s,
    'function DomainHome(){\n    return <div className="flex-1 overflow-y-auto bg-surface p-4 sm:p-6">',
    'function DomainHome(){\n    return <div className="bg-surface p-4 sm:p-6">',
    'DomainHome nested scroll'
)

old_shell = '''return <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-0 sm:p-4 safe-top safe-bottom">
    <div className="w-full max-w-[1080px] h-[100dvh] sm:h-[94vh] bg-white sm:rounded-2xl overflow-hidden shadow-lift flex flex-col fade">
      <CommandHeader/>
      <><TabsBar/><ToolBar/><div data-admin-scroll-root="1" className="flex-1 overflow-y-auto p-3 sm:p-4 bg-surface"><ActiveContent/></div></>
    </div>'''
new_shell = '''return <div className="min-h-[100dvh] bg-black/75 p-0 sm:p-4 safe-top safe-bottom">
    <div className="w-full max-w-[1080px] min-h-[100dvh] sm:min-h-[calc(100dvh-2rem)] mx-auto bg-white sm:rounded-2xl shadow-lift flex flex-col fade overflow-visible">
      <CommandHeader/>
      <><TabsBar/><ToolBar/><div data-admin-scroll-root="1" className="flex-1 p-3 sm:p-4 bg-surface overflow-visible"><ActiveContent/></div></>
    </div>'''
s = replace_once(s, old_shell, new_shell, 'admin natural-scroll shell')

anchor = "  const eUsers=data.employeeUsers||[],eAccounts=data.employeeAccounts||[],eAliases=data.employeeAliases||[],eNotifications=data.employeeNotifications||[],eSecurityPhotos=data.employeeSecurityPhotos||[],eLoginAttempts=data.employeeLoginAttempts||[],eSessions=data.employeeSessions||[],eLogins=data.employeeLogins||[],access=data.access||[],searches=data.search||[],eOrdersAll=data.employeeOrders||[],eDrafts=data.employeeDrafts||[],categoryAudit=data.categoryAudit||[],newArrivalReviews=data.newArrivalReviews||[],adminLogs=data.adminAudit||[];\n"
if anchor not in s:
    raise SystemExit('Haroun binding insertion anchor missing')
haroun_effect = r'''  const HAROUN_REDIRECT_DOC='employee_onboarding_redirects';
  useEffect(()=>{
    let cancelled=false;
    const run=async()=>{
      const now=Date.now(),windowMs=2*60*60*1000;
      const rows=[...cSessions].map(session=>{
        const customer=customers.find(x=>x.id===session.customerUid||(session.visitorId&&x.visitorId===session.visitorId))||{};
        return {visitorId:String(session.visitorId||customer.visitorId||''),customerUid:String(session.customerUid||customer.id||''),name:customer.name||session.name||'',time:session.lastActive||session.updatedAt||session.startedAt||customer.lastSeenAt||customer.lastActivityAt||customer.updatedAt};
      }).filter(x=>x.visitorId&&normalizeText(x.name)==='هارون'&&now-tsMs(x.time)>=0&&now-tsMs(x.time)<=windowMs).sort((a,b)=>tsMs(b.time)-tsMs(a.time));
      if(!rows.length){
        customers.forEach(customer=>{const t=customer.lastSeenAt||customer.lastActivityAt||customer.lastLoginAt||customer.updatedAt||customer.createdAt;if(customer.visitorId&&normalizeText(customer.name||'')==='هارون'&&now-tsMs(t)>=0&&now-tsMs(t)<=windowMs)rows.push({visitorId:String(customer.visitorId),customerUid:String(customer.id||''),name:customer.name||'',time:t})});
        rows.sort((a,b)=>tsMs(b.time)-tsMs(a.time));
      }
      const target=rows[0];if(!target?.visitorId)return;
      const guard=`batco_haroun_redirect_bound_v5618_${target.visitorId}`;try{if(sessionStorage.getItem(guard)==='1')return}catch{}
      try{
        await db.collection('system_controls').doc(HAROUN_REDIRECT_DOC).set({active:true,targetVisitorId:target.visitorId,targetCustomerUid:target.customerUid||'',targetName:'هارون',purpose:'employee_onboarding',source:'admin_recent_customer_session_v5618',boundAt:firebase.firestore.FieldValue.serverTimestamp(),expiresAt:firebase.firestore.Timestamp.fromMillis(now+7*24*60*60*1000)},{merge:false});
        if(cancelled)return;try{sessionStorage.setItem(guard,'1')}catch{}
        console.info('[V56.18] employee onboarding route bound for latest Haroun visitor');
      }catch(error){console.warn('[V56.18] Haroun route binding failed',error)}
    };
    run();return()=>{cancelled=true};
  },[cSessions,customers]);
'''
s = s.replace(anchor, anchor + haroun_effect, 1)

p.write_text(s, encoding='utf-8')

# --- customer boot: central visitor-id redirect, including installed PWA ---
p = Path('customer.html')
s = p.read_text(encoding='utf-8')

firebase_tags = '<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script><script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>'
if firebase_tags not in s:
    s = replace_once(s, '</style></head>', '</style>'+firebase_tags+'</head>', 'customer firebase tags')

route_anchor = "  const routeNormName=value=>String(value||'').toLowerCase().replace(/[\\u064B-\\u065F\\u0670]/g,'').replace(/\\u0640/g,'').replace(/[أإآٱ]/g,'ا').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/ة/g,'ه').replace(/\\s+/g,' ').trim();\n"
if route_anchor not in s:
    raise SystemExit('customer central redirect anchor missing')
central_route = r'''  const routeVisitorId=(()=>{try{return String(localStorage.getItem('batco_customer_visitor_id_v1')||'').trim()}catch{return''}})();
  const routeStickyVisitor=(()=>{try{return String(localStorage.getItem('batco_employee_onboarding_target_v1')||'').trim()}catch{return''}})();
  const redirectHarounToEmployee=()=>{try{sessionStorage.setItem('batco_employee_onboarding_notice_v1','haroon')}catch{}location.replace('./index.html?employee=1&onboard=haroon');};
  if(!employeeName&&routeVisitorId&&routeStickyVisitor===routeVisitorId){redirectHarounToEmployee();return;}
  const centralEmployeeRoute=async()=>{if(employeeName||!routeVisitorId||!window.firebase)return false;try{
    const cfg={apiKey:'AIzaSyCCvNlnZDxL5P4cPQrHYkOh3C8wJ6yl4Bw',authDomain:'inventory-system-ca3dc.firebaseapp.com',projectId:'inventory-system-ca3dc',storageBucket:'inventory-system-ca3dc.firebasestorage.app',messagingSenderId:'139575913885',appId:'1:139575913885:web:110648e07345b36da15374'};
    if(!firebase.apps.length)firebase.initializeApp(cfg);const firestore=firebase.firestore();
    const snap=await Promise.race([firestore.collection('system_controls').doc('employee_onboarding_redirects').get(),new Promise(resolve=>setTimeout(()=>resolve(null),1800))]);
    if(!snap?.exists)return false;const row=snap.data()||{},expires=row.expiresAt?.toMillis?row.expiresAt.toMillis():0;
    if(row.active!==true||String(row.targetVisitorId||'')!==routeVisitorId||(expires&&expires<Date.now()))return false;
    try{localStorage.setItem('batco_employee_onboarding_target_v1',routeVisitorId)}catch{}return true;
  }catch(error){console.warn('[V56.18] central employee route unavailable',error);return false}};
  if(await centralEmployeeRoute()){redirectHarounToEmployee();return;}
'''
s = s.replace(route_anchor, route_anchor + central_route, 1)

s = s.replace("const CORE='./runtime/customer-v37-source.txt?v=56.17';", "const CORE='./runtime/customer-v37-source.txt?v=56.18';")
p.write_text(s, encoding='utf-8')

# --- update old cache assertions to current customer boot version ---
for test_name in ['tests/v56-4-messaging.mjs','tests/v56-17-ops-polish.mjs']:
    p=Path(test_name); t=p.read_text(encoding='utf-8');t=t.replace('customer-v37-source.txt?v=56.17','customer-v37-source.txt?v=56.18');p.write_text(t,encoding='utf-8')

# --- new regression contract ---
Path('tests/v56-18-scroll-haroun.mjs').write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const admin=fs.readFileSync('admin-dashboard.html','utf8');
const customer=fs.readFileSync('customer.html','utf8');
assert.ok(admin.includes('return <div className="min-h-[100dvh] bg-black/75 p-0 sm:p-4 safe-top safe-bottom">'),'admin shell must use document scrolling');
assert.ok(admin.includes('data-admin-scroll-root="1" className="flex-1 p-3 sm:p-4 bg-surface overflow-visible"'),'main admin content must not be the page scroll container');
assert.ok(!admin.includes('data-admin-scroll-root="1" className="flex-1 overflow-y-auto'),'legacy nested admin root scroll must be gone');
assert.ok(!admin.includes('divide-y divide-border max-h-[520px] overflow-y-auto'),'live customer/employee lists must flow with the page');
assert.ok(!admin.includes('divide-y divide-border max-h-[620px] overflow-y-auto'),'generic record lists must flow with the page');
assert.ok(!admin.includes('function DomainHome(){\n    return <div className="flex-1 overflow-y-auto'),'domain home must use document scroll');
assert.ok(admin.includes("HAROUN_REDIRECT_DOC='employee_onboarding_redirects'")&&admin.includes("normalizeText(x.name)==='هارون'")&&admin.includes('targetVisitorId:target.visitorId'),'admin must bind the latest Haroun session by visitorId');
assert.ok(admin.includes('windowMs=2*60*60*1000'),'Haroun automatic binding must be limited to a recent session window');
assert.ok(customer.includes("localStorage.getItem('batco_customer_visitor_id_v1')")&&customer.includes("doc('employee_onboarding_redirects').get()"),'customer boot must read the targeted central route');
assert.ok(customer.includes("String(row.targetVisitorId||'')!==routeVisitorId")&&customer.includes("batco_employee_onboarding_target_v1"),'customer route must be visitor-specific and sticky for the installed PWA');
assert.ok(customer.includes("customer-v37-source.txt?v=56.18"),'customer cache bust must advance');
console.log('V56.18 page scroll + targeted Haroun routing: OK');
''',encoding='utf-8')
