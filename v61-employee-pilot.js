/* BATCO V69: standard inventory workspace for all verified employee and manager sessions. */
(function(){
'use strict';
const DOC='employee_site_access',VERSION='69.0';
const CONFIG_FIELD='employeeHomePilot';
const allowlisted=(data,id)=>{const cfg=data?.[CONFIG_FIELD]||data;return Boolean(cfg?.enabled===true&&Array.isArray(cfg.allowedEmployeeIds)&&cfg.allowedEmployeeIds.map(String).includes(String(id)))};
const rootId='batco61-pilot';
let currentId='',active=false,panel=null,searchTimer=null;
let inventory={jeddah:{},riyadh:{}},prefs={recent:[],favorites:[]},diffs=null,tab='recent',expanded=false;
const safeRead=(key,fallback)=>{try{const a=JSON.parse(localStorage.getItem(key)||'null');return a&&typeof a==='object'?a:fallback}catch{return fallback}};
const save=(key,obj)=>{try{localStorage.setItem(key,JSON.stringify(obj))}catch{}};
const key=(id)=>'batco_pilot61_'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_');
const fmt=x=>Number.isFinite(Number(x))?new Intl.NumberFormat('ar-SA',{maximumFractionDigits:5}).format(Number(x)):'—';
const branchName=b=>b==='riyadh'?'الرياض':'جدة';
const el=(tag,cl,txt)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=String(txt);return e};
const previewRequested=()=>{try{return new URLSearchParams(location.search).get('pilotPreview')==='1'}catch{return false}};
function previewNotice(message,warning=false){
 if(!previewRequested()||!document.body)return;
 let node=document.getElementById('b61-preview-status');
 if(!message){node?.remove();return}
 if(!node){node=el('div','b61-preview-status');node.id='b61-preview-status';node.setAttribute('role','status');node.setAttribute('aria-live','polite');document.body.append(node)}
 node.textContent=message;node.classList.toggle('is-warning',warning);
}
const user=()=>{try{const name=String(localStorage.getItem('inventory_user_name_v2')||'').trim(),id=String(localStorage.getItem('inventory_employee_id_v2')||'').trim(),p=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null'),admin=name==='مهند'&&p?.role==='admin'&&Boolean(p?.photoId),auth=localStorage.getItem('inventory_employee_auth_version_v2')==='2';if(!name)return null;if(admin)return{id:'admin_mohanad',name};if(id&&auth&&p?.role==='employee'&&String(p.employeeId||'')===id&&p?.photoId)return{id,name};return null}catch{return null}};
const isAdminPreview=()=>{try{return new URLSearchParams(location.search).get('pilotPreview')==='1'&&user()?.id==='admin_mohanad'&&Boolean(localStorage.getItem('inventory_admin_token_v2'))}catch{return false}};
function decode(text){
 const out={};const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/);
 for(const line of lines.slice(1)){
  const c=line.split('\t');const sku=String(c[0]||'').trim();if(!sku)continue;
  const qty=Number(String(c[3]||'0').replace(/,/g,''));out[sku]={sku,name:c[1]||'',unit:c[2]||'',qty:Number.isFinite(qty)?qty:0,pack:c[4]||''};
 }
 return out;
}
function delta(previous,current,branch){
 if(!previous)return null;
 const result=[];
 for(const [sku,item] of Object.entries(current)){
  const old=previous[sku];
  if(!old){result.push({sku,branch,name:item.name,kind:'new',before:null,after:item.qty});continue}
  if(Number(old.qty)===item.qty)continue;
  const kind=item.qty===0?'empty':Number(old.qty)===0?'back':item.qty<Number(old.qty)?'down':'up';
  result.push({sku,branch,name:item.name,kind,before:Number(old.qty),after:item.qty});
 }
 const weight={empty:0,back:1,new:2,down:3,up:4};
 return result.sort((a,b)=>weight[a.kind]-weight[b.kind]||a.sku.localeCompare(b.sku)).slice(0,40);
}
async function loadInventory(id){
 const responses=await Promise.all(['jeddah','riyadh'].map(b=>fetch('./data/'+b+'.tsv',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('stock '+b);return r.text()}).then(decode)));
 if(!active||currentId!==id)return;
 inventory={jeddah:responses[0],riyadh:responses[1]};
 prefs=safeRead(key(id)+'_prefs',{recent:[],favorites:[]});
 window.dispatchEvent(new Event('batco61:favorites-changed'));
 const next=[];
 for(const branch of ['jeddah','riyadh']){
  const marker=key(id)+'_visit_'+branch,cache=marker+'_diff',old=safeRead(key(id)+'_snap_'+branch,null);
  let visitAt=0;
  try{visitAt=Number(sessionStorage.getItem(marker)||0)}catch{}
  if(visitAt&&Date.now()-visitAt<30*60*1000){next.push(safeRead(cache,null));continue}
  const diff=old?.stock?delta(old.stock,inventory[branch],branch):null;
  next.push(diff);
  save(key(id)+'_snap_'+branch,{at:Date.now(),stock:inventory[branch]});
  try{sessionStorage.setItem(marker,String(Date.now()));sessionStorage.setItem(cache,JSON.stringify(diff))}catch{}
 }
 diffs=next.every(x=>x===null)?null:next.flatMap(x=>x||[]);
 show();
}
function currentBranch(){
 const activeButton=[...document.querySelectorAll('[aria-label="اختيار المستودع"] button[aria-pressed="true"]')][0];
 return activeButton?.textContent?.includes('الرياض')?'riyadh':'jeddah';
}
function selectBranch(branch){
 const button=[...document.querySelectorAll('[aria-label="اختيار المستودع"] button')].find(b=>b.textContent.includes(branchName(branch)));
 if(button){button.click();return true}return false;
}
function jumpTo(sku,branch){
 // Product selection is a navigation action: dismiss the overlay before moving focus.
 if(expanded){expanded=false;show()}
 if(!selectBranch(branch))return;
 setTimeout(()=>{
  const field=document.getElementById('searchInput');
  if(!field)return;
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
  if(setter)setter.call(field,sku);else field.value=sku;
  field.dispatchEvent(new Event('input',{bubbles:true}));field.focus({preventScroll:true});
  field.scrollIntoView({behavior:'smooth',block:'center'});
 },110);
}
function remember(sku,branch){
 const marker=branch+'|'+sku;
 if(!inventory[branch]?.[sku])return;
 if(prefs.recent?.[0]===marker)return;
 prefs.recent=[marker,...(prefs.recent||[]).filter(x=>x!==marker)].slice(0,12);
 save(key(currentId)+'_prefs',prefs);if(active)show();
}
function searchIsActive(){return Boolean(String(document.getElementById('searchInput')?.value||'').trim())}
function syncSearchVisibility(){
 const searching=searchIsActive();
 if(searching&&expanded){expanded=false;if(panel)show()}
 panel?.classList.toggle('b61-search-suppressed',searching);
 document.getElementById('b61-return')?.classList.toggle('b61-search-suppressed',searching);
}
function handleSearch(e){
 if(e.target?.id!=='searchInput')return;
 syncSearchVisibility();
 if(!active)return;
 clearTimeout(searchTimer);
 const query=String(e.target.value||'').trim(),branch=currentBranch();
 if(query.length<3)return;
 searchTimer=setTimeout(()=>{
  if(!active)return;
  let item=inventory[branch][query];
  if(!item){
   const matches=Object.values(inventory[branch]).filter(p=>p.sku.toLowerCase()===query.toLowerCase()||p.name.trim()===query);
   if(matches.length===1)item=matches[0];
  }
  if(item)remember(item.sku,branch);
 },750);
}
function favorite(marker,snapshot=null){
 if(!active||!currentId)return;
 prefs.favorites=Array.isArray(prefs.favorites)?prefs.favorites:[];
 const wasSaved=prefs.favorites.includes(marker);
 prefs.favorites=wasSaved?prefs.favorites.filter(x=>x!==marker):[marker,...prefs.favorites].slice(0,24);
 prefs.favoriteSnapshots=prefs.favoriteSnapshots&&typeof prefs.favoriteSnapshots==='object'?prefs.favoriteSnapshots:{};
 if(snapshot&&!wasSaved&&!inventory[marker.split('|')[0]]?.[marker.split('|')[1]]){
  prefs.favoriteSnapshots[marker]=snapshot;
 }
 for(const stored of Object.keys(prefs.favoriteSnapshots)){
  if(!prefs.favorites.includes(stored))delete prefs.favoriteSnapshots[stored];
 }
 save(key(currentId)+'_prefs',prefs);
 show();
 window.dispatchEvent(new CustomEvent('batco61:favorites-changed',{detail:{marker,saved:!wasSaved}}));
}
async function copyProduct(item,branch){
 const content=item.sku+' — '+item.name+'\nمخزون '+branchName(branch)+'\nالكمية المتوفرة: '+fmt(item.qty)+' '+item.unit+'\nالشد: '+item.pack;
 try{await navigator.clipboard.writeText(content);toast('تم نسخ بطاقة الصنف')}catch{toast('تعذّر النسخ على هذا المتصفح')}
}
function toast(msg){const target=panel?.querySelector('.b61-notice');if(target)target.textContent=msg}
function card(marker){
 const [branch,sku]=marker.split('|'),p=inventory[branch]?.[sku]||prefs.favoriteSnapshots?.[marker];if(!p)return null;
 const row=el('article','b61-product');
 const open=el('button','b61-product-main');
 open.type='button';open.append(el('span','b61-sku',p.sku),el('strong','',p.name),el('small','',branchName(branch)+' · '+fmt(p.qty)+' '+p.unit));
 open.addEventListener('click',()=>jumpTo(sku,branch));
 const actions=el('div','b61-product-actions');
 const star=el('button','b61-star');star.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"/></svg>';star.setAttribute('aria-pressed',String((prefs.favorites||[]).includes(marker)));if((prefs.favorites||[]).includes(marker))star.querySelector('svg').setAttribute('fill','currentColor');
 star.type='button';star.title=(prefs.favorites||[]).includes(marker)?'إزالة من المفضلة':'إضافة للمفضلة';star.setAttribute('aria-label',star.title);star.addEventListener('click',()=>favorite(marker));
 const copy=el('button','b61-copy','نسخ');copy.type='button';copy.addEventListener('click',()=>copyProduct(p,branch));
 actions.append(star,copy);row.append(open,actions);return row;
}
function show(){
 if(!panel||!active)return;
 const popup=panel.querySelector('.b65-popover');
 if(popup)popup.hidden=!expanded;
 panel.querySelectorAll('[data-tab]').forEach(b=>{const selected=expanded&&b.dataset.tab===tab;b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-expanded',String(selected))});
 if(!expanded)return;
 const title=panel.querySelector('.b61-list-title');
 title.textContent=tab==='recent'?'آخر الأصناف التي بحثت عنها':tab==='favorite'?'الأصناف المفضلة':'وش تغيّر من آخر زيارة؟';
 const list=panel.querySelector('.b61-list');list.replaceChildren();
 if(tab==='changes'){
  if(diffs===null){list.append(el('p','b61-empty','تظهر التغيّرات من الزيارة القادمة.'));return}
  if(!diffs.length){list.append(el('p','b61-empty','لا توجد تغيّرات.'));return}
  for(const x of diffs.slice(0,12)){
   const button=el('button','b61-diff');
   const tags={new:'صنف جديد',empty:'نفد',back:'عاد للتوفر',down:'انخفض',up:'زاد'};
   button.append(el('span','b61-diff-tag '+x.kind,tags[x.kind]),el('strong','',x.sku+' · '+x.name),el('small','',branchName(x.branch)+' · '+(x.before===null?'جديد':fmt(x.before)+' ← ')+fmt(x.after)));
   button.addEventListener('click',()=>jumpTo(x.sku,x.branch));list.append(button);
  }
  return;
 }
 const source=tab==='recent'?prefs.recent:prefs.favorites;
 const nodes=(source||[]).map(card).filter(Boolean).slice(0,8);
 if(!nodes.length){list.append(el('p','b61-empty',tab==='favorite'?'احفظ صنفًا بالنجمة من «الأخيرة».':'تظهر هنا الأصناف التي تبحث عنها.'))}
 else list.append(...nodes);
}
function close(){
 active=false;expanded=false;panel?.remove();panel=null;clearTimeout(searchTimer);diffs=null;
 document.body?.classList.remove('batco-pilot-visual');
 window.dispatchEvent(new Event('batco61:state'));
}
function paint(){
 if(!active)return;
 const input=document.getElementById('searchInput');if(!input)return;
 if(panel?.isConnected){document.body?.classList.add('batco-pilot-visual');syncSearchVisibility();previewNotice(null);window.dispatchEvent(new Event('batco61:state'));return}
 const searchSlot=document.getElementById('batco-pilot-search-slot');
 const region=input.closest('.sticky')||input.parentElement?.parentElement?.parentElement;
 if(!searchSlot&&!region?.parentElement)return;
 panel=el('section','b65-search-tools');panel.id=rootId;panel.setAttribute('aria-label','أدوات البحث السريعة');
 panel.innerHTML='<div class="b65-tool-row"><div class="b65-actions" role="group" aria-label="اختصارات البحث"><button type="button" data-tab="recent" aria-controls="b65-popup" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7"/><path d="M12 7v5l3 2"/></svg><b>آخر الأصناف</b></button><button type="button" data-tab="favorite" aria-controls="b65-popup" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9Z"/></svg><b>المفضلة</b></button><button type="button" data-tab="changes" aria-controls="b65-popup" aria-expanded="false"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 17 10 11l4 4 6-8M14 7h6v6"/></svg><b>التغيّرات</b></button></div></div><div class="b65-popover" id="b65-popup" hidden><div class="b61-list-head"><h3 class="b61-list-title"></h3><button class="b65-dismiss" type="button" aria-label="إغلاق القائمة">إغلاق</button></div><div class="b61-list"></div><p class="b61-notice" role="status"></p></div>';
 if(searchSlot)searchSlot.replaceChildren(panel);
 else region.parentElement.insertBefore(panel,region.nextSibling);
 document.body?.classList.add('batco-pilot-visual');
 window.dispatchEvent(new Event('batco61:state'));
 panel.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
  const requested=button.dataset.tab;
  expanded=tab===requested?!expanded:true;tab=requested;show();
 }));
 panel.querySelector('.b65-dismiss').addEventListener('click',()=>{expanded=false;show()});
 syncSearchVisibility();show();previewNotice(null);
}
function showReturnButton(){
 const area=document.getElementById('searchInput');if(!area){previewNotice('جارٍ تجهيز البحث لإظهار زر العودة إلى التجربة…');return}if(document.getElementById('b61-return')){previewNotice(null);return}
 const btn=el('button','b61-return','↶ اختصارات البحث');btn.id='b61-return';btn.type='button';
 btn.addEventListener('click',()=>{save(key(currentId)+'_classic',{hidden:false});btn.remove();active=true;paint();loadInventory(currentId).catch(()=>toast('تعذّر تحميل الأصناف الآن؛ البحث الأساسي لا يزال يعمل.'))});
 const anchor=area.closest('.sticky')||area.parentElement;if(anchor?.parentElement)anchor.parentElement.insertBefore(btn,anchor.nextSibling);
 syncSearchVisibility();
}
function enable(id){
 if(active&&currentId===id){paint();return}
 close();currentId=id;active=true;tab='recent';expanded=false;
 // Official release ignores historical "hide pilot" preferences.
 // Existing per-account favorite/recent keys are retained to preserve saved products.
 paint();
 loadInventory(id).catch(()=>{
  if(panel){const list=panel.querySelector('.b61-list');if(list)list.replaceChildren(el('p','b61-empty','تعذر تحميل الملخص الآن؛ البحث الأساسي يعمل كالمعتاد.'))}
 });
}
function waitUI(id){
 let attempts=0;const timer=setInterval(()=>{if(currentId!==id){clearInterval(timer);return}
  if(document.getElementById('searchInput')){
   clearInterval(timer);
   paint();
  }else if(++attempts===16){previewNotice('ما زلنا ننتظر ظهور البحث في واجهة الموظفين…')}
  else if(attempts>120){clearInterval(timer);previewNotice('تعذر العثور على البحث. تأكد من تسجيل الدخول للموظفين ثم حدّث الصفحة.',true)}
 },300);
}
function init(){
 const identity=user();
 if(!identity){
  // Do not show official workspace on the signed-out screen.
  if(previewRequested())previewNotice('سجّل الدخول أولًا لعرض مساحة العمل.',true);
  setTimeout(init,2000);
  return;
 }
 currentId=identity.id;
 // Official access is tied to verified employee/manager sign-in; no pilot allowlist
 // or Firebase rollout switch is required. Product data remains read-only.
 if(previewRequested())previewNotice('جارٍ تجهيز مساحة العمل…');
 enable(identity.id);
 waitUI(identity.id);
}
window.addEventListener('batco61:favorite-toggle',event=>{
 if(!active||!currentId)return;
 const d=event.detail||{},sku=String(d.sku||'').trim(),branch=String(d.warehouse||'').trim();
 if(!sku||!['jeddah','riyadh'].includes(branch))return;
 const marker=branch+'|'+sku;
 // Archived/temporary catalog entries can still be saved without mutating the stock dataset.
 const fallback={sku,name:String(d.name||sku),unit:String(d.unit||''),qty:Number(d.qty)||0,pack:String(d.pack||'')};
 favorite(marker,fallback);
});
window.addEventListener('batco61:product-open',event=>{
 if(!active||!currentId)return;
 const sku=String(event.detail?.sku||'').trim(),branch=String(event.detail?.warehouse||'');
 if(!sku||!['jeddah','riyadh'].includes(branch))return;
 remember(sku,branch);
});
document.addEventListener('input',handleSearch,true);
document.addEventListener('pointerdown',e=>{
 if(expanded&&panel&&!panel.contains(e.target)){expanded=false;show()}
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded){expanded=false;show();document.getElementById('searchInput')?.focus({preventScroll:true})}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.BatcoPilot={decode,delta,allowlisted,version:VERSION,official:true,isEnabled:()=>active,isFavorite:(sku,branch)=>active&&(prefs.favorites||[]).includes(String(branch)+'|'+String(sku))}; // Read-only helpers and official workspace state.
})();
