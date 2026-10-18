/* V80: compact admin control for assigned, presence-only branch stocktake. */
(()=>{
'use strict';
const C=window.BranchPresenceCore;
const el=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $db=window.branchPresenceDb||(typeof db!=='undefined'?db:null);
if(!$db||!C)return;
const controls=$db.collection('system_controls').doc('branch_presence_feature');
const sessions=$db.collection('branch_presence_sessions');
const ts=()=>firebase.firestore.FieldValue.serverTimestamp();
const fmt=n=>new Intl.NumberFormat('ar-SA').format(n||0);
const badge=(s)=>String(s||'').length?String(s):'—';
let control={enabled:false,sessionId:''},session=null,employees=[],seen=new Set(),unsubSession=null,unsubSeen=null,unsubEmployees=null,busy=false;
const standalone=document.body.dataset.branchPresenceAdmin==='1';
let expanded=standalone||location.hash==='#branch-presence';
let employeeNamesById=new Map();
const wrap=document.getElementById('branchPresenceMount')||document.querySelector('.wrap')||document.body;
const host=document.createElement('section');
host.id='branchPresencePanel';host.className='bp-admin';
host.innerHTML='<div class="bp-bar"><div><strong>جرد الفرع السريع <span class="bp-label">باركود · بدون كميات</span></strong><p>فعّل الجرد وحدد الموظفين، وبعدها تُسجّل الأصناف بمجرد تمرير الباركود.</p></div><button type="button" id="bpExpand" class="btn bp-open" aria-expanded="false">إعداد جرد الفرع</button></div>'+
'<div id="bpBody" class="bp-body" hidden><div id="bpInfo" class="bp-summary" role="status">جاري قراءة حالة الجرد…</div>'+
'<div class="bp-fields"><label>الفرع المراد جرده<input id="bpBranch" class="input" placeholder="مثال: معرض جدة" maxlength="70"></label><label>المستودع المرجعي<select id="bpWarehouse" class="select"><option value="jeddah">مستودع جدة</option><option value="riyadh">مستودع الرياض</option></select></label></div>'+
'<div class="bp-people"><strong>من سيجرد الفرع؟</strong><p>اختر حساب الموظف المكلف، ويمكن اختيار أكثر من موظف.</p><div id="bpEmployees" class="bp-members"></div></div>'+
'<div id="bpActionBar" class="bp-actions"><button id="bpStart" class="btn primary" type="button">تفعيل جرد الفرع</button><button id="bpPause" class="btn" type="button" hidden>إيقاف مؤقت</button><button id="bpResume" class="btn" type="button" hidden>استئناف</button><button id="bpFinish" class="btn bad" type="button" hidden>إنهاء الجرد وإظهار النواقص</button><a id="bpOpen" class="btn" href="./branch-presence.html" target="_blank" rel="noopener">فتح صفحة المسح</a><button id="bpExport" class="btn" type="button" hidden>تقرير النواقص Excel</button></div>'+
'<p class="bp-note">الجرد يسجّل وجود الصنف مرة واحدة، بدون إدخال أي كمية. قبل إنهاء الجرد، الأصناف غير الممسوحة «لم تُرصد بعد» وليست نواقص مؤكدة.</p><p id="bpError" class="bp-error" role="alert" hidden></p></div>';
const top=wrap.querySelector('.top');if(standalone)wrap.replaceChildren(host);else if(top)top.after(host);else wrap.prepend(host);
const renderExpansion=()=>{el('bpBody').hidden=!expanded;el('bpExpand').hidden=standalone;el('bpExpand').setAttribute('aria-expanded',String(expanded));el('bpExpand').textContent=expanded?'إخفاء إعدادات الفرع':'إعداد جرد الفرع'};
el('bpExpand').onclick=()=>{expanded=!expanded;renderExpansion();if(expanded)renderEmployees()};
window.openBranchPresenceAdmin=()=>{expanded=true;renderExpansion();host.scrollIntoView({behavior:'smooth',block:'start'});renderEmployees()};
function error(msg){const e=el('bpError');e.hidden=!msg;e.textContent=msg||'';if(msg)console.warn('[branch presence]',msg)}
function cleanEmployeeName(value){
 const name=String(value??'').trim();
 if(!name||name.length<2||name.length>100)return '';
 // Firestore's opaque account IDs are never displayed as people.
 if(/^[A-Za-z0-9_-]{16,}$/.test(name))return '';
 return name;
}
function resolveEmployeeName(record){
 const candidates=[
  record?.canonicalName,record?.fullName,record?.name,record?.employeeName,record?.displayName,
  ...(Array.isArray(record?.aliases)?record.aliases:[]),
  employeeNamesById.get(record?.id)
 ];
 return candidates.map(cleanEmployeeName).find(Boolean)||'';
}
function renderEmployees(){
 const selected=new Set((session?.status==='active'?session.assignedEmployeeIds:control.assignedEmployeeIds)||[]);
 const saved=[...el('bpEmployees').querySelectorAll('input:checked')].map(x=>x.value);
 if(!session||session.status!=='active')saved.forEach(v=>selected.add(v));
 const eligible=employees.filter(e=>e.status!=='suspended'&&e.status!=='inactive');
 el('bpEmployees').innerHTML=eligible.length?eligible.map(e=>{
  const employeeName=resolveEmployeeName(e),unresolved=!employeeName;
  const label=employeeName||'حساب بدون اسم — راجع إدارة الموظفين';
  return '<label'+(unresolved?' class="bp-unnamed" title="لا يمكن تكليف هذا الحساب قبل تعريف اسمه في إدارة الموظفين"':'')+'><input type="checkbox" value="'+esc(e.id)+'" '+(selected.has(e.id)?'checked':'')+' '+(session?.status==='active'||unresolved?'disabled':'')+'><span>'+esc(label)+'</span></label>';
 }).join(''):'<p>لا توجد حسابات موظفين مسماة. راجع إدارة الموظفين.</p>';
}
function refresh(){
 const active=Boolean(session?.status==='active'&&control.sessionId===session.id);
 const count=C.summary(session?.products||[],seen,!active);
 el('bpInfo').innerHTML=session?'<b>'+esc(session.branchName)+' · '+esc(session.warehouse==='riyadh'?'مستودع الرياض':'مستودع جدة')+'</b><span>'+fmt(count.observed)+' مرصود من '+fmt(count.total)+' صنف متوفر بالمستودع · '+fmt(count.notObserved)+' '+(active?'لم يُرصد بعد':'لم يُرصد عند الإغلاق')+'</span><span class="bp-state">'+(active?(control.enabled?'الجرد مفعّل':'متوقف مؤقتًا'):'جرد مغلق')+'</span>':'لا يوجد جرد فرع نشط. اختر الفرع والموظفين واضغط تفعيل.';
 el('bpStart').hidden=active;
 el('bpPause').hidden=!active||!control.enabled;
 el('bpResume').hidden=!active||control.enabled;
 el('bpFinish').hidden=!active;
 el('bpExport').hidden=!session||session.status!=='closed';
 el('bpOpen').hidden=!active;
 el('bpBranch').disabled=active;el('bpWarehouse').disabled=active;
 if(session&&active){el('bpBranch').value=session.branchName;el('bpWarehouse').value=session.warehouse}
 renderEmployees();
}
function bindSession(id){
 if(unsubSession){unsubSession();unsubSession=null}
 if(unsubSeen){unsubSeen();unsubSeen=null}
 session=null;seen=new Set();if(!id){refresh();return}
 unsubSession=sessions.doc(id).onSnapshot(doc=>{
  session=doc.exists?{id:doc.id,...doc.data()}:null;
  refresh();
 },e=>error('تعذر قراءة ملف جرد الفرع: '+e.message));
 unsubSeen=sessions.doc(id).collection('seen').onSnapshot(s=>{seen=new Set(s.docs.map(d=>d.data().sku).filter(Boolean));refresh()},e=>error('تعذر قراءة الأصناف الممسوحة: '+e.message));
}
controls.onSnapshot(d=>{
 const previous=control.sessionId;
 control={enabled:false,sessionId:'',...d.data()};
 if(previous!==control.sessionId)bindSession(control.sessionId);
 else refresh();
},e=>error('تعذر قراءة إعدادات جرد الفروع: '+e.message));
unsubEmployees=$db.collection('employee_accounts').onSnapshot(s=>{employees=s.docs.map(d=>({id:d.id,...d.data()}));renderEmployees()},e=>error('تعذر تحميل الموظفين: '+e.message));
$db.collection('users').onSnapshot(snapshot=>{
 const byId=new Map();
 for(const doc of snapshot.docs){const row=doc.data()||{},id=String(row.employeeId||'').trim(),candidate=cleanEmployeeName(row.name||row.canonicalName||row.fullName||row.displayName||'');
  if(id&&candidate&&!byId.has(id))byId.set(id,candidate);
 }
 employeeNamesById=byId;renderEmployees();
},e=>console.warn('[branch presence] Employee display-name fallback unavailable',e?.code||e));
function withBusy(fn){return async()=>{if(busy)return;busy=true;host.classList.add('bp-busy');error('');try{await fn()}catch(e){console.error(e);error(e.message||'تعذر تنفيذ العملية، تحقق من اتصال الإنترنت ثم أعد المحاولة')}finally{busy=false;host.classList.remove('bp-busy')}}}
el('bpStart').onclick=withBusy(async()=>{
 if(session?.status==='active')throw Error('هناك جرد فرع نشط؛ أنهِه أولًا');
 if(!navigator.onLine)throw Error('يجب الاتصال بالإنترنت لإنشاء الجرد');
 const branchName=el('bpBranch').value.trim(),warehouse=el('bpWarehouse').value;
 const assignedEmployeeIds=[...el('bpEmployees').querySelectorAll('input:checked')].map(x=>x.value);
 if(!branchName)throw Error('اكتب اسم الفرع أولًا');
 if(!['jeddah','riyadh'].includes(warehouse))throw Error('حدد المستودع المرجعي');
 if(!assignedEmployeeIds.length)throw Error('اختر موظفًا واحدًا على الأقل للجرد');
 const response=await fetch('./data/'+warehouse+'.tsv?v='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw Error('تعذر تحميل أصناف المستودع المرجعي');
 const products=C.inventory(await response.text()).filter(p=>p.warehouseQty>0);
 if(!products.length)throw Error('المستودع لا يحتوي على أصناف متوفرة');
 if(!confirm('تفعيل جرد '+branchName+' بواسطة '+assignedEmployeeIds.length+' موظف؟ سيتم تسجيل الأصناف بالباركود فقط دون كميات.'))return;
 const ref=sessions.doc(),batch=$db.batch();
 batch.set(ref,{branchName,warehouse,products,status:'active',assignedEmployeeIds,createdBy:'admin_mohanad',createdAt:ts(),sourceVersion:'v80-presence'});
 batch.set(controls,{enabled:true,sessionId:ref.id,assignedEmployeeIds,updatedAt:ts()},{merge:true});
 await batch.commit();el('bpBranch').value=branchName;expanded=true;renderExpansion();
});
el('bpPause').onclick=withBusy(async()=>{if(!navigator.onLine)throw Error('يلزم الاتصال بالإنترنت');await controls.set({enabled:false,updatedAt:ts()},{merge:true})});
el('bpResume').onclick=withBusy(async()=>{if(!navigator.onLine)throw Error('يلزم الاتصال بالإنترنت');await controls.set({enabled:true,updatedAt:ts()},{merge:true})});
el('bpFinish').onclick=withBusy(async()=>{
 if(!session||session.status!=='active')return;
 if(!navigator.onLine)throw Error('يلزم الاتصال بالإنترنت لإنهاء الجرد');
 if(!confirm('هل أكمل الموظفون مسح كل الأصناف الموجودة فعليًا في الفرع، وتمت مزامنة جميع المسوحات؟ الأصناف التي لم تُمسح ستظهر في تقرير النواقص.'))return;
 const batch=$db.batch();batch.set(sessions.doc(session.id),{status:'closed',closedAt:ts(),closedBy:'admin_mohanad'},{merge:true});
 batch.set(controls,{enabled:false,updatedAt:ts()},{merge:true});await batch.commit();
});
el('bpExport').onclick=()=>{
 if(!session||session.status!=='closed')return;
 const missing=C.summary(session.products,seen,true).notObservedItems;
 const csv=C.csv(missing,{branch:session.branchName,warehouse:session.warehouse==='riyadh'?'مستودع الرياض':'مستودع جدة',status:'لم يُرصد بعد اكتمال جرد الفرع'});
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='نواقص-جرد-'+session.branchName.replace(/[\\/:*?"<>|]/g,'_')+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
renderExpansion();refresh();
})();
