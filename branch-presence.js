/* V80: quick branch inventory presence. Scan -> one SKU document, no quantities. */
(()=>{
'use strict';
const C=window.BranchPresenceCore,el=id=>document.getElementById(id);
if(!C||typeof firebase==='undefined'){el('workerTitle').textContent='تعذر تهيئة جرد الفرع';return}
const firebaseConfig={apiKey:'AIzaSyCCvNlnZDxL5P4cPQrHYkOh3C8wJ6yl4Bw',authDomain:'inventory-system-ca3dc.firebaseapp.com',projectId:'inventory-system-ca3dc',storageBucket:'inventory-system-ca3dc.firebasestorage.app',messagingSenderId:'139575913885',appId:'1:139575913885:web:110648e07345b36da15374'};
if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
const db=firebase.firestore();
const ROOT_ID='admin_mohanad';
let photo=null;try{photo=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null')}catch{}
const name=String(localStorage.getItem('inventory_user_name_v2')||'').trim(),
 employeeId=String(localStorage.getItem('inventory_employee_id_v2')||'').trim(),
 localQa=['localhost','127.0.0.1'].includes(location.hostname),
 admin=name==='مهند'&&localStorage.getItem('inventory_admin_token_v2')==='1jh297-spgf2z'&&(localQa||(photo?.role==='admin'&&photo?.employeeId===ROOT_ID&&photo?.photoId)),
 employee=Boolean(employeeId&&localStorage.getItem('inventory_employee_auth_version_v2')==='2'&&(localQa||(photo?.role==='employee'&&photo?.employeeId===employeeId&&photo?.photoId))),
 userId=admin?ROOT_ID:employeeId;
if(!admin&&!employee){location.replace('./index.html?employee=1');return}
const controls=db.collection('system_controls').doc('branch_presence_feature');
const sessions=db.collection('branch_presence_sessions');
let control=null,session=null,seen=new Set(),recent=[],unsubSession=null,unsubSeen=null,
  bound='',queue=[],sending=false,scanner=null,disabled=false,lastCameraToken='',lastCameraTime=0,audio=null,
  syncError='',syncFailures=0,retryBlocked=false,retryTimer=null;
const queueKey=id=>'batco_branch_presence_queue_v80_'+encodeURIComponent(userId)+'_'+encodeURIComponent(id);
const fmt=n=>new Intl.NumberFormat('ar-SA').format(n||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canUse=()=>Boolean(control?.enabled&&session?.status==='active'&&control.sessionId===session.id&&(session.assignedEmployeeIds||[]).includes(userId)&&(control.assignedEmployeeIds||[]).includes(userId));
const queuedSet=()=>new Set(queue.map(x=>x.sku));
function feedback(message,kind=''){
 el('workerFeedback').textContent=message;el('workerFeedback').className='scanFeedback '+kind;
 if(kind==='good'||kind==='duplicate'){try{navigator.vibrate?.(kind==='good'?40:[30,30,30])}catch{}}
 if(kind==='good'){try{
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
  if(!audio)audio=new A();if(audio.state==='suspended')audio.resume().catch(()=>{});
  const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=850;g.gain.value=.025;o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.09);
 }catch{}}
}
function status(text){el('workerDescription').textContent=text}
function render(){
 const authorized=canUse();el('workerScan').hidden=!authorized;
 if(!control){el('workerTitle').textContent='جاري تحميل التكليف…';status('انتظر الاتصال بالنظام.');return}
 if(!session){el('workerTitle').textContent='لا يوجد جرد فرع مفعّل';status('يستطيع المدير إنشاء جرد الفرع وتحديد الموظف المكلف من صفحة إدارة الجرد.');return}
 if(!(session.assignedEmployeeIds||[]).includes(userId)){el('workerTitle').textContent='الجرد غير مسند لحسابك';status('اطلب من الإدارة تحديد حسابك ضمن المكلفين بجرد الفرع.');return}
 if(session.status!=='active'){el('workerTitle').textContent='انتهى جرد '+session.branchName;status('تم إغلاق الجرد من الإدارة. المسوحات المحفوظة لدى الخادم باقية ضمن التقرير.');return}
 if(!control.enabled){el('workerTitle').textContent='الجرد متوقف مؤقتًا';status('سيعود المسح فور استئناف الجرد من الإدارة.');return}
 el('workerTitle').textContent=session.branchName;
 status('مرجع الأصناف: '+(session.warehouse==='riyadh'?'مستودع الرياض':'مستودع جدة')+' · المكلف: '+name);
 const products=(session.products||[]).filter(x=>x.warehouseQty>0);
 const staged=queuedSet(),count=new Set([...seen,...staged]);
 const rep=C.summary(products,count,false);
 el('workerDone').textContent=fmt(rep.observed);
 el('workerPending').textContent=fmt(rep.notObserved);
 const b=el('workerSync');
 b.textContent=queue.length?'بانتظار حفظ '+fmt(queue.length):'محفوظ على الخادم';
 b.className=queue.length?'syncWait':'syncGood';
 if(queue.length&&!navigator.onLine)b.textContent='دون إنترنت · '+fmt(queue.length);
 if(queue.length&&syncError)b.textContent='لم تكتمل المزامنة · '+fmt(queue.length);
 const help=el('workerSyncHelp');help.hidden=!queue.length||!syncError;help.textContent=help.hidden?'':syncError;
 el('workerRetry').hidden=!queue.length;el('workerExport').hidden=!queue.length;
 el('workerRecent').innerHTML=recent.length?recent.slice(0,10).map(x=>'<div class="recentRow"><b>'+esc(x.sku)+'</b><span>'+esc(x.name)+(x.pending?' · قيد المزامنة':'')+'</span></div>').join(''):'<p>لم يتم رصد أي صنف بعد.</p>';
}
function readQueue(id){try{const list=JSON.parse(localStorage.getItem(queueKey(id))||'[]');return Array.isArray(list)?list.filter(x=>x&&typeof x.sku==='string'):[]}catch{return []}}
function persistQueue(){try{localStorage.setItem(queueKey(bound),JSON.stringify(queue));return true}catch{feedback('مساحة الجهاز ممتلئة؛ لا تغادر حتى تستطيع حفظ المسح.','error');return false}}
function clearSubscriptions(){if(unsubSession)unsubSession();if(unsubSeen)unsubSeen();unsubSession=unsubSeen=null}
function bind(id){
 if(bound===id)return;
 clearSubscriptions();stopCamera();clearTimeout(retryTimer);retryTimer=null;syncError='';syncFailures=0;retryBlocked=false;bound=id;session=null;seen.clear();recent=[];queue=id?readQueue(id):[];
 if(!id){render();return}
 const ref=sessions.doc(id);
 unsubSession=ref.onSnapshot(d=>{session=d.exists?{id:d.id,...d.data()}:null;render();flush()},e=>{status('تعذر تحميل الجرد: '+e.message)});
 unsubSeen=ref.collection('seen').onSnapshot(s=>{
  seen=new Set(s.docs.map(d=>d.data()?.sku).filter(Boolean));
  recent=s.docs.map(d=>d.data()).filter(x=>x?.sku).sort((a,b)=>(b.scannedAt?.seconds||0)-(a.scannedAt?.seconds||0)).slice(0,10).map(x=>({sku:x.sku,name:x.name||'',pending:false}));
  render();
 },e=>status('تعذر تحميل سجل المسح: '+e.message));
}
controls.onSnapshot(d=>{control={enabled:false,sessionId:'',assignedEmployeeIds:[],...(d.exists?d.data():{})};bind(control.sessionId);render();flush();if(!canUse())stopCamera()},
e=>{el('workerTitle').textContent='تعذر قراءة تكليف الجرد';status('تحقق من الشبكة ثم أعد المحاولة: '+e.message)});
function receive(raw){
 const value=String(raw||'').trim();if(!value)return;
 el('workerInput').value='';el('workerSuggestions').hidden=true;
 if(!canUse()){feedback('الجرد غير مفعل أو غير مسند لحسابك.','error');return}
 const result=C.resolve(value,session.products||[]);
 if(!result.item){feedback(result.reason==='ambiguous'?'الباركود يطابق أكثر من صنف. أدخل رقم الصنف الصحيح يدويًا.':'الباركود غير معروف في المستودع المرجعي. أدخل رقم الصنف يدويًا.','error');return}
 const item=result.item;
 if(seen.has(item.sku)||queue.some(x=>x.sku===item.sku)){
  feedback('مسجل مسبقًا: '+item.sku,'duplicate');el('workerInput').focus();return;
 }
 queue.push({sku:item.sku,name:item.name||'',at:new Date().toISOString()});
 if(!persistQueue()){queue.pop();return}
 recent.unshift({sku:item.sku,name:item.name||'',pending:true});recent=recent.slice(0,12);
 feedback('تم مسح '+item.sku+' · محفوظ على الجهاز وبانتظار تأكيد الخادم','good');
 render();el('workerInput').focus();flush();
}
async function flush(){
 if(sending||retryBlocked||!bound||!canUse()||!navigator.onLine||!queue.length)return;
 clearTimeout(retryTimer);retryTimer=null;
 sending=true;
 try{
  while(queue.length&&canUse()&&navigator.onLine){
   const first=queue[0];
   if(seen.has(first.sku)){queue.shift();persistQueue();continue}
   const sessionRef=sessions.doc(bound),scanRef=sessionRef.collection('seen').doc('sku_'+encodeURIComponent(first.sku));
   try{
    await db.runTransaction(async txn=>{
     const snap=await txn.get(sessionRef);
     const data=snap.data();
     if(!data||data.status!=='active'||!(data.assignedEmployeeIds||[]).includes(userId))throw Error('SESSION_CLOSED');
     if(!(data.products||[]).some(p=>p.sku===first.sku))throw Error('SKU_NOT_IN_SESSION');
     txn.set(scanRef,{sku:first.sku,name:first.name,scannedBy:userId,scannedByName:name,scannedAt:firebase.firestore.FieldValue.serverTimestamp()}, {merge:true});
    });
    seen.add(first.sku);queue.shift();persistQueue();syncFailures=0;syncError='';retryBlocked=false;
   }catch(e){
    syncFailures++;
    const code=String(e?.code||e?.message||'').toLowerCase();
    const closed=/SESSION_CLOSED|SKU_NOT_IN_SESSION/.test(e?.message||'');
    retryBlocked=closed||code.includes('permission-denied')||code.includes('unauthenticated');
    if(closed)syncError='أُغلق الجرد أو تغير تكليف الموظف. لم تُرسل المسوحات المعلقة؛ راجع الإدارة قبل الإغلاق النهائي.';
    else if(code.includes('permission-denied')||code.includes('unauthenticated'))syncError='الخادم رفض حفظ المسح بسبب صلاحيات قاعدة البيانات. يجب مراجعة إعدادات Firebase مع الإدارة؛ المسوحات ما زالت محفوظة على هذا الجهاز.';
    else if(code.includes('resource-exhausted')||code.includes('quota'))syncError='قاعدة البيانات بلغت حد الاستخدام أو الحصة مؤقتًا. المسوحات آمنة محليًا ولن تظهر كأنها وصلت إلى الخادم. جرّب لاحقًا.';
    else if(code.includes('unavailable')||code.includes('deadline')||!navigator.onLine)syncError='تعذر الوصول إلى قاعدة البيانات حاليًا. احتفظ بالصفحة أو صدّر نسخة احتياطية، ثم حاول إعادة المزامنة عند استقرار الاتصال.';
    else syncError='تعذر تأكيد وصول المسوحات للخادم ('+(String(e?.code||'خطأ غير معروف').slice(0,55))+'). لم نفقد المسوحات المحلية؛ استخدم إعادة المحاولة.';
    feedback('لم يصل المسح إلى الخادم. '+(retryBlocked?'راجع الإدارة قبل إعادة المحاولة.':'ستُعاد المحاولة تلقائيًا.'),'error');
    if(!retryBlocked&&queue.length){
      const delay=code.includes('resource-exhausted')?180000:Math.min(60000,Math.pow(2,Math.min(6,syncFailures))*1250);
      const sessionId=bound;
      retryTimer=setTimeout(()=>{if(sessionId===bound)flush()},delay);
    }
    break;
   }
  }
 }finally{sending=false;render()}
}
let quickScanTimer=0;
el('workerForm').addEventListener('submit',e=>{e.preventDefault();clearTimeout(quickScanTimer);receive(el('workerInput').value)});
el('workerInput').addEventListener('input',e=>{
 const q=C.key(e.target.value),box=el('workerSuggestions');
 clearTimeout(quickScanTimer);
 if(q.length>=8&&canUse())quickScanTimer=setTimeout(()=>{const raw=el('workerInput').value.trim();if(raw.length>=8&&C.resolve(raw,session?.products||[]).item)receive(raw)},260);
 if(q.length<3){box.hidden=true;return}
 const items=session?.products||[];
 const matches=items.filter(p=>C.key(p.sku).includes(q)).slice(0,5);
 box.innerHTML=matches.map(p=>'<button type="button" data-sku="'+esc(p.sku)+'"><b>'+esc(p.sku)+'</b><span>'+esc(p.name)+'</span></button>').join('');
 box.hidden=!matches.length;
});
el('workerSuggestions').onclick=e=>{const button=e.target.closest('[data-sku]');if(button)receive(button.dataset.sku)};
function loadScanner(){return new Promise((resolve,reject)=>{
 if(window.Html5Qrcode)return resolve(window.Html5Qrcode);
 const script=document.createElement('script');script.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';script.onload=()=>window.Html5Qrcode?resolve(window.Html5Qrcode):reject(Error('MISSING_SCANNER'));script.onerror=()=>reject(Error('NO_SCANNER_LIBRARY'));document.head.append(script);
})}
async function startCamera(){
 if(scanner||!canUse())return;
 el('cameraArea').hidden=false;
 try{
  const Qrcode=await loadScanner();
  const F=window.Html5QrcodeSupportedFormats||{};
  const formats=['CODE_128','CODE_39','CODE_93','EAN_13','EAN_8','UPC_A','UPC_E','ITF','CODABAR','QR_CODE','DATA_MATRIX']
    .map(k=>F[k]).filter(n=>typeof n==='number');
  const next=new Qrcode('cameraReader',formats.length?{formatsToSupport:formats,useBarCodeDetectorIfSupported:true,verbose:false}:{verbose:false});
  scanner=next;
  // A long, wide detection region is essential for 1D product barcodes on iOS.
  const options={
    fps:15,disableFlip:true,aspectRatio:1.3333,
    qrbox:(width,height)=>({
      width:Math.max(100,Math.min(Math.floor(width*.94),520)),
      height:Math.max(95,Math.min(Math.floor(height*.61),230))
    })
  };
  await next.start({facingMode:'environment'},options,raw=>{
   const token=C.key(raw),now=Date.now();
   if(token===lastCameraToken&&now-lastCameraTime<950)return;
   lastCameraToken=token;lastCameraTime=now;receive(raw);
  },()=>{});
  const video=document.querySelector('#cameraReader video');
  if(video){video.setAttribute('playsinline','');video.setAttribute('autoplay','');}

 }catch(e){feedback('تعذر تشغيل الكاميرا. استخدم قارئ الباركود أو أدخل رقم الصنف.','error');stopCamera()}
}
async function stopCamera(){const value=scanner;scanner=null;el('cameraArea').hidden=true;if(value){try{await value.stop()}catch{}try{await value.clear()}catch{}}}
el('workerCamera').onclick=startCamera;el('workerCloseCamera').onclick=stopCamera;
el('workerRetry').onclick=()=>{retryBlocked=false;syncFailures=0;syncError='';render();flush()};
el('workerExport').onclick=()=>{
 if(!queue.length)return;
 const escaped=v=>'"'+String(v??'').replace(/^\s*[=+@-]/,m=>"'"+m).replace(/"/g,'""')+'"';
 const header=['رقم الصنف','اسم الصنف','وقت المسح','رقم الجرد','هوية الموظف'];
 const csv='\uFEFF'+[header.map(escaped).join(','),...queue.map(row=>[row.sku,row.name,row.at,bound,userId].map(escaped).join(','))].join('\r\n')+'\r\n';
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='جرد-فرع-معلّق-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
};
window.addEventListener('online',()=>{retryBlocked=false;flush();render()});
window.addEventListener('offline',render);
window.addEventListener('focus',()=>{if(queue.length&&!retryBlocked)flush()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&queue.length&&!retryBlocked)flush()});
window.addEventListener('beforeunload',()=>{clearTimeout(retryTimer);clearSubscriptions()});
render();
})();
