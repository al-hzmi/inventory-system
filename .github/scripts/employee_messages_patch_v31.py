from pathlib import Path

ADMIN_COMPONENT = r'''
function EmployeeMessageModal({target,notifications,onClose}){
  const [title,setTitle]=useState('رسالة من الإدارة');
  const [message,setMessage]=useState('');
  const [mode,setMode]=useState('next_open');
  const [scheduledLocal,setScheduledLocal]=useState('');
  const [maxShows,setMaxShows]=useState(1);
  const [busyLocal,setBusyLocal]=useState(false),[error,setError]=useState('');
  if(!target)return null;
  const account=target.account||null;
  const employeeId=account?.id||target.user?.employeeId||'';
  const allNames=[target.name,...(target.legacyNames||[]),...(account?.aliases||[])].filter(Boolean);
  const targetKeys=[...new Set(allNames.flatMap(employeeAliasVariants))];
  const mine=(notifications||[]).filter(n=>{
    if(employeeId&&n.employeeId===employeeId)return true;
    const keys=Array.isArray(n.targetKeys)?n.targetKeys:[n.targetKey].filter(Boolean);
    return keys.some(k=>targetKeys.includes(k));
  }).sort((a,b)=>tsMs(b.createdAt)-tsMs(a.createdAt));
  const statusLabel=n=>{
    if(n.status==='completed')return 'اكتملت';
    if(n.deliveryMode==='scheduled'&&tsMs(n.scheduledAt)>Date.now())return 'مجدولة';
    return 'بانتظار الظهور';
  };
  const send=async()=>{
    const body=message.trim();if(!body)return setError('اكتب نص الرسالة.');
    const shows=Math.max(1,Math.min(20,Number(maxShows)||1));
    let scheduledAt=null;
    if(mode==='scheduled'){
      if(!scheduledLocal)return setError('حدد تاريخ ووقت ظهور الرسالة.');
      const d=new Date(scheduledLocal);if(!Number.isFinite(d.getTime()))return setError('وقت الجدولة غير صحيح.');
      scheduledAt=firebase.firestore.Timestamp.fromDate(d);
    }
    setBusyLocal(true);setError('');
    try{
      await db.collection('employee_notifications').add({employeeId,employeeName:target.name||account?.canonicalName||'',targetKey:targetKeys[0]||normalizeText(target.name||''),targetKeys,title:title.trim()||'رسالة من الإدارة',message:body,deliveryMode:mode,scheduledAt,maxShows:shows,shownCount:0,status:'active',createdBy:'مهند',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      await adminAudit('employee_notification_created',{employeeId,employeeName:target.name||'',deliveryMode:mode,maxShows:shows});
      setMessage('');setMode('next_open');setScheduledLocal('');setMaxShows(1);
    }catch(e){console.error(e);setError('تعذر حفظ الرسالة. تحقق من الاتصال وصلاحيات Firestore.')}finally{setBusyLocal(false)}
  };
  const remove=async n=>{if(!confirm('حذف هذه الرسالة؟ لن تظهر للموظف مرة أخرى.'))return;setBusyLocal(true);try{await db.collection('employee_notifications').doc(n.id).delete();await adminAudit('employee_notification_deleted',{notificationId:n.id,employeeId:n.employeeId||'',employeeName:n.employeeName||''})}catch(e){alert('تعذر حذف الرسالة.')}finally{setBusyLocal(false)}};
  return <div className="fixed inset-0 z-[170] bg-black/45 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}><div className="w-full sm:max-w-[680px] max-h-[94dvh] bg-white rounded-t-[24px] sm:rounded-[24px] shadow-lift overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
    <header className="p-4 border-b border-border flex items-center justify-between gap-3"><div className="min-w-0"><div className="text-[10px] text-info font-bold">رسائل الموظفين</div><b className="text-base block truncate">{target.name||account?.canonicalName||'موظف'}</b><div className="text-[10px] text-muted mt-1">أرسل رسالة تظهر داخل النظام فقط لهذا الموظف.</div></div><button onClick={onClose} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center"><Icon name="x" className="w-4 h-4"/></button></header>
    <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-surface grid gap-4">
      <section className="bg-white border border-border rounded-2xl p-4 shadow-card grid gap-4"><div><b className="text-sm">رسالة جديدة</b><div className="text-[10px] text-muted mt-1">الافتراضي: تظهر مرة واحدة في أول فتح قادم للنظام.</div></div>
        <label className="text-xs font-bold">العنوان<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-border px-3 outline-none focus:border-accent"/></label>
        <label className="text-xs font-bold">الرسالة<textarea value={message} onChange={e=>setMessage(e.target.value)} rows="5" className="mt-2 w-full rounded-xl border border-border p-3 outline-none focus:border-accent resize-none" placeholder="اكتب الرسالة"/></label>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-bold">وقت الظهور<select value={mode} onChange={e=>setMode(e.target.value)} className="mt-2 w-full h-11 rounded-xl border border-border px-3 bg-white outline-none"><option value="next_open">أول ما يفتح النظام</option><option value="scheduled">وقت مجدول</option></select></label><label className="text-xs font-bold">عدد مرات الظهور<input value={maxShows} onChange={e=>setMaxShows(e.target.value)} type="number" min="1" max="20" inputMode="numeric" className="mt-2 w-full h-11 rounded-xl border border-border px-3 outline-none"/><span className="block text-[9px] text-muted mt-1">كل مرة في فتح/جلسة جديدة، بحد أقصى 20 مرة.</span></label></div>
        {mode==='scheduled'&&<label className="text-xs font-bold">التاريخ والوقت<input value={scheduledLocal} onChange={e=>setScheduledLocal(e.target.value)} type="datetime-local" className="mt-2 w-full h-11 rounded-xl border border-border px-3 outline-none"/></label>}
        {error&&<div className="bg-dangerSoft text-danger rounded-xl p-3 text-xs font-bold">{error}</div>}<button disabled={busyLocal} onClick={send} className="h-11 rounded-xl bg-primary text-white text-xs font-bold disabled:opacity-40">{busyLocal?'جاري الحفظ...':'إرسال الرسالة'}</button>
      </section>
      <section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"><div className="p-4 border-b border-border"><b className="text-sm">رسائل هذا الموظف</b><div className="text-[10px] text-muted mt-1">احذف الرسالة في أي وقت لإيقاف أي ظهور قادم.</div></div><div className="divide-y divide-border">{mine.length?mine.map(n=><div key={n.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="text-xs block">{n.title||'رسالة من الإدارة'}</b><div className="text-[11px] text-secondary leading-5 mt-1 whitespace-pre-wrap">{n.message}</div></div><Pill tone={n.status==='completed'?'neutral':n.deliveryMode==='scheduled'&&tsMs(n.scheduledAt)>Date.now()?'info':'ok'}>{statusLabel(n)}</Pill></div><div className="flex flex-wrap items-center justify-between gap-2 mt-3"><div className="text-[9px] text-muted">ظهرت {Number(n.shownCount)||0} من {Number(n.maxShows)||1} · {n.deliveryMode==='scheduled'&&n.scheduledAt?`الموعد ${dateTime(n.scheduledAt)}`:'عند فتح النظام'}</div><button disabled={busyLocal} onClick={()=>remove(n)} className="h-8 px-3 rounded-lg bg-dangerSoft text-danger text-[10px] font-bold">حذف</button></div></div>):<div className="p-8 text-center text-xs text-muted">لا توجد رسائل لهذا الموظف.</div>}</div></section>
    </div>
  </div></div>
}

'''

INDEX_COMPONENT = r'''
const EmployeeAdminMessageScreen = ({notification,onClose}) => (
    <div className="min-h-screen bg-bg flex items-center justify-center px-20 py-32 font-sans">
        <div className="w-full max-w-[480px] bg-white border border-border rounded-20 shadow-lift overflow-hidden animate-card">
            <div className="p-24 border-b border-border text-center"><div className="w-52 h-52 rounded-16 bg-accentSoft text-accent mx-auto flex items-center justify-center text-[22px] font-bold">!</div><div className="text-[11px] text-accent font-bold mt-16">رسالة من الإدارة</div><h1 className="text-[20px] font-bold text-primary mt-4">{notification?.title || 'رسالة من الإدارة'}</h1></div>
            <div className="p-24"><p className="text-[14px] text-secondary leading-8 whitespace-pre-wrap text-center">{notification?.message || ''}</p><button onClick={onClose} className="w-full h-48 rounded-12 bg-primary text-white text-[13px] font-bold mt-24">تم</button></div>
        </div>
    </div>
);

const useEmployeeAdminMessages = ({sessionName,employeeId,isAdmin}) => {
    const [notification,setNotification]=useState(null);
    const rowsRef=useRef([]),currentRef=useRef(null),claimedRef=useRef(new Set()),dbRef=useRef(null);
    useEffect(()=>{currentRef.current=notification},[notification]);
    useEffect(()=>{
        if(!sessionName||isAdmin){setNotification(null);currentRef.current=null;return;}
        let active=true,unsubscribe=null,timer=null;
        const targetKeys=employeeAliasVariants(sessionName);
        const matchesTarget=row=>{if(employeeId&&row.employeeId&&row.employeeId===employeeId)return true;const keys=Array.isArray(row.targetKeys)?row.targetKeys:[row.targetKey].filter(Boolean);return keys.some(k=>targetKeys.includes(k))};
        const due=row=>{if(row.status!=='active')return false;const max=Math.max(1,Number(row.maxShows)||1),shown=Math.max(0,Number(row.shownCount)||0);if(shown>=max)return false;if(row.deliveryMode==='scheduled'){const ms=row.scheduledAt?.toMillis?row.scheduledAt.toMillis():new Date(row.scheduledAt||0).getTime();if(!ms||ms>Date.now())return false;}return matchesTarget(row)};
        const evaluate=async()=>{if(!active||currentRef.current||!dbRef.current)return;const candidates=rowsRef.current.filter(due).filter(r=>!claimedRef.current.has(r.id)).sort((a,b)=>{const at=x=>x?.toMillis?x.toMillis():new Date(x||0).getTime()||0;return (a.deliveryMode==='scheduled'?at(a.scheduledAt):at(a.createdAt))-(b.deliveryMode==='scheduled'?at(b.scheduledAt):at(b.createdAt))});for(const candidate of candidates){if(!active||currentRef.current)return;const ref=dbRef.current.collection(EMPLOYEE_NOTIFICATION_COLLECTION).doc(candidate.id);try{let shownDoc=null;await dbRef.current.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)throw new Error('SKIP');const row={id:snap.id,...snap.data()};if(!due(row))throw new Error('SKIP');const shown=Math.max(0,Number(row.shownCount)||0),max=Math.max(1,Number(row.maxShows)||1),next=shown+1;tx.set(ref,{shownCount:next,lastShownAt:firebase.firestore.FieldValue.serverTimestamp(),lastShownName:sessionName,status:next>=max?'completed':'active',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});shownDoc={...row,shownCount:next,status:next>=max?'completed':'active'}});if(shownDoc){claimedRef.current.add(candidate.id);currentRef.current=shownDoc;setNotification(shownDoc);return}}catch(e){if(e?.message!=='SKIP')console.warn('[Employee notification]',e)}}};
        getDb().then(db=>{if(!active)return;dbRef.current=db;unsubscribe=db.collection(EMPLOYEE_NOTIFICATION_COLLECTION).limit(150).onSnapshot(snap=>{if(!active)return;rowsRef.current=snap.docs.map(d=>({id:d.id,...d.data()}));if(currentRef.current&&!rowsRef.current.some(r=>r.id===currentRef.current.id)){currentRef.current=null;setNotification(null)}evaluate()},e=>console.warn('[Employee notifications realtime]',e));timer=setInterval(evaluate,15000)}).catch(e=>console.warn('[Employee notifications]',e));
        return()=>{active=false;if(timer)clearInterval(timer);try{unsubscribe?.()}catch{}};
    },[sessionName,employeeId,isAdmin]);
    const dismiss=()=>{currentRef.current=null;setNotification(null)};
    return {employeeAdminMessage:notification,dismissEmployeeAdminMessage:dismiss};
};

'''

ORIGINAL_UPDATE_VERSION = '''name: Update Version

on:
  push:
    paths:
      - 'data/jeddah.tsv'
      - 'data/riyadh.tsv'

permissions:
  contents: write

jobs:
  update-version:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Update version.json
        run: |
          DATE=$(TZ=Asia/Riyadh date +"%Y-%m-%d %H:%M")
          echo "{\\"lastUpdate\\":\\"$DATE\\"}" > data/version.json

      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          git add data/version.json

          git diff --cached --quiet || git commit -m "Auto update version.json"

          git push
'''

admin_path=Path('admin-dashboard.html'); index_path=Path('index.html')
admin=admin_path.read_text(encoding='utf-8'); index=index_path.read_text(encoding='utf-8')

if "employeeNotifications:'employee_notifications'" not in admin:
    old="employeeUsers:'users',employeeAccounts:'employee_accounts',employeeAliases:'employee_aliases',employeeSecurityPhotos:'employee_security_photos',employeeLoginAttempts:'employee_login_attempts',employeeSessions:'site_sessions',employeeLogins:'login_logs',access:'access_requests',search:'search_logs',employeeOrders:'orders',employeeDrafts:'drafts',categoryAudit:'category_audit_logs',adminAudit:'security_admin_logs'"
    new="employeeUsers:'users',employeeAccounts:'employee_accounts',employeeAliases:'employee_aliases',employeeNotifications:'employee_notifications',employeeSecurityPhotos:'employee_security_photos',employeeLoginAttempts:'employee_login_attempts',employeeSessions:'site_sessions',employeeLogins:'login_logs',access:'access_requests',search:'search_logs',employeeOrders:'orders',employeeDrafts:'drafts',categoryAudit:'category_audit_logs',adminAudit:'security_admin_logs'"
    if old not in admin: raise SystemExit('COLLECTIONS marker missing')
    admin=admin.replace(old,new,1)
admin=admin.replace("employeeSecurityPhotos:'timestamp',employeeLoginAttempts:'time'","employeeNotifications:'createdAt',employeeSecurityPhotos:'timestamp',employeeLoginAttempts:'time'",1)
admin=admin.replace("employeeSecurityPhotos:900,employeeLoginAttempts:1000","employeeNotifications:600,employeeSecurityPhotos:900,employeeLoginAttempts:1000",1)

if 'const [employeeMessageTarget,setEmployeeMessageTarget]' not in admin:
    old="const [employeeMerge,setEmployeeMerge]=useState(null);\n  const [customerManager,setCustomerManager]=useState(null);"
    if old not in admin: raise SystemExit('modal state marker missing')
    admin=admin.replace(old,"const [employeeMerge,setEmployeeMerge]=useState(null);\n  const [employeeMessageTarget,setEmployeeMessageTarget]=useState(null);\n  const [customerManager,setCustomerManager]=useState(null);",1)
if "employeeAccounts:[],employeeAliases:[],employeeNotifications:[]" not in admin:
    old="employeeAccounts:[],employeeAliases:[],employeeSecurityPhotos:[]"
    if old not in admin: raise SystemExit('data state marker missing')
    admin=admin.replace(old,"employeeAccounts:[],employeeAliases:[],employeeNotifications:[],employeeSecurityPhotos:[]",1)
if "eNotifications=data.employeeNotifications||[]" not in admin:
    old="const eUsers=data.employeeUsers||[],eAccounts=data.employeeAccounts||[],eAliases=data.employeeAliases||[],eSecurityPhotos=data.employeeSecurityPhotos||[]"
    if old not in admin: raise SystemExit('derived vars marker missing')
    admin=admin.replace(old,"const eUsers=data.employeeUsers||[],eAccounts=data.employeeAccounts||[],eAliases=data.employeeAliases||[],eNotifications=data.employeeNotifications||[],eSecurityPhotos=data.employeeSecurityPhotos||[]",1)
if 'function EmployeeMessageModal(' not in admin:
    marker="function CustomerManagerModal({customer,devices,busy,onClose,onSave,onStatus,onDelete,onRestore,onDeviceStatus,onDeviceDelete})"
    if marker not in admin: raise SystemExit('CustomerManagerModal marker missing')
    admin=admin.replace(marker,ADMIN_COMPONENT+marker,1)
if 'setEmployeeMessageTarget(r)' not in admin:
    old="<button onClick={()=>setDetail(redactSensitive({...a,__collection:'employee_accounts'}))} className=\"h-9 rounded-lg border border-border text-[10px] font-bold\">التفاصيل</button>"
    if old not in admin: raise SystemExit('employee card marker missing')
    admin=admin.replace(old,old+"<button onClick={()=>setEmployeeMessageTarget(r)} className=\"col-span-2 h-9 rounded-lg bg-infoSoft text-info border border-info/10 text-[10px] font-bold\">إرسال رسالة</button>",1)
legacy="<button onClick={()=>setDetail({...r.user,__collection:'users',relatedNames:r.legacyNames})} className=\"col-span-2 h-9 rounded-lg border border-border text-[10px] font-bold\">سجل الموظف</button>"
if legacy in admin and 'setEmployeeMessageTarget(r)' not in admin[admin.find(legacy):admin.find(legacy)+700]:
    admin=admin.replace(legacy,legacy+"<button onClick={()=>setEmployeeMessageTarget(r)} className=\"col-span-2 h-9 rounded-lg bg-infoSoft text-info border border-info/10 text-[10px] font-bold\">إرسال رسالة</button>",1)
if '<EmployeeMessageModal target=' not in admin:
    marker="{employeeMerge&&<EmployeeMergeModal source={employeeMerge} accounts={eAccounts} onClose={()=>setEmployeeMerge(null)} onSaved={()=>setEmployeeMerge(null)}/>}"
    if marker not in admin: raise SystemExit('modal render marker missing')
    admin=admin.replace(marker,marker+"\n    {employeeMessageTarget&&<EmployeeMessageModal target={employeeMessageTarget} notifications={eNotifications} onClose={()=>setEmployeeMessageTarget(null)}/>}",1)

if "const EMPLOYEE_NOTIFICATION_COLLECTION = 'employee_notifications';" not in index:
    marker="const EMPLOYEE_SECURITY_PHOTO_COLLECTION = 'employee_security_photos';"
    if marker not in index: raise SystemExit('employee collection marker missing')
    index=index.replace(marker,marker+"\nconst EMPLOYEE_NOTIFICATION_COLLECTION = 'employee_notifications';",1)
if 'const EmployeeAdminMessageScreen = ' not in index:
    marker="// ============================================================\n// التطبيق الرئيسي\n// ============================================================\nconst App = () => {"
    if marker not in index: raise SystemExit('App marker missing')
    index=index.replace(marker,INDEX_COMPONENT+marker,1)
hook="const currentSiteAccessAllowed = employeeSiteAccessAllowed(employeeSiteControl,{name:sessionName,employeeId:currentEmployeeId,isAdmin});"
if hook not in index: raise SystemExit('access hook marker missing')
if 'useEmployeeAdminMessages({sessionName' not in index:
    index=index.replace(hook,hook+"\n    const { employeeAdminMessage, dismissEmployeeAdminMessage } = useEmployeeAdminMessages({sessionName,employeeId:currentEmployeeId,isAdmin});",1)
if 'if (employeeAdminMessage)' not in index:
    blocked=index.find('if (!currentSiteAccessAllowed) {')
    if blocked<0: raise SystemExit('blocked marker missing')
    pos=index.find('\n    if (!warehouse) {',blocked)
    if pos<0: pos=index.find('\n    return (',blocked)
    if pos<0: raise SystemExit('post access marker missing')
    index=index[:pos]+"\n    if (employeeAdminMessage) {\n        return <EmployeeAdminMessageScreen notification={employeeAdminMessage} onClose={dismissEmployeeAdminMessage} />;\n    }\n"+index[pos:]

required=["employeeNotifications:'employee_notifications'",'function EmployeeMessageModal(','setEmployeeMessageTarget(r)','<EmployeeMessageModal target=',"EMPLOYEE_NOTIFICATION_COLLECTION = 'employee_notifications'",'EmployeeAdminMessageScreen','useEmployeeAdminMessages({sessionName','if (employeeAdminMessage)']
missing=[x for x in required if x not in admin+index]
if missing: raise SystemExit('verification failed: '+repr(missing))
admin_path.write_text(admin,encoding='utf-8'); index_path.write_text(index,encoding='utf-8')
Path('.github/workflows/update-version.yml').write_text(ORIGINAL_UPDATE_VERSION,encoding='utf-8')
for p in [Path('.github/workflows/batco-employee-messages-v31.yml'),Path('.github/scripts/employee_messages_patch_v31.py')]:
    if p.exists(): p.unlink()
print('Employee messages V31 patched and cleanup prepared.')
