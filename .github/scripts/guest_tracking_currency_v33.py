from pathlib import Path


def require(text, needle, label):
    if needle not in text:
        raise SystemExit(f'Missing marker: {label}')


def replace_once(text, old, new, label):
    require(text, old, label)
    return text.replace(old, new, 1)

customer_path = Path('customer.html')
admin_path = Path('admin-dashboard.html')
index_path = Path('index.html')
sw_path = Path('customer-sw.js')

customer = customer_path.read_text(encoding='utf-8')
admin = admin_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')
sw = sw_path.read_text(encoding='utf-8')

# -----------------------------------------------------------------------------
# 1) Currency compatibility: U+20C1 is not available on many Windows/Android
#    font stacks yet. Use an explicit Arabic abbreviation that renders everywhere.
# -----------------------------------------------------------------------------
for name, text in [('customer.html', customer), ('admin-dashboard.html', admin), ('index.html', index)]:
    if '⃁' in text:
        text = text.replace('⃁', 'ر.س')
    if '⃁' in text:
        raise SystemExit(f'Currency glyph remains in {name}')
    if name == 'customer.html':
        customer = text
    elif name == 'admin-dashboard.html':
        admin = text
    else:
        index = text

# -----------------------------------------------------------------------------
# 2) Guest identity: progressively identify a visitor from the first-name prompt
#    without requiring a full account. Reuse existing activity/session collections
#    so the admin dashboard sees the same realtime stream.
# -----------------------------------------------------------------------------
if "const CUSTOMER_VISITOR_KEY = 'batco_customer_visitor_id_v1';" not in customer:
    customer = replace_once(
        customer,
        "const GUEST_NAME_KEY = 'customer_guest_name_v1';",
        "const GUEST_NAME_KEY = 'customer_guest_name_v1';\nconst CUSTOMER_VISITOR_KEY = 'batco_customer_visitor_id_v1';",
        'guest name constant'
    )

identity_marker = "const CUSTOMER_DEVICE_INSTALL_KEY='batco_customer_device_install_v1';"
if 'const customerVisitorId=(()=>{' not in customer:
    identity_helpers = r'''const customerVisitorId=(()=>{
  try{
    let id=localStorage.getItem(CUSTOMER_VISITOR_KEY);
    if(!id){id=`cv_${Date.now().toString(36)}_${uidPart()}_${uidPart()}`;localStorage.setItem(CUSTOMER_VISITOR_KEY,id)}
    return id;
  }catch{return `cv_${Date.now().toString(36)}_${uidPart()}`}
})();
const currentGuestName=()=>{try{return String(localStorage.getItem(GUEST_NAME_KEY)||'').trim()}catch{return''}};
const customerIdentity=user=>user?.uid
  ? {key:`u_${user.uid}`,customerUid:user.uid,visitorId:customerVisitorId,identityType:'account'}
  : {key:`g_${customerVisitorId}`,customerUid:'',visitorId:customerVisitorId,identityType:'guest'};
'''
    customer = replace_once(customer, identity_marker, identity_helpers + identity_marker, 'customer device marker')

# Replace telemetry/session functions as one bounded block.
telemetry_start = customer.find("async function logCustomerEvent(user,type,label='',data={}){")
telemetry_end = customer.find('function normalizePhone(raw){', telemetry_start)
if telemetry_start < 0 or telemetry_end < 0:
    raise SystemExit('Telemetry block markers missing')
telemetry_block = r'''async function logCustomerEvent(user,type,label='',data={}){
  const identity=customerIdentity(user),device=customerDeviceInfo(),guestName=currentGuestName();
  const activityWrite=db.collection(CUSTOMER_ACTIVITY_COLLECTION).add({
    customerUid:identity.customerUid,visitorId:identity.visitorId,identityType:identity.identityType,
    name:user?.uid?'':guestName,sessionId:customerSessionId,type,label:String(label||''),data:data||{},device,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  });
  const writes=[activityWrite];
  if(user?.uid){
    writes.push(db.collection(CUSTOMER_COLLECTION).doc(user.uid).set({
      visitorId:identity.visitorId,lastActivityAt:firebase.firestore.FieldValue.serverTimestamp(),lastActivityType:String(type||'activity'),
      lastActivityLabel:String(label||''),lastSessionId:customerSessionId,lastSeenAt:firebase.firestore.FieldValue.serverTimestamp(),
      lastDevice:{deviceId:device.deviceId||'',fingerprint:device.fingerprint||'',userAgent:device.userAgent||'',platform:device.platform||'',viewport:device.viewport||'',screen:device.screen||'',standalone:!!device.standalone,timezone:device.timezone||''},
      telemetryVersion:5
    },{merge:true}));
  }
  const results=await Promise.allSettled(writes);
  results.forEach((r,i)=>{if(r.status==='rejected')console.warn('[Customer telemetry]',i,r.reason?.message||r.reason)});
  return {activity:results[0]?.status==='fulfilled',profile:user?.uid?(results[1]?.status==='fulfilled'):false};
}
async function touchCustomerSession(user,profile,event='active'){
  const identity=customerIdentity(user),device=customerDeviceInfo();
  try{
    const key='batco_customer_session_started_'+identity.key+'_'+customerSessionId;
    const first=!sessionStorage.getItem(key);
    const resolvedName=String(profile?.name||(!user?.uid?currentGuestName():'')).trim();
    const payload={customerUid:identity.customerUid,visitorId:identity.visitorId,identityType:identity.identityType,sessionId:customerSessionId,name:resolvedName,company:profile?.company||'',phone:profile?.phone||'',event,lastActive:firebase.firestore.FieldValue.serverTimestamp(),device,userAgent:device.userAgent||'',platform:device.platform||''};
    if(first){payload.startedAt=firebase.firestore.FieldValue.serverTimestamp();sessionStorage.setItem(key,'1')}
    const sessionWrite=db.collection(CUSTOMER_SESSION_COLLECTION).doc(`${identity.key}_${customerSessionId}`).set(payload,{merge:true});
    const writes=[sessionWrite];
    if(user?.uid){
      writes.push(db.collection(CUSTOMER_COLLECTION).doc(user.uid).set({
        visitorId:identity.visitorId,lastSeenAt:firebase.firestore.FieldValue.serverTimestamp(),lastSessionId:customerSessionId,
        lastSessionEvent:String(event||'active'),lastDevice:{deviceId:device.deviceId||'',fingerprint:device.fingerprint||'',userAgent:device.userAgent||'',platform:device.platform||'',viewport:device.viewport||'',screen:device.screen||'',standalone:!!device.standalone,timezone:device.timezone||''},telemetryVersion:5
      },{merge:true}));
    }
    const results=await Promise.allSettled(writes);
    results.forEach((r,i)=>{if(r.status==='rejected')console.warn('[Customer session]',i,r.reason?.message||r.reason)});
    return {session:results[0]?.status==='fulfilled',profile:user?.uid?(results[1]?.status==='fulfilled'):false};
  }catch(e){console.warn('[Customer session]',e?.message||e);return {session:false,profile:false}}
}

'''
customer = customer[:telemetry_start] + telemetry_block + customer[telemetry_end:]

# The name prompt now immediately becomes a lightweight lead/session identity.
old_save_name = "  const saveGuestName=clean=>{try{localStorage.setItem(GUEST_NAME_KEY,clean)}catch{}setGuestName(clean);setShowGuestNamePrompt(false)};"
new_save_name = r'''  const saveGuestName=async clean=>{
    try{localStorage.setItem(GUEST_NAME_KEY,clean)}catch{}
    setGuestName(clean);setShowGuestNamePrompt(false);
    await Promise.allSettled([
      touchCustomerSession(null,{name:clean,company:'',phone:''},'guest_name_captured'),
      logCustomerEvent(null,'guest_name_captured',clean,{name:clean,source:'name_prompt'})
    ]);
  };'''
if old_save_name in customer:
    customer = customer.replace(old_save_name, new_save_name, 1)
elif "guest_name_captured',clean" not in customer:
    raise SystemExit('Guest name save marker missing')

# Keep guest presence alive from the first visit, then enrich it when a name is supplied.
pending_ref_marker = "  const pendingResumeRef=useRef(false);"
if 'batco_guest_enter_logged_' not in customer:
    guest_presence = r'''
  useEffect(()=>{
    if(!guestMode)return;
    const profileNow=()=>({name:currentGuestName(),company:'',phone:''});
    const enterKey='batco_guest_enter_logged_'+customerSessionId;
    try{
      if(!sessionStorage.getItem(enterKey)){
        sessionStorage.setItem(enterKey,'1');
        touchCustomerSession(null,profileNow(),'guest_enter');
        logCustomerEvent(null,'guest_enter','فتح بوابة العملاء',{source:'customer_portal'});
      }else touchCustomerSession(null,profileNow(),'guest_active');
    }catch{touchCustomerSession(null,profileNow(),'guest_enter')}
    const heartbeat=setInterval(()=>touchCustomerSession(null,profileNow(),'guest_active'),45000);
    const onVisible=()=>{if(document.visibilityState==='visible')touchCustomerSession(null,profileNow(),'guest_active')};
    const onPageHide=()=>{touchCustomerSession(null,profileNow(),'guest_exit')};
    document.addEventListener('visibilitychange',onVisible);
    window.addEventListener('pagehide',onPageHide);
    return()=>{clearInterval(heartbeat);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('pagehide',onPageHide)};
  },[guestMode]);
'''
    customer = replace_once(customer, pending_ref_marker, pending_ref_marker + guest_presence, 'pending resume ref')

# Link the eventual account to the lightweight visitor identity.
profile_marker = "const profileData={name:savedGuestName"
if profile_marker in customer:
    customer = customer.replace(profile_marker, "const profileData={visitorId:customerVisitorId,guestSessionId:customerSessionId,name:savedGuestName", 1)
elif 'visitorId:customerVisitorId,guestSessionId:customerSessionId' not in customer:
    raise SystemExit('Registration profile marker missing')

# Bump PWA registration query so deployed clients pick up the new document behavior quickly.
customer = customer.replace("customer-sw.js?v=32.0", "customer-sw.js?v=33.0")
sw = sw.replace("const CACHE = 'batco-customer-v30-2';", "const CACHE = 'batco-customer-v33-0';")

# -----------------------------------------------------------------------------
# 3) Admin: count and display named guests before they create a full account.
# -----------------------------------------------------------------------------
old_online = "  const customerOnline=new Set([...cSessions.filter(s=>online(s.lastActive||s.updatedAt)).map(s=>s.customerUid),...customers.filter(c=>online(c.lastSeenAt||c.lastActivityAt)).map(c=>c.id)]);"
new_online = r'''  const registeredVisitorIds=new Set(customers.map(c=>c.visitorId).filter(Boolean));
  const customerOnline=new Set([...cSessions.filter(s=>s.customerUid&&online(s.lastActive||s.updatedAt)).map(s=>s.customerUid),...customers.filter(c=>online(c.lastSeenAt||c.lastActivityAt)).map(c=>c.id)].filter(Boolean));
  const guestOnlineVisitors=new Set(cSessions.filter(s=>!s.customerUid&&s.visitorId&&!registeredVisitorIds.has(s.visitorId)&&online(s.lastActive||s.updatedAt)).map(s=>s.visitorId));
  const customerOnlineCount=customerOnline.size+guestOnlineVisitors.size;'''
if old_online in admin:
    admin = admin.replace(old_online,new_online,1)
elif 'const customerOnlineCount=' not in admin:
    raise SystemExit('Admin customer online marker missing')
admin = admin.replace('customerOnline.size','customerOnlineCount')

# Prevent anonymous pre-account activity from creating a fake "بدون اسم شركة" company.
old_companies = "cActivity.forEach(a=>ensure(customers.find(x=>x.id===a.customerUid)?.company).activity.push(a));cSessions.forEach(a=>ensure(customers.find(x=>x.id===a.customerUid)?.company).sessions.push(a));"
new_companies = "cActivity.forEach(a=>{const c=customers.find(x=>x.id===a.customerUid||(a.visitorId&&x.visitorId===a.visitorId));if(c)ensure(c.company).activity.push(a)});cSessions.forEach(a=>{const c=customers.find(x=>x.id===a.customerUid||(a.visitorId&&x.visitorId===a.visitorId));if(c)ensure(c.company).sessions.push(a)});"
if old_companies in admin:
    admin = admin.replace(old_companies,new_companies,1)
elif 'a.visitorId&&x.visitorId===a.visitorId' not in admin:
    raise SystemExit('Companies aggregation marker missing')

# Human-readable guest event names.
old_event_names = "const customerEventNames={profile_activity:'آخر نشاط محفوظ',account_created:'إنشاء حساب'"
new_event_names = "const customerEventNames={guest_enter:'دخول زائر',guest_name_captured:'سجّل اسمه',guest_active:'نشاط زائر',guest_exit:'مغادرة زائر',profile_activity:'آخر نشاط محفوظ',account_created:'إنشاء حساب'"
if old_event_names in admin:
    admin = admin.replace(old_event_names,new_event_names,1)
elif "guest_name_captured:'سجّل اسمه'" not in admin:
    raise SystemExit('Customer event names marker missing')

# Guest activity cards resolve the name from the live session, and later from the linked account.
old_activity_fn = "  function CustomerActivity(){const rows=sortRows(recentCustomerActivity.filter(match),r=>r.createdAt||r.timestamp);return <div className=\"grid md:grid-cols-2 gap-3\">{rows.length?rows.map(r=>{const c=customers.find(x=>x.id===r.customerUid);return <RecordButton key={r.id} row={r} title={eventName(r.type)} sub={`${c?.company||r.company||'—'} · ${c?.name||r.name||'—'}${r.query?' · '+r.query:''}`} time={r.createdAt||r.timestamp} icon=\"activity\"/>}):<Empty/>}</div>}"
new_activity_fn = "  function CustomerActivity(){const rows=sortRows(recentCustomerActivity.filter(match),r=>r.createdAt||r.timestamp);return <div className=\"grid md:grid-cols-2 gap-3\">{rows.length?rows.map(r=>{const c=customers.find(x=>x.id===r.customerUid||(r.visitorId&&x.visitorId===r.visitorId));const s=r.visitorId?[...cSessions].sort((a,b)=>tsMs(b.lastActive)-tsMs(a.lastActive)).find(x=>x.visitorId===r.visitorId):null;return <RecordButton key={r.id} row={r} title={eventName(r.type)} sub={`${c?.company||r.company||(r.identityType==='guest'?'زائر':'—')} · ${c?.name||r.name||s?.name||(r.identityType==='guest'?'زائر غير مسمى':'—')}${r.query?' · '+r.query:''}`} time={r.createdAt||r.timestamp} icon=\"activity\"/>}):<Empty/>}</div>}"
if old_activity_fn in admin:
    admin = admin.replace(old_activity_fn,new_activity_fn,1)
elif 'زائر غير مسمى' not in admin:
    raise SystemExit('Customer activity function marker missing')

# Replace CustomerLive as a bounded function so guest sessions participate in presence/timeline.
live_start = admin.find('  function CustomerLive(){')
live_end = admin.find('\n  function EmployeeOverview(){', live_start)
if live_start < 0 or live_end < 0:
    raise SystemExit('CustomerLive boundaries missing')
new_live = r'''  function CustomerLive(){
    const latest=[...cSessions].filter(s=>s.customerUid||!registeredVisitorIds.has(s.visitorId)).sort((a,b)=>tsMs(b.lastActive||b.updatedAt)-tsMs(a.lastActive||a.updatedAt));
    const byIdentity=new Map();
    latest.forEach(s=>{const key=s.customerUid?`u:${s.customerUid}`:(s.visitorId?`g:${s.visitorId}`:`s:${s.id}`);if(!byIdentity.has(key))byIdentity.set(key,s)});
    const presence=[...byIdentity.values()].sort((a,b)=>tsMs(b.lastActive||b.updatedAt)-tsMs(a.lastActive||a.updatedAt));
    const loginUids=new Set(cLogins.map(x=>x.customerUid).filter(Boolean));
    const loginEvents=[...cLogins.map(x=>({type:'login',customerUid:x.customerUid,visitorId:x.visitorId||'',name:x.name||x.phone||'—',company:x.company||'',time:x.createdAt||x.timestamp,device:x.userAgent||x.device?.userAgent||''})),...customers.filter(c=>!loginUids.has(c.id)&&c.lastLoginAt).map(c=>({type:'login',customerUid:c.id,visitorId:c.visitorId||'',name:c.name||c.phone||'—',company:c.company||'',time:c.lastLoginAt,device:c.lastDevice?.userAgent||'',fallback:true}))];
    const guestEntryEvents=cSessions.filter(s=>!s.customerUid&&s.visitorId&&!registeredVisitorIds.has(s.visitorId)&&s.startedAt).map(s=>({type:'guest_login',visitorId:s.visitorId,name:s.name||'زائر غير مسمى',company:'',time:s.startedAt,device:s.userAgent||s.device?.userAgent||''}));
    const exitEvents=presence.filter(s=>!online(s.lastActive||s.updatedAt)).map(s=>({type:'exit',customerUid:s.customerUid||'',visitorId:s.visitorId||'',name:s.name||'زائر غير مسمى',company:s.company||'',time:s.lastActive||s.updatedAt,device:s.userAgent||s.device?.userAgent||''}));
    const timeline=[...loginEvents,...guestEntryEvents,...exitEvents].sort((a,b)=>tsMs(b.time)-tsMs(a.time)).slice(0,50);
    const namedGuestCount=presence.filter(s=>!s.customerUid&&String(s.name||'').trim()).length;
    return <div className="grid gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2"><Stat label="متصل الآن" value={customerOnlineCount} tone="success"/><Stat label="زوار سجّلوا الاسم" value={namedGuestCount} tone="info"/><Stat label="طلبات اليوم" value={todayCustomerOrders.length}/><Stat label="قيمة اليوم" value={`${num(todayCustomerOrderValue)} ر.س`} tone="accent"/><Stat label="بوابة العملاء" value={control.enabled?'تعمل':'متوقفة'} tone={control.enabled?'success':'danger'}/></div>
      <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-4">
        <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"><div className="p-4 border-b border-border flex justify-between items-center"><div><b className="text-sm">العملاء والزوار الآن</b><div className="text-[10px] text-muted mt-1">يظهر الزائر من أول دخوله، وبمجرد كتابة الاسم يتحول السجل فورًا إلى اسمه حتى قبل إنشاء الحساب.</div></div><button onClick={()=>setModule('portal')} className="h-9 px-3 rounded-xl border border-border text-[10px] font-bold">تشغيل البوابة</button></div><div className="divide-y divide-border max-h-[520px] overflow-y-auto">{presence.length?presence.map((s,i)=>{const c=customers.find(x=>x.id===s.customerUid||(s.visitorId&&x.visitorId===s.visitorId))||{},on=online(s.lastActive||s.updatedAt),isGuest=!s.customerUid;const title=c.name||s.name||(isGuest?'زائر غير مسمى':'عميل');const stage=isGuest?(String(s.name||'').trim()?'سجّل اسمه فقط · لم ينشئ حسابًا بعد':'دخل البوابة · لم يسجل اسمه بعد'):(c.company||s.company||'حساب عميل');return <button key={s.id||i} onClick={()=>c.id?setCustomerManager(c):setDetail(s)} className="w-full p-3.5 text-right hover:bg-surface flex items-center gap-3"><span className={`w-2.5 h-2.5 rounded-full ${on?'bg-success':'bg-muted'}`}></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><b className="text-xs block truncate">{title}</b>{isGuest&&<Pill tone={String(s.name||'').trim()?'info':'neutral'}>{String(s.name||'').trim()?'بالاسم فقط':'زائر'}</Pill>}</div><span className="text-[10px] text-muted block mt-1 truncate">{stage} · {on?'داخل البوابة الآن':`آخر نشاط ${ago(s.lastActive||s.updatedAt)}`}</span></div></button>}):<div className="py-12 text-center text-xs text-muted">لا توجد زيارات عملاء بعد.</div>}</div></section>
        <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"><div className="p-4 border-b border-border"><b className="text-sm">الدخول والخروج</b><div className="text-[10px] text-muted mt-1">الدخول يظهر حتى قبل إنشاء الحساب، والخروج يُستنتج عند توقف نشاط الجلسة.</div></div><div className="divide-y divide-border max-h-[520px] overflow-y-auto">{timeline.length?timeline.map((e,i)=>{const c=customers.find(x=>x.id===e.customerUid||(e.visitorId&&x.visitorId===e.visitorId))||{};const isEnter=e.type==='login'||e.type==='guest_login';const isGuest=e.type==='guest_login'||(!e.customerUid&&e.visitorId);return <div key={`${e.type}_${e.customerUid||e.visitorId||i}_${tsMs(e.time)}_${i}`} className="p-3.5 flex items-center gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEnter?'bg-successSoft text-success':'bg-surface text-secondary'}`}><Icon name={isEnter?'check':'back'} className="w-4 h-4"/></div><div className="min-w-0 flex-1"><div className="flex gap-2 items-center"><b className="text-xs truncate">{c.name||e.name||(isGuest?'زائر غير مسمى':'عميل')}</b><Pill tone={isEnter?'ok':'neutral'}>{isEnter?'دخل':'غادر'}</Pill>{isGuest&&<Pill tone="info">{c.id?'تحول لحساب':'زائر'}</Pill>}</div><div className="text-[9px] text-muted mt-1 truncate">{c.company||e.company||(isGuest?'قبل التسجيل الكامل':'—')} · {deviceLabel(e.device)}</div></div><span className="text-[10px] text-muted">{dateTime(e.time)}</span></div>}):<div className="py-12 text-center text-xs text-muted">لا توجد حركات مسجلة بعد.</div>}</div></section>
      </div>
    </div>
  }
'''
admin = admin[:live_start] + new_live + admin[live_end:]

# Update overview activity count to include guest activity already present in the shared stream.
# No extra collection is required; this also reduces the chance of Firestore rule mismatch.

# Persist all modified files.
customer_path.write_text(customer,encoding='utf-8')
admin_path.write_text(admin,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
sw_path.write_text(sw,encoding='utf-8')

# Critical invariants.
for p in [customer_path,admin_path,index_path]:
    if '⃁' in p.read_text(encoding='utf-8'):
        raise SystemExit(f'Unsupported currency glyph still present in {p}')

checks={
    'customer.html':['customerVisitorId','guest_name_captured','guest_enter','guest_active','visitorId:customerVisitorId','customer-sw.js?v=33.0'],
    'admin-dashboard.html':['customerOnlineCount','العملاء والزوار الآن','زوار سجّلوا الاسم','guest_name_captured','زائر غير مسمى'],
    'index.html':['ر.س'],
    'customer-sw.js':['batco-customer-v33-0']
}
for file,needles in checks.items():
    text=Path(file).read_text(encoding='utf-8')
    for needle in needles:
        if needle not in text: raise SystemExit(f'{file}: missing {needle}')

print('V33 patch applied: currency compatibility + progressive guest identity/presence.')
