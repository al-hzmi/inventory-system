/* V70 — executive review of employee ratings. Only available in verified admin view.
   Firestore rules must independently restrict collection reads; this guard is UI only. */
(function(){
'use strict';
const COLLECTION='employee_experience_feedback',MAX_RECORDS=500,STAFF_FIELD='experienceFeedbackV70';
const $=q=>document.querySelector(q);
const expectedAdminToken='1jh297-spgf2z';
function isAdmin(){
 try{
  const proof=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null');
  return localStorage.getItem('inventory_user_name_v2')?.trim()==='مهند' &&
    localStorage.getItem('inventory_admin_token_v2')===expectedAdminToken &&
    proof?.role==='admin'&&Boolean(proof.photoId);
 }catch{return false}
}
if(!isAdmin()){location.replace('./index.html?employee=1');return}
const config={
 apiKey:'AIzaSyCCvNlnZDxL5P4cPQrHYkOh3C8wJ6yl4Bw',
 authDomain:'inventory-system-ca3dc.firebaseapp.com',
 projectId:'inventory-system-ca3dc',
 storageBucket:'inventory-system-ca3dc.firebasestorage.app',
 messagingSenderId:'139575913885',
 appId:'1:139575913885:web:110648e07345b36da15374'
};
let rows=[],pending=false;
const safe=(value,max=500)=>String(value??'').slice(0,max);
function millis(value){
 try{if(value?.toMillis)return value.toMillis();if(value?.seconds)return value.seconds*1000;return Number(value)||0}catch{return 0}
}
const date=value=>{
 const n=millis(value);return n?new Date(n).toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'}):'بدون تاريخ'
};
const add=(parent,tag,cl,text)=>{
 const el=document.createElement(tag);if(cl)el.className=cl;if(text!==undefined)el.textContent=safe(text,1000);parent.appendChild(el);return el
};
function render(){
 const root=$('#b70-feedback-list');if(!root)return;
 root.replaceChildren();
 const search=safe($('#b70-filter')?.value||'').trim().toLowerCase(),filter=$('#b70-rating-filter')?.value||'all';
 const visible=rows.filter(x=>(filter==='all'||Number(x.stars)===Number(filter))&&
  (!search||[x.employeeName,x.employeeId,x.note].some(y=>safe(y).toLowerCase().includes(search))));
 if(!visible.length){add(root,'div','empty',rows.length?'لا توجد نتائج مطابقة.':'لم يُرسل أي موظف تقييمًا حتى الآن.');return}
 visible.forEach(x=>{
  const card=add(root,'article','entry'),top=add(card,'div','entry-top');
  const right=add(top,'div','');
  add(right,'div','entry-name',safe(x.employeeName||'موظف',90));
  add(right,'div','entry-info',safe(x.employeeId||'—',100)+' · '+date(x.submittedAt)+' · '+safe(x.release||'v70',14));
  const star=add(top,'div','entry-rating');
  star.textContent='★'.repeat(Number(x.stars))+'☆'.repeat(5-Number(x.stars));
  star.setAttribute('aria-label',Number(x.stars)+' من 5 نجوم');
  if(safe(x.note).trim())add(card,'p','entry-note',safe(x.note,500));
  else add(card,'p','entry-empty-note','دون ملاحظة');
  const actions=add(card,'div','entry-actions');
  const reset=add(actions,'button','rating-reset','إلغاء التقييم وإعادة إظهار طلب التقييم');
  reset.type='button';reset.dataset.employeeId=safe(x.employeeId,140);reset.addEventListener('click',()=>resetFeedback(x));
 });
}
function summary(){
 const count=rows.length,sum=rows.reduce((a,x)=>a+Number(x.stars),0),good=rows.filter(x=>x.stars>=4).length;
 $('#b70-count').textContent=new Intl.NumberFormat('ar-SA').format(count);
 $('#b70-average').textContent=count?(sum/count).toFixed(1)+' / 5':'—';
 $('#b70-positive').textContent=count?Math.round(good/count*100)+'٪':'—';
}
// Clear only the rating fields, while keeping an auditable reset generation in the same
// Firestore document so the employee device can see the re-prompt even with stale localStorage.
async function resetFeedback(record){
 if(pending||!record?.id||!record?.employeeId)return;
 const label=safe(record.employeeName||record.employeeId,100);
 if(!window.confirm('إلغاء تقييم '+label+' وإتاحة التقييم له من جديد؟\\nلن تتأثر حساباته أو فواتيره.'))return;
 const message=$('#b70-admin-status');
 pending=true;
 try{
  const firestore=firebase.firestore(),fv=firebase.firestore.FieldValue;
  const ref=firestore.collection(record.__source==='users'?'users':COLLECTION).doc(record.id);
  const latest=await ref.get({source:'server'});
  const current=record.__source==='users'?latest.data()?.[STAFF_FIELD]:latest.data();
  if(!latest.exists||String(current?.employeeId||'')!==String(record.employeeId||''))throw new Error('RECORD_CHANGED');
  if(!(Number(current?.stars)>0))throw new Error('RATING_ALREADY_RESET');
  if(record.__source==='users'){
    await ref.set({[STAFF_FIELD]:{
      release:'v70',employeeId:record.employeeId,employeeName:record.employeeName||'',
      stars:0,status:'reset',resetGeneration:(Number(current.resetGeneration)||0)+1,
      resetRequestedAt:fv.serverTimestamp(),resetReason:'employee_submitted_by_mistake'
    }},{merge:true});
  }else{
    await ref.update({stars:fv.delete(),note:fv.delete(),submittedAt:fv.delete(),
      status:'reset',resetRequestedAt:fv.serverTimestamp(),
      resetGeneration:fv.increment(1),resetReason:'employee_submitted_by_mistake'});
  }
  rows=rows.filter(x=>x.id!==record.id);
  summary();render();
  message.textContent='أُلغي تقييم '+label+' من الإحصاءات. سيصله طلب التقييم مجددًا عند فتح النظام.';
 }catch(e){
  console.warn('[Feedback V93] Reset failed',e?.code||e?.message||e);
  message.textContent='لم يتم إلغاء التقييم: '+safe(e?.code||e?.message||'تعذر التحديث',100)+'. تحقق من صلاحيات Firebase.';
 }finally{pending=false}
}
async function load(){
 if(pending)return;
 pending=true;
 const reload=$('#b70-reload');reload.disabled=true;
 const message=$('#b70-admin-status');message.textContent='جارٍ تحميل التقييمات…';
 try{
  if(!window.firebase?.firestore)throw Error('تعذر تحميل قاعدة البيانات');
  if(!firebase.apps.length)firebase.initializeApp(config);
  const firestore=firebase.firestore();
  const [primary,profile]=await Promise.allSettled([
    firestore.collection(COLLECTION).orderBy('submittedAt','desc').limit(MAX_RECORDS).get({source:'server'}),
    Promise.resolve().then(()=>firestore.collection('users').limit(750).get({source:'server'}))
  ]);
  const failures=[];
  const primaryRows=primary.status==='fulfilled'
    ?primary.value.docs.map(doc=>({id:doc.id,...doc.data(),__source:'feedback'}))
    :(failures.push('مجموعة التقييمات: '+String(primary.reason?.code||primary.reason?.message||'read failed')),[]);
  const profileRows=profile.status==='fulfilled'
    ?profile.value.docs.filter(doc=>doc.data()?.[STAFF_FIELD]).map(doc=>({id:doc.id,...doc.data()[STAFF_FIELD],__source:'users'}))
    :(failures.push('ملفات الموظفين: '+String(profile.reason?.code||profile.reason?.message||'read failed')),[]);
  if(primary.status==='rejected'&&profile.status==='rejected')throw new Error(failures.join(' ؛ '));
  const byEmployee=new Map();
  [...primaryRows,...profileRows].filter(x=>Number.isInteger(Number(x.stars))&&Number(x.stars)>=1&&Number(x.stars)<=5).forEach(x=>{
    const k=String(x.employeeId||x.id),old=byEmployee.get(k);
    if(!old||millis(x.submittedAt)>millis(old.submittedAt)||(millis(x.submittedAt)===millis(old.submittedAt)&&x.__source==='feedback'))byEmployee.set(k,{...x,stars:Number(x.stars)});
  });
  rows=[...byEmployee.values()].sort((a,b)=>millis(b.submittedAt)-millis(a.submittedAt));
  summary();render();
  message.textContent='تم تحميل '+rows.length+' تقييم من مصادر الحفظ المتاحة.'+(failures.length?' تنبيه: '+failures.join(' ؛ '):'');
 }catch(error){
  console.warn('[Feedback V70] Admin read failed',error?.code||error?.message||String(error));
  message.textContent='تعذر قراءة التقييمات من قاعدة البيانات. تحقق من الاتصال وصلاحيات Firestore ثم اضغط «تحديث».';
  if(!rows.length){$('#b70-feedback-list').replaceChildren();add($('#b70-feedback-list'),'div','empty','لا يمكن عرض التقييمات حاليًا.')}
 }finally{pending=false;reload.disabled=false}
}
$('#b70-filter')?.addEventListener('input',render);
$('#b70-rating-filter')?.addEventListener('change',render);
$('#b70-reload')?.addEventListener('click',load);
load();
})();