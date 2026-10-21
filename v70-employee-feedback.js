/* V70 — employee experience feedback (one response per verified account/release).
   This records rating data only; it never changes stock, permissions or orders. */
(function(){
'use strict';
const RELEASE='v70',COLLECTION='employee_experience_feedback',PREFIX='batco_employee_feedback_v70_';
// Faster first-visit prompt: ~4s after identity/server precheck; keep background-interaction protection.
const INITIAL_DELAY=4000,RETRY_DELAY=800,MAX_BUSY_WAIT=60000,IDLE_THRESHOLD=1800;
let identity=null,visit=0,dialog=null,waiting=false,sending=false,rating=0,visible=false,previousFocus=null;
let checkTimer=null,firstReadyAt=0,lastInteraction=Date.now(),resetUnsubscribe=null;
for(const eventName of ['pointerdown','touchstart','keydown','wheel','scroll']){
 document.addEventListener(eventName,()=>{lastInteraction=Date.now()},true);
}
const safeJson=(s,fallback)=>{try{const d=JSON.parse(s||'null');return d&&typeof d==='object'?d:fallback}catch{return fallback}};
const getIdentity=()=>{
 try{
  const name=String(localStorage.getItem('inventory_user_name_v2')||'').trim();
  const id=String(localStorage.getItem('inventory_employee_id_v2')||'').trim();
  const auth=localStorage.getItem('inventory_employee_auth_version_v2')==='2';
  const proof=safeJson(localStorage.getItem('inventory_login_photo_proof_v2'),{});
  // Only prompt verified staff, not customers, signed-out visitors or the manager.
  if(!name||!id||!auth||proof.role!=='employee'||String(proof.employeeId||'')!==id||!proof.photoId)return null;
  return{id,name};
 }catch{return null}
};
const keyFor=id=>PREFIX+String(id).replace(/[^a-zA-Z0-9_-]/g,'_');
const docFor=id=>RELEASE+'_'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,130);
const readState=()=>safeJson(localStorage.getItem(keyFor(identity.id)),{visits:0});
const saveState=s=>{try{localStorage.setItem(keyFor(identity.id),JSON.stringify(s))}catch{}};
const db=()=>{if(!window.firebase?.apps?.length||!window.firebase.firestore)throw Error('الاتصال بقاعدة البيانات غير جاهز');return window.firebase.firestore()};
const limited=(promise,ms)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('انتهت مهلة الاتصال')),ms))]);
function postpone(){
 if(!identity)return;
 const state=readState();
 saveState({...state,visits:Math.max(visit,state.visits||0),deferThroughVisit:visit});
 dismiss();
}
function dismiss(){
 if(!dialog)return;
 const modal=dialog;dialog=null;visible=false;document.body.style.overflow=modal.dataset.overflow||'';
 modal.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null;
}
const starIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linejoin="round"><path d="M12 2.9 14.9 8.8 21.4 9.8 16.7 14.4 17.8 20.8 12 17.8 6.2 20.8 7.3 14.4 2.6 9.8 9.1 8.8Z"/></svg>';
function paintStars(){
 if(!dialog)return;
 dialog.querySelectorAll('.b70-star').forEach(button=>{
  const n=Number(button.dataset.rating),chosen=n<=rating;
  button.setAttribute('aria-pressed',String(n===rating));
  button.classList.toggle('is-selected',chosen);
  const icon=button.querySelector('svg');if(icon)icon.setAttribute('fill',chosen?'currentColor':'none');
  button.style.color=chosen?'#292524':'#bcb6af';
 });
 dialog.querySelector('.b70-rating-hint').textContent=rating?['','ضعيف','مقبول','جيد','جيد جدًا','ممتاز'][rating]:'اختر من نجمة إلى خمس نجوم';
 dialog.querySelector('.b70-send').disabled=rating===0||sending;
}
async function submit(){
 if(!dialog||!identity||sending)return;
 if(!rating){dialog.querySelector('.b70-message').textContent='اختر عدد النجوم أولًا.';return}
 sending=true;const send=dialog.querySelector('.b70-send'),later=dialog.querySelector('.b70-later');
 send.textContent='جارٍ الإرسال…';later.disabled=true;paintStars();
 dialog.querySelector('.b70-message').textContent='';
 const note=String(dialog.querySelector('textarea').value||'').trim().slice(0,500);
 try{
  const firestore=db();
  const payload={
   release:RELEASE,topic:'site_and_recent_update',schemaVersion:1,
   employeeId:identity.id,employeeName:identity.name,
   stars:rating,note,submittedAt:window.firebase.firestore.FieldValue.serverTimestamp(),
   source:'employee_website',status:'submitted'
  };
  await limited(firestore.collection(COLLECTION).doc(docFor(identity.id)).set(payload,{merge:true}),12000);
  const state=readState();saveState({...state,visits:visit,submitted:true,submittedAt:Date.now()});
  dialog.querySelector('.b70-message').style.color='#292524';
  dialog.querySelector('.b70-message').textContent='تم إرسال تقييمك، شكرًا لك.';
  send.textContent='تم الإرسال';clearTimeout(checkTimer);
  setTimeout(dismiss,950);
 }catch(error){
  console.warn('[Feedback V70] Save failed',error?.code||error?.message||String(error));
  dialog.querySelector('.b70-message').textContent='تعذّر حفظ التقييم. حاول مرة ثانية، أو اختر «قيّم لاحقًا».';
  send.textContent='إعادة الإرسال';sending=false;later.disabled=false;paintStars();
 }
}
function open(){
 if(dialog||!identity)return;
 if(document.activeElement?.matches?.('input,textarea,[contenteditable="true"]'))return;
 previousFocus=document.activeElement;
 const overlay=document.createElement('div');dialog=overlay;visible=true;
 overlay.id='batco70-feedback-backdrop';overlay.dataset.overflow=document.body.style.overflow||'';
 overlay.innerHTML='<div id="batco70-feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="b70-title" aria-describedby="b70-description">'+
  '<p class="b70-eyebrow">رأيك يهمّنا</p>'+
  '<h2 id="b70-title">كيف تقيّم الموقع بعد التحديث؟</h2>'+
  '<p class="b70-subtitle" id="b70-description">تقييم سريع يساعدنا نحسّن تجربتك.</p>'+
  '<div class="b70-stars" role="group" aria-label="التقييم من خمس نجوم">'+[1,2,3,4,5].map(n=>'<button class="b70-star" data-rating="'+n+'" type="button" aria-label="'+n+' من 5 نجوم" aria-pressed="false">'+starIcon+'</button>').join('')+'</div>'+
  '<div class="b70-rating-hint" aria-live="polite">اختر من نجمة إلى خمس نجوم</div>'+
  '<label class="b70-note-label" for="b70-note">ملاحظتك <span style="font-weight:400;color:#78716c">(اختياري)</span></label>'+
  '<textarea id="b70-note" maxlength="500" placeholder="وش رأيك؟ وش تبي نطوّر أو نحسّن؟"></textarea>'+
  '<p class="b70-message" role="status" aria-live="polite"></p>'+
  '<div class="b70-controls"><button class="b70-send" type="button" disabled>إرسال التقييم</button><button class="b70-later" type="button">قيّم لاحقًا</button></div>'+
  '</div>';
 overlay.addEventListener('click',event=>{if(event.target===overlay&&!sending)postpone()});
 overlay.querySelectorAll('.b70-star').forEach(button=>button.addEventListener('click',()=>{
  rating=Number(button.dataset.rating);overlay.querySelector('.b70-message').textContent='';paintStars();
 }));
 overlay.querySelector('.b70-later').addEventListener('click',postpone);
 overlay.querySelector('.b70-send').addEventListener('click',submit);
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();if(!sending)postpone();return}
  if(event.key!=='Tab')return;
  const items=[...overlay.querySelectorAll('button:not(:disabled),textarea')];
  const first=items[0],last=items.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 document.body.append(overlay);document.body.style.overflow='hidden';
 paintStars();overlay.querySelector('.b70-star')?.focus({preventScroll:true});
}
function isBusy(){
 if(document.visibilityState==='hidden')return true;
 if(Date.now()-lastInteraction<IDLE_THRESHOLD)return true;
 const field=document.getElementById('searchInput');
 if(!field)return true;
 if(String(field.value||'').trim())return true;
 const focus=document.activeElement;
 if(focus?.matches?.('input,textarea,[contenteditable="true"]'))return true;
 if(document.querySelector('#b61-admin-panel,[role="dialog"]:not(#batco70-feedback-dialog)'))return true;
 return false;
}
function acceptRatingReset(doc){
 if(!identity||!doc?.exists)return false;
 const row=doc.data()||{},generation=Number(row.resetGeneration)||0,state=readState();
 if(generation>Number(state.resetGenerationSeen||0)&&!Number(row.stars)){
  saveState({...state,submitted:false,deferThroughVisit:0,resetGenerationSeen:generation});
  return true;
 }
 return false;
}
async function shouldSkipServer(){
 try{
  const doc=await limited(db().collection(COLLECTION).doc(docFor(identity.id)).get({source:'server'}),3500);
  if(doc.exists&&Number(doc.data()?.stars)>0){
   const state=readState();
   saveState({...state,visits:visit,submitted:true,resetGenerationSeen:Math.max(Number(state.resetGenerationSeen||0),Number(doc.data()?.resetGeneration||0))});
   return true;
  }
  acceptRatingReset(doc);
 }catch(error){console.warn('[Feedback V92] Cannot precheck existing rating',error?.code||error?.message||String(error))}
 return false;
}
function watchRatingResets(){
 if(resetUnsubscribe||!identity)return;
 try{
  resetUnsubscribe=db().collection(COLLECTION).doc(docFor(identity.id)).onSnapshot(doc=>{
   if(doc.metadata?.fromCache)return;
   if(acceptRatingReset(doc)&&!visible&&!sending)schedule();
  },error=>console.warn('[Feedback V92] Reset listener failed',error?.code||error?.message||String(error)));
 }catch(error){console.warn('[Feedback V92] Reset watch init',error?.message||String(error))}
}
function schedule(){
 if(waiting)return;waiting=true;
 firstReadyAt=Date.now();
 const tick=()=>{
  if(!identity||getIdentity()?.id!==identity.id||readState().submitted){waiting=false;return}
  if(!document.getElementById('searchInput')){checkTimer=setTimeout(tick,RETRY_DELAY);return}
  if(isBusy()){
   if(Date.now()-firstReadyAt>MAX_BUSY_WAIT){const state=readState();saveState({...state,deferThroughVisit:visit});waiting=false;return}
   checkTimer=setTimeout(tick,RETRY_DELAY);return
  }
  waiting=false;open();
 };
 checkTimer=setTimeout(tick,INITIAL_DELAY);
}
async function init(){
 if(identity)return;
 const user=getIdentity();if(!user){setTimeout(init,1700);return}
 identity=user;
 const state=readState();
 visit=Math.max(0,Number(state.visits)||0)+1;
 saveState({...state,visits:visit});
 const alreadyRated=await shouldSkipServer();
 watchRatingResets();
 if(getIdentity()?.id!==identity.id)return;
 const nextState=readState();
 if(alreadyRated||nextState.submitted||visit<=Number(nextState.deferThroughVisit||0))return;
 schedule();
}
window.BatcoFeedback={release:RELEASE,isVisible:()=>visible};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();