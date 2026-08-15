from pathlib import Path

customer_path = Path('customer.html')
admin_path = Path('admin-dashboard.html')
customer = customer_path.read_text(encoding='utf-8')
admin = admin_path.read_text(encoding='utf-8')


def must_find(text, needle, label):
    if needle not in text:
        raise SystemExit(f'Missing marker: {label}')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing replacement marker: {label}')
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# CUSTOMER PORTAL: durable checkout + WhatsApp handoff + telemetry redundancy
# -----------------------------------------------------------------------------
if "const LAST_SUBMITTED_ORDER_KEY = 'customer_last_submitted_order_v2';" not in customer:
    customer = replace_once(
        customer,
        "const GUEST_NAME_KEY = 'customer_guest_name_v1';",
        "const GUEST_NAME_KEY = 'customer_guest_name_v1';\nconst LAST_SUBMITTED_ORDER_KEY = 'customer_last_submitted_order_v2';\nconst PENDING_CHECKOUT_SNAPSHOT_KEY = 'customer_pending_checkout_snapshot_v2';",
        'customer storage constants'
    )

# Replace telemetry functions with redundant writes: activity collection + customer profile heartbeat.
telemetry_start = customer.find('async function logCustomerEvent(user,type,label=\'\',data={}){')
telemetry_end = customer.find('function normalizePhone(raw){', telemetry_start)
if telemetry_start < 0 or telemetry_end < 0:
    raise SystemExit('Customer telemetry function markers missing')
telemetry_block = r'''async function logCustomerEvent(user,type,label='',data={}){
  if(!user?.uid)return {activity:false,profile:false};
  const device=customerDeviceInfo();
  const activityWrite=db.collection(CUSTOMER_ACTIVITY_COLLECTION).add({
    customerUid:user.uid,sessionId:customerSessionId,type,label:String(label||''),data:data||{},device,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  });
  const profileWrite=db.collection(CUSTOMER_COLLECTION).doc(user.uid).set({
    lastActivityAt:firebase.firestore.FieldValue.serverTimestamp(),lastActivityType:String(type||'activity'),
    lastActivityLabel:String(label||''),lastSessionId:customerSessionId,lastSeenAt:firebase.firestore.FieldValue.serverTimestamp(),
    lastDevice:{deviceId:device.deviceId||'',fingerprint:device.fingerprint||'',userAgent:device.userAgent||'',platform:device.platform||'',viewport:device.viewport||'',screen:device.screen||'',standalone:!!device.standalone,timezone:device.timezone||''},
    telemetryVersion:4
  },{merge:true});
  const results=await Promise.allSettled([activityWrite,profileWrite]);
  if(results[0].status==='rejected')console.warn('[Customer telemetry activity]',results[0].reason?.message||results[0].reason);
  if(results[1].status==='rejected')console.warn('[Customer telemetry profile]',results[1].reason?.message||results[1].reason);
  return {activity:results[0].status==='fulfilled',profile:results[1].status==='fulfilled'};
}
async function touchCustomerSession(user,profile,event='active'){
  if(!user?.uid)return {session:false,profile:false};
  const device=customerDeviceInfo();
  try{
    const key='batco_customer_session_started_'+customerSessionId;
    const first=!sessionStorage.getItem(key);
    const payload={customerUid:user.uid,sessionId:customerSessionId,name:profile?.name||'',company:profile?.company||'',phone:profile?.phone||'',event,lastActive:firebase.firestore.FieldValue.serverTimestamp(),device};
    if(first){payload.startedAt=firebase.firestore.FieldValue.serverTimestamp();sessionStorage.setItem(key,'1')}
    const sessionWrite=db.collection(CUSTOMER_SESSION_COLLECTION).doc(`${user.uid}_${customerSessionId}`).set(payload,{merge:true});
    const profileWrite=db.collection(CUSTOMER_COLLECTION).doc(user.uid).set({
      lastSeenAt:firebase.firestore.FieldValue.serverTimestamp(),lastSessionId:customerSessionId,
      lastSessionEvent:String(event||'active'),lastDevice:{deviceId:device.deviceId||'',fingerprint:device.fingerprint||'',userAgent:device.userAgent||'',platform:device.platform||'',viewport:device.viewport||'',screen:device.screen||'',standalone:!!device.standalone,timezone:device.timezone||''},
      telemetryVersion:4
    },{merge:true});
    const results=await Promise.allSettled([sessionWrite,profileWrite]);
    if(results[0].status==='rejected')console.warn('[Customer session log]',results[0].reason?.message||results[0].reason);
    if(results[1].status==='rejected')console.warn('[Customer session profile]',results[1].reason?.message||results[1].reason);
    return {session:results[0].status==='fulfilled',profile:results[1].status==='fulfilled'};
  }catch(e){console.warn('[Customer session]',e?.message||e);return {session:false,profile:false}}
}

'''
customer = customer[:telemetry_start] + telemetry_block + customer[telemetry_end:]

# WhatsApp order handoff helpers and pending-action cleanup.
valid_pin_marker = "function validPin(pin){ return /^\\d{6}$/.test(toEnglishDigits(pin)); }"
if 'function buildOrderWhatsAppText(order)' not in customer:
    must_find(customer, valid_pin_marker, 'validPin helper')
    helpers = r'''

function buildOrderWhatsAppText(order){
  const c=order?.customer||{},branches=Array.isArray(order?.branches)?order.branches:[],items=Array.isArray(order?.items)?order.items:[];
  const totalCartons=Number(order?.totalCartons)||sum(items.map(i=>Number(i.totalQty)||0));
  const estimatedTotal=Number(order?.estimatedTotal)||sum(items.map(i=>(Number(i.cartonPrice)||0)*(Number(i.totalQty)||0)));
  const lines=['طلب شراء - بيت الأواني الطيبة',`رقم الطلب: ${order?.orderNo||'—'}`];
  if(c.name)lines.push(`الاسم: ${c.name}`);
  if(c.company)lines.push(`الجهة: ${c.company}`);
  if(c.phone)lines.push(`الجوال: ${displayPhone(c.phone)}`);
  lines.push(`إجمالي الكراتين: ${NF.format(totalCartons)}`);
  if(estimatedTotal>0)lines.push(`القيمة التقريبية: ${PRICE_NF.format(estimatedTotal)} ريال`);
  branches.forEach((branch,index)=>{
    const rows=items.map(item=>({...item,qty:Number(item.branchQuantities?.[branch.id]||0)})).filter(item=>item.qty>0);
    if(!rows.length)return;
    lines.push('',`${index+1}) ${branch.name||'فرع'}`);
    rows.forEach(item=>lines.push(`• ${item.id||item.cleanId||'—'} — ${NF.format(item.qty)} كرتون`));
  });
  if(order?.notes)lines.push('','ملاحظات:',String(order.notes));
  lines.push('','تم إعداد الطلب عبر بوابة عملاء بيت الأواني الطيبة.');
  return lines.join('\n');
}
function openOrderWhatsApp(order){
  const url='https://wa.me/?text='+encodeURIComponent(buildOrderWhatsAppText(order));
  const opened=window.open(url,'_blank');
  if(opened){try{opened.opener=null}catch{};return true}
  window.location.href=url;return false;
}
function clearCustomerPendingAction(){
  try{
    sessionStorage.removeItem('customer_pending_action');
    sessionStorage.removeItem('customer_pending_notes');
    sessionStorage.removeItem('customer_pending_after_auth');
    localStorage.removeItem(PENDING_CHECKOUT_SNAPSHOT_KEY);
  }catch{}
}
'''
    customer = customer.replace(valid_pin_marker, valid_pin_marker + helpers, 1)

# Success/receipt screen that survives the authentication transition and exposes WhatsApp explicitly.
orders_marker = 'function OrdersView({orders,drafts,onLoadDraft,onDeleteDraft,loading}){'
if 'function OrderSuccessScreen({order,onWhatsApp,onClose})' not in customer:
    must_find(customer, orders_marker, 'OrdersView')
    success_component = r'''
function OrderSuccessScreen({order,onWhatsApp,onClose}){
  if(!order)return null;
  const itemCount=order.items?.length||0,totalCartons=Number(order.totalCartons)||0,estimatedTotal=Number(order.estimatedTotal)||0;
  return <div className="min-h-[100dvh] ui-auth-bg safe-top safe-bottom px-4 py-6 flex items-center justify-center"><div className="w-full max-w-[560px] ui-panel fade-in">
    <div className="ui-panel-head"><div className="ui-success-dot"><Icon name="check" className="w-6 h-6"/></div><div className="ui-eyebrow !text-success">تم حفظ الطلب بنجاح</div><h1 className="ui-title">طلبك محفوظ ولن يضيع</h1><p className="ui-subtitle">تم تسجيل الطلب داخل حسابك. الآن يمكنك فتح واتساب وإرسال نسخة منه، ويمكنك الرجوع له لاحقًا من «طلباتي».</p></div>
    <div className="ui-panel-body">
      <div className="rounded-16 border border-border bg-surface p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-[10px] text-muted">رقم الطلب</div><b className="ltr text-base">{order.orderNo||'—'}</b></div><div className="text-left"><div className="text-[10px] text-muted">الكراتين</div><b className="ltr">{NF.format(totalCartons)}</b></div></div><div className="grid grid-cols-2 gap-2 mt-3"><div className="bg-white border border-border rounded-12 p-3 text-center"><div className="text-[10px] text-muted">الأصناف</div><b>{itemCount}</b></div><div className="bg-white border border-border rounded-12 p-3 text-center"><div className="text-[10px] text-muted">القيمة التقريبية</div><b className="ltr text-accent">{estimatedTotal>0?`${PRICE_NF.format(estimatedTotal)} ⃁`:'—'}</b></div></div></div>
      <button onClick={()=>onWhatsApp(order)} className="ui-btn ui-btn-primary w-full"><Icon name="file" className="w-5 h-5"/>إرسال الطلب عبر واتساب</button>
      <button onClick={onClose} className="ui-btn ui-btn-secondary w-full">الانتقال إلى طلباتي</button>
      <div className="rounded-12 bg-infoSoft border border-info/10 p-3 text-[10px] leading-5 text-info">فتح واتساب يجهز نص الطلب تلقائيًا. الإرسال النهائي يتم من داخل واتساب حتى يختار العميل المحادثة المناسبة.</div>
      <CustomerCredits compact/>
    </div>
  </div></div>;
}

'''
    customer = customer.replace(orders_marker, success_component + 'function OrdersView({orders,drafts,onLoadDraft,onDeleteDraft,loading,onWhatsApp}){', 1)
else:
    customer = customer.replace(orders_marker, 'function OrdersView({orders,drafts,onLoadDraft,onDeleteDraft,loading,onWhatsApp}){', 1)

# Add WhatsApp action to every saved order so the customer can resend later.
old_order_action = "{tab==='orders'?<button onClick={()=>setExpanded(isOpen?null:row.id)} className=\"h-9 px-3 rounded-10 border border-border text-xs font-bold\">{isOpen?'إخفاء':'التفاصيل'}</button>:<><button onClick={()=>onLoadDraft(row)}"
if old_order_action in customer:
    new_order_action = "{tab==='orders'?<><button onClick={()=>onWhatsApp?.(row)} className=\"h-9 px-3 rounded-10 bg-successSoft text-success border border-success/10 text-xs font-bold\">واتساب</button><button onClick={()=>setExpanded(isOpen?null:row.id)} className=\"h-9 px-3 rounded-10 border border-border text-xs font-bold\">{isOpen?'إخفاء':'التفاصيل'}</button></>:<><button onClick={()=>onLoadDraft(row)}"
    customer = customer.replace(old_order_action,new_order_action,1)
elif 'onWhatsApp?.(row)' not in customer:
    raise SystemExit('Saved-order action marker missing')

# Persist a success receipt in session storage.
guest_state_marker = "  const [guestName,setGuestName]=useState(()=>{try{return String(localStorage.getItem(GUEST_NAME_KEY)||'').trim()}catch{return''}}),[showGuestNamePrompt,setShowGuestNamePrompt]=useState(false);"
if 'const [submittedOrder,setSubmittedOrder]' not in customer:
    must_find(customer, guest_state_marker, 'CustomerApp guest state')
    submitted_state = "  const [submittedOrder,setSubmittedOrder]=useState(()=>{try{return JSON.parse(sessionStorage.getItem(LAST_SUBMITTED_ORDER_KEY)||'null')}catch{return null}});\n"
    customer = customer.replace(guest_state_marker, submitted_state + guest_state_marker, 1)

# Replace draft and submit functions atomically to keep pending data until the write succeeds.
save_start = customer.find("  async function saveDraft(notes=''){")
fresh_start = customer.find('  async function freshAllowedMap(){', save_start)
submit_start = customer.find('  async function submitOrder(notes){', fresh_start)
load_history_start = customer.find('  async function loadHistory(){', submit_start)
if min(save_start,fresh_start,submit_start,load_history_start) < 0:
    raise SystemExit('Customer checkout function markers missing')

new_save = r'''  async function saveDraft(notes=''){
    if(!cartItems.length)return;
    if(guestMode){
      try{
        sessionStorage.setItem('customer_pending_after_auth','checkout');sessionStorage.setItem('customer_pending_action','draft');sessionStorage.setItem('customer_pending_notes',String(notes||''));
        localStorage.setItem(PENDING_CHECKOUT_SNAPSHOT_KEY,JSON.stringify({kind:'draft',cart,branches,notes:String(notes||''),createdAt:Date.now()}));
      }catch{}
      onRequireAuth?.('draft');return;
    }
    setSavingDraft(true);
    try{
      const ref=db.collection(DRAFT_COLLECTION).doc(),draftNo='D-'+ref.id.slice(0,7).toUpperCase();
      await ref.set({customerUid:user.uid,draftNo,items:cartItems.map(i=>({cleanId:i.cleanId,id:i.id,name:i.name,imageFile:i.imageFile||'',cartonPrice:Number(i.cartonPrice)||0,pack:i.pack||'',branchQuantities:i.branchQuantities,totalQty:i.totalQty})),estimatedTotal:sum(cartItems.map(i=>(Number(i.cartonPrice)||0)*Number(i.totalQty||0))),notes:String(notes||'').trim(),totalCartons,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      clearCustomerPendingAction();
      setToast({type:'success',message:`تم حفظ ${draftNo} كمسودة.`});
      await logCustomerEvent(user,'draft_saved',draftNo,{draftId:ref.id,itemCount:cartItems.length,totalCartons});
    }catch(e){console.error(e);setToast({type:'error',message:'تعذر حفظ المسودة. لم نفقد محتويات السلة، ويمكنك المحاولة مرة أخرى.'})}
    finally{setSavingDraft(false)}
  }
'''
customer = customer[:save_start] + new_save + customer[fresh_start:submit_start]
# Recompute markers after first replacement.
submit_start = customer.find('  async function submitOrder(notes){')
load_history_start = customer.find('  async function loadHistory(){', submit_start)
new_submit = r'''  async function submitOrder(notes){
    const cleanNotes=String(notes||'').trim();
    if(!cleanNotes){setToast({type:'error',message:'الملاحظات إلزامية قبل اعتماد الطلب.'});return}
    if(!cartItems.length){setToast({type:'error',message:'السلة فارغة. لم يتم إنشاء أي طلب.'});return}
    if(guestMode){
      try{
        sessionStorage.setItem('customer_pending_after_auth','checkout');sessionStorage.setItem('customer_pending_action','submit');sessionStorage.setItem('customer_pending_notes',cleanNotes);
        localStorage.setItem(PENDING_CHECKOUT_SNAPSHOT_KEY,JSON.stringify({kind:'submit',cart,branches,notes:cleanNotes,createdAt:Date.now()}));
      }catch{}
      onRequireAuth?.('submit');return;
    }
    setSubmitBusy(true);setValidationErrors([]);
    try{
      const allowed=await freshAllowedMap();
      const errors=cartItems.map(i=>({cleanId:i.cleanId,id:i.id,requested:i.totalQty,allowed:allowed.get(i.cleanId)||0})).filter(x=>x.requested>x.allowed+1e-9);
      if(errors.length){setValidationErrors(errors);setToast({type:'error',message:'تغير الحد المسموح لبعض الأصناف. السلة محفوظة؛ عدّل الكميات ثم أعد الاعتماد.'});return}
      const ref=db.collection(ORDER_COLLECTION).doc(),orderNo='BT-'+ref.id.slice(0,7).toUpperCase();
      const orderItems=cartItems.map(i=>({cleanId:i.cleanId,id:i.id,name:i.name,cartonPrice:Number(i.cartonPrice)||0,pack:i.pack||'',branchQuantities:i.branchQuantities,totalQty:i.totalQty}));
      const orderCore={customerUid:user.uid,orderNo,customer:{name:safeProfile.name,company:safeProfile.company,phone:safeProfile.phone},branches:branches.map(b=>({id:b.id,name:b.name})),items:orderItems,notes:cleanNotes,totalCartons,estimatedTotal:sum(cartItems.map(i=>(Number(i.cartonPrice)||0)*Number(i.totalQty||0))),status:'submitted'};
      await ref.set({...orderCore,createdAt:firebase.firestore.FieldValue.serverTimestamp(),checkoutVersion:4});
      const receipt={id:ref.id,...orderCore,createdAtLocal:Date.now()};
      try{sessionStorage.setItem(LAST_SUBMITTED_ORDER_KEY,JSON.stringify(receipt))}catch{}
      setSubmittedOrder(receipt);
      clearCustomerPendingAction();
      setCart({});setCheckout(false);setPage('orders');
      await Promise.allSettled([
        logCustomerEvent(user,'order_submitted',orderNo,{orderId:ref.id,itemCount:cartItems.length,totalCartons,notesLength:cleanNotes.length,branches:branches.map(b=>b.name)}),
        touchCustomerSession(user,safeProfile,'order_submitted'),
        db.collection(CUSTOMER_COLLECTION).doc(user.uid).set({lastOrderNo:orderNo,lastOrderId:ref.id,lastOrderAt:firebase.firestore.FieldValue.serverTimestamp(),orderCount:firebase.firestore.FieldValue.increment(1),lastActivityAt:firebase.firestore.FieldValue.serverTimestamp(),lastActivityType:'order_submitted'},{merge:true})
      ]);
    }catch(e){
      console.error(e);
      setToast({type:'error',message:'تعذر اعتماد الطلب. السلة والفاتورة لم تُحذف؛ تحقق من الاتصال وحاول مجددًا.'});
    }finally{setSubmitBusy(false)}
  }
  async function shareOrderWhatsApp(order){
    if(!order)return;
    openOrderWhatsApp(order);
    if(!user?.uid)return;
    const orderId=order.id||'';
    const writes=[logCustomerEvent(user,'whatsapp_share_opened',order.orderNo||orderId,{orderId})];
    if(orderId)writes.push(db.collection(ORDER_COLLECTION).doc(orderId).set({whatsappShareOpenedAt:firebase.firestore.FieldValue.serverTimestamp(),whatsappShareOpenCount:firebase.firestore.FieldValue.increment(1)},{merge:true}));
    Promise.allSettled(writes).catch(()=>{});
  }
  function closeSubmittedOrder(){
    try{sessionStorage.removeItem(LAST_SUBMITTED_ORDER_KEY)}catch{}
    setSubmittedOrder(null);setCheckout(false);setPage('orders');
  }
'''
customer = customer[:submit_start] + new_submit + customer[load_history_start:]

# Do not delete pending action BEFORE the resumed submit/draft actually succeeds.
old_resume_clear = "    pendingResumeRef.current=true;\n    try{sessionStorage.removeItem('customer_pending_action');sessionStorage.removeItem('customer_pending_notes');sessionStorage.removeItem('customer_pending_after_auth')}catch{}\n    const t=setTimeout(async()=>{"
if old_resume_clear in customer:
    customer = customer.replace(old_resume_clear,"    pendingResumeRef.current=true;\n    const t=setTimeout(async()=>{",1)
elif "pendingResumeRef.current=true;\n    const t=setTimeout(async()=>{" not in customer:
    raise SystemExit('Pending resume marker missing')

# If an interrupted auth transition somehow loses the migrated cart, recover the snapshot.
resume_effect_marker = "  useEffect(()=>{\n    if(guestMode||!user?.uid||loading||pendingResumeRef.current||!cartItems.length||!String(safeProfile.name||'').trim())return;"
if 'PENDING_CHECKOUT_SNAPSHOT_KEY' in customer and 'checkout_snapshot_recovered' not in customer:
    must_find(customer,resume_effect_marker,'pending resume useEffect')
    recovery_effect = r'''  useEffect(()=>{
    if(guestMode||!user?.uid||loading||cartItems.length)return;
    let action='';try{action=sessionStorage.getItem('customer_pending_action')||''}catch{}
    if(!action)return;
    try{
      const snapshot=JSON.parse(localStorage.getItem(PENDING_CHECKOUT_SNAPSHOT_KEY)||'null');
      if(snapshot?.cart&&Object.keys(snapshot.cart).length){
        setCart(snapshot.cart);
        if(snapshot.notes)sessionStorage.setItem('customer_pending_notes',String(snapshot.notes));
        logCustomerEvent(user,'checkout_snapshot_recovered','استعادة السلة بعد تسجيل الدخول',{kind:snapshot.kind||action,itemCount:Object.keys(snapshot.cart).length});
      }
    }catch(e){console.warn('[Checkout recovery]',e)}
  },[guestMode,user?.uid,loading,cartItems.length]);
'''
    customer = customer.replace(resume_effect_marker,recovery_effect+resume_effect_marker,1)

# Render receipt before returning to normal portal, and wire WhatsApp in order history.
nav_marker = "  const nav=[['home','home','الرئيسية'],['categories','grid','الأقسام'],['cart','cart','السلة'],['orders','file','طلباتي'],['account','user','حسابي']];"
if 'if(submittedOrder)return' not in customer:
    must_find(customer,nav_marker,'CustomerApp nav')
    customer = customer.replace(nav_marker,nav_marker+"\n  if(submittedOrder)return <><OrderSuccessScreen order={submittedOrder} onWhatsApp={shareOrderWhatsApp} onClose={closeSubmittedOrder}/><Toast toast={toast} onClose={()=>setToast(null)}/></>;",1)

old_orders_render = '<OrdersView orders={orders} drafts={drafts} onLoadDraft={loadDraft} onDeleteDraft={deleteDraft} loading={historyLoading}/>'
if old_orders_render in customer:
    customer = customer.replace(old_orders_render,'<OrdersView orders={orders} drafts={drafts} onLoadDraft={loadDraft} onDeleteDraft={deleteDraft} loading={historyLoading} onWhatsApp={shareOrderWhatsApp}/>',1)
elif 'onWhatsApp={shareOrderWhatsApp}' not in customer:
    raise SystemExit('OrdersView render marker missing')

# Registration profile itself now carries authoritative activity fallback even if auxiliary logs fail.
old_profile_data = "const profileData={name:savedGuestName,company:registration.company,phone:registration.phone,branches:[],status:'active',livenessVerified:true,livenessVerifiedAt:firebase.firestore.FieldValue.serverTimestamp(),createdAt:firebase.firestore.FieldValue.serverTimestamp(),lastLoginAt:firebase.firestore.FieldValue.serverTimestamp(),schemaVersion:3};"
if old_profile_data in customer:
    new_profile_data = "const deviceAtRegistration=customerDeviceInfo();const profileData={name:savedGuestName,company:registration.company,phone:registration.phone,branches:[],status:'active',livenessVerified:true,livenessVerifiedAt:firebase.firestore.FieldValue.serverTimestamp(),createdAt:firebase.firestore.FieldValue.serverTimestamp(),lastLoginAt:firebase.firestore.FieldValue.serverTimestamp(),lastSeenAt:firebase.firestore.FieldValue.serverTimestamp(),lastActivityAt:firebase.firestore.FieldValue.serverTimestamp(),lastActivityType:'account_created',lastActivityLabel:'إنشاء حساب',lastSessionId:customerSessionId,lastDevice:{deviceId:deviceAtRegistration.deviceId||'',fingerprint:deviceAtRegistration.fingerprint||'',userAgent:deviceAtRegistration.userAgent||'',platform:deviceAtRegistration.platform||'',viewport:deviceAtRegistration.viewport||'',screen:deviceAtRegistration.screen||'',standalone:!!deviceAtRegistration.standalone,timezone:deviceAtRegistration.timezone||''},createdSource:'customer_portal',telemetryVersion:4,schemaVersion:4};"
    customer = customer.replace(old_profile_data,new_profile_data,1)
elif "lastActivityType:'account_created'" not in customer:
    raise SystemExit('Registration profile marker missing')

# Await registration lifecycle logging instead of fire-and-forget.
old_registration_logs = "      touchCustomerSession(created,createdProfile,'account_created');\n      logCustomerEvent(created,'account_created','إنشاء حساب',{company:registration.company,phone:registration.phone,livenessVerified:true});\n      logCustomerEvent(created,'liveness_verified','تم التحقق من الحضور',{savedFaceImage:!!facePhotoDataUrl});\n      db.collection(CUSTOMER_LOGIN_COLLECTION).add({customerUid:created.uid,company:registration.company,phone:registration.phone,type:'account_created',sessionId:customerSessionId,device:customerDeviceInfo(),createdAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});"
if old_registration_logs in customer:
    new_registration_logs = "      await Promise.allSettled([\n        touchCustomerSession(created,createdProfile,'account_created'),\n        logCustomerEvent(created,'account_created','إنشاء حساب',{company:registration.company,phone:registration.phone,livenessVerified:true}),\n        logCustomerEvent(created,'liveness_verified','تم التحقق من الحضور',{savedFaceImage:!!facePhotoDataUrl}),\n        db.collection(CUSTOMER_LOGIN_COLLECTION).add({customerUid:created.uid,name:createdProfile.name||'',company:registration.company,phone:registration.phone,type:'account_created',sessionId:customerSessionId,device:customerDeviceInfo(),createdAt:firebase.firestore.FieldValue.serverTimestamp()})\n      ]);"
    customer = customer.replace(old_registration_logs,new_registration_logs,1)
elif 'await Promise.allSettled([\n        touchCustomerSession(created' not in customer:
    raise SystemExit('Registration lifecycle marker missing')

# Await normal login/session writes too; include name and nested device consistently.
old_login_logs = "      touchCustomerSession(u,p,reason);\n      logCustomerEvent(u,reason==='manual_login'?'login_success':'session_restored',reason,{company:p.company,phone:p.phone});\n      db.collection(CUSTOMER_LOGIN_COLLECTION).add({customerUid:u.uid,company:p.company||'',phone:p.phone||'',type:reason==='manual_login'?'login_success':'session_restore',sessionId:customerSessionId,device:customerDeviceInfo(),createdAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});"
if old_login_logs in customer:
    new_login_logs = "      await Promise.allSettled([\n        touchCustomerSession(u,p,reason),\n        logCustomerEvent(u,reason==='manual_login'?'login_success':'session_restored',reason,{company:p.company,phone:p.phone}),\n        db.collection(CUSTOMER_LOGIN_COLLECTION).add({customerUid:u.uid,name:p.name||'',company:p.company||'',phone:p.phone||'',type:reason==='manual_login'?'login_success':'session_restore',sessionId:customerSessionId,device:customerDeviceInfo(),createdAt:firebase.firestore.FieldValue.serverTimestamp()})\n      ]);"
    customer = customer.replace(old_login_logs,new_login_logs,1)
elif 'await Promise.allSettled([\n        touchCustomerSession(u,p,reason)' not in customer:
    raise SystemExit('Login lifecycle marker missing')

# Bump SW registration cache-buster so iPhones/PWAs do not keep the broken customer code.
customer = customer.replace("navigator.serviceWorker.register('./customer-sw.js?v=30.2'","navigator.serviceWorker.register('./customer-sw.js?v=32.0'",1)

# -----------------------------------------------------------------------------
# ADMIN DASHBOARD: customer-profile activity fallback, so activity remains visible
# even when auxiliary telemetry collections are blocked or delayed.
# -----------------------------------------------------------------------------
old_online = "  const customerOnline=new Set(cSessions.filter(s=>online(s.lastActive||s.updatedAt)).map(s=>s.customerUid));"
if old_online in admin:
    admin = admin.replace(old_online,"  const customerOnline=new Set([...cSessions.filter(s=>online(s.lastActive||s.updatedAt)).map(s=>s.customerUid),...customers.filter(c=>online(c.lastSeenAt||c.lastActivityAt)).map(c=>c.id)]);",1)
elif 'customers.filter(c=>online(c.lastSeenAt||c.lastActivityAt))' not in admin:
    raise SystemExit('Admin customerOnline marker missing')

old_recent = "  const recentCustomerActivity=[...cActivity].sort((a,b)=>tsMs(b.createdAt||b.timestamp)-tsMs(a.createdAt||a.timestamp));"
if old_recent in admin:
    new_recent = "  const activityCustomerIds=new Set(cActivity.map(x=>x.customerUid).filter(Boolean));\n  const customerProfileActivityFallback=customers.filter(c=>!activityCustomerIds.has(c.id)&&(c.lastActivityAt||c.lastSeenAt||c.lastLoginAt)).map(c=>({id:`profile_${c.id}`,customerUid:c.id,type:c.lastActivityType||'profile_activity',label:c.lastActivityLabel||'آخر نشاط محفوظ',name:c.name||'',company:c.company||'',createdAt:c.lastActivityAt||c.lastSeenAt||c.lastLoginAt,__fallback:true}));\n  const recentCustomerActivity=[...cActivity,...customerProfileActivityFallback].sort((a,b)=>tsMs(b.createdAt||b.timestamp)-tsMs(a.createdAt||a.timestamp));"
    admin = admin.replace(old_recent,new_recent,1)
elif 'customerProfileActivityFallback' not in admin:
    raise SystemExit('Admin recent activity marker missing')

# CustomerLive fallback presence and login timeline.
live_start = admin.find('  function CustomerLive(){')
live_end = admin.find('  function EmployeeOverview(){', live_start)
if live_start < 0 or live_end < 0:
    raise SystemExit('Admin CustomerLive markers missing')
new_customer_live = r'''  function CustomerLive(){
    const latest=[...cSessions].sort((a,b)=>tsMs(b.lastActive||b.updatedAt)-tsMs(a.lastActive||a.updatedAt));
    const byUser=new Map();latest.forEach(s=>{if(s.customerUid&&!byUser.has(s.customerUid))byUser.set(s.customerUid,s)});
    customers.forEach(c=>{if(byUser.has(c.id))return;const t=c.lastSeenAt||c.lastActivityAt||c.lastLoginAt;if(!t)return;byUser.set(c.id,{id:`profile_${c.id}`,customerUid:c.id,name:c.name||'',company:c.company||'',lastActive:t,userAgent:c.lastDevice?.userAgent||'',platform:c.lastDevice?.platform||'',__fallback:true})});
    const presence=[...byUser.values()].sort((a,b)=>tsMs(b.lastActive||b.updatedAt)-tsMs(a.lastActive||a.updatedAt));
    const loginUids=new Set(cLogins.map(x=>x.customerUid).filter(Boolean));
    const loginEvents=[...cLogins.map(x=>({type:'login',customerUid:x.customerUid,name:x.name||x.phone||'—',company:x.company||'',time:x.createdAt||x.timestamp,device:x.userAgent||x.device?.userAgent||''})),...customers.filter(c=>!loginUids.has(c.id)&&c.lastLoginAt).map(c=>({type:'login',customerUid:c.id,name:c.name||c.phone||'—',company:c.company||'',time:c.lastLoginAt,device:c.lastDevice?.userAgent||'',fallback:true}))];
    const exitEvents=presence.filter(s=>!online(s.lastActive||s.updatedAt)).map(s=>({type:'exit',customerUid:s.customerUid,name:s.name||'—',company:s.company||'',time:s.lastActive||s.updatedAt,device:s.userAgent||s.device?.userAgent||''}));
    const timeline=[...loginEvents,...exitEvents].sort((a,b)=>tsMs(b.time)-tsMs(a.time)).slice(0,40);
    return <div className="grid gap-4"><div className="grid grid-cols-2 sm:grid-cols-5 gap-2"><Stat label="متصل الآن" value={customerOnline.size} tone="success"/><Stat label="العملاء النشطون" value={customers.filter(c=>c.status!=='deleted'&&c.status!=='suspended').length}/><Stat label="طلبات اليوم" value={todayCustomerOrders.length}/><Stat label="قيمة اليوم" value={`${num(todayCustomerOrderValue)} ⃁`} tone="accent"/><Stat label="بوابة العملاء" value={control.enabled?'تعمل':'متوقفة'} tone={control.enabled?'success':'danger'}/></div><div className="grid lg:grid-cols-[.9fr_1.1fr] gap-4"><section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"><div className="p-4 border-b border-border flex justify-between items-center"><div><b className="text-sm">العملاء الآن</b><div className="text-[10px] text-muted mt-1">الحضور الحالي وآخر نشاط — مع قراءة احتياطية من ملف العميل.</div></div><button onClick={()=>setModule('portal')} className="h-9 px-3 rounded-xl border border-border text-[10px] font-bold">تشغيل البوابة</button></div><div className="divide-y divide-border max-h-[520px] overflow-y-auto">{presence.length?presence.map((s,i)=>{const c=customers.find(x=>x.id===s.customerUid)||{},on=online(s.lastActive||s.updatedAt);return <button key={s.id||i} onClick={()=>c.id?setCustomerManager(c):setDetail(s)} className="w-full p-3.5 text-right hover:bg-surface flex items-center gap-3"><span className={`w-2.5 h-2.5 rounded-full ${on?'bg-success':'bg-muted'}`}></span><div className="min-w-0 flex-1"><b className="text-xs block truncate">{c.name||s.name||'عميل'}</b><span className="text-[10px] text-muted block mt-1 truncate">{c.company||s.company||'—'} · {on?'داخل البوابة الآن':`آخر نشاط ${ago(s.lastActive||s.updatedAt)}`}</span></div></button>}):<div className="py-12 text-center text-xs text-muted">لا توجد حسابات أو جلسات عملاء بعد.</div>}</div></section><section className="bg-white border border-border rounded-2xl shadow-card overflow-hidden"><div className="p-4 border-b border-border"><b className="text-sm">الدخول والخروج</b></div><div className="divide-y divide-border max-h-[520px] overflow-y-auto">{timeline.length?timeline.map((e,i)=>{const c=customers.find(x=>x.id===e.customerUid)||{};return <div key={i} className="p-3.5 flex items-center gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${e.type==='login'?'bg-successSoft text-success':'bg-surface text-secondary'}`}><Icon name={e.type==='login'?'check':'back'} className="w-4 h-4"/></div><div className="min-w-0 flex-1"><div className="flex gap-2 items-center"><b className="text-xs truncate">{c.name||e.name||'عميل'}</b><Pill tone={e.type==='login'?'ok':'neutral'}>{e.type==='login'?'دخل':'غادر'}</Pill></div><div className="text-[9px] text-muted mt-1 truncate">{c.company||e.company||'—'} · {deviceLabel(e.device)}</div></div><span className="text-[10px] text-muted">{dateTime(e.time)}</span></div>}):<div className="py-12 text-center text-xs text-muted">لا توجد حركات مسجلة بعد.</div>}</div></section></div></div>
  }

'''
admin = admin[:live_start] + new_customer_live + admin[live_end:]

# Activity page consumes fallback rows too.
admin = admin.replace("function CustomerActivity(){const rows=sortRows(cActivity.filter(match),r=>r.createdAt||r.timestamp);","function CustomerActivity(){const rows=sortRows(recentCustomerActivity.filter(match),r=>r.createdAt||r.timestamp);",1)

# Show last activity directly on customer account cards.
phone_line = "<div className=\"text-[10px] text-muted mt-1 ltr text-right\">{c.phone||'—'}</div></div><Pill"
if phone_line in admin:
    admin = admin.replace(phone_line,"<div className=\"text-[10px] text-muted mt-1 ltr text-right\">{c.phone||'—'}</div><div className=\"text-[9px] text-muted mt-1\">آخر نشاط: {dateTime(c.lastActivityAt||c.lastSeenAt||c.lastLoginAt||c.updatedAt||c.createdAt)}</div></div><Pill",1)
elif 'آخر نشاط: {dateTime(c.lastActivityAt' not in admin:
    raise SystemExit('Admin customer account card marker missing')

# Improve login device display for nested device payload.
admin = admin.replace("${deviceLabel(r.userAgent)}","${deviceLabel(r.userAgent||r.device?.userAgent)}")

# Friendly fallback event label.
admin = admin.replace("const customerEventNames={account_created:'إنشاء حساب'","const customerEventNames={profile_activity:'آخر نشاط محفوظ',account_created:'إنشاء حساب'",1)

# Critical verification before writing.
customer_checks = [
    ('receipt key', "LAST_SUBMITTED_ORDER_KEY" in customer),
    ('whatsapp builder', 'function buildOrderWhatsAppText(order)' in customer),
    ('success screen', 'function OrderSuccessScreen({order,onWhatsApp,onClose})' in customer),
    ('saved order whatsapp', 'onWhatsApp?.(row)' in customer),
    ('receipt state', 'const [submittedOrder,setSubmittedOrder]' in customer),
    ('durable submit', "setSubmittedOrder(receipt)" in customer),
    ('recovery snapshot', 'checkout_snapshot_recovered' in customer),
    ('telemetry profile fallback', 'lastActivityType:String(type' in customer),
    ('registration heartbeat', "lastActivityType:'account_created'" in customer),
]
admin_checks = [
    ('online fallback', 'customers.filter(c=>online(c.lastSeenAt||c.lastActivityAt))' in admin),
    ('activity fallback', 'customerProfileActivityFallback' in admin),
    ('live fallback', 'قراءة احتياطية من ملف العميل' in admin),
    ('account last activity', 'آخر نشاط: {dateTime(c.lastActivityAt' in admin),
]
failed=[name for name,ok in customer_checks+admin_checks if not ok]
if failed:
    raise SystemExit('Verification failed: '+', '.join(failed))

customer_path.write_text(customer,encoding='utf-8')
admin_path.write_text(admin,encoding='utf-8')
print('Customer checkout reliability V32 patch applied successfully.')
