/* BATCO V61.1: opt-in employee pilot, independent from the existing search and ordering UI. */
(function(){
'use strict';
const DOC='employee_home_pilot_v1',VERSION='61.1';
const rootId='batco61-pilot';
let unsubscribe=null,currentId='',active=false,panel=null,bootTimer=null,searchTimer=null,refreshCount=0;
let inventory={jeddah:{},riyadh:{}},prefs={recent:[],favorites:[]},diffs=null,tab='recent';
const safeRead=(key,fallback)=>{try{const a=JSON.parse(localStorage.getItem(key)||'null');return a&&typeof a==='object'?a:fallback}catch{return fallback}};
const save=(key,obj)=>{try{localStorage.setItem(key,JSON.stringify(obj))}catch{}};
const key=(id)=>'batco_pilot61_'+String(id).replace(/[^a-zA-Z0-9_-]/g,'_');
const fmt=x=>Number.isFinite(Number(x))?new Intl.NumberFormat('ar-SA',{maximumFractionDigits:5}).format(Number(x)):'—';
const branchName=b=>b==='riyadh'?'الرياض':'جدة';
const el=(tag,cl,txt)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=String(txt);return e};
const user=()=>{try{const name=String(localStorage.getItem('inventory_user_name_v2')||'').trim(),id=String(localStorage.getItem('inventory_employee_id_v2')||'').trim(),p=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null'),admin=name==='مهند'&&p?.role==='admin'&&Boolean(p?.photoId),auth=localStorage.getItem('inventory_employee_auth_version_v2')==='2';if(!name)return null;if(admin)return{id:'admin_mohanad',name};if(id&&auth&&p?.photoId)return{id,name};return null}catch{return null}};
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
 const next=[];
 for(const branch of ['jeddah','riyadh']){
  const marker=key(id)+'_visit_'+branch,old=safeRead(key(id)+'_snap_'+branch,null);
  if(sessionStorage.getItem(marker)==='1'){next.push(null);continue}
  next.push(old?.stock?delta(old.stock,inventory[branch],branch):null);
  save(key(id)+'_snap_'+branch,{at:Date.now(),stock:inventory[branch]});
  try{sessionStorage.setItem(marker,'1')}catch{}
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
function handleSearch(e){
 if(!active||e.target?.id!=='searchInput')return;
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
function favorite(marker){
 prefs.favorites=Array.isArray(prefs.favorites)?prefs.favorites:[];
 prefs.favorites=prefs.favorites.includes(marker)?prefs.favorites.filter(x=>x!==marker):[marker,...prefs.favorites].slice(0,24);
 save(key(currentId)+'_prefs',prefs);show();
}
async function copyProduct(item,branch){
 const content=item.sku+' — '+item.name+'\nمخزون '+branchName(branch)+'\nالكمية المتوفرة: '+fmt(item.qty)+' '+item.unit+'\nالشد: '+item.pack;
 try{await navigator.clipboard.writeText(content);toast('تم نسخ بطاقة الصنف')}catch{toast('تعذّر النسخ على هذا المتصفح')}
}
function toast(msg){const target=panel?.querySelector('.b61-notice');if(target)target.textContent=msg}
function card(marker){
 const [branch,sku]=marker.split('|'),p=inventory[branch]?.[sku];if(!p)return null;
 const row=el('article','b61-product');
 const open=el('button','b61-product-main');
 open.type='button';open.append(el('span','b61-sku',p.sku),el('strong','',p.name),el('small','',branchName(branch)+' · '+fmt(p.qty)+' '+p.unit));
 open.addEventListener('click',()=>jumpTo(sku,branch));
 const actions=el('div','b61-product-actions');
 const star=el('button','b61-star',(prefs.favorites||[]).includes(marker)?'★':'☆');
 star.type='button';star.title=(prefs.favorites||[]).includes(marker)?'إزالة من المفضلة':'إضافة للمفضلة';star.setAttribute('aria-label',star.title);star.addEventListener('click',()=>favorite(marker));
 const copy=el('button','b61-copy','نسخ');copy.type='button';copy.addEventListener('click',()=>copyProduct(p,branch));
 actions.append(star,copy);row.append(open,actions);return row;
}
function show(){
 if(!panel||!active)return;
 const name=user()?.name||'';
 panel.querySelector('.b61-greet').textContent='حيّاك الله، '+name.split(' ')[0];
 panel.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('is-active',b.dataset.tab===tab);b.setAttribute('aria-pressed',String(b.dataset.tab===tab))});
 const title=panel.querySelector('.b61-list-title');
 title.textContent=tab==='recent'?'آخر الأصناف التي بحثت عنها':tab==='favorite'?'الأصناف المفضلة':'وش تغيّر من آخر زيارة؟';
 const list=panel.querySelector('.b61-list');list.replaceChildren();
 if(tab==='changes'){
  if(diffs===null){list.append(el('p','b61-empty','هذه أول زيارة. سنقارن أرصدة المخزون في زيارتك القادمة من هذا الجهاز.'));return}
  if(!diffs.length){list.append(el('p','b61-empty','لا توجد فروقات منذ الزيارة السابقة.'));return}
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
 if(!nodes.length){list.append(el('p','b61-empty',tab==='favorite'?'افتح أحد الأصناف من «آخر الأصناف»، ثم اضغط النجمة لحفظه هنا.':'ابحث عن رقم صنف كامل؛ سيظهر في هذا القسم لتعود إليه بسرعة.'))}
 else list.append(...nodes);
}
function close(){
 active=false;panel?.remove();panel=null;clearTimeout(searchTimer);diffs=null;
}
function paint(){
 if(!active)return;const input=document.getElementById('searchInput');if(!input)return;
 if(panel?.isConnected)return;
 const region=input.closest('.max-w-\\[1024px\\]')||input.parentElement?.parentElement?.parentElement;
 if(!region?.parentElement)return;
 panel=el('section','b61-panel');panel.id=rootId;panel.setAttribute('aria-label','مساحة العمل التجريبية');
 panel.innerHTML='<div class="b61-head"><div><span class="b61-eyebrow">مساحة العمل · نسخة تجريبية</span><h2 class="b61-greet"></h2><p>آخر أصنافك والتحديثات المهمة في مكان واحد، والبحث الأصلي كما هو.</p></div><button type="button" class="b61-classic">العودة للواجهة الكلاسيكية</button></div><div class="b61-tiles"><button type="button" data-tab="recent"><span>↶</span><b>آخر الأصناف</b><small>رجوع سريع</small></button><button type="button" data-tab="favorite"><span>☆</span><b>المفضلة</b><small>أصنافك المعتادة</small></button><button type="button" data-tab="changes"><span>↗</span><b>وش تغيّر؟</b><small>من آخر زيارة</small></button></div><div class="b61-content"><div class="b61-list-head"><h3 class="b61-list-title"></h3><small>حفظ خاص بهذا الجهاز</small></div><div class="b61-list"></div><p class="b61-notice" role="status"></p></div><p class="b61-footnote">لن تتغير بيانات المخزون بسبب النسخة التجريبية. يمكنك العودة للواجهة الكلاسيكية بأي وقت.</p>';
 region.parentElement.insertBefore(panel,region.nextSibling);
 panel.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{tab=button.dataset.tab;show()}));
 panel.querySelector('.b61-classic').addEventListener('click',()=>{save(key(currentId)+'_classic',{hidden:true});close();showReturnButton()});
 show();
}
function showReturnButton(){
 const area=document.getElementById('searchInput');if(!area||document.getElementById('b61-return'))return;
 const btn=el('button','b61-return','إظهار مساحة العمل التجريبية');btn.id='b61-return';btn.type='button';
 btn.addEventListener('click',()=>{save(key(currentId)+'_classic',{hidden:false});btn.remove();active=true;paint()});
 area.parentElement?.append(btn);
}
function enable(id){
 if(active&&currentId===id)return;
 close();currentId=id;active=true;tab='recent';
 if(safeRead(key(id)+'_classic',{}).hidden){active=false;showReturnButton();return}
 paint();
 loadInventory(id).catch(()=>{if(panel){panel.querySelector('.b61-list').replaceChildren(el('p','b61-empty','تعذر تحميل الملخص الآن؛ البحث الأساسي يعمل كالمعتاد.'))}});
}
function waitUI(id){
 let attempts=0;const timer=setInterval(()=>{if(currentId!==id){clearInterval(timer);return}
  if(document.getElementById('searchInput')){clearInterval(timer);paint()}else if(++attempts>80){clearInterval(timer)}
 },300);
}
function init(){
 const identity=user();
 if(!identity){setTimeout(init,2000);return}
 currentId=identity.id;
 let attempt=0;
 bootTimer=setInterval(()=>{
  if(window.firebase?.apps?.length){clearInterval(bootTimer);try{
   unsubscribe=window.firebase.firestore().collection('system_controls').doc(DOC).onSnapshot(snap=>{
    const data=snap.exists?snap.data():null;
    const allowed=Boolean(data?.enabled===true&&Array.isArray(data.allowedEmployeeIds)&&data.allowedEmployeeIds.map(String).includes(identity.id));
    if(allowed){enable(identity.id);waitUI(identity.id)}else{close();document.getElementById('b61-return')?.remove()}
   },()=>{close();document.getElementById('b61-return')?.remove()});
  }catch{close()} }
  else if(++attempt>120){clearInterval(bootTimer)}
 },350);
}
document.addEventListener('input',handleSearch,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.BatcoPilot={decode,delta,version:VERSION}; // Read-only test helpers.
})();
