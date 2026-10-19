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
  bound='',queue=[],sending=false,scanner=null,scannerStarting=false,cameraSession=0,cameraHardware=null,cameraZoomTimer=null,torchOn=false,alternateDecoder=null,disabled=false,lastCameraToken='',lastCameraTime=0,audio=null,
  syncError='',syncFailures=0,retryBlocked=false,retryTimer=null;
const queueKey=id=>'batco_branch_presence_queue_v80_'+encodeURIComponent(userId)+'_'+encodeURIComponent(id);
const fmt=n=>new Intl.NumberFormat('ar-SA').format(n||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canUse=()=>Boolean(control?.enabled&&session?.status==='active'&&control.sessionId===session.id&&(session.assignedEmployeeIds||[]).includes(userId)&&(control.assignedEmployeeIds||[]).includes(userId));
const queuedSet=()=>new Set(queue.map(x=>x.sku));
const scanSound=window.BranchScanAudio||null;
function prepareAudio(){try{scanSound?.prepare()}catch{}}
// iOS WebKit requires AudioContext activation in a real gesture, before any async camera work.
// Prepare on the entire work area so Bluetooth/wired scanner buttons and manual input qualify.
function prepareFromGesture(){prepareAudio()}
document.addEventListener('pointerdown',prepareFromGesture,{capture:true,passive:true});
document.addEventListener('touchstart',prepareFromGesture,{capture:true,passive:true});
document.addEventListener('keydown',prepareFromGesture,{capture:true});
function setCameraLayout(active){
 const area=el('cameraArea');
 area.classList.toggle('idle',!active);
 el('cameraStandby').hidden=active;
 el('workerCloseCamera').hidden=!active;
 el('workerCamera').setAttribute('aria-pressed',String(active));
 el('workerCameraLabel').textContent=active?'ماسح الباركود يعمل':'تشغيل ماسح الباركود';
}
let flashTimer=null;
function feedback(message,kind=''){
 const box=el('workerFeedback'),text=box.querySelector('.feedbackText'),glyph=box.querySelector('.feedbackIcon');
 text.textContent=message;box.className='scanFeedback '+kind;
 glyph.textContent=kind==='good'?'✓':kind==='duplicate'?'!':kind==='error'?'×':'✓';
 // A green confirmation is shown at the camera itself: workers needn't look away.
 const flash=el('cameraFlash');
 if(flash&&scanner){
  flash.textContent=kind==='good'?'تم اعتماد الصنف ✓':kind==='duplicate'?'تم رصده مسبقًا':'تعذر اعتماد الصنف';
  flash.className='cameraFlash '+(kind||'');
  clearTimeout(flashTimer);
  flashTimer=setTimeout(()=>{flash.className='cameraFlash';flash.textContent=''},1300);
 }
 if(kind==='good'||kind==='duplicate'){try{navigator.vibrate?.(kind==='good'?55:[35,40,35])}catch{}}
 if(kind==='good')scanSound?.play('accepted');
 if(kind==='duplicate')scanSound?.play('duplicate');
 if(kind==='error')scanSound?.play('error');
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
function receive(raw,source='manual'){
 const value=String(raw||'').trim();if(!value)return;
 el('workerInput').value='';el('workerSuggestions').hidden=true;
 if(!canUse()){feedback('الجرد غير مفعل أو غير مسند لحسابك.','error');return}
 const result=source==='camera'&&C.resolveScan?C.resolveScan(value,session.products||[]):C.resolve(value,session.products||[]);
 if(!result.item){
  if(source==='camera'){
   const notice=result.reason==='unlinked-ean'
    ?'تمت قراءة EAN-13: '+value+'، لكنه غير مرتبط بصنف في المستودع. أدخل رقم الصنف الصحيح.'
    :result.reason==='ambiguous'
    ?'تمت قراءة '+value+' لكنه يطابق عدة أصناف.'
    :'تمت قراءة '+value+'، لكن هذا الرمز غير موجود ضمن أكواد المستودع.';
   feedback(notice,'error');
  }else feedback(result.reason==='ambiguous'?'الباركود يطابق أكثر من صنف. أدخل رقم الصنف الصحيح يدويًا.':'الباركود غير معروف في المستودع المرجعي. أدخل رقم الصنف يدويًا.','error');
  return;
 }
 const item=result.item;
 if(seen.has(item.sku)||queue.some(x=>x.sku===item.sku)){
  feedback('مسجل مسبقًا: '+item.sku,'duplicate');if(!scanner)el('workerInput').focus();return;
 }
 queue.push({sku:item.sku,name:item.name||'',at:new Date().toISOString()});
 if(!persistQueue()){queue.pop();return}
 recent.unshift({sku:item.sku,name:item.name||'',pending:true});recent=recent.slice(0,12);
 feedback('تم مسح '+item.sku+' · محفوظ على الجهاز وبانتظار تأكيد الخادم','good');
 render();if(!scanner)el('workerInput').focus();flush();
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
el('workerForm').addEventListener('submit',e=>{e.preventDefault();prepareAudio();clearTimeout(quickScanTimer);receive(el('workerInput').value)});
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
 const script=document.createElement('script');script.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
 script.onload=()=>window.Html5Qrcode?resolve(window.Html5Qrcode):reject(Error('MISSING_SCANNER'));
 script.onerror=()=>reject(Error('NO_SCANNER_LIBRARY'));document.head.append(script);
})}
function cameraMessage(message){el('cameraNote').textContent=message}
function resetCameraControls(){
 clearTimeout(cameraZoomTimer);cameraZoomTimer=null;cameraHardware=null;torchOn=false;
 el('workerZoomControl').hidden=true;el('workerTorch').hidden=true;
 el('workerTorch').setAttribute('aria-pressed','false');el('workerTorch').textContent='تشغيل الإضاءة';
}
async function configureCamera(current){
 if(!window.BranchCameraPro||!current)return;
 const video=document.querySelector('#cameraReader video');
 if(video){video.setAttribute('playsinline','');video.setAttribute('autoplay','');}
 const hardware=window.BranchCameraPro.getHardware(current,video);
 cameraHardware=hardware;
 if(hardware.zoomSupported){
  const input=el('workerZoom'),range=hardware.zoomRange;
  input.min=String(range.min);input.max=String(Math.min(range.max,8));
  input.step=String(Number.isFinite(range.step)&&range.step>0?range.step:.1);
  input.value=String(Math.min(Number(input.max),Math.max(range.min,hardware.zoomCurrent||range.min)));
  el('workerZoomLabel').textContent=Number(input.value).toFixed(1)+'×';
  el('workerZoomControl').hidden=false;
 }
 el('workerTorch').hidden=!hardware.torchSupported;
 const focusEnabled=await hardware.focus().catch(()=>false);
 if(current!==scanner)return;
 const resolution=hardware.width&&hardware.height?' · '+hardware.width+'×'+hardware.height:'';
 cameraMessage((focusEnabled?'التركيز التلقائي مفعّل':'حرّك الهاتف ببطء حتى تتضح الصورة')+resolution+' · التقريب والإضاءة حسب إمكانات الجهاز');
}
function decodedBarcode(raw,details){
 // html5-qrcode uses a native detector when supported, and its ZXing decoder otherwise.
 // Never block the camera while writing to Firestore or display the keyboard in camera mode.
 const token=C.key(raw),now=Date.now();
 if(token===lastCameraToken&&now-lastCameraTime<5000)return;
 lastCameraToken=token;lastCameraTime=now;
 el('cameraDecoded').hidden=false;el('cameraDecoded').textContent='تم التعرف على الباركود: '+token;
 receive(raw,'camera');
}
async function startCamera(){
 prepareAudio();
 if(scanner||scannerStarting||!canUse())return;
 if(!window.BranchCameraPro){feedback('تعذر تهيئة الكاميرا؛ أعد تحميل الصفحة ثم حاول مجددًا.','error');return}
 scannerStarting=true;const ticket=++cameraSession;
 el('workerCamera').disabled=true;
 resetCameraControls();el('cameraDecoded').hidden=true;el('cameraDecoded').textContent='';cameraMessage('جاري تشغيل كاميرا عالية الوضوح…');
 let current=null;
 try{
  const Qrcode=await loadScanner();
  if(ticket!==cameraSession||!canUse())return;
  const F=window.Html5QrcodeSupportedFormats||{};
  const formats=window.BranchCameraPro.formats(F);
  const init=()=>new Qrcode('cameraReader',formats.length?{
   formatsToSupport:formats,useBarCodeDetectorIfSupported:true,verbose:false
  }:{useBarCodeDetectorIfSupported:true,verbose:false});
  current=init();scanner=current;
  try{
   await current.start({facingMode:'environment'},window.BranchCameraPro.options(true),decodedBarcode,()=>{});
  }catch(highResError){
   // Unsupported 1080p constraints should not prevent scanning on older iPhones.
   try{await current.stop()}catch{}
   try{await current.clear()}catch{}
   if(ticket!==cameraSession)return;
   current=init();scanner=current;
   cameraMessage('تعمل الكاميرا بالإعدادات المتوافقة مع جهازك.');
   await current.start({facingMode:'environment'},window.BranchCameraPro.options(false),decodedBarcode,()=>{});
  }
  if(ticket!==cameraSession||!canUse()){
   if(scanner===current)scanner=null;
   try{await current.stop()}catch{}try{await current.clear()}catch{}
   return;
  }
  await configureCamera(current);
  if(ticket===cameraSession&&current===scanner)setCameraLayout(true);
  if(ticket===cameraSession&&current===scanner&&window.BranchBarcodeFallback){
   try{
    alternateDecoder=window.BranchBarcodeFallback.create({
     videoProvider:()=>document.querySelector('#cameraReader video'),
     onDecode:code=>{
      if(ticket===cameraSession&&current===scanner)decodedBarcode(code);
     },
     onStatus:state=>{
      if(ticket===cameraSession&&current===scanner&&state==='secondary-ready')
       cameraMessage('محرك قراءة إضافي للباركود مفعّل.');
     }
    });
   }catch(e){console.warn('[BATCO] Optional barcode decoder unavailable',e)}
  }
 }catch(err){
  if(ticket===cameraSession){
   feedback('تعذر تشغيل الكاميرا. استخدم ماسح الباركود الخارجي أو اكتب رقم الصنف.','error');
   cameraMessage('تعذر تشغيل الكاميرا: تأكد من السماح باستخدام الكاميرا في إعدادات Safari.');
  }
  if(scanner===current)scanner=null;
  if(current){try{await current.stop()}catch{}try{await current.clear()}catch{}}
  if(ticket===cameraSession){setCameraLayout(false);resetCameraControls();}
 }finally{
  if(ticket===cameraSession){scannerStarting=false;el('workerCamera').disabled=!!scanner;}
 }
}
async function stopCamera(){
 ++cameraSession;scannerStarting=false;el('workerCamera').disabled=false;
 const extra=alternateDecoder;alternateDecoder=null;extra?.stop();
 const current=scanner;scanner=null;
 setCameraLayout(false);resetCameraControls();
 if(current){try{await current.stop()}catch{}try{await current.clear()}catch{}}
}
setCameraLayout(false);
el('workerCamera').onclick=startCamera;
el('workerCloseCamera').onclick=stopCamera;
el('workerZoom').addEventListener('input',e=>{
 const value=Number(e.target.value);
 el('workerZoomLabel').textContent=value.toFixed(1)+'×';
 clearTimeout(cameraZoomTimer);
 const hardware=cameraHardware,opened=scanner;
 cameraZoomTimer=setTimeout(async()=>{
  if(!hardware||!opened||opened!==scanner)return;
  try{const actual=await hardware.setZoom(value);if(opened===scanner)el('workerZoomLabel').textContent=actual.toFixed(1)+'×'}
  catch{if(opened===scanner)cameraMessage('التقريب غير متاح من المتصفح على هذا الجهاز؛ استخدم العدسة الرئيسية مع إضاءة أفضل.')}
 },90);
});
el('workerTorch').onclick=async()=>{
 const hardware=cameraHardware,opened=scanner;
 if(!hardware||!opened)return;
 try{
  const actual=await hardware.setTorch(!torchOn);
  if(opened!==scanner)return;
  torchOn=actual;
  el('workerTorch').textContent=actual?'إطفاء الإضاءة':'تشغيل الإضاءة';
  el('workerTorch').setAttribute('aria-pressed',String(actual));
 }catch{
  if(opened===scanner){el('workerTorch').hidden=true;cameraMessage('التحكم بالإضاءة غير متاح في هذا المتصفح.')}
 }
};
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
