(()=>{
'use strict';
const VERSION='44.0',FEATURE_VERSION='54.0';
const HOST=location.hostname;
const norm=s=>String(s??'').toLowerCase().replace(/[\u064B-\u065F\u0670]/g,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/[ىئ]/g,'ي').replace(/ؤ/g,'و').replace(/ة/g,'ه').replace(/\s+/g,' ').trim();
const QA_RE=/(^|\s)(اختبار|تجربه|تجربة|test|qa|playwright|audit)(\s|$)/i;
const isQaIdentity=s=>QA_RE.test(norm(s));
const isQa=()=>Boolean(window.__V44_QA||HOST==='localhost'||HOST==='127.0.0.1'||navigator.webdriver===true||/[?&](qa|test)=1(?:&|$)/.test(location.search));
const safeJson=(v,f=null)=>{try{return JSON.parse(v)}catch{return f}};
const hash=s=>{let h=2166136261;for(const ch of String(s||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const now=()=>Date.now();
const installId=()=>{const k='batco_v44_install_id';try{let v=localStorage.getItem(k);if(!v){v='i44_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);localStorage.setItem(k,v)}return v}catch{return'i44_'+hash(navigator.userAgent)}};
const device=()=>({installId:installId(),fingerprint:'fp44_'+hash([navigator.platform,navigator.language,screen.width,screen.height,devicePixelRatio,navigator.maxTouchPoints,navigator.hardwareConcurrency,Intl.DateTimeFormat().resolvedOptions().timeZone].join('|')),platform:navigator.platform||'',language:navigator.language||'',screen:`${screen.width||0}x${screen.height||0}`,viewport:`${innerWidth||0}x${innerHeight||0}`,standalone:Boolean(matchMedia?.('(display-mode: standalone)')?.matches||navigator.standalone),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',userAgent:navigator.userAgent||''});
const path=location.pathname.split('/').pop()||'index.html';
const employeeName=()=>{try{return String(localStorage.getItem('inventory_user_name_v2')||'').trim()}catch{return''}};
const employeeId=()=>{try{return String(localStorage.getItem('inventory_employee_id_v2')||'').trim()}catch{return''}};
const quickProfile=()=>{try{return safeJson(localStorage.getItem('batco_quick_customer_profile_v1')||'null')}catch{return null}};
const visitorId=()=>{try{return String(localStorage.getItem('batco_customer_visitor_id_v1')||'').trim()}catch{return''}};
const guestName=()=>{try{return String(localStorage.getItem('customer_guest_name_v1')||'').trim()}catch{return''}};
const isCustomerPath=/customer\.html$/i.test(path);
const employeeCustomerView=isCustomerPath&&new URLSearchParams(location.search).get('employeeView')==='1'&&employeeName();
function actor(){
 if(employeeName()&&(!isCustomerPath||employeeCustomerView))return{type:'employee',id:employeeId()||'name_'+hash(employeeName()),name:employeeName(),employeeId:employeeId(),key:'employee_'+(employeeId()||hash(employeeName())),surface:employeeCustomerView?'customer_portal':'employee_app'};
 if(isCustomerPath){const q=quickProfile(),id=String(q?.uid||visitorId()||installId());return{type:'customer',id,name:String(q?.name||guestName()||'').trim(),company:String(q?.company||'').trim(),visitorId:visitorId(),key:'customer_'+id,surface:'customer_portal'};}
 return{type:'system',id:'unknown',name:'',key:'system_unknown',surface:path};
}
const me=actor();
if(me.type==='system'||isQa()||isQaIdentity(me.name)){window.__V44_OBSERVABILITY={version:VERSION,featureVersion:FEATURE_VERSION,skipped:true,qa:true};return;}
const DEFAULTS={
 employee:{search:true,scanner:true,catalog:true,cart:true,drafts:true,orders:true,customerView:true,stocktake:true,viewStockQty:true,viewPrices:true,viewImages:true,switchWarehouse:true,editCart:true,removeCartItems:true,submitOrder:true,viewOrderHistory:true,stocktakeNotes:true,stocktakeReview:true,stocktakeEdit:true,exportData:true},
 customer:{browse:true,search:true,categories:true,images:true,cart:true,checkout:true,orders:true,whatsapp:true,install:true,viewPrices:true,viewStockStatus:true,viewCartImages:true,editCart:true,removeCartItems:true,branchDistribution:true,checkoutNotes:true,shareProduct:true,viewOrderDetails:true}
};
let permissionDoc={},effective={...DEFAULTS[me.type]},db=null,permUnsub=null,presenceTimer=null,cartTimer=null,searchTimer=null,lastCartHash='';
const sessionId='v44s_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),dev=device();
function serverTs(){return window.firebase?.firestore?.FieldValue?.serverTimestamp?.()||new Date()}
function initDb(){try{if(!window.firebase||!window.firebase.apps?.length)return null;return window.firebase.firestore()}catch{return null}}
function actorOverrideKeys(){const out=[me.id,me.key];if(me.employeeId)out.push(me.employeeId);if(me.visitorId)out.push(me.visitorId);if(me.name)out.push('name_'+hash(norm(me.name)));return[...new Set(out.filter(Boolean))]}
function resolvePermissions(){const kind=me.type,base={...DEFAULTS[kind],...(permissionDoc?.[kind+'Defaults']||{})},map=permissionDoc?.[kind+'Overrides']||{};for(const key of actorOverrideKeys())if(map[key])Object.assign(base,map[key]);effective=base;applyPermissionDom()}
function toast(msg){let el=document.getElementById('v44-permission-toast');if(!el){el=document.createElement('div');el.id='v44-permission-toast';el.style.cssText='position:fixed;z-index:999999;top:max(14px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);max-width:90vw;background:#1c1917;color:white;border-radius:13px;padding:10px 14px;font:600 12px/1.7 system-ui;text-align:center;box-shadow:0 10px 35px rgba(0,0,0,.2);opacity:0;transition:.18s;pointer-events:none';document.body.appendChild(el)}el.textContent=msg;el.style.opacity='1';clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.opacity='0',2200)}
function denied(){toast('هذه الصلاحية غير مفعّلة لهذا الحساب. تواصل مع الإدارة عند الحاجة.')}
function classify(el){const t=norm(el?.innerText||el?.textContent||''),href=String(el?.getAttribute?.('href')||''),aria=norm(el?.getAttribute?.('aria-label')||el?.getAttribute?.('title')||''),x=t+' '+aria+' '+href;
 if(me.type==='customer'){
  if(/تعديل التوزيع|توزيع الفروع/.test(x))return'branchDistribution';
  if(/ازاله|حذف.*الصنف/.test(x))return'removeCartItems';
  if(/زياده|انقاص|تعديل الكميه|تعديل الكميات/.test(x))return'editCart';
  if(/عرض صور الاصناف|اخفاء صور الاصناف/.test(x))return'viewCartImages';
  if(/ملاحظه|ملاحظات/.test(x)&&/طلب|اعتماد/.test(x))return'checkoutNotes';
  if(/مشاركه|share/.test(x))return'shareProduct';
  if(/اضافه للطلب|السله/.test(x))return'cart';
  if(/متابعه الاعتماد|اعتماد وارسال|اعتماد الطلب/.test(x))return'checkout';
  if(/تفاصيل الطلب/.test(x))return'viewOrderDetails';
  if(/طلباتي/.test(x))return'orders';
  if(/الاقسام/.test(x))return'categories';
  if(/واتساب|whatsapp|wa\.me/.test(x))return'whatsapp';
  if(/اضافه.*تطبيق|تثبيت/.test(x))return'install';
  if(el?.tagName==='IMG'||el?.closest?.('.catalog-media'))return'images';
 }else if(me.type==='employee'){
  if(/اعتماد|ارسال.*طلب|حفظ.*فاتوره|تسجيل.*فاتوره/.test(x))return'submitOrder';
  if(/ازاله|حذف.*الصنف/.test(x))return'removeCartItems';
  if(/زياده|انقاص|تعديل الكميه|تعديل الكميات/.test(x))return'editCart';
  if(/مستودع جده|مستودع الرياض|مخزون جده|مخزون الرياض|تبديل.*مستودع/.test(x))return'switchWarehouse';
  if(/سجل الطلبات|طلبات سابقه|الطلبات السابقه/.test(x))return'viewOrderHistory';
  if(/ملاحظه|ملاحظات/.test(x)&&/جرد/.test(x))return'stocktakeNotes';
  if(/نواقص|فروقات|مراجعه/.test(x)&&/جرد|stocktake/.test(x))return'stocktakeReview';
  if(/تعديل.*جرد|اعاده.*عد|تعديل العد/.test(x))return'stocktakeEdit';
  if(/تصدير|تنزيل|excel|csv/.test(x))return'exportData';
  if(/المعرض الرقمي|معرض/.test(x))return'catalog';
  if(/باركود|ماسح|مسح/.test(x))return'scanner';
  if(/السله|الفاتوره|اضافه/.test(x))return'cart';
  if(/مسوده/.test(x))return'drafts';
  if(/الطلبات/.test(x))return'orders';
  if(/عملاء|customer\.html/.test(x))return'customerView';
  if(/الجرد|stocktake/.test(x))return'stocktake';
  if(el?.tagName==='IMG')return'viewImages';
 }
 return'';
}
function leafElements(){return document.querySelectorAll('span,div,p,small,strong,b')}
function maskLeaf(regex,off,key){leafElements().forEach(el=>{if(el.childElementCount)return;const text=String(el.textContent||'').trim();if(!text||text.length>80||!regex.test(norm(text)))return;if(off){if(!el.dataset[key])el.dataset[key]='1';el.style.visibility='hidden';el.setAttribute('aria-hidden','true')}else if(el.dataset[key]){delete el.dataset[key];el.style.visibility='';el.removeAttribute('aria-hidden')}})}
function applyPermissionDom(){
 document.querySelectorAll('input,textarea').forEach(el=>{const p=norm(el.placeholder||el.getAttribute('aria-label')||'');if(/بحث/.test(p)){const off=effective.search===false;if(off&&!el.dataset.v44PrevReadonly)el.dataset.v44PrevReadonly=el.readOnly?'1':'0';el.readOnly=off;if(off)el.setAttribute('aria-disabled','true');else el.removeAttribute('aria-disabled')}});
 const imageAllowed=me.type==='customer'?(effective.images!==false):(effective.viewImages!==false);document.querySelectorAll('img').forEach(img=>{const src=String(img.getAttribute('src')||'');if(/(^|\/)images\//.test(src)||img.closest?.('.catalog-media'))img.style.visibility=imageAllowed?'':'hidden'});
 if(me.type==='customer')document.querySelectorAll('.install-nudge').forEach(x=>x.style.display=effective.install===false?'none':'');
 maskLeaf(/ر\.س|رس|السعر|سعر الكرتون|سعر تقريبي/,effective.viewPrices===false,'v54PriceMasked');
 if(me.type==='employee')maskLeaf(/الكميه المتوفره|متوفر|الرصيد/,effective.viewStockQty===false,'v54QtyMasked');
 if(me.type==='customer')maskLeaf(/متوفر|غير متوفر|نفد|الكميه/,effective.viewStockStatus===false,'v54StockMasked');
}
function basePayload(action,label='',data={}){return{version:VERSION,featureVersion:FEATURE_VERSION,sessionId,actorType:me.type,actorId:me.id,actorKey:me.key,actorName:me.name||'',company:me.company||'',employeeId:me.employeeId||'',visitorId:me.visitorId||'',surface:me.surface,page:path,action,label:String(label||'').slice(0,240),data:data||{},device:{installId:dev.installId,fingerprint:dev.fingerprint,platform:dev.platform,screen:dev.screen,standalone:dev.standalone},createdAt:serverTs(),clientAt:Date.now()}}
let lastEvent=new Map();
async function log(action,label='',data={},dedupeMs=350){if(!db||isQa())return;const key=action+'|'+label+'|'+JSON.stringify(data||{}).slice(0,180),prev=lastEvent.get(key)||0;if(now()-prev<dedupeMs)return;lastEvent.set(key,now());try{await db.collection('v44_activity_logs').add(basePayload(action,label,data))}catch(e){console.warn('[V44 activity]',e?.message||e)}}
function presenceDocId(){return(me.key+'_'+dev.fingerprint).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,240)}
async function heartbeat(state='online'){if(!db||isQa())return;try{await db.collection('v44_presence').doc(presenceDocId()).set({version:VERSION,featureVersion:FEATURE_VERSION,actorType:me.type,actorId:me.id,actorKey:me.key,actorName:me.name||'',company:me.company||'',employeeId:me.employeeId||'',visitorId:me.visitorId||'',surface:me.surface,page:path,state,lastActive:serverTs(),device:dev,sessionId},{merge:true})}catch{}}
function itemFromNode(node){const card=node?.closest?.('article,.catalog-card,[class*="rounded-16"],[class*="rounded-20"]')||node?.parentElement,text=(card?.innerText||'').replace(/\s+/g,' ').trim().slice(0,420),img=card?.querySelector?.('img');return{text,image:img?.getAttribute?.('src')||''}}
function clickAction(el){const t=norm(el?.innerText||el?.textContent||''),href=String(el?.getAttribute?.('href')||'');if(/الرئيسيه/.test(t))return['page_home','الرئيسية'];if(/الاقسام/.test(t))return['page_categories','الأقسام'];if(/السله/.test(t))return['page_cart','السلة'];if(/طلباتي/.test(t))return['page_orders','طلباتي'];if(/اضافه للطلب/.test(t))return['cart_add_click',el.innerText];if(/ازاله/.test(t))return['cart_remove_click',el.innerText];if(/تعديل التوزيع/.test(t))return['cart_distribution_edit',el.innerText];if(/متابعه الاعتماد/.test(t))return['checkout_open','متابعة الاعتماد'];if(/اعتماد وارسال/.test(t))return['checkout_submit','اعتماد وإرسال الطلب'];if(/عرض صور الاصناف/.test(t))return['cart_images_open','عرض صور الأصناف'];if(/اخفاء صور الاصناف/.test(t))return['cart_images_close','إخفاء صور الأصناف'];if(/المعرض الرقمي/.test(t))return['employee_catalog_open','المعرض الرقمي'];if(/جرد/.test(t)||/stocktake/.test(href))return['stocktake_open',t||href];if(/واتساب|whatsapp/.test(t)||/wa\.me/.test(href))return['whatsapp_open',t||href];if(el?.tagName==='IMG'||el?.closest?.('.catalog-media'))return['product_image_open','صورة صنف'];return null}
document.addEventListener('click',e=>{const el=e.target?.closest?.('button,a,[role="button"],img');if(!el)return;const permission=classify(el);if(permission&&effective[permission]===false){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();denied();return}const txt=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim(),category=el.closest?.('.category-tile');if(category){const label=(category.innerText||'').replace(/\s+/g,' ').trim().slice(0,120);log('category_select',label,itemFromNode(category));return}const a=clickAction(el);if(a){log(a[0],a[1],itemFromNode(el));return}if(txt&&txt.length<=90){const href=el.getAttribute?.('href')||'',role=el.tagName?.toLowerCase()||'';log('button_click',txt,{href,role,context:itemFromNode(el).text},500)}},true);
document.addEventListener('input',e=>{const el=e.target;if(!(el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement))return;const p=norm(el.placeholder||el.getAttribute('aria-label')||'');if(!/بحث/.test(p))return;if(effective.search===false){el.value='';denied();return}clearTimeout(searchTimer);const q=String(el.value||'').trim();searchTimer=setTimeout(()=>{if(q.length>=1)log('search_query',q,{placeholder:el.placeholder||'',surface:me.surface},900)},1000)},true);
function cartCandidate(){try{if(me.type==='employee'){const n=employeeName();if(!n)return null;return{key:'b2b_cart_'+n,value:localStorage.getItem('b2b_cart_'+n)}}const q=quickProfile(),keys=[];if(q?.uid)keys.push('customer_cart_v1_'+q.uid);keys.push('customer_guest_cart_v1');for(const k of keys){const v=localStorage.getItem(k);if(v&&v!=='{}')return{key:k,value:v}}return{key:keys[0],value:localStorage.getItem(keys[0])}}catch{return null}}
function normalizeCart(raw){const obj=safeJson(raw||'{}',{})||{};return Object.values(obj).map(r=>({id:String(r?.id||r?.cleanId||''),cleanId:String(r?.cleanId||''),name:String(r?.name||''),qty:Number(r?.cartQty??r?.totalQty??0)||0,warehouseKey:String(r?.warehouseKey||''),pack:String(r?.pack||''),price:Number(r?.cartonPrice??r?.price??0)||0,imageFile:String(r?.imageFile||''),branchQuantities:r?.branchQuantities||{}})).filter(x=>x.id||x.cleanId)}
async function syncCart(){if(!db||isQa())return;const c=cartCandidate(),items=normalizeCart(c?.value),signature=JSON.stringify(items),sig=hash(signature);if(sig===lastCartHash)return;lastCartHash=sig;const totalQty=items.reduce((s,x)=>s+Number(x.qty||0),0),payload={version:VERSION,featureVersion:FEATURE_VERSION,actorType:me.type,actorId:me.id,actorKey:me.key,actorName:me.name||'',company:me.company||'',surface:me.surface,cartStorageKey:c?.key||'',itemsCurrent:items,itemCount:items.length,totalQty,updatedAt:serverTs(),device:{installId:dev.installId,fingerprint:dev.fingerprint,platform:dev.platform}};if(items.length){payload.lastNonEmptyItems=items;payload.lastNonEmptyAt=serverTs()}try{await db.collection('v44_live_carts').doc(me.key.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,240)).set(payload,{merge:true});await log('cart_snapshot',`${items.length} صنف`,{itemCount:items.length,totalQty,items},1000)}catch(e){console.warn('[V44 cart]',e?.message||e)}}
function connectPermissions(){try{permUnsub=db.collection('system_controls').doc('permissions_v44').onSnapshot(s=>{permissionDoc=s.exists?(s.data()||{}):{};resolvePermissions()},()=>{})}catch{}}
function boot(){db=initDb();if(!db){setTimeout(boot,450);return}window.__V44_OBSERVABILITY={version:VERSION,featureVersion:FEATURE_VERSION,actor:me,log,permissions:()=>({...effective}),syncCart};connectPermissions();heartbeat('online');log('session_start',me.surface,{path:location.pathname});presenceTimer=setInterval(()=>heartbeat(document.visibilityState==='visible'?'online':'away'),45000);cartTimer=setInterval(syncCart,1400);syncCart();setTimeout(applyPermissionDom,400);const mo=new MutationObserver(()=>{clearTimeout(mo.t);mo.t=setTimeout(applyPermissionDom,120)});mo.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('visibilitychange',()=>{heartbeat(document.visibilityState==='visible'?'online':'away');if(document.visibilityState==='visible')log('page_visible',path)});window.addEventListener('pagehide',()=>{heartbeat('left');log('session_end',me.surface,{},0)})}
boot();
})();