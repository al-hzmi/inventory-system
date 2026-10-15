/* V63: guarded inline admin pilot, independent of control-center subscriptions. */
(function(){
'use strict';
const pilotAdminAuthorized=()=>{try{
 if(typeof isAdmin==='function')return isAdmin();
 const proof=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');
 const localQa=['localhost','127.0.0.1'].includes(location.hostname);
 return typeof ADMIN_HASH==='string'&&String(localStorage.getItem('inventory_user_name_v2')||'').trim()==='مهند'&&String(localStorage.getItem('inventory_admin_token_v2')||'')===ADMIN_HASH&&(localQa||(proof?.role==='admin'&&Boolean(proof?.photoId)));
}catch{return false}};
if(!pilotAdminAuthorized()||typeof db==='undefined')return;
const DOC='employee_site_access',CONFIG_FIELD='employeeHomePilot',LEGACY_DOC='employee_home_pilot_v1',COL='system_controls',pilotFlag=new URLSearchParams(location.search).get('pilot')==='1';
const $=selector=>document.querySelector(selector);
const create=(tag,className,text)=>{const item=document.createElement(tag);if(className)item.className=className;if(text!==undefined)item.textContent=String(text);return item};
let enabled=false,selected=new Set(),employees=[],onlySelected=false,q='',busy=false,dirty=false,initialized=false,peopleReady=false,loading=false;
const withDeadline=(promise,ms,label)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(label+' تجاوز مهلة التحميل. تحقق من الاتصال ثم أعد المحاولة.')),ms);Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v)},e=>{clearTimeout(timer);reject(e)})});
const state=()=>({enabled,ids:[...selected].sort()});
const isTest=s=>/(اختبار|تجربه|تجربة|test|qa|playwright|audit)/i.test(String(s||''));
function open(){
 if($('#b61-admin-panel'))return;
 const existing=$('.app'),page=create('main','b61a-shell');page.id='b61-admin-panel';page.setAttribute('role','dialog');page.setAttribute('aria-modal','true');page.setAttribute('aria-label','إدارة تجربة الموظفين');
 page.innerHTML='<header class="b61a-header"><div><small>مركز التحكم · الإطلاق المقيّد</small><h1>النسخة التجريبية للموظفين</h1><p>اختر الموظفين الذين سيشاهدون تصميم مساحة العمل الجديد. الجميع غير المختار يبقى على الواجهة الحالية.</p></div><button class="b61a-back" type="button" id="b61a-close">العودة لمركز التحكم</button></header><section class="b61a-card"><div class="b61a-row"><div><h2>تشغيل النسخة التجريبية</h2><p>المفتاح الرئيسي للحسابات المختارة فقط. يمكن إيقافه فورًا.</p></div><strong id="b61a-status">جارٍ التحميل…</strong></div><label class="b61a-toggle"><input id="b61a-master" type="checkbox" disabled><span>تشغيل مساحة العمل الجديدة للحسابات المختارة</span></label><div class="b61a-stats"><div><b id="b61a-all">—</b><small>حساب متاح</small></div><div><b id="b61a-selected">0</b><small>موظفون مختارون</small></div><div><b id="b61a-state">مقفلة</b><small>حالة التجربة</small></div></div></section><section class="b61a-card"><div class="b61a-row"><div><h2>اختيار الحسابات</h2><p>يتم التفعيل بحسب معرّف الحساب الدائم، وليس الاسم المشابه.</p></div><span id="b61a-amount">0 مختار</span></div><div class="b61a-tools"><input id="b61a-search" type="search" placeholder="بحث باسم الموظف أو رقمه" autocomplete="off"><button type="button" id="b61a-only">المختارون فقط</button></div><div id="b61a-employees" class="b61a-accounts"><p>جارٍ تحميل الحسابات…</p></div><p class="b61a-explainer">حسابك متاح ضمن القائمة للتجربة الذاتية. تم إخفاء الحسابات التي تحمل أسماء اختبار عامة.</p></section><section class="b61a-card"><h2>خطوات التقييم</h2><p class="b61a-explainer">حدد الحسابات ثم شغّل المفتاح واحفظ. عند زيارة الموظف للنظام المعتاد تظهر مساحة «آخر الأصناف / المفضلة / وش تغيّر؟» عندما يكون البحث فارغًا، وتختفي بمجرد كتابة اسم أو رقم صنف لتظهر النتائج مباشرة. المقارنة مع الزيارة السابقة تعمل على نفس الجهاز، ومن الزيارة الثانية. يمكن إيقاف التجربة للجميع من هذا المفتاح.</p></section><footer class="b61a-footer"><div id="b61a-message" role="status">الإعدادات مقفلة افتراضيًا حتى تحفظ اختيارك.</div><div class="b61a-buttons"><a href="./index.html?employee=1&pilotPreview=1">معاينة التصميم بحسابي</a><button id="b61a-save" type="button" disabled>حفظ التفعيل</button></div></footer>';
 document.body.append(page);if(existing)existing.hidden=true;
 const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
 const close=()=>{page.remove();document.body.style.overflow=previousOverflow;if(existing)existing.hidden=false;const url=new URL(location.href);url.searchParams.delete('pilot');history.replaceState({},'',url.pathname+url.search)};
 $('#b61a-close').addEventListener('click',close);
 $('#b61a-search').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();renderPeople()});
 $('#b61a-only').addEventListener('click',()=>{onlySelected=!onlySelected;$('#b61a-only').classList.toggle('active',onlySelected);renderPeople()});
 $('#b61a-master').addEventListener('change',e=>{enabled=e.target.checked;dirty=true;renderStatus()});
 $('#b61a-save').addEventListener('click',saveControl);
 const retry=create('button','b61a-retry','إعادة المحاولة');retry.type='button';retry.id='b61a-retry';retry.addEventListener('click',fetchData);retry.hidden=true;$('#b61a-message').after(retry);
 fetchData();
}
function renderStatus(){
 const valid=selected.size>0;
 $('#b61a-all').textContent=employees.length.toLocaleString('ar-SA');
 $('#b61a-selected').textContent=selected.size.toLocaleString('ar-SA');
 $('#b61a-amount').textContent=selected.size.toLocaleString('ar-SA')+' مختار';
 $('#b61a-status').textContent=loading?'جارٍ التحميل…':!initialized?'غير متاحة':enabled?'جاهزة للتفعيل':'متوقفة';
 $('#b61a-state').textContent=enabled?'محدودة':'مقفلة';
 $('#b61a-status').classList.toggle('on',enabled);
 $('#b61a-save').disabled=busy||loading||!initialized||!dirty||(enabled&&(!valid||!peopleReady));
 $('#b61a-master').disabled=busy||loading||!initialized;
 $('#b61a-master').checked=enabled;
}
function renderPeople(){
 const list=$('#b61a-employees');if(!list)return;
 list.replaceChildren();const options=employees.filter(e=>(!onlySelected||selected.has(e.id))&&(!q||e.name.toLowerCase().includes(q)||e.id.toLowerCase().includes(q)));
 if(!options.length){list.append(create('p','b61a-empty','لا توجد حسابات مطابقة للبحث.'));return}
 for(const person of options){
  const row=create('label','b61a-account'),checkbox=create('input');checkbox.type='checkbox';checkbox.checked=selected.has(person.id);
  checkbox.addEventListener('change',()=>{if(checkbox.checked)selected.add(person.id);else selected.delete(person.id);dirty=true;renderPeople();renderStatus()});
  const label=create('span'),name=create('strong','',person.name),id=create('small','',person.id);
  label.append(name,id);row.append(checkbox,label);list.append(row);
 }
}
function notice(msg,err=false){const target=$('#b61a-message');if(target){target.textContent=msg;target.classList.toggle('error',err)}}
async function fetchData(){
 try{
  const [collection,control,legacy]=await Promise.all([
   db.collection('employee_accounts').limit(800).get(),
   db.collection(COL).doc(DOC).get(),
   db.collection(COL).doc(LEGACY_DOC).get().catch(()=>null)
  ]);
  const seen=new Set();employees=[{id:'admin_mohanad',name:'حساب الإدارة — تجربة شخصية'}];
  for(const doc of collection.docs){
   const d=doc.data()||{},id=String(doc.id).trim(),name=String(d.canonicalName||d.name||d.displayName||id).trim();
   if(!id||seen.has(id)||isTest(name)||isTest(id)||d.status==='suspended'||d.status==='disabled')continue;
   seen.add(id);employees.push({id,name});
  }
  employees.sort((a,b)=>a.name.localeCompare(b.name,'ar',{numeric:true}));
  const shared=control.exists?(control.data()?.[CONFIG_FIELD]||null):null;
  const legacyData=legacy?.exists?(legacy.data()||{}):{};
  const data=shared||legacyData;
  enabled=data.enabled===true;selected=new Set((Array.isArray(data.allowedEmployeeIds)?data.allowedEmployeeIds:[]).map(String));
  initialized=true;dirty=!shared&&legacy?.exists===true;
  renderPeople();renderStatus();notice(dirty?'وُجد تفعيل سابق. اضغط «حفظ التفعيل» لنقله إلى إعدادات الموقع المعتمدة.':'جاهز. التغييرات لا تُطبق إلا بعد الضغط على حفظ التفعيل.');
 }catch(e){console.error('[Employee pilot admin]',e);notice('تعذر قراءة حسابات الموظفين أو إعدادات التجربة. تحقق من اتصال Firestore.',true)}
}
async function saveControl(){
 if(busy||!initialized||!dirty)return;
 if(enabled&&!selected.size){notice('اختر موظفًا واحدًا على الأقل قبل تشغيل التجربة.',true);return}
 const next=state();
 if(!confirm((enabled?'تفعيل':'إيقاف')+' النسخة التجريبية '+(enabled?'لعدد '+selected.size+' حساب/حسابات فقط':'لجميع المستخدمين')+'؟'))return;
 busy=true;renderStatus();notice('جارٍ حفظ إعدادات التجربة…');
 try{
  const ref=db.collection(COL).doc(DOC);
  await ref.set({[CONFIG_FIELD]:{
   enabled:next.enabled,allowedEmployeeIds:next.ids,revision:firebase.firestore.FieldValue.increment(1),
   updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:'مهند',pilotVersion:'62.0'
  }},{merge:true});
  // Do not report success unless the production-facing settings can be read back from Firestore.
  const stored=await ref.get({source:'server'});
  const actual=stored.exists?(stored.data()?.[CONFIG_FIELD]||null):null;
  if(!actual||actual.enabled!==next.enabled||JSON.stringify([...(actual.allowedEmployeeIds||[])].map(String).sort())!==JSON.stringify(next.ids)){
   throw new Error('تم إرسال الإعدادات لكن لم نستطع تأكيد تطابقها مع المستند المقروء. أعد فتح اللوحة للتحقق.');
  }
  try{await db.collection('security_admin_logs').add({admin:'مهند',action:'employee_pilot_rollout',data:{enabled:next.enabled,allowedEmployeeIds:next.ids},source:'control_center_v61',createdAt:firebase.firestore.FieldValue.serverTimestamp()})}catch(e){console.warn('[Pilot audit]',e)}
  dirty=false;notice('تم حفظ إعدادات التجربة والتحقق منها في Firestore. يمكن معاينتها بحساب المدير أو فتحها من حساب موظف مختار.');
 }catch(e){console.error('[Pilot save]',e);notice('تعذر الحفظ. لم يتم اعتماد إعدادات التجربة. '+String(e?.message||''),true)}
 finally{busy=false;renderStatus()}
}
function attach(){
 const app=$('.app');if(!app)return;
 const refreshShortcut=()=>{
  if($('#b61a-launch'))return;
  const top=app.querySelector('.topin')||app.querySelector('.top');
  if(!top)return;
  const shortcut=create('button','b61a-launch','تجربة واجهة الموظفين');
  shortcut.type='button';shortcut.id='b61a-launch';shortcut.addEventListener('click',open);
  top.append(shortcut);
 };
 refreshShortcut();
 // Watch only direct children of the control center: existing Firestore renders replace the header.
 const observer=new MutationObserver(refreshShortcut);
 observer.observe(app,{childList:true});
 window.addEventListener('beforeunload',()=>observer.disconnect(),{once:true});
 if(pilotFlag)open();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
