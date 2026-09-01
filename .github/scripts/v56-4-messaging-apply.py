from pathlib import Path
import textwrap


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def replace_between(text, start, end, replacement, label):
    a = text.find(start)
    if a < 0:
        raise SystemExit(f'{label}: start not found')
    b = text.find(end, a + len(start))
    if b < 0:
        raise SystemExit(f'{label}: end not found')
    return text[:a] + replacement + text[b:]

# -----------------------------------------------------------------------------
# 1) Employee delivery: targeted Firestore listeners + display before claim write
# -----------------------------------------------------------------------------
idx_path = Path('runtime/index-v37-source.txt')
idx = idx_path.read_text()
start = 'const useEmployeeAdminMessages = ({sessionName,employeeId,isAdmin}) => {'
end = '\n// ============================================================\n// التطبيق الرئيسي'
new_hook = r'''const useEmployeeAdminMessages = ({sessionName,employeeId,isAdmin}) => {
    const [notification,setNotification]=useState(null);
    const currentRef=useRef(null),claimedRef=useRef(new Set()),feedsRef=useRef(new Map()),dbRef=useRef(null),evaluateRef=useRef(null);
    useEffect(()=>{currentRef.current=notification},[notification]);
    useEffect(()=>{
        if(!sessionName||isAdmin){setNotification(null);currentRef.current=null;return;}
        let active=true,timer=null;const unsubs=[];
        const targetKeys=employeeAliasVariants(sessionName);
        const matchesTarget=row=>{if(employeeId&&row.employeeId&&row.employeeId===employeeId)return true;const keys=Array.isArray(row.targetKeys)?row.targetKeys:[row.targetKey].filter(Boolean);return keys.some(k=>targetKeys.includes(k))};
        const due=row=>{if(row.status!=='active'||!matchesTarget(row))return false;const max=Math.max(1,Number(row.maxShows)||1),shown=Math.max(0,Number(row.shownCount)||0);if(shown>=max)return false;if(row.deliveryMode==='scheduled'){const ms=row.scheduledAt?.toMillis?row.scheduledAt.toMillis():new Date(row.scheduledAt||0).getTime();if(!ms||ms>Date.now())return false;}return true};
        const markShown=async candidate=>{const db=dbRef.current;if(!db)return;const ref=db.collection(EMPLOYEE_NOTIFICATION_COLLECTION).doc(candidate.id);try{await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)return;const row={id:snap.id,...snap.data()};if(!due(row))return;const shown=Math.max(0,Number(row.shownCount)||0),max=Math.max(1,Number(row.maxShows)||1),next=shown+1;tx.set(ref,{shownCount:next,lastShownAt:firebase.firestore.FieldValue.serverTimestamp(),lastShownName:sessionName,status:next>=max?'completed':'active',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})})}catch(e){console.warn('[Employee notification receipt]',e)}};
        const evaluate=()=>{if(!active||currentRef.current)return;const all=[...feedsRef.current.values()].flat(),dedup=[...new Map(all.map(r=>[r.id,r])).values()],at=x=>x?.toMillis?x.toMillis():new Date(x||0).getTime()||0;const candidates=dedup.filter(due).filter(r=>!claimedRef.current.has(r.id)).sort((a,b)=>(a.deliveryMode==='scheduled'?at(a.scheduledAt):at(a.createdAt))-(b.deliveryMode==='scheduled'?at(b.scheduledAt):at(b.createdAt)));const candidate=candidates[0];if(!candidate)return;claimedRef.current.add(candidate.id);currentRef.current=candidate;setNotification(candidate);markShown(candidate)};
        evaluateRef.current=evaluate;
        const bind=(key,query)=>{try{const unsub=query.onSnapshot(snap=>{if(!active)return;feedsRef.current.set(key,snap.docs.map(d=>({id:d.id,...d.data()})));evaluate()},e=>console.warn('[Employee notifications realtime]',key,e));unsubs.push(unsub)}catch(e){console.warn('[Employee notifications query]',key,e)}};
        getDb().then(db=>{if(!active)return;dbRef.current=db;if(employeeId)bind('employeeId',db.collection(EMPLOYEE_NOTIFICATION_COLLECTION).where('employeeId','==',employeeId).limit(50));if(targetKeys[0])bind('targetKey',db.collection(EMPLOYEE_NOTIFICATION_COLLECTION).where('targetKey','==',targetKeys[0]).limit(50));timer=setInterval(evaluate,15000)}).catch(e=>console.warn('[Employee notifications]',e));
        return()=>{active=false;evaluateRef.current=null;if(timer)clearInterval(timer);unsubs.forEach(u=>{try{u?.()}catch{}});feedsRef.current.clear()};
    },[sessionName,employeeId,isAdmin]);
    const dismiss=()=>{currentRef.current=null;setNotification(null);setTimeout(()=>evaluateRef.current?.(),0)};
    return {employeeAdminMessage:notification,dismissEmployeeAdminMessage:dismiss};
};
'''
idx = replace_between(idx, start, end, new_hook, 'employee_hook')
idx_path.write_text(idx)

# -----------------------------------------------------------------------------
# 2) Admin dashboard: customer/guest messaging + Android/mobile message sheets
# -----------------------------------------------------------------------------
adm_path = Path('admin-dashboard.html')
adm = adm_path.read_text()
android_css = r'''
/* V56.4 messaging — mobile/Android ergonomics */
.admin-message-overlay{overscroll-behavior:contain}
.admin-message-sheet{max-height:min(92dvh,760px);min-height:0}
.admin-message-scroll{-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
@media(max-width:639px){
  .admin-message-overlay{align-items:flex-end!important;padding-top:max(10px,env(safe-area-inset-top))!important}
  .admin-message-sheet{width:100%!important;max-height:calc(100dvh - max(10px,env(safe-area-inset-top)))!important;border-radius:22px 22px 0 0!important}
  .admin-message-sheet input,.admin-message-sheet select,.admin-message-sheet textarea{font-size:16px!important}
  .admin-message-sheet button{min-height:44px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .admin-message-scroll{padding-bottom:max(18px,env(safe-area-inset-bottom))!important}
}
'''
adm = replace_once(adm, '\n</style>\n</head>', android_css + '\n</style>\n</head>', 'admin_css')
adm = replace_once(adm,
    'className="fixed inset-0 z-[170] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"',
    'className="admin-message-overlay fixed inset-0 z-[170] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4"',
    'employee_message_overlay')
adm = replace_once(adm,
    'className="w-full sm:max-w-[680px] max-h-[94dvh] bg-white rounded-t-[24px] sm:rounded-[24px] shadow-lift overflow-hidden flex flex-col"',
    'className="admin-message-sheet w-full sm:max-w-[680px] bg-white rounded-t-[24px] sm:rounded-[24px] shadow-lift overflow-hidden flex flex-col"',
    'employee_message_sheet')
adm = replace_once(adm,
    'className="flex-1 overflow-y-auto p-4 sm:p-5 bg-surface grid gap-4"',
    'className="admin-message-scroll flex-1 overflow-y-auto p-4 sm:p-5 bg-surface grid gap-4"',
    'employee_message_scroll')

customer_modal = r'''
function CustomerMessageModal({target,onClose}){
  const [title,setTitle]=useState('رسالة من الإدارة');
  const [message,setMessage]=useState('');
  const [mode,setMode]=useState('next_open');
  const [scheduledLocal,setScheduledLocal]=useState('');
  const [maxShows,setMaxShows]=useState(1);
  const [history,setHistory]=useState([]);
  const [busyLocal,setBusyLocal]=useState(false),[error,setError]=useState('');
  const customerUid=String(target?.customerUid||'').trim(),visitorId=String(target?.visitorId||'').trim(),recipientName=String(target?.name||'عميل').trim()||'عميل',recipientCompany=String(target?.company||'').trim();
  useEffect(()=>{if(!target)return;const field=visitorId?'visitorId':'customerUid',value=visitorId||customerUid;if(!value){setHistory([]);return;}let unsub=null;try{unsub=db.collection('customer_notifications').where(field,'==',value).limit(50).onSnapshot(s=>setHistory(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>tsMs(b.createdAt)-tsMs(a.createdAt))),e=>console.warn('[Customer message history]',e))}catch(e){console.warn('[Customer message history query]',e)}return()=>{try{unsub?.()}catch{}}},[customerUid,visitorId]);
  if(!target)return null;
  const send=async()=>{const body=message.trim(),shows=Math.min(20,Math.max(1,Math.trunc(Number(maxShows)||1)));if(!body)return setError('اكتب نص الرسالة.');if(!customerUid&&!visitorId)return setError('لا توجد هوية جهاز أو حساب يمكن إرسال الرسالة إليه.');let scheduledAt=null;if(mode==='scheduled'){if(!scheduledLocal)return setError('حدد وقت ظهور الرسالة.');const d=new Date(scheduledLocal);if(!Number.isFinite(d.getTime()))return setError('وقت الجدولة غير صحيح.');scheduledAt=firebase.firestore.Timestamp.fromDate(d)}setBusyLocal(true);setError('');try{await db.collection('customer_notifications').add({targetType:customerUid?'customer':'guest',customerUid,visitorId,recipientName,recipientCompany,title:title.trim()||'رسالة من الإدارة',message:body,deliveryMode:mode,scheduledAt,maxShows:shows,shownCount:0,status:'active',createdBy:'مهند',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});await adminAudit('customer_notification_created',{targetType:customerUid?'customer':'guest',customerUid,visitorId,recipientName,deliveryMode:mode,maxShows:shows});setMessage('');setMode('next_open');setScheduledLocal('');setMaxShows(1)}catch(e){console.error(e);setError('تعذر حفظ الرسالة. تحقق من الاتصال وصلاحيات Firestore.')}finally{setBusyLocal(false)}};
  const remove=async n=>{if(!confirm('حذف هذه الرسالة؟ لن تظهر للعميل مرة أخرى.'))return;setBusyLocal(true);try{await db.collection('customer_notifications').doc(n.id).delete();await adminAudit('customer_notification_deleted',{notificationId:n.id,customerUid:n.customerUid||'',visitorId:n.visitorId||'',recipientName:n.recipientName||''})}catch(e){alert('تعذر حذف الرسالة.')}finally{setBusyLocal(false)}};
  const statusLabel=n=>n.status==='completed'?'تم عرضها':n.status==='active'?'بانتظار العرض':n.status||'—';
  return <div className="admin-message-overlay fixed inset-0 z-[175] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}><div className="admin-message-sheet w-full sm:max-w-[680px] bg-white rounded-t-[24px] sm:rounded-[24px] shadow-lift overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
    <header className="p-4 border-b border-border flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-[10px] text-info font-bold">رسائل العملاء</div><b className="text-base block truncate">{recipientName}</b><div className="text-[10px] text-muted mt-1">{customerUid?'عميل مسجل':visitorId?'زائر سجّل اسمه فقط':'هوية غير مكتملة'}{recipientCompany?` · ${recipientCompany}`:''}</div></div><button onClick={onClose} className="w-11 h-11 rounded-xl border border-border flex items-center justify-center"><Icon name="x" className="w-4 h-4"/></button></header>
    <div className="admin-message-scroll flex-1 overflow-y-auto p-4 sm:p-5 bg-surface grid gap-4">
      <section className="bg-white border border-border rounded-2xl p-4 shadow-card grid gap-4"><div><b className="text-sm">رسالة جديدة</b><div className="text-[10px] text-muted mt-1">ستظهر داخل بوابة العملاء على نفس جهاز الزائر، أو على حساب العميل إن وُجد.</div></div>
        <label className="text-xs font-bold">العنوان<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-2 w-full h-12 rounded-xl border border-border px-3 outline-none focus:border-accent"/></label>
        <label className="text-xs font-bold">الرسالة<textarea value={message} onChange={e=>setMessage(e.target.value)} rows="5" className="mt-2 w-full min-h-[132px] rounded-xl border border-border p-3 outline-none focus:border-accent resize-none" placeholder="اكتب الرسالة"/></label>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-bold">وقت الظهور<select value={mode} onChange={e=>setMode(e.target.value)} className="mt-2 w-full h-12 rounded-xl border border-border px-3 bg-white outline-none"><option value="next_open">أول ما يفتح البوابة</option><option value="scheduled">وقت مجدول</option></select></label><label className="text-xs font-bold">عدد مرات الظهور<input value={maxShows} onChange={e=>setMaxShows(e.target.value)} type="number" min="1" max="20" inputMode="numeric" className="mt-2 w-full h-12 rounded-xl border border-border px-3 outline-none"/></label></div>
        {mode==='scheduled'&&<label className="text-xs font-bold">التاريخ والوقت<input type="datetime-local" value={scheduledLocal} onChange={e=>setScheduledLocal(e.target.value)} className="mt-2 w-full h-12 rounded-xl border border-border px-3 outline-none"/></label>}
        {error&&<div className="bg-dangerSoft text-danger rounded-xl p-3 text-xs font-bold">{error}</div>}
        <button disabled={busyLocal||!message.trim()} onClick={send} className="w-full h-12 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-40">{busyLocal?'جاري الإرسال...':'إرسال الرسالة'}</button>
      </section>
      <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"><div className="p-4 border-b border-border"><b className="text-sm">آخر الرسائل</b></div><div className="divide-y divide-border max-h-[280px] overflow-y-auto">{history.length?history.slice(0,12).map(n=><div key={n.id} className="p-3.5"><div className="flex justify-between gap-2"><div className="min-w-0"><b className="text-xs block truncate">{n.title||'رسالة من الإدارة'}</b><div className="text-[10px] text-secondary mt-1 whitespace-pre-wrap">{clampText(n.message,150)}</div><div className="text-[9px] text-muted mt-2">{statusLabel(n)} · {dateTime(n.createdAt)}</div></div><button disabled={busyLocal} onClick={()=>remove(n)} className="w-10 h-10 rounded-xl bg-dangerSoft text-danger flex items-center justify-center shrink-0"><Icon name="x" className="w-3.5 h-3.5"/></button></div></div>):<div className="p-8 text-center text-xs text-muted">لا توجد رسائل سابقة.</div>}</div></section>
    </div>
  </div></div>;
}

'''
adm = replace_once(adm, 'const customerEventNames=', customer_modal + 'const customerEventNames=', 'customer_modal_insert')
adm = replace_once(adm,
    "  const [employeeMessageTarget,setEmployeeMessageTarget]=useState(null);\n  const [customerManager,setCustomerManager]=useState(null);",
    "  const [employeeMessageTarget,setEmployeeMessageTarget]=useState(null);\n  const [customerMessageTarget,setCustomerMessageTarget]=useState(null);\n  const [customerManager,setCustomerManager]=useState(null);",
    'customer_message_state')
adm = replace_once(adm,
    "onClick={()=>c.id?setCustomerManager(c):setDetail(s)}",
    "onClick={()=>c.id?setCustomerManager(c):(String(s.name||'').trim()?setCustomerMessageTarget({kind:'guest',customerUid:'',visitorId:s.visitorId||'',name:s.name||'',company:''}):setDetail(s))}",
    'named_guest_click')
adm = replace_once(adm,
    "<div className=\"grid grid-cols-2 gap-2 mt-3\"><button onClick={()=>setCustomerManager(c)} className=\"h-9 rounded-lg bg-primary text-white text-[10px] font-bold\">إدارة العميل</button><button onClick={()=>setDetail(c)} className=\"h-9 rounded-lg border border-border text-[10px] font-bold\">كل التفاصيل</button></div>",
    "<div className=\"grid grid-cols-2 gap-2 mt-3\"><button onClick={()=>setCustomerManager(c)} className=\"h-11 rounded-xl bg-primary text-white text-[10px] font-bold\">إدارة العميل</button><button onClick={()=>setCustomerMessageTarget({kind:'customer',customerUid:c.id,visitorId:c.visitorId||'',name:c.name||'',company:c.company||''})} className=\"h-11 rounded-xl bg-infoSoft text-info border border-info/10 text-[10px] font-bold\">إرسال رسالة</button><button onClick={()=>setDetail(c)} className=\"col-span-2 h-11 rounded-xl border border-border text-[10px] font-bold\">كل التفاصيل</button></div>",
    'customer_account_message_button')
adm = replace_once(adm,
    "    {employeeMessageTarget&&<EmployeeMessageModal target={employeeMessageTarget} notifications={eNotifications} onClose={()=>setEmployeeMessageTarget(null)}/>}\n    {customerManager&&",
    "    {employeeMessageTarget&&<EmployeeMessageModal target={employeeMessageTarget} notifications={eNotifications} onClose={()=>setEmployeeMessageTarget(null)}/>}\n    {customerMessageTarget&&<CustomerMessageModal target={customerMessageTarget} onClose={()=>setCustomerMessageTarget(null)}/>}\n    {customerManager&&",
    'customer_message_mount')
adm_path.write_text(adm)

# -----------------------------------------------------------------------------
# 3) Customer portal: realtime messages for visitorId and customerUid
# -----------------------------------------------------------------------------
cust_path = Path('runtime/customer-v37-source.txt')
cust = cust_path.read_text()
customer_css = r'''
  /* V56.4 الإدارة → العميل: Android-first message card */
  .customer-admin-message-host{position:fixed;inset:0;z-index:260;pointer-events:none;display:flex;align-items:flex-end;justify-content:center;padding:14px;padding-bottom:max(14px,env(safe-area-inset-bottom))}
  .customer-admin-message-card{pointer-events:auto;width:100%;max-width:520px;max-height:min(72dvh,580px);background:#fff;border:1px solid #E7E5E4;border-radius:22px;box-shadow:0 22px 70px rgba(28,25,23,.20);overflow:hidden;display:flex;flex-direction:column}
  .customer-admin-message-body{overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
  @media(max-width:639px){.customer-admin-message-host{padding:10px;padding-bottom:max(10px,env(safe-area-inset-bottom))}.customer-admin-message-card{border-radius:20px;max-height:78dvh}.customer-admin-message-card button{min-height:46px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}}
'''
cust = replace_once(cust, '\n</style>\n</head>', customer_css + '\n</style>\n</head>', 'customer_message_css')

host = r'''
const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications';
function CustomerAdminNotificationHost(){
  const [notification,setNotification]=useState(null);
  const currentRef=useRef(null),claimedRef=useRef(new Set()),feedsRef=useRef(new Map()),uidRef=useRef(auth.currentUser?.uid||''),evaluateRef=useRef(null);
  useEffect(()=>{currentRef.current=notification},[notification]);
  useEffect(()=>{
    if(window.__employeeCustomerView)return;
    let active=true,visitorUnsub=null,uidUnsub=null,authUnsub=null,timer=null;
    const matches=row=>Boolean((row.visitorId&&row.visitorId===customerVisitorId)||(uidRef.current&&row.customerUid&&row.customerUid===uidRef.current));
    const due=row=>{if(row.status!=='active'||!matches(row))return false;const max=Math.max(1,Number(row.maxShows)||1),shown=Math.max(0,Number(row.shownCount)||0);if(shown>=max)return false;if(row.deliveryMode==='scheduled'){const ms=row.scheduledAt?.toMillis?row.scheduledAt.toMillis():new Date(row.scheduledAt||0).getTime();if(!ms||ms>Date.now())return false;}return true};
    const markShown=async candidate=>{const ref=db.collection(CUSTOMER_NOTIFICATION_COLLECTION).doc(candidate.id);try{await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)return;const row={id:snap.id,...snap.data()};if(!due(row))return;const shown=Math.max(0,Number(row.shownCount)||0),max=Math.max(1,Number(row.maxShows)||1),next=shown+1;tx.set(ref,{shownCount:next,lastShownAt:firebase.firestore.FieldValue.serverTimestamp(),lastShownVisitorId:customerVisitorId,lastShownCustomerUid:uidRef.current||'',status:next>=max?'completed':'active',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})})}catch(e){console.warn('[Customer notification receipt]',e)}};
    const evaluate=()=>{if(!active||currentRef.current)return;const all=[...feedsRef.current.values()].flat(),dedup=[...new Map(all.map(r=>[r.id,r])).values()],at=x=>x?.toMillis?x.toMillis():new Date(x||0).getTime()||0,candidate=dedup.filter(due).filter(r=>!claimedRef.current.has(r.id)).sort((a,b)=>(a.deliveryMode==='scheduled'?at(a.scheduledAt):at(a.createdAt))-(b.deliveryMode==='scheduled'?at(b.scheduledAt):at(b.createdAt)))[0];if(!candidate)return;claimedRef.current.add(candidate.id);currentRef.current=candidate;setNotification(candidate);markShown(candidate)};
    evaluateRef.current=evaluate;
    const bind=(key,field,value)=>{if(!value)return null;try{return db.collection(CUSTOMER_NOTIFICATION_COLLECTION).where(field,'==',value).limit(50).onSnapshot(s=>{if(!active)return;feedsRef.current.set(key,s.docs.map(d=>({id:d.id,...d.data()})));evaluate()},e=>console.warn('[Customer notifications realtime]',key,e))}catch(e){console.warn('[Customer notifications query]',key,e);return null}};
    visitorUnsub=bind('visitor','visitorId',customerVisitorId);
    authUnsub=auth.onAuthStateChanged(u=>{uidRef.current=u?.uid||'';try{uidUnsub?.()}catch{};feedsRef.current.delete('uid');uidUnsub=bind('uid','customerUid',uidRef.current);evaluate()});
    timer=setInterval(evaluate,15000);
    return()=>{active=false;evaluateRef.current=null;if(timer)clearInterval(timer);try{visitorUnsub?.()}catch{}try{uidUnsub?.()}catch{}try{authUnsub?.()}catch{}feedsRef.current.clear()};
  },[]);
  if(!notification)return null;
  const dismiss=()=>{currentRef.current=null;setNotification(null);setTimeout(()=>evaluateRef.current?.(),0)};
  return <div className="customer-admin-message-host" aria-live="polite"><section className="customer-admin-message-card fade-in" role="dialog" aria-label="رسالة من الإدارة"><div className="p-4 border-b border-border flex items-start gap-3"><div className="w-11 h-11 rounded-12 bg-infoSoft text-info flex items-center justify-center shrink-0"><Icon name="info" className="w-5 h-5"/></div><div className="min-w-0 flex-1"><div className="text-[10px] font-bold text-info">رسالة من الإدارة</div><h2 className="text-[16px] font-bold text-primary mt-1 leading-6">{notification.title||'رسالة من الإدارة'}</h2></div><button onClick={dismiss} aria-label="إغلاق" className="w-11 h-11 rounded-xl border border-border text-muted flex items-center justify-center shrink-0"><Icon name="close" className="w-4 h-4"/></button></div><div className="customer-admin-message-body p-4"><p className="text-[13px] text-secondary leading-7 whitespace-pre-wrap m-0">{notification.message||''}</p><button onClick={dismiss} className="ui-btn ui-btn-primary w-full mt-5">تم</button></div></section></div>;
}

'''
cust = replace_once(cust, 'function CustomerPortalBootstrap(){', host + 'function CustomerPortalBootstrap(){', 'customer_host_insert')
cust = replace_once(cust,
    "ReactDOM.createRoot(document.getElementById('root')).render(<CustomerPortalBootstrap/>);",
    "ReactDOM.createRoot(document.getElementById('root')).render(<><CustomerPortalBootstrap/><CustomerAdminNotificationHost/></>);",
    'customer_host_mount')
cust_path.write_text(cust)

# -----------------------------------------------------------------------------
# 4) Bootstrap cache busts + Android employee notification card
# -----------------------------------------------------------------------------
boot_path = Path('index.html')
boot = boot_path.read_text()
boot = replace_once(boot, "const CORE='./runtime/index-v37-source.txt?v=56.0';", "const CORE='./runtime/index-v37-source.txt?v=56.4';", 'employee_core_bust')
notification_start = '    const notification=`const EmployeeAdminNotification = ({notification,onClose}) => {'
notification_end = '    html=html.slice(0,msgStart)+notification+html.slice(hookStart);'
new_notification = r'''    const notification=`const EmployeeAdminNotification = ({notification,onClose}) => {
    const closeRef = useRef(onClose);
    useEffect(() => { closeRef.current = onClose; }, [onClose]);
    useEffect(() => { if (!notification?.id) return; const timer = setTimeout(() => closeRef.current?.(), 10000); return () => clearTimeout(timer); }, [notification?.id]);
    return (
        <div className="fixed inset-0 z-[280] pointer-events-none flex items-end justify-center px-10 font-sans" style={{paddingBottom:'max(10px, env(safe-area-inset-bottom))'}} aria-live="polite">
            <div role="status" className="pointer-events-auto w-full max-w-[520px] bg-white border border-border rounded-[20px] shadow-lift overflow-hidden animate-card" style={{maxHeight:'min(72dvh, 560px)'}}>
                <div className="px-14 py-12 border-b border-border flex items-start gap-10">
                    <div className="w-40 h-40 rounded-12 bg-infoSoft text-info flex items-center justify-center flex-shrink-0" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-20 h-20"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg></div>
                    <div className="min-w-0 flex-1"><div className="text-[10px] text-info font-bold">رسالة من الإدارة</div><div className="text-[15px] font-bold text-primary mt-2 leading-6">{notification?.title || 'رسالة من الإدارة'}</div></div>
                    <button type="button" onClick={onClose} aria-label="إغلاق الإشعار" title="إغلاق" className="w-40 h-40 rounded-12 border border-border flex items-center justify-center text-muted flex-shrink-0 active:bg-surface" style={{touchAction:'manipulation'}}>×</button>
                </div>
                <div className="px-14 py-14 overflow-y-auto" style={{WebkitOverflowScrolling:'touch'}}><div className="text-[13px] text-secondary leading-7 whitespace-pre-wrap">{notification?.message || ''}</div><button type="button" onClick={onClose} className="w-full h-48 rounded-12 bg-primary text-white text-[12px] font-bold mt-14" style={{touchAction:'manipulation'}}>تم</button></div>
            </div>
        </div>
    );
};

`;
'''
a = boot.find(notification_start)
if a < 0: raise SystemExit('employee_notification_template: start not found')
b = boot.find(notification_end, a)
if b < 0: raise SystemExit('employee_notification_template: end not found')
boot = boot[:a] + new_notification + boot[b:]
boot_path.write_text(boot)

cust_boot_path = Path('customer.html')
cust_boot = cust_boot_path.read_text()
cust_boot = replace_once(cust_boot, "const CORE='./runtime/customer-v37-source.txt?v=55.5';", "const CORE='./runtime/customer-v37-source.txt?v=56.4';", 'customer_core_bust')
cust_boot_path.write_text(cust_boot)

# -----------------------------------------------------------------------------
# 5) Regression test
# -----------------------------------------------------------------------------
test = r'''import fs from 'node:fs';
import assert from 'node:assert/strict';

const adm=fs.readFileSync('admin-dashboard.html','utf8');
const idx=fs.readFileSync('runtime/index-v37-source.txt','utf8');
const cust=fs.readFileSync('runtime/customer-v37-source.txt','utf8');
const boot=fs.readFileSync('index.html','utf8');
const custBoot=fs.readFileSync('customer.html','utf8');

assert.match(idx,/where\('employeeId','==',employeeId\)\.limit\(50\)/,'employee messages must query recipient directly');
assert.match(idx,/where\('targetKey','==',targetKeys\[0\]\)\.limit\(50\)/,'employee alias fallback must be targeted');
assert.ok(!idx.includes("collection(EMPLOYEE_NOTIFICATION_COLLECTION).limit(150).onSnapshot"),'legacy global 150 listener must be removed');
assert.ok(idx.indexOf('setNotification(candidate);markShown(candidate)') < idx.indexOf("console.warn('[Employee notification receipt]'"),'employee UI must not be blocked by receipt write');

assert.ok(adm.includes("db.collection('customer_notifications').add"),'admin must be able to create customer messages');
assert.ok(adm.includes('CustomerMessageModal'),'customer message modal missing');
assert.ok(adm.includes("setCustomerMessageTarget({kind:'guest'"),'named guest message action missing');
assert.ok(adm.includes("setCustomerMessageTarget({kind:'customer'"),'registered customer message action missing');
assert.ok(adm.includes('.admin-message-sheet'),'Android admin message sheet CSS missing');

assert.ok(cust.includes("const CUSTOMER_NOTIFICATION_COLLECTION='customer_notifications'"),'customer notification collection missing');
assert.ok(cust.includes('CustomerAdminNotificationHost'),'customer notification host missing');
assert.match(cust,/where\(field,'==',value\)\.limit\(50\)/,'customer notifications must use targeted equality query');
assert.ok(cust.includes('visitorId===customerVisitorId'),'guest visitor identity targeting missing');
assert.ok(cust.includes('setNotification(candidate);markShown(candidate)'),'customer UI must display before best-effort receipt write');
assert.ok(cust.includes('.customer-admin-message-card'),'Android customer message card CSS missing');
assert.ok(cust.includes('<CustomerPortalBootstrap/><CustomerAdminNotificationHost/>'),'customer notification host must be mounted');

assert.ok(boot.includes("index-v37-source.txt?v=56.4"),'employee cache bust missing');
assert.ok(custBoot.includes("customer-v37-source.txt?v=56.4"),'customer cache bust missing');
assert.ok(boot.includes('maxHeight:\'min(72dvh, 560px)\''),'employee Android dynamic viewport card missing');

console.log('V56.4 messaging regression: OK');
'''
Path('tests/v56-4-messaging.mjs').write_text(test)
print('V56.4 messaging patch prepared')
